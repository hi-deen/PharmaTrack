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

const router = Router();

/* ------------------ Password Rules ------------------ */
function validatePasswordRules(pw) {
  const min = 10;
  return (
    pw.length >= min &&
    /[A-Z]/.test(pw) &&
    /[a-z]/.test(pw) &&
    /[0-9]/.test(pw) &&
    /[^A-Za-z0-9]/.test(pw)
  );
}

/* ------------------ Email Transport ------------------ */
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

/* ------------------ Register ------------------ */
router.post("/register", authLimiter, async (req, res) => {
  try {
    const { name, email, password, role = "operator", department } = req.body;

    if (!email || !password)
      return res.status(400).json({ error: "email and password required" });

    if (!validatePasswordRules(password))
      return res
        .status(400)
        .json({ error: "Password must be 10+ chars with upper, lower, digit, special" });

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ error: "user exists" });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      name,
      email,
      passwordHash,
      role,
      department
    });

    const token = jwt.sign(
      { sub: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    return res.json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server error" });
  }
});

/* ------------------ Login ------------------ */
router.post("/login", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "missing fields" });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: "invalid credentials" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "invalid credentials" });

    // AFTER password is correct → check if 2FA required
    if (user.twoFA?.enabled) {
      const tempToken = jwt.sign(
        { sub: user._id, require2FA: true },
        process.env.JWT_SECRET,
        { expiresIn: "5m" }
      );
      return res.json({ twoFA_required: true, tempToken });
    }

    const token = jwt.sign(
      { sub: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    return res.json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server error" });
  }
});

/* ------------------ 2FA Verify ------------------ */
router.post("/verify-2fa", authLimiter, async (req, res) => {
  try {
    const { tempToken, code } = req.body;
    if (!tempToken || !code) return res.status(400).json({ error: "missing" });

    let payload;
    try {
      payload = jwt.verify(tempToken, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ error: "invalid or expired token" });
    }

    const user = await User.findById(payload.sub);
    if (!user?.twoFA?.secret) return res.status(400).json({ error: "invalid setup" });

    const verified = speakeasy.totp.verify({
      secret: user.twoFA.secret,
      encoding: "base32",
      token: code
    });

    if (!verified) return res.status(401).json({ error: "invalid code" });

    const token = jwt.sign(
      { sub: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    return res.json({ success: true, token });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server error" });
  }
});

/* ------------------ Password Reset Request ------------------ */
router.post("/password-reset/request", authLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "missing" });

    const user = await User.findOne({ email });
    if (!user) return res.json({ ok: true });

    const token = nanoid(32);
    await PasswordResetToken.create({
      userId: user._id,
      token,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000)
    });

    const link = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || "no-reply@lablive.local",
      to: email,
      subject: "Password Reset",
      html: `<p>Click to reset password:</p><a href="${link}">${link}</a>`
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server error" });
  }
});

/* ------------------ Password Reset Confirm ------------------ */
router.post("/password-reset/confirm", authLimiter, async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword)
      return res.status(400).json({ error: "missing" });

    if (!validatePasswordRules(newPassword))
      return res.status(400).json({ error: "Password does not meet rules" });

    const doc = await PasswordResetToken.findOne({ token });
    if (!doc) return res.status(400).json({ error: "invalid or expired token" });

    if (doc.expiresAt < new Date()) {
      await doc.deleteOne();
      return res.status(400).json({ error: "expired token" });
    }

    const user = await User.findById(doc.userId);
    if (!user) return res.status(400).json({ error: "invalid" });

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await user.save();
    await doc.deleteOne();

    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server error" });
  }
});

/* ------------------ OTP Request ------------------ */
router.post("/otp/request", authLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "missing" });

    const user = await User.findOne({ email });
    if (!user) return res.json({ ok: true });

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    user.otp = { code, expiresAt: new Date(Date.now() + 5 * 60 * 1000) };
    await user.save();

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || "no-reply@lablive.local",
      to: email,
      subject: "Your OTP Code",
      text: `Your code: ${code} (valid 5 minutes)`
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server error" });
  }
});

/* ------------------ OTP Verify ------------------ */
router.post("/otp/verify", authLimiter, async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ error: "missing" });

    const user = await User.findOne({ email });
    if (!user?.otp) return res.status(401).json({ error: "invalid" });

    if (user.otp.expiresAt < new Date()) {
      user.otp = undefined;
      await user.save();
      return res.status(401).json({ error: "expired" });
    }

    if (user.otp.code !== code) return res.status(401).json({ error: "invalid" });

    user.otp = undefined;
    await user.save();

    const token = jwt.sign(
      { sub: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    return res.json({ success: true, token });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server error" });
  }
});

/* ------------------ 2FA Setup ------------------ */
router.post("/2fa/setup", async (req, res) => {
  try {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: "missing token" });

    let payload;
    try {
      payload = jwt.verify(auth.split(" ")[1], process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ error: "invalid token" });
    }

    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ error: "invalid user" });

    const secret = speakeasy.generateSecret({
      name: `LabLive (${user.email})`
    });

    const qr = await qrcode.toDataURL(secret.otpauth_url);

    user.twoFA = {
      tempSecret: secret.base32,
      enabled: false
    };
    await user.save();

    return res.json({ qr, secret: secret.base32 });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server error" });
  }
});

/* ------------------ 2FA Verify & Enable ------------------ */
router.post("/2fa/verify", async (req, res) => {
  try {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: "missing token" });

    let payload;
    try {
      payload = jwt.verify(auth.split(" ")[1], process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ error: "invalid token" });
    }

    const user = await User.findById(payload.sub);
    if (!user?.twoFA?.tempSecret)
      return res.status(400).json({ error: "setup not started" });

    const { code } = req.body;

    const ok = speakeasy.totp.verify({
      secret: user.twoFA.tempSecret,
      encoding: "base32",
      token: code
    });

    if (!ok) return res.status(401).json({ error: "invalid code" });

    user.twoFA = {
      enabled: true,
      secret: user.twoFA.tempSecret
    };
    await user.save();

    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server error" });
  }
});

export default router;
