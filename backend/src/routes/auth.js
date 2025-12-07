import { Router } from "express";
import User from "../models/User.js";
import PasswordResetToken from "../models/PasswordResetToken.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import nodemailer from "nodemailer";
import speakeasy from "speakeasy";
import qrcode from "qrcode";
import { nanoid } from "nanoid";
import { authLimiter } from "../middleware/rateLimit.js";
import { logger } from "../utils/logger.js";
import { registerSchema, loginSchema, passwordResetSchema } from "../validation/user.validation.js";

const router = Router();

/* PASSWORD RULES - CENTRALIZED */
const PASSWORD_RULES = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecial: true
};

function validatePasswordRules(pw) {
  return (
    pw.length >= PASSWORD_RULES.minLength &&
    (!PASSWORD_RULES.requireUppercase || /[A-Z]/.test(pw)) &&
    (!PASSWORD_RULES.requireLowercase || /[a-z]/.test(pw)) &&
    (!PASSWORD_RULES.requireNumbers || /[0-9]/.test(pw)) &&
    (!PASSWORD_RULES.requireSpecial || /[^A-Za-z0-9]/.test(pw))
  );
}

/* EMAIL TRANSPORT */
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.ethereal.email",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || ""
  },
  tls: { rejectUnauthorized: false }
});

