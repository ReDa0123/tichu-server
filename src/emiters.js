export const emitStateChanged = (io, roomId, newState) =>
  io.to(roomId).emit("stateChanged", newState);

export const emitMessage = (io, roomId, message) =>
  io.to(roomId).emit("message", message);
