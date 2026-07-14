import { Router } from 'express'
import { requireAuth } from '../middlewares/auth.middleware'
import {
  getReservationsEntreprise,
  getMesReservations,
  getReservationBilletById,
  getReservationHotelById,
<<<<<<< HEAD
  filterReservations,
  checkBudgets,
=======
>>>>>>> 237a3e01a673dca26acb8f75d6a0fef8c514bac8
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

<<<<<<< HEAD
// Filtrer les réservations par statut et date
router.post('/filter', filterReservations)

// Vérifier les budgets des utilisateurs
router.post('/check-budgets', checkBudgets)

=======
>>>>>>> 237a3e01a673dca26acb8f75d6a0fef8c514bac8
export default router
