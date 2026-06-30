import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import 'dotenv/config'

const connectionString = process.env['DATA_BASE_URL']

if (!connectionString) {
  throw new Error('DATA_BASE_URL manquante dans le fichier .env')
}

const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)

const prisma = new PrismaClient({ adapter })

export default prisma
