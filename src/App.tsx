import { useEffect, useMemo, useRef, useState } from "react";
import Board3D from "./Board3D";
import { spaces } from "./board";
import type { GameState } from "./game";
import { authenticateActivity, initDiscord, isRunningInsideDiscord } from "./discord";
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

type Screen = "auth" | "home" | "room";
type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

const tokenOptions: { id: TokenKind; label: string; emoji: string }[] = [
  { id: "pawn", label: "Pion", emoji: "♟️" },
  { id: "bot", label: "Bot", emoji: "🤖" },
  { id: "car", label: "Voiture", emoji: "🏎️" },
  { id: "duck", label: "Canard", emoji: "🦆" }
];

function PlayerAvatar({ user }: { user: { name: string; avatar: string | null } }) {
  if (user.avatar) return <img className="avatar" src={user.avatar} alt="" />;
  return <div className="avatar avatar-fallback">{user.name.slice(0, 1).toUpperCase()}</div>;
}

function AuthScreen({ discordMode, error, onActivityLogin }: {
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
        <p className="hero-copy">Crée un lobby, invite tes amis et joue sur un plateau partagé.</p>
        {error && <div className="error-box">{error}</div>}
        {discordMode ? (
          <button className="discord-button" onClick={onActivityLogin}>🎮 Se connecter avec Discord</button>
        ) : (
          <button className="discord-button" onClick={() => { window.location.href = "/api/auth/discord/start"; }}>
            💬 Se connecter avec Discord
          </button>
        )}
        <p className="fine-print">{discordMode ? "Mode Activity" : "Mode Web · OAuth2 Discord"}</p>
      </section>
    </main>
  );
}

function HomeScreen({ user, activityInstanceId, onJoin }: {
  user: SessionUser;
  activityInstanceId: string | null;
  onJoin: (roomId: string) => void;
}) {
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleCreate() {
    setBusy(true);
    try { onJoin(await createRoom()); } finally { setBusy(false); }
  }

  return (
    <main className="menu-page">
      <section className="home-panel">
        <header className="menu-header">
          <div><p className="eyebrow">DISCOPOLY ONLINE</p><h1>Jouer</h1></div>
          <div className="user-chip"><PlayerAvatar user={user} /><div><strong>{user.name}</strong><span>@{user.username}</span></div></div>
        </header>

        <div className="menu-grid">
          {activityInstanceId && (
            <article className="action-card accent-card">
              <div className="action-icon">🎙️</div><h2>Lobby de l'appel</h2>
              <p>Rejoins automatiquement l'instance Discord.</p>
              <button className="primary" onClick={() => onJoin(`ACT-${activityInstanceId}`)}>Rejoindre l'appel</button>
            </article>
          )}
          <article className="action-card">
            <div className="action-icon">✨</div><h2>Créer une partie</h2><p>Génère un code à partager.</p>
            <button className="primary" disabled={busy} onClick={handleCreate}>{busy ? "Création..." : "Créer un lobby"}</button>
          </article>
          <article className="action-card">
            <div className="action-icon">🔑</div><h2>Rejoindre</h2><p>Entre le code reçu.</p>
            <input className="room-input" value={joinCode} placeholder="EX: 7KQ4PF"
              onChange={e => setJoinCode(e.target.value.toUpperCase().replace(/\s/g, ""))} />
            <button disabled={!joinCode.trim()} onClick={() => onJoin(joinCode.trim())}>Rejoindre</button>
          </article>
        </div>
      </section>
    </main>
  );
}

