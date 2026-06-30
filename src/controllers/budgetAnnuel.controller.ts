import type { Request, Response } from 'express'
import prisma from '../lib/prismaClient'
import { generateReferenceBudget } from '../lib/generateCode'
import { BadRequestError, NotFoundError, ForbiddenError, ConflictError } from '../utils/AppError'

async function resolveEntrepriseIdentifiant(
  user: Express.Request['user'],
  bodyIdentifiant?: string,
  bodyEntrepriseId?: number
): Promise<string> {
  if (user?.role === 'MANAGER') {
    if (!user.entrepriseId) {
      throw new ForbiddenError('Aucune entreprise associée à ce compte')
    }
    const entreprise = await prisma.entreprise.findUnique({ where: { id: user.entrepriseId } })
    if (!entreprise) {
      throw new NotFoundError('Entreprise')
    }
    return entreprise.identifiant
  }

  // SUPERADMIN
  if (bodyIdentifiant) {
    const entreprise = await prisma.entreprise.findUnique({ where: { identifiant: bodyIdentifiant } })
    if (!entreprise) {
      throw new NotFoundError('Entreprise')
    }
    return bodyIdentifiant
  }

  if (bodyEntrepriseId) {
    const entreprise = await prisma.entreprise.findUnique({ where: { id: bodyEntrepriseId } })
    if (!entreprise) {
      throw new NotFoundError('Entreprise')
    }
    return entreprise.identifiant
  }

  throw new BadRequestError('identifiant_entreprise ou entrepriseId requis', 'MISSING_FIELDS')
}

async function verifyManagerOwnership(
  user: Express.Request['user'],
  budgetIdentifiant: string
): Promise<void> {
  if (user?.role !== 'MANAGER') return
  const entreprise = await prisma.entreprise.findUnique({ where: { id: user.entrepriseId } })
  if (!entreprise || entreprise.identifiant !== budgetIdentifiant) {
    throw new ForbiddenError()
  }
}

export const createBudgetAnnuel = async (req: Request, res: Response): Promise<void> => {
  const user = req.user
  const { identifiant_entreprise, entrepriseId, annee, date_debut, date_fin, budget } = req.body as {
    identifiant_entreprise?: string
    entrepriseId?: number
    annee?: number
    date_debut?: string
    date_fin?: string
    budget?: number | string
  }

  if (!annee || !date_debut || !date_fin || budget === undefined || budget === null) {
    throw new BadRequestError('annee, date_debut, date_fin et budget sont requis', 'MISSING_FIELDS')
  }

  const targetIdentifiant = await resolveEntrepriseIdentifiant(user, identifiant_entreprise, entrepriseId)

  const reference = await generateReferenceBudget()

  const budgetStr = String(budget)
  const budgetAnnuel = await prisma.budgetAnnuel.create({
    data: {
      reference,
      identifiant_entreprise: targetIdentifiant,
      annee: Number(annee),
      date_debut: new Date(date_debut),
      date_fin: new Date(date_fin),
      budget: budgetStr,
      montant_restant: budgetStr,
    },
  })

  res.status(201).json({ message: 'Budget annuel créé avec succès', budgetAnnuel })
}

