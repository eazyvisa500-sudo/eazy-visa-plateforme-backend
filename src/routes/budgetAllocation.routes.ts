import { Router } from 'express'
import {
  allouerBudgetDepartement,
  allouerBudgetPersonnel,
  getBudgetsDepartements,
  getBudgetsPersonnels,
  updateBudgetDepartement,
  deleteBudgetDepartement,
  updateBudgetPersonnel,
  deleteBudgetPersonnel,
} from '../controllers/budgetAllocation.controller'
import { requireAuth, requireManagerOrSuperAdmin } from '../middlewares/auth.middleware'
import { asyncHandler } from '../utils/asyncHandler'

const router = Router()

router.use(requireAuth, requireManagerOrSuperAdmin)

// Allocation sous un budget annuel
router.post('/:reference/departements', asyncHandler(allouerBudgetDepartement))
router.post('/:reference/personnels', asyncHandler(allouerBudgetPersonnel))
router.get('/:reference/departements', asyncHandler(getBudgetsDepartements))
router.get('/:reference/personnels', asyncHandler(getBudgetsPersonnels))

// Gestion des allocations départementales
router.put('/departements/:id', asyncHandler(updateBudgetDepartement))
router.delete('/departements/:id', asyncHandler(deleteBudgetDepartement))

// Gestion des allocations personnelles
router.put('/personnels/:id', asyncHandler(updateBudgetPersonnel))
router.delete('/personnels/:id', asyncHandler(deleteBudgetPersonnel))

export default router
