import prisma from '../lib/prismaClient'

export interface AuditBudgetParams {
  reference: string
  entrepriseId: number
  action: string
  type_source?: string
  type_destination?: string
  montant?: number
  montant_avant?: number
  montant_apres?: number
  description?: string
  effectue_par: string
  effectue_par_id?: number | undefined
  role_effectue_par?: string | undefined
  target_id?: number
  target_matricule?: string
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
        montant_avant: params.montant_avant !== undefined ? String(params.montant_avant) : null,
        montant_apres: params.montant_apres !== undefined ? String(params.montant_apres) : null,
        description: params.description ?? null,
        effectue_par: params.effectue_par,
        effectue_par_id: params.effectue_par_id ?? null,
        role_effectue_par: params.role_effectue_par ?? null,
        target_id: params.target_id ?? null,
        target_matricule: params.target_matricule ?? null,
      },
    })
    console.log(`[AUDIT] OK id=${audit.id} ref=${params.reference} action=${params.action}`)
  } catch (err) {
    // On ne bloque jamais une action métier si l'audit échoue
    console.error('[AUDIT] ERREUR ref=', params.reference, 'action=', params.action, 'err=', err)
  }
}
