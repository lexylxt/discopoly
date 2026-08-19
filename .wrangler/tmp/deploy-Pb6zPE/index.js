var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// worker/index.js
import { DurableObject } from "cloudflare:workers";
var encoder = new TextEncoder();
var decoder = new TextDecoder();
var COOKIE_NAME = "discopoly_session";
var STATE_COOKIE = "discopoly_oauth_state";
var SESSION_MAX_AGE = 60 * 60 * 24 * 7;
var TOKENS = ["pawn", "bot", "car", "duck"];
var BOARD_SIZE = 40;
var SPACES = [
  { index: 0, type: "go", name: "D\xC9PART" },
  { index: 1, type: "property", name: "Pixel Alley", price: 60, baseRent: 2 },
  { index: 2, type: "community", name: "Caisse" },
  { index: 3, type: "property", name: "Meme Street", price: 60, baseRent: 4 },
  { index: 4, type: "tax", name: "Imp\xF4t" },
  { index: 5, type: "railroad", name: "Station Alpha", price: 200, baseRent: 25 },
  { index: 6, type: "property", name: "Bot Boulevard", price: 100, baseRent: 6 },
  { index: 7, type: "chance", name: "Chance" },
  { index: 8, type: "property", name: "Stream Lane", price: 100, baseRent: 6 },
  { index: 9, type: "property", name: "Emoji Avenue", price: 120, baseRent: 8 },
  { index: 10, type: "jail", name: "PRISON / VISITE" },
  { index: 11, type: "property", name: "Voice Plaza", price: 140, baseRent: 10 },
  { index: 12, type: "utility", name: "\xC9lectricit\xE9", price: 150 },
  { index: 13, type: "property", name: "Stage Street", price: 140, baseRent: 10 },
  { index: 14, type: "property", name: "Thread Road", price: 160, baseRent: 12 },
  { index: 15, type: "railroad", name: "Station Beta", price: 200, baseRent: 25 },
  { index: 16, type: "property", name: "Quest Quarter", price: 180, baseRent: 14 },
  { index: 17, type: "community", name: "Caisse" },
  { index: 18, type: "property", name: "Party Avenue", price: 180, baseRent: 14 },
  { index: 19, type: "property", name: "Arcade Row", price: 200, baseRent: 16 },
  { index: 20, type: "free", name: "PARKING GRATUIT" },
  { index: 21, type: "property", name: "Nitro Street", price: 220, baseRent: 18 },
  { index: 22, type: "chance", name: "Chance" },
  { index: 23, type: "property", name: "Creator Lane", price: 220, baseRent: 18 },
  { index: 24, type: "property", name: "Server Square", price: 240, baseRent: 20 },
  { index: 25, type: "railroad", name: "Station Gamma", price: 200, baseRent: 25 },
  { index: 26, type: "property", name: "Boost Boulevard", price: 260, baseRent: 22 },
  { index: 27, type: "property", name: "Sticker Street", price: 260, baseRent: 22 },
  { index: 28, type: "utility", name: "Eau", price: 150 },
  { index: 29, type: "property", name: "Soundboard Ave", price: 280, baseRent: 24 },
  { index: 30, type: "gotojail", name: "ALLEZ EN PRISON" },
  { index: 31, type: "property", name: "Community Way", price: 300, baseRent: 26 },
  { index: 32, type: "property", name: "Discovery Blvd", price: 300, baseRent: 26 },
  { index: 33, type: "community", name: "Caisse" },
  { index: 34, type: "property", name: "Partner Plaza", price: 320, baseRent: 28 },
  { index: 35, type: "railroad", name: "Station Delta", price: 200, baseRent: 25 },
  { index: 36, type: "chance", name: "Chance" },
  { index: 37, type: "property", name: "Activity Park", price: 350, baseRent: 35 },
  { index: 38, type: "tax", name: "Taxe luxe" },
  { index: 39, type: "property", name: "Discopoly Heights", price: 400, baseRent: 50 }
];
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
__name(json, "json");
function base64url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}
__name(base64url, "base64url");
function fromBase64url(value) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padding = "=".repeat((4 - normalized.length % 4) % 4);
  const binary = atob(normalized + padding);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}
