import type { Request, Response } from 'express'
import prisma from '../lib/prismaClient'
import { BadRequestError, ForbiddenError, NotFoundError } from '../utils/AppError'

export const getReservationsEntreprise = async (req: Request, res: Response): Promise<void> => {
  const user = req.user

  if (user?.role !== 'SUPERADMIN' && user?.role !== 'MANAGER') {
    throw new ForbiddenError()
  }

  const where =
    user.role === 'MANAGER' && user.entrepriseId !== undefined
      ? {
          demandeVoyage: {
            user: {
              entrepriseId: user.entrepriseId,
            },
          },
        }
      : {}

  const billets = await prisma.reservationBillet.findMany({
    where,
    include: {
      demandeVoyage: {
        include: {
          user: { select: { id: true, prenom: true, nom: true, matricule: true, role: true } },
          entreprise: { select: { id: true, nom: true, identifiant: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const hotels = await prisma.reservationHotel.findMany({
    where,
    include: {
      demandeVoyage: {
        include: {
          user: { select: { id: true, prenom: true, nom: true, matricule: true, role: true } },
          entreprise: { select: { id: true, nom: true, identifiant: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  res.status(200).json({
    billets: { total: billets.length, data: billets },
    hotels: { total: hotels.length, data: hotels },
  })
}

export const getMesReservations = async (req: Request, res: Response): Promise<void> => {
  const user = req.user

  if (!user?.matricule) {
    throw new ForbiddenError()
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
          user: { select: { id: true, prenom: true, nom: true, matricule: true, role: true } },
          entreprise: { select: { id: true, nom: true, identifiant: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const hotels = await prisma.reservationHotel.findMany({
    where: {
      demandeVoyage: {
        matricule: user.matricule,
      },
    },
    include: {
      demandeVoyage: {
        include: {
          user: { select: { id: true, prenom: true, nom: true, matricule: true, role: true } },
          entreprise: { select: { id: true, nom: true, identifiant: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  res.status(200).json({
    billets: { total: billets.length, data: billets },
    hotels: { total: hotels.length, data: hotels },
  })
}

export const getReservationBilletById = async (req: Request, res: Response): Promise<void> => {
  const user = req.user
  const id = parseInt(String(req.params['id'] ?? '0'))

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
  })

  if (!reservation) {
    throw new NotFoundError('Réservation de billet')
  }

  if (user?.role === 'EMPLOYE' || user?.role === 'CONSULTANT') {
    if (reservation.demandeVoyage.matricule !== user?.matricule) {
      throw new ForbiddenError()
    }
  } else if (user?.role === 'MANAGER') {
    const target = await prisma.user.findUnique({ where: { matricule: reservation.demandeVoyage.matricule } })
    if (!target || target.entrepriseId !== user.entrepriseId) {
      throw new ForbiddenError()
    }
  }

  res.status(200).json({ reservation })
}

export const getReservationHotelById = async (req: Request, res: Response): Promise<void> => {
  const user = req.user
  const id = parseInt(String(req.params['id'] ?? '0'))

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
  })

  if (!reservation) {
    throw new NotFoundError('Réservation d\'hôtel')
  }

  if (user?.role === 'EMPLOYE' || user?.role === 'CONSULTANT') {
    if (reservation.demandeVoyage.matricule !== user?.matricule) {
      throw new ForbiddenError()
    }
  } else if (user?.role === 'MANAGER') {
    const target = await prisma.user.findUnique({ where: { matricule: reservation.demandeVoyage.matricule } })
    if (!target || target.entrepriseId !== user.entrepriseId) {
      throw new ForbiddenError()
    }
  }

  res.status(200).json({ reservation })
}
