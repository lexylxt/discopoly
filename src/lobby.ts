export type TokenKind = "pawn" | "bot" | "car" | "duck";

export type SessionUser = {
  id: string;
  username: string;
  name: string;
  avatar: string | null;
};

export type LobbyPlayer = SessionUser & {
  ready: boolean;
  token: TokenKind | null;
  connected: boolean;
};

export type LobbyState = {
  roomId: string;
  hostId: string | null;
  status: "lobby" | "playing";
  players: LobbyPlayer[];
};

export type LobbyConnection = {
  send: (message: object) => void;
  close: () => void;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const response = await fetch("/api/auth/me", {
    credentials: "include",
    cache: "no-store"
  });
  if (!response.ok) return null;
  const data = await response.json();
  return data.user ?? null;
}

export async function createRoom(): Promise<string> {
  const response = await fetch("/api/rooms", {
    method: "POST",
    credentials: "include"
  });
  if (!response.ok) throw new Error("Impossible de créer le lobby.");
  const data = await response.json();
  return data.roomId;
}

export async function logout() {
  await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include"
  });
}

export function connectLobby(
  roomId: string,
  onState: (state: LobbyState) => void,
  onStatus: (status: "connecting" | "connected" | "disconnected" | "error") => void
): LobbyConnection {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const url = `${protocol}//${window.location.host}/api/rooms/${encodeURIComponent(roomId)}/ws`;

  onStatus("connecting");
  const socket = new WebSocket(url);

  socket.addEventListener("open", () => onStatus("connected"));

  socket.addEventListener("message", event => {
    try {
      const message = JSON.parse(event.data);
      if (message.type === "LOBBY_STATE") onState(message.lobby);
    } catch {
      // Ignore malformed messages.
    }
  });

  socket.addEventListener("close", () => onStatus("disconnected"));
  socket.addEventListener("error", () => onStatus("error"));

  return {
    send(message) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
      }
    },
    close() {
      socket.close(1000, "Leaving lobby");
    }
  };
}
