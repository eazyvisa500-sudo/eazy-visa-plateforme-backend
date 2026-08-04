import type { Request, Response } from "express";
import prisma from "../lib/prismaClient";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "../utils/AppError";
import { parseIdParam, parseStringParam } from "../utils/validation";
import { generateTicketPdf } from "../services/ticket-pdf.service";

export const getReservationsEntreprise = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const user = req.user;

  if (user?.role !== "SUPERADMIN" && user?.role !== "MANAGER") {
    throw new ForbiddenError();
  }

  const where =
    user.role === "MANAGER" && user.entrepriseId !== undefined
      ? {
          demandeVoyage: {
            user: {
              entrepriseId: user.entrepriseId,
            },
          },
        }
      : {};

  const billets = await prisma.reservationBillet.findMany({
    where,
    include: {
      demandeVoyage: {
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
          entreprise: { select: { id: true, nom: true, identifiant: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const hotels = await prisma.reservationHotel.findMany({
    where,
    include: {
      demandeVoyage: {
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
          entreprise: { select: { id: true, nom: true, identifiant: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  res.status(200).json({
    billets: { total: billets.length, data: billets },
    hotels: { total: hotels.length, data: hotels },
  });
};

export const getMesReservations = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const user = req.user;

  if (!user?.matricule) {
    throw new ForbiddenError();
  }

  const billets = await prisma.reservationBillet.findMany({
    where: {
      demandeVoyage: {
        matricule: user.matricule,
      },
    },
    include: {
      demandeVoyage: {
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
          entreprise: { select: { id: true, nom: true, identifiant: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const hotels = await prisma.reservationHotel.findMany({
    where: {
      demandeVoyage: {
        matricule: user.matricule,
      },
    },
    include: {
      demandeVoyage: {
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
          entreprise: { select: { id: true, nom: true, identifiant: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  res.status(200).json({
    billets: { total: billets.length, data: billets },
    hotels: { total: hotels.length, data: hotels },
  });
};

export const getReservationBilletById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const user = req.user;
  const id = parseIdParam(req.params["id"]);

  const reservation = await prisma.reservationBillet.findUnique({
    where: { id },
    include: {
      demandeVoyage: {
        include: {
          user: true,
          entreprise: true,
        },
      },
    },
  });

  if (!reservation) {
    throw new NotFoundError("Réservation de billet");
  }

  if (user?.role === "EMPLOYE" || user?.role === "CONSULTANT") {
    if (reservation.demandeVoyage.matricule !== user?.matricule) {
      throw new ForbiddenError();
    }
  } else if (user?.role === "MANAGER") {
    const target = await prisma.user.findUnique({
      where: { matricule: reservation.demandeVoyage.matricule },
    });
    if (!target || target.entrepriseId !== user.entrepriseId) {
      throw new ForbiddenError();
    }
  }

  res.status(200).json({ reservation });
};

export const downloadReservationTicket = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const user = req.user;
  const id = parseIdParam(req.params["id"]);
  const reservation = await prisma.reservationBillet.findUnique({
    where: { id },
    include: {
      demandeVoyage: {
        include: {
          user: true,
          entreprise: true,
        },
      },
    },
  });

  if (!reservation) {
    throw new NotFoundError("Réservation de billet");
  }

  if (user?.role === "EMPLOYE" || user?.role === "CONSULTANT") {
    if (reservation.demandeVoyage.matricule !== user.matricule) {
      throw new ForbiddenError();
    }
  } else if (user?.role === "MANAGER") {
    if (reservation.demandeVoyage.user.entrepriseId !== user.entrepriseId) {
      throw new ForbiddenError();
    }
  }

  const filename = `billet-${reservation.numeroReservation.replace(/[^a-zA-Z0-9_-]/g, "-")}.pdf`;
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  generateTicketPdf(reservation).pipe(res);
};

export const getReservationHotelById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const user = req.user;
  const id = parseIdParam(req.params["id"]);

  const reservation = await prisma.reservationHotel.findUnique({
    where: { id },
    include: {
      demandeVoyage: {
        include: {
          user: true,
          entreprise: true,
        },
      },
    },
  });

  if (!reservation) {
    throw new NotFoundError("Réservation d'hôtel");
  }

  if (user?.role === "EMPLOYE" || user?.role === "CONSULTANT") {
    if (reservation.demandeVoyage.matricule !== user?.matricule) {
      throw new ForbiddenError();
    }
  } else if (user?.role === "MANAGER") {
    const target = await prisma.user.findUnique({
      where: { matricule: reservation.demandeVoyage.matricule },
    });
    if (!target || target.entrepriseId !== user.entrepriseId) {
      throw new ForbiddenError();
    }
  }

  res.status(200).json({ reservation });
};

export const filterReservations = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const user = req.user;

  if (user?.role !== "SUPERADMIN" && user?.role !== "MANAGER") {
    throw new ForbiddenError();
  }

  const body = req.body as Record<string, unknown>;
  const date = parseStringParam(body.date, "date");
  const dateRetour =
    body.dateRetour === undefined
      ? undefined
      : parseStringParam(body.dateRetour, "dateRetour");
  const aeroportDepart = parseStringParam(
    body.aeroportDepart,
    "aeroportDepart",
  );
  const aeroportArrivee = parseStringParam(
    body.aeroportArrivee,
    "aeroportArrivee",
  );
  const classe = parseStringParam(body.classe, "classe");

  const whereBillets: any = {
    statut: "EN_ATTENTE",
  };

  // Si dateRetour n'est pas fourni, exclure les vols aller-retour
  if (!dateRetour) {
    whereBillets.allerRetour = false;
  }

  if (date) {
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      throw new BadRequestError("Format de date invalide");
    }
    const startOfDay = new Date(parsedDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(parsedDate.setHours(23, 59, 59, 999));
    whereBillets.dateVolDepart = {
      gte: startOfDay,
      lte: endOfDay,
    };
  }

  if (dateRetour) {
    const parsedDate = new Date(dateRetour);
    if (isNaN(parsedDate.getTime())) {
      throw new BadRequestError("Format de date de retour invalide");
    }
    const startOfDay = new Date(parsedDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(parsedDate.setHours(23, 59, 59, 999));
    whereBillets.dateVolRetourDepart = {
      gte: startOfDay,
      lte: endOfDay,
    };
  }

  if (aeroportDepart) {
    whereBillets.aeroportDepart = aeroportDepart;
  }

  if (aeroportArrivee) {
    whereBillets.aeroportArrivee = aeroportArrivee;
  }

  if (classe) {
    whereBillets.classe = classe;
  }

  const authFilter =
    user.role === "MANAGER" && user.entrepriseId !== undefined
      ? {
          demandeVoyage: {
            user: {
              entrepriseId: user.entrepriseId,
            },
          },
        }
      : {};

  const billets = await prisma.reservationBillet.findMany({
    where: { ...whereBillets, ...authFilter },
    include: {
      demandeVoyage: {
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
          entreprise: { select: { id: true, nom: true, identifiant: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  res.status(200).json({
    total: billets.length,
    data: billets,
    filters: {
      statut: "EN_ATTENTE",
      date,
      dateRetour,
      aeroportDepart,
      aeroportArrivee,
      classe,
    },
  });
};

export const checkBudgets = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const user = req.user;

  if (user?.role !== "SUPERADMIN" && user?.role !== "MANAGER") {
    throw new ForbiddenError();
  }

  const body = req.body as Record<string, unknown>;
  const rawMatricules = body.matricules;
  if (
    !Array.isArray(rawMatricules) ||
    rawMatricules.length === 0 ||
    !rawMatricules.every((m) => typeof m === "string")
  ) {
    throw new BadRequestError(
      "matricules est requis et doit être un tableau non vide de chaînes",
    );
  }
  const matricules = rawMatricules as string[];

  if (typeof body.somme !== "number" || body.somme <= 0) {
    throw new BadRequestError(
      "somme est requis et doit être un nombre positif",
    );
  }
  const somme = body.somme;

  const devise = parseStringParam(body.devise, "devise");

  // Taux de conversion vers FCFA
  const CONVERSION_RATES = {
    USD: 550,
    EUR: 650,
    XOF: 1,
  };

  const rate = CONVERSION_RATES[devise as keyof typeof CONVERSION_RATES] || 1;
  const sommeFCFA = somme * rate;
  const montantParPersonne = sommeFCFA / matricules.length;

  // Récupérer les budgets de tous les matricules
  const budgets = await prisma.budgetPersonnel.findMany({
    where: {
      matricule: { in: matricules },
    },
    include: {
      user: {
        select: {
          id: true,
          prenom: true,
          nom: true,
          matricule: true,
          email: true,
        },
      },
    },
  });

  const usersInsuffisants: any[] = [];

  for (const budget of budgets) {
    const montantRestant = budget.montant_restant.toNumber();
    if (montantRestant < montantParPersonne) {
      usersInsuffisants.push({
        user: budget.user,
        montantRestant,
        montantRequis: montantParPersonne,
        difference: montantParPersonne - montantRestant,
      });
    }
  }

  // Vérifier si tous les matricules ont un budget
  const matriculesTrouves = budgets.map((b) => b.matricule);
  const matriculesManquants = matricules.filter(
    (m) => !matriculesTrouves.includes(m),
  );

  if (matriculesManquants.length > 0) {
    throw new BadRequestError(
      `Les matricules suivants n'ont pas de budget: ${matriculesManquants.join(", ")}`,
    );
  }

  if (usersInsuffisants.length > 0) {
    res.status(200).json({
      ok: false,
      message: "Certains utilisateurs ont un budget insuffisant",
      montantParPersonne,
      usersInsuffisants,
    });
  } else {
    res.status(200).json({
      ok: true,
      message: "Tous les utilisateurs ont un budget suffisant",
      montantParPersonne,
    });
  }
};
