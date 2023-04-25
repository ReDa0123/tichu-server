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

  socket.on("joinRoom", joinRoomListener(io, socket));

  socket.on("leaveRoom", leaveRoomListener(io, socket));

  socket.on("callTichu", callTichuListener(io, socket));

  socket.on("tichuPass", tichuPassListener(io, socket));

  socket.on("sendCards", sendCardsListener(io, socket));

  socket.on("dog", dogListener(io, socket));

  socket.on("pass", passListener(io, socket));

  socket.on("sendDeck", sendDeckListener(io, socket));

  socket.on("playCards", playCardsListener(io, socket));

  socket.on("continue", continueListener(io, socket));

  socket.on("disconnect", disconnectListener(io, socket));
});

httpServer.listen(3005);
