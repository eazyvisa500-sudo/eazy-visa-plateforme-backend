import type { Request, Response } from 'express'
import type { PrismaPromise } from '@prisma/client'
import prisma from '../lib/prismaClient'
import { BadRequestError, NotFoundError, ForbiddenError, ConflictError } from '../utils/AppError'

async function checkDemandeAccess(
  user: Express.Request['user'],
  targetMatricule: string
): Promise<void> {
  if (!user) {
    throw new ForbiddenError()
  }
  if (user.role === 'SUPERADMIN') {
    return
  }
  if (user.role === 'MANAGER') {
    const target = await prisma.user.findUnique({ where: { matricule: targetMatricule } })
    if (!target || target.entrepriseId !== user.entrepriseId) {
      throw new ForbiddenError()
    }
    return
  }
  if (user.matricule === targetMatricule) {
    return
  }
  throw new ForbiddenError()
}

async function checkDemandeIdAccess(
  user: Express.Request['user'],
  demandeId: number
): Promise<{ matricule: string }> {
  if (!user) {
    throw new ForbiddenError()
  }
  const demande = await prisma.demandeVoyage.findUnique({ where: { id: demandeId } })
  if (!demande) {
    throw new NotFoundError('Demande de voyage')
  }
  if (user.role === 'SUPERADMIN') {
    return { matricule: demande.matricule }
  }
  if (user.role === 'MANAGER') {
    const target = await prisma.user.findUnique({ where: { matricule: demande.matricule } })
    if (!target || target.entrepriseId !== user.entrepriseId) {
      throw new ForbiddenError()
    }
    return { matricule: demande.matricule }
  }
  if (user.matricule === demande.matricule) {
    return { matricule: demande.matricule }
  }
  throw new ForbiddenError()
}

async function verifierPolitiqueClasse(matricule: string, classe: string): Promise<void> {
  const politique = await prisma.politique.findUnique({ where: { matricule } })
  if (!politique) {
    return // pas de politique = pas de restriction
  }
  const classeUpper = classe.toUpperCase()
  const autorisations: Record<string, boolean> = {
    Y: politique.y,
    W: politique.w,
    J: politique.j,
    F: politique.f,
  }
  if (!autorisations[classeUpper]) {
    throw new ConflictError(
      `La classe ${classeUpper} n'est pas autorisée par la politique de l'employé`,
      'CLASSE_NON_AUTORISEE'
    )
  }
}

export const createDemandeVoyage = async (req: Request, res: Response): Promise<void> => {
  const user = req.user
  const {
    depart,
    arrive,
    allerRetour,
    dateDepart,
    dateRetour,
    classe,
    hotel,
    ville,
    pays,
    etat,
    region,
    motif,
  } = req.body as {
    depart?: string
    arrive?: string
    allerRetour?: boolean
    dateDepart?: string
    dateRetour?: string
    classe?: string
    hotel?: string
    ville?: string
    pays?: string
    etat?: string
    region?: string
    motif?: string
  }

  if (!user?.matricule || !user?.identifiantEntreprise) {
    throw new BadRequestError('Informations utilisateur manquantes dans le token', 'MISSING_TOKEN_FIELDS')
  }

  if (!depart || !arrive || !dateDepart || !classe || !motif) {
    throw new BadRequestError('Champs requis manquants', 'MISSING_FIELDS')
  }

  const validHotels = ['1', '2', '3', '4', '5', 'NON_INCLUS']
  if (hotel && !validHotels.includes(hotel)) {
    throw new BadRequestError('Hotel doit être 1, 2, 3, 4, 5 ou NON_INCLUS', 'INVALID_HOTEL')
  }

  const matricule = user.matricule
  const identifiant_entreprise = user.identifiantEntreprise

  if (allerRetour === true && !dateRetour) {
    throw new BadRequestError('dateRetour est requis pour un aller-retour', 'MISSING_RETURN_DATE')
  }

  const targetUser = await prisma.user.findUnique({ where: { matricule } })
  if (!targetUser) {
    throw new NotFoundError('Employé')
  }

  const entreprise = await prisma.entreprise.findUnique({ where: { identifiant: identifiant_entreprise } })
  if (!entreprise) {
    throw new NotFoundError('Entreprise')
  }

  await verifierPolitiqueClasse(matricule, classe)

  const demande = await prisma.demandeVoyage.create({
    data: {
      matricule,
      identifiant_entreprise,
      depart,
      arrive,
      allerRetour: allerRetour ?? false,
      dateDepart: new Date(dateDepart),
      dateRetour: dateRetour ? new Date(dateRetour) : null,
      classe: classe.toUpperCase(),
      hotel: hotel ?? 'NON_INCLUS',
      ville: ville ?? null,
      pays: pays ?? null,
      etat: etat ?? null,
      region: region ?? null,
      motif,
    },
    include: {
      user: { select: { id: true, prenom: true, nom: true, matricule: true, role: true } },
      entreprise: { select: { id: true, nom: true, identifiant: true } },
    },
  })

  res.status(201).json({ message: 'Demande de voyage créée', demande })
}

