import { DurableObject } from "cloudflare:workers";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const COOKIE_NAME = "discopoly_session";
const STATE_COOKIE = "discopoly_oauth_state";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;
const TOKENS = ["pawn", "bot", "car", "duck"];

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...headers
    }
  });
}

function base64url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function fromBase64url(value) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(normalized + padding);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

function parseCookies(request) {
  const raw = request.headers.get("cookie") || "";
  return Object.fromEntries(
    raw
      .split(";")
      .map(part => part.trim())
      .filter(Boolean)
      .map(part => {
        const index = part.indexOf("=");
        return index === -1
          ? [part, ""]
          : [part.slice(0, index), part.slice(index + 1)];
      })
  );
}

async function hmac(secret, payload) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return new Uint8Array(
    await crypto.subtle.sign("HMAC", key, encoder.encode(payload))
  );
}

async function signValue(secret, value) {
  const payload = base64url(encoder.encode(JSON.stringify(value)));
  const signature = base64url(await hmac(secret, payload));
  return `${payload}.${signature}`;
}

async function verifySignedValue(secret, signed) {
  if (!signed || !secret) return null;
  const [payload, signature] = signed.split(".");
  if (!payload || !signature) return null;

  const expected = await hmac(secret, payload);
  const actual = fromBase64url(signature);
  if (expected.length !== actual.length) return null;

  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) mismatch |= expected[i] ^ actual[i];
  if (mismatch !== 0) return null;

  try {
    return JSON.parse(decoder.decode(fromBase64url(payload)));
  } catch {
    return null;
  }
}

function sessionCookie(value) {
  return `${COOKIE_NAME}=${value}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_MAX_AGE}`;
}

