import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthPayload {
  id?: number;
  email: string;
  role: string;
  entrepriseId?: number;
  matricule?: string;
  identifiantEntreprise?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const authHeader = req.headers["authorization"];
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ message: "Token d'authentification manquant" });
    return;
  }
  const token = authHeader.substring(7);
  const secret = process.env["JWT_SECRET"];
  if (!secret) {
    res.status(500).json({ message: "Configuration JWT manquante" });
    return;
  }
  try {
    const payload = jwt.verify(token, secret) as AuthPayload;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ message: "Token invalide ou expiré" });
  }
};

export const requireSuperAdmin = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (req.user?.role !== "SUPERADMIN") {
    res.status(403).json({ message: "Accès réservé au superadmin" });
    return;
  }
  next();
};

export const requireManagerOrSuperAdmin = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const role = req.user?.role;
  if (role !== "SUPERADMIN" && role !== "MANAGER") {
    res.status(403).json({ message: "Accès non autorisé" });
    return;
  }
  next();
};
