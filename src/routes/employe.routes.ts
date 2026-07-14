import { Router } from 'express'
import {
  createEmployes,
  getAllEmployes,
  searchEmploye,
  getEmployeById,
  updateEmploye,
  toggleEmployeBlock,
  deleteEmploye,
  getEmployeeOverview,
} from '../controllers/employe.controller'
import { requireAuth, requireManagerOrSuperAdmin } from '../middlewares/auth.middleware'
import { asyncHandler } from '../utils/asyncHandler'

const router = Router()

// Route overview accessible par tous les utilisateurs authentifiés (employé peut voir ses propres données)
// Doit être définie AVANT le middleware requireManagerOrSuperAdmin
router.get('/:matricule/overview', requireAuth, asyncHandler(getEmployeeOverview))

// Middleware pour les autres routes (nécessite Manager ou SuperAdmin)
router.use(requireAuth, requireManagerOrSuperAdmin)

router.post('/', asyncHandler(createEmployes))
router.get('/', asyncHandler(getAllEmployes))
router.get('/search', asyncHandler(searchEmploye))
router.get('/:id', asyncHandler(getEmployeById))
router.put('/:id', asyncHandler(updateEmploye))
router.patch('/:id/bloquer', asyncHandler(toggleEmployeBlock))
router.delete('/:id', asyncHandler(deleteEmploye))

export default router