export const getAllBudgetsAnnuels = async (req: Request, res: Response): Promise<void> => {
  const user = req.user

  const where =
    user?.role === 'MANAGER' && user.entrepriseId
      ? {
          entreprise: { id: user.entrepriseId },
        }
      : {}

  const budgets = await prisma.budgetAnnuel.findMany({
    where,
    include: {
      entreprise: { select: { id: true, nom: true, identifiant: true } },
      _count: { select: { budgetDepartements: true, budgetPersonnels: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  res.status(200).json({ total: budgets.length, budgets })
}

export const getBudgetAnnuelById = async (req: Request, res: Response): Promise<void> => {
  const user = req.user
  const id = parseInt(String(req.params['id'] ?? '0'))

  const budget = await prisma.budgetAnnuel.findUnique({
    where: { id },
    include: {
      entreprise: { select: { id: true, nom: true, identifiant: true } },
      budgetDepartements: {
        include: { departement: { select: { id: true, nom: true } } },
      },
      budgetPersonnels: {
        include: { user: { select: { id: true, prenom: true, nom: true, matricule: true } } },
      },
    },
  })

  if (!budget) {
    throw new NotFoundError('Budget annuel')
  }

  await verifyManagerOwnership(user, budget.identifiant_entreprise)

  res.status(200).json(budget)
}

export const updateBudgetAnnuel = async (req: Request, res: Response): Promise<void> => {
  const user = req.user
  const id = parseInt(String(req.params['id'] ?? '0'))
  const { annee, date_debut, date_fin, budget } = req.body as {
    annee?: number
    date_debut?: string
    date_fin?: string
    budget?: number | string
  }

  const existing = await prisma.budgetAnnuel.findUnique({ where: { id } })
  if (!existing) {
    throw new NotFoundError('Budget annuel')
  }

  await verifyManagerOwnership(user, existing.identifiant_entreprise)

  if (existing.est_cloture) {
    throw new ConflictError('Impossible de modifier un budget annuel clôturé', 'BUDGET_CLOTURE')
  }

  const updated = await prisma.budgetAnnuel.update({
    where: { id },
    data: {
      ...(annee !== undefined && { annee: Number(annee) }),
      ...(date_debut !== undefined && { date_debut: new Date(date_debut) }),
      ...(date_fin !== undefined && { date_fin: new Date(date_fin) }),
      ...(budget !== undefined && { budget: String(budget) }),
    },
  })

  res.status(200).json({ message: 'Budget annuel mis à jour', budgetAnnuel: updated })
}

export const deleteBudgetAnnuel = async (req: Request, res: Response): Promise<void> => {
  const user = req.user
  const id = parseInt(String(req.params['id'] ?? '0'))

  const existing = await prisma.budgetAnnuel.findUnique({
    where: { id },
    include: { _count: { select: { budgetDepartements: true, budgetPersonnels: true } } },
  })
  if (!existing) {
    throw new NotFoundError('Budget annuel')
  }

  await verifyManagerOwnership(user, existing.identifiant_entreprise)

  if (existing._count.budgetDepartements > 0 || existing._count.budgetPersonnels > 0) {
    throw new ConflictError(
      'Impossible de supprimer : ce budget est lié à des budgets départementaux ou personnels',
      'BUDGET_HAS_CHILDREN'
    )
  }

  await prisma.budgetAnnuel.delete({ where: { id } })
  res.status(200).json({ message: 'Budget annuel supprimé avec succès' })
}

export const activerBudgetAnnuel = async (req: Request, res: Response): Promise<void> => {
  const user = req.user
  const id = parseInt(String(req.params['id'] ?? '0'))

  const existing = await prisma.budgetAnnuel.findUnique({ where: { id } })
  if (!existing) {
    throw new NotFoundError('Budget annuel')
  }

  await verifyManagerOwnership(user, existing.identifiant_entreprise)

  if (existing.est_active) {
    throw new ConflictError('Ce budget annuel est déjà activé', 'BUDGET_ALREADY_ACTIVE')
  }

  if (existing.est_cloture) {
    throw new ConflictError('Impossible d\'activer un budget annuel clôturé', 'BUDGET_CLOTURE')
  }

  const updated = await prisma.budgetAnnuel.update({
    where: { id },
    data: { est_active: true },
  })

  res.status(200).json({ message: 'Budget annuel activé', budgetAnnuel: updated })
}

export const cloturerBudgetAnnuel = async (req: Request, res: Response): Promise<void> => {
  const user = req.user
  const id = parseInt(String(req.params['id'] ?? '0'))

  const existing = await prisma.budgetAnnuel.findUnique({ where: { id } })
  if (!existing) {
    throw new NotFoundError('Budget annuel')
  }

  await verifyManagerOwnership(user, existing.identifiant_entreprise)

  if (!existing.est_active) {
    throw new ConflictError('Impossible de clôturer un budget annuel non activé', 'BUDGET_NOT_ACTIVE')
  }

  if (existing.est_cloture) {
    throw new ConflictError('Ce budget annuel est déjà clôturé', 'BUDGET_ALREADY_CLOSED')
  }

  const updated = await prisma.budgetAnnuel.update({
    where: { id },
    data: { est_cloture: true },
  })

  res.status(200).json({ message: 'Budget annuel clôturé', budgetAnnuel: updated })
}
