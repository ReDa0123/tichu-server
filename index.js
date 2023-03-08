import { createServer } from "http";
import { Server } from "socket.io";
import {
  any,
  compose,
  concat,
  difference,
  equals,
  filter,
  find,
  forEachObjIndexed,
  head,
  identity,
  includes,
  isEmpty,
  keys,
  map,
  mapObjIndexed,
  o,
  partition,
  prop,
  propSatisfies,
  sortBy,
  values,
} from "ramda";
import {
  alwaysEmptyArray,
  alwaysNull,
  isNilOrEmpty,
  notEqual,
  propNotEq,
} from "ramda-extension";

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:3001"],
  },
});

const MAX_PLAYERS = 4;
const COLORS = ["R", "G", "U", "B"];
const NUMBERS = [
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
const SPECIAL_CARDS = [
  { name: "DOG" },
  { name: "PHOENIX" },
  { name: "MAHJONG", number: 1 },
  { name: "DRAGON", number: 25 },
];
const DECK = [
  ...COLORS.map((color) =>
    NUMBERS.map((number) => ({ color, number, special: false }))
  ),
  SPECIAL_CARDS.map((card) => ({ ...card, special: true })),
].flat();

const CHUNK_SIZE = DECK.length / 4;

const gameStates = {};

const sentCards = {};

const tichus = {};

const continues = {};

const GAME_PARTS = {
  SMALL_TICHU: "SMALL_TICHU",
  BIG_TICHU: "BIG_TICHU",
  SEND_CARDS: "SEND_CARDS",
  PLAY_CARDS: "PLAY_CARDS",
  TURN_END: "TURN_END",
};

const initCurrentCombination = { playedBy: "", cards: [], type: "" };

const chunkDeck = (deck) => {
  const chunks = [];
  for (let i = 0; i < deck.length; i += CHUNK_SIZE) {
    chunks.push(deck.slice(i, i + CHUNK_SIZE));
  }
  return chunks;
};

const randomizeDeck = () => {
  const shuffledDeck = [...DECK];
  for (let i = shuffledDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledDeck[i], shuffledDeck[j]] = [shuffledDeck[j], shuffledDeck[i]];
  }
  return shuffledDeck;
};

const isCardInArray = (searchedValue, cards, propName = "name") =>
  any(propSatisfies(equals(searchedValue), propName), cards);

const getNextPlayerNotFinished = (turnOrder, socketId, finished) => {
  let nextPlayer = findPlayerNextTo(turnOrder, socketId);
  while (includes(nextPlayer, finished)) {
    nextPlayer = findPlayerNextTo(turnOrder, nextPlayer);
  }
  return nextPlayer;
};

