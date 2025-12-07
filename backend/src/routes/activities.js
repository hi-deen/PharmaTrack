import { Router } from "express";
import Activity from "../models/Activity.js";
import { requireAuth } from "../middleware/auth.js";
import { validateActivityCreate } from "../validation/activity.validation.js";
import { logger } from "../utils/logger.js";

const router = Router();

// List activities with filters
router.get("/", requireAuth, async (req, res) => {
  try {
    const { departmentId, type, from, to, limit = 50 } = req.query;
    const q = {};
    
    if (departmentId) {
      // Validate ObjectId format
      if (!departmentId.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({ error: "Invalid department ID" });
      }
      q.departmentId = departmentId;
    }
    
    if (type) q.activityType = type;
    
    if (from || to) {
      q.createdAt = {};
      if (from) {
        const fromDate = new Date(from);
        if (isNaN(fromDate)) return res.status(400).json({ error: "Invalid from date" });
        q.createdAt.$gte = fromDate;
      }
      if (to) {
        const toDate = new Date(to);
        if (isNaN(toDate)) return res.status(400).json({ error: "Invalid to date" });
        q.createdAt.$lte = toDate;
      }
    }
    
    const items = await Activity.find(q)
      .sort({ createdAt: -1 })
      .limit(Math.min(Number(limit) || 50, 500))
      .populate("performedBy", "name email")
      .populate("departmentId", "name");
    
    logger.info(`Activity list fetched by ${req.user.sub}`, { filter: q });
    res.json(items);
  } catch (err) {
    logger.error("Activity list error:", err);
    res.status(500).json({ error: "Failed to fetch activities" });
  }
});

// Create activity
router.post("/", requireAuth, async (req, res) => {
  try {
    const validation = validateActivityCreate(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: "Validation failed", details: validation.errors });
    }

    const io = req.app.get("io");
    const body = req.body;
    body.performedBy = req.user.sub;
    
    const activity = await Activity.create(body);
    await activity.populate("performedBy", "name email");
    
    io.to(`department:${activity.departmentId.toString()}`).emit("activity:created", activity);
    logger.info(`Activity created: ${activity._id}`, { userId: req.user.sub, activity });
    
    res.status(201).json(activity);
  } catch (err) {
    logger.error("Activity creation error:", err);
    res.status(500).json({ error: "Failed to create activity" });
  }
});

export default router;
