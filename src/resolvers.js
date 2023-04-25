import {
  getGameState,
  getSentCards,
  resetSentCards,
  resetTichus,
  setGameState,
} from "./gameState.js";
import {
  alwaysEmptyArray,
  alwaysNull,
  countDeckScore,
  findPlayerNextTo,
  getNextPlayerNotFinished,
  getPlayerOnPlay,
  notEqual,
} from "./utils.js";
import {
  concat,
  difference,
  filter,
  find,
  forEachObjIndexed,
  identity,
  includes,
  isEmpty,
  map,
  mapObjIndexed,
  o,
  partition,
  prop,
  sortBy,
  values,
} from "ramda";
import { GAME_PARTS, MAX_PLAYERS } from "./constants.js";
import { emitMessage, emitStateChanged } from "./emiters.js";

export const resolveSwitchCards = (io, roomId) => {
  const gameState = getGameState(roomId);
  const clientIds = gameState.turnOrder;
  const newCards = {};

  clientIds.forEach((clientId) => {
    for (let i = clientIds.length - 1; i > 0; i--) {
      const id = findPlayerNextTo(clientIds, clientId, i);
      if (!newCards[id]) {
        newCards[id] = [];
      }
      newCards[id].push(getSentCards(roomId)[clientId][i - 1]);
    }
  });

  const finalCards = mapObjIndexed((cards, key) => {
    return o(
      filter((card) => !includes(card, getSentCards(roomId)[key])),
      concat(newCards[key])
    )(cards);
  })(gameState.cards);

  const playerOnPlay = getPlayerOnPlay(finalCards);
  const newGameState = {
    ...getGameState(roomId),
    cards: finalCards,
    gamePart: GAME_PARTS.PLAY_CARDS,
    onPlay: playerOnPlay,
  };
  setGameState(roomId, newGameState);
  resetSentCards(roomId);
  emitStateChanged(io, roomId, newGameState);
};

export const resolveTurnEnd = (io, roomId, sendDeckTo) => {
  const gameState = getGameState(roomId);
  const {
    turnOrder,
    cardsPlayedThisTurn,
    collectedCards,
    currentCombination: { playedBy: turnWinner },
    finished,
  } = gameState;
  const deckReceiver = sendDeckTo ?? turnWinner;
  const newCollectedCards = [
    ...collectedCards[deckReceiver],
    ...cardsPlayedThisTurn,
  ];
  const playerOnPlay = includes(turnWinner, finished)
    ? getNextPlayerNotFinished(turnOrder, turnWinner, finished)
    : turnWinner;

  const newGameState = {
    ...gameState,
    collectedCards: {
      ...collectedCards,
      [deckReceiver]: newCollectedCards,
    },
    cardsPlayedThisTurn: [],
    currentCombination: { playedBy: "", cards: [], type: "" },
    onPlay: playerOnPlay,
    numberOfPasses: 0,
    sendDeck: false,
  };
  setGameState(roomId, newGameState);
  emitMessage(
    io,
    roomId,
    `${deckReceiver} has won the deck. ${playerOnPlay} has the initiative.`
  );
  emitStateChanged(io, roomId, newGameState);
};

export const resolveDragonSend = (io, roomId) => {
  const gameState = getGameState(roomId);
  const {
    currentCombination: { playedBy },
  } = gameState;

  const newGameState = {
    ...gameState,
    onPlay: playedBy,
    sendDeck: true,
  };
  setGameState(roomId, newGameState);
  emitStateChanged(io, roomId, newGameState);
  emitMessage(
    io,
    roomId,
    "You won the round, but the deck contains a dragon. Choose an opponent to send the deck to."
  );
};

export const resolveNormalEnd = (
  io,
  {
    turnOrder,
    newFinished,
    teams,
    cardsPlayedThisTurn,
    cards,
    collectedCards,
    cardsInHand,
    roomId,
  }
) => {
  const loserId = difference(turnOrder, newFinished)[0];
  const winningTeam = find((team) => !includes(loserId, team.players))(teams);
  const losingTeam = find((team) => includes(loserId, team.players))(teams);
  const notLastLoserTeamId = filter(notEqual(loserId), losingTeam.players)[0];
  const winningPile = concat(
    concat([...cardsPlayedThisTurn, ...cards], collectedCards[loserId]),
    concat(
      concat(
        collectedCards[winningTeam.players[0]],
        collectedCards[winningTeam.players[1]]
      ),
      cardsInHand[loserId]
    )
  );
  const losingPile = collectedCards[notLastLoserTeamId];
  const winningTeamScore = countDeckScore(winningPile);
  const losingTeamScore = countDeckScore(losingPile);
  const newTeams = [
    { ...winningTeam, score: winningTeam.score + winningTeamScore },
    { ...losingTeam, score: losingTeam.score + losingTeamScore },
  ];

  const newGameState = {
    ...getGameState(roomId),
    gamePart: GAME_PARTS.TURN_END,
    teams: sortBy(prop("index"), newTeams),
    cards: map(alwaysEmptyArray, cardsInHand),
  };
  setGameState(roomId, newGameState);
  emitMessage(io, roomId, "Turn ended.");
  emitStateChanged(io, roomId, newGameState);
};

