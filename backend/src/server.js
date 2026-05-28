const http = require("http");
const { Server } = require("socket.io");
const app = require("./app");
const { env } = require("./config/env");
const { corsOptions } = require("./config/cors");
const { setIo } = require("./lib/socket");
const syncService = require("./services/sync.service");

const server = http.createServer(app);
const io = new Server(server, {
  cors: corsOptions,
});

setIo(io);

io.on("connection", (socket) => {
  socket.on("kitchen.startPreparing", (payload) => {
    io.emit("kitchen.updated", { ...payload, status: "Preparing" });
  });

  socket.on("kitchen.markReady", (payload) => {
    io.emit("kitchen.updated", { ...payload, status: "Ready to Serve" });
  });
});

server.listen(env.port, () => {
  console.log(`Backend listening on http://localhost:${env.port}`);
  syncService.startScheduledSync();
  console.log(`Scheduled sync every ${env.syncIntervalHours} hour(s)`);
});
