import type { Request, Response } from 'express'
import prisma from '../lib/prismaClient'
import { ForbiddenError } from '../utils/AppError'

export const getOverview = async (req: Request, res: Response): Promise<void> => {
  const user = req.user

  if (user?.role !== 'SUPERADMIN' && user?.role !== 'MANAGER') {
    throw new ForbiddenError()
  }

  const entrepriseId = user.role === 'MANAGER' ? user.entrepriseId : undefined
  const identifiantEntreprise = user?.identifiantEntreprise || (entrepriseId ? String(entrepriseId) : undefined)

  // Récupérer l'année depuis les query params (défaut: année courante)
  const anneeParam = req.query['annee']
  const annee = anneeParam ? parseInt(String(anneeParam)) : new Date().getFullYear()

  console.log('Dashboard overview - User:', { role: user?.role, entrepriseId, identifiantEntreprise, annee })

  try {
    // Nombre total d'employés
    const totalEmployes = await prisma.user.count({
      where: entrepriseId ? { entrepriseId } : { role: { in: ['EMPLOYE', 'MANAGER', 'CONSULTANT'] } },
    })

    // Nombre de départements
    const totalDepartements = entrepriseId
      ? await prisma.departement.count({ where: { entrepriseId } })
      : await prisma.departement.count()

    // Filtre par année pour les dates
    const debutAnnee = new Date(annee, 0, 1)
    const finAnnee = new Date(annee, 11, 31, 23, 59, 59)

    console.log('Filtering by year:', { annee, debutAnnee, finAnnee })

    // Nombre de demandes de voyage pour l'année
    const totalDemandesVoyage = identifiantEntreprise
      ? await prisma.demandeVoyage.count({
          where: {
            identifiant_entreprise: identifiantEntreprise,
            createdAt: { gte: debutAnnee, lte: finAnnee },
          },
        })
      : await prisma.demandeVoyage.count({
          where: { createdAt: { gte: debutAnnee, lte: finAnnee } },
        })

    // Demandes de voyage par statut pour l'année
    const demandesParStatut = identifiantEntreprise
      ? await prisma.demandeVoyage.groupBy({
          by: ['statut'],
          where: {
            identifiant_entreprise: identifiantEntreprise,
            createdAt: { gte: debutAnnee, lte: finAnnee },
          },
          _count: true,
        })
      : await prisma.demandeVoyage.groupBy({
          by: ['statut'],
          where: { createdAt: { gte: debutAnnee, lte: finAnnee } },
          _count: true,
        })

    // Nombre de réservations de billets pour l'année
    const totalReservationsBillets = identifiantEntreprise
      ? await prisma.reservationBillet.count({
          where: {
            demandeVoyage: {
              identifiant_entreprise: identifiantEntreprise,
            },
            createdAt: { gte: debutAnnee, lte: finAnnee },
          },
        })
      : await prisma.reservationBillet.count({
          where: { createdAt: { gte: debutAnnee, lte: finAnnee } },
        })

    // Réservations de billets par statut pour l'année
    const reservationsBilletsParStatut = identifiantEntreprise
      ? await prisma.reservationBillet.groupBy({
          by: ['statut'],
          where: {
            demandeVoyage: {
              identifiant_entreprise: identifiantEntreprise,
            },
            createdAt: { gte: debutAnnee, lte: finAnnee },
          },
          _count: true,
        })
      : await prisma.reservationBillet.groupBy({
          by: ['statut'],
          where: { createdAt: { gte: debutAnnee, lte: finAnnee } },
          _count: true,
        })

    // Nombre de réservations d'hôtels pour l'année
    const totalReservationsHotels = identifiantEntreprise
      ? await prisma.reservationHotel.count({
          where: {
            demandeVoyage: {
              identifiant_entreprise: identifiantEntreprise,
            },
            createdAt: { gte: debutAnnee, lte: finAnnee },
          },
        })
      : await prisma.reservationHotel.count({
          where: { createdAt: { gte: debutAnnee, lte: finAnnee } },
        })

    // Réservations d'hôtels par statut pour l'année
    const reservationsHotelsParStatut = identifiantEntreprise
      ? await prisma.reservationHotel.groupBy({
          by: ['statut'],
          where: {
            demandeVoyage: {
              identifiant_entreprise: identifiantEntreprise,
            },
            createdAt: { gte: debutAnnee, lte: finAnnee },
          },
          _count: true,
        })
      : await prisma.reservationHotel.groupBy({
          by: ['statut'],
          where: { createdAt: { gte: debutAnnee, lte: finAnnee } },
          _count: true,
        })

    // Budgets annuels pour l'année spécifiée (peut y en avoir plusieurs)
    const budgetsAnnuels = identifiantEntreprise
      ? await prisma.budgetAnnuel.findMany({
          where: {
            identifiant_entreprise: identifiantEntreprise,
            annee: annee,
          },
        })
      : await prisma.budgetAnnuel.findMany({
          where: { annee: annee },
        })

    // Agrégation des budgets annuels
    const totalBudgetAnnee = budgetsAnnuels.reduce((sum, b) => sum + b.budget.toNumber(), 0)
    const totalMontantRestantAnnee = budgetsAnnuels.reduce((sum, b) => sum + b.montant_restant.toNumber(), 0)

    // Récupérer tous les budgets départementaux pour tous les budgets de l'année
    const references = budgetsAnnuels.map((b) => b.reference)
    const budgetsDepartements = references.length > 0
      ? await prisma.budgetDepartement.findMany({
          where: { reference: { in: references } },
          include: {
            departement: true,
          },
        })
      : []

    // Récupérer tous les budgets personnels pour tous les budgets de l'année
    const budgetsPersonnels = references.length > 0
      ? await prisma.budgetPersonnel.findMany({
          where: { reference: { in: references } },
          include: {
            user: {
              select: {
                id: true,
                prenom: true,
                nom: true,
                matricule: true,
              },
            },
          },
        })
      : []

    // Calculer les totaux de budget
    const totalBudgetAlloue = budgetsDepartements.reduce(
      (sum, b) => sum + b.montant_alloue.toNumber(),
      0
    )
    const totalBudgetUtilise = budgetsDepartements.reduce(
      (sum, b) => sum + b.montant_utilise.toNumber(),
      0
    )
    const totalBudgetRestant = budgetsDepartements.reduce(
      (sum, b) => sum + b.montant_restant.toNumber(),
      0
    )

    const totalBudgetPersonnelAlloue = budgetsPersonnels.reduce(
      (sum, b) => sum + b.montant_alloue.toNumber(),
      0
    )
    const totalBudgetPersonnelUtilise = budgetsPersonnels.reduce(
      (sum, b) => sum + b.montant_utilise.toNumber(),
      0
    )
    const totalBudgetPersonnelRestant = budgetsPersonnels.reduce(
      (sum, b) => sum + b.montant_restant.toNumber(),
      0
    )

    // Dernières demandes de voyage pour l'année
    const dernieresDemandes = identifiantEntreprise
      ? await prisma.demandeVoyage.findMany({
          where: {
            identifiant_entreprise: identifiantEntreprise,
            createdAt: { gte: debutAnnee, lte: finAnnee },
          },
          include: {
            user: {
              select: {
                id: true,
                prenom: true,
                nom: true,
                matricule: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        })
      : await prisma.demandeVoyage.findMany({
          where: { createdAt: { gte: debutAnnee, lte: finAnnee } },
          include: {
            user: {
              select: {
                id: true,
                prenom: true,
                nom: true,
                matricule: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        })

    // Dernières réservations pour l'année
    const dernieresReservations = identifiantEntreprise
      ? await prisma.reservationBillet.findMany({
          where: {
            demandeVoyage: {
              identifiant_entreprise: identifiantEntreprise,
            },
            createdAt: { gte: debutAnnee, lte: finAnnee },
          },
          include: {
            demandeVoyage: {
              include: {
                user: {
                  select: {
                    id: true,
                    prenom: true,
                    nom: true,
                    matricule: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        })
      : await prisma.reservationBillet.findMany({
          where: { createdAt: { gte: debutAnnee, lte: finAnnee } },
          include: {
            demandeVoyage: {
              include: {
                user: {
                  select: {
                    id: true,
                    prenom: true,
                    nom: true,
                    matricule: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        })

    res.status(200).json({
      entreprise: {
        totalEmployes,
        totalDepartements,
      },
      demandesVoyage: {
        total: totalDemandesVoyage,
        parStatut: demandesParStatut.map((d) => ({
          statut: d.statut,
          count: d._count,
        })),
        dernieres: dernieresDemandes,
      },
      reservations: {
        billets: {
          total: totalReservationsBillets,
          parStatut: reservationsBilletsParStatut.map((r) => ({
            statut: r.statut,
            count: r._count,
          })),
        },
        hotels: {
          total: totalReservationsHotels,
          parStatut: reservationsHotelsParStatut.map((r) => ({
            statut: r.statut,
            count: r._count,
          })),
        },
        dernieres: dernieresReservations,
      },
      budget: {
        annuel: budgetsAnnuels.length > 0
          ? {
              annee: annee,
              budget: totalBudgetAnnee,
              montant_restant: totalMontantRestantAnnee,
              nombreBudgets: budgetsAnnuels.length,
              details: budgetsAnnuels.map((b) => ({
                reference: b.reference,
                budget: b.budget.toNumber(),
                montant_restant: b.montant_restant.toNumber(),
                est_active: b.est_active,
                est_cloture: b.est_cloture,
              })),
            }
          : null,
        departements: {
          total: budgetsDepartements.length,
          totalAlloue: totalBudgetAlloue,
          totalUtilise: totalBudgetUtilise,
          totalRestant: totalBudgetRestant,
          details: budgetsDepartements.map((b) => ({
            departement: b.departement.nom,
            budget: b.montant_alloue.toNumber(),
            montant_utilise: b.montant_utilise.toNumber(),
            montant_restant: b.montant_restant.toNumber(),
          })),
        },
        personnels: {
          total: budgetsPersonnels.length,
          totalAlloue: totalBudgetPersonnelAlloue,
          totalUtilise: totalBudgetPersonnelUtilise,
          totalRestant: totalBudgetPersonnelRestant,
          details: budgetsPersonnels.map((b) => ({
            matricule: b.user.matricule,
            nom: `${b.user.prenom} ${b.user.nom}`,
            montant_alloue: b.montant_alloue.toNumber(),
            montant_utilise: b.montant_utilise.toNumber(),
            montant_restant: b.montant_restant.toNumber(),
            bloquer: b.bloquer,
          })),
        },
      },
    })
  } catch (error) {
    console.error('Error getting dashboard overview:', error)
    res.status(500).json({
      message: 'Erreur lors de la récupération de la vue d\'ensemble',
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

export const getDetails = async (req: Request, res: Response): Promise<void> => {
  const user = req.user

  if (user?.role !== 'SUPERADMIN' && user?.role !== 'MANAGER') {
    throw new ForbiddenError()
  }

  const entrepriseId = user.role === 'MANAGER' ? user.entrepriseId : undefined
  const identifiantEntreprise = user?.identifiantEntreprise || (entrepriseId ? String(entrepriseId) : undefined)

  // Récupérer l'année depuis les query params (défaut: année courante)
  const anneeParam = req.query['annee']
  const annee = anneeParam ? parseInt(String(anneeParam)) : new Date().getFullYear()

  console.log('Dashboard details - User:', { role: user?.role, entrepriseId, identifiantEntreprise, annee })

  try {
    // Filtre par année pour les dates
    const debutAnnee = new Date(annee, 0, 1)
    const finAnnee = new Date(annee, 11, 31, 23, 59, 59)

    console.log('Filtering by year:', { annee, debutAnnee, finAnnee })

    // Liste complète des employés avec détails
    const employes = await prisma.user.findMany({
      where: entrepriseId ? { entrepriseId } : { role: { in: ['EMPLOYE', 'MANAGER', 'CONSULTANT'] } },
      include: {
        departement: true,
        entreprise: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    // Liste complète des départements
    const departements = entrepriseId
      ? await prisma.departement.findMany({
          where: { entrepriseId },
          include: {
            _count: {
              select: {
                users: true,
              },
            },
          },
        })
      : await prisma.departement.findMany({
          include: {
            _count: {
              select: {
                users: true,
              },
            },
          },
        })

    // Liste complète des demandes de voyage avec détails pour l'année
    const demandesVoyage = identifiantEntreprise
      ? await prisma.demandeVoyage.findMany({
          where: {
            identifiant_entreprise: identifiantEntreprise,
            createdAt: { gte: debutAnnee, lte: finAnnee },
          },
          include: {
            user: {
              select: {
                id: true,
                prenom: true,
                nom: true,
                matricule: true,
                email: true,
                telephone: true,
              },
            },
            entreprise: true,
          },
          orderBy: { createdAt: 'desc' },
        })
      : await prisma.demandeVoyage.findMany({
          where: { createdAt: { gte: debutAnnee, lte: finAnnee } },
          include: {
            user: {
              select: {
                id: true,
                prenom: true,
                nom: true,
                matricule: true,
                email: true,
                telephone: true,
              },
            },
            entreprise: true,
          },
          orderBy: { createdAt: 'desc' },
        })

    // Liste complète des réservations de billets pour l'année
    const reservationsBillets = identifiantEntreprise
      ? await prisma.reservationBillet.findMany({
          where: {
            demandeVoyage: {
              identifiant_entreprise: identifiantEntreprise,
            },
            createdAt: { gte: debutAnnee, lte: finAnnee },
          },
          include: {
            demandeVoyage: {
              include: {
                user: {
                  select: {
                    id: true,
                    prenom: true,
                    nom: true,
                    matricule: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        })
      : await prisma.reservationBillet.findMany({
          where: { createdAt: { gte: debutAnnee, lte: finAnnee } },
          include: {
            demandeVoyage: {
              include: {
                user: {
                  select: {
                    id: true,
                    prenom: true,
                    nom: true,
                    matricule: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        })

    // Liste complète des réservations d'hôtels pour l'année
    const reservationsHotels = identifiantEntreprise
      ? await prisma.reservationHotel.findMany({
          where: {
            demandeVoyage: {
              identifiant_entreprise: identifiantEntreprise,
            },
            createdAt: { gte: debutAnnee, lte: finAnnee },
          },
          include: {
            demandeVoyage: {
              include: {
                user: {
                  select: {
                    id: true,
                    prenom: true,
                    nom: true,
                    matricule: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        })
      : await prisma.reservationHotel.findMany({
          where: { createdAt: { gte: debutAnnee, lte: finAnnee } },
          include: {
            demandeVoyage: {
              include: {
                user: {
                  select: {
                    id: true,
                    prenom: true,
                    nom: true,
                    matricule: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        })

    // Budgets annuels complets pour l'année spécifiée (peut y en avoir plusieurs)
    const budgetsAnnuels = identifiantEntreprise
      ? await prisma.budgetAnnuel.findMany({
          where: {
            identifiant_entreprise: identifiantEntreprise,
            annee: annee,
          },
        })
      : await prisma.budgetAnnuel.findMany({
          where: { annee: annee },
        })

    // Agrégation des budgets annuels
    const totalBudgetAnnee = budgetsAnnuels.reduce((sum, b) => sum + b.budget.toNumber(), 0)
    const totalMontantRestantAnnee = budgetsAnnuels.reduce((sum, b) => sum + b.montant_restant.toNumber(), 0)

    // Récupérer tous les budgets départementaux pour tous les budgets de l'année
    const references = budgetsAnnuels.map((b) => b.reference)
    const budgetsDepartements = references.length > 0
      ? await prisma.budgetDepartement.findMany({
          where: { reference: { in: references } },
          include: {
            departement: true,
          },
        })
      : []

    // Récupérer tous les budgets personnels pour tous les budgets de l'année
    const budgetsPersonnels = references.length > 0
      ? await prisma.budgetPersonnel.findMany({
          where: { reference: { in: references } },
          include: {
            user: {
              select: {
                id: true,
                prenom: true,
                nom: true,
                matricule: true,
                email: true,
                role: true,
              },
            },
          },
        })
      : []

    // Audit budget récent pour l'année
    const auditBudget = entrepriseId
      ? await prisma.auditBudget.findMany({
          where: {
            entrepriseId,
            createdAt: { gte: debutAnnee, lte: finAnnee },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        })
      : await prisma.auditBudget.findMany({
          where: { createdAt: { gte: debutAnnee, lte: finAnnee } },
          orderBy: { createdAt: 'desc' },
          take: 20,
        })

    res.status(200).json({
      entreprise: {
        employes: employes.map((e) => ({
          id: e.id,
          prenom: e.prenom,
          nom: e.nom,
          email: e.email,
          matricule: e.matricule,
          poste: e.poste,
          telephone: e.telephone,
          role: e.role,
          is_block: e.is_block,
          departement: e.departement?.nom,
          civilite: e.civilite,
          genre: e.genre,
          numero_passport: e.numero_passport,
          date_expiration_passport: e.date_expiration_passport,
          createdAt: e.createdAt,
        })),
        departements: departements.map((d) => ({
          id: d.id,
          nom: d.nom,
          nombreEmployes: d._count.users,
        })),
      },
      demandesVoyage: demandesVoyage.map((d) => ({
        id: d.id,
        matricule: d.matricule,
        depart: d.depart,
        arrive: d.arrive,
        allerRetour: d.allerRetour,
        dateDepart: d.dateDepart,
        dateRetour: d.dateRetour,
        classe: d.classe,
        hotel: d.hotel,
        ville: d.ville,
        motif: d.motif,
        statut: d.statut,
        commentaire: d.commentaire,
        user: d.user,
        createdAt: d.createdAt,
      })),
      reservations: {
        billets: reservationsBillets.map((r) => ({
          id: r.id,
          demandeVoyageId: r.demandeVoyageId,
          matricule: r.matricule,
          numeroReservation: r.numeroReservation,
          numeroOrder: r.numeroOrder,
          compagnieAerienne: r.compagnieAerienne,
          numeroVolAller: r.numeroVolAller,
          numeroVolRetour: r.numeroVolRetour,
          dateVolDepart: r.dateVolDepart,
          dateVolArrivee: r.dateVolArrivee,
          dateVolRetourDepart: r.dateVolRetourDepart,
          dateVolRetourArrivee: r.dateVolRetourArrivee,
          aeroportDepart: r.aeroportDepart,
          aeroportArrivee: r.aeroportArrivee,
          classe: r.classe,
          prix: r.prix?.toNumber(),
          devise: r.devise,
          statut: r.statut,
          numeroBillet: r.numeroBillet,
          dateEmission: r.dateEmission,
          commentaire: r.commentaire,
          user: r.demandeVoyage.user,
          createdAt: r.createdAt,
        })),
        hotels: reservationsHotels.map((r) => ({
          id: r.id,
          demandeVoyageId: r.demandeVoyageId,
          nomHotel: r.nomHotel,
          categorie: r.categorie,
          adresse: r.adresse,
          ville: r.ville,
          pays: r.pays,
          dateArrivee: r.dateArrivee,
          dateDepart: r.dateDepart,
          nombreNuits: r.nombreNuits,
          prixParNuit: r.prixParNuit?.toNumber(),
          prixTotal: r.prixTotal?.toNumber(),
          devise: r.devise,
          statut: r.statut,
          numeroConfirmation: r.numeroConfirmation,
          commentaire: r.commentaire,
          user: r.demandeVoyage.user,
          createdAt: r.createdAt,
        })),
      },
      budget: {
        annuel: budgetsAnnuels.length > 0
          ? {
              annee: annee,
              budget: totalBudgetAnnee,
              montant_restant: totalMontantRestantAnnee,
              nombreBudgets: budgetsAnnuels.length,
              details: budgetsAnnuels.map((b) => ({
                id: b.id,
                reference: b.reference,
                identifiant_entreprise: b.identifiant_entreprise,
                annee: b.annee,
                budget: b.budget.toNumber(),
                montant_restant: b.montant_restant.toNumber(),
                est_active: b.est_active,
                est_cloture: b.est_cloture,
                date_debut: b.date_debut,
                date_fin: b.date_fin,
                createdAt: b.createdAt,
              })),
            }
          : null,
        departements: budgetsDepartements.map((b) => ({
          id: b.id,
          reference: b.reference,
          departement: b.departement.nom,
          departementId: b.departementId,
          montant_alloue: b.montant_alloue.toNumber(),
          montant_utilise: b.montant_utilise.toNumber(),
          montant_restant: b.montant_restant.toNumber(),
          bloquer: b.bloquer,
          createdAt: b.createdAt,
        })),
        personnels: budgetsPersonnels.map((b) => ({
          id: b.id,
          reference: b.reference,
          matricule: b.matricule,
          user: b.user,
          montant_alloue: b.montant_alloue.toNumber(),
          montant_utilise: b.montant_utilise.toNumber(),
          montant_restant: b.montant_restant.toNumber(),
          bloquer: b.bloquer,
          createdAt: b.createdAt,
        })),
        audit: auditBudget.map((a) => ({
          id: a.id,
          reference: a.reference,
          action: a.action,
          type_source: a.type_source,
          type_destination: a.type_destination,
          montant: a.montant?.toNumber(),
          montant_avant: a.montant_avant?.toNumber(),
          montant_apres: a.montant_apres?.toNumber(),
          description: a.description,
          effectue_par: a.effectue_par,
          effectue_par_id: a.effectue_par_id,
          role_effectue_par: a.role_effectue_par,
          target_matricule: a.target_matricule,
          createdAt: a.createdAt,
        })),
      },
    })
  } catch (error) {
    console.error('Error getting dashboard details:', error)
    res.status(500).json({
      message: 'Erreur lors de la récupération des détails',
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

export const getGlobalAnalytics = async (req: Request, res: Response): Promise<void> => {
  const user = req.user

  if (user?.role !== 'SUPERADMIN') {
    throw new ForbiddenError()
  }

  // Récupérer l'année depuis les query params (défaut: année courante)
  const anneeParam = req.query['annee']
  const annee = anneeParam ? parseInt(String(anneeParam)) : new Date().getFullYear()

  console.log('Global analytics - SUPERADMIN:', { annee })

  try {
    // Filtre par année pour les dates
    const debutAnnee = new Date(annee, 0, 1)
    const finAnnee = new Date(annee, 11, 31, 23, 59, 59)

    // Statistiques globales entreprises
    const totalEntreprises = await prisma.entreprise.count()
    const entreprisesActives = await prisma.entreprise.count({ where: { is_active: true } })
    const entreprisesInactives = totalEntreprises - entreprisesActives

    // Statistiques globales utilisateurs
    const totalUsers = await prisma.user.count()
    const totalManagers = await prisma.user.count({ where: { role: 'MANAGER' } })
    const totalEmployes = await prisma.user.count({ where: { role: 'EMPLOYE' } })
    const totalConsultants = await prisma.user.count({ where: { role: 'CONSULTANT' } })
    const usersBloques = await prisma.user.count({ where: { is_block: true } })

    // Statistiques globales départements
    const totalDepartements = await prisma.departement.count()

    // Statistiques globales demandes de voyage pour l'année
    const totalDemandesVoyage = await prisma.demandeVoyage.count({
      where: { createdAt: { gte: debutAnnee, lte: finAnnee } },
    })

    const demandesParStatut = await prisma.demandeVoyage.groupBy({
      by: ['statut'],
      where: { createdAt: { gte: debutAnnee, lte: finAnnee } },
      _count: true,
    })

    // Statistiques globales réservations de billets pour l'année
    const totalReservationsBillets = await prisma.reservationBillet.count({
      where: { createdAt: { gte: debutAnnee, lte: finAnnee } },
    })

    const reservationsBilletsParStatut = await prisma.reservationBillet.groupBy({
      by: ['statut'],
      where: { createdAt: { gte: debutAnnee, lte: finAnnee } },
      _count: true,
    })

    // Statistiques globales réservations d'hôtels pour l'année
    const totalReservationsHotels = await prisma.reservationHotel.count({
      where: { createdAt: { gte: debutAnnee, lte: finAnnee } },
    })

    const reservationsHotelsParStatut = await prisma.reservationHotel.groupBy({
      by: ['statut'],
      where: { createdAt: { gte: debutAnnee, lte: finAnnee } },
      _count: true,
    })

    // Statistiques globales budgets pour l'année
    const budgetsAnnuels = await prisma.budgetAnnuel.findMany({
      where: { annee: annee },
    })

    const totalBudgetAnnee = budgetsAnnuels.reduce((sum, b) => sum + b.budget.toNumber(), 0)
    const totalMontantRestantAnnee = budgetsAnnuels.reduce((sum, b) => sum + b.montant_restant.toNumber(), 0)
    const budgetsActifs = budgetsAnnuels.filter((b) => b.est_active).length
    const budgetsClotures = budgetsAnnuels.filter((b) => b.est_cloture).length

    const references = budgetsAnnuels.map((b) => b.reference)
    const budgetsDepartements = references.length > 0
      ? await prisma.budgetDepartement.findMany({
          where: { reference: { in: references } },
        })
      : []

    const budgetsPersonnels = references.length > 0
      ? await prisma.budgetPersonnel.findMany({
          where: { reference: { in: references } },
        })
      : []

    const totalBudgetDepartements = budgetsDepartements.reduce((sum, b) => sum + b.montant_alloue.toNumber(), 0)
    const totalBudgetDepartementsUtilise = budgetsDepartements.reduce((sum, b) => sum + b.montant_utilise.toNumber(), 0)
    const totalBudgetDepartementsRestant = budgetsDepartements.reduce((sum, b) => sum + b.montant_restant.toNumber(), 0)

    const totalBudgetPersonnels = budgetsPersonnels.reduce((sum, b) => sum + b.montant_alloue.toNumber(), 0)
    const totalBudgetPersonnelsUtilise = budgetsPersonnels.reduce((sum, b) => sum + b.montant_utilise.toNumber(), 0)
    const totalBudgetPersonnelsRestant = budgetsPersonnels.reduce((sum, b) => sum + b.montant_restant.toNumber(), 0)

    const budgetsDepartementsBloques = budgetsDepartements.filter((b) => b.bloquer).length
    const budgetsPersonnelsBloques = budgetsPersonnels.filter((b) => b.bloquer).length

    // Statistiques par entreprise
    const entreprises = await prisma.entreprise.findMany({
      include: {
        _count: {
          select: {
            users: true,
            departements: true,
            demandesVoyage: true,
          },
        },
        forfait: true,
      },
    })

    const entreprisesStats = entreprises.map((e) => ({
      id: e.id,
      nom: e.nom,
      identifiant: e.identifiant,
      is_active: e.is_active,
      totalEmployes: e._count.users,
      totalDepartements: e._count.departements,
      totalDemandesVoyage: e._count.demandesVoyage,
      forfait: e.forfait ? {
        nombre_user_autorise: e.forfait.nombre_user_autorise,
        nombre_user_actuel: e.forfait.nombre_user_actuel,
      } : null,
    }))

    // Top 5 entreprises par nombre d'employés
    const topEntreprisesEmployes = [...entreprisesStats]
      .sort((a, b) => b.totalEmployes - a.totalEmployes)
      .slice(0, 5)

    // Top 5 entreprises par nombre de demandes de voyage
    const topEntreprisesDemandes = [...entreprisesStats]
      .sort((a, b) => b.totalDemandesVoyage - a.totalDemandesVoyage)
      .slice(0, 5)

    // Statistiques mensuelles des demandes de voyage pour l'année
    const demandesParMois = await prisma.demandeVoyage.groupBy({
      by: ['createdAt'],
      where: { createdAt: { gte: debutAnnee, lte: finAnnee } },
      _count: true,
    })

    const demandesMensuelles = Array.from({ length: 12 }, (_, i) => {
      const mois = i + 1
      const count = demandesParMois.filter((d) => {
        const date = new Date(d.createdAt)
        return date.getMonth() + 1 === mois
      }).reduce((sum, d) => sum + d._count, 0)
      return { mois, count }
    })

    res.status(200).json({
      annee,
      entreprises: {
        total: totalEntreprises,
        actives: entreprisesActives,
        inactives: entreprisesInactives,
        topEmployes: topEntreprisesEmployes,
        topDemandes: topEntreprisesDemandes,
        details: entreprisesStats,
      },
      utilisateurs: {
        total: totalUsers,
        managers: totalManagers,
        employes: totalEmployes,
        consultants: totalConsultants,
        bloques: usersBloques,
      },
      departements: {
        total: totalDepartements,
      },
      demandesVoyage: {
        total: totalDemandesVoyage,
        parStatut: demandesParStatut.map((d) => ({
          statut: d.statut,
          count: d._count,
        })),
        mensuelles: demandesMensuelles,
      },
      reservations: {
        billets: {
          total: totalReservationsBillets,
          parStatut: reservationsBilletsParStatut.map((r) => ({
            statut: r.statut,
            count: r._count,
          })),
        },
        hotels: {
          total: totalReservationsHotels,
          parStatut: reservationsHotelsParStatut.map((r) => ({
            statut: r.statut,
            count: r._count,
          })),
        },
      },
      budget: {
        annuel: {
          total: totalBudgetAnnee,
          montant_restant: totalMontantRestantAnnee,
          nombreBudgets: budgetsAnnuels.length,
          actifs: budgetsActifs,
          clotures: budgetsClotures,
        },
        departements: {
          total: budgetsDepartements.length,
          totalAlloue: totalBudgetDepartements,
          totalUtilise: totalBudgetDepartementsUtilise,
          totalRestant: totalBudgetDepartementsRestant,
          bloques: budgetsDepartementsBloques,
        },
        personnels: {
          total: budgetsPersonnels.length,
          totalAlloue: totalBudgetPersonnels,
          totalUtilise: totalBudgetPersonnelsUtilise,
          totalRestant: totalBudgetPersonnelsRestant,
          bloques: budgetsPersonnelsBloques,
        },
      },
    })
  } catch (error) {
    console.error('Error getting global analytics:', error)
    res.status(500).json({
      message: 'Erreur lors de la récupération des analytiques globales',
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