export const resolveTeamEnd = (
  io,
  { socketId, teams, roomId, cardsInHand }
) => {
  const [winningTeamArr, losingTeamArr] = partition(({ players }) =>
    includes(socketId, players)
  )(teams);
  const winningTeam = winningTeamArr[0];
  const losingTeam = losingTeamArr[0];

  const newGameState = {
    ...getGameState(roomId),
    gamePart: GAME_PARTS.TURN_END,
    teams: sortBy(prop("index"), [
      { ...winningTeam, score: winningTeam.score + 200 },
      { ...losingTeam },
    ]),
    cards: map(alwaysEmptyArray, cardsInHand),
  };
  setGameState(roomId, newGameState);
  emitMessage(
    io,
    roomId,
    "Turn ended. Players in a team finished after each other a and got 200 points!"
  );
  emitStateChanged(io, roomId, newGameState);
};

export const resolveTichuPartEnd = (
  io,
  { sentTichus, roomId, gameState, isBigTichuPart }
) => {
  if (values(sentTichus).length === MAX_PLAYERS) {
    const newGameState = {
      ...gameState,
      gamePart: isBigTichuPart ? GAME_PARTS.SMALL_TICHU : GAME_PARTS.SEND_CARDS,
      tichu: { ...sentTichus },
    };
    setGameState(roomId, newGameState);
    emitStateChanged(io, roomId, newGameState);
    resetTichus(roomId);
  }
};

export const resolveFailOtherTichus = (io, roomId) => {
  const gameState = getGameState(roomId);
  const filteredTichus = filter(identity, gameState.tichu);
  if (isEmpty(filteredTichus)) return;
  forEachObjIndexed((tichu, socketId) => {
    const teamOfSocket = find((team) => includes(socketId, team.players))(
      gameState.teams
    );
    const otherTeam = find((team) => !includes(socketId, team.players))(
      gameState.teams
    );

    const value = tichu === GAME_PARTS.BIG_TICHU ? 200 : 100;

    const newGameState = {
      ...gameState,
      teams: sortBy(prop("index"), [
        { ...teamOfSocket, score: teamOfSocket.score - value },
        { ...otherTeam },
      ]),
      tichu: map(alwaysNull, gameState.tichu),
    };
    setGameState(roomId, newGameState);
    emitMessage(
      io,
      roomId,
      `${socketId} has failed to complete a ${
        tichu === GAME_PARTS.BIG_TICHU ? "Grand Tichu" : "Tichu"
      }.`
    );
    emitStateChanged(io, roomId, newGameState);
  })(filteredTichus);
};

export const resolveTichus = (io, { teams, socketId, roomId, tichus }) => {
  const socketsTichu = tichus[socketId];
  if (socketsTichu) {
    const points = socketsTichu === GAME_PARTS.BIG_TICHU ? 200 : 100;
    const teamOfSocket = find((team) => includes(socketId, team.players))(
      teams
    );
    const otherTeam = find((team) => !includes(socketId, team.players))(teams);

    const tichusWithoutSocket = mapObjIndexed((tichu, socket) => {
      if (socket === socketId) {
        return null;
      }
      return tichu;
    })(tichus);

    const newGameState = {
      ...getGameState(roomId),
      teams: sortBy(prop("index"), [
        { ...teamOfSocket, score: teamOfSocket.score + points },
        { ...otherTeam },
      ]),
      tichu: tichusWithoutSocket,
    };
    setGameState(roomId, newGameState);
    emitMessage(
      io,
      roomId,
      `${socketId} has successfully completed a ${
        socketsTichu === GAME_PARTS.BIG_TICHU ? "Grand Tichu" : "Tichu"
      }.`
    );
    emitStateChanged(io, roomId, newGameState);
  }

  resolveFailOtherTichus(io, roomId);
};