__name(fromBase64url, "fromBase64url");
function parseCookies(request) {
  const raw = request.headers.get("cookie") || "";
  return Object.fromEntries(
    raw.split(";").map((part) => part.trim()).filter(Boolean).map((part) => {
      const index = part.indexOf("=");
      return index === -1 ? [part, ""] : [part.slice(0, index), part.slice(index + 1)];
    })
  );
}
__name(parseCookies, "parseCookies");
async function hmac(secret, payload) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(payload)));
}
__name(hmac, "hmac");
async function signValue(secret, value) {
  const payload = base64url(encoder.encode(JSON.stringify(value)));
  const signature = base64url(await hmac(secret, payload));
  return `${payload}.${signature}`;
}
__name(signValue, "signValue");
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
__name(verifySignedValue, "verifySignedValue");
function sessionCookie(value) {
  return `${COOKIE_NAME}=${value}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_MAX_AGE}`;
}
__name(sessionCookie, "sessionCookie");
function clearSessionCookie() {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}
__name(clearSessionCookie, "clearSessionCookie");
function stateCookie(value) {
  return `${STATE_COOKIE}=${value}; HttpOnly; Secure; SameSite=Lax; Path=/api/auth/discord; Max-Age=600`;
}
__name(stateCookie, "stateCookie");
function clearStateCookie() {
  return `${STATE_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/api/auth/discord; Max-Age=0`;
}
__name(clearStateCookie, "clearStateCookie");
function avatarUrl(user) {
  if (!user.avatar) return null;
  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`;
}
__name(avatarUrl, "avatarUrl");
function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    name: user.global_name || user.username,
    avatar: avatarUrl(user)
  };
}
__name(publicUser, "publicUser");
async function getSession(request, env) {
  const signed = parseCookies(request)[COOKIE_NAME];
  const session = await verifySignedValue(env.SESSION_SECRET, signed);
  if (!session?.user?.id || !session?.exp || session.exp < Date.now()) return null;
  return session;
}
__name(getSession, "getSession");
async function createSessionHeader(env, user) {
  const signed = await signValue(env.SESSION_SECRET, {
    user: publicUser(user),
    exp: Date.now() + SESSION_MAX_AGE * 1e3
  });
  return sessionCookie(signed);
}
__name(createSessionHeader, "createSessionHeader");
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
    console.error("Discord token exchange failed", response.status, await response.text());
    throw new Error("Discord OAuth token exchange failed");
  }
  return response.json();
}
__name(exchangeCode, "exchangeCode");
async function fetchDiscordUser(accessToken) {
  const response = await fetch("https://discord.com/api/v10/users/@me", {
    headers: { authorization: `Bearer ${accessToken}` }
  });
  if (!response.ok) throw new Error("Discord user fetch failed");
  return response.json();
}
__name(fetchDiscordUser, "fetchDiscordUser");
function makeRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (value) => alphabet[value % alphabet.length]).join("");
}
__name(makeRoomCode, "makeRoomCode");
async function handleApi(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  if (path === "/api/health") return json({ ok: true, version: 5 });
  if (path === "/api/auth/me" && request.method === "GET") {
    const session = await getSession(request, env);
    return json({ user: session?.user ?? null });
  }
  if (path === "/api/auth/logout" && request.method === "POST") {
    return json({ ok: true }, 200, { "set-cookie": clearSessionCookie() });
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
      return json({ error: "Invalid OAuth state" }, 400, { "set-cookie": clearStateCookie() });
    }
    try {
      const redirectUri = `${url.origin}/api/auth/discord/callback`;
      const token = await exchangeCode(env, code, redirectUri);
      const user = await fetchDiscordUser(token.access_token);
      const cookie = await createSessionHeader(env, user);
      const headers = new Headers({ location: "/", "set-cookie": cookie });
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
        { access_token: token.access_token, user: publicUser(user) },
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
    const id = env.LOBBIES.idFromName(roomId);
    const stub = env.LOBBIES.get(id);
    const headers = new Headers(request.headers);
    headers.set("x-discopoly-room", encodeURIComponent(roomId));
    headers.set("x-discopoly-user-id", session.user.id);
    headers.set("x-discopoly-user-name", encodeURIComponent(session.user.name));
    headers.set("x-discopoly-user-username", encodeURIComponent(session.user.username));
    headers.set("x-discopoly-user-avatar", encodeURIComponent(session.user.avatar || ""));
    return stub.fetch(new Request("https://lobby.internal/ws", { method: "GET", headers }));
  }
  return json({ error: "Not found" }, 404);
}
__name(handleApi, "handleApi");
var index_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) return handleApi(request, env);
    return env.ASSETS.fetch(request);
  }
};
var LobbyRoom = class extends DurableObject {
  static {
    __name(this, "LobbyRoom");
  }
  constructor(ctx, env) {
    super(ctx, env);
    this.ctx = ctx;
  }
  async readLobby(roomId = "UNKNOWN") {
    return await this.ctx.storage.get("lobby") || {
      roomId,
      hostId: null,
      status: "lobby",
      players: {},
      orderRolls: {},
      game: null
    };
  }
  async writeLobby(lobby) {
    await this.ctx.storage.put("lobby", lobby);
  }
  publicLobby(lobby) {
    return {
      roomId: lobby.roomId,
      hostId: lobby.hostId,
      status: lobby.status,
      players: Object.values(lobby.players),
      orderRolls: lobby.orderRolls || {},
      game: lobby.game
    };
  }
  broadcast(lobby) {
    const payload = JSON.stringify({ type: "LOBBY_STATE", lobby: this.publicLobby(lobby) });
    for (const socket of this.ctx.getWebSockets()) {
      try {
        socket.send(payload);
      } catch {
      }
    }
  }
  sendError(socket, message) {
    try {
      socket.send(JSON.stringify({ type: "ERROR", message }));
    } catch {
    }
  }
  dice() {
    return Math.floor(Math.random() * 6) + 1;
  }
  activeLobbyPlayers(lobby) {
    return Object.values(lobby.players).filter((p) => p.connected);
  }
  makeGame(lobby, orderedPlayers) {
    return {
      players: orderedPlayers.map((player) => ({
        id: player.id,
        name: player.name,
        position: 0,
        money: 1500,
        token: player.token
      })),
      turn: 0,
      owners: {},
      dice: [1, 1],
      rolledThisTurn: false,
      log: `Ordre d\xE9termin\xE9 : ${orderedPlayers.map((p) => p.name).join(" \u2192 ")}. ${orderedPlayers[0].name} commence.`
    };
  }
  finalizeOrderIfReady(lobby) {
    const players = this.activeLobbyPlayers(lobby);
    if (!players.length || !players.every((p) => lobby.orderRolls[p.id])) return false;
    const ordered = [...players].sort((a, b) => {
      const rollA = lobby.orderRolls[a.id];
      const rollB = lobby.orderRolls[b.id];
      if (rollB.total !== rollA.total) return rollB.total - rollA.total;
      return rollB.tieBreaker - rollA.tieBreaker;
    });
    lobby.game = this.makeGame(lobby, ordered);
    lobby.status = "playing";
    return true;
  }
  currentGamePlayer(lobby) {
    if (!lobby.game?.players?.length) return null;
    return lobby.game.players[lobby.game.turn] || null;
  }
  handleGameRoll(lobby, userId, socket) {
    const game = lobby.game;
    const current = this.currentGamePlayer(lobby);
    if (!game || !current || current.id !== userId) {
      this.sendError(socket, "Ce n'est pas ton tour.");
      return false;
    }
    if (game.rolledThisTurn) {
      this.sendError(socket, "Tu as d\xE9j\xE0 lanc\xE9 les d\xE9s.");
      return false;
    }
    const d1 = this.dice();
    const d2 = this.dice();
    const oldPos = current.position;
    current.position = (current.position + d1 + d2) % BOARD_SIZE;
    game.dice = [d1, d2];
    game.rolledThisTurn = true;
    let log = `${current.name} lance ${d1} + ${d2} = ${d1 + d2}.`;
    if (current.position < oldPos) {
      current.money += 200;
      log += " +200 D$ en passant par le D\xE9part.";
    }
    const space = SPACES[current.position];
    if (space.type === "gotojail") {
      current.position = 10;
      log += " Direction prison.";
    } else if (space.type === "tax") {
      const amount = space.index === 4 ? 200 : 100;
      current.money -= amount;
      log += ` Taxe de ${amount} D$.`;
    } else {
      const ownerId = game.owners[current.position];
      if (ownerId && ownerId !== current.id && space.baseRent) {
        current.money -= space.baseRent;
        const owner = game.players.find((p) => p.id === ownerId);
        if (owner) owner.money += space.baseRent;
        log += ` Loyer de ${space.baseRent} D$ pay\xE9 \xE0 ${owner?.name || "un joueur"}.`;
      } else {
        log += ` Arriv\xE9e sur ${space.name}.`;
      }
    }
    game.log = log;
    return true;
  }
  handleBuy(lobby, userId, socket) {
    const game = lobby.game;
    const current = this.currentGamePlayer(lobby);
    if (!game || !current || current.id !== userId) {
      this.sendError(socket, "Ce n'est pas ton tour.");
      return false;
    }
    if (!game.rolledThisTurn) {
      this.sendError(socket, "Lance d'abord les d\xE9s.");
      return false;
    }
    const space = SPACES[current.position];
    if (!space.price) {
      this.sendError(socket, "Cette case n'est pas achetable.");
      return false;
    }
    if (game.owners[current.position]) {
      this.sendError(socket, "Cette propri\xE9t\xE9 appartient d\xE9j\xE0 \xE0 quelqu'un.");
      return false;
    }
    if (current.money < space.price) {
      this.sendError(socket, "Tu n'as pas assez d'argent.");
      return false;
    }
    current.money -= space.price;
    game.owners[current.position] = current.id;
    game.log = `${current.name} ach\xE8te ${space.name} pour ${space.price} D$.`;
    return true;
  }
  handleEndTurn(lobby, userId, socket) {
    const game = lobby.game;
    const current = this.currentGamePlayer(lobby);
    if (!game || !current || current.id !== userId) {
      this.sendError(socket, "Ce n'est pas ton tour.");
      return false;
    }
    if (!game.rolledThisTurn) {
      this.sendError(socket, "Tu dois lancer les d\xE9s avant de finir ton tour.");
      return false;
    }
    game.turn = (game.turn + 1) % game.players.length;
    game.rolledThisTurn = false;
    const next = this.currentGamePlayer(lobby);
    game.log = `Au tour de ${next.name}.`;
    return true;
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
    if (!lobby.hostId || !lobby.players[lobby.hostId]?.connected) lobby.hostId = userId;
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
    let changed = false;
    if (action.type === "SET_READY" && lobby.status === "lobby") {
      player.ready = Boolean(action.ready);
      changed = true;
    }
    if (action.type === "SELECT_TOKEN" && lobby.status === "lobby") {
      if (TOKENS.includes(action.token) && !Object.values(lobby.players).some((other) => other.id !== userId && other.token === action.token)) {
        player.token = action.token;
        changed = true;
      }
    }
    if (action.type === "START_GAME" && lobby.status === "lobby") {
      const activePlayers = this.activeLobbyPlayers(lobby);
      const canStart = lobby.hostId === userId && activePlayers.length >= 2 && activePlayers.every((p) => p.ready && p.token);
      if (canStart) {
        lobby.status = "ordering";
        lobby.orderRolls = {};
        lobby.game = null;
        changed = true;
      } else {
        this.sendError(socket, "Il faut au moins 2 joueurs pr\xEAts avec un pion.");
      }
    }
    if (action.type === "ROLL_ORDER" && lobby.status === "ordering") {
      if (!lobby.orderRolls[userId]) {
        const d1 = this.dice();
        const d2 = this.dice();
        lobby.orderRolls[userId] = {
          dice: [d1, d2],
          total: d1 + d2,
          tieBreaker: Math.random()
        };
        this.finalizeOrderIfReady(lobby);
        changed = true;
      }
    }
    if (lobby.status === "playing") {
      if (action.type === "ROLL_DICE") changed = this.handleGameRoll(lobby, userId, socket) || changed;
      if (action.type === "BUY_PROPERTY") changed = this.handleBuy(lobby, userId, socket) || changed;
      if (action.type === "END_TURN") changed = this.handleEndTurn(lobby, userId, socket) || changed;
    }
    if (changed) {
      await this.writeLobby(lobby);
      this.broadcast(lobby);
    }
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
      const nextHost = Object.values(lobby.players).find((p) => p.connected);
      lobby.hostId = nextHost?.id ?? null;
    }
    await this.writeLobby(lobby);
    this.broadcast(lobby);
  }
  async webSocketError(socket) {
    await this.webSocketClose(socket);
  }
};
export {
  LobbyRoom,
  index_default as default
};
//# sourceMappingURL=index.js.map
