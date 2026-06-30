import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import authRoutes from './routes/auth.routes'
import entrepriseRoutes from './routes/entreprise.routes'
import employeRoutes from './routes/employe.routes'
import departementRoutes from './routes/departement.routes'

const app = express()
const PORT = process.env['PORT'] ?? 3000

app.use(cors())
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/entreprises', entrepriseRoutes)
app.use('/api/employes', employeRoutes)
app.use('/api/departements', departementRoutes)

app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`)
})
