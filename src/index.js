import { createServer } from "http";
import { Server } from "socket.io";
import { includes, isEmpty } from "ramda";
import {
  propNotEq,
  getNextPlayerNotFinished,
  isCardInArray,
  allCardsAreSent,
  didAnyTeamFinish,
} from "./utils.js";
import {
  MAX_PLAYERS,
  GAME_PARTS,
  DOG_NAME,
  DRAGON_NAME,
  PHOENIX_NAME,
} from "./constants.js";
import {
  addOneToContinues,
  deleteRoomStates,
  getContinues,
  getGameState,
  getSentCards,
  getTichus,
  initGameState,
  resetContinues,
  setGameState,
  setSentCardsForPlayer,
  setTichusForPlayer,
  startNewTurn,
} from "./gameState.js";
import {
  resolveDragonSend,
  resolveNormalEnd,
  resolveSwitchCards,
  resolveTeamEnd,
  resolveTichuPartEnd,
  resolveTichus,
  resolveTurnEnd,
} from "./resolvers.js";
import { emitMessage, emitStateChanged } from "./emiters.js";

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:3000"],
  },
});

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
      initGameState(io, roomId);
      io.to(roomId).emit("gameReady", getGameState(roomId));
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
    const gameState = getGameState(roomId);
    const gamePart = gameState.gamePart;
    const isBigTichuPart = gamePart === GAME_PARTS.BIG_TICHU;
    if (isBigTichuPart || alreadyPlayedBigTichu) {
      setTichusForPlayer(roomId, socketId, GAME_PARTS.BIG_TICHU);
      !alreadyPlayedBigTichu &&
        emitMessage(io, roomId, `${socketId} called a grand tichu.`);
    } else {
      setTichusForPlayer(roomId, socketId, GAME_PARTS.SMALL_TICHU);
      emitMessage(io, roomId, `${socketId} called a tichu.`);
    }

    resolveTichuPartEnd(
      io,
      getTichus(roomId),
      roomId,
      gameState,
      isBigTichuPart
    );
  });

  socket.on("tichuPass", () => {
    const roomId = socket.room;
    const socketId = socket.id;
    const gameState = getGameState(roomId);
    const gamePart = gameState.gamePart;
    const isBigTichuPart = gamePart === GAME_PARTS.BIG_TICHU;
    setTichusForPlayer(roomId, socketId, null);

    resolveTichuPartEnd(
      io,
      getTichus(roomId),
      roomId,
      gameState,
      isBigTichuPart
    );
  });

  socket.on("sendCards", (cards) => {
    const roomId = socket.room;
    setSentCardsForPlayer(roomId, socket.id, cards);

    if (allCardsAreSent(getSentCards(roomId))) {
      resolveSwitchCards(io, roomId);
    }
  });

  socket.on("dog", () => {
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
    const newFinished = didSocketFinish
      ? [...finished, socketId]
      : [...finished];

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
  });

  socket.on("pass", () => {
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
  });

  socket.on("sendDeck", (deckReceiver) =>
    resolveTurnEnd(io, socket.room, deckReceiver)
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
    } = getGameState(roomId);
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

    const gameState = getGameState(roomId);

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
  });

  socket.on("continue", () => {
    const roomId = socket.room;
    addOneToContinues(roomId);
    if (getContinues(roomId) === MAX_PLAYERS) {
      resetContinues(roomId);
      startNewTurn(io, roomId);
    }
  });

  socket.on("disconnect", () => {
    const roomId = socket.room;
    if (
      roomId != null &&
      io.sockets.adapter.rooms.get(socket.room)?.size != null
    ) {
      io.to(socket.room).emit(
        "otherDisconnected",
        io.sockets.adapter.rooms.get(socket.room).size
      );
      io.to(socket.room).emit("gameRip");
      deleteRoomStates(roomId);
    }
  });
});

httpServer.listen(3005);
