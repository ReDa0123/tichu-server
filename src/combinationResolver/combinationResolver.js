import {
  add,
  all,
  anyPass,
  ascend,
  compose,
  converge,
  countBy,
  equals,
  filter,
  head,
  identity,
  includes,
  keys,
  last,
  length,
  map,
  o,
  pluck,
  prop,
  sort,
  splitEvery,
  startsWith,
  subtract,
  uniq,
  values as rValues,
} from "ramda";
import { isCardInArray, equalsToOne, isNilOrEmpty } from "../utils.js";
import { BOMBS, COMBINATIONS, PHOENIX_NAME, VALUES } from "../constants";

const getCardValues = o(
  sort(ascend(identity)),
  map((card) => VALUES[prop("number", card)])
);

const areValuesEqual = compose(equalsToOne, length, uniq);

const areValuesConnected = converge(equals, [
  converge(subtract, [last, head]),
  o(add(-1), length),
]);

const areCountValuesFullHouse = all(anyPass([equals(2), equals(3)]));

const getCountByObjValues = o(rValues, countBy(identity));

const getValueOfPairFromFullHouse = compose(
  Number,
  head,
  keys,
  filter(equals(2)),
  countBy(identity),
  getCardValues
);

export const isValidCombination = (
  playedCards,
  playedCombinationType,
  { cards: currentCards, type: currentCombinationType }
) => {
  if (isNilOrEmpty(currentCombinationType)) {
    return true;
  }

  const checkedPlayedCombination = startsWith(
    COMBINATIONS.BOMB_STRAIGHT,
    playedCombinationType
  )
    ? COMBINATIONS.BOMB_STRAIGHT
    : playedCombinationType;

  const checkedCurrentCombination = startsWith(
    COMBINATIONS.BOMB_STRAIGHT,
    currentCombinationType
  )
    ? COMBINATIONS.BOMB_STRAIGHT
    : currentCombinationType;

  if (
    (includes(checkedPlayedCombination, BOMBS) &&
      !includes(checkedCurrentCombination, BOMBS)) ||
    (COMBINATIONS.BOMB_STRAIGHT === checkedPlayedCombination &&
      COMBINATIONS.BOMB_STRAIGHT !== checkedCurrentCombination) ||
    (COMBINATIONS.BOMB_STRAIGHT === checkedPlayedCombination &&
      COMBINATIONS.BOMB_STRAIGHT === checkedPlayedCombination &&
      playedCards.length > currentCards.length)
  ) {
    return true;
  }

  return (
    playedCombinationType === currentCombinationType &&
    isBiggerCombination(playedCards, currentCards, currentCombinationType)
  );
};

export const getCombinationType = (playedCards) => {
  if (playedCards.length === 0) {
    return null;
  }
  if (playedCards.length === 1) {
    return COMBINATIONS.SINGLE;
  }
  if (isCombinationPair(playedCards)) {
    const pairLength = playedCards.length / 2;
    return pairLength === 1
      ? COMBINATIONS.PAIR
      : `${COMBINATIONS.PAIR}${pairLength}`;
  }
  if (isCombinationTriple(playedCards)) {
    return COMBINATIONS.TRIPLE;
  }
  if (isCombinationFullHouse(playedCards)) {
    return COMBINATIONS.FULL_HOUSE;
  }
  if (isCombinationBomb4(playedCards)) {
    return COMBINATIONS.BOMB4;
  }
  if (isCombinationStraight(playedCards)) {
    const straightLength = playedCards.length;
    if (isStraightBomb(playedCards)) {
      return `${COMBINATIONS.BOMB_STRAIGHT}${straightLength}`;
    }
    return `${COMBINATIONS.STRAIGHT}${straightLength}`;
  }
  return null;
};

export const isCombinationPair = (playedCards) => {
  const values = getCardValues(playedCards);
  const length = values.length;
  const valuesSplitByTwo = splitEvery(2, values);
  const uniqueValues = uniq(values);
  return (
    length % 2 === 0 &&
    length / 2 === uniqueValues.length &&
    all(areValuesEqual, valuesSplitByTwo) &&
    areValuesConnected(uniqueValues)
  );
};

export const isCombinationTriple = (playedCards) => {
  const values = getCardValues(playedCards);
  return values.length === 3 && areValuesEqual(values);
};

export const isCombinationFullHouse = (playedCards) => {
  const values = getCardValues(playedCards);
  const countByObjValues = getCountByObjValues(values);
  const uniqueValuesLength = uniq(values).length;
  return (
    values.length === 5 &&
    uniqueValuesLength === 2 &&
    areCountValuesFullHouse(countByObjValues)
  );
};

export const isCombinationBomb4 = (playedCards) => {
  if (isCardInArray(PHOENIX_NAME, playedCards)) return false;
  const values = getCardValues(playedCards);
  return values.length === 4 && areValuesEqual(values);
};

export const isCombinationStraight = (playedCards) => {
  const values = getCardValues(playedCards);
  const uniqueValues = uniq(values);
  return (
    values.length >= 5 &&
    values.length === uniqueValues.length &&
    areValuesConnected(values)
  );
};

const isStraightBomb = compose(equalsToOne, length, uniq, pluck("color"));

export const isBiggerCombination = (
  playedCards,
  currentCards,
  currentCombinationType
) => {
  if (currentCombinationType !== COMBINATIONS.FULL_HOUSE) {
    return commonCombinationResolver(playedCards, currentCards);
  }
  return fullHouseCombinationResolver(playedCards, currentCards);
};

const commonCombinationResolver = (playedCards, currentCards) => {
  const currentValues = getCardValues(currentCards);
  const playedValues = getCardValues(playedCards);
  return last(playedValues) > last(currentValues);
};

const fullHouseCombinationResolver = (playedCards, currentCards) =>
  getValueOfPairFromFullHouse(playedCards) >
  getValueOfPairFromFullHouse(currentCards);
