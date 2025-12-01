import { Router } from "express";
import Department from "../models/Department.js";

const router = Router();

router.get("/", async (req, res) => {
  const list = await Department.find().sort({ name: 1 });
  res.json(list);
});

router.post("/", async (req, res) => {
  const { name, description } = req.body; 
  if (!name) return res.status(400).json({ error: "name required" });
  const d = await Department.create({ name, description });
  res.status(201).json(d);
});

export default router;