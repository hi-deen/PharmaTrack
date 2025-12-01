import { Router } from "express";
import Activity from "../models/Activity.js";
import auth from "../middleware/auth.js";

const router = Router();

// list with simple filters
router.get("/", auth, async (req, res) => {
  const { departmentId, type, from, to, limit = 50 } = req.query;
  const q = {};
  if (departmentId) q.departmentId = departmentId;
  if (type) q.activityType = type;
  if (from || to) q.createdAt = {};
  if (from) q.createdAt.$gte = new Date(from);
  if (to) q.createdAt.$lte = new Date(to);
  const items = await Activity.find(q).sort({ createdAt: -1 }).limit(Number(limit));
  res.json(items);
});

router.post("/", auth, async (req, res) => {
  const io = req.app.get("io");
  const body = req.body;
  // attach performedBy if not provided
  body.performedBy = body.performedBy || req.user?.id;
  const activity = await Activity.create(body);
  // broadcast to department room
  io.to(`department:${activity.departmentId.toString()}`).emit("activity:created", activity);
  res.status(201).json(activity);
});

export default router;
