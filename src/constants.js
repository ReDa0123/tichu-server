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

export const COMBINATIONS = {
  SINGLE: "SINGLE",
  PAIR: "PAIR",
  TRIPLE: "TRIPLE",
  FULL_HOUSE: "FULL_HOUSE",
  STRAIGHT: "STRAIGHT",
  BOMB4: "BOMB4",
  BOMB_STRAIGHT: "BOMB_STRAIGHT",
};

export const BOMBS = [COMBINATIONS.BOMB4, COMBINATIONS.BOMB_STRAIGHT];

export const VALUES = {
  [NUMBERS[1]]: 1,
  [NUMBERS[0]]: 2,
  [NUMBERS[1]]: 3,
  [NUMBERS[2]]: 4,
  [NUMBERS[3]]: 5,
  [NUMBERS[4]]: 6,
  [NUMBERS[5]]: 7,
  [NUMBERS[6]]: 8,
  [NUMBERS[7]]: 9,
  [NUMBERS[8]]: 10,
  [NUMBERS[9]]: 11,
  [NUMBERS[10]]: 12,
  [NUMBERS[11]]: 13,
  [NUMBERS[12]]: 14,
  0.5: 0.5,
  1.5: 1.5,
  2.5: 2.5,
  3.5: 3.5,
  4.5: 4.5,
  5.5: 5.5,
  6.5: 6.5,
  7.5: 7.5,
  8.5: 8.5,
  9.5: 9.5,
  10.5: 10.5,
  11.5: 11.5,
  12.5: 12.5,
  13.5: 13.5,
  14.5: 14.5,
  25: 25,
};
