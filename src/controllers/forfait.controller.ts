import type { Request, Response } from "express";
import prisma from "../lib/prismaClient";
import {
  BadRequestError,
  NotFoundError,
  ConflictError,
} from "../utils/AppError";
import {
  parseIdParam,
  parsePositiveInt,
  parseNonNegativeInt,
} from "../utils/validation";

export const createForfait = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const body = req.body as Record<string, unknown>;
  const entrepriseId = parsePositiveInt(body.entrepriseId, "entrepriseId");
  const nombre_user_autorise = parsePositiveInt(
    body.nombre_user_autorise,
    "nombre_user_autorise",
  );

  // Vérifier que l'entreprise existe
  const entreprise = await prisma.entreprise.findUnique({
    where: { id: entrepriseId },
  });

  if (!entreprise) {
    throw new NotFoundError("Entreprise");
  }

  // Vérifier si un forfait existe déjà pour cette entreprise
  const existingForfait = await prisma.forfait.findUnique({
    where: { entrepriseId },
  });

  if (existingForfait) {
    throw new ConflictError(
      "Un forfait existe déjà pour cette entreprise",
      "FORFAIT_EXISTS",
    );
  }

  const forfait = await prisma.forfait.create({
    data: {
      entrepriseId,
      nombre_user_autorise,
      nombre_user_actuel: 0,
    },
    include: {
      entreprise: {
        select: {
          id: true,
          nom: true,
          identifiant: true,
        },
      },
    },
  });

  res.status(201).json({ message: "Forfait créé avec succès", forfait });
};

export const getAllForfaits = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const forfaits = await prisma.forfait.findMany({
    include: {
      entreprise: {
        select: {
          id: true,
          nom: true,
          identifiant: true,
        },
      },
    },
  });

  res.status(200).json({ total: forfaits.length, forfaits });
};

export const getForfaitById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const id = parseIdParam(req.params["id"]);

  const forfait = await prisma.forfait.findUnique({
    where: { id },
    include: {
      entreprise: {
        select: {
          id: true,
          nom: true,
          identifiant: true,
        },
      },
    },
  });

  if (!forfait) {
    throw new NotFoundError("Forfait");
  }

  res.status(200).json(forfait);
};

export const getForfaitByEntreprise = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const entrepriseId = parseIdParam(req.params["entrepriseId"]);

  const forfait = await prisma.forfait.findUnique({
    where: { entrepriseId },
    include: {
      entreprise: {
        select: {
          id: true,
          nom: true,
          identifiant: true,
        },
      },
    },
  });

  if (!forfait) {
    throw new NotFoundError("Forfait");
  }

  res.status(200).json(forfait);
};

export const updateForfait = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const id = parseIdParam(req.params["id"]);
  const body = req.body as Record<string, unknown>;
  const nombre_user_autorise =
    body.nombre_user_autorise === undefined
      ? undefined
      : parsePositiveInt(body.nombre_user_autorise, "nombre_user_autorise");
  const nombre_user_actuel =
    body.nombre_user_actuel === undefined
      ? undefined
      : parseNonNegativeInt(body.nombre_user_actuel, "nombre_user_actuel");

  const forfait = await prisma.forfait.findUnique({
    where: { id },
  });

  if (!forfait) {
    throw new NotFoundError("Forfait");
  }

  // Si nombre_user_actuel est fourni, vérifier qu'il ne dépasse pas nombre_user_autorise
  if (nombre_user_actuel !== undefined) {
    const maxUsers = nombre_user_autorise ?? forfait.nombre_user_autorise;
    if (nombre_user_actuel > maxUsers) {
      throw new BadRequestError(
        "Le nombre d'utilisateurs actuels ne peut pas dépasser le nombre autorisé",
        "USER_LIMIT_EXCEEDED",
      );
    }
  }

  const updatedForfait = await prisma.forfait.update({
    where: { id },
    data: {
      ...(nombre_user_autorise !== undefined && { nombre_user_autorise }),
      ...(nombre_user_actuel !== undefined && { nombre_user_actuel }),
    },
    include: {
      entreprise: {
        select: {
          id: true,
          nom: true,
          identifiant: true,
        },
      },
    },
  });

  res.status(200).json({
    message: "Forfait mis à jour avec succès",
    forfait: updatedForfait,
  });
};

