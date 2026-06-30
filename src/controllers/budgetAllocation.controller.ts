import type { Request, Response } from 'express'
import prisma from '../lib/prismaClient'
import { BadRequestError, NotFoundError, ForbiddenError, ConflictError } from '../utils/AppError'

async function checkBudgetOwnership(
  user: Express.Request['user'],
  identifiant_entreprise: string
): Promise<void> {
  if (user?.role === 'MANAGER') {
    const entreprise = await prisma.entreprise.findUnique({ where: { id: user.entrepriseId } })
    if (!entreprise || entreprise.identifiant !== identifiant_entreprise) {
      throw new ForbiddenError()
    }
  }
}

export const allouerBudgetDepartement = async (req: Request, res: Response): Promise<void> => {
  const user = req.user
  const reference = String(req.params['reference'])
  const { departementId, montant_alloue } = req.body as {
    departementId?: number
    montant_alloue?: number | string
  }

  if (!departementId || montant_alloue === undefined || montant_alloue === null) {
    throw new BadRequestError('departementId et montant_alloue sont requis', 'MISSING_FIELDS')
  }

  const montantStr = String(montant_alloue)
  const montant = Number(montantStr)
  if (isNaN(montant) || montant <= 0) {
    throw new BadRequestError('montant_alloue doit être un nombre positif', 'INVALID_AMOUNT')
  }

  const budgetAnnuel = await prisma.budgetAnnuel.findUnique({ where: { reference } })
  if (!budgetAnnuel) {
    throw new NotFoundError('Budget annuel')
  }

  await checkBudgetOwnership(user, budgetAnnuel.identifiant_entreprise)

  if (!budgetAnnuel.est_active) {
    throw new ConflictError('Le budget annuel doit être activé pour allouer', 'BUDGET_NOT_ACTIVE')
  }
  if (budgetAnnuel.est_cloture) {
    throw new ConflictError('Impossible d\'allouer sur un budget clôturé', 'BUDGET_CLOTURE')
  }

  const departement = await prisma.departement.findUnique({ where: { id: Number(departementId) } })
  if (!departement) {
    throw new NotFoundError('Département')
  }

  const entreprise = await prisma.entreprise.findUnique({
    where: { identifiant: budgetAnnuel.identifiant_entreprise },
  })
  if (!entreprise || departement.entrepriseId !== entreprise.id) {
    throw new BadRequestError('Ce département n\'appartient pas à l\'entreprise du budget', 'DEPARTEMENT_INVALID')
  }

  const existing = await prisma.budgetDepartement.findFirst({
    where: { reference, departementId: Number(departementId) },
  })
  if (existing) {
    throw new ConflictError(
      'Ce département a déjà un budget alloué pour cette référence',
      'BUDGET_DEPT_EXISTS'
    )
  }

  const restantAnnuel = Number(budgetAnnuel.montant_restant)
  if (montant > restantAnnuel) {
    throw new ConflictError(
      `Montant alloué (${montant}) supérieur au restant du budget annuel (${restantAnnuel})`,
      'MONTANT_EXCEDE'
    )
  }

  const [budgetDept] = await prisma.$transaction([
    prisma.budgetDepartement.create({
      data: {
        reference,
        departementId: Number(departementId),
        montant_alloue: montantStr,
        montant_restant: montantStr,
      },
    }),
    prisma.budgetAnnuel.update({
      where: { reference },
      data: { montant_restant: String(restantAnnuel - montant) },
    }),
  ])

  res.status(201).json({ message: 'Budget département alloué avec succès', budgetDepartement: budgetDept })
}