const initGameState = (roomId) => {
  const finalState = {};
  const shuffledDeck = randomizeDeck();
  const chunks = chunkDeck(shuffledDeck);
  const clientIds = io.sockets.adapter.rooms.get(roomId);
  sentCards[roomId] = {};
  tichus[roomId] = {};
  continues[roomId] = 0;
  let i = 0;
  const team1 = [];
  const team2 = [];
  finalState.turnOrder = [];
  finalState.collectedCards = {};
  finalState.cards = {};
  finalState.tichu = {};
  clientIds.forEach((clientId) => {
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
  finalState.currentCombination = initCurrentCombination;
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
  gameStates[roomId] = finalState;
};

const findPlayerNextTo = (ids, playerId, plus = 1) => {
  const index = ids.indexOf(playerId);
  const indexOfNextPlayer = (index + plus) % ids.length;
  return ids[indexOfNextPlayer];
};

const countDeckScore = (cards) => {
  return cards.reduce((acc, card) => {
    if (card.name === "PHOENIX") {
      return acc - 25;
    }
    if (card.name === "DRAGON") {
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
};

const switchCards = (roomId) => {
  const gameState = gameStates[roomId];
  const clientIds = gameState.turnOrder;
  const newCards = {};
  clientIds.forEach((clientId) => {
    newCards[clientId] = [];
  });

  clientIds.forEach((clientId) => {
    for (let i = clientIds.length - 1; i > 0; i--) {
      const id = findPlayerNextTo(clientIds, clientId, i);
      newCards[id].push(sentCards[roomId][clientId][i - 1]);
    }
  });

  const finalCards = mapObjIndexed((cards, key) => {
    return o(
      filter((card) => !includes(card, sentCards[roomId][key])),
      concat(newCards[key])
    )(cards);
  })(gameState.cards);
  const playerOnPlay = compose(
    head,
    keys,
    filter(includes({ name: "MAHJONG", number: 1, special: true }))
  )(finalCards);
  return {
    ...gameStates[roomId],
    cards: finalCards,
    gamePart: GAME_PARTS.PLAY_CARDS,
    onPlay: playerOnPlay,
  };
};

const resolveTurnEnd = (roomId, sendDeckTo) => {
  const gameState = gameStates[roomId];
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
  gameStates[roomId] = newGameState;
  io.to(roomId).emit(
    "message",
    `${deckReceiver} has won the deck. ${playerOnPlay} has the initiative.`
  );
  io.to(roomId).emit("stateChanged", newGameState);
};

const resolveDragonSend = (roomId) => {
  const {
    currentCombination: { playedBy },
  } = gameStates[roomId];
  io.to(playedBy).emit(
    "message",
    "You won the round, but the deck contains a dragon. Choose an opponent to send the deck to."
  );
  const newGameState = {
    ...gameStates[roomId],
    onPlay: playedBy,
    sendDeck: true,
  };
  gameStates[roomId] = newGameState;
  io.to(roomId).emit("stateChanged", newGameState);
};

function resolveNormalEnd({
  turnOrder,
  newFinished,
  teams,
  cardsPlayedThisTurn,
  cards,
  collectedCards,
  cardsInHand,
  roomId,
}) {
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
    ...gameStates[roomId],
    gamePart: GAME_PARTS.TURN_END,
    teams: sortBy(prop("index"), newTeams),
    cards: map(alwaysEmptyArray, cardsInHand),
  };
  gameStates[roomId] = newGameState;
  io.to(roomId).emit("message", "Turn ended.");
  io.to(roomId).emit("stateChanged", newGameState);
}

function resolveTeamEnd({ socketId, teams, roomId, cardsInHand }) {
  const teamsPartition = partition(({ players }) =>
    includes(socketId, players)
  )(teams);
  const winningTeam = teamsPartition[0][0];
  const losingTeam = teamsPartition[1][0];
  const newGameState = {
    ...gameStates[roomId],
    gamePart: GAME_PARTS.TURN_END,
    teams: sortBy(prop("index"), [
      { ...winningTeam, score: winningTeam.score + 200 },
      { ...losingTeam },
    ]),
    cards: map(alwaysEmptyArray, cardsInHand),
  };
  gameStates[roomId] = newGameState;
  io.to(roomId).emit(
    "message",
    "Turn ended. Players in a team finished after each other a and got 200 points!"
  );
  io.to(roomId).emit("stateChanged", newGameState);
}

function resolveTichuPartEnd(sentTichus, roomId, gameState, isBigTichuPart) {
  if (values(sentTichus).length === MAX_PLAYERS) {
    const newGameState = {
      ...gameState,
      gamePart: isBigTichuPart ? GAME_PARTS.SMALL_TICHU : GAME_PARTS.SEND_CARDS,
      tichu: { ...sentTichus },
    };
    gameStates[roomId] = newGameState;
    io.to(roomId).emit("stateChanged", newGameState);
    tichus[roomId] = {};
  }
}

function resolveTichus({ teams, socketId, roomId, tichus }) {
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
    const newState = {
      ...gameStates[roomId],
      teams: sortBy(prop("index"), [
        { ...teamOfSocket, score: teamOfSocket.score + points },
        { ...otherTeam },
      ]),
      tichu: tichusWithoutSocket,
    };
    gameStates[roomId] = newState;
    io.to(roomId).emit(
      "message",
      `${socketId} has successfully completed a ${
        socketsTichu === GAME_PARTS.BIG_TICHU ? "Grand Tichu" : "Tichu"
      }.`
    );
    io.to(roomId).emit("stateChanged", newState);
  }

  failOtherTichus(roomId);
}

function failOtherTichus(roomId) {
  const { tichu } = gameStates[roomId];
  const filteredTichus = filter(identity, tichu);
  if (isEmpty(filteredTichus)) return;
  forEachObjIndexed((tichu, socketId) => {
    const teamOfSocket = find((team) => includes(socketId, team.players))(
      gameStates[roomId].teams
    );
    const otherTeam = find((team) => !includes(socketId, team.players))(
      gameStates[roomId].teams
    );
    const value = tichu === GAME_PARTS.BIG_TICHU ? 200 : 100;
    const newState = {
      ...gameStates[roomId],
      teams: sortBy(prop("index"), [
        { ...teamOfSocket, score: teamOfSocket.score - value },
        { ...otherTeam },
      ]),
      tichu: map(alwaysNull, gameStates[roomId].tichu),
    };
    gameStates[roomId] = newState;
    io.to(roomId).emit(
      "message",
      `${socketId} has failed to complete a ${
        tichu === GAME_PARTS.BIG_TICHU ? "Grand Tichu" : "Tichu"
      }.`
    );
    io.to(roomId).emit("stateChanged", newState);
  })(filteredTichus);
}

function startNewTurn(roomId) {
  const roomGameState = gameStates[roomId];
  const shuffledDeck = randomizeDeck();
  const chunks = chunkDeck(shuffledDeck);
  let i = 0;
  const newCards = map(() => {
    const cards = chunks[i];
    i++;
    return cards;
  })(roomGameState.cards);
  const newGameState = {
    ...roomGameState,
    collectedCards: map(alwaysEmptyArray, roomGameState.collectedCards),
    cards: newCards,
    currentCombination: initCurrentCombination,
    onPlay: "",
    numberOfPasses: 0,
    cardsPlayedThisTurn: [],
    finished: [],
    gamePart: GAME_PARTS.BIG_TICHU,
    sendDeck: false,
  };
  gameStates[roomId] = newGameState;
  io.to(roomId).emit("stateChanged", newGameState);
  io.to(roomId).emit("message", "New turn started.");
}

io.on("connection", (socket) => {
  console.log(`${socket.id} connected`);

  socket.on("joinRoom", (roomId) => {
    console.log(`${socket.id} is trying to join room ${roomId}`);
    const joined = io.sockets.adapter.rooms.get(roomId);
    const numPlayers = joined ? joined.size : 0;
    if (numPlayers >= MAX_PLAYERS) {
      socket.emit("roomFull");
      return;
    }
    socket.room = roomId;
    socket.join(roomId);
    io.to(roomId).emit("newConnection", numPlayers + 1);

    if (numPlayers + 1 === MAX_PLAYERS) {
      initGameState(roomId);
      io.to(roomId).emit("gameReady", gameStates[roomId]);
    }
  });

  socket.on("leaveRoom", () => {
    console.log(`${socket.id} is leaving room ${socket.room}`);
    socket.leave(socket.room);
    if (io.sockets.adapter.rooms.get(socket.room)?.size != null) {
      io.to(socket.room).emit(
        "otherDisconnected",
        io.sockets.adapter.rooms.get(socket.room).size
      );
    }
    socket.room = undefined;
  });

  socket.on("callTichu", (alreadyPlayedBigTichu = false) => {
    const roomId = socket.room;
    const socketId = socket.id;
    const sentTichus = tichus[roomId];
    const gameState = gameStates[roomId];
    const gamePart = gameState.gamePart;
    const isBigTichuPart = gamePart === GAME_PARTS.BIG_TICHU;
    if (isBigTichuPart || alreadyPlayedBigTichu) {
      sentTichus[socketId] = GAME_PARTS.BIG_TICHU;
      !alreadyPlayedBigTichu &&
        io.to(roomId).emit("message", `${socketId} called a grand tichu.`);
    } else {
      sentTichus[socketId] = GAME_PARTS.SMALL_TICHU;
      io.to(roomId).emit("message", `${socketId} called a tichu.`);
    }

    resolveTichuPartEnd(sentTichus, roomId, gameState, isBigTichuPart);
  });

  socket.on("tichuPass", () => {
    const roomId = socket.room;
    const socketId = socket.id;
    const sentTichus = tichus[roomId];
    const gameState = gameStates[roomId];
    const gamePart = gameState.gamePart;
    const isBigTichuPart = gamePart === GAME_PARTS.BIG_TICHU;
    sentTichus[socketId] = null;

    resolveTichuPartEnd(sentTichus, roomId, gameState, isBigTichuPart);
  });

  socket.on("sendCards", (cards) => {
    const roomId = socket.room;
    const sentCardsInRoom = sentCards[roomId];
    sentCardsInRoom[socket.id] = cards;

    const allCardsSent = !o(any(isNilOrEmpty), values)(sentCardsInRoom);
    if (allCardsSent) {
      gameStates[roomId] = switchCards(roomId);
      sentCards[roomId] = map(alwaysEmptyArray, sentCards[roomId]);
      io.to(socket.room).emit("stateChanged", gameStates[roomId]);
    }
  });

  socket.on("dog", () => {
    const socketId = socket.id;
    const roomId = socket.room;
    const gameState = gameStates[roomId];
    const {
      cards: cardsInHand,
      cards: { [socketId]: playersCards },
      teams,
      finished,
      collectedCards,
      turnOrder,
      tichu: tichus,
    } = gameState;
    const team = find((team) => includes(socketId, team.players))(
      teams
    ).players;
    const teammate = find((player) => player !== socketId)(team);
    const onPlay = includes(teammate, finished)
      ? getNextPlayerNotFinished(turnOrder, teammate, finished)
      : teammate;
    const playersCardsWithoutDog = filter(propNotEq("name", "DOG"))(
      playersCards
    );

    const didSocketFinish = playersCardsWithoutDog.length === 0;
    const isFinishedEmpty = isEmpty(finished);
    if (didSocketFinish && isFinishedEmpty) {
      resolveTichus({
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
      return resolveNormalEnd({
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

    const didAnyTeamFinish =
      equals([...newFinished].sort(), [...teams[0].players].sort()) ||
      equals([...newFinished].sort(), [...teams[1].players].sort());

    if (didAnyTeamFinish) {
      return resolveTeamEnd({ socketId, teams, roomId, cardsInHand });
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
    gameStates[roomId] = newGameState;
    io.to(roomId).emit("stateChanged", newGameState);
    io.to(roomId).emit("message", `${socketId} played a dog.`);
  });

  socket.on("pass", () => {
    const socketId = socket.id;
    const roomId = socket.room;
    const { turnOrder, numberOfPasses, finished, cardsPlayedThisTurn } =
      gameStates[roomId];
    const passesNeeded = turnOrder.length - finished.length - 1;
    if (numberOfPasses + 1 >= passesNeeded) {
      if (isCardInArray("DRAGON", cardsPlayedThisTurn)) {
        return resolveDragonSend(roomId);
      }
      return resolveTurnEnd(roomId);
    }
    const nextPlayer = getNextPlayerNotFinished(turnOrder, socketId, finished);
    const newGameState = {
      ...gameStates[roomId],
      numberOfPasses: numberOfPasses + 1,
      onPlay: nextPlayer,
    };
    gameStates[roomId] = newGameState;
    io.to(roomId).emit("stateChanged", newGameState);
    io.to(roomId).emit("message", `${socketId} passed.`);
  });

  socket.on("sendDeck", (deckReceiver) =>
    resolveTurnEnd(socket.room, deckReceiver)
  );

  socket.on("playCards", ({ cards, combinationType }) => {
    const socketId = socket.id;
    const roomId = socket.room;
    const {
      turnOrder,
      finished,
      cardsPlayedThisTurn,
      cards: cardsInHand,
      cards: { [socketId]: playersCards },
      teams,
      collectedCards,
      tichu: tichus,
    } = gameStates[roomId];
    const nextPlayer = getNextPlayerNotFinished(turnOrder, socketId, finished);
    let newPlayersCards = filter(
      (card) => !includes(card, cards),
      playersCards
    );
    if (isCardInArray("PHOENIX", cards)) {
      newPlayersCards = filter(propNotEq("name", "PHOENIX"), newPlayersCards);
    }

    const didSocketFinish = newPlayersCards.length === 0;
    const isFinishedEmpty = isEmpty(finished);
    if (didSocketFinish && isFinishedEmpty) {
      resolveTichus({
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
      return resolveNormalEnd({
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

    const didAnyTeamFinish =
      equals([...newFinished].sort(), [...teams[0].players].sort()) ||
      equals([...newFinished].sort(), [...teams[1].players].sort());

    if (didAnyTeamFinish) {
      return resolveTeamEnd({ socketId, teams, roomId, cardsInHand });
    }

    const newGameState = {
      ...gameStates[roomId],
      cards: {
        ...gameStates[roomId].cards,
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
    gameStates[roomId] = newGameState;
    const cardsMessageArray = map(({ name, color, number }) => {
      return name ? name : `${number}${color}`;
    })(cards);
    io.to(roomId).emit(
      "message",
      `${socketId} played ${cardsMessageArray.join(", ")}.`
    );
    io.to(roomId).emit("stateChanged", newGameState);
  });

  socket.on("continue", () => {
    const roomId = socket.room;
    continues[roomId] += 1;
    if (continues[roomId] === MAX_PLAYERS) {
      continues[roomId] = 0;
      startNewTurn(roomId);
    }
  });

  socket.on("disconnect", () => {
    if (
      socket.room != null &&
      io.sockets.adapter.rooms.get(socket.room)?.size != null
    ) {
      io.to(socket.room).emit(
        "otherDisconnected",
        io.sockets.adapter.rooms.get(socket.room).size
      );
      io.to(socket.room).emit("gameRip");
    }
    //TODO: teardown
  });
});

httpServer.listen(3000);
