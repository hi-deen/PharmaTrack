import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js";
import bcrypt from "bcryptjs";

dotenv.config();

async function main() {
  await mongoose.connect(process.env.MONGO_URL, { dbName: "PharmaTrack" });
  const email = process.argv[2];
  const password = process.argv[3];
  if (!email || !password) {
    console.error("Usage: node src/scripts/createAdmin.js admin@example.com S3cureP@ssw0rd!");
    process.exit(1);
  }
  const exists = await User.findOne({ email });
  if (exists) {
    console.log("Admin already exists:", exists.email);
    process.exit(0);
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const u = await User.create({ name: "Administrator", email, passwordHash, role: "admin" });
  console.log("Created admin:", u.email);
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
