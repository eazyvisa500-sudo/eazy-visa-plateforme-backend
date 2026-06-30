import type { Request, Response } from 'express'
import prisma from '../lib/prismaClient'

export const createDepartement = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user
    const { nom, entrepriseId } = req.body as { nom?: string; entrepriseId?: number }

    if (!nom || !entrepriseId) {
      res.status(400).json({ message: 'nom et entrepriseId sont requis' })
      return
    }

    if (user?.role === 'MANAGER' && user.entrepriseId !== entrepriseId) {
      res.status(403).json({ message: 'Vous ne pouvez créer des départements que pour votre propre entreprise' })
      return
    }

    const entreprise = await prisma.entreprise.findUnique({ where: { id: entrepriseId } })
    if (!entreprise) {
      res.status(404).json({ message: 'Entreprise non trouvée' })
      return
    }

    const existing = await prisma.departement.findFirst({
      where: { nom: { equals: nom, mode: 'insensitive' }, entrepriseId },
    })
    if (existing) {
      res.status(409).json({ message: `Un département "${nom}" existe déjà pour cette entreprise` })
      return
    }

    const departement = await prisma.departement.create({
      data: { nom, entrepriseId },
    })

    res.status(201).json({ message: 'Département créé avec succès', departement })
  } catch (error: unknown) {
    res.status(500).json({ message: 'Erreur serveur', error })
  }
}

export const getMesDepartements = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user

    if (!user?.entrepriseId) {
      res.status(403).json({ message: 'Aucune entreprise associée à ce compte' })
      return
    }

    const departements = await prisma.departement.findMany({
      where: { entrepriseId: user.entrepriseId },
      include: { _count: { select: { users: true } } },
      orderBy: { nom: 'asc' },
    })

    res.status(200).json({ total: departements.length, departements })
  } catch (error: unknown) {
    res.status(500).json({ message: 'Erreur serveur', error })
  }
}

export const getDepartementsEntreprise = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user
    const entrepriseId = parseInt(String(req.query['entrepriseId'] ?? '0'))

    if (!entrepriseId) {
      res.status(400).json({ message: 'entrepriseId requis en query param' })
      return
    }

    if (user?.role === 'MANAGER' && user.entrepriseId !== entrepriseId) {
      res.status(403).json({ message: 'Accès non autorisé' })
      return
    }

    const departements = await prisma.departement.findMany({
      where: { entrepriseId },
      include: { _count: { select: { users: true } } },
      orderBy: { nom: 'asc' },
    })

    res.status(200).json({ total: departements.length, departements })
  } catch (error: unknown) {
    res.status(500).json({ message: 'Erreur serveur', error })
  }
}

export const updateDepartement = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user
    const id = parseInt(String(req.params['id'] ?? '0'))
    const { nom } = req.body as { nom?: string }

    if (!nom) {
      res.status(400).json({ message: 'nom requis' })
      return
    }

    const dept = await prisma.departement.findUnique({ where: { id } })
    if (!dept) {
      res.status(404).json({ message: 'Département non trouvé' })
      return
    }

    if (user?.role === 'MANAGER' && user.entrepriseId !== dept.entrepriseId) {
      res.status(403).json({ message: 'Accès non autorisé' })
      return
    }

    const duplicate = await prisma.departement.findFirst({
      where: { nom: { equals: nom, mode: 'insensitive' }, entrepriseId: dept.entrepriseId, NOT: { id } },
    })
    if (duplicate) {
      res.status(409).json({ message: `Un département "${nom}" existe déjà pour cette entreprise` })
      return
    }

    const updated = await prisma.departement.update({ where: { id }, data: { nom } })
    res.status(200).json({ message: 'Département mis à jour', departement: updated })
  } catch (error: unknown) {
    res.status(500).json({ message: 'Erreur serveur', error })
  }
}

export const deleteDepartement = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user
    const id = parseInt(String(req.params['id'] ?? '0'))

    const dept = await prisma.departement.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    })
    if (!dept) {
      res.status(404).json({ message: 'Département non trouvé' })
      return
    }

    if (user?.role === 'MANAGER' && user.entrepriseId !== dept.entrepriseId) {
      res.status(403).json({ message: 'Accès non autorisé' })
      return
    }

    if (dept._count.users > 0) {
      res.status(409).json({
        message: `Impossible de supprimer : ${dept._count.users} employé(s) affecté(s) à ce département`,
      })
      return
    }

    await prisma.departement.delete({ where: { id } })
    res.status(200).json({ message: 'Département supprimé avec succès' })
  } catch (error: unknown) {
    res.status(500).json({ message: 'Erreur serveur', error })
  }
}
