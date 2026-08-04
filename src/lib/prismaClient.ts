import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import "dotenv/config";

const connectionString = process.env["DATA_BASE_URL"];

if (!connectionString) {
  throw new Error("DATA_BASE_URL manquante dans le fichier .env");
}

const pool = new Pool({
  connectionString,
  max: 20, // Maximum nombre de connexions dans le pool
  min: 5, // Minimum nombre de connexions dans le pool
  idleTimeoutMillis: 30000, // Temps avant qu'une connexion inactive soit fermée
  connectionTimeoutMillis: 10000, // Temps maximum pour établir une connexion (augmenté à 10s)
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
  log:
    process.env["NODE_ENV"] === "development"
      ? ["query", "error", "warn"]
      : ["error"],
});

export default prisma;
