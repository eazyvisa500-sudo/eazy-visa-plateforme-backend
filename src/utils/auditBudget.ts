import prisma from "../lib/prismaClient";

export interface AuditBudgetParams {
  reference: string;
  entrepriseId: number;
  action: string;
  type_source?: string | undefined;
  type_destination?: string | undefined;
  montant?: number | undefined;
  montant_avant?: number | undefined;
  montant_apres?: number | undefined;
  description?: string | undefined;
  effectue_par: string;
  effectue_par_id?: number | undefined;
  role_effectue_par?: string | undefined;
  target_id?: number | undefined;
  target_matricule?: string | undefined;
}

export async function logAuditBudget(params: AuditBudgetParams): Promise<void> {
  try {
    const audit = await prisma.auditBudget.create({
      data: {
        reference: params.reference,
        entrepriseId: params.entrepriseId,
        action: params.action,
        type_source: params.type_source ?? null,
        type_destination: params.type_destination ?? null,
        montant: params.montant !== undefined ? String(params.montant) : null,
        montant_avant:
          params.montant_avant !== undefined
            ? String(params.montant_avant)
            : null,
        montant_apres:
          params.montant_apres !== undefined
            ? String(params.montant_apres)
            : null,
        description: params.description ?? null,
        effectue_par: params.effectue_par,
        effectue_par_id: params.effectue_par_id ?? null,
        role_effectue_par: params.role_effectue_par ?? null,
        target_id: params.target_id ?? null,
        target_matricule: params.target_matricule ?? null,
      },
    });
    console.log(
      `[AUDIT] OK id=${audit.id} ref=${params.reference} action=${params.action}`,
    );
  } catch (err) {
    // On ne bloque jamais une action métier si l'audit échoue
    console.error(
      "[AUDIT] ERREUR ref=",
      params.reference,
      "action=",
      params.action,
      "err=",
      err,
    );
  }
}

interface AuditUser {
  email?: string;
  id?: number;
  role?: string;
}

export async function logBudgetAudit(
  reference: string,
  identifiant: string,
  action: string,
  typeDestination: string,
  description: string,
  user: AuditUser | undefined,
  options?: {
    montant?: number;
    montantAvant?: number;
    montantApres?: number;
    typeSource?: string;
    targetId?: number;
    targetMatricule?: string;
  },
): Promise<void> {
  const entreprise = await prisma.entreprise.findUnique({
    where: { identifiant },
  });
  await logAuditBudget({
    reference,
    entrepriseId: entreprise?.id ?? 0,
    action,
    type_source: options?.typeSource,
    type_destination: typeDestination,
    montant: options?.montant,
    montant_avant: options?.montantAvant,
    montant_apres: options?.montantApres,
    description,
    effectue_par: user?.email || "Inconnu",
    effectue_par_id: user?.id ?? undefined,
    role_effectue_par: user?.role,
    target_id: options?.targetId,
    target_matricule: options?.targetMatricule,
  });
}
