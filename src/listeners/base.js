import { MAX_PLAYERS } from "../constants.js";
import {
  addOneToContinues,
  deleteRoomStates,
  getContinues,
  getGameState,
  initGameState,
  resetContinues,
  startNewTurn,
} from "../gameState.js";

export const joinRoomListener = (io, socket) => (roomId) => {
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
};

export const leaveRoomListener = (io, socket) => () => {
  console.log(`${socket.id} is leaving room ${socket.room}`);
  socket.leave(socket.room);
  if (io.sockets.adapter.rooms.get(socket.room)?.size != null) {
    io.to(socket.room).emit(
      "otherDisconnected",
      io.sockets.adapter.rooms.get(socket.room).size
    );
  }
  socket.room = undefined;
};

export const disconnectListener = (io, socket) => () => {
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
};

export const continueListener = (io, socket) => () => {
  const roomId = socket.room;
  addOneToContinues(roomId);
  if (getContinues(roomId) === MAX_PLAYERS) {
    resetContinues(roomId);
    startNewTurn(io, roomId);
  }
};
