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

dotenv.config();

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || "*" }));
app.use(express.json({ limit: "5mb" }));
app.use(morgan("dev"));
app.use(express.urlencoded({ extended: true }));

// API routes
app.use("/api", apiRouter);

// basic health
app.get("/health", (_, res) => res.json({ status: "ok" }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL || "*" },
});

app.set("io", io);
initSockets(io);

const PORT = process.env.PORT || 5000;

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