export const allouerBudgetPersonnel = async (req: Request, res: Response): Promise<void> => {
  const user = req.user
  const reference = String(req.params['reference'])
  const { matricule, montant_alloue, departementId } = req.body as {
    matricule?: string
    montant_alloue?: number | string
    departementId?: number
  }

  if (!matricule || montant_alloue === undefined || montant_alloue === null) {
    throw new BadRequestError('matricule et montant_alloue sont requis', 'MISSING_FIELDS')
  }

  const montantStr = String(montant_alloue)
  const montant = Number(montantStr)
  if (isNaN(montant) || montant <= 0) {
    throw new BadRequestError('montant_alloue doit être un nombre positif', 'INVALID_AMOUNT')
  }

  const budgetAnnuel = await prisma.budgetAnnuel.findUnique({ where: { reference } })
  if (!budgetAnnuel) {
    throw new NotFoundError('Budget annuel')
  }

  await checkBudgetOwnership(user, budgetAnnuel.identifiant_entreprise)

  if (!budgetAnnuel.est_active) {
    throw new ConflictError('Le budget annuel doit être activé pour allouer', 'BUDGET_NOT_ACTIVE')
  }
  if (budgetAnnuel.est_cloture) {
    throw new ConflictError('Impossible d\'allouer sur un budget clôturé', 'BUDGET_CLOTURE')
  }

  const targetUser = await prisma.user.findUnique({ where: { matricule } })
  if (!targetUser) {
    throw new NotFoundError('Utilisateur')
  }

  const entreprise = await prisma.entreprise.findUnique({
    where: { identifiant: budgetAnnuel.identifiant_entreprise },
  })
  if (!entreprise || targetUser.entrepriseId !== entreprise.id) {
    throw new BadRequestError('Cet utilisateur n\'appartient pas à l\'entreprise du budget', 'USER_INVALID')
  }

  const existing = await prisma.budgetPersonnel.findFirst({
    where: { reference, matricule },
  })
  if (existing) {
    throw new ConflictError(
      'Cet utilisateur a déjà un budget alloué pour cette référence',
      'BUDGET_PERS_EXISTS'
    )
  }

  // Allocation via département
  if (departementId) {
    const budgetDept = await prisma.budgetDepartement.findFirst({
      where: { reference, departementId: Number(departementId) },
    })
    if (!budgetDept) {
      throw new NotFoundError('Budget département')
    }
    if (targetUser.departementId !== Number(departementId)) {
      throw new BadRequestError(
        'L\'utilisateur n\'appartient pas au département spécifié',
        'DEPARTEMENT_MISMATCH'
      )
    }

    const restantDept = Number(budgetDept.montant_restant)
    if (montant > restantDept) {
      throw new ConflictError(
        `Montant alloué (${montant}) supérieur au restant du budget département (${restantDept})`,
        'MONTANT_EXCEDE_DEPT'
      )
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
        data: { montant_restant: String(restantDept - montant) },
      }),
    ])

    res.status(201).json({
      message: 'Budget personnel alloué via département avec succès',
      budgetPersonnel: budgetPers,
    })
    return
  }

  // Allocation directe depuis budget annuel
  const restantAnnuel = Number(budgetAnnuel.montant_restant)
  if (montant > restantAnnuel) {
    throw new ConflictError(
      `Montant alloué (${montant}) supérieur au restant du budget annuel (${restantAnnuel})`,
      'MONTANT_EXCEDE'
    )
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
  ])

  res.status(201).json({
    message: 'Budget personnel alloué avec succès',
    budgetPersonnel: budgetPers,
  })
}

export const getBudgetsDepartements = async (req: Request, res: Response): Promise<void> => {
  const user = req.user
  const reference = String(req.params['reference'])

  const budgetAnnuel = await prisma.budgetAnnuel.findUnique({ where: { reference } })
  if (!budgetAnnuel) {
    throw new NotFoundError('Budget annuel')
  }

  await checkBudgetOwnership(user, budgetAnnuel.identifiant_entreprise)

  const budgets = await prisma.budgetDepartement.findMany({
    where: { reference },
    include: { departement: { select: { id: true, nom: true } } },
    orderBy: { createdAt: 'desc' },
  })

  res.status(200).json({ total: budgets.length, budgets })
}

export const getBudgetsPersonnels = async (req: Request, res: Response): Promise<void> => {
  const user = req.user
  const reference = String(req.params['reference'])

  const budgetAnnuel = await prisma.budgetAnnuel.findUnique({ where: { reference } })
  if (!budgetAnnuel) {
    throw new NotFoundError('Budget annuel')
  }

  await checkBudgetOwnership(user, budgetAnnuel.identifiant_entreprise)

  const budgets = await prisma.budgetPersonnel.findMany({
    where: { reference },
    include: { user: { select: { id: true, prenom: true, nom: true, matricule: true, departement: { select: { id: true, nom: true } } } } },
    orderBy: { createdAt: 'desc' },
  })

  res.status(200).json({ total: budgets.length, budgets })
}

