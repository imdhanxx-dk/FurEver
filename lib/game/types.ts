export type Species = 'cat' | 'dog' | 'fusion';
export type Personality =
  | 'Playful'
  | 'Curious'
  | 'Brave'
  | 'Sleepy'
  | 'Shy'
  | 'Calm';
export type Rarity = 'Common' | 'Uncommon' | 'Epic' | 'Legendary' | 'Superior';
export type Item = {
  id: string;
  name: string;
  category: string;
  rarity: Rarity;
  price: number;
  description: string;
  icon: string;
};
export type Location = {
  id: number;
  name: string;
  level: number;
  enemy: string;
  lore: string;
  color: string;
  x: number;
  y: number;
};
export type Pet = {
  name: string;
  species: Species;
  personality: Personality;
  hunger: number;
  happiness: number;
  cleanliness: number;
  energy: number;
  bond: number;
  appearance: string;
  appearanceFormat?: 'companion-atlas-v1' | 'portrait';
  equipped: string[];
};
export type Battle = {
  id: string;
  location: number;
  enemy: string;
  hp: number;
  maxHp: number;
  enemyHp: number;
  enemyMaxHp: number;
  turn: number;
  charge: number;
  cooldown: number;
  guard: number;
  poison: number;
  started: number;
  finished: boolean;
  log: string[];
};
export type Challenge = {
  id: string;
  nonce: string;
  kind: 'grooming' | 'play';
  started: number;
  expires: number;
  step: number;
  targets: number[];
  lastStep: number;
};
export type Generation = {
  id: string;
  kind: 'avatar' | 'pet' | 'fusion';
  attempts: number;
  selected: string | null;
  candidates: {
    id: string;
    status: 'pending' | 'ready' | 'failed';
    url?: string;
    format?: 'companion-atlas-v1' | 'portrait';
    prompt: string;
    created: number;
  }[];
};
export type PlayerState = {
  welcomeGift?: boolean;
  loginGifts?: { day: string; days: number };
  kittenRound?: import('./kitten-drop').KittenRound | null;
  kittenBest?: number;
  version: 1;
  coins: number;
  xp: number;
  pet: Pet | null;
  avatar: string | null;
  inventory: Record<string, number>;
  daily: {
    day: string;
    tasks: string[];
    claimed: boolean;
    grooming: number;
    play: number;
  };
  streak: { day: string; count: number };
  cooldowns: Record<string, number>;
  battle: Battle | null;
  expedition: {
    id: string;
    location: number;
    step: number;
    started: number;
    lastStep: number;
    finds: string[];
  } | null;
  challenge: Challenge | null;
  gacha: {
    total: number;
    epic: number;
    legendary: number;
    mythic: number;
    history: {
      id: string;
      item: string;
      rarity: Rarity;
      time: number;
      duplicateCoins?: number;
      payment?: 'tickets' | 'coins';
      cost?: number;
    }[];
  };
  generations: Generation[];
  achievements: string[];
  stats: { battles: number; expeditions: number; grooms: number };
  event: { id: string; tokens: number; claimed: string[] };
  lastSeen: number;
  world?: WorldProgress;
  petNames?: Record<string, string>;
};
export type WorldProgress = {
  position: [number, number];
  updated: number;
  stage: number;
  collected: string[];
  discovered: string[];
  quests: string[];
  secrets: string[];
  checkpoint: string;
  challenge: { started: number; nodes: string[] } | null;
  history: { id: string; title: string; time: number }[];
};
export type LedgerEntry = {
  kind: string;
  currency: 'PC' | 'XP';
  amount: number;
  before: number;
  after: number;
  source: string;
};
export type Context = {
  now: number;
  random: () => number;
  id: () => string;
  admin: boolean;
  config: GameConfig;
};
export type GameConfig = {
  betaDiscordIds?: string[];
  name: string;
  maintenance: boolean;
  prices: Record<string, number>;
  expBottle: number;
  dailyCoins: number;
  dailyXp: number;
  groomCoins: number;
  playCoins: number;
  minigameLimit: number;
  moraRate: number;
  gachaWeights: number[];
  pity: { epic: number; legendary: number; mythic: number };
  event: {
    id: string;
    name: string;
    lore: string;
    starts: string;
    ends: string;
    featured: string;
  };
  packages: {
    id: string;
    name: string;
    coins: number;
    amount: number;
    currency: string;
    enabled: boolean;
  }[];
};
export type Intent = { action: string; [key: string]: unknown };
export type GameResult = {
  revision?: number;
  state: PlayerState;
  message: string;
  ledger: LedgerEntry[];
  rewards?: { item: string; rarity: Rarity; duplicateCoins?: number }[];
};