function clearSessionCookie() {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

function stateCookie(value) {
  return `${STATE_COOKIE}=${value}; HttpOnly; Secure; SameSite=Lax; Path=/api/auth/discord; Max-Age=600`;
}

function clearStateCookie() {
  return `${STATE_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/api/auth/discord; Max-Age=0`;
}

function avatarUrl(user) {
  if (!user.avatar) return null;
  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`;
}

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    name: user.global_name || user.username,
    avatar: avatarUrl(user)
  };
}

async function getSession(request, env) {
  const signed = parseCookies(request)[COOKIE_NAME];
  const session = await verifySignedValue(env.SESSION_SECRET, signed);
  if (!session?.user?.id || !session?.exp || session.exp < Date.now()) return null;
  return session;
}

async function createSessionHeader(env, user) {
  const signed = await signValue(env.SESSION_SECRET, {
    user: publicUser(user),
    exp: Date.now() + SESSION_MAX_AGE * 1000
  });
  return sessionCookie(signed);
}

async function exchangeCode(env, code, redirectUri) {
  const body = new URLSearchParams({
    client_id: env.DISCORD_CLIENT_ID,
    client_secret: env.DISCORD_CLIENT_SECRET,
    grant_type: "authorization_code",
    code
  });
  if (redirectUri) body.set("redirect_uri", redirectUri);

  const response = await fetch("https://discord.com/api/v10/oauth2/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error("Discord token exchange failed", response.status, detail);
    throw new Error("Discord OAuth token exchange failed");
  }

  return response.json();
}

async function fetchDiscordUser(accessToken) {
  const response = await fetch("https://discord.com/api/v10/users/@me", {
    headers: { authorization: `Bearer ${accessToken}` }
  });
  if (!response.ok) throw new Error("Discord user fetch failed");
  return response.json();
}

function makeRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, value => alphabet[value % alphabet.length]).join("");
}

async function handleApi(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === "/api/health") {
    return json({ ok: true, service: "discopoly", multiplayer: true });
  }

  if (path === "/api/auth/me" && request.method === "GET") {
    const session = await getSession(request, env);
    return json({ user: session?.user ?? null });
  }

  if (path === "/api/auth/logout" && request.method === "POST") {
    return json(
      { ok: true },
      200,
      { "set-cookie": clearSessionCookie() }
    );
  }

  if (path === "/api/auth/discord/start" && request.method === "GET") {
    if (!env.DISCORD_CLIENT_SECRET || !env.SESSION_SECRET) {
      return json({ error: "OAuth secrets are not configured" }, 500);
    }

    const state = crypto.randomUUID();
    const redirectUri = `${url.origin}/api/auth/discord/callback`;
    const authorize = new URL("https://discord.com/oauth2/authorize");
    authorize.searchParams.set("client_id", env.DISCORD_CLIENT_ID);
    authorize.searchParams.set("response_type", "code");
    authorize.searchParams.set("redirect_uri", redirectUri);
    authorize.searchParams.set("scope", "identify");
    authorize.searchParams.set("state", state);
    authorize.searchParams.set("prompt", "consent");

    return new Response(null, {
      status: 302,
      headers: {
        location: authorize.toString(),
        "set-cookie": stateCookie(state)
      }
    });
  }

  if (path === "/api/auth/discord/callback" && request.method === "GET") {
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const expectedState = parseCookies(request)[STATE_COOKIE];

    if (!code || !state || state !== expectedState) {
      return json({ error: "Invalid OAuth state" }, 400, {
        "set-cookie": clearStateCookie()
      });
    }

    try {
      const redirectUri = `${url.origin}/api/auth/discord/callback`;
      const token = await exchangeCode(env, code, redirectUri);
      const user = await fetchDiscordUser(token.access_token);
      const cookie = await createSessionHeader(env, user);

      const headers = new Headers({
        location: "/",
        "set-cookie": cookie
      });
      headers.append("set-cookie", clearStateCookie());

      return new Response(null, { status: 302, headers });
    } catch (error) {
      console.error(error);
      return json({ error: "Discord authentication failed" }, 500);
    }
  }

  if (path === "/api/auth/discord/activity" && request.method === "POST") {
    if (!env.DISCORD_CLIENT_SECRET || !env.SESSION_SECRET) {
      return json({ error: "OAuth secrets are not configured" }, 500);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }

    if (!body?.code) return json({ error: "Missing OAuth code" }, 400);

    try {
      const token = await exchangeCode(env, body.code);
      const user = await fetchDiscordUser(token.access_token);
      const cookie = await createSessionHeader(env, user);

      return json(
        {
          access_token: token.access_token,
          user: publicUser(user)
        },
        200,
        { "set-cookie": cookie }
      );
    } catch (error) {
      console.error(error);
      return json({ error: "Discord Activity authentication failed" }, 500);
    }
  }

  if (path === "/api/rooms" && request.method === "POST") {
    const session = await getSession(request, env);
    if (!session) return json({ error: "Unauthorized" }, 401);
    return json({ roomId: makeRoomCode() }, 201);
  }

  const roomMatch = path.match(/^\/api\/rooms\/([^/]+)\/ws$/);
  if (roomMatch) {
    const session = await getSession(request, env);
    if (!session) return json({ error: "Unauthorized" }, 401);

    if (request.headers.get("upgrade")?.toLowerCase() !== "websocket") {
      return json({ error: "Expected WebSocket upgrade" }, 426);
    }

    const roomId = decodeURIComponent(roomMatch[1]).slice(0, 128);
    if (!roomId) return json({ error: "Invalid room" }, 400);

    const id = env.LOBBIES.idFromName(roomId);
    const stub = env.LOBBIES.get(id);

    const headers = new Headers(request.headers);
    headers.set("x-discopoly-room", encodeURIComponent(roomId));
    headers.set("x-discopoly-user-id", session.user.id);
    headers.set("x-discopoly-user-name", encodeURIComponent(session.user.name));
    headers.set("x-discopoly-user-username", encodeURIComponent(session.user.username));
    headers.set("x-discopoly-user-avatar", encodeURIComponent(session.user.avatar || ""));

    return stub.fetch(
      new Request("https://lobby.internal/ws", {
        method: "GET",
        headers
      })
    );
  }

  return json({ error: "Not found" }, 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      return handleApi(request, env);
    }

    return env.ASSETS.fetch(request);
  }
};

export class LobbyRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.ctx = ctx;
  }

  async readLobby(roomId = "UNKNOWN") {
    return (
      (await this.ctx.storage.get("lobby")) || {
        roomId,
        hostId: null,
        status: "lobby",
        players: {}
      }
    );
  }

  async writeLobby(lobby) {
    await this.ctx.storage.put("lobby", lobby);
  }

  broadcast(lobby) {
    const payload = JSON.stringify({
      type: "LOBBY_STATE",
      lobby: {
        roomId: lobby.roomId,
        hostId: lobby.hostId,
        status: lobby.status,
        players: Object.values(lobby.players)
      }
    });

    for (const socket of this.ctx.getWebSockets()) {
      try {
        socket.send(payload);
      } catch {
        // Closed sockets are cleaned up by the runtime.
      }
    }
  }

  async fetch(request) {
    if (request.headers.get("upgrade")?.toLowerCase() !== "websocket") {
      return new Response("Expected WebSocket", { status: 426 });
    }

    const userId = request.headers.get("x-discopoly-user-id");
    if (!userId) return new Response("Unauthorized", { status: 401 });

    const roomId = decodeURIComponent(request.headers.get("x-discopoly-room") || "UNKNOWN");
    const name = decodeURIComponent(request.headers.get("x-discopoly-user-name") || "Player");
    const username = decodeURIComponent(request.headers.get("x-discopoly-user-username") || "player");
    const avatar = decodeURIComponent(request.headers.get("x-discopoly-user-avatar") || "");

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    server.serializeAttachment({ userId });
    this.ctx.acceptWebSocket(server);

    const lobby = await this.readLobby(roomId);
    const previous = lobby.players[userId];

    lobby.players[userId] = {
      id: userId,
      name,
      username,
      avatar: avatar || null,
      ready: previous?.ready ?? false,
      token: previous?.token ?? null,
      connected: true
    };

    if (!lobby.hostId || !lobby.players[lobby.hostId]?.connected) {
      lobby.hostId = userId;
    }

    await this.writeLobby(lobby);
    this.broadcast(lobby);

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(socket, message) {
    const attachment = socket.deserializeAttachment();
    const userId = attachment?.userId;
    if (!userId || typeof message !== "string") return;

    let action;
    try {
      action = JSON.parse(message);
    } catch {
      return;
    }

    const lobby = await this.readLobby();
    const player = lobby.players[userId];
    if (!player) return;

    if (action.type === "SET_READY" && lobby.status === "lobby") {
      player.ready = Boolean(action.ready);
    }

    if (action.type === "SELECT_TOKEN" && lobby.status === "lobby") {
      if (
        TOKENS.includes(action.token) &&
        !Object.values(lobby.players).some(
          other => other.id !== userId && other.token === action.token
        )
      ) {
        player.token = action.token;
      }
    }

    if (action.type === "START_GAME" && lobby.status === "lobby") {
      const activePlayers = Object.values(lobby.players).filter(p => p.connected);
      const canStart =
        lobby.hostId === userId &&
        activePlayers.length >= 2 &&
        activePlayers.every(p => p.ready && p.token);

      if (canStart) lobby.status = "playing";
    }

    await this.writeLobby(lobby);
    this.broadcast(lobby);
  }

  async webSocketClose(socket) {
    const attachment = socket.deserializeAttachment();
    const userId = attachment?.userId;
    if (!userId) return;

    const lobby = await this.readLobby();
    if (!lobby.players[userId]) return;

    lobby.players[userId].connected = false;
    lobby.players[userId].ready = false;

    if (lobby.hostId === userId) {
      const nextHost = Object.values(lobby.players).find(p => p.connected);
      lobby.hostId = nextHost?.id ?? null;
    }

    await this.writeLobby(lobby);
    this.broadcast(lobby);
  }

  async webSocketError(socket) {
    await this.webSocketClose(socket);
  }
}
