import jwt from "jsonwebtoken";
import { logger } from "../utils/logger.js";

export function initSockets(io) {
  // Middleware to verify JWT on connection
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("missing token"));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch {
      next(new Error("invalid token"));
    }
  });

  io.on("connection", (socket) => {
    logger.info(`Socket connected: ${socket.id} (user: ${socket.user?.sub})`);

    socket.on("join", (room) => {
      socket.join(room);
      logger.debug(`User ${socket.user?.sub} joined room: ${room}`);
    });

    socket.on("leave", (room) => {
      socket.leave(room);
      logger.debug(`User ${socket.user?.sub} left room: ${room}`);
    });

    socket.on("disconnect", () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });

    socket.on("error", (err) => {
      logger.error(`Socket error for ${socket.id}:`, err);
    });
  });
}
