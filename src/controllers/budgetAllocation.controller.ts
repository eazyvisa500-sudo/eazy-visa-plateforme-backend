import type { Request, Response } from "express";
import type { PrismaPromise } from "@prisma/client";
import prisma from "../lib/prismaClient";
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from "../utils/AppError";
import { logBudgetAudit } from "../utils/auditBudget";
import {
  parseIdParam,
  parsePagination,
  parsePositiveInt,
  parsePositiveNumber,
  parseStringParam,
} from "../utils/validation";

async function checkBudgetOwnership(
  user: Express.Request["user"],
  identifiant_entreprise: string,
): Promise<void> {
  if (user?.role === "MANAGER") {
    if (!user.entrepriseId) {
      throw new ForbiddenError();
    }
    const entreprise = await prisma.entreprise.findUnique({
      where: { id: user.entrepriseId },
      select: { identifiant: true },
    });
    if (!entreprise || entreprise.identifiant !== identifiant_entreprise) {
      throw new ForbiddenError();
    }
  }
}

export const allouerBudgetDepartement = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const user = req.user;
  const reference = parseStringParam(req.params["reference"], "reference");
  const body = req.body as Record<string, unknown>;
  const departementId = parsePositiveInt(body.departementId, "departementId");
  const montant = parsePositiveNumber(body.montant_alloue, "montant_alloue");
  const montantStr = String(montant);

  const budgetAnnuel = await prisma.budgetAnnuel.findUnique({
    where: { reference },
  });
  if (!budgetAnnuel) {
    throw new NotFoundError("Budget annuel");
  }

  await checkBudgetOwnership(user, budgetAnnuel.identifiant_entreprise);

  if (!budgetAnnuel.est_active) {
    throw new ConflictError(
      "Le budget annuel doit être activé pour allouer",
      "BUDGET_NOT_ACTIVE",
    );
  }
  if (budgetAnnuel.est_cloture) {
    throw new ConflictError(
      "Impossible d'allouer sur un budget clôturé",
      "BUDGET_CLOTURE",
    );
  }

  const departement = await prisma.departement.findUnique({
    where: { id: departementId },
  });
  if (!departement) {
    throw new NotFoundError("Département");
  }

  const entreprise = await prisma.entreprise.findUnique({
    where: { identifiant: budgetAnnuel.identifiant_entreprise },
  });
  if (!entreprise || departement.entrepriseId !== entreprise.id) {
    throw new BadRequestError(
      "Ce département n'appartient pas à l'entreprise du budget",
      "DEPARTEMENT_INVALID",
    );
  }

  const existing = await prisma.budgetDepartement.findFirst({
    where: { reference, departementId: departementId },
  });
  if (existing) {
    throw new ConflictError(
      "Ce département a déjà un budget alloué pour cette référence",
      "BUDGET_DEPT_EXISTS",
    );
  }

  const restantAnnuel = Number(budgetAnnuel.montant_restant);
  if (montant > restantAnnuel) {
    throw new ConflictError(
      `Montant alloué (${montant}) supérieur au restant du budget annuel (${restantAnnuel})`,
      "MONTANT_EXCEDE",
    );
  }

  const [budgetDept] = await prisma.$transaction([
    prisma.budgetDepartement.create({
      data: {
        reference,
        departementId: departementId,
        montant_alloue: montantStr,
        montant_restant: montantStr,
      },
    }),
    prisma.budgetAnnuel.update({
      where: { reference },
      data: { montant_restant: String(restantAnnuel - montant) },
    }),
  ]);

  await logBudgetAudit(
    reference,
    budgetAnnuel.identifiant_entreprise,
    "ALLOUER_BUDGET_DEPARTEMENT",
    "DEPARTEMENT",
    `Budget département alloué : ${montant} pris du budget annuel ${reference}`,
    user,
    {
      montant,
      montantAvant: restantAnnuel,
      montantApres: restantAnnuel - montant,
      typeSource: "ANNUEL",
      targetId: departementId,
    },
  );

  res.status(201).json({
    message: "Budget département alloué avec succès",
    budgetDepartement: budgetDept,
  });
};

