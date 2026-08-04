import type { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";
import prisma from "../lib/prismaClient";
import { NotFoundError, BadRequestError } from "../utils/AppError";
import { parseIdParam } from "../utils/validation";

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "logos");

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const toLocalPath = (logo: string) => path.join(process.cwd(), logo);

const toPublicUrl = (req: Request, logo: string) => {
  const host = req.get("host") ?? "localhost";
  return `${req.protocol}://${host}/${logo.replace(/\\/g, "/")}`;
};

export const getLogoEntreprise = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const id = parseIdParam(req.params["id"]);

  const entreprise = await prisma.entreprise.findUnique({ where: { id } });
  if (!entreprise) {
    throw new NotFoundError("Entreprise");
  }
  if (!entreprise.logo) {
    throw new NotFoundError("Logo", "LOGO_NOT_FOUND");
  }

  const logoUrl = toPublicUrl(req, entreprise.logo);
  res.status(200).json({ logo_url: logoUrl });
};

export const uploadLogoEntreprise = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const id = parseIdParam(req.params["id"]);

  const file = req.file;
  if (!file) {
    throw new BadRequestError("Fichier image requis", "FILE_REQUIRED");
  }

  const entreprise = await prisma.entreprise.findUnique({ where: { id } });
  if (!entreprise) {
    throw new NotFoundError("Entreprise");
  }

  if (entreprise.logo) {
    const oldPath = toLocalPath(entreprise.logo);
    if (fs.existsSync(oldPath)) {
      fs.unlinkSync(oldPath);
    }
  }

  const ext = (file.originalname.split(".").pop() ?? "jpg").toLowerCase();
  const filename = `${id}-${uuidv4()}.${ext}`;
  const logo = path.posix.join("uploads", "logos", filename);
  const filePath = toLocalPath(logo);

  fs.writeFileSync(filePath, file.buffer);

  const updated = await prisma.entreprise.update({
    where: { id },
    data: { logo },
  });

  const logoUrl = toPublicUrl(req, logo);

  res.status(200).json({
    message: "Logo mis à jour avec succès",
    logo_url: logoUrl,
    entreprise: { ...updated, logo_url: logoUrl },
  });
};
