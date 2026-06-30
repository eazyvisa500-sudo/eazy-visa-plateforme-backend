import { Router } from 'express'
import {
  createDepartement,
  getMesDepartements,
  getDepartementsEntreprise,
  updateDepartement,
  deleteDepartement,
} from '../controllers/departement.controller'
import { requireAuth, requireManagerOrSuperAdmin } from '../middlewares/auth.middleware'

const router = Router()

router.use(requireAuth, requireManagerOrSuperAdmin)

router.post('/', createDepartement)
router.get('/mon-entreprise', getMesDepartements)
router.get('/', getDepartementsEntreprise)
router.put('/:id', updateDepartement)
router.delete('/:id', deleteDepartement)

export default router
