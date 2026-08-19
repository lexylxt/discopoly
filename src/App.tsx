import { useEffect, useMemo, useState } from "react";
import Board3D from "./Board3D";
import { spaces } from "./board";
import { buy, endTurn, initialGame, roll, type GameState } from "./game";
import { initDiscord } from "./discord";

export default function App() {
  const [state, setState] = useState<GameState>(initialGame);
  const [discordState, setDiscordState] = useState("Connexion Discord…");

  useEffect(() => {
    initDiscord().then((result) => {
      setDiscordState(
        result.connected
          ? `Discord connecté · instance ${result.instanceId ?? "?"}`
          : result.reason ?? "Mode navigateur"
      );
    });
  }, []);

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
          <span>{discordState}</span>
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
          onClick={() => setState(s => roll(s))}
        >
          🎲 Lancer les dés
        </button>

        <button
          disabled={!canBuy}
          onClick={() => setState(s => buy(s))}
        >
          🏠 Acheter {space.price ? `· ${space.price} D$` : ""}
        </button>

        <button
          disabled={!state.rolledThisTurn}
          onClick={() => setState(s => endTurn(s))}
        >
          Fin du tour →
        </button>

        <div className="card">
          <p className="eyebrow">CASE</p>
          <h2>{space.name}</h2>
          <p>{space.type}</p>
          {space.price && <strong>{space.price} D$</strong>}
          {state.owners[space.index] && (
            <p>Propriétaire : {state.players.find(p => p.id === state.owners[space.index])?.name}</p>
          )}
        </div>

        <div className="log">{state.log}</div>

        <div className="players">
          {state.players.map((p, i) => (
            <div className={i === state.turn ? "player active" : "player"} key={p.id}>
              <span><i /> {p.name}</span>
              <strong>{p.money} D$</strong>
            </div>
          ))}
        </div>

        <footer>
          Prototype 3D · règles encore simplifiées
        </footer>
      </aside>
    </main>
  );
}
