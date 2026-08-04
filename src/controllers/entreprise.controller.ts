import type { Request, Response } from "express";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import prisma from "../lib/prismaClient";
import { generateIdentifiantEntreprise } from "../lib/generateCode";
import { BadRequestError, NotFoundError } from "../utils/AppError";
import {
  parseIdParam,
  parseStringParam,
  parsePositiveInt,
} from "../utils/validation";

export const createEntreprise = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const body = req.body as Record<string, unknown>;
  const nom = parseStringParam(body.nom, "nom");
  const adresse = parseStringParam(body.adresse, "adresse");
  const pays = parseStringParam(body.pays, "pays");
  const region = parseStringParam(body.region, "region");
  const ville = parseStringParam(body.ville, "ville");
  const logoFromBody =
    body.logo === undefined ? undefined : parseStringParam(body.logo, "logo");
  const nombre_user_autorise = parsePositiveInt(
    body.nombre_user_autorise,
    "nombre_user_autorise",
  );

  const identifiant = await generateIdentifiantEntreprise();

  const initialLogo =
    typeof logoFromBody === "string" ? logoFromBody : undefined;

  let entreprise = await prisma.entreprise.create({
    data: {
      nom,
      identifiant,
      adresse,
      pays,
      region,
      ville,
      ...(initialLogo !== undefined && { logo: initialLogo }),
    },
  });

  if (req.file) {
    const uploadDir = path.join(process.cwd(), "uploads", "logos");
    fs.mkdirSync(uploadDir, { recursive: true });
    const ext = (req.file.originalname.split(".").pop() ?? "jpg").toLowerCase();
    const filename = `${entreprise.id}-${uuidv4()}.${ext}`;
    const logo = path.posix.join("uploads", "logos", filename);
    const filePath = path.join(process.cwd(), logo);
    fs.writeFileSync(filePath, req.file.buffer);
    entreprise = await prisma.entreprise.update({
      where: { id: entreprise.id },
      data: { logo },
    });
  }

  // Créer automatiquement le forfait pour l'entreprise
  const forfait = await prisma.forfait.create({
    data: {
      entrepriseId: entreprise.id,
      nombre_user_autorise,
      nombre_user_actuel: 0,
    },
  });

  res.status(201).json({
    message: "Entreprise créée avec succès",
    identifiant_genere: entreprise.identifiant,
    entreprise,
    forfait,
  });
};

export const getAllEntreprises = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  const entreprises = await prisma.entreprise.findMany({
    include: {
      _count: { select: { users: true } },
      forfait: {
        select: {
          id: true,
          nombre_user_autorise: true,
          nombre_user_actuel: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  res.status(200).json(entreprises);
};

export const getEntrepriseById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const id = parseIdParam(req.params["id"]);
  const entreprise = await prisma.entreprise.findUnique({
    where: { id },
    include: {
      users: {
        select: {
          id: true,
          prenom: true,
          nom: true,
          email: true,
          poste: true,
          role: true,
        },
      },
      forfait: {
        select: {
          id: true,
          nombre_user_autorise: true,
          nombre_user_actuel: true,
        },
      },
    },
  });
  if (!entreprise) {
    throw new NotFoundError("Entreprise");
  }
  res.status(200).json(entreprise);
};

export const updateEntreprise = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const id = parseIdParam(req.params["id"]);
  const body = req.body as Record<string, unknown>;
  const nom =
    body.nom === undefined ? undefined : parseStringParam(body.nom, "nom");
  const adresse =
    body.adresse === undefined
      ? undefined
      : parseStringParam(body.adresse, "adresse");
  const pays =
    body.pays === undefined ? undefined : parseStringParam(body.pays, "pays");
  const region =
    body.region === undefined
      ? undefined
      : parseStringParam(body.region, "region");
  const ville =
    body.ville === undefined
      ? undefined
      : parseStringParam(body.ville, "ville");
  const logo =
    body.logo === undefined ? undefined : parseStringParam(body.logo, "logo");

  const entreprise = await prisma.entreprise.update({
    where: { id },
    data: {
      ...(nom && { nom }),
      ...(adresse && { adresse }),
      ...(pays && { pays }),
      ...(region && { region }),
      ...(ville && { ville }),
      ...(logo !== undefined && { logo }),
    },
  });

  res.status(200).json({ message: "Entreprise mise à jour", entreprise });
};

export const toggleEntrepriseStatut = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const id = parseIdParam(req.params["id"]);

  const entreprise = await prisma.entreprise.findUnique({ where: { id } });
  if (!entreprise) {
    throw new NotFoundError("Entreprise");
  }

  const updated = await prisma.entreprise.update({
    where: { id },
    data: { is_active: !entreprise.is_active },
  });

  res.status(200).json({
    message: updated.is_active ? "Entreprise activée" : "Entreprise bloquée",
    entreprise: updated,
  });
};
