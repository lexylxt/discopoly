export type SpaceType =
  | "go"
  | "property"
  | "railroad"
  | "utility"
  | "tax"
  | "chance"
  | "community"
  | "jail"
  | "free"
  | "gotojail";

export type Space = {
  index: number;
  name: string;
  type: SpaceType;
  price?: number;
  baseRent?: number;
  group?: string;
  icon?: string;
};

export const groupColors: Record<string, string> = {
  brown: "#8a5a44",
  lightblue: "#8bd3ea",
  pink: "#d95ba8",
  orange: "#f29a38",
  red: "#df4450",
  yellow: "#f0d84f",
  green: "#4aa66e",
  darkblue: "#3156a5"
};

// Structure économique/calendaire fidèle à un plateau Monopoly classique,
// mais avec des noms génériques "Discopoly" afin de pouvoir personnaliser ensuite.
export const spaces: Space[] = [
  { index: 0, name: "DÉPART", type: "go" },
  { index: 1, name: "Pixel Alley", type: "property", price: 60, baseRent: 2, group: "brown" },
  { index: 2, name: "Caisse", type: "community" },
  { index: 3, name: "Meme Street", type: "property", price: 60, baseRent: 4, group: "brown" },
  { index: 4, name: "Impôt", type: "tax" },
  { index: 5, name: "Station Alpha", type: "railroad", price: 200, baseRent: 25, icon: "/assets/train.gif" },
  { index: 6, name: "Bot Boulevard", type: "property", price: 100, baseRent: 6, group: "lightblue" },
  { index: 7, name: "Chance", type: "chance" },
  { index: 8, name: "Stream Lane", type: "property", price: 100, baseRent: 6, group: "lightblue" },
  { index: 9, name: "Emoji Avenue", type: "property", price: 120, baseRent: 8, group: "lightblue" },
  { index: 10, name: "PRISON / VISITE", type: "jail" },
  { index: 11, name: "Voice Plaza", type: "property", price: 140, baseRent: 10, group: "pink" },
  { index: 12, name: "Électricité", type: "utility", price: 150, icon: "/assets/electricity.gif" },
  { index: 13, name: "Stage Street", type: "property", price: 140, baseRent: 10, group: "pink" },
  { index: 14, name: "Thread Road", type: "property", price: 160, baseRent: 12, group: "pink" },
  { index: 15, name: "Station Beta", type: "railroad", price: 200, baseRent: 25, icon: "/assets/train.gif" },
  { index: 16, name: "Quest Quarter", type: "property", price: 180, baseRent: 14, group: "orange" },
  { index: 17, name: "Caisse", type: "community" },
  { index: 18, name: "Party Avenue", type: "property", price: 180, baseRent: 14, group: "orange" },
  { index: 19, name: "Arcade Row", type: "property", price: 200, baseRent: 16, group: "orange" },
  { index: 20, name: "PARKING GRATUIT", type: "free", icon: "/assets/free-parking.png" },
  { index: 21, name: "Nitro Street", type: "property", price: 220, baseRent: 18, group: "red" },
  { index: 22, name: "Chance", type: "chance" },
  { index: 23, name: "Creator Lane", type: "property", price: 220, baseRent: 18, group: "red" },
  { index: 24, name: "Server Square", type: "property", price: 240, baseRent: 20, group: "red" },
  { index: 25, name: "Station Gamma", type: "railroad", price: 200, baseRent: 25, icon: "/assets/train.gif" },
  { index: 26, name: "Boost Boulevard", type: "property", price: 260, baseRent: 22, group: "yellow" },
  { index: 27, name: "Sticker Street", type: "property", price: 260, baseRent: 22, group: "yellow" },
  { index: 28, name: "Eau", type: "utility", price: 150, icon: "/assets/water.gif" },
  { index: 29, name: "Soundboard Ave", type: "property", price: 280, baseRent: 24, group: "yellow" },
  { index: 30, name: "ALLEZ EN PRISON", type: "gotojail" },
  { index: 31, name: "Community Way", type: "property", price: 300, baseRent: 26, group: "green" },
  { index: 32, name: "Discovery Blvd", type: "property", price: 300, baseRent: 26, group: "green" },
  { index: 33, name: "Caisse", type: "community" },
  { index: 34, name: "Partner Plaza", type: "property", price: 320, baseRent: 28, group: "green" },
  { index: 35, name: "Station Delta", type: "railroad", price: 200, baseRent: 25, icon: "/assets/train.gif" },
  { index: 36, name: "Chance", type: "chance" },
  { index: 37, name: "Activity Park", type: "property", price: 350, baseRent: 35, group: "darkblue" },
  { index: 38, name: "Taxe luxe", type: "tax" },
  { index: 39, name: "Discopoly Heights", type: "property", price: 400, baseRent: 50, group: "darkblue" }
];

export function tileGrid(index: number): [number, number] {
  if (index <= 10) return [10 - index, 10];
  if (index <= 20) return [0, 20 - index];
  if (index <= 30) return [index - 20, 0];
  return [10, index - 30];
}

export function tileWorld(index: number) {
  const [gx, gz] = tileGrid(index);
  const x = (gx - 5) * 1.65;
  const z = (gz - 5) * 1.65;
  return [x, 0.33, z] as const;
}