export const allouerBudgetPersonnel = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const user = req.user;
  const reference = parseStringParam(req.params["reference"], "reference");
  const body = req.body as Record<string, unknown>;
  const matricule = parseStringParam(body.matricule, "matricule");
  const montant = parsePositiveNumber(body.montant_alloue, "montant_alloue");
  const montantStr = String(montant);
  const departementId =
    body.departementId === undefined
      ? undefined
      : parsePositiveInt(body.departementId, "departementId");

  const budgetAnnuel = await prisma.budgetAnnuel.findUnique({
    where: { reference },
  });
  if (!budgetAnnuel) {
    throw new NotFoundError("Budget annuel");
  }

  await checkBudgetOwnership(user, budgetAnnuel.identifiant_entreprise);

  if (!budgetAnnuel.est_active) {
    throw new ConflictError(
      "Le budget annuel doit être activé pour allouer",
      "BUDGET_NOT_ACTIVE",
    );
  }
  if (budgetAnnuel.est_cloture) {
    throw new ConflictError(
      "Impossible d'allouer sur un budget clôturé",
      "BUDGET_CLOTURE",
    );
  }

  const targetUser = await prisma.user.findUnique({ where: { matricule } });
  if (!targetUser) {
    throw new NotFoundError("Utilisateur");
  }

  const entreprise = await prisma.entreprise.findUnique({
    where: { identifiant: budgetAnnuel.identifiant_entreprise },
  });
  if (!entreprise || targetUser.entrepriseId !== entreprise.id) {
    throw new BadRequestError(
      "Cet utilisateur n'appartient pas à l'entreprise du budget",
      "USER_INVALID",
    );
  }

  const existing = await prisma.budgetPersonnel.findFirst({
    where: { reference, matricule },
  });
  if (existing) {
    throw new ConflictError(
      "Cet utilisateur a déjà un budget alloué pour cette référence",
      "BUDGET_PERS_EXISTS",
    );
  }

  // Allocation via département
  if (departementId) {
    const budgetDept = await prisma.budgetDepartement.findFirst({
      where: { reference, departementId: departementId },
    });
    if (!budgetDept) {
      throw new NotFoundError("Budget département");
    }
    if (targetUser.departementId !== departementId) {
      throw new BadRequestError(
        "L'utilisateur n'appartient pas au département spécifié",
        "DEPARTEMENT_MISMATCH",
      );
    }

    const restantDept = Number(budgetDept.montant_restant);
    if (montant > restantDept) {
      throw new ConflictError(
        `Montant alloué (${montant}) supérieur au restant du budget département (${restantDept})`,
        "MONTANT_EXCEDE_DEPT",
      );
    }

    const [budgetPers] = await prisma.$transaction([
      prisma.budgetPersonnel.create({
        data: {
          reference,
          matricule,
          montant_alloue: montantStr,
          montant_restant: montantStr,
        },
      }),
      prisma.budgetDepartement.update({
        where: { id: budgetDept.id },
        data: {
          montant_restant: String(restantDept - montant),
          montant_utilise: String(Number(budgetDept.montant_utilise) + montant),
        },
      }),
    ]);

    await logBudgetAudit(
      reference,
      budgetAnnuel.identifiant_entreprise,
      "ALLOUER_BUDGET_PERSONNEL",
      "PERSONNEL",
      `Budget personnel alloué à ${matricule} via département ${departementId} : ${montant}`,
      user,
      {
        montant,
        montantAvant: restantDept,
        montantApres: restantDept - montant,
        typeSource: "DEPARTEMENT",
        targetMatricule: matricule,
      },
    );

    res.status(201).json({
      message: "Budget personnel alloué via département avec succès",
      budgetPersonnel: budgetPers,
    });
    return;
  }

  // Allocation directe depuis budget annuel
  const restantAnnuel = Number(budgetAnnuel.montant_restant);
  if (montant > restantAnnuel) {
    throw new ConflictError(
      `Montant alloué (${montant}) supérieur au restant du budget annuel (${restantAnnuel})`,
      "MONTANT_EXCEDE",
    );
  }

  const [budgetPers] = await prisma.$transaction([
    prisma.budgetPersonnel.create({
      data: {
        reference,
        matricule,
        montant_alloue: montantStr,
        montant_restant: montantStr,
      },
    }),
    prisma.budgetAnnuel.update({
      where: { reference },
      data: { montant_restant: String(restantAnnuel - montant) },
    }),
  ]);

  await logBudgetAudit(
    reference,
    budgetAnnuel.identifiant_entreprise,
    "ALLOUER_BUDGET_PERSONNEL",
    "PERSONNEL",
    `Budget personnel alloué à ${matricule} directement depuis le budget annuel : ${montant}`,
    user,
    {
      montant,
      montantAvant: restantAnnuel,
      montantApres: restantAnnuel - montant,
      typeSource: "ANNUEL",
      targetMatricule: matricule,
    },
  );

  res.status(201).json({
    message: "Budget personnel alloué avec succès",
    budgetPersonnel: budgetPers,
  });
};

export const getBudgetsDepartements = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const user = req.user;
  const reference = parseStringParam(req.params["reference"], "reference");

  const budgetAnnuel = await prisma.budgetAnnuel.findUnique({
    where: { reference },
  });
  if (!budgetAnnuel) {
    throw new NotFoundError("Budget annuel");
  }

  await checkBudgetOwnership(user, budgetAnnuel.identifiant_entreprise);

  const budgets = await prisma.budgetDepartement.findMany({
    where: { reference },
    include: { departement: { select: { id: true, nom: true } } },
    orderBy: { createdAt: "desc" },
  });

  res.status(200).json({ total: budgets.length, budgets });
};

