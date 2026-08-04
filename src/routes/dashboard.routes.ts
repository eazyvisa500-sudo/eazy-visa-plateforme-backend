import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import {
  getOverview,
  getDetails,
  getGlobalAnalytics,
} from "../controllers/dashboard.controller";
import {
  requireAuth,
  requireManagerOrSuperAdmin,
  requireSuperAdmin,
} from "../middlewares/auth.middleware";

const router = Router();

// Vue d'ensemble pour manager/superadmin
router.get(
  "/overview",
  requireAuth,
  requireManagerOrSuperAdmin,
  asyncHandler(getOverview),
);

// Vue détaillée pour manager/superadmin
router.get(
  "/details",
  requireAuth,
  requireManagerOrSuperAdmin,
  asyncHandler(getDetails),
);

// Analytiques globales pour superadmin uniquement
router.get(
  "/global-analytics",
  requireAuth,
  requireSuperAdmin,
  asyncHandler(getGlobalAnalytics),
);

export default router;
