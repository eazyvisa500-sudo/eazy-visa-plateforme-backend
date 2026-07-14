import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { searchFlights, bookFlight, bookGroupFlight, getOrder, cancelOrder, confirmOrderCancellation, searchFlightsAdvanced } from '../controllers/flights.controller'
import { requireAuth, requireManagerOrSuperAdmin } from '../middlewares/auth.middleware'

const router = Router()

// Recherche de vols via SDK Duffel (accès MANAGER/SUPERADMIN)
router.post('/search', requireAuth, requireManagerOrSuperAdmin, asyncHandler(searchFlights))

// Recherche de vols avancée via SDK Duffel (accès MANAGER/SUPERADMIN)
router.post('/search-advanced', requireAuth, requireManagerOrSuperAdmin, asyncHandler(searchFlightsAdvanced))

// Réservation de vol via SDK Duffel (accès MANAGER/SUPERADMIN)
router.post('/book', requireAuth, requireManagerOrSuperAdmin, asyncHandler(bookFlight))

// Réservation de vol groupé via SDK Duffel (accès MANAGER/SUPERADMIN)
router.post('/book-group', requireAuth, requireManagerOrSuperAdmin, asyncHandler(bookGroupFlight))

// Vérification des conditions d'annulation d'une commande Duffel (accès MANAGER/SUPERADMIN)
router.post('/cancel/check', requireAuth, requireManagerOrSuperAdmin, asyncHandler(cancelOrder))

// Annulation d'une commande Duffel (accès MANAGER/SUPERADMIN)
router.post('/cancel/confirm', requireAuth, requireManagerOrSuperAdmin, asyncHandler(confirmOrderCancellation))

// Récupération d'une commande Duffel par ID (accès MANAGER/SUPERADMIN)
router.get('/orders/:id', requireAuth, requireManagerOrSuperAdmin, asyncHandler(getOrder))

export default router
