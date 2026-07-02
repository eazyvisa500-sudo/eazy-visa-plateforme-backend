import { Router } from 'express'
import { requireAuth } from '../middlewares/auth.middleware'
import {
  getReservationsEntreprise,
  getMesReservations,
  getReservationBilletById,
  getReservationHotelById,
} from '../controllers/reservation.controller'

const router = Router()

router.use(requireAuth)

// Manager/SuperAdmin : voir toutes les réservations de l'entreprise
router.get('/entreprise', getReservationsEntreprise)

// Employé/Consultant : voir ses propres réservations
router.get('/mes-reservations', getMesReservations)

// Détail d'une réservation de billet
router.get('/billets/:id', getReservationBilletById)

// Détail d'une réservation d'hôtel
router.get('/hotels/:id', getReservationHotelById)

export default router
