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

// Validate required environment variables
const requiredEnvVars = ["MONGO_URL", "JWT_SECRET", "FRONTEND_URL"];
const missing = requiredEnvVars.filter(v => !process.env[v]);
if (missing.length > 0) {
  logger.error(`Missing required env vars: ${missing.join(", ")}`);
  process.exit(1);
}

const app = express();

// Security middlewares
app.use(helmet());

// CORS - restrict to frontend domain in production
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173", // dev
  "http://localhost:3000"   // dev alternative
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS not allowed"));
    }
  },
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Request logging
if (process.env.NODE_ENV !== "test") {
  app.use(morgan("combined", {
    skip: (req) => req.path === "/health"
  }));
}

// Rate-limit API routes
app.use("/api", globalLimiter);

// API routes
app.use("/api", apiRouter);

// Health check (no auth required)
app.get("/health", (_, res) => res.json({ status: "ok", timestamp: new Date() }));

// Socket server
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true
  },
  transports: ["websocket", "polling"]
});

app.set("io", io);
initSockets(io);

io.on("error", (err) => {
  logger.error("Socket.IO error:", err);
});

const PORT = process.env.PORT || 5000;

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL, { dbName: "PharmaTrack" });
    logger.info("Connected to MongoDB");

    server.listen(PORT, () => {
      logger.info(`Server listening on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);
    });
  } catch (err) {
    logger.error("Failed to start server:", err);
    process.exit(1);
  }
})();

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully");
  server.close(() => {
    mongoose.connection.close();
    process.exit(0);
  });
});