export const updateBudgetDepartement = async (req: Request, res: Response): Promise<void> => {
  const user = req.user
  const id = parseInt(String(req.params['id'] ?? '0'))
  const { montant_alloue } = req.body as { montant_alloue?: number | string }

  if (montant_alloue === undefined || montant_alloue === null) {
    throw new BadRequestError('montant_alloue est requis', 'MISSING_FIELDS')
  }

  const montantStr = String(montant_alloue)
  const nouveauMontant = Number(montantStr)
  if (isNaN(nouveauMontant) || nouveauMontant <= 0) {
    throw new BadRequestError('montant_alloue doit être un nombre positif', 'INVALID_AMOUNT')
  }

  const existing = await prisma.budgetDepartement.findUnique({ where: { id } })
  if (!existing) {
    throw new NotFoundError('Budget département')
  }

  const budgetAnnuel = await prisma.budgetAnnuel.findUnique({ where: { reference: existing.reference } })
  if (!budgetAnnuel) {
    throw new NotFoundError('Budget annuel')
  }

  await checkBudgetOwnership(user, budgetAnnuel.identifiant_entreprise)

  if (budgetAnnuel.est_cloture) {
    throw new ConflictError('Impossible de modifier sur un budget clôturé', 'BUDGET_CLOTURE')
  }

  const ancienMontant = Number(existing.montant_alloue)
  const difference = nouveauMontant - ancienMontant

  if (difference > 0) {
    const restantAnnuel = Number(budgetAnnuel.montant_restant)
    if (difference > restantAnnuel) {
      throw new ConflictError(
        `Augmentation de ${difference} supérieure au restant du budget annuel (${restantAnnuel})`,
        'MONTANT_EXCEDE'
      )
    }
  }

  const nouveauRestant = Number(existing.montant_restant) + difference
  if (nouveauRestant < 0) {
    throw new ConflictError(
      'Le nouveau montant alloué ne peut pas être inférieur au montant déjà utilisé',
      'MONTANT_INVALIDE'
    )
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
      data: { montant_restant: String(Number(budgetAnnuel.montant_restant) - difference) },
    }),
  ])

  res.status(200).json({ message: 'Budget département mis à jour', budgetDepartement: updated })
}

export const deleteBudgetDepartement = async (req: Request, res: Response): Promise<void> => {
  const user = req.user
  const id = parseInt(String(req.params['id'] ?? '0'))

  const existing = await prisma.budgetDepartement.findUnique({ where: { id } })
  if (!existing) {
    throw new NotFoundError('Budget département')
  }

  const budgetAnnuel = await prisma.budgetAnnuel.findUnique({ where: { reference: existing.reference } })
  if (!budgetAnnuel) {
    throw new NotFoundError('Budget annuel')
  }

  await checkBudgetOwnership(user, budgetAnnuel.identifiant_entreprise)

  if (budgetAnnuel.est_cloture) {
    throw new ConflictError('Impossible de supprimer sur un budget clôturé', 'BUDGET_CLOTURE')
  }

  const personnels = await prisma.budgetPersonnel.count({ where: { reference: existing.reference } })
  if (personnels > 0) {
    // We could allow deletion and return remaining, but let's be safe
    throw new ConflictError(
      'Impossible de supprimer : des budgets personnels sont liés à ce budget annuel',
      'BUDGET_HAS_PERSONNELS'
    )
  }

  const restantADegager = Number(existing.montant_restant)

  await prisma.$transaction([
    prisma.budgetDepartement.delete({ where: { id } }),
    prisma.budgetAnnuel.update({
      where: { reference: existing.reference },
      data: { montant_restant: String(Number(budgetAnnuel.montant_restant) + restantADegager) },
    }),
  ])

  res.status(200).json({ message: 'Budget département supprimé avec succès' })
}