function LobbyScreen({ user, lobby, status, onAction, onLeave, error }: {
  user: SessionUser;
  lobby: LobbyState | null;
  status: ConnectionStatus;
  onAction: (action: object) => void;
  onLeave: () => void;
  error: string | null;
}) {
  if (!lobby) return <main className="menu-page"><section className="hero-card compact"><div className="loading-ring"/><h2>Connexion...</h2></section></main>;

  const me = lobby.players.find(p => p.id === user.id);
  const connected = lobby.players.filter(p => p.connected);
  const isHost = lobby.hostId === user.id;
  const allReady = connected.length >= 2 && connected.every(p => p.ready && p.token);
  const taken = new Set(lobby.players.filter(p => p.id !== user.id && p.token).map(p => p.token));

  return (
    <main className="menu-page">
      <section className="lobby-panel">
        <header className="lobby-header">
          <div><p className="eyebrow">LOBBY</p><h1>{lobby.roomId.startsWith("ACT-") ? "Appel Discord" : lobby.roomId}</h1></div>
          <div className={`connection-badge ${status}`}><i/>{status}</div>
        </header>
        {error && <div className="error-box">{error}</div>}
        <div className="lobby-layout">
          <section className="roster-card">
            <div className="section-title"><h2>Joueurs</h2><span>{connected.length}/8</span></div>
            <div className="roster">
              {lobby.players.map(player => (
                <div className={`roster-player ${player.connected ? "" : "offline"}`} key={player.id}>
                  <PlayerAvatar user={player}/>
                  <div className="roster-name"><strong>{player.name}</strong><span>{player.id === lobby.hostId ? "👑 Host" : ""}</span></div>
                  <div className="player-token">{tokenOptions.find(t => t.id === player.token)?.emoji || "—"}</div>
                  <div className={player.ready ? "ready-pill ready" : "ready-pill"}>{player.ready ? "PRÊT" : "ATTENTE"}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="setup-card">
            <p className="eyebrow">TON PION</p><h2>Choisis ton personnage</h2>
            <div className="token-grid">
              {tokenOptions.map(token => (
                <button key={token.id} className={`token-button ${me?.token === token.id ? "selected" : ""}`}
                  disabled={taken.has(token.id)}
                  onClick={() => onAction({ type: "SELECT_TOKEN", token: token.id })}>
                  <span>{token.emoji}</span><strong>{token.label}</strong><small>{taken.has(token.id) ? "Pris" : "Libre"}</small>
                </button>
              ))}
            </div>
            <button className={me?.ready ? "ready-main active" : "ready-main"} disabled={!me?.token}
              onClick={() => onAction({ type: "SET_READY", ready: !me?.ready })}>
              {me?.ready ? "✓ Je suis prêt" : "Je suis prêt"}
            </button>
            {isHost && <button className="start-button" disabled={!allReady} onClick={() => onAction({ type: "START_GAME" })}>🎲 Déterminer l'ordre</button>}
            {!isHost && <div className="host-wait">L'host lancera la détermination de l'ordre.</div>}
            <button className="ghost-button" onClick={onLeave}>Quitter le lobby</button>
          </section>
        </div>
      </section>
    </main>
  );
}

function OrderingScreen({ user, lobby, onAction, error }: {
  user: SessionUser;
  lobby: LobbyState;
  onAction: (action: object) => void;
  error: string | null;
}) {
  const myRoll = lobby.orderRolls[user.id];
  return (
    <main className="menu-page">
      <section className="home-panel order-panel">
        <p className="eyebrow">ORDRE DE JEU</p>
        <h1>Qui commence ?</h1>
        <p className="hero-copy">Chaque joueur lance deux dés. Le plus grand total commence.</p>
        {error && <div className="error-box">{error}</div>}

        <div className="order-list">
          {lobby.players.filter(p => p.connected).map(player => {
            const roll = lobby.orderRolls[player.id];
            return (
              <div className="order-player" key={player.id}>
                <PlayerAvatar user={player}/>
                <strong>{player.name}</strong>
                <div className="order-dice">{roll ? `${roll.dice[0]} + ${roll.dice[1]}` : "—"}</div>
                <div className="order-total">{roll ? roll.total : "En attente"}</div>
              </div>
            );
          })}
        </div>

        <button className="discord-button order-roll-button" disabled={!!myRoll} onClick={() => onAction({ type: "ROLL_ORDER" })}>
          {myRoll ? `Tu as fait ${myRoll.total}` : "🎲 Lancer pour l'ordre"}
        </button>
      </section>
    </main>
  );
}

function GameScreen({ user, lobby, onAction, error }: {
  user: SessionUser;
  lobby: LobbyState;
  onAction: (action: object) => void;
  error: string | null;
}) {
  if (!lobby.game) return null;

  const state = lobby.game as GameState;
  const current = state.players[state.turn];
  const space = spaces[current.position];
  const myTurn = current.id === user.id;
  const canBuy = myTurn && state.rolledThisTurn && !!space.price && !state.owners[space.index];

  return (
    <main className="shell">
      <section className="viewport">
        <Board3D state={state}/>
        <div className="brand"><strong>DISCOPOLY</strong><span>Lobby {lobby.roomId}</span></div>
        <div className={myTurn ? "turn-banner my-turn" : "turn-banner"}>
          {myTurn ? "🎯 À TON TOUR" : `⏳ Tour de ${current.name}`}
        </div>
        <div className="hint">🖱️ Glisse pour tourner · molette pour zoomer</div>
      </section>

      <aside className="hud">
        {error && <div className="error-box">{error}</div>}
        <header><p className="eyebrow">TOUR ACTUEL</p><h1>{current.name}</h1><div className="money">{current.money} D$</div></header>
        <div className="dice-row"><div className="die-ui">{state.dice[0]}</div><div className="die-ui">{state.dice[1]}</div></div>
        <button className="primary" disabled={!myTurn || state.rolledThisTurn} onClick={() => onAction({ type: "ROLL_DICE" })}>🎲 Lancer les dés</button>
        <button disabled={!canBuy} onClick={() => onAction({ type: "BUY_PROPERTY" })}>🏠 Acheter {space.price ? `· ${space.price} D$` : ""}</button>
        <button disabled={!myTurn || !state.rolledThisTurn} onClick={() => onAction({ type: "END_TURN" })}>Fin du tour →</button>
        <div className="card"><p className="eyebrow">CASE</p><h2>{space.name}</h2><p>{space.type}</p>{space.price && <strong>{space.price} D$</strong>}</div>
        <div className="log">{state.log}</div>
        <div className="players">
          {state.players.map((p, i) => <div className={i === state.turn ? "player active" : "player"} key={p.id}><span><i/> {p.name}</span><strong>{p.money} D$</strong></div>)}
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
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");
  const [networkError, setNetworkError] = useState<string | null>(null);
  const connectionRef = useRef<LobbyConnection | null>(null);
  const discordMode = isRunningInsideDiscord();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (discordMode) {
        const result = await initDiscord();
        if (!cancelled && result.connected) setDiscordInstanceId(result.instanceId);
      }
      const existing = await getSessionUser().catch(() => null);
      if (!cancelled) {
        if (existing) { setUser(existing); setScreen("home"); }
        else setScreen("auth");
      }
    })();
    return () => { cancelled = true; };
  }, [discordMode]);

  useEffect(() => {
    if (!roomId || !user) return;
    connectionRef.current?.close();
    setLobby(null);
    setNetworkError(null);

    const connection = connectLobby(
      roomId,
      next => { setLobby(next); setNetworkError(null); },
      setConnectionStatus,
      setNetworkError
    );
    connectionRef.current = connection;

    return () => { connection.close(); connectionRef.current = null; };
  }, [roomId, user]);

  async function handleActivityLogin() {
    try {
      setAuthError(null);
      const loggedIn = await authenticateActivity();
      setUser(loggedIn);
      setScreen("home");
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : "Connexion Discord impossible.");
    }
  }

  function joinRoom(id: string) { setRoomId(id); setScreen("room"); }
  function leaveRoom() { connectionRef.current?.close(); setRoomId(null); setLobby(null); setScreen("home"); }

  if (!user || screen === "auth") return <AuthScreen discordMode={discordMode} error={authError} onActivityLogin={handleActivityLogin}/>;
  if (screen === "home") return <><HomeScreen user={user} activityInstanceId={discordInstanceId} onJoin={joinRoom}/><button className="logout-floating" onClick={async () => { await logout(); location.reload(); }}>Déconnexion</button></>;
  if (!lobby) return <LobbyScreen user={user} lobby={null} status={connectionStatus} onAction={() => {}} onLeave={leaveRoom} error={networkError}/>;
  if (lobby.status === "lobby") return <LobbyScreen user={user} lobby={lobby} status={connectionStatus} onAction={a => connectionRef.current?.send(a)} onLeave={leaveRoom} error={networkError}/>;
  if (lobby.status === "ordering") return <OrderingScreen user={user} lobby={lobby} onAction={a => connectionRef.current?.send(a)} error={networkError}/>;
  if (lobby.status === "playing") return <GameScreen user={user} lobby={lobby} onAction={a => connectionRef.current?.send(a)} error={networkError}/>;
  return null;
}
