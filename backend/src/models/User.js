import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true, lowercase: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["admin", "staff", "viewer"], default: "staff" },
  department: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
  isActive: { type: Boolean, default: true },
  twoFA: {
    enabled: { type: Boolean, default: false },
    secret: { type: String, default: null },
    tempSecret: { type: String, default: null }
  },
  lastLogin: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

UserSchema.index({ email: 1 });

export default mongoose.model("User", UserSchema);