export const getBudgetsPersonnels = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const user = req.user;
  const reference = parseStringParam(req.params["reference"], "reference");

  const budgetAnnuel = await prisma.budgetAnnuel.findUnique({
    where: { reference },
  });
  if (!budgetAnnuel) {
    throw new NotFoundError("Budget annuel");
  }

  await checkBudgetOwnership(user, budgetAnnuel.identifiant_entreprise);

  const budgets = await prisma.budgetPersonnel.findMany({
    where: { reference },
    include: {
      user: {
        select: {
          id: true,
          prenom: true,
          nom: true,
          matricule: true,
          departement: { select: { id: true, nom: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  res.status(200).json({ total: budgets.length, budgets });
};

export const updateBudgetDepartement = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const user = req.user;
  const id = parseIdParam(req.params["id"]);
  const body = req.body as Record<string, unknown>;
  const nouveauMontant = parsePositiveNumber(
    body.montant_alloue,
    "montant_alloue",
  );
  const montantStr = String(nouveauMontant);

  const existing = await prisma.budgetDepartement.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError("Budget département");
  }

  const budgetAnnuel = await prisma.budgetAnnuel.findUnique({
    where: { reference: existing.reference },
  });
  if (!budgetAnnuel) {
    throw new NotFoundError("Budget annuel");
  }

  await checkBudgetOwnership(user, budgetAnnuel.identifiant_entreprise);

  if (budgetAnnuel.est_cloture) {
    throw new ConflictError(
      "Impossible de modifier sur un budget clôturé",
      "BUDGET_CLOTURE",
    );
  }
  if (existing.bloquer) {
    throw new ConflictError(
      "Ce budget département est bloqué",
      "BUDGET_BLOQUE",
    );
  }

  const ancienMontant = Number(existing.montant_alloue);
  const difference = nouveauMontant - ancienMontant;

  if (difference > 0) {
    const restantAnnuel = Number(budgetAnnuel.montant_restant);
    if (difference > restantAnnuel) {
      throw new ConflictError(
        `Augmentation de ${difference} supérieure au restant du budget annuel (${restantAnnuel})`,
        "MONTANT_EXCEDE",
      );
    }
  }

  const nouveauRestant = Number(existing.montant_restant) + difference;
  if (nouveauRestant < 0) {
    throw new ConflictError(
      "Le nouveau montant alloué ne peut pas être inférieur au montant déjà utilisé",
      "MONTANT_INVALIDE",
    );
  }

  const [updated] = await prisma.$transaction([
    prisma.budgetDepartement.update({
      where: { id },
      data: {
        montant_alloue: montantStr,
        montant_restant: String(nouveauRestant),
      },
    }),
    prisma.budgetAnnuel.update({
      where: { reference: existing.reference },
      data: {
        montant_restant: String(
          Number(budgetAnnuel.montant_restant) - difference,
        ),
      },
    }),
  ]);

  await logBudgetAudit(
    existing.reference,
    budgetAnnuel.identifiant_entreprise,
    "MODIFIER_BUDGET_DEPARTEMENT",
    "DEPARTEMENT",
    `Budget département ${id} modifié : ${ancienMontant} → ${nouveauMontant}`,
    user,
    {
      montant: difference,
      montantAvant: ancienMontant,
      montantApres: nouveauMontant,
      targetId: existing.departementId,
    },
  );

  res.status(200).json({
    message: "Budget département mis à jour",
    budgetDepartement: updated,
  });
};

export const deleteBudgetDepartement = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const user = req.user;
  const id = parseIdParam(req.params["id"]);

  const existing = await prisma.budgetDepartement.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError("Budget département");
  }

  const budgetAnnuel = await prisma.budgetAnnuel.findUnique({
    where: { reference: existing.reference },
  });
  if (!budgetAnnuel) {
    throw new NotFoundError("Budget annuel");
  }

  await checkBudgetOwnership(user, budgetAnnuel.identifiant_entreprise);

  if (budgetAnnuel.est_cloture) {
    throw new ConflictError(
      "Impossible de supprimer sur un budget clôturé",
      "BUDGET_CLOTURE",
    );
  }
  if (existing.bloquer) {
    throw new ConflictError(
      "Ce budget département est bloqué",
      "BUDGET_BLOQUE",
    );
  }

  const personnels = await prisma.budgetPersonnel.count({
    where: { reference: existing.reference },
  });
  if (personnels > 0) {
    // We could allow deletion and return remaining, but let's be safe
    throw new ConflictError(
      "Impossible de supprimer : des budgets personnels sont liés à ce budget annuel",
      "BUDGET_HAS_PERSONNELS",
    );
  }

  const restantADegager = Number(existing.montant_restant);

  await prisma.$transaction([
    prisma.budgetDepartement.delete({ where: { id } }),
    prisma.budgetAnnuel.update({
      where: { reference: existing.reference },
      data: {
        montant_restant: String(
          Number(budgetAnnuel.montant_restant) + restantADegager,
        ),
      },
    }),
  ]);

  await logBudgetAudit(
    existing.reference,
    budgetAnnuel.identifiant_entreprise,
    "SUPPRIMER_BUDGET_DEPARTEMENT",
    "DEPARTEMENT",
    `Budget département ${id} supprimé, ${restantADegager} retourné au budget annuel`,
    user,
    {
      montant: restantADegager,
      targetId: existing.departementId,
    },
  );

  res.status(200).json({ message: "Budget département supprimé avec succès" });
};

export const updateBudgetPersonnel = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const user = req.user;
  const id = parseIdParam(req.params["id"]);
  const body = req.body as Record<string, unknown>;
  const nouveauMontant = parsePositiveNumber(
    body.montant_alloue,
    "montant_alloue",
  );
  const montantStr = String(nouveauMontant);

  const existing = await prisma.budgetPersonnel.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError("Budget personnel");
  }

  const budgetAnnuel = await prisma.budgetAnnuel.findUnique({
    where: { reference: existing.reference },
  });
  if (!budgetAnnuel) {
    throw new NotFoundError("Budget annuel");
  }

  await checkBudgetOwnership(user, budgetAnnuel.identifiant_entreprise);

  if (budgetAnnuel.est_cloture) {
    throw new ConflictError(
      "Impossible de modifier sur un budget clôturé",
      "BUDGET_CLOTURE",
    );
  }
  if (existing.bloquer) {
    throw new ConflictError("Ce budget personnel est bloqué", "BUDGET_BLOQUE");
  }

  const ancienMontant = Number(existing.montant_alloue);
  const difference = nouveauMontant - ancienMontant;

  // Determine source: direct annual budget or department budget
  const targetUser = await prisma.user.findUnique({
    where: { matricule: existing.matricule },
  });
  const deptBudget = targetUser
    ? await prisma.budgetDepartement.findFirst({
        where: {
          reference: existing.reference,
          departementId: targetUser.departementId,
        },
      })
    : null;

  if (deptBudget && difference > 0) {
    const restantDept = Number(deptBudget.montant_restant);
    if (difference > restantDept) {
      throw new ConflictError(
        `Augmentation de ${difference} supérieure au restant du budget département (${restantDept})`,
        "MONTANT_EXCEDE_DEPT",
      );
    }
  } else if (!deptBudget && difference > 0) {
    const restantAnnuel = Number(budgetAnnuel.montant_restant);
    if (difference > restantAnnuel) {
      throw new ConflictError(
        `Augmentation de ${difference} supérieure au restant du budget annuel (${restantAnnuel})`,
        "MONTANT_EXCEDE",
      );
    }
  }

  const nouveauRestant = Number(existing.montant_restant) + difference;
  if (nouveauRestant < 0) {
    throw new ConflictError(
      "Le nouveau montant alloué ne peut pas être inférieur au montant déjà utilisé",
      "MONTANT_INVALIDE",
    );
  }

  const operations: any[] = [
    prisma.budgetPersonnel.update({
      where: { id },
      data: {
        montant_alloue: montantStr,
        montant_restant: String(nouveauRestant),
      },
    }),
  ];

  if (deptBudget) {
    operations.push(
      prisma.budgetDepartement.update({
        where: { id: deptBudget.id },
        data: {
          montant_restant: String(
            Number(deptBudget.montant_restant) - difference,
          ),
          montant_utilise: String(
            Number(deptBudget.montant_utilise) + difference,
          ),
        },
      }),
    );
  } else {
    operations.push(
      prisma.budgetAnnuel.update({
        where: { reference: existing.reference },
        data: {
          montant_restant: String(
            Number(budgetAnnuel.montant_restant) - difference,
          ),
        },
      }),
    );
  }

  const [updated] = await prisma.$transaction(operations);

  await logBudgetAudit(
    existing.reference,
    budgetAnnuel.identifiant_entreprise,
    "MODIFIER_BUDGET_PERSONNEL",
    "PERSONNEL",
    `Budget personnel ${id} modifié : ${existing.montant_alloue} → ${nouveauMontant}`,
    user,
    {
      typeSource: deptBudget ? "DEPARTEMENT" : "ANNUEL",
      montant: difference,
      montantAvant: Number(existing.montant_alloue),
      montantApres: nouveauMontant,
      targetMatricule: existing.matricule,
    },
  );

  res
    .status(200)
    .json({ message: "Budget personnel mis à jour", budgetPersonnel: updated });
};