/* REGISTER */
router.post("/register", authLimiter, async (req, res) => {
  try {
    const validated = registerSchema(req.body);
    if (!validated.success) {
      return res.status(400).json({ error: "validation failed", details: validated.error.errors });
    }

    const { name, email, password, role = "operator" } = validated.data;

    if (!validatePasswordRules(password)) {
      return res.status(400).json({
        error: `Password must have: ${PASSWORD_RULES.minLength}+ chars, uppercase, lowercase, number, special char`
      });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      logger.warn(`Registration attempt with existing email: ${email}`);
      return res.status(409).json({ error: "user exists" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      name,
      email,
      passwordHash,
      role,
      isActive: true
    });

    const token = jwt.sign(
      { sub: user._id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    logger.info(`User registered: ${user._id}`, { email, role });

    return res.status(201).json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    logger.error("Registration error:", err);
    return res.status(500).json({ error: "registration failed" });
  }
});

/* LOGIN */
router.post("/login", authLimiter, async (req, res) => {
  try {
    const validated = loginSchema(req.body);
    if (!validated.success) {
      return res.status(400).json({ error: "validation failed" });
    }

    const { email, password } = validated.data;

    const user = await User.findOne({ email });
    if (!user) {
      logger.warn(`Login attempt with non-existent email: ${email}`);
      return res.status(401).json({ error: "invalid credentials" });
    }

    if (!user.isActive) {
      logger.warn(`Login attempt by inactive user: ${email}`);
      return res.status(403).json({ error: "account disabled" });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      logger.warn(`Failed login attempt for: ${email}`);
      return res.status(401).json({ error: "invalid credentials" });
    }

    // Check if 2FA required
    if (user.twoFA?.enabled) {
      const tempToken = jwt.sign(
        { sub: user._id, require2FA: true },
        process.env.JWT_SECRET,
        { expiresIn: "5m" }
      );
      logger.info(`2FA required for: ${email}`);
      return res.json({ twoFA_required: true, tempToken });
    }

    const token = jwt.sign(
      { sub: user._id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    logger.info(`User logged in: ${user._id}`, { email });

    return res.json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    logger.error("Login error:", err);
    return res.status(500).json({ error: "login failed" });
  }
});

/* 2FA SETUP */
router.post("/2fa/setup", authLimiter, async (req, res) => {
  try {
    const { tempToken } = req.body;
    if (!tempToken) return res.status(400).json({ error: "missing temp token" });

    let payload;
    try {
      payload = jwt.verify(tempToken, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ error: "invalid or expired token" });
    }

    const user = await User.findById(payload.sub);
    if (!user) return res.status(404).json({ error: "user not found" });

    const secret = speakeasy.generateSecret({ name: `PharmaTrack (${user.email})` });
    const qr = await qrcode.toDataURL(secret.otpauth_url);

    // Store temp secret
    user.twoFA.tempSecret = secret.base32;
    await user.save();

    logger.info(`2FA setup initiated for: ${user.email}`);

    res.json({ qr, secret: secret.base32 });
  } catch (err) {
    logger.error("2FA setup error:", err);
    res.status(500).json({ error: "2fa setup failed" });
  }
});

/* 2FA CONFIRM */
router.post("/2fa/confirm", authLimiter, async (req, res) => {
  try {
    const { tempToken, code } = req.body;
    if (!tempToken || !code) return res.status(400).json({

    let payload;
    try {
      payload = jwt.verify(tempToken, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ error: "invalid or expired token" });
    }

    const user = await User.findById(payload.sub);
    if (!user?.twoFA?.tempSecret) return res.status(400).json({ error: "no pending 2fa setup" });

    const verified = speakeasy.totp.verify({
      secret: user.twoFA.tempSecret,
      encoding: "base32",
      token: code,
      window: 2
    });

    if (!verified) {
      logger.warn(`Invalid 2FA code for: ${user.email}`);
      return res.status(401).json({ error: "invalid code" });
    }

    user.twoFA.enabled = true;
    user.twoFA.secret = user.twoFA.tempSecret;
    user.twoFA.tempSecret = null;
    await user.save();

    logger.info(`2FA enabled for: ${user.email}`);

    res.json({ success: true });
  } catch (err) {
    logger.error("2FA confirm error:", err);
    res.status(500).json({ error: "2fa confirmation failed" });
  }
});

/* VERIFY 2FA CODE (during login) */
router.post("/verify-2fa", authLimiter, async (req, res) => {
  try {
    const { tempToken, code } = req.body;
    if (!tempToken || !code) return res.status(400).json({ error: "missing" });

    let payload;
    try {
      payload = jwt.verify(tempToken, process.env.JWT_SECRET);
    } catch {
      logger.warn("Invalid or expired 2FA temp token");
      return res.status(401).json({ error: "invalid or expired token" });
    }

    const user = await User.findById(payload.sub);
    if (!user?.twoFA?.secret) return res.status(400).json({ error: "invalid setup" });

    const verified = speakeasy.totp.verify({
      secret: user.twoFA.secret,
      encoding: "base32",
      token: code,
      window: 2
    });

    if (!verified) {
      logger.warn(`Failed 2FA verification for: ${user.email}`);
      return res.status(401).json({ error: "invalid code" });
    }

    const token = jwt.sign(
      { sub: user._id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    logger.info(`User verified via 2FA: ${user._id}`);

    return res.json({ success: true, token });
  } catch (err) {
    logger.error("2FA verification error:", err);
    return res.status(500).json({ error: "verification failed" });
  }
});

/* PASSWORD RESET REQUEST */
router.post("/password-reset/request", authLimiter, async (req, res) => {
  try {
    const validated = validatePasswordReset.request(req.body);
    if (!validated.success) {
      return res.status(400).json({ error: "validation failed" });
    }

    const { email } = validated.data;

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if user exists
      logger.info(`Password reset requested for non-existent email: ${email}`);
      return res.json({ ok: true });
    }

    const token = nanoid(32);
    await PasswordResetToken.create({
      userId: user._id,
      token,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000)
    });

    const link = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || "no-reply@pharmatrack.local",
      to: email,
      subject: "PharmaTrack - Password Reset",
      html: `
        <h2>Password Reset Request</h2>
        <p>Click the link below to reset your password (valid for 1 hour):</p>
        <a href="${link}">${link}</a>
        <p>If you didn't request this, ignore this email.</p>
      `
    });

    logger.info(`Password reset link sent to: ${email}`);
    return res.json({ ok: true });
  } catch (err) {
    logger.error("Password reset request error:", err);
    return res.status(500).json({ error: "request failed" });
  }
});

/* PASSWORD RESET CONFIRM */
router.post("/password-reset/confirm", authLimiter, async (req, res) => {
  try {
    const validated = validatePasswordReset.confirm(req.body);
    if (!validated.success) {
      return res.status(400).json({ error: "validation failed" });
    }

    const { token, newPassword } = validated.data;

    if (!validatePasswordRules(newPassword)) {
      return res.status(400).json({
        error: `Password must have: ${PASSWORD_RULES.minLength}+ chars, uppercase, lowercase, number, special char`
      });
    }

    const doc = await PasswordResetToken.findOne({ token });
    if (!doc || doc.expiresAt < new Date()) {
      logger.warn("Invalid or expired password reset token");
      return res.status(400).json({ error: "invalid or expired token" });
    }

    const user = await User.findById(doc.userId);
    if (!user) return res.status(404).json({ error: "user not found" });

    const passwordHash = await bcrypt.hash(newPassword, 12);
    user.passwordHash = passwordHash;
    await user.save();

    await PasswordResetToken.deleteOne({ _id: doc._id });

    logger.info(`Password reset for: ${user.email}`);

    res.json({ ok: true });
  } catch (err) {
    logger.error("Password reset confirm error:", err);
    res.status(500).json({ error: "reset failed" });
  }
});

/* GET CURRENT USER */
router.get("/me", (req, res) => {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "missing token" });

  try {
    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({
      id: decoded.sub,
      role: decoded.role,
      email: decoded.email
    });
  } catch {
    res.status(401).json({ error: "invalid token" });
  }
});

export default router;
