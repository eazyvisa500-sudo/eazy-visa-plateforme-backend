import type { Request, Response } from 'express'
import prisma from '../lib/prismaClient'
import { generateIdentifiantEntreprise } from '../lib/generateCode'
import { BadRequestError, NotFoundError } from '../utils/AppError'

export const createEntreprise = async (req: Request, res: Response): Promise<void> => {
  const { nom, adresse, pays, region, ville, logo } = req.body as {
    nom: string
    adresse: string
    pays: string
    region: string
    ville: string
    logo?: string
  }

  if (!nom || !adresse || !pays || !region || !ville) {
    throw new BadRequestError('Tous les champs sont requis : nom, adresse, pays, region, ville', 'MISSING_FIELDS')
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
}

export const getAllEntreprises = async (_req: Request, res: Response): Promise<void> => {
  const entreprises = await prisma.entreprise.findMany({
    include: { _count: { select: { users: true } } },
    orderBy: { createdAt: 'desc' },
  })
  res.status(200).json(entreprises)
}

export const getEntrepriseById = async (req: Request, res: Response): Promise<void> => {
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
          role: true,
        },
      },
    },
  })
  if (!entreprise) {
    throw new NotFoundError('Entreprise')
  }
  res.status(200).json(entreprise)
}

export const updateEntreprise = async (req: Request, res: Response): Promise<void> => {
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
}

export const toggleEntrepriseStatut = async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(String(req.params['id'] ?? '0'))

  const entreprise = await prisma.entreprise.findUnique({ where: { id } })
  if (!entreprise) {
    throw new NotFoundError('Entreprise')
  }

  const updated = await prisma.entreprise.update({
    where: { id },
    data: { is_active: !entreprise.is_active },
  })

  res.status(200).json({
    message: updated.is_active ? 'Entreprise activée' : 'Entreprise bloquée',
    entreprise: updated,
  })
}