export const updateBudgetPersonnel = async (req: Request, res: Response): Promise<void> => {
  const user = req.user
  const id = parseInt(String(req.params['id'] ?? '0'))
  const { montant_alloue, departementId } = req.body as {
    montant_alloue?: number | string
    departementId?: number
  }

  if (montant_alloue === undefined || montant_alloue === null) {
    throw new BadRequestError('montant_alloue est requis', 'MISSING_FIELDS')
  }

  const montantStr = String(montant_alloue)
  const nouveauMontant = Number(montantStr)
  if (isNaN(nouveauMontant) || nouveauMontant <= 0) {
    throw new BadRequestError('montant_alloue doit être un nombre positif', 'INVALID_AMOUNT')
  }

  const existing = await prisma.budgetPersonnel.findUnique({ where: { id } })
  if (!existing) {
    throw new NotFoundError('Budget personnel')
  }

  const budgetAnnuel = await prisma.budgetAnnuel.findUnique({ where: { reference: existing.reference } })
  if (!budgetAnnuel) {
    throw new NotFoundError('Budget annuel')
  }

  await checkBudgetOwnership(user, budgetAnnuel.identifiant_entreprise)

  if (budgetAnnuel.est_cloture) {
    throw new ConflictError('Impossible de modifier sur un budget clôturé', 'BUDGET_CLOTURE')
  }

  const ancienMontant = Number(existing.montant_alloue)
  const difference = nouveauMontant - ancienMontant

  // Determine source: direct annual budget or department budget
  const targetUser = await prisma.user.findUnique({ where: { matricule: existing.matricule } })
  const deptBudget = targetUser
    ? await prisma.budgetDepartement.findFirst({
        where: { reference: existing.reference, departementId: targetUser.departementId },
      })
    : null

  if (deptBudget && difference > 0) {
    const restantDept = Number(deptBudget.montant_restant)
    if (difference > restantDept) {
      throw new ConflictError(
        `Augmentation de ${difference} supérieure au restant du budget département (${restantDept})`,
        'MONTANT_EXCEDE_DEPT'
      )
    }
  } else if (!deptBudget && difference > 0) {
    const restantAnnuel = Number(budgetAnnuel.montant_restant)
    if (difference > restantAnnuel) {
      throw new ConflictError(
        `Augmentation de ${difference} supérieure au restant du budget annuel (${restantAnnuel})`,
        'MONTANT_EXCEDE'
      )
    }
  }

  const nouveauRestant = Number(existing.montant_restant) + difference
  if (nouveauRestant < 0) {
    throw new ConflictError(
      'Le nouveau montant alloué ne peut pas être inférieur au montant déjà utilisé',
      'MONTANT_INVALIDE'
    )
  }

  const operations: Promise<unknown>[] = [
    prisma.budgetPersonnel.update({
      where: { id },
      data: {
        montant_alloue: montantStr,
        montant_restant: String(nouveauRestant),
      },
    }),
  ]

  if (deptBudget) {
    operations.push(
      prisma.budgetDepartement.update({
        where: { id: deptBudget.id },
        data: { montant_restant: String(Number(deptBudget.montant_restant) - difference) },
      })
    )
  } else {
    operations.push(
      prisma.budgetAnnuel.update({
        where: { reference: existing.reference },
        data: { montant_restant: String(Number(budgetAnnuel.montant_restant) - difference) },
      })
    )
  }

  const [updated] = await prisma.$transaction(operations)

  res.status(200).json({ message: 'Budget personnel mis à jour', budgetPersonnel: updated })
}

export const deleteBudgetPersonnel = async (req: Request, res: Response): Promise<void> => {
  const user = req.user
  const id = parseInt(String(req.params['id'] ?? '0'))

  const existing = await prisma.budgetPersonnel.findUnique({ where: { id } })
  if (!existing) {
    throw new NotFoundError('Budget personnel')
  }

  const budgetAnnuel = await prisma.budgetAnnuel.findUnique({ where: { reference: existing.reference } })
  if (!budgetAnnuel) {
    throw new NotFoundError('Budget annuel')
  }

  await checkBudgetOwnership(user, budgetAnnuel.identifiant_entreprise)

  if (budgetAnnuel.est_cloture) {
    throw new ConflictError('Impossible de supprimer sur un budget clôturé', 'BUDGET_CLOTURE')
  }

  const restantADegager = Number(existing.montant_restant)

  const targetUser = await prisma.user.findUnique({ where: { matricule: existing.matricule } })
  const deptBudget = targetUser
    ? await prisma.budgetDepartement.findFirst({
        where: { reference: existing.reference, departementId: targetUser.departementId },
      })
    : null

  const operations: Promise<unknown>[] = [
    prisma.budgetPersonnel.delete({ where: { id } }),
  ]

  if (deptBudget) {
    operations.push(
      prisma.budgetDepartement.update({
        where: { id: deptBudget.id },
        data: { montant_restant: String(Number(deptBudget.montant_restant) + restantADegager) },
      })
    )
  } else {
    operations.push(
      prisma.budgetAnnuel.update({
        where: { reference: existing.reference },
        data: { montant_restant: String(Number(budgetAnnuel.montant_restant) + restantADegager) },
      })
    )
  }

  await prisma.$transaction(operations)

  res.status(200).json({ message: 'Budget personnel supprimé avec succès' })
}
