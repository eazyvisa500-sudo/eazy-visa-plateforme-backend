import type { Request, Response } from "express";
import prisma from "../lib/prismaClient";
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from "../utils/AppError";
import {
  parseStringParam,
  parseBooleanFlag,
  parseNonNegativeInt,
} from "../utils/validation";

async function checkPolitiqueAccess(
  user: Express.Request["user"],
  targetMatricule: string,
): Promise<void> {
  if (!user) {
    throw new ForbiddenError();
  }
  if (user.role === "SUPERADMIN") {
    return;
  }
  if (user.role === "MANAGER") {
    const target = await prisma.user.findUnique({
      where: { matricule: targetMatricule },
    });
    if (!target || target.entrepriseId !== user.entrepriseId) {
      throw new ForbiddenError();
    }
    return;
  }
  if (user.matricule === targetMatricule) {
    return;
  }
  throw new ForbiddenError();
}

export const createPolitique = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const user = req.user;
  const body = req.body as Record<string, unknown>;
  const matricule = parseStringParam(body.matricule, "matricule");
  const y = parseBooleanFlag(body.y, "y");
  const w = parseBooleanFlag(body.w, "w");
  const j = parseBooleanFlag(body.j, "j");
  const f = parseBooleanFlag(body.f, "f");
  const hotel =
    body.hotel === undefined
      ? undefined
      : parseNonNegativeInt(body.hotel, "hotel");

  await checkPolitiqueAccess(user, matricule);

  const targetUser = await prisma.user.findUnique({ where: { matricule } });
  if (!targetUser) {
    throw new NotFoundError("Employé");
  }

  const existing = await prisma.politique.findUnique({ where: { matricule } });
  if (existing) {
    throw new ConflictError(
      "Une politique existe déjà pour cet employé",
      "POLITIQUE_EXISTS",
    );
  }

  const politique = await prisma.politique.create({
    data: {
      matricule,
      y: y ?? false,
      w: w ?? false,
      j: j ?? false,
      f: f ?? false,
      hotel: hotel ?? 0,
    },
  });

  res.status(201).json({ message: "Politique créée", politique });
};

export const getPolitiqueByMatricule = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const user = req.user;
  const matricule = parseStringParam(req.params["matricule"], "matricule");

  await checkPolitiqueAccess(user, matricule);

  const politique = await prisma.politique.findUnique({
    where: { matricule },
    include: {
      user: {
        select: {
          id: true,
          prenom: true,
          nom: true,
          matricule: true,
          role: true,
        },
      },
    },
  });

  if (!politique) {
    throw new NotFoundError("Politique");
  }

  res.status(200).json({ politique });
};

export const updatePolitique = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const user = req.user;
  const matricule = parseStringParam(req.params["matricule"], "matricule");
  const body = req.body as Record<string, unknown>;
  const y = parseBooleanFlag(body.y, "y");
  const w = parseBooleanFlag(body.w, "w");
  const j = parseBooleanFlag(body.j, "j");
  const f = parseBooleanFlag(body.f, "f");
  const hotel =
    body.hotel === undefined
      ? undefined
      : parseNonNegativeInt(body.hotel, "hotel");

  await checkPolitiqueAccess(user, matricule);

  const existing = await prisma.politique.findUnique({ where: { matricule } });
  if (!existing) {
    throw new NotFoundError("Politique");
  }

  const data: Record<string, boolean | number> = {};
  if (y !== undefined) data.y = y;
  if (w !== undefined) data.w = w;
  if (j !== undefined) data.j = j;
  if (f !== undefined) data.f = f;
  if (hotel !== undefined) data.hotel = hotel;

  const politique = await prisma.politique.update({
    where: { matricule },
    data,
  });

  res.status(200).json({ message: "Politique mise à jour", politique });
};

export const deletePolitique = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const user = req.user;
  const matricule = parseStringParam(req.params["matricule"], "matricule");

  await checkPolitiqueAccess(user, matricule);

  const existing = await prisma.politique.findUnique({ where: { matricule } });
  if (!existing) {
    throw new NotFoundError("Politique");
  }

  await prisma.politique.delete({ where: { matricule } });

  res.status(200).json({ message: "Politique supprimée" });
};

export const getAllPolitiques = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const user = req.user;

  if (user?.role !== "SUPERADMIN" && user?.role !== "MANAGER") {
    throw new ForbiddenError();
  }

  const politiques = await prisma.politique.findMany({
    where:
      user.role === "MANAGER" && user.entrepriseId !== undefined
        ? { user: { entrepriseId: user.entrepriseId } }
        : {},
    include: {
      user: {
        select: {
          id: true,
          prenom: true,
          nom: true,
          matricule: true,
          role: true,
          entrepriseId: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  res.status(200).json({ total: politiques.length, politiques });
};