export const increaseAuthorizedUsers = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const id = parseIdParam(req.params["id"]);
  const body = req.body as Record<string, unknown>;
  const amount =
    body.amount === undefined ? 1 : parsePositiveInt(body.amount, "amount");

  const forfait = await prisma.forfait.findUnique({
    where: { id },
  });

  if (!forfait) {
    throw new NotFoundError("Forfait");
  }

  const updatedForfait = await prisma.forfait.update({
    where: { id },
    data: {
      nombre_user_autorise: forfait.nombre_user_autorise + amount,
    },
    include: {
      entreprise: {
        select: {
          id: true,
          nom: true,
          identifiant: true,
        },
      },
    },
  });

  res.status(200).json({
    message: `Nombre d'utilisateurs autorisés augmenté de ${amount}`,
    forfait: updatedForfait,
  });
};

export const incrementUserCount = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const id = parseIdParam(req.params["id"]);

  const forfait = await prisma.forfait.findUnique({
    where: { id },
  });

  if (!forfait) {
    throw new NotFoundError("Forfait");
  }

  if (forfait.nombre_user_actuel >= forfait.nombre_user_autorise) {
    throw new BadRequestError(
      "Le nombre maximum d'utilisateurs autorisés est atteint",
      "USER_LIMIT_REACHED",
    );
  }

  const updatedForfait = await prisma.forfait.update({
    where: { id },
    data: {
      nombre_user_actuel: forfait.nombre_user_actuel + 1,
    },
    include: {
      entreprise: {
        select: {
          id: true,
          nom: true,
          identifiant: true,
        },
      },
    },
  });

  res.status(200).json({
    message: "Nombre d'utilisateurs incrémenté avec succès",
    forfait: updatedForfait,
  });
};

export const decrementUserCount = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const id = parseIdParam(req.params["id"]);

  const forfait = await prisma.forfait.findUnique({
    where: { id },
  });

  if (!forfait) {
    throw new NotFoundError("Forfait");
  }

  if (forfait.nombre_user_actuel <= 0) {
    throw new BadRequestError(
      "Le nombre d'utilisateurs actuels ne peut pas être négatif",
      "USER_COUNT_NEGATIVE",
    );
  }

  const updatedForfait = await prisma.forfait.update({
    where: { id },
    data: {
      nombre_user_actuel: forfait.nombre_user_actuel - 1,
    },
    include: {
      entreprise: {
        select: {
          id: true,
          nom: true,
          identifiant: true,
        },
      },
    },
  });

  res.status(200).json({
    message: "Nombre d'utilisateurs décrémenté avec succès",
    forfait: updatedForfait,
  });
};

export const deleteForfait = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const id = parseIdParam(req.params["id"]);

  const forfait = await prisma.forfait.findUnique({
    where: { id },
  });

  if (!forfait) {
    throw new NotFoundError("Forfait");
  }

  await prisma.forfait.delete({
    where: { id },
  });

  res.status(200).json({ message: "Forfait supprimé avec succès" });
};

export const getForfaitByCurrentUser = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const user = req.user;

  if (!user || !user.entrepriseId) {
    throw new BadRequestError(
      "Utilisateur non authentifié ou sans entreprise",
      "AUTH_REQUIRED",
    );
  }

  const forfait = await prisma.forfait.findUnique({
    where: { entrepriseId: user.entrepriseId },
    include: {
      entreprise: {
        select: {
          id: true,
          nom: true,
          identifiant: true,
        },
      },
    },
  });

  if (!forfait) {
    throw new NotFoundError("Forfait");
  }

  res.status(200).json(forfait);
};