export const deleteBudgetPersonnel = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const user = req.user;
  const id = parseIdParam(req.params["id"]);

  const existing = await prisma.budgetPersonnel.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError("Budget personnel");
  }

  const budgetAnnuel = await prisma.budgetAnnuel.findUnique({
    where: { reference: existing.reference },
  });
  if (!budgetAnnuel) {
    throw new NotFoundError("Budget annuel");
  }

  await checkBudgetOwnership(user, budgetAnnuel.identifiant_entreprise);

  if (budgetAnnuel.est_cloture) {
    throw new ConflictError(
      "Impossible de supprimer sur un budget clôturé",
      "BUDGET_CLOTURE",
    );
  }
  if (existing.bloquer) {
    throw new ConflictError("Ce budget personnel est bloqué", "BUDGET_BLOQUE");
  }

  const restantADegager = Number(existing.montant_restant);

  const targetUser = await prisma.user.findUnique({
    where: { matricule: existing.matricule },
  });
  const deptBudget = targetUser
    ? await prisma.budgetDepartement.findFirst({
        where: {
          reference: existing.reference,
          departementId: targetUser.departementId,
        },
      })
    : null;

  const operations: PrismaPromise<any>[] = [
    prisma.budgetPersonnel.delete({ where: { id } }),
  ];

  if (deptBudget) {
    operations.push(
      prisma.budgetDepartement.update({
        where: { id: deptBudget.id },
        data: {
          montant_restant: String(
            Number(deptBudget.montant_restant) + restantADegager,
          ),
          montant_utilise: String(
            Number(deptBudget.montant_utilise) -
              Number(existing.montant_alloue),
          ),
        },
      }),
    );
  } else {
    operations.push(
      prisma.budgetAnnuel.update({
        where: { reference: existing.reference },
        data: {
          montant_restant: String(
            Number(budgetAnnuel.montant_restant) + restantADegager,
          ),
        },
      }),
    );
  }

  await prisma.$transaction(operations);

  await logBudgetAudit(
    existing.reference,
    budgetAnnuel.identifiant_entreprise,
    "SUPPRIMER_BUDGET_PERSONNEL",
    "PERSONNEL",
    `Budget personnel ${id} supprimé, ${restantADegager} retourné au ${deptBudget ? "département" : "budget annuel"}`,
    user,
    {
      typeSource: deptBudget ? "DEPARTEMENT" : "ANNUEL",
      montant: restantADegager,
      targetMatricule: existing.matricule,
    },
  );

  res.status(200).json({ message: "Budget personnel supprimé avec succès" });
};

// ─── Augmenter / Diminuer budget annuel ───

export const augmenterBudgetAnnuel = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const user = req.user;
  const reference = parseStringParam(req.params["reference"], "reference");
  const body = req.body as Record<string, unknown>;
  const val = parsePositiveNumber(body.montant, "montant");

  const budgetAnnuel = await prisma.budgetAnnuel.findUnique({
    where: { reference },
  });
  if (!budgetAnnuel) {
    throw new NotFoundError("Budget annuel");
  }

  await checkBudgetOwnership(user, budgetAnnuel.identifiant_entreprise);

  if (budgetAnnuel.est_cloture) {
    throw new ConflictError(
      "Impossible de modifier un budget clôturé",
      "BUDGET_CLOTURE",
    );
  }

  const nouveauBudget = Number(budgetAnnuel.budget) + val;
  const nouveauRestant = Number(budgetAnnuel.montant_restant) + val;

  const updated = await prisma.budgetAnnuel.update({
    where: { reference },
    data: {
      budget: String(nouveauBudget),
      montant_restant: String(nouveauRestant),
    },
  });

  await logBudgetAudit(
    reference,
    budgetAnnuel.identifiant_entreprise,
    "AUGMENTER_BUDGET_ANNUEL",
    "ANNUEL",
    `Budget annuel ${reference} augmenté de ${val}`,
    user,
    {
      montant: val,
      montantAvant: Number(budgetAnnuel.budget),
      montantApres: nouveauBudget,
    },
  );

  res
    .status(200)
    .json({ message: "Budget annuel augmenté", budgetAnnuel: updated });
};

