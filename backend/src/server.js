import express from "express";
import http from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import apiRouter from "./routes/index.js";
import { initSockets } from "./sockets/index.js";
import { logger } from "./utils/logger.js";
import { globalLimiter } from "./middleware/rateLimit.js";

dotenv.config();

const app = express();

// Security middlewares
app.use(helmet());

// Allow frontend access
app.use(cors({ origin: process.env.FRONTEND_URL || "*" }));

// Body parsing (handling JSON)
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));

// Request logging (optional in production)
app.use(morgan("dev"));

// Rate-limit ONLY API routes, not everything
app.use("/api", globalLimiter);

// API routes
app.use("/api", apiRouter);

// Health check
app.get("/health", (_, res) => res.json({ status: "ok" }));

// Socket server
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL || "*" },
});

// Attach socket.io to express
app.set("io", io);

// Initialize socket events
initSockets(io);

// Add socket error logging
io.on("error", (err) => {
  logger.error("Socket.IO error:", err);
});

const PORT = process.env.PORT || 5000;

// Start server
(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL, { dbName: "PharmaTrack" });
    logger.info("Connected to MongoDB");

    server.listen(PORT, () => {
      logger.info(`Server listening on ${PORT}`);
    });
  } catch (err) {
    logger.error("Failed to start:", err);
    process.exit(1);
  }
})();
