import type { Request, Response } from 'express'
import type { Role } from '@prisma/client'
import bcrypt from 'bcryptjs'
import prisma from '../lib/prismaClient'
import { generateMatriculeUser } from '../lib/generateCode'
import { BadRequestError, NotFoundError, ForbiddenError, ConflictError } from '../utils/AppError'

interface EmployeInput {
  prenom: string
  nom: string
  email: string
  departement: string
  poste: string
  telephone: string
  mot_de_passe: string
  role?: Role
  civilite: string
  genre: string
  numero_passport?: string
  date_expiration_passport?: string
}

function isPrismaError(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: string }).code === code
  )
}

export const createEmployes = async (req: Request, res: Response): Promise<void> => {
  const user = req.user
  const { entrepriseId, employes } = req.body as {
    entrepriseId: number
    employes: EmployeInput[]
  }

  if (!entrepriseId || !Array.isArray(employes) || employes.length === 0) {
    throw new BadRequestError('entrepriseId et un tableau employes[] non vide sont requis', 'MISSING_FIELDS')
  }

  if (user?.role === 'MANAGER' && user.entrepriseId !== entrepriseId) {
    throw new ForbiddenError('Vous ne pouvez créer des employés que pour votre propre entreprise')
  }

  const entreprise = await prisma.entreprise.findUnique({ where: { id: entrepriseId } })
  if (!entreprise) {
    throw new NotFoundError('Entreprise')
  }
  if (!entreprise.is_active) {
    throw new BadRequestError("L'entreprise est désactivée", 'ENTREPRISE_INACTIVE')
  }

  // Vérifier le forfait de l'entreprise
  const forfait = await prisma.forfait.findUnique({
    where: { entrepriseId },
  })

  if (!forfait) {
    throw new BadRequestError("Aucun forfait trouvé pour cette entreprise", 'NO_FORFAIT')
  }

  // Vérifier si on peut créer tous les employés demandés
  const placesDisponibles = forfait.nombre_user_autorise - forfait.nombre_user_actuel
  if (employes.length > placesDisponibles) {
    throw new BadRequestError(
      `Limite du forfait atteinte. Places disponibles: ${placesDisponibles}, Demandées: ${employes.length}`,
      'FORFAIT_LIMIT_REACHED'
    )
  }

  const champsRequis: (keyof EmployeInput)[] = [
    'prenom', 'nom', 'email', 'departement', 'poste', 'telephone', 'mot_de_passe', 'civilite', 'genre',
  ]
  for (let i = 0; i < employes.length; i++) {
    const emp = employes[i]
    if (!emp) continue
    const manquants = champsRequis.filter((champ) => !emp[champ])
    if (manquants.length > 0) {
      throw new BadRequestError(
        `Employé #${i + 1} : champs manquants — ${manquants.join(', ')}`,
        'MISSING_FIELDS'
      )
    }
  }

  const usedMatricules = new Set<string>()
  const created = []
  let ignores = 0

  for (let i = 0; i < employes.length; i++) {
    const emp = employes[i]
    if (!emp) continue

    const dept = await prisma.departement.findFirst({
      where: { nom: { equals: emp.departement, mode: 'insensitive' }, entrepriseId },
    })
    if (!dept) {
      throw new BadRequestError(
        `Employé #${i + 1} : département "${emp.departement}" non trouvé pour cette entreprise`,
        'DEPARTEMENT_NOT_FOUND'
      )
    }

    const matricule = await generateMatriculeUser(usedMatricules)
    usedMatricules.add(matricule)
    const hashedPassword = await bcrypt.hash(emp.mot_de_passe, 10)

    try {
      const newUser = await prisma.user.create({
        data: {
          entrepriseId,
          departementId: dept.id,
          prenom: emp.prenom,
          nom: emp.nom,
          email: emp.email,
          matricule,
          poste: emp.poste,
          telephone: emp.telephone,
          mot_de_passe: hashedPassword,
          role: emp.role ?? ('EMPLOYE' as Role),
          civilite: emp.civilite,
          genre: emp.genre,
          numero_passport: emp.numero_passport || null,
          date_expiration_passport: emp.date_expiration_passport ? new Date(emp.date_expiration_passport) : null,
        },
        select: {
          id: true,
          prenom: true,
          nom: true,
          email: true,
          matricule: true,
          departementId: true,
          departement: { select: { id: true, nom: true } },
          poste: true,
          telephone: true,
          role: true,
          entrepriseId: true,
          createdAt: true,
          civilite: true,
          genre: true,
          numero_passport: true,
          date_expiration_passport: true,
        },
      })
      created.push(newUser)
    } catch (e: unknown) {
      if (isPrismaError(e, 'P2002')) {
        ignores++
      } else {
        throw e
      }
    }
  }

  // Incrémenter le nombre d'utilisateurs actuels dans le forfait
  if (created.length > 0) {
    await prisma.forfait.update({
      where: { entrepriseId },
      data: {
        nombre_user_actuel: forfait.nombre_user_actuel + created.length,
      },
    })
  }

  res.status(201).json({
    message: `${created.length} employé(s) créé(s) avec succès`,
    total_demande: employes.length,
    total_cree: created.length,
    ignores,
    employes: created,
    forfait: {
      nombre_user_autorise: forfait.nombre_user_autorise,
      nombre_user_actuel: forfait.nombre_user_actuel + created.length,
      places_restantes: forfait.nombre_user_autorise - (forfait.nombre_user_actuel + created.length),
    },
  })
}

