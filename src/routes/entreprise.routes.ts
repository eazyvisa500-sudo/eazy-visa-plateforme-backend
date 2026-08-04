import { Router } from "express";
import multer from "multer";
import {
  createEntreprise,
  getAllEntreprises,
  getEntrepriseById,
  updateEntreprise,
  toggleEntrepriseStatut,
} from "../controllers/entreprise.controller";
import {
  uploadLogoEntreprise,
  getLogoEntreprise,
} from "../controllers/logo.controller";
import { requireAuth, requireSuperAdmin } from "../middlewares/auth.middleware";
import { asyncHandler } from "../utils/asyncHandler";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Seules les images sont acceptées"));
    }
  },
});

const router = Router();

router.use(requireAuth, requireSuperAdmin);

router.post("/", upload.single("logo"), asyncHandler(createEntreprise));
router.get("/", asyncHandler(getAllEntreprises));
router.get("/:id", asyncHandler(getEntrepriseById));
router.put("/:id", asyncHandler(updateEntreprise));
router.patch("/:id/statut", asyncHandler(toggleEntrepriseStatut));
router.get("/:id/logo", asyncHandler(getLogoEntreprise));
router.patch(
  "/:id/logo",
  upload.single("logo"),
  asyncHandler(uploadLogoEntreprise),
);

export default router;
