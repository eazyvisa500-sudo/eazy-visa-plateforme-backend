import { Router } from "express";
import {
  createDemandeVoyage,
  getAllDemandesVoyage,
  getMesDemandesVoyage,
  getDemandeVoyageById,
  updateDemandeVoyage,
  approuverDemandeVoyage,
  rejeterDemandeVoyage,
  annulerDemandeVoyage,
  cloturerDemandeVoyage,
} from "../controllers/demandeVoyage.controller";
import {
  requireAuth,
  requireManagerOrSuperAdmin,
} from "../middlewares/auth.middleware";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.post("/", requireAuth, asyncHandler(createDemandeVoyage));
router.get("/mes-demandes", requireAuth, asyncHandler(getMesDemandesVoyage));
router.get(
  "/",
  requireAuth,
  requireManagerOrSuperAdmin,
  asyncHandler(getAllDemandesVoyage),
);
router.get("/:id", requireAuth, asyncHandler(getDemandeVoyageById));
router.put("/:id", requireAuth, asyncHandler(updateDemandeVoyage));
router.patch(
  "/:id/approuver",
  requireAuth,
  requireManagerOrSuperAdmin,
  asyncHandler(approuverDemandeVoyage),
);
router.patch(
  "/:id/rejeter",
  requireAuth,
  requireManagerOrSuperAdmin,
  asyncHandler(rejeterDemandeVoyage),
);
router.patch("/:id/annuler", requireAuth, asyncHandler(annulerDemandeVoyage));
router.patch(
  "/:id/cloturer",
  requireAuth,
  requireManagerOrSuperAdmin,
  asyncHandler(cloturerDemandeVoyage),
);

export default router;
