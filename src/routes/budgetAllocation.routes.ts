import { Router } from "express";
import {
  allouerBudgetDepartement,
  allouerBudgetPersonnel,
  getBudgetsDepartements,
  getBudgetsPersonnels,
  updateBudgetDepartement,
  deleteBudgetDepartement,
  updateBudgetPersonnel,
  deleteBudgetPersonnel,
  augmenterBudgetAnnuel,
  diminuerBudgetAnnuel,
  augmenterBudgetDepartement,
  diminuerBudgetDepartement,
  augmenterBudgetPersonnel,
  diminuerBudgetPersonnel,
  getAuditBudget,
  getAuditsByEmploye,
  getMesBudgetsPersonnels,
  getBudgetsPersonnelsByEmploye,
  bloquerBudgetDepartement,
  debloquerBudgetDepartement,
  bloquerBudgetPersonnel,
  debloquerBudgetPersonnel,
} from "../controllers/budgetAllocation.controller";
import {
  requireAuth,
  requireManagerOrSuperAdmin,
} from "../middlewares/auth.middleware";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

// --- Routes accessibles a tout utilisateur authentifie ---
router.get(
  "/audits/employe/:matricule",
  requireAuth,
  asyncHandler(getAuditsByEmploye),
);
router.get(
  "/audits",
  requireAuth,
  requireManagerOrSuperAdmin,
  asyncHandler(getAuditBudget),
);
router.get("/mes-budgets", requireAuth, asyncHandler(getMesBudgetsPersonnels));
router.get(
  "/employe/:matricule/budgets",
  requireAuth,
  asyncHandler(getBudgetsPersonnelsByEmploye),
);

// --- Routes allocation : MANAGER ou SUPERADMIN uniquement ---
router.use(requireAuth, requireManagerOrSuperAdmin);

// Allocation sous un budget annuel
router.post("/:reference/departements", asyncHandler(allouerBudgetDepartement));
router.post("/:reference/personnels", asyncHandler(allouerBudgetPersonnel));
router.get("/:reference/departements", asyncHandler(getBudgetsDepartements));
router.get("/:reference/personnels", asyncHandler(getBudgetsPersonnels));

// Gestion des allocations départementales
router.put("/departements/:id", asyncHandler(updateBudgetDepartement));
router.delete("/departements/:id", asyncHandler(deleteBudgetDepartement));

// Gestion des allocations personnelles
router.put("/personnels/:id", asyncHandler(updateBudgetPersonnel));
router.delete("/personnels/:id", asyncHandler(deleteBudgetPersonnel));

// Augmenter / Diminuer budget annuel
router.post("/:reference/augmenter", asyncHandler(augmenterBudgetAnnuel));
router.post("/:reference/diminuer", asyncHandler(diminuerBudgetAnnuel));

// Augmenter / Diminuer budget département
router.post(
  "/departements/:id/augmenter",
  asyncHandler(augmenterBudgetDepartement),
);
router.post(
  "/departements/:id/diminuer",
  asyncHandler(diminuerBudgetDepartement),
);

// Augmenter / Diminuer budget personnel
router.post(
  "/personnels/:id/augmenter",
  asyncHandler(augmenterBudgetPersonnel),
);
router.post("/personnels/:id/diminuer", asyncHandler(diminuerBudgetPersonnel));

// Bloquer / Débloquer budget département
router.patch(
  "/departements/:id/bloquer",
  asyncHandler(bloquerBudgetDepartement),
);
router.patch(
  "/departements/:id/debloquer",
  asyncHandler(debloquerBudgetDepartement),
);

// Bloquer / Débloquer budget personnel
router.patch("/personnels/:id/bloquer", asyncHandler(bloquerBudgetPersonnel));
router.patch(
  "/personnels/:id/debloquer",
  asyncHandler(debloquerBudgetPersonnel),
);

export default router;
