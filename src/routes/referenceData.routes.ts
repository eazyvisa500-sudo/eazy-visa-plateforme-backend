import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { searchFlights } from "../controllers/referenceData.controller";
import {
  requireAuth,
  requireManagerOrSuperAdmin,
} from "../middlewares/auth.middleware";

const router = Router();

// Recherche de vols via Duffel API (accès MANAGER/SUPERADMIN)
router.post(
  "/flights/search",
  requireAuth,
  requireManagerOrSuperAdmin,
  asyncHandler(searchFlights),
);

export default router;