export const diminuerBudgetAnnuel = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const user = req.user;
  const reference = parseStringParam(req.params["reference"], "reference");
  const body = req.body as Record<string, unknown>;
  const val = parsePositiveNumber(body.montant, "montant");

  const budgetAnnuel = await prisma.budgetAnnuel.findUnique({
    where: { reference },
  });
  if (!budgetAnnuel) {
    throw new NotFoundError("Budget annuel");
  }

  await checkBudgetOwnership(user, budgetAnnuel.identifiant_entreprise);

  if (budgetAnnuel.est_cloture) {
    throw new ConflictError(
      "Impossible de modifier un budget clôturé",
      "BUDGET_CLOTURE",
    );
  }

  const restant = Number(budgetAnnuel.montant_restant);
  if (val > restant) {
    throw new ConflictError(
      `Diminution de ${val} supérieure au restant (${restant})`,
      "MONTANT_EXCEDE",
    );
  }

  const nouveauBudget = Number(budgetAnnuel.budget) - val;
  const nouveauRestant = restant - val;

  const updated = await prisma.budgetAnnuel.update({
    where: { reference },
    data: {
      budget: String(nouveauBudget),
      montant_restant: String(nouveauRestant),
    },
  });

  await logBudgetAudit(
    reference,
    budgetAnnuel.identifiant_entreprise,
    "DIMINUER_BUDGET_ANNUEL",
    "ANNUEL",
    `Budget annuel ${reference} diminué de ${val}`,
    user,
    {
      montant: val,
      montantAvant: Number(budgetAnnuel.budget),
      montantApres: nouveauBudget,
    },
  );

  res
    .status(200)
    .json({ message: "Budget annuel diminué", budgetAnnuel: updated });
};

// ─── Augmenter / Diminuer budget département ───

export const augmenterBudgetDepartement = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const user = req.user;
  const id = parseIdParam(req.params["id"]);
  const body = req.body as Record<string, unknown>;
  const val = parsePositiveNumber(body.montant, "montant");

  const existing = await prisma.budgetDepartement.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError("Budget département");
  }

  const budgetAnnuel = await prisma.budgetAnnuel.findUnique({
    where: { reference: existing.reference },
  });
  if (!budgetAnnuel) {
    throw new NotFoundError("Budget annuel");
  }

  await checkBudgetOwnership(user, budgetAnnuel.identifiant_entreprise);

  if (budgetAnnuel.est_cloture) {
    throw new ConflictError(
      "Impossible de modifier un budget clôturé",
      "BUDGET_CLOTURE",
    );
  }
  if (existing.bloquer) {
    throw new ConflictError(
      "Ce budget département est bloqué",
      "BUDGET_BLOQUE",
    );
  }

  const restantAnnuel = Number(budgetAnnuel.montant_restant);
  if (val > restantAnnuel) {
    throw new ConflictError(
      `Augmentation de ${val} supérieure au restant du budget annuel (${restantAnnuel})`,
      "MONTANT_EXCEDE",
    );
  }

  const nouveauAlloue = Number(existing.montant_alloue) + val;
  const nouveauRestant = Number(existing.montant_restant) + val;

  const [updated] = await prisma.$transaction([
    prisma.budgetDepartement.update({
      where: { id },
      data: {
        montant_alloue: String(nouveauAlloue),
        montant_restant: String(nouveauRestant),
      },
    }),
    prisma.budgetAnnuel.update({
      where: { reference: existing.reference },
      data: { montant_restant: String(restantAnnuel - val) },
    }),
  ]);

  await logBudgetAudit(
    existing.reference,
    budgetAnnuel.identifiant_entreprise,
    "AUGMENTER_BUDGET_DEPARTEMENT",
    "DEPARTEMENT",
    `Budget département ${id} augmenté de ${val} depuis le budget annuel`,
    user,
    {
      typeSource: "ANNUEL",
      montant: val,
      montantAvant: Number(existing.montant_alloue),
      montantApres: nouveauAlloue,
      targetId: existing.departementId,
    },
  );

  res.status(200).json({
    message: "Budget département augmenté",
    budgetDepartement: updated,
  });
};

export const diminuerBudgetDepartement = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const user = req.user;
  const id = parseIdParam(req.params["id"]);
  const body = req.body as Record<string, unknown>;
  const val = parsePositiveNumber(body.montant, "montant");

  const existing = await prisma.budgetDepartement.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError("Budget département");
  }

  const budgetAnnuel = await prisma.budgetAnnuel.findUnique({
    where: { reference: existing.reference },
  });
  if (!budgetAnnuel) {
    throw new NotFoundError("Budget annuel");
  }

  await checkBudgetOwnership(user, budgetAnnuel.identifiant_entreprise);

  if (budgetAnnuel.est_cloture) {
    throw new ConflictError(
      "Impossible de modifier un budget clôturé",
      "BUDGET_CLOTURE",
    );
  }
  if (existing.bloquer) {
    throw new ConflictError(
      "Ce budget département est bloqué",
      "BUDGET_BLOQUE",
    );
  }

  if (val > Number(existing.montant_restant)) {
    throw new ConflictError(
      "Le montant à diminuer ne peut pas être supérieur au restant du budget département",
      "MONTANT_EXCEDE",
    );
  }

  const nouveauRestantDept = Number(existing.montant_restant) - val;
  const nouveauAlloue = Number(existing.montant_alloue) - val;

  const [updated] = await prisma.$transaction([
    prisma.budgetDepartement.update({
      where: { id },
      data: {
        montant_alloue: String(nouveauAlloue),
        montant_restant: String(nouveauRestantDept),
      },
    }),
    prisma.budgetAnnuel.update({
      where: { reference: existing.reference },
      data: {
        montant_restant: String(Number(budgetAnnuel.montant_restant) + val),
      },
    }),
  ]);

  await logBudgetAudit(
    existing.reference,
    budgetAnnuel.identifiant_entreprise,
    "DIMINUER_BUDGET_DEPARTEMENT",
    "ANNUEL",
    `Budget département ${id} diminué de ${val}, retourné au budget annuel`,
    user,
    {
      typeSource: "DEPARTEMENT",
      montant: val,
      montantAvant: Number(existing.montant_alloue),
      montantApres: nouveauAlloue,
      targetId: existing.departementId,
    },
  );

  res.status(200).json({
    message: "Budget département diminué",
    budgetDepartement: updated,
  });
};

