import { Router } from 'express'
import {
  createEmployes,
  getAllEmployes,
  searchEmploye,
  getEmployeById,
  updateEmploye,
  toggleEmployeBlock,
  deleteEmploye,
} from '../controllers/employe.controller'
import { requireAuth, requireManagerOrSuperAdmin } from '../middlewares/auth.middleware'

const router = Router()

router.use(requireAuth, requireManagerOrSuperAdmin)

router.post('/', createEmployes)
router.get('/', getAllEmployes)
router.get('/search', searchEmploye)
router.get('/:id', getEmployeById)
router.put('/:id', updateEmploye)
router.patch('/:id/bloquer', toggleEmployeBlock)
router.delete('/:id', deleteEmploye)

export default router
