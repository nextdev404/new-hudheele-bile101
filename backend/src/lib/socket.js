let io = null;

function setIo(serverIo) {
  io = serverIo;
}

function getIo() {
  return io;
}

function emitEvent(event, payload) {
  if (io) {
    io.emit(event, payload);
  }
}

module.exports = {
  setIo,
  getIo,
  emitEvent,
};