// ─── Augmenter / Diminuer budget personnel ───

export const augmenterBudgetPersonnel = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const user = req.user;
  const id = parseIdParam(req.params["id"]);
  const body = req.body as Record<string, unknown>;
  const val = parsePositiveNumber(body.montant, "montant");

  const existing = await prisma.budgetPersonnel.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError("Budget personnel");
  }

  const budgetAnnuel = await prisma.budgetAnnuel.findUnique({
    where: { reference: existing.reference },
  });
  if (!budgetAnnuel) {
    throw new NotFoundError("Budget annuel");
  }

  await checkBudgetOwnership(user, budgetAnnuel.identifiant_entreprise);

  if (budgetAnnuel.est_cloture) {
    throw new ConflictError(
      "Impossible de modifier un budget clôturé",
      "BUDGET_CLOTURE",
    );
  }
  if (existing.bloquer) {
    throw new ConflictError("Ce budget personnel est bloqué", "BUDGET_BLOQUE");
  }

  const targetUser = await prisma.user.findUnique({
    where: { matricule: existing.matricule },
  });
  const deptBudget = targetUser
    ? await prisma.budgetDepartement.findFirst({
        where: {
          reference: existing.reference,
          departementId: targetUser.departementId,
        },
      })
    : null;

  // Determine source for augmentation
  if (deptBudget) {
    const restantDept = Number(deptBudget.montant_restant);
    if (val > restantDept) {
      throw new ConflictError(
        `Augmentation de ${val} supérieure au restant du budget département (${restantDept})`,
        "MONTANT_EXCEDE_DEPT",
      );
    }

    const nouveauAlloue = Number(existing.montant_alloue) + val;
    const nouveauRestant = Number(existing.montant_restant) + val;

    const [updated] = await prisma.$transaction([
      prisma.budgetPersonnel.update({
        where: { id },
        data: {
          montant_alloue: String(nouveauAlloue),
          montant_restant: String(nouveauRestant),
        },
      }),
      prisma.budgetDepartement.update({
        where: { id: deptBudget.id },
        data: {
          montant_restant: String(restantDept - val),
          montant_utilise: String(Number(deptBudget.montant_utilise) + val),
        },
      }),
    ]);

    await logBudgetAudit(
      existing.reference,
      budgetAnnuel.identifiant_entreprise,
      "AUGMENTER_BUDGET_PERSONNEL",
      "PERSONNEL",
      `Budget personnel ${id} augmenté de ${val} via département`,
      user,
      {
        typeSource: "DEPARTEMENT",
        montant: val,
        montantAvant: Number(existing.montant_alloue),
        montantApres: nouveauAlloue,
        targetMatricule: existing.matricule,
      },
    );

    res
      .status(200)
      .json({ message: "Budget personnel augmenté", budgetPersonnel: updated });
    return;
  }

  // Direct from annual budget
  const restantAnnuel = Number(budgetAnnuel.montant_restant);
  if (val > restantAnnuel) {
    throw new ConflictError(
      `Augmentation de ${val} supérieure au restant du budget annuel (${restantAnnuel})`,
      "MONTANT_EXCEDE",
    );
  }

  const nouveauAlloue = Number(existing.montant_alloue) + val;
  const nouveauRestant = Number(existing.montant_restant) + val;

  const [updated] = await prisma.$transaction([
    prisma.budgetPersonnel.update({
      where: { id },
      data: {
        montant_alloue: String(nouveauAlloue),
        montant_restant: String(nouveauRestant),
      },
    }),
    prisma.budgetAnnuel.update({
      where: { reference: existing.reference },
      data: { montant_restant: String(restantAnnuel - val) },
    }),
  ]);

  await logBudgetAudit(
    existing.reference,
    budgetAnnuel.identifiant_entreprise,
    "AUGMENTER_BUDGET_PERSONNEL",
    "PERSONNEL",
    `Budget personnel ${id} augmenté de ${val} depuis le budget annuel`,
    user,
    {
      typeSource: "ANNUEL",
      montant: val,
      montantAvant: Number(existing.montant_alloue),
      montantApres: nouveauAlloue,
      targetMatricule: existing.matricule,
    },
  );

  res
    .status(200)
    .json({ message: "Budget personnel augmenté", budgetPersonnel: updated });
};

