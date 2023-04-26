import { getGameState, setGameState } from "../gameState.js";
import { includes, isEmpty } from "ramda";
import {
  didAnyTeamFinish,
  getNextPlayerNotFinished,
  isCardInArray,
  propNotEq,
} from "../utils.js";
import { DOG_NAME, DRAGON_NAME, PHOENIX_NAME } from "../constants.js";
import {
  resolveDragonSend,
  resolveNormalEnd,
  resolveTeamEnd,
  resolveTichus,
  resolveTurnEnd,
} from "../resolvers.js";
import { emitMessage, emitStateChanged } from "../emiters.js";
import {
  getCombinationType,
  isValidCombination,
} from "../combinationResolver/combinationResolver.js";

export const dogListener = (io, socket) => () => {
  const socketId = socket.id;
  const roomId = socket.room;
  const gameState = getGameState(roomId);
  const {
    cards: cardsInHand,
    cards: { [socketId]: playersCards },
    teams,
    finished,
    collectedCards,
    turnOrder,
    tichu: tichus,
  } = gameState;
  const team = teams.find((team) => includes(socketId, team.players)).players;
  const teammate = team.find((player) => player !== socketId);
  const onPlay = includes(teammate, finished)
    ? getNextPlayerNotFinished(turnOrder, teammate, finished)
    : teammate;
  const playersCardsWithoutDog = playersCards.filter(
    propNotEq("name", DOG_NAME)
  );

  const didSocketFinish = playersCardsWithoutDog.length === 0;
  const isFinishedEmpty = isEmpty(finished);
  if (didSocketFinish && isFinishedEmpty) {
    resolveTichus(io, {
      finished,
      teams,
      socketId,
      roomId,
      tichus,
    });
  }
  const newFinished = didSocketFinish ? [...finished, socketId] : [...finished];

  if (newFinished.length === turnOrder.length - 1) {
    return resolveNormalEnd(io, {
      turnOrder,
      newFinished,
      teams,
      cardsPlayedThisTurn: [],
      cards: [],
      collectedCards,
      cardsInHand,
      roomId,
    });
  }

  if (didAnyTeamFinish(newFinished, teams)) {
    return resolveTeamEnd(io, { socketId, teams, roomId, cardsInHand });
  }

  const newGameState = {
    ...gameState,
    cards: {
      ...gameState.cards,
      [socketId]: playersCardsWithoutDog,
    },
    onPlay,
    finished: newFinished,
  };
  setGameState(roomId, newGameState);
  emitStateChanged(io, roomId, newGameState);
  emitMessage(io, roomId, `${socketId} played a dog.`);
};

export const passListener = (io, socket) => () => {
  const socketId = socket.id;
  const roomId = socket.room;
  const gameState = getGameState(roomId);
  const { turnOrder, numberOfPasses, finished, cardsPlayedThisTurn } =
    gameState;
  const passesNeeded = turnOrder.length - finished.length - 1;
  const newNumberOfPasses = numberOfPasses + 1;

  if (newNumberOfPasses >= passesNeeded) {
    if (isCardInArray(DRAGON_NAME, cardsPlayedThisTurn)) {
      return resolveDragonSend(io, roomId);
    }
    return resolveTurnEnd(io, roomId);
  }
  const nextPlayer = getNextPlayerNotFinished(turnOrder, socketId, finished);

  const newGameState = {
    ...gameState,
    numberOfPasses: newNumberOfPasses,
    onPlay: nextPlayer,
  };
  setGameState(roomId, newGameState);
  emitStateChanged(io, roomId, newGameState);
  emitMessage(io, roomId, `${socketId} passed.`);
};

export const playCardsListener =
  (io, socket) =>
  ({ cards, combinationType }) => {
    const socketId = socket.id;
    const roomId = socket.room;
    const gameState = getGameState(roomId);
    const playedCombinationType = getCombinationType(cards);
    if (
      combinationType !== playedCombinationType ||
      !isValidCombination(
        cards,
        playedCombinationType,
        gameState.currentCombination
      )
    ) {
      socket.emit("message", "Invalid combination");
      socket.emit("stateChanged", gameState);
    }
    const {
      turnOrder,
      finished,
      cardsPlayedThisTurn,
      cards: cardsInHand,
      cards: { [socketId]: playersCards },
      teams,
      collectedCards,
      tichu: tichus,
    } = gameState;
    const nextPlayer = getNextPlayerNotFinished(turnOrder, socketId, finished);

    let newPlayersCards = playersCards.filter((card) => !includes(card, cards));

    if (isCardInArray(PHOENIX_NAME, cards)) {
      newPlayersCards = newPlayersCards.filter(propNotEq("name", PHOENIX_NAME));
    }

    const didSocketFinish = newPlayersCards.length === 0;
    const isFinishedEmpty = isEmpty(finished);
    if (didSocketFinish && isFinishedEmpty) {
      resolveTichus(io, {
        finished,
        teams,
        socketId,
        roomId,
        tichus,
      });
    }
    const newFinished = didSocketFinish
      ? [...finished, socketId]
      : [...finished];

    if (newFinished.length === turnOrder.length - 1) {
      return resolveNormalEnd(io, {
        turnOrder,
        newFinished,
        teams,
        cardsPlayedThisTurn,
        cards,
        collectedCards,
        cardsInHand,
        roomId,
      });
    }

    if (didAnyTeamFinish(newFinished, teams)) {
      return resolveTeamEnd(io, { socketId, teams, roomId, cardsInHand });
    }

    const newGameState = {
      ...gameState,
      cards: {
        ...gameState.cards,
        [socketId]: newPlayersCards,
      },
      currentCombination: {
        playedBy: socketId,
        cards,
        type: combinationType,
      },
      cardsPlayedThisTurn: [...cardsPlayedThisTurn, ...cards],
      onPlay: nextPlayer,
      numberOfPasses: isEmpty(newPlayersCards) ? -1 : 0,
      finished: newFinished,
    };
    setGameState(roomId, newGameState);
    const cardsMessageArray = cards.map(({ name, color, number }) => {
      return name ? name : `${number}${color}`;
    });
    emitMessage(
      io,
      roomId,
      `${socketId} played ${cardsMessageArray.join(", ")}.`
    );
    emitStateChanged(io, roomId, newGameState);
  };
