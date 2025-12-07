import { Router } from "express";
import Department from "../models/Department.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validateDepartmentCreate } from "../validation/department.validation.js";
import { logger } from "../utils/logger.js";

const router = Router();

// List departments (all authenticated users)
router.get("/", requireAuth, async (req, res) => {
  try {
    const list = await Department.find().sort({ name: 1 });
    res.json(list);
  } catch (err) {
    logger.error("Department list error:", err);
    res.status(500).json({ error: "Failed to fetch departments" });
  }
});

// Create department (admin only)
router.post("/", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const validation = validateDepartmentCreate(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: "Validation failed", details: validation.errors });
    }

    const { name, description } = req.body;
    const existing = await Department.findOne({ name });
    if (existing) {
      return res.status(409).json({ error: "Department with this name already exists" });
    }

    const d = await Department.create({ name, description });
    logger.info(`Department created: ${d._id}`, { adminId: req.user.sub, department: d });
    res.status(201).json(d);
  } catch (err) {
    logger.error("Department creation error:", err);
    res.status(500).json({ error: "Failed to create department" });
  }
});

// Update department (admin only)
router.put("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { name, description } = req.body;
    const d = await Department.findByIdAndUpdate(req.params.id, { name, description }, { new: true });
    if (!d) return res.status(404).json({ error: "Department not found" });
    
    logger.info(`Department updated: ${d._id}`, { adminId: req.user.sub });
    res.json(d);
  } catch (err) {
    logger.error("Department update error:", err);
    res.status(500).json({ error: "Failed to update department" });
  }
});

// Delete department (admin only)
router.delete("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const d = await Department.findByIdAndDelete(req.params.id);
    if (!d) return res.status(404).json({ error: "Department not found" });
    
    logger.info(`Department deleted: ${d._id}`, { adminId: req.user.sub });
    res.json({ success: true });
  } catch (err) {
    logger.error("Department deletion error:", err);
    res.status(500).json({ error: "Failed to delete department" });
  }
});

export default router;