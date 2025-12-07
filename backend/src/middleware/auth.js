import jwt from "jsonwebtoken";
import { logger } from "../utils/logger.js";

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) {
    logger.warn("Missing auth token");
    return res.status(401).json({ error: "missing token" });
  }

  try {
    const token = header.split(" ")[1];
    if (!token) throw new Error("malformed auth header");
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    logger.warn("Invalid token attempt:", err.message);
    return res.status(401).json({ error: "invalid token" });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "not authenticated" });
    }

    if (!roles.includes(req.user.role)) {
      logger.warn(`Unauthorized access attempt by ${req.user.sub} for role ${roles.join(",")}`);
      return res.status(403).json({ error: "forbidden" });
    }
    
    next();
  };
}