const USER_SELECT = {
  id: true,
  prenom: true,
  nom: true,
  email: true,
  matricule: true,
  departementId: true,
  departement: { select: { id: true, nom: true } },
  poste: true,
  telephone: true,
  role: true,
  is_block: true,
  entrepriseId: true,
  civilite: true,
  genre: true,
  numero_passport: true,
  date_expiration_passport: true,
  createdAt: true,
  updatedAt: true,
} as const

export const getAllEmployes = async (req: Request, res: Response): Promise<void> => {
  const user = req.user

  const where = user?.role === 'MANAGER' && user.entrepriseId
    ? { entrepriseId: user.entrepriseId as number }
    : {}

  const employes = await prisma.user.findMany({
    where,
    select: { ...USER_SELECT, entreprise: { select: { nom: true, identifiant: true } } },
    orderBy: { createdAt: 'desc' },
  })
  res.status(200).json({ total: employes.length, employes })
}

export const searchEmploye = async (req: Request, res: Response): Promise<void> => {
  const user = req.user
  const q = String(req.query['q'] ?? '').trim()

  if (!q) {
    throw new BadRequestError('Paramètre q requis (matricule, email ou téléphone)', 'MISSING_QUERY_PARAM')
  }

  const managerFilter = user?.role === 'MANAGER' && user.entrepriseId
    ? { entrepriseId: user.entrepriseId as number }
    : {}

  const where = {
    OR: [
      { matricule: q },
      { email: q },
      { telephone: q },
      { entreprise: { nom: { contains: q, mode: 'insensitive' as const } } },
    ],
    ...managerFilter,
  }

  const employes = await prisma.user.findMany({
    where,
    select: { ...USER_SELECT, entreprise: { select: { nom: true, identifiant: true } } },
    orderBy: { createdAt: 'desc' },
  })

  if (employes.length === 0) {
    throw new NotFoundError('Employé')
  }

  res.status(200).json({ total: employes.length, employes })
}

export const getEmployeById = async (req: Request, res: Response): Promise<void> => {
  const user = req.user
  const id = parseInt(String(req.params['id'] ?? '0'))

  const employe = await prisma.user.findUnique({ where: { id }, select: USER_SELECT })
  if (!employe) {
    throw new NotFoundError('Employé')
  }

  if (user?.role === 'MANAGER' && employe.entrepriseId !== user.entrepriseId) {
    throw new ForbiddenError()
  }

  res.status(200).json(employe)
}

