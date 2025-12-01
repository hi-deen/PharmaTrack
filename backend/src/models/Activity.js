import mongoose from "mongoose";

const ActivitySchema = new mongoose.Schema({
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },
  activityType: { type: String, required: true }, // code e.g. EQUIP_ON
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  startedAt: Date,
  finishedAt: Date,
  status: { type: String, enum: ["in_progress", "completed", "cancelled"], default: "completed" },
  shift: { type: String, enum: ["morning", "afternoon", "evening"] },
  details: { type: mongoose.Schema.Types.Mixed },
  metadata: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now }
});

ActivitySchema.index({ departmentId: 1, createdAt: -1 });

export default mongoose.model("Activity", ActivitySchema);
