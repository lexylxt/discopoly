import { useEffect, useMemo, useRef, useState } from "react";
import Board3D from "./Board3D";
import { spaces } from "./board";
import {
  buy,
  endTurn,
  roll,
  type GameState,
  type Player
} from "./game";
import {
  authenticateActivity,
  initDiscord,
  isRunningInsideDiscord
} from "./discord";
import {
  connectLobby,
  createRoom,
  getSessionUser,
  logout,
  type LobbyConnection,
  type LobbyState,
  type SessionUser,
  type TokenKind
} from "./lobby";

type Screen = "auth" | "home" | "lobby" | "game";
type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

const tokenOptions: { id: TokenKind; label: string; emoji: string }[] = [
  { id: "pawn", label: "Pion", emoji: "♟️" },
  { id: "bot", label: "Bot", emoji: "🤖" },
  { id: "car", label: "Voiture", emoji: "🏎️" },
  { id: "duck", label: "Canard", emoji: "🦆" }
];

function avatarFallback(name: string) {
  return name.slice(0, 1).toUpperCase();
}

function PlayerAvatar({ user }: { user: { name: string; avatar: string | null } }) {
  if (user.avatar) {
    return <img className="avatar" src={user.avatar} alt="" />;
  }
  return <div className="avatar avatar-fallback">{avatarFallback(user.name)}</div>;
}

function AuthScreen({
  discordMode,
  error,
  onActivityLogin
}: {
  discordMode: boolean;
  error: string | null;
  onActivityLogin: () => void;
}) {
  return (
    <main className="menu-page">
      <section className="hero-card">
        <div className="logo-mark">D</div>
        <p className="eyebrow">MULTIPLAYER BOARD GAME</p>
        <h1>DISCOPOLY</h1>
        <p className="hero-copy">
          Crée un lobby, invite tes amis et prépare la partie avant d'entrer sur le plateau 3D.
        </p>

        {error && <div className="error-box">{error}</div>}

        {discordMode ? (
          <button className="discord-button" onClick={onActivityLogin}>
            <span>🎮</span> Se connecter avec Discord
          </button>
        ) : (
          <button
            className="discord-button"
            onClick={() => {
              window.location.href = "/api/auth/discord/start";
            }}
          >
            <span>💬</span> Se connecter avec Discord
          </button>
        )}

        <p className="fine-print">
          {discordMode
            ? "Mode Activity détecté · connexion via Embedded App SDK"
            : "Mode Web · OAuth2 Discord"}
        </p>
      </section>
    </main>
  );
}