export const updateEmploye = async (req: Request, res: Response): Promise<void> => {
  const user = req.user
  const id = parseInt(String(req.params['id'] ?? '0'))

  const existing = await prisma.user.findUnique({ where: { id } })
  if (!existing) {
    throw new NotFoundError('Employé')
  }
  if (user?.role === 'MANAGER' && existing.entrepriseId !== user.entrepriseId) {
    throw new ForbiddenError()
  }

  const { prenom, nom, email, departement, poste, telephone, role, mot_de_passe } = req.body as {
    prenom?: string
    nom?: string
    email?: string
    departement?: string
    poste?: string
    telephone?: string
    role?: Role
    mot_de_passe?: string
  }

  let departementId: number | undefined
  if (departement) {
    const dept = await prisma.departement.findFirst({
      where: { nom: { equals: departement, mode: 'insensitive' }, entrepriseId: existing.entrepriseId },
    })
    if (!dept) {
      throw new BadRequestError(
        `Département "${departement}" non trouvé pour cette entreprise`,
        'DEPARTEMENT_NOT_FOUND'
      )
    }
    departementId = dept.id
  }

  const hashedPassword = mot_de_passe ? await bcrypt.hash(mot_de_passe, 10) : undefined

  try {
    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(prenom && { prenom }),
        ...(nom && { nom }),
        ...(email && { email }),
        ...(departementId && { departementId }),
        ...(poste && { poste }),
        ...(telephone && { telephone }),
        ...(role && { role }),
        ...(hashedPassword && { mot_de_passe: hashedPassword }),
      },
      select: USER_SELECT,
    })

    res.status(200).json({ message: 'Employé mis à jour', employe: updated })
  } catch (error: unknown) {
    if (isPrismaError(error, 'P2002')) {
      throw new ConflictError('Cet email existe déjà', 'EMAIL_EXISTS')
    }
    throw error
  }
}

export const toggleEmployeBlock = async (req: Request, res: Response): Promise<void> => {
  const user = req.user
  const id = parseInt(String(req.params['id'] ?? '0'))

  const existing = await prisma.user.findUnique({ where: { id } })
  if (!existing) {
    throw new NotFoundError('Employé')
  }
  if (user?.role === 'MANAGER' && existing.entrepriseId !== user.entrepriseId) {
    throw new ForbiddenError()
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { is_block: !existing.is_block },
    select: USER_SELECT,
  })

  const msg = updated.is_block ? 'Employé bloqué' : 'Employé débloqué'
  res.status(200).json({ message: msg, employe: updated })
}

export const deleteEmploye = async (req: Request, res: Response): Promise<void> => {
  const user = req.user
  const id = parseInt(String(req.params['id'] ?? '0'))

  const existing = await prisma.user.findUnique({ where: { id } })
  if (!existing) {
    throw new NotFoundError('Employé')
  }
  if (user?.role === 'MANAGER' && existing.entrepriseId !== user.entrepriseId) {
    throw new ForbiddenError()
  }

  // Décrémenter le nombre d'utilisateurs actuels dans le forfait
  const forfait = await prisma.forfait.findUnique({
    where: { entrepriseId: existing.entrepriseId },
  })

  if (forfait && forfait.nombre_user_actuel > 0) {
    await prisma.forfait.update({
      where: { entrepriseId: existing.entrepriseId },
      data: {
        nombre_user_actuel: forfait.nombre_user_actuel - 1,
      },
    })
  }

  await prisma.user.delete({ where: { id } })
  res.status(200).json({ message: 'Employé supprimé avec succès' })
}