export const diminuerBudgetPersonnel = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const user = req.user;
  const id = parseIdParam(req.params["id"]);
  const body = req.body as Record<string, unknown>;
  const val = parsePositiveNumber(body.montant, "montant");

  const existing = await prisma.budgetPersonnel.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError("Budget personnel");
  }

  const budgetAnnuel = await prisma.budgetAnnuel.findUnique({
    where: { reference: existing.reference },
  });
  if (!budgetAnnuel) {
    throw new NotFoundError("Budget annuel");
  }

  await checkBudgetOwnership(user, budgetAnnuel.identifiant_entreprise);

  if (budgetAnnuel.est_cloture) {
    throw new ConflictError(
      "Impossible de modifier un budget clôturé",
      "BUDGET_CLOTURE",
    );
  }
  if (existing.bloquer) {
    throw new ConflictError("Ce budget personnel est bloqué", "BUDGET_BLOQUE");
  }

  if (val > Number(existing.montant_restant)) {
    throw new ConflictError(
      "Le montant à diminuer ne peut pas être supérieur au restant du budget personnel",
      "MONTANT_EXCEDE",
    );
  }

  const targetUser = await prisma.user.findUnique({
    where: { matricule: existing.matricule },
  });
  const deptBudget = targetUser
    ? await prisma.budgetDepartement.findFirst({
        where: {
          reference: existing.reference,
          departementId: targetUser.departementId,
        },
      })
    : null;

  const nouveauAlloue = Number(existing.montant_alloue) - val;
  const nouveauRestant = Number(existing.montant_restant) - val;

  const operations: PrismaPromise<any>[] = [
    prisma.budgetPersonnel.update({
      where: { id },
      data: {
        montant_alloue: String(nouveauAlloue),
        montant_restant: String(nouveauRestant),
      },
    }),
  ];

  if (deptBudget) {
    operations.push(
      prisma.budgetDepartement.update({
        where: { id: deptBudget.id },
        data: {
          montant_restant: String(Number(deptBudget.montant_restant) + val),
          montant_utilise: String(Number(deptBudget.montant_utilise) - val),
        },
      }),
    );
  } else {
    operations.push(
      prisma.budgetAnnuel.update({
        where: { reference: existing.reference },
        data: {
          montant_restant: String(Number(budgetAnnuel.montant_restant) + val),
        },
      }),
    );
  }

  const [updated] = await prisma.$transaction(operations);

  await logBudgetAudit(
    existing.reference,
    budgetAnnuel.identifiant_entreprise,
    "DIMINUER_BUDGET_PERSONNEL",
    deptBudget ? "DEPARTEMENT" : "ANNUEL",
    `Budget personnel ${id} diminué de ${val}, retourné au ${deptBudget ? "département" : "budget annuel"}`,
    user,
    {
      typeSource: "PERSONNEL",
      montant: val,
      montantAvant: Number(existing.montant_alloue),
      montantApres: nouveauAlloue,
      targetMatricule: existing.matricule,
    },
  );

  res
    .status(200)
    .json({ message: "Budget personnel diminué", budgetPersonnel: updated });
};

export const getAuditBudget = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const user = req.user;
  const query = req.query as Record<string, unknown>;
  const reference =
    query.reference === undefined
      ? undefined
      : parseStringParam(query.reference, "reference");
  const action =
    query.action === undefined
      ? undefined
      : parseStringParam(query.action, "action");
  const role_effectue_par =
    query.role_effectue_par === undefined
      ? undefined
      : parseStringParam(query.role_effectue_par, "role_effectue_par");
  const page =
    query.page === undefined ? "1" : parseStringParam(query.page, "page");
  const limit =
    query.limit === undefined ? "50" : parseStringParam(query.limit, "limit");

  const { page: pageNum, limit: limitNum, skip } = parsePagination(page, limit);

  const where: Record<string, unknown> = {};

  if (reference) {
    where.reference = reference;
  }

  if (action) {
    where.action = action;
  }

  if (role_effectue_par) {
    where.role_effectue_par = role_effectue_par;
  }

  if (user?.role === "MANAGER" && user.entrepriseId) {
    where.entrepriseId = user.entrepriseId;
  }

  const [audits, total] = await Promise.all([
    prisma.auditBudget.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limitNum,
    }),
    prisma.auditBudget.count({ where }),
  ]);

  res.status(200).json({
    total,
    page: pageNum,
    limit: limitNum,
    audits,
  });
};

export const getAuditsByEmploye = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const user = req.user;
  const matricule = parseStringParam(req.params["matricule"], "matricule");
  const query = req.query as Record<string, unknown>;
  const page =
    query.page === undefined ? "1" : parseStringParam(query.page, "page");
  const limit =
    query.limit === undefined ? "50" : parseStringParam(query.limit, "limit");

  const employe = await prisma.user.findUnique({ where: { matricule } });
  if (!employe) {
    throw new NotFoundError("Employé");
  }

  if (user?.role === "MANAGER" && employe.entrepriseId !== user.entrepriseId) {
    throw new ForbiddenError();
  }

  if (user?.role === "EMPLOYE" || user?.role === "CONSULTANT") {
    if (!user.id) {
      throw new ForbiddenError();
    }
    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
    });
    if (!currentUser || currentUser.matricule !== matricule) {
      throw new ForbiddenError();
    }
  }

  const { page: pageNum, limit: limitNum, skip } = parsePagination(page, limit);

  const where: Record<string, unknown> = {
    OR: [{ target_matricule: matricule }, { effectue_par_id: employe.id }],
  };

  if (user?.role === "MANAGER" && user.entrepriseId) {
    where.entrepriseId = user.entrepriseId;
  }

  const [audits, total] = await Promise.all([
    prisma.auditBudget.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limitNum,
    }),
    prisma.auditBudget.count({ where }),
  ]);

  res.status(200).json({
    total,
    page: pageNum,
    limit: limitNum,
    employe: {
      id: employe.id,
      prenom: employe.prenom,
      nom: employe.nom,
      matricule: employe.matricule,
      role: employe.role,
    },
    audits,
  });
};

