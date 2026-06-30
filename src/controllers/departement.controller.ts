import type { Request, Response } from 'express'
import prisma from '../lib/prismaClient'
import { BadRequestError, NotFoundError, ForbiddenError, ConflictError } from '../utils/AppError'

export const createDepartement = async (req: Request, res: Response): Promise<void> => {
  const user = req.user
  const { nom, entrepriseId } = req.body as { nom?: string; entrepriseId?: number }

  if (!nom || !entrepriseId) {
    throw new BadRequestError('nom et entrepriseId sont requis', 'MISSING_FIELDS')
  }

  if (user?.role === 'MANAGER' && user.entrepriseId !== entrepriseId) {
    throw new ForbiddenError('Vous ne pouvez créer des départements que pour votre propre entreprise')
  }

  const entreprise = await prisma.entreprise.findUnique({ where: { id: entrepriseId } })
  if (!entreprise) {
    throw new NotFoundError('Entreprise')
  }

  const existing = await prisma.departement.findFirst({
    where: { nom: { equals: nom, mode: 'insensitive' }, entrepriseId },
  })
  if (existing) {
    throw new ConflictError(`Un département "${nom}" existe déjà pour cette entreprise`, 'DEPARTEMENT_EXISTS')
  }

  const departement = await prisma.departement.create({
    data: { nom, entrepriseId },
  })

  res.status(201).json({ message: 'Département créé avec succès', departement })
}

export const getMesDepartements = async (req: Request, res: Response): Promise<void> => {
  const user = req.user

  if (!user?.entrepriseId) {
    throw new ForbiddenError('Aucune entreprise associée à ce compte')
  }

  const departements = await prisma.departement.findMany({
    where: { entrepriseId: user.entrepriseId },
    include: { _count: { select: { users: true } } },
    orderBy: { nom: 'asc' },
  })

  res.status(200).json({ total: departements.length, departements })
}

export const getDepartementsEntreprise = async (req: Request, res: Response): Promise<void> => {
  const user = req.user
  const entrepriseId = parseInt(String(req.query['entrepriseId'] ?? '0'))

  if (!entrepriseId) {
    throw new BadRequestError('entrepriseId requis en query param', 'MISSING_QUERY_PARAM')
  }

  if (user?.role === 'MANAGER' && user.entrepriseId !== entrepriseId) {
    throw new ForbiddenError()
  }

  const departements = await prisma.departement.findMany({
    where: { entrepriseId },
    include: { _count: { select: { users: true } } },
    orderBy: { nom: 'asc' },
  })

  res.status(200).json({ total: departements.length, departements })
}

export const updateDepartement = async (req: Request, res: Response): Promise<void> => {
  const user = req.user
  const id = parseInt(String(req.params['id'] ?? '0'))
  const { nom } = req.body as { nom?: string }

  if (!nom) {
    throw new BadRequestError('nom requis', 'MISSING_FIELDS')
  }

  const dept = await prisma.departement.findUnique({ where: { id } })
  if (!dept) {
    throw new NotFoundError('Département')
  }

  if (user?.role === 'MANAGER' && user.entrepriseId !== dept.entrepriseId) {
    throw new ForbiddenError()
  }

  const duplicate = await prisma.departement.findFirst({
    where: { nom: { equals: nom, mode: 'insensitive' }, entrepriseId: dept.entrepriseId, NOT: { id } },
  })
  if (duplicate) {
    throw new ConflictError(`Un département "${nom}" existe déjà pour cette entreprise`, 'DEPARTEMENT_EXISTS')
  }

  const updated = await prisma.departement.update({ where: { id }, data: { nom } })
  res.status(200).json({ message: 'Département mis à jour', departement: updated })
}

export const deleteDepartement = async (req: Request, res: Response): Promise<void> => {
  const user = req.user
  const id = parseInt(String(req.params['id'] ?? '0'))

  const dept = await prisma.departement.findUnique({
    where: { id },
    include: { _count: { select: { users: true } } },
  })
  if (!dept) {
    throw new NotFoundError('Département')
  }

  if (user?.role === 'MANAGER' && user.entrepriseId !== dept.entrepriseId) {
    throw new ForbiddenError()
  }

  if (dept._count.users > 0) {
    throw new ConflictError(
      `Impossible de supprimer : ${dept._count.users} employé(s) affecté(s) à ce département`,
      'DEPARTEMENT_HAS_USERS'
    )
  }

  await prisma.departement.delete({ where: { id } })
  res.status(200).json({ message: 'Département supprimé avec succès' })
}
