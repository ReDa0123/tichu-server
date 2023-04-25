import {
  always,
  any,
  anyPass,
  complement,
  compose,
  equals,
  filter,
  head,
  includes,
  isEmpty,
  isNil,
  keys,
  o,
  propEq,
  propSatisfies,
  values,
} from "ramda";
import {
  CHUNK_SIZE,
  DECK,
  DRAGON_NAME,
  MAHJONG_NAME,
  PHOENIX_NAME,
} from "./constants.js";

export const alwaysEmptyArray = always([]);
export const alwaysNull = always(null);
export const isNilOrEmpty = anyPass([isNil, isEmpty]);
export const notEqual = complement(equals);
export const propNotEq = complement(propEq);
export const equalsToOne = equals(1);

export const randomizeDeck = () => {
  const shuffledDeck = [...DECK];
  for (let i = shuffledDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledDeck[i], shuffledDeck[j]] = [shuffledDeck[j], shuffledDeck[i]];
  }
  return shuffledDeck;
};

export const chunkDeck = (deck) => {
  const chunks = [];
  for (let i = 0; i < deck.length; i += CHUNK_SIZE) {
    chunks.push(deck.slice(i, i + CHUNK_SIZE));
  }
  return chunks;
};

export const findPlayerNextTo = (ids, playerId, plus = 1) => {
  const index = ids.indexOf(playerId);
  const indexOfNextPlayer = (index + plus) % ids.length;
  return ids[indexOfNextPlayer];
};

export const isCardInArray = (searchedValue, cards, propName = "name") =>
  any(propSatisfies(equals(searchedValue), propName), cards);

export const getNextPlayerNotFinished = (turnOrder, socketId, finished) => {
  let nextPlayer = findPlayerNextTo(turnOrder, socketId);
  while (includes(nextPlayer, finished)) {
    nextPlayer = findPlayerNextTo(turnOrder, nextPlayer);
  }
  return nextPlayer;
};

export const countDeckScore = (cards) =>
  cards.reduce((acc, card) => {
    if (card.name === PHOENIX_NAME) {
      return acc - 25;
    }
    if (card.name === DRAGON_NAME) {
      return acc + 25;
    }
    if (card.number === "5") {
      return acc + 5;
    }
    if (card.number === "10" || card.number === "K") {
      return acc + 10;
    }
    return acc;
  }, 0);

export const allCardsAreSent = complement(o(any(isNilOrEmpty), values));

export const didAnyTeamFinish = (newFinished, teams) =>
  equals([...newFinished].sort(), [...teams[0].players].sort()) ||
  equals([...newFinished].sort(), [...teams[1].players].sort());

export const getPlayerOnPlay = compose(
  head,
  keys,
  filter(includes({ name: MAHJONG_NAME, number: 1, special: true }))
);
