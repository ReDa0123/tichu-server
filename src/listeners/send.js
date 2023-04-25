import { getSentCards, setSentCardsForPlayer } from "../gameState.js";
import { allCardsAreSent } from "../utils.js";
import { resolveSwitchCards, resolveTurnEnd } from "../resolvers.js";

export const sendCardsListener = (io, socket) => (cards) => {
  const roomId = socket.room;
  setSentCardsForPlayer(roomId, socket.id, cards);

  if (allCardsAreSent(getSentCards(roomId))) {
    resolveSwitchCards(io, roomId);
  }
};

export const sendDeckListener = (io, socket) => (deckReceiver) =>
  resolveTurnEnd(io, socket.room, deckReceiver);
