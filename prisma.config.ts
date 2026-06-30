import { defineConfig } from 'prisma/config'
import { PrismaPg } from '@prisma/adapter-pg'
import 'dotenv/config'

export default defineConfig({
  datasource: {
    url: process.env.DATA_BASE_URL as string,
    adapter: new PrismaPg({ connectionString: process.env.DATA_BASE_URL }),
  },
})
