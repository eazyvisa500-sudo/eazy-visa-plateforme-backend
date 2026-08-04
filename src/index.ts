import express from "express";
import path from "path";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import compression from "compression";
import "dotenv/config";
import authRoutes from "./routes/auth.routes";
import entrepriseRoutes from "./routes/entreprise.routes";
import employeRoutes from "./routes/employe.routes";
import departementRoutes from "./routes/departement.routes";
import budgetAnnuelRoutes from "./routes/budgetAnnuel.routes";
import budgetAllocationRoutes from "./routes/budgetAllocation.routes";
import politiqueRoutes from "./routes/politique.routes";
import demandeVoyageRoutes from "./routes/demandeVoyage.routes";
import reservationRoutes from "./routes/reservation.routes";
import referenceDataRoutes from "./routes/referenceData.routes";
import flightsRoutes from "./routes/flights.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import forfaitRoutes from "./routes/forfait.routes";
import { errorHandler } from "./middlewares/error.middleware";
import { requestLogger } from "./middlewares/logger.middleware";

const app = express();
const PORT = process.env["PORT"] ?? 3000;

// Security headers
app.use(helmet());

// Response compression
app.use(compression());

// CORS configuration (must be before rate limiting)
const corsOptions = {
  origin: process.env["FRONTEND_URL"] || "http://localhost:5173",
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Trop de requêtes, veuillez réessayer plus tard",
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", limiter);

// Stricter rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 5 requests per windowMs
  message: "Trop de tentatives de connexion, veuillez réessayer plus tard",
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(express.json());
app.use(requestLogger);
app.use(
  "/uploads",
  express.static(path.join(process.cwd(), "uploads"), {
    setHeaders: (res, filePath) => {
      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes: Record<string, string> = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".gif": "image/gif",
        ".webp": "image/webp",
        ".svg": "image/svg+xml",
      };
      if (mimeTypes[ext]) {
        res.setHeader("Content-Type", mimeTypes[ext]);
      }
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    },
  }),
);

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/entreprises", entrepriseRoutes);
app.use("/api/employes", employeRoutes);
app.use("/api/departements", departementRoutes);
app.use("/api/budgets-annuels", budgetAllocationRoutes);
app.use("/api/budgets-allocation", budgetAllocationRoutes);
app.use("/api/budgets-annuels", budgetAnnuelRoutes);
app.use("/api/politiques", politiqueRoutes);
app.use("/api/demandes-voyage", demandeVoyageRoutes);
app.use("/api/reservations", reservationRoutes);
app.use("/api/reference-data", referenceDataRoutes);
app.use("/api/flights", flightsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/forfaits", forfaitRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