export const getMesBudgetsPersonnels = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const user = req.user;
  if (!user?.id) {
    throw new ForbiddenError();
  }

  const currentUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!currentUser) {
    throw new NotFoundError("Utilisateur");
  }

  const budgets = await prisma.budgetPersonnel.findMany({
    where: { matricule: currentUser.matricule },
    include: {
      budgetAnnuel: {
        select: {
          reference: true,
          annee: true,
          date_debut: true,
          date_fin: true,
          budget: true,
          identifiant_entreprise: true,
          est_active: true,
          est_cloture: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  res.status(200).json({
    total: budgets.length,
    employe: {
      id: currentUser.id,
      prenom: currentUser.prenom,
      nom: currentUser.nom,
      matricule: currentUser.matricule,
      role: currentUser.role,
    },
    budgets,
  });
};

export const getBudgetsPersonnelsByEmploye = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const user = req.user;
  const matricule = parseStringParam(req.params["matricule"], "matricule");

  const employe = await prisma.user.findUnique({ where: { matricule } });
  if (!employe) {
    throw new NotFoundError("Employé");
  }

  if (user?.role === "MANAGER" && employe.entrepriseId !== user.entrepriseId) {
    throw new ForbiddenError();
  }

  if (user?.role === "EMPLOYE" || user?.role === "CONSULTANT") {
    if (!user.id) {
      throw new ForbiddenError();
    }
    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
    });
    if (!currentUser || currentUser.matricule !== matricule) {
      throw new ForbiddenError();
    }
  }

  const budgets = await prisma.budgetPersonnel.findMany({
    where: { matricule },
    include: {
      budgetAnnuel: {
        select: {
          reference: true,
          annee: true,
          date_debut: true,
          date_fin: true,
          budget: true,
          identifiant_entreprise: true,
          est_active: true,
          est_cloture: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  res.status(200).json({
    total: budgets.length,
    employe: {
      id: employe.id,
      prenom: employe.prenom,
      nom: employe.nom,
      matricule: employe.matricule,
      role: employe.role,
    },
    budgets,
  });
};

export const bloquerBudgetDepartement = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const user = req.user;
  const id = parseIdParam(req.params["id"]);

  const existing = await prisma.budgetDepartement.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError("Budget département");
  }

  const budgetAnnuel = await prisma.budgetAnnuel.findUnique({
    where: { reference: existing.reference },
  });
  if (!budgetAnnuel) {
    throw new NotFoundError("Budget annuel");
  }

  await checkBudgetOwnership(user, budgetAnnuel.identifiant_entreprise);

  if (existing.bloquer) {
    throw new ConflictError(
      "Ce budget département est déjà bloqué",
      "BUDGET_DEJA_BLOQUE",
    );
  }

  const updated = await prisma.budgetDepartement.update({
    where: { id },
    data: { bloquer: true },
  });

  await logBudgetAudit(
    existing.reference,
    budgetAnnuel.identifiant_entreprise,
    "BLOQUER_BUDGET_DEPARTEMENT",
    "DEPARTEMENT",
    `Budget département ${id} bloqué`,
    user,
    { targetId: existing.departementId },
  );

  res
    .status(200)
    .json({ message: "Budget département bloqué", budgetDepartement: updated });
};

export const debloquerBudgetDepartement = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const user = req.user;
  const id = parseIdParam(req.params["id"]);

  const existing = await prisma.budgetDepartement.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError("Budget département");
  }

  const budgetAnnuel = await prisma.budgetAnnuel.findUnique({
    where: { reference: existing.reference },
  });
  if (!budgetAnnuel) {
    throw new NotFoundError("Budget annuel");
  }

  await checkBudgetOwnership(user, budgetAnnuel.identifiant_entreprise);

  if (!existing.bloquer) {
    throw new ConflictError(
      "Ce budget département n'est pas bloqué",
      "BUDGET_PAS_BLOQUE",
    );
  }

  const updated = await prisma.budgetDepartement.update({
    where: { id },
    data: { bloquer: false },
  });

  await logBudgetAudit(
    existing.reference,
    budgetAnnuel.identifiant_entreprise,
    "DEBLOQUER_BUDGET_DEPARTEMENT",
    "DEPARTEMENT",
    `Budget département ${id} débloqué`,
    user,
    { targetId: existing.departementId },
  );

  res.status(200).json({
    message: "Budget département débloqué",
    budgetDepartement: updated,
  });
};

export const bloquerBudgetPersonnel = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const user = req.user;
  const id = parseIdParam(req.params["id"]);

  const existing = await prisma.budgetPersonnel.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError("Budget personnel");
  }

  const budgetAnnuel = await prisma.budgetAnnuel.findUnique({
    where: { reference: existing.reference },
  });
  if (!budgetAnnuel) {
    throw new NotFoundError("Budget annuel");
  }

  await checkBudgetOwnership(user, budgetAnnuel.identifiant_entreprise);

  if (existing.bloquer) {
    throw new ConflictError(
      "Ce budget personnel est déjà bloqué",
      "BUDGET_DEJA_BLOQUE",
    );
  }

  const updated = await prisma.budgetPersonnel.update({
    where: { id },
    data: { bloquer: true },
  });

  await logBudgetAudit(
    existing.reference,
    budgetAnnuel.identifiant_entreprise,
    "BLOQUER_BUDGET_PERSONNEL",
    "PERSONNEL",
    `Budget personnel ${id} bloqué`,
    user,
    { targetMatricule: existing.matricule },
  );

  res
    .status(200)
    .json({ message: "Budget personnel bloqué", budgetPersonnel: updated });
};

export const debloquerBudgetPersonnel = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const user = req.user;
  const id = parseIdParam(req.params["id"]);

  const existing = await prisma.budgetPersonnel.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError("Budget personnel");
  }

  const budgetAnnuel = await prisma.budgetAnnuel.findUnique({
    where: { reference: existing.reference },
  });
  if (!budgetAnnuel) {
    throw new NotFoundError("Budget annuel");
  }

  await checkBudgetOwnership(user, budgetAnnuel.identifiant_entreprise);

  if (!existing.bloquer) {
    throw new ConflictError(
      "Ce budget personnel n'est pas bloqué",
      "BUDGET_PAS_BLOQUE",
    );
  }

  const updated = await prisma.budgetPersonnel.update({
    where: { id },
    data: { bloquer: false },
  });

  await logBudgetAudit(
    existing.reference,
    budgetAnnuel.identifiant_entreprise,
    "DEBLOQUER_BUDGET_PERSONNEL",
    "PERSONNEL",
    `Budget personnel ${id} débloqué`,
    user,
    { targetMatricule: existing.matricule },
  );

  res
    .status(200)
    .json({ message: "Budget personnel débloqué", budgetPersonnel: updated });
};
