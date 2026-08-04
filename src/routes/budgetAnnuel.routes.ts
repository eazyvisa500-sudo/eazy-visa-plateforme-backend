import { Router } from "express";
import {
  createBudgetAnnuel,
  getAllBudgetsAnnuels,
  getBudgetAnnuelById,
  updateBudgetAnnuel,
  deleteBudgetAnnuel,
  activerBudgetAnnuel,
  cloturerBudgetAnnuel,
  getBudgetsAnnuelsByEntreprise,
} from "../controllers/budgetAnnuel.controller";
import {
  requireAuth,
  requireManagerOrSuperAdmin,
} from "../middlewares/auth.middleware";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.use(requireAuth, requireManagerOrSuperAdmin);

router.post("/", asyncHandler(createBudgetAnnuel));
router.get("/", asyncHandler(getAllBudgetsAnnuels));
router.get(
  "/entreprise/:identifiant",
  asyncHandler(getBudgetsAnnuelsByEntreprise),
);
router.get("/:id", asyncHandler(getBudgetAnnuelById));
router.put("/:id", asyncHandler(updateBudgetAnnuel));
router.delete("/:id", asyncHandler(deleteBudgetAnnuel));
router.patch("/:id/activer", asyncHandler(activerBudgetAnnuel));
router.patch("/:id/cloturer", asyncHandler(cloturerBudgetAnnuel));

export default router;
