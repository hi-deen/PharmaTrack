import { Router } from "express";
import authRoutes from "./auth.js";
import deptRoutes from "./departments.js";
import activityRoutes from "./activities.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/departments", deptRoutes);
router.use("/activities", activityRoutes);

export default router;
