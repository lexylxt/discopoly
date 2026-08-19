import { spaces } from "./board";

export type Player = {
  id: string;
  name: string;
  position: number;
  money: number;
  token: "pawn" | "car" | "bot" | "duck";
};

export type GameState = {
  players: Player[];
  turn: number;
  owners: Record<number, string>;
  dice: [number, number];
  rolledThisTurn: boolean;
  log: string;
};

export const initialGame: GameState = {
  players: [
    { id: "p1", name: "Joueur 1", position: 0, money: 1500, token: "pawn" },
    { id: "p2", name: "Joueur 2", position: 0, money: 1500, token: "bot" }
  ],
  turn: 0,
  owners: {},
  dice: [1, 1],
  rolledThisTurn: false,
  log: "À toi de jouer."
};

export function roll(state: GameState): GameState {
  if (state.rolledThisTurn) return state;

  const d1 = Math.floor(Math.random() * 6) + 1;
  const d2 = Math.floor(Math.random() * 6) + 1;
  const nextPlayers = state.players.map(p => ({ ...p }));
  const player = nextPlayers[state.turn];

  const oldPos = player.position;
  player.position = (player.position + d1 + d2) % 40;

  let log = `${player.name} fait ${d1 + d2}.`;

  if (player.position < oldPos) {
    player.money += 200;
    log += " +200 au passage du Départ.";
  }

  const space = spaces[player.position];

  if (space.type === "gotojail") {
    player.position = 10;
    log += " Direction prison.";
  } else if (space.type === "tax") {
    const amount = space.index === 4 ? 200 : 100;
    player.money -= amount;
    log += ` Taxe de ${amount}.`;
  } else {
    const ownerId = state.owners[player.position];
    if (ownerId && ownerId !== player.id && space.baseRent) {
      player.money -= space.baseRent;
      const owner = nextPlayers.find(p => p.id === ownerId);
      if (owner) owner.money += space.baseRent;
      log += ` Loyer de ${space.baseRent}.`;
    } else {
      log += ` Arrivée sur ${space.name}.`;
    }
  }

  return {
    ...state,
    players: nextPlayers,
    dice: [d1, d2],
    rolledThisTurn: true,
    log
  };
}

export function buy(state: GameState): GameState {
  const player = state.players[state.turn];
  const space = spaces[player.position];

  if (!state.rolledThisTurn || !space.price || state.owners[space.index]) return state;
  if (player.money < space.price) return { ...state, log: "Pas assez d'argent." };

  const players = state.players.map(p =>
    p.id === player.id ? { ...p, money: p.money - space.price! } : p
  );

  return {
    ...state,
    players,
    owners: { ...state.owners, [space.index]: player.id },
    log: `${player.name} achète ${space.name} pour ${space.price}.`
  };
}

export function endTurn(state: GameState): GameState {
  if (!state.rolledThisTurn) return state;
  return {
    ...state,
    turn: (state.turn + 1) % state.players.length,
    rolledThisTurn: false,
    log: "Tour suivant."
  };
}