export const getEmployeeOverview = async (req: Request, res: Response): Promise<void> => {
  const user = req.user
  const matricule = String(req.params['matricule'])

  if (!matricule) {
    res.status(400).json({ message: 'matricule est requis' })
    return
  }

  // Récupérer l'employé
  const employee = await prisma.user.findUnique({
    where: { matricule },
    select: {
      id: true,
      prenom: true,
      nom: true,
      email: true,
      matricule: true,
      departementId: true,
      departement: { select: { id: true, nom: true } },
      poste: true,
      telephone: true,
      role: true,
      is_block: true,
      entrepriseId: true,
      entreprise: { select: { id: true, nom: true, identifiant: true } },
      civilite: true,
      genre: true,
      numero_passport: true,
      date_expiration_passport: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  if (!employee) {
    res.status(404).json({ message: 'Employé non trouvé' })
    return
  }

  // Vérifier les droits d'accès
  // Un employé ne peut voir que ses propres données
  // Un manager ne peut voir que les employés de son entreprise
  // Un superadmin peut voir tous les employés
  if (user?.role === 'EMPLOYE' && user.matricule !== matricule) {
    res.status(403).json({ message: 'Vous ne pouvez voir que vos propres données' })
    return
  }

  if (user?.role === 'MANAGER' && employee.entrepriseId !== user.entrepriseId) {
    res.status(403).json({ message: 'Vous n\'avez pas les droits pour accéder à cet employé' })
    return
  }

  // Récupérer le budget personnel
  const budgetPersonnel = await prisma.budgetPersonnel.findFirst({
    where: { matricule },
  })

  // Récupérer les réservations de billets
  const reservationBillets = await prisma.reservationBillet.findMany({
    where: { matricule },
    orderBy: { createdAt: 'desc' },
  })

  // Récupérer les réservations d'hôtel (via DemandeVoyage)
  const reservationHotels = await prisma.reservationHotel.findMany({
    where: {
      demandeVoyage: {
        matricule,
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Récupérer les demandes de voyage
  const demandesVoyage = await prisma.demandeVoyage.findMany({
    where: { matricule },
    orderBy: { createdAt: 'desc' },
  })

  // Récupérer la politique de voyage
  const politique = await prisma.politique.findFirst({
    where: { matricule },
  })

  // Récupérer les audits budget
  const auditBudgets = await prisma.auditBudget.findMany({
    where: { target_matricule: matricule },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  // Calculer les statistiques
  const totalDemandes = demandesVoyage.length
  const demandesApprouvees = demandesVoyage.filter((d) => d.statut === 'APPROUVEE').length
  const demandesEnCours = demandesVoyage.filter((d) => d.statut === 'EN_COURS').length
  const demandesRejetees = demandesVoyage.filter((d) => d.statut === 'REJETEE').length
  const demandesAnnulees = demandesVoyage.filter((d) => d.statut === 'ANNULEE').length

  const totalVols = reservationBillets.length
  const volsConfirmes = reservationBillets.filter((r) => r.statut === 'CONFIRMEE' || r.statut === 'EMISE').length
  const volsEnAttente = reservationBillets.filter((r) => r.statut === 'EN_ATTENTE').length
  const volsAnnules = reservationBillets.filter((r) => r.statut === 'ANNULEE').length

  const totalHotels = reservationHotels.length
  const hotelsConfirmes = reservationHotels.filter((r) => r.statut === 'CONFIRMEE').length
  const hotelsEnAttente = reservationHotels.filter((r) => r.statut === 'EN_ATTENTE').length
  const hotelsAnnules = reservationHotels.filter((r) => r.statut === 'ANNULEE').length

  res.status(200).json({
    employee,
    budgetPersonnel,
    reservationBillets,
    reservationHotels,
    demandesVoyage,
    politique,
    auditBudgets,
    statistiques: {
      demandes: {
        total: totalDemandes,
        approuvees: demandesApprouvees,
        enCours: demandesEnCours,
        rejetees: demandesRejetees,
        annulees: demandesAnnulees,
      },
      vols: {
        total: totalVols,
        confirmes: volsConfirmes,
        enAttente: volsEnAttente,
        annules: volsAnnules,
      },
      hotels: {
        total: totalHotels,
        confirmes: hotelsConfirmes,
        enAttente: hotelsEnAttente,
        annules: hotelsAnnules,
      },
    },
  })
}