function HomeScreen({
  user,
  activityInstanceId,
  onJoin
}: {
  user: SessionUser;
  activityInstanceId: string | null;
  onJoin: (roomId: string) => void;
}) {
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    try {
      setBusy(true);
      setError(null);
      const roomId = await createRoom();
      onJoin(roomId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="menu-page">
      <section className="home-panel">
        <header className="menu-header">
          <div>
            <p className="eyebrow">DISCOPOLY ONLINE</p>
            <h1>Jouer</h1>
          </div>
          <div className="user-chip">
            <PlayerAvatar user={user} />
            <div>
              <strong>{user.name}</strong>
              <span>@{user.username}</span>
            </div>
          </div>
        </header>

        <div className="menu-grid">
          {activityInstanceId && (
            <article className="action-card accent-card">
              <div className="action-icon">🎙️</div>
              <h2>Lobby de l'appel</h2>
              <p>
                Rejoins automatiquement la partie liée à cette instance Discord.
              </p>
              <button
                className="primary"
                onClick={() => onJoin(`ACT-${activityInstanceId}`)}
              >
                Rejoindre l'appel
              </button>
            </article>
          )}

          <article className="action-card">
            <div className="action-icon">✨</div>
            <h2>Créer une partie</h2>
            <p>Génère un code à partager avec les autres joueurs.</p>
            <button className="primary" disabled={busy} onClick={handleCreate}>
              {busy ? "Création..." : "Créer un lobby"}
            </button>
          </article>

          <article className="action-card">
            <div className="action-icon">🔑</div>
            <h2>Rejoindre</h2>
            <p>Entre le code à 6 caractères envoyé par l'host.</p>
            <input
              className="room-input"
              value={joinCode}
              maxLength={32}
              placeholder="EX: 7KQ4PF"
              onChange={event =>
                setJoinCode(event.target.value.toUpperCase().replace(/\s/g, ""))
              }
            />
            <button
              disabled={!joinCode.trim()}
              onClick={() => onJoin(joinCode.trim())}
            >
              Rejoindre
            </button>
          </article>
        </div>

        {error && <div className="error-box">{error}</div>}
      </section>
    </main>
  );
}

function LobbyScreen({
  user,
  lobby,
  connectionStatus,
  onAction,
  onLeave
}: {
  user: SessionUser;
  lobby: LobbyState | null;
  connectionStatus: ConnectionStatus;
  onAction: (action: object) => void;
  onLeave: () => void;
}) {
  if (!lobby) {
    return (
      <main className="menu-page">
        <section className="hero-card compact">
          <div className="loading-ring" />
          <h2>Connexion au lobby...</h2>
          <p>{connectionStatus}</p>
        </section>
      </main>
    );
  }

  const me = lobby.players.find(player => player.id === user.id);
  const connectedPlayers = lobby.players.filter(player => player.connected);
  const allReady =
    connectedPlayers.length >= 2 &&
    connectedPlayers.every(player => player.ready && player.token);
  const isHost = lobby.hostId === user.id;
  const takenTokens = new Set(
    lobby.players
      .filter(player => player.id !== user.id && player.token)
      .map(player => player.token)
  );

  return (
    <main className="menu-page">
      <section className="lobby-panel">
        <header className="lobby-header">
          <div>
            <p className="eyebrow">LOBBY</p>
            <h1>{lobby.roomId.startsWith("ACT-") ? "Appel Discord" : lobby.roomId}</h1>
            {!lobby.roomId.startsWith("ACT-") && (
              <button
                className="copy-code"
                onClick={() => navigator.clipboard?.writeText(lobby.roomId)}
              >
                Copier le code
              </button>
            )}
          </div>
          <div className={`connection-badge ${connectionStatus}`}>
            <i />
            {connectionStatus}
          </div>
        </header>

        <div className="lobby-layout">
          <section className="roster-card">
            <div className="section-title">
              <h2>Joueurs</h2>
              <span>{connectedPlayers.length}/8</span>
            </div>

            <div className="roster">
              {lobby.players.map(player => (
                <div
                  className={`roster-player ${player.connected ? "" : "offline"}`}
                  key={player.id}
                >
                  <PlayerAvatar user={player} />
                  <div className="roster-name">
                    <strong>{player.name}</strong>
                    <span>
                      {player.id === lobby.hostId && "👑 Host "}
                      {!player.connected && "· Déconnecté"}
                    </span>
                  </div>
                  <div className="player-token">
                    {tokenOptions.find(token => token.id === player.token)?.emoji || "—"}
                  </div>
                  <div className={player.ready ? "ready-pill ready" : "ready-pill"}>
                    {player.ready ? "PRÊT" : "ATTENTE"}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="setup-card">
            <p className="eyebrow">TON PION</p>
            <h2>Choisis ton personnage</h2>

            <div className="token-grid">
              {tokenOptions.map(token => {
                const taken = takenTokens.has(token.id);
                const selected = me?.token === token.id;
                return (
                  <button
                    key={token.id}
                    className={`token-button ${selected ? "selected" : ""}`}
                    disabled={taken}
                    onClick={() =>
                      onAction({ type: "SELECT_TOKEN", token: token.id })
                    }
                  >
                    <span>{token.emoji}</span>
                    <strong>{token.label}</strong>
                    <small>{taken ? "Pris" : selected ? "Sélectionné" : "Libre"}</small>
                  </button>
                );
              })}
            </div>

            <button
              className={me?.ready ? "ready-main active" : "ready-main"}
              disabled={!me?.token}
              onClick={() =>
                onAction({ type: "SET_READY", ready: !me?.ready })
              }
            >
              {me?.ready ? "✓ Je suis prêt" : "Je suis prêt"}
            </button>

            {isHost && (
              <button
                className="start-button"
                disabled={!allReady}
                onClick={() => onAction({ type: "START_GAME" })}
              >
                🚀 Lancer la partie
              </button>
            )}

            {!isHost && (
              <div className="host-wait">
                L'host lancera la partie quand tout le monde sera prêt.
              </div>
            )}

            <button className="ghost-button" onClick={onLeave}>
              Quitter le lobby
            </button>
          </section>
        </div>
      </section>
    </main>
  );
}

function createGameState(lobby: LobbyState): GameState {
  const fallbackTokens: TokenKind[] = ["pawn", "bot", "car", "duck"];

  const players: Player[] = lobby.players
    .filter(player => player.connected)
    .map((player, index) => ({
      id: player.id,
      name: player.name,
      position: 0,
      money: 1500,
      token: player.token ?? fallbackTokens[index % fallbackTokens.length]
    }));

  return {
    players,
    turn: 0,
    owners: {},
    dice: [1, 1],
    rolledThisTurn: false,
    log: "La partie est lancée. Le gameplay est encore local dans cette V4."
  };
}

function GameScreen({ lobby }: { lobby: LobbyState }) {
  const [state, setState] = useState<GameState>(() => createGameState(lobby));
  const current = state.players[state.turn];
  const space = spaces[current.position];

  const canBuy = useMemo(
    () => !!space.price && !state.owners[space.index] && state.rolledThisTurn,
    [space, state.owners, state.rolledThisTurn]
  );

  return (
    <main className="shell">
      <section className="viewport">
        <Board3D state={state} />

        <div className="brand">
          <strong>DISCOPOLY</strong>
          <span>Lobby {lobby.roomId} · {state.players.length} joueurs</span>
        </div>

        <div className="network-banner">
          🟢 Lobby synchronisé · gameplay réseau complet à venir
        </div>

        <div className="hint">
          🖱️ Glisse pour tourner · molette pour zoomer
        </div>
      </section>

      <aside className="hud">
        <header>
          <p className="eyebrow">TOUR ACTUEL</p>
          <h1>{current.name}</h1>
          <div className="money">{current.money} D$</div>
        </header>

        <div className="dice-row">
          <div className="die-ui">{state.dice[0]}</div>
          <div className="die-ui">{state.dice[1]}</div>
        </div>

        <button
          className="primary"
          disabled={state.rolledThisTurn}
          onClick={() => setState(game => roll(game))}
        >
          🎲 Lancer les dés
        </button>

        <button
          disabled={!canBuy}
          onClick={() => setState(game => buy(game))}
        >
          🏠 Acheter {space.price ? `· ${space.price} D$` : ""}
        </button>

        <button
          disabled={!state.rolledThisTurn}
          onClick={() => setState(game => endTurn(game))}
        >
          Fin du tour →
        </button>

        <div className="card">
          <p className="eyebrow">CASE</p>
          <h2>{space.name}</h2>
          <p>{space.type}</p>
          {space.price && <strong>{space.price} D$</strong>}
        </div>

        <div className="log">{state.log}</div>

        <div className="players">
          {state.players.map((player, index) => (
            <div
              className={index === state.turn ? "player active" : "player"}
              key={player.id}
            >
              <span><i /> {player.name}</span>
              <strong>{player.money} D$</strong>
            </div>
          ))}
        </div>
      </aside>
    </main>
  );
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("auth");
  const [user, setUser] = useState<SessionUser | null>(null);
  const [discordInstanceId, setDiscordInstanceId] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [lobby, setLobby] = useState<LobbyState | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("disconnected");
  const connectionRef = useRef<LobbyConnection | null>(null);

  const discordMode = isRunningInsideDiscord();

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      if (discordMode) {
        const result = await initDiscord();
        if (!cancelled && result.connected) {
          setDiscordInstanceId(result.instanceId);
        }
      }

      const existingUser = await getSessionUser().catch(() => null);
      if (cancelled) return;

      if (existingUser) {
        setUser(existingUser);
        setScreen("home");
      } else {
        setScreen("auth");
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [discordMode]);

  useEffect(() => {
    if (!roomId || !user) return;

    connectionRef.current?.close();
    setLobby(null);

    const connection = connectLobby(
      roomId,
      nextLobby => {
        setLobby(nextLobby);
        if (nextLobby.status === "playing") setScreen("game");
      },
      setConnectionStatus
    );

    connectionRef.current = connection;

    return () => {
      connection.close();
      connectionRef.current = null;
    };
  }, [roomId, user]);

  async function handleActivityLogin() {
    try {
      setAuthError(null);
      const loggedIn = await authenticateActivity();
      setUser(loggedIn);
      setScreen("home");
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : "Connexion Discord impossible."
      );
    }
  }

  function joinRoom(nextRoomId: string) {
    setRoomId(nextRoomId);
    setScreen("lobby");
  }

  function leaveLobby() {
    connectionRef.current?.close();
    setRoomId(null);
    setLobby(null);
    setScreen("home");
  }

  async function handleLogout() {
    await logout();
    setUser(null);
    setRoomId(null);
    setLobby(null);
    setScreen("auth");
  }

  if (!user || screen === "auth") {
    return (
      <AuthScreen
        discordMode={discordMode}
        error={authError}
        onActivityLogin={handleActivityLogin}
      />
    );
  }

  if (screen === "home") {
    return (
      <>
        <HomeScreen
          user={user}
          activityInstanceId={discordInstanceId}
          onJoin={joinRoom}
        />
        <button className="logout-floating" onClick={handleLogout}>
          Déconnexion
        </button>
      </>
    );
  }

  if (screen === "lobby") {
    return (
      <LobbyScreen
        user={user}
        lobby={lobby}
        connectionStatus={connectionStatus}
        onAction={action => connectionRef.current?.send(action)}
        onLeave={leaveLobby}
      />
    );
  }

  if (screen === "game" && lobby) {
    return <GameScreen lobby={lobby} />;
  }

  return null;
}
