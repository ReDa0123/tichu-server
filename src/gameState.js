import { alwaysEmptyArray, chunkDeck, randomizeDeck } from "./utils.js";
import { DEFAULT_CURRENT_COMBINATION, GAME_PARTS } from "./constants.js";
import { addIndex, map } from "ramda";
import { emitMessage, emitStateChanged } from "./emiters.js";

const gameStates = {};
const sentCards = {};
const tichus = {};
const continues = {};

export const getGameState = (roomId) => gameStates[roomId];
export const getSentCards = (roomId) => sentCards[roomId];
export const getTichus = (roomId) => tichus[roomId];
export const getContinues = (roomId) => continues[roomId];

export const setGameState = (roomId, newGameState) =>
  (gameStates[roomId] = newGameState);

export const setSentCards = (roomId, newSentCards) =>
  (sentCards[roomId] = newSentCards);

export const setSentCardsForPlayer = (roomId, socketId, newSentCards) =>
  (sentCards[roomId][socketId] = newSentCards);

export const setTichusForPlayer = (roomId, socketId, newTichus) =>
  (tichus[roomId][socketId] = newTichus);

export const resetSentCards = (roomId) =>
  map(alwaysEmptyArray, sentCards[roomId]);

export const resetTichus = (roomId) => (tichus[roomId] = {});

export const resetContinues = (roomId) => (continues[roomId] = 0);

export const addOneToContinues = (roomId) => continues[roomId]++;

export const deleteRoomStates = (roomId) => {
  delete gameStates[roomId];
  delete sentCards[roomId];
  delete tichus[roomId];
  delete continues[roomId];
};

export const initGameState = (io, roomId) => {
  const finalState = {};
  const chunks = chunkDeck(randomizeDeck());
  const clientIds = io.sockets.adapter.rooms.get(roomId);
  setSentCards(roomId, {});
  resetTichus(roomId);
  resetContinues(roomId);
  let i = 0;
  const team1 = [];
  const team2 = [];
  finalState.turnOrder = [];
  finalState.collectedCards = {};
  finalState.cards = {};
  finalState.tichu = {};
  finalState.usernames = {};
  clientIds.forEach((clientId) => {
    finalState.usernames[clientId] = io.sockets.sockets.get(clientId).username;
    sentCards[roomId][clientId] = [];
    finalState.cards[clientId] = chunks[i];
    finalState.collectedCards[clientId] = [];
    finalState.turnOrder.push(clientId);
    finalState.tichu[clientId] = null;
    i++;
    if (i % 2 === 0) {
      team1.push(clientId);
    } else {
      team2.push(clientId);
    }
  });
  finalState.currentCombination = DEFAULT_CURRENT_COMBINATION;
  finalState.teams = [
    { players: team1, score: 0, index: 0 },
    { players: team2, score: 0, index: 1 },
  ];
  finalState.onPlay = "";
  finalState.numberOfPasses = 0;
  finalState.cardsPlayedThisTurn = [];
  finalState.finished = [];
  finalState.gamePart = GAME_PARTS.BIG_TICHU;
  finalState.sendDeck = false;
  setGameState(roomId, finalState);
};

export const startNewTurn = (io, roomId) => {
  const roomGameState = getGameState(roomId);
  const shuffledDeck = randomizeDeck();
  const chunks = chunkDeck(shuffledDeck);
  const newCards = addIndex(map)(
    (_, index) => chunks[index],
    roomGameState.cards
  );
  const newGameState = {
    ...roomGameState,
    collectedCards: map(alwaysEmptyArray, roomGameState.collectedCards),
    cards: newCards,
    currentCombination: DEFAULT_CURRENT_COMBINATION,
    onPlay: "",
    numberOfPasses: 0,
    cardsPlayedThisTurn: [],
    finished: [],
    gamePart: GAME_PARTS.BIG_TICHU,
    sendDeck: false,
  };
  gameStates[roomId] = newGameState;
  emitStateChanged(io, roomId, newGameState);
  emitMessage(io, roomId, "New turn started.");
};
