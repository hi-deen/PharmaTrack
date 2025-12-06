import rateLimit from "express-rate-limit";

// Simple in-memory limiter (good for single server). For production use Redis store.
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // max requests per window per IP
  standardHeaders: true,
  legacyHeaders: false
});

// stricter limiter for auth endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8, // allow 8 attempts per 15 minutes per IP
  message: { error: "Too many attempts, try again later." },
  standardHeaders: true,
  legacyHeaders: false
});
