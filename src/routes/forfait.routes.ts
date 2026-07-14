import { Router } from 'express'
import {
  createForfait,
  getAllForfaits,
  getForfaitById,
  getForfaitByEntreprise,
  updateForfait,
  incrementUserCount,
  decrementUserCount,
  deleteForfait,
  getForfaitByCurrentUser,
} from '../controllers/forfait.controller'
import { requireAuth, requireSuperAdmin } from '../middlewares/auth.middleware'
import { asyncHandler } from '../utils/asyncHandler'

const router = Router()

// Route accessible aux managers pour voir leur propre forfait
router.get('/mon-forfait', requireAuth, asyncHandler(getForfaitByCurrentUser))

// Routes SUPERADMIN uniquement
router.use(requireAuth, requireSuperAdmin)

router.post('/', asyncHandler(createForfait))
router.get('/', asyncHandler(getAllForfaits))
router.get('/:id', asyncHandler(getForfaitById))
router.get('/entreprise/:entrepriseId', asyncHandler(getForfaitByEntreprise))
router.put('/:id', asyncHandler(updateForfait))
router.patch('/:id/increment', asyncHandler(incrementUserCount))
router.patch('/:id/decrement', asyncHandler(decrementUserCount))
router.delete('/:id', asyncHandler(deleteForfait))

export default router
