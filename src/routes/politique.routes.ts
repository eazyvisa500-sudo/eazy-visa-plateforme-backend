import { Router } from 'express'
import {
  createPolitique,
  getPolitiqueByMatricule,
  updatePolitique,
  deletePolitique,
  getAllPolitiques,
} from '../controllers/politique.controller'
import { requireAuth, requireManagerOrSuperAdmin } from '../middlewares/auth.middleware'
import { asyncHandler } from '../utils/asyncHandler'

const router = Router()

// Tout utilisateur authentifié peut voir SA propre politique
router.get('/:matricule', requireAuth, asyncHandler(getPolitiqueByMatricule))

// Manager / Superadmin : lister toutes les politiques
router.get('/', requireAuth, requireManagerOrSuperAdmin, asyncHandler(getAllPolitiques))

// Manager / Superadmin : créer, modifier, supprimer une politique
router.post('/', requireAuth, requireManagerOrSuperAdmin, asyncHandler(createPolitique))
router.put('/:matricule', requireAuth, requireManagerOrSuperAdmin, asyncHandler(updatePolitique))
router.delete('/:matricule', requireAuth, requireManagerOrSuperAdmin, asyncHandler(deletePolitique))

export default router
