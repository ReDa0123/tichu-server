import { createServer } from "http";
import { Server } from "socket.io";
import {
  continueListener,
  disconnectListener,
  joinRoomListener,
  leaveRoomListener,
  callTichuListener,
  tichuPassListener,
  sendCardsListener,
  sendDeckListener,
  dogListener,
  passListener,
  playCardsListener,
} from "./listeners/index.js";

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:3000"],
  },
});

io.on("connection", (socket) => {
  console.log(`${socket.id} connected`);

  const withSocketContext = (listener) => listener(io, socket);

  socket.on("joinRoom", withSocketContext(joinRoomListener));

  socket.on("leaveRoom", withSocketContext(leaveRoomListener));

  socket.on("callTichu", withSocketContext(callTichuListener));

  socket.on("tichuPass", withSocketContext(tichuPassListener));

  socket.on("sendCards", withSocketContext(sendCardsListener));

  socket.on("dog", withSocketContext(dogListener));

  socket.on("pass", withSocketContext(passListener));

  socket.on("sendDeck", withSocketContext(sendDeckListener));

  socket.on("playCards", withSocketContext(playCardsListener));

  socket.on("continue", withSocketContext(continueListener));

  socket.on("disconnect", withSocketContext(disconnectListener));
});

httpServer.listen(3005);