export const getAllDemandesVoyage = async (req: Request, res: Response): Promise<void> => {
  const user = req.user

  if (user?.role !== 'SUPERADMIN' && user?.role !== 'MANAGER') {
    throw new ForbiddenError()
  }

  const where =
    user.role === 'MANAGER' && user.entrepriseId !== undefined
      ? {
          user: { entrepriseId: user.entrepriseId },
        }
      : {}

  const demandes = await prisma.demandeVoyage.findMany({
    where,
    include: {
      user: { select: { id: true, prenom: true, nom: true, matricule: true, role: true } },
      entreprise: { select: { id: true, nom: true, identifiant: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  res.status(200).json({ total: demandes.length, demandes })
}

export const getMesDemandesVoyage = async (req: Request, res: Response): Promise<void> => {
  const user = req.user
  if (!user?.matricule) {
    throw new ForbiddenError()
  }

  const demandes = await prisma.demandeVoyage.findMany({
    where: { matricule: user.matricule },
    include: {
      entreprise: { select: { id: true, nom: true, identifiant: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  res.status(200).json({ total: demandes.length, demandes })
}

export const getDemandeVoyageById = async (req: Request, res: Response): Promise<void> => {
  const user = req.user
  const id = parseInt(String(req.params['id'] ?? '0'))

  await checkDemandeIdAccess(user, id)

  const demande = await prisma.demandeVoyage.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, prenom: true, nom: true, matricule: true, role: true } },
      entreprise: { select: { id: true, nom: true, identifiant: true } },
    },
  })

  if (!demande) {
    throw new NotFoundError('Demande de voyage')
  }

  res.status(200).json({ demande })
}

export const updateDemandeVoyage = async (req: Request, res: Response): Promise<void> => {
  const user = req.user
  const id = parseInt(String(req.params['id'] ?? '0'))
  const { depart, arrive, allerRetour, dateDepart, dateRetour, classe, hotel, ville, pays, etat, region, motif } = req.body as {
    depart?: string
    arrive?: string
    allerRetour?: boolean
    dateDepart?: string
    dateRetour?: string
    classe?: string
    hotel?: string
    ville?: string
    pays?: string
    etat?: string
    region?: string
    motif?: string
  }

  const { matricule } = await checkDemandeIdAccess(user, id)

  const existing = await prisma.demandeVoyage.findUnique({ where: { id } })
  if (!existing) {
    throw new NotFoundError('Demande de voyage')
  }

  if (existing.statut !== 'EN_ATTENTE') {
    throw new ConflictError('Impossible de modifier une demande qui n\'est pas en attente', 'STATUT_INVALIDE')
  }

  if (allerRetour === true && !dateRetour && !existing.dateRetour) {
    throw new BadRequestError('dateRetour est requis pour un aller-retour', 'MISSING_RETURN_DATE')
  }

  if (classe) {
    await verifierPolitiqueClasse(matricule, classe)
  }

  const validHotels = ['1', '2', '3', '4', '5', 'NON_INCLUS']
  if (hotel && !validHotels.includes(hotel)) {
    throw new BadRequestError('Hotel doit être 1, 2, 3, 4, 5 ou NON_INCLUS', 'INVALID_HOTEL')
  }

  const data: Record<string, unknown> = {}
  if (depart !== undefined) data.depart = depart
  if (arrive !== undefined) data.arrive = arrive
  if (allerRetour !== undefined) data.allerRetour = allerRetour
  if (dateDepart !== undefined) data.dateDepart = new Date(dateDepart)
  if (dateRetour !== undefined) data.dateRetour = dateRetour ? new Date(dateRetour) : null
  if (classe !== undefined) data.classe = classe.toUpperCase()
  if (hotel !== undefined) data.hotel = hotel
  if (ville !== undefined) data.ville = ville
  if (pays !== undefined) data.pays = pays
  if (etat !== undefined) data.etat = etat
  if (region !== undefined) data.region = region
  if (motif !== undefined) data.motif = motif

  const demande = await prisma.demandeVoyage.update({
    where: { id },
    data,
    include: {
      user: { select: { id: true, prenom: true, nom: true, matricule: true, role: true } },
      entreprise: { select: { id: true, nom: true, identifiant: true } },
    },
  })

  res.status(200).json({ message: 'Demande de voyage mise à jour', demande })
}

export const approuverDemandeVoyage = async (req: Request, res: Response): Promise<void> => {
  const user = req.user
  const id = parseInt(String(req.params['id'] ?? '0'))
  const { commentaire } = req.body as { commentaire?: string }

  if (user?.role !== 'SUPERADMIN' && user?.role !== 'MANAGER') {
    throw new ForbiddenError()
  }

  const existing = await prisma.demandeVoyage.findUnique({ where: { id } })
  if (!existing) {
    throw new NotFoundError('Demande de voyage')
  }

  if (user.role === 'MANAGER') {
    const target = await prisma.user.findUnique({ where: { matricule: existing.matricule } })
    if (!target || target.entrepriseId !== user.entrepriseId) {
      throw new ForbiddenError()
    }
  }

  if (existing.statut !== 'EN_ATTENTE') {
    throw new ConflictError('Seules les demandes en attente peuvent être approuvées', 'STATUT_INVALIDE')
  }

  const operations: PrismaPromise<any>[] = [
    prisma.demandeVoyage.update({
      where: { id },
      data: { statut: 'APPROUVEE', commentaire: commentaire ?? existing.commentaire },
      include: {
        user: { select: { id: true, prenom: true, nom: true, matricule: true, role: true } },
        entreprise: { select: { id: true, nom: true, identifiant: true } },
      },
    }),
    prisma.reservationBillet.create({
      data: {
        demandeVoyageId: existing.id,
        matricule: existing.matricule,
        allerRetour: existing.allerRetour,
        numeroReservation: `RES-${Date.now()}`,
        dateVolDepart: existing.dateDepart,
        dateVolArrivee: null,
        dateVolRetourDepart: existing.allerRetour ? existing.dateRetour : null,
        dateVolRetourArrivee: null,
        aeroportDepart: existing.depart,
        aeroportArrivee: existing.arrive,
        classe: existing.classe,
        statut: 'EN_ATTENTE',
      },
    }),
  ]

  if (existing.hotel !== 'NON_INCLUS') {
    operations.push(
      prisma.reservationHotel.create({
        data: {
          demandeVoyageId: existing.id,
          categorie: existing.hotel,
          ville: existing.ville,
          statut: 'EN_ATTENTE',
        },
      })
    )
  }

  const [demande, reservationBillet, reservationHotel] = await prisma.$transaction(operations) as [
    any,
    any,
    any | null
  ]

  res.status(200).json({ message: 'Demande approuvée', demande, reservationBillet, reservationHotel })
}

export const rejeterDemandeVoyage = async (req: Request, res: Response): Promise<void> => {
  const user = req.user
  const id = parseInt(String(req.params['id'] ?? '0'))
  const { commentaire } = req.body as { commentaire?: string }

  if (user?.role !== 'SUPERADMIN' && user?.role !== 'MANAGER') {
    throw new ForbiddenError()
  }

  const existing = await prisma.demandeVoyage.findUnique({ where: { id } })
  if (!existing) {
    throw new NotFoundError('Demande de voyage')
  }

  if (user.role === 'MANAGER') {
    const target = await prisma.user.findUnique({ where: { matricule: existing.matricule } })
    if (!target || target.entrepriseId !== user.entrepriseId) {
      throw new ForbiddenError()
    }
  }

  if (existing.statut !== 'EN_ATTENTE') {
    throw new ConflictError('Seules les demandes en attente peuvent être rejetées', 'STATUT_INVALIDE')
  }

  const demande = await prisma.demandeVoyage.update({
    where: { id },
    data: { statut: 'REJETEE', commentaire: commentaire ?? existing.commentaire },
    include: {
      user: { select: { id: true, prenom: true, nom: true, matricule: true, role: true } },
      entreprise: { select: { id: true, nom: true, identifiant: true } },
    },
  })

  res.status(200).json({ message: 'Demande rejetée', demande })
}

export const annulerDemandeVoyage = async (req: Request, res: Response): Promise<void> => {
  const user = req.user
  const id = parseInt(String(req.params['id'] ?? '0'))

  const { matricule } = await checkDemandeIdAccess(user, id)

  const existing = await prisma.demandeVoyage.findUnique({ where: { id } })
  if (!existing) {
    throw new NotFoundError('Demande de voyage')
  }

  if (existing.statut === 'ANNULEE' || existing.statut === 'TERMINEE') {
    throw new ConflictError('Cette demande est déjà annulée ou terminée', 'STATUT_INVALIDE')
  }

  const demande = await prisma.demandeVoyage.update({
    where: { id },
    data: { statut: 'ANNULEE' },
    include: {
      user: { select: { id: true, prenom: true, nom: true, matricule: true, role: true } },
      entreprise: { select: { id: true, nom: true, identifiant: true } },
    },
  })

  res.status(200).json({ message: 'Demande annulée', demande })
}

export const cloturerDemandeVoyage = async (req: Request, res: Response): Promise<void> => {
  const user = req.user
  const id = parseInt(String(req.params['id'] ?? '0'))

  if (user?.role !== 'SUPERADMIN' && user?.role !== 'MANAGER') {
    throw new ForbiddenError()
  }

  const existing = await prisma.demandeVoyage.findUnique({ where: { id } })
  if (!existing) {
    throw new NotFoundError('Demande de voyage')
  }

  if (user.role === 'MANAGER') {
    const target = await prisma.user.findUnique({ where: { matricule: existing.matricule } })
    if (!target || target.entrepriseId !== user.entrepriseId) {
      throw new ForbiddenError()
    }
  }

  if (existing.statut !== 'APPROUVEE' && existing.statut !== 'EN_COURS') {
    throw new ConflictError('Seules les demandes approuvées ou en cours peuvent être clôturées', 'STATUT_INVALIDE')
  }

  const demande = await prisma.demandeVoyage.update({
    where: { id },
    data: { statut: 'TERMINEE' },
    include: {
      user: { select: { id: true, prenom: true, nom: true, matricule: true, role: true } },
      entreprise: { select: { id: true, nom: true, identifiant: true } },
    },
  })

  res.status(200).json({ message: 'Demande clôturée', demande })
}
