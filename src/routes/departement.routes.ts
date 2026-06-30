import { Router } from 'express'
import {
  createDepartement,
  getMesDepartements,
  getDepartementsEntreprise,
  updateDepartement,
  deleteDepartement,
} from '../controllers/departement.controller'
import { requireAuth, requireManagerOrSuperAdmin } from '../middlewares/auth.middleware'
import { asyncHandler } from '../utils/asyncHandler'

const router = Router()

router.use(requireAuth, requireManagerOrSuperAdmin)

router.post('/', asyncHandler(createDepartement))
router.get('/mon-entreprise', asyncHandler(getMesDepartements))
router.get('/', asyncHandler(getDepartementsEntreprise))
router.put('/:id', asyncHandler(updateDepartement))
router.delete('/:id', asyncHandler(deleteDepartement))

export default router
