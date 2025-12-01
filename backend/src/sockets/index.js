export function initSockets(io) {
  io.on("connection", (socket) => {
    console.log("socket connected", socket.id);

    socket.on("join", (room) => {
      socket.join(room);
    });

    socket.on("leave", (room) => {
      socket.leave(room);
    });

    socket.on("disconnect", () => {});
  });
}
