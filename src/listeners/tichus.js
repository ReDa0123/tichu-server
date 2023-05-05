import { getGameState, getTichus, setTichusForPlayer } from "../gameState.js";
import { GAME_PARTS } from "../constants.js";
import { emitMessage } from "../emiters.js";
import { resolveTichuPartEnd } from "../resolvers.js";

export const callTichuListener =
  (io, socket) =>
  (alreadyPlayedBigTichu = false) => {
    const roomId = socket.room;
    const socketId = socket.id;
    const gameState = getGameState(roomId);
    const gamePart = gameState.gamePart;
    const isBigTichuPart = gamePart === GAME_PARTS.BIG_TICHU;
    const username = io.sockets.sockets.get(socketId).username;
    if (isBigTichuPart || alreadyPlayedBigTichu) {
      setTichusForPlayer(roomId, socketId, GAME_PARTS.BIG_TICHU);
      !alreadyPlayedBigTichu &&
        emitMessage(io, roomId, `${username} called a grand tichu.`);
    } else {
      setTichusForPlayer(roomId, socketId, GAME_PARTS.SMALL_TICHU);
      emitMessage(io, roomId, `${username} called a tichu.`);
    }

    resolveTichuPartEnd(io, {
      sentTichus: getTichus(roomId),
      roomId,
      gameState,
      isBigTichuPart,
    });
  };

export const tichuPassListener = (io, socket) => () => {
  const roomId = socket.room;
  const socketId = socket.id;
  const gameState = getGameState(roomId);
  const gamePart = gameState.gamePart;
  const isBigTichuPart = gamePart === GAME_PARTS.BIG_TICHU;
  setTichusForPlayer(roomId, socketId, null);

  resolveTichuPartEnd(io, {
    sentTichus: getTichus(roomId),
    roomId,
    gameState,
    isBigTichuPart,
  });
};
