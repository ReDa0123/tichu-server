export const MAX_PLAYERS = 4;
export const COLORS = ["R", "G", "U", "B"];
export const NUMBERS = [
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
  "A",
];
export const DOG_NAME = "DOG";
export const PHOENIX_NAME = "PHOENIX";
export const MAHJONG_NAME = "MAHJONG";
export const DRAGON_NAME = "DRAGON";

export const SPECIAL_CARDS = [
  { name: DOG_NAME },
  { name: PHOENIX_NAME },
  { name: MAHJONG_NAME, number: 1 },
  { name: DRAGON_NAME, number: 25 },
];
export const DECK = [
  ...COLORS.map((color) =>
    NUMBERS.map((number) => ({ color, number, special: false }))
  ),
  SPECIAL_CARDS.map((card) => ({ ...card, special: true })),
].flat();

export const CHUNK_SIZE = DECK.length / 4;

export const GAME_PARTS = {
  SMALL_TICHU: "SMALL_TICHU",
  BIG_TICHU: "BIG_TICHU",
  SEND_CARDS: "SEND_CARDS",
  PLAY_CARDS: "PLAY_CARDS",
  TURN_END: "TURN_END",
};

export const DEFAULT_CURRENT_COMBINATION = {
  playedBy: "",
  cards: [],
  type: "",
};
