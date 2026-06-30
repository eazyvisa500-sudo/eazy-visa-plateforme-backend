import type { Request, Response } from 'express'
import prisma from '../lib/prismaClient'
import { generateIdentifiantEntreprise } from '../lib/generateCode'

function isPrismaError(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: string }).code === code
  )
}

export const createEntreprise = async (req: Request, res: Response): Promise<void> => {
  try {
    const { nom, adresse, pays, region, ville, logo } = req.body as {
      nom: string
      adresse: string
      pays: string
      region: string
      ville: string
      logo?: string
    }

    if (!nom || !adresse || !pays || !region || !ville) {
      res.status(400).json({
        message: 'Tous les champs sont requis : nom, adresse, pays, region, ville',
      })
      return
    }

    const identifiant = await generateIdentifiantEntreprise()

    const entreprise = await prisma.entreprise.create({
      data: { nom, identifiant, adresse, pays, region, ville, logo },
    })

    res.status(201).json({
      message: 'Entreprise créée avec succès',
      identifiant_genere: entreprise.identifiant,
      entreprise,
    })
  } catch (error: unknown) {
    if (isPrismaError(error, 'P2002')) {
      res.status(409).json({ message: "Cet identifiant existe déjà" })
      return
    }
    res.status(500).json({ message: 'Erreur serveur', error })
  }
}

export const getAllEntreprises = async (req: Request, res: Response): Promise<void> => {
  try {
    const entreprises = await prisma.entreprise.findMany({
      include: { _count: { select: { users: true } } },
      orderBy: { createdAt: 'desc' },
    })
    res.status(200).json(entreprises)
  } catch (error: unknown) {
    res.status(500).json({ message: 'Erreur serveur', error })
  }
}

export const getEntrepriseById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(String(req.params['id'] ?? '0'))
    const entreprise = await prisma.entreprise.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            prenom: true,
            nom: true,
            email: true,
            poste: true,
            departement: true,
            role: true,
          },
        },
      },
    })
    if (!entreprise) {
      res.status(404).json({ message: 'Entreprise non trouvée' })
      return
    }
    res.status(200).json(entreprise)
  } catch (error: unknown) {
    res.status(500).json({ message: 'Erreur serveur', error })
  }
}

export const updateEntreprise = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(String(req.params['id'] ?? '0'))
    const { nom, adresse, pays, region, ville, logo } = req.body as {
      nom?: string
      adresse?: string
      pays?: string
      region?: string
      ville?: string
      logo?: string
    }

    const entreprise = await prisma.entreprise.update({
      where: { id },
      data: {
        ...(nom && { nom }),
        ...(adresse && { adresse }),
        ...(pays && { pays }),
        ...(region && { region }),
        ...(ville && { ville }),
        ...(logo !== undefined && { logo }),
      },
    })

    res.status(200).json({ message: 'Entreprise mise à jour', entreprise })
  } catch (error: unknown) {
    if (isPrismaError(error, 'P2025')) {
      res.status(404).json({ message: 'Entreprise non trouvée' })
      return
    }
    res.status(500).json({ message: 'Erreur serveur', error })
  }
}

export const toggleEntrepriseStatut = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(String(req.params['id'] ?? '0'))

    const entreprise = await prisma.entreprise.findUnique({ where: { id } })
    if (!entreprise) {
      res.status(404).json({ message: 'Entreprise non trouvée' })
      return
    }

    const updated = await prisma.entreprise.update({
      where: { id },
      data: { is_active: !entreprise.is_active },
    })

    res.status(200).json({
      message: updated.is_active ? 'Entreprise activée' : 'Entreprise bloquée',
      entreprise: updated,
    })
  } catch (error: unknown) {
    res.status(500).json({ message: 'Erreur serveur', error })
  }
}
