import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import authRoutes from './routes/auth.routes'
import entrepriseRoutes from './routes/entreprise.routes'
import employeRoutes from './routes/employe.routes'
import departementRoutes from './routes/departement.routes'
import budgetAnnuelRoutes from './routes/budgetAnnuel.routes'
import budgetAllocationRoutes from './routes/budgetAllocation.routes'
import politiqueRoutes from './routes/politique.routes'
import demandeVoyageRoutes from './routes/demandeVoyage.routes'
import reservationRoutes from './routes/reservation.routes'
import { errorHandler } from './middlewares/error.middleware'
import { requestLogger } from './middlewares/logger.middleware'

const app = express()
const PORT = process.env['PORT'] ?? 3000

app.use(cors())
app.use(express.json())
app.use(requestLogger)

app.use('/api/auth', authRoutes)
app.use('/api/entreprises', entrepriseRoutes)
app.use('/api/employes', employeRoutes)
app.use('/api/departements', departementRoutes)
app.use('/api/budgets-annuels', budgetAllocationRoutes)
app.use('/api/budgets-allocation', budgetAllocationRoutes)
app.use('/api/budgets-annuels', budgetAnnuelRoutes)
app.use('/api/politiques', politiqueRoutes)
app.use('/api/demandes-voyage', demandeVoyageRoutes)
app.use('/api/reservations', reservationRoutes)

app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`)
})
