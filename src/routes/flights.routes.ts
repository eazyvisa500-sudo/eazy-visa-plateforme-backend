import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { searchFlights, bookFlight, bookGroupFlight, bookGroupFlightDirect, getOrder, cancelOrder, confirmOrderCancellation, searchFlightsAdvanced,searchAirportSuggestion } from '../controllers/flights.controller'
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

// Réservation de vol groupé directe via SDK Duffel (accès MANAGER/SUPERADMIN)
router.post('/book-group-direct', requireAuth, requireManagerOrSuperAdmin, asyncHandler(bookGroupFlightDirect))

// Vérification des conditions d'annulation d'une commande Duffel (accès MANAGER/SUPERADMIN)
router.post('/cancel/check', requireAuth, requireManagerOrSuperAdmin, asyncHandler(cancelOrder))

// Annulation d'une commande Duffel (accès MANAGER/SUPERADMIN)
router.post('/cancel/confirm', requireAuth, requireManagerOrSuperAdmin, asyncHandler(confirmOrderCancellation))

// Récupération d'une commande Duffel par ID (accès MANAGER/SUPERADMIN)
router.get('/orders/:id', requireAuth, requireManagerOrSuperAdmin, asyncHandler(getOrder))
// suggestion d'aéroport
router.get('/suggestions', requireAuth, asyncHandler(searchAirportSuggestion))

export default router
