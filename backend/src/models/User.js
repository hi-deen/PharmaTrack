import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, required: true },
  passwordHash: String,
  role: { type: String, default: "operator" },
  department: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
  twoFA: {
    enabled: { type: Boolean, default: false },
    secret: { type: String, default: null },
    tempSecret: { type: String, default: null }
  },
  otp: {
    code: String,
    expiresAt: Date
  },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("User", UserSchema);

export const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});
