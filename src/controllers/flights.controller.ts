import type { Request, Response } from 'express'
import { Duffel } from '@duffel/api'
import prisma from '../lib/prismaClient'

if (!process.env.DUFFEL_API_KEY) {
  throw new Error('DUFFEL_API_KEY environment variable is required')
}

const duffel = new Duffel({
  token: process.env.DUFFEL_API_KEY,
})

// Taux de conversion vers FCFA
const CONVERSION_RATES = {
  USD: 550,
  EUR: 650,
  XOF: 1,
}

function convertToFCFA(amount: string, currency: string): number {
  const rate = CONVERSION_RATES[currency as keyof typeof CONVERSION_RATES] || 1
  return parseFloat(amount) * rate
}

export const searchFlights = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      origin,
      destination,
      departureDate,
      returnDate,
      passengers = 1,
      cabinClass = 'economy',
      maxStops,
      limit = 20,
      offset = 0,
    } = req.body as {
      origin?: string
      destination?: string
      departureDate?: string
      returnDate?: string
      passengers?: number
      cabinClass?: string
      maxStops?: number
      limit?: number
      offset?: number
    }

    if (!origin || !destination || !departureDate) {
      res.status(400).json({ message: 'origin, destination et departureDate sont requis' })
      return
    }

    console.log('Recherche de vols avec SDK Duffel:', {
      origin,
      destination,
      departureDate,
      returnDate,
      passengers,
      cabinClass,
      maxStops,
      limit,
      offset,
    })

    const slices: any[] = [
      {
        origin: origin,
        destination: destination,
        departure_date: departureDate,
      },
    ]

    if (returnDate) {
      slices.push({
        origin: destination,
        destination: origin,
        departure_date: returnDate,
      })
    }

    const offerRequestParams: any = {
      slices,
      passengers: [
        {
          type: 'adult',
        },
      ],
      cabin_class: cabinClass,
    }

    if (maxStops !== undefined) {
      offerRequestParams.max_connections = maxStops
    }

    const offerRequest = await duffel.offerRequests.create(offerRequestParams)

    console.log('Offer Request créé:', offerRequest.data.id)

    const offers = await duffel.offers.list({
      offer_request_id: offerRequest.data.id,
    })

    console.log('Offres récupérées:', offers.data.length)

    // Pagination
    const paginatedOffers = offers.data.slice(offset, offset + limit)

    res.status(200).json({
      offer_request_id: offerRequest.data.id,
      offers: paginatedOffers,
      pagination: {
        total: offers.data.length,
        limit,
        offset,
        has_more: offset + limit < offers.data.length,
      },
    })
  } catch (error) {
    console.error('Error searching flights with Duffel SDK:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      errorDetails: error,
      requestBody: req.body,
    })
    res.status(500).json({
      message: 'Erreur lors de la recherche de vols',
      error: error instanceof Error ? error.message : String(error),
      errorDetails: error,
    })
  }
}

export const bookFlight = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      selected_offers,
      matricule,
      passenger_id,
      demandeVoyageId,
    } = req.body as {
      selected_offers?: string[]
      matricule?: string
      passenger_id?: string
      demandeVoyageId?: number
    }

    if (!selected_offers || selected_offers.length === 0 || !matricule || !passenger_id || !demandeVoyageId) {
      res.status(400).json({ message: 'selected_offers, matricule, passenger_id et demandeVoyageId sont requis' })
      return
    }

    console.log('Réservation de vol avec SDK Duffel:', {
      selected_offers,
      matricule,
      passenger_id,
    })

    // Récupérer l'utilisateur depuis la base de données
    const user = await prisma.user.findUnique({
      where: { matricule },
      select: {
        id: true,
        prenom: true,
        nom: true,
        civilite: true,
        email: true,
        telephone: true,
        genre: true,
        numero_passport: true,
        date_expiration_passport: true,
        entrepriseId: true,
        matricule: true,
        role: true,
      },
    })

    if (!user) {
      res.status(404).json({ message: 'Utilisateur non trouvé' })
      return
    }

    // Vérifier que les informations de passeport sont présentes (obligatoires pour la réservation)
    if (!user.numero_passport || !user.date_expiration_passport) {
      res.status(400).json({ 
        message: 'Les informations de passeport (numéro et date d\'expiration) sont obligatoires pour la réservation' 
      })
      return
    }

    // Construire l'objet passager avec les informations de l'utilisateur
    const passenger: any = {
      id: passenger_id,
      given_name: user.prenom,
      family_name: user.nom,
      born_on: '1990-01-01', // TODO: Ajouter date_naissance au modèle User
    }

    if (user.civilite) passenger.title = user.civilite.toLowerCase()
    if (user.email) passenger.email = user.email
    if (user.telephone) passenger.phone_number = user.telephone
    if (user.genre) passenger.gender = user.genre.toLowerCase()

    // Les informations de passeport sont obligatoires (validées ci-dessus)
    passenger.identity_documents = [
      {
        type: 'passport',
        number: user.numero_passport,
        expires_on: user.date_expiration_passport.toISOString().split('T')[0],
        issuing_country_code: 'SN',
        unique_identifier: user.numero_passport,
      },
    ]

    // Refresh l'offre avant de créer l'ordre
    const refreshedOffer = await duffel.offers.get(selected_offers[0]!)
    console.log('Offre rafraîchie:', refreshedOffer.data.id)

    // Vérifier le budget de l'utilisateur avant de confirmer la réservation
    const budgetPersonnel = await prisma.budgetPersonnel.findFirst({
      where: { matricule },
    })

    if (!budgetPersonnel) {
      res.status(404).json({ message: 'Aucun budget trouvé pour cet utilisateur' })
      return
    }

    if (budgetPersonnel.bloquer) {
      res.status(403).json({ message: 'Budget bloqué pour cet utilisateur' })
      return
    }

    const totalAmount = refreshedOffer.data.total_amount
    const totalCurrency = refreshedOffer.data.total_currency
    const montantFCFA = convertToFCFA(totalAmount, totalCurrency)
    const budgetRestant = budgetPersonnel.montant_restant.toNumber()

    console.log('Vérification budget:', {
      matricule,
      montantFCFA,
      budgetRestant,
      devise: totalCurrency,
    })

    if (budgetRestant < montantFCFA) {
      res.status(400).json({
        message: 'Budget insuffisant',
        budgetRestant,
        montantRequis: montantFCFA,
        devise: totalCurrency,
      })
      return
    }

    const orderParams: any = {
      type: 'instant',
      selected_offers,
      passengers: [passenger],
    }

    // Utiliser les prix de l'offre rafraîchie
    if (refreshedOffer.data.payment_requirements) {
      orderParams.payments = [
        {
          type: 'balance',
          currency: refreshedOffer.data.total_currency,
          amount: refreshedOffer.data.total_amount,
        },
      ]
    }

    const order = await duffel.orders.create(orderParams)

    console.log('Order créé:', order.data.id)

    // Mettre à jour ReservationBillet avec les informations de la réservation Duffel
    // on utilise demandeVoyageId pour identifier la réservation
    console.log('Recherche ReservationBillet avec demandeVoyageId:', demandeVoyageId)
    const reservationBillet = await prisma.reservationBillet.findFirst({
      where: { demandeVoyageId: demandeVoyageId },
    })

    console.log('ReservationBillet trouvé:', reservationBillet ? reservationBillet.id : 'Non trouvé')

    if (!reservationBillet) {
      res.status(404).json({ message: 'Aucune réservation de billet trouvée pour cet utilisateur' })
      return
    }

    // Vérifier que la réservation est en attente
    if (reservationBillet.statut !== 'EN_ATTENTE') {
      res.status(409).json({
        message: 'Cette réservation n\'est pas en attente',
        statutActuel: reservationBillet.statut,
      })
      return
    }

    if (reservationBillet) {
      const bookingReference = order.data.booking_reference
      const totalAmount = order.data.total_amount
      const totalCurrency = order.data.total_currency
      const uniqueIdentifier = order.data.documents?.[0]?.unique_identifier
      const ownerName = order.data.owner?.name
      const firstSlice = order.data.slices?.[0]
      const firstSegment = firstSlice?.segments?.[0]
      const lastSegment = firstSlice?.segments?.[firstSlice.segments.length - 1]
      const secondSlice = order.data.slices?.[1]
      const secondFirstSegment = secondSlice?.segments?.[0]
      const secondLastSegment = secondSlice?.segments?.[secondSlice.segments.length - 1]

      console.log('Données à mettre à jour:', {
        bookingReference,
        totalAmount,
        totalCurrency,
        uniqueIdentifier,
        ownerName,
        numeroVolAller: firstSegment?.marketing_carrier_flight_number,
        numeroVolRetour: secondFirstSegment?.marketing_carrier_flight_number,
        aeroportDepart: firstSegment?.origin?.iata_code,
        aeroportArrivee: lastSegment?.destination?.iata_code,
        dateVolDepart: firstSegment?.departing_at,
        dateVolArrivee: lastSegment?.arriving_at,
        dateVolRetourDepart: secondFirstSegment?.departing_at,
        dateVolRetourArrivee: secondLastSegment?.arriving_at,
        classe: firstSegment?.passengers?.[0]?.cabin_class,
      })

      try {
        const montantFCFA = convertToFCFA(totalAmount, totalCurrency)
        const nouveauMontantUtilise = budgetPersonnel.montant_utilise.toNumber() + montantFCFA
        const nouveauMontantRestant = budgetPersonnel.montant_restant.toNumber() - montantFCFA

        await prisma.$transaction([
          prisma.reservationBillet.update({
            where: { id: reservationBillet.id },
            data: {
              numeroReservation: bookingReference ?? null,
              numeroOrder: order.data.id ?? null,
              compagnieAerienne: ownerName ?? null,
              numeroVolAller: firstSegment?.marketing_carrier_flight_number ?? null,
              numeroVolRetour: secondFirstSegment?.marketing_carrier_flight_number ?? null,
              dateVolDepart: firstSegment?.departing_at ? new Date(firstSegment.departing_at) : null,
              dateVolArrivee: lastSegment?.arriving_at ? new Date(lastSegment.arriving_at) : null,
              dateVolRetourDepart: secondFirstSegment?.departing_at ? new Date(secondFirstSegment.departing_at) : null,
              dateVolRetourArrivee: secondLastSegment?.arriving_at ? new Date(secondLastSegment.arriving_at) : null,
              aeroportDepart: firstSegment?.origin?.iata_code ?? null,
              aeroportArrivee: lastSegment?.destination?.iata_code ?? null,
              classe: firstSegment?.passengers?.[0]?.cabin_class || 'Y',
              prix: totalAmount,
              devise: totalCurrency || 'XOF',
              statut: 'EMISE',
              numeroBillet: uniqueIdentifier ?? null,
              dateEmission: order.data.created_at ? new Date(order.data.created_at) : null,
            },
          }),
          prisma.budgetPersonnel.update({
            where: { id: budgetPersonnel.id },
            data: {
              montant_utilise: nouveauMontantUtilise,
              montant_restant: nouveauMontantRestant,
            },
          }),
          prisma.auditBudget.create({
            data: {
              reference: budgetPersonnel.reference,
              entrepriseId: user.entrepriseId,
              action: 'RESERVATION_BILLET',
              type_source: 'BUDGET_PERSONNEL',
              type_destination: 'RESERVATION_BILLET',
              montant: montantFCFA,
              montant_avant: budgetRestant,
              montant_apres: nouveauMontantRestant,
              description: `Réservation de vol - Référence: ${bookingReference}`,
              effectue_par: user.matricule,
              effectue_par_id: user.id,
              role_effectue_par: user.role,
              target_matricule: user.matricule,
            },
          }),
        ])

        console.log('Transaction réussie: ReservationBillet, BudgetPersonnel et AuditBudget mis à jour')
      } catch (updateError) {
        console.error('Erreur lors de la transaction de mise à jour:', updateError)
        throw updateError
      }
    } else {
      console.log('Aucun ReservationBillet trouvé pour ce matricule')
    }

    res.status(200).json(order.data)
  } catch (error) {
    console.error('Error booking flight with Duffel SDK:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      errorDetails: error,
      requestBody: req.body,
    })

    // Extraire les détails de l'erreur Duffel si disponibles
    const duffelError = error as any
    const duffelErrors = duffelError?.errors || []
    const duffelMeta = duffelError?.meta || {}

    res.status(500).json({
      message: 'Erreur lors de la réservation du vol',
      error: error instanceof Error ? error.message : String(error),
      duffelErrors,
      duffelMeta,
    })
  }
}

export const bookGroupFlight = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      selected_offers,
      matricules,
      passenger_ids,
      demandeVoyageIds,
    } = req.body as {
      selected_offers?: string[]
      matricules?: string[]
      passenger_ids?: string[]
      demandeVoyageIds?: number[]
    }

    if (!selected_offers || selected_offers.length === 0) {
      res.status(400).json({ message: 'selected_offers est requis' })
      return
    }

    if (!matricules || matricules.length === 0) {
      res.status(400).json({ message: 'matricules est requis (tableau non vide)' })
      return
    }

    if (!passenger_ids || passenger_ids.length === 0) {
      res.status(400).json({ message: 'passenger_ids est requis (tableau non vide)' })
      return
    }

    if (!demandeVoyageIds || demandeVoyageIds.length === 0) {
      res.status(400).json({ message: 'demandeVoyageIds est requis (tableau non vide)' })
      return
    }

    if (matricules.length !== passenger_ids.length || matricules.length !== demandeVoyageIds.length) {
      res.status(400).json({ 
        message: 'Les tableaux matricules, passenger_ids et demandeVoyageIds doivent avoir la même longueur' 
      })
      return
    }

    console.log('Réservation de vol groupé avec SDK Duffel:', {
      selected_offers,
      matricules,
      passenger_ids,
      demandeVoyageIds,
    })

    // Récupérer tous les utilisateurs depuis la base de données
    const users = await Promise.all(
      matricules.map((matricule) =>
        prisma.user.findUnique({
          where: { matricule },
          select: {
            id: true,
            prenom: true,
            nom: true,
            civilite: true,
            email: true,
            telephone: true,
            genre: true,
            numero_passport: true,
            date_expiration_passport: true,
            entrepriseId: true,
            matricule: true,
            role: true,
          },
        })
      )
    )

    // Vérifier que tous les utilisateurs existent
    const missingUsers = users.filter((u) => !u)
    if (missingUsers.length > 0) {
      res.status(404).json({ 
        message: 'Certains utilisateurs n\'ont pas été trouvés',
        missingMatricules: matricules.filter((_, i) => !users[i]),
      })
      return
    }

    // Vérifier que les informations de passeport sont présentes pour tous les utilisateurs
    const usersWithoutPassport = users.filter(
      (u) => !u?.numero_passport || !u?.date_expiration_passport
    )
    if (usersWithoutPassport.length > 0) {
      res.status(400).json({ 
        message: 'Les informations de passeport (numéro et date d\'expiration) sont obligatoires pour tous les passagers',
        usersWithoutPassport: usersWithoutPassport.map((u) => u?.matricule),
      })
      return
    }

    // Construire le tableau de passagers pour Duffel
    const passengers = users.map((user, index) => {
      const passenger: any = {
        id: passenger_ids[index],
        given_name: user!.prenom,
        family_name: user!.nom,
        born_on: '1990-01-01', // TODO: Ajouter date_naissance au modèle User
      }

      if (user!.civilite) passenger.title = user!.civilite.toLowerCase()
      if (user!.email) passenger.email = user!.email
      if (user!.telephone) passenger.phone_number = user!.telephone
      if (user!.genre) passenger.gender = user!.genre.toLowerCase()

      passenger.identity_documents = [
        {
          type: 'passport',
          number: user!.numero_passport,
          expires_on: user!.date_expiration_passport!.toISOString().split('T')[0],
          issuing_country_code: 'SN',
          unique_identifier: user!.numero_passport,
        },
      ]

      return passenger
    })

    // Refresh l'offre avant de créer l'ordre
    const refreshedOffer = await duffel.offers.get(selected_offers[0]!)
    console.log('Offre rafraîchie:', refreshedOffer.data.id)

    // Vérifier le budget de chaque utilisateur avant de confirmer la réservation
    const budgetsPersonnels = await Promise.all(
      matricules.map((matricule) =>
        prisma.budgetPersonnel.findFirst({
          where: { matricule },
        })
      )
    )

    const missingBudgets = budgetsPersonnels.filter((b) => !b)
    if (missingBudgets.length > 0) {
      res.status(404).json({ 
        message: 'Certains utilisateurs n\'ont pas de budget',
        missingMatricules: matricules.filter((_, i) => !budgetsPersonnels[i]),
      })
      return
    }

    const blockedBudgets = budgetsPersonnels.filter((b) => b?.bloquer)
    if (blockedBudgets.length > 0) {
      res.status(403).json({ 
        message: 'Certains budgets sont bloqués',
        blockedMatricules: budgetsPersonnels
          .filter((b) => b?.bloquer)
          .map((b, i) => matricules[i]),
      })
      return
    }

    const totalAmount = refreshedOffer.data.total_amount
    const totalCurrency = refreshedOffer.data.total_currency
    const montantFCFA = convertToFCFA(totalAmount, totalCurrency)

    // Vérifier que chaque utilisateur a un budget suffisant
    const insufficientBudgets = budgetsPersonnels.filter(
      (b) => b!.montant_restant.toNumber() < montantFCFA
    )
    if (insufficientBudgets.length > 0) {
      res.status(400).json({
        message: 'Certains utilisateurs ont un budget insuffisant',
        insufficientMatricules: budgetsPersonnels
          .filter((b) => b!.montant_restant.toNumber() < montantFCFA)
          .map((b, i) => matricules[i]),
        montantRequis: montantFCFA,
      })
      return
    }

    const orderParams: any = {
      type: 'instant',
      selected_offers,
      passengers,
    }

    // Utiliser les prix de l'offre rafraîchie
    if (refreshedOffer.data.payment_requirements) {
      orderParams.payments = [
        {
          type: 'balance',
          currency: refreshedOffer.data.total_currency,
          amount: refreshedOffer.data.total_amount,
        },
      ]
    }

    const order = await duffel.orders.create(orderParams)

    console.log('Order groupé créé:', order.data.id)

    // Récupérer toutes les réservations de billets
    const reservationsBillets = await Promise.all(
      demandeVoyageIds.map((demandeVoyageId) =>
        prisma.reservationBillet.findFirst({
          where: { demandeVoyageId },
        })
      )
    )

    const missingReservations = reservationsBillets.filter((r) => !r)
    if (missingReservations.length > 0) {
      res.status(404).json({ 
        message: 'Certaines réservations de billet n\'ont pas été trouvées',
        missingDemandeVoyageIds: demandeVoyageIds.filter((_, i) => !reservationsBillets[i]),
      })
      return
    }

    // Vérifier que toutes les réservations sont en attente
    const notPendingReservations = reservationsBillets.filter((r) => r?.statut !== 'EN_ATTENTE')
    if (notPendingReservations.length > 0) {
      res.status(409).json({
        message: 'Certaines réservations ne sont pas en attente',
        notPendingDemandeVoyageIds: reservationsBillets
          .filter((r) => r?.statut !== 'EN_ATTENTE')
          .map((r, i) => demandeVoyageIds[i]),
      })
      return
    }

    // Préparer les données de mise à jour pour toutes les réservations
    const bookingReference = order.data.booking_reference
    const totalAmountOrder = order.data.total_amount
    const totalCurrencyOrder = order.data.total_currency
    const uniqueIdentifier = order.data.documents?.[0]?.unique_identifier
    const ownerName = order.data.owner?.name
    const firstSlice = order.data.slices?.[0]
    const firstSegment = firstSlice?.segments?.[0]
    const lastSegment = firstSlice?.segments?.[firstSlice.segments.length - 1]
    const secondSlice = order.data.slices?.[1]
    const secondFirstSegment = secondSlice?.segments?.[0]
    const secondLastSegment = secondSlice?.segments?.[secondSlice.segments.length - 1]

    // Préparer les transactions de mise à jour
    const updateOperations = []

    for (let i = 0; i < reservationsBillets.length; i++) {
      const reservation = reservationsBillets[i]!
      const user = users[i]!
      const budget = budgetsPersonnels[i]!

      const nouveauMontantUtilise = budget.montant_utilise.toNumber() + montantFCFA
      const nouveauMontantRestant = budget.montant_restant.toNumber() - montantFCFA

      updateOperations.push(
        prisma.reservationBillet.update({
          where: { id: reservation.id },
          data: {
            numeroReservation: bookingReference ?? null,
            numeroOrder: order.data.id ?? null,
            compagnieAerienne: ownerName ?? null,
            numeroVolAller: firstSegment?.marketing_carrier_flight_number ?? null,
            numeroVolRetour: secondFirstSegment?.marketing_carrier_flight_number ?? null,
            dateVolDepart: firstSegment?.departing_at ? new Date(firstSegment.departing_at) : null,
            dateVolArrivee: lastSegment?.arriving_at ? new Date(lastSegment.arriving_at) : null,
            dateVolRetourDepart: secondFirstSegment?.departing_at ? new Date(secondFirstSegment.departing_at) : null,
            dateVolRetourArrivee: secondLastSegment?.arriving_at ? new Date(secondLastSegment.arriving_at) : null,
            aeroportDepart: firstSegment?.origin?.iata_code ?? null,
            aeroportArrivee: lastSegment?.destination?.iata_code ?? null,
            classe: firstSegment?.passengers?.[0]?.cabin_class || 'Y',
            prix: totalAmountOrder,
            devise: totalCurrencyOrder || 'XOF',
            statut: 'EMISE',
            numeroBillet: uniqueIdentifier ?? null,
            dateEmission: order.data.created_at ? new Date(order.data.created_at) : null,
          },
        }),
        prisma.budgetPersonnel.update({
          where: { id: budget.id },
          data: {
            montant_utilise: nouveauMontantUtilise,
            montant_restant: nouveauMontantRestant,
          },
        }),
        prisma.auditBudget.create({
          data: {
            reference: budget.reference,
            entrepriseId: user.entrepriseId,
            action: 'RESERVATION_BILLET',
            type_source: 'BUDGET_PERSONNEL',
            type_destination: 'RESERVATION_BILLET',
            montant: montantFCFA,
            montant_avant: budget.montant_restant.toNumber(),
            montant_apres: nouveauMontantRestant,
            description: `Réservation de vol groupé - Référence: ${bookingReference}`,
            effectue_par: user.matricule,
            effectue_par_id: user.id,
            role_effectue_par: user.role,
            target_matricule: user.matricule,
          },
        })
      )
    }

    // Exécuter toutes les opérations dans une transaction
    await prisma.$transaction(updateOperations)

    console.log('Transaction groupée réussie: ReservationBillet, BudgetPersonnel et AuditBudget mis à jour pour tous les passagers')

    res.status(200).json({
      order: order.data,
      passengers: matricules,
      totalPassengers: matricules.length,
    })
  } catch (error) {
    console.error('Error booking group flight with Duffel SDK:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      errorDetails: error,
      requestBody: req.body,
    })

    // Extraire les détails de l'erreur Duffel si disponibles
    const duffelError = error as any
    const duffelErrors = duffelError?.errors || []
    const duffelMeta = duffelError?.meta || {}

    res.status(500).json({
      message: 'Erreur lors de la réservation du vol',
      error: error instanceof Error ? error.message : String(error),
      errorDetails: error,
      duffelErrors,
      duffelMeta,
    })
  }
}

export const getOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params['id'])

    if (!id) {
      res.status(400).json({ message: 'ID de commande requis' })
      return
    }

    console.log('Récupération de la commande Duffel:', id)

    const order = await duffel.orders.get(id)

    console.log('Commande récupérée:', order.data.id)

    res.status(200).json(order.data)
  } catch (error) {
    console.error('Error getting order from Duffel SDK:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      errorDetails: error,
      orderId: req.params.id,
    })

    // Extraire les détails de l'erreur Duffel si disponibles
    const duffelError = error as any
    const duffelErrors = duffelError?.errors || []
    const duffelMeta = duffelError?.meta || {}

    res.status(500).json({
      message: 'Erreur lors de la récupération de la commande',
      error: error instanceof Error ? error.message : String(error),
      errorDetails: error,
      duffelErrors,
      duffelMeta,
    })
  }
}

export const cancelOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.body as {
      orderId?: string
    }

    if (!orderId) {
      res.status(400).json({ message: 'orderId est requis' })
      return
    }

    console.log('Vérification des conditions d\'annulation pour l\'ordre:', orderId)

    // Créer un quote d'annulation via Duffel pour vérifier les conditions
    const cancellationQuote = await duffel.orderCancellations.create({
      order_id: orderId,
    })

    console.log('Quote d\'annulation Duffel créé:', cancellationQuote.data.id)

    res.status(200).json(cancellationQuote)
  } catch (error) {
    console.error('Error creating cancellation quote with Duffel SDK:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      errorDetails: error,
      requestBody: req.body,
    })

    // Extraire les détails de l'erreur Duffel si disponibles
    const duffelError = error as any
    const duffelErrors = duffelError?.errors || []
    const duffelMeta = duffelError?.meta || {}

    // Retourner l'erreur Duffel telle quelle pour que le frontend puisse gérer
    res.status(duffelMeta?.status || 500).json({
      errors: duffelErrors,
      meta: duffelMeta,
    })
  }
}

export const confirmOrderCancellation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.body as {
      orderId?: string
    }

    if (!orderId) {
      res.status(400).json({ message: 'orderId est requis' })
      return
    }

    console.log('Annulation de commande Duffel:', orderId)

    // Récupérer la réservation de billet correspondant à l'orderId
    const reservationBillet = await prisma.reservationBillet.findFirst({
      where: { numeroOrder: orderId },
    })

    if (!reservationBillet) {
      res.status(404).json({ message: 'Réservation de billet non trouvée' })
      return
    }

    // Vérifier que la réservation n'est pas déjà annulée
    if (reservationBillet.statut === 'ANNULEE') {
      res.status(409).json({ message: 'Cette réservation est déjà annulée' })
      return
    }

    // Récupérer l'utilisateur pour le remboursement et l'audit
    const user = await prisma.user.findUnique({
      where: { matricule: reservationBillet.matricule || '' },
      select: {
        id: true,
        prenom: true,
        nom: true,
        entrepriseId: true,
        matricule: true,
        role: true,
      },
    })

    if (!user) {
      res.status(404).json({ message: 'Utilisateur non trouvé' })
      return
    }

    // Récupérer le budget personnel de l'utilisateur
    const budgetPersonnel = await prisma.budgetPersonnel.findFirst({
      where: { matricule: user.matricule },
    })

    if (!budgetPersonnel) {
      res.status(404).json({ message: 'Aucun budget trouvé pour cet utilisateur' })
      return
    }

    // Étape 1: Créer un quote d'annulation via Duffel
    const cancellationQuote = await duffel.orderCancellations.create({
      order_id: orderId,
    })

    console.log('Quote d\'annulation Duffel créé:', cancellationQuote.data.id)

    const cancellationId = cancellationQuote.data.id

    // Étape 2: Confirmer l'annulation avec l'ID du quote
    const confirmedCancellation = await duffel.orderCancellations.confirm(cancellationId)

    console.log('Annulation Duffel confirmée:', confirmedCancellation.data.id)

    // Étape 3: Mettre à jour la base de données après annulation réussie
    const montantFCFA = reservationBillet.prix ? convertToFCFA(reservationBillet.prix.toString(), reservationBillet.devise || 'XOF') : 0
    const nouveauMontantUtilise = Math.max(0, budgetPersonnel.montant_utilise.toNumber() - montantFCFA)
    const nouveauMontantRestant = budgetPersonnel.montant_restant.toNumber() + montantFCFA

    await prisma.$transaction([
      prisma.reservationBillet.update({
        where: { id: reservationBillet.id },
        data: {
          statut: 'ANNULEE',
          commentaire: `Annulation via Duffel - Cancellation ID: ${confirmedCancellation.data.id}`,
        },
      }),
      prisma.budgetPersonnel.update({
        where: { id: budgetPersonnel.id },
        data: {
          montant_utilise: nouveauMontantUtilise,
          montant_restant: nouveauMontantRestant,
        },
      }),
      prisma.auditBudget.create({
        data: {
          reference: budgetPersonnel.reference,
          entrepriseId: user.entrepriseId,
          action: 'ANNULATION_BILLET',
          type_source: 'RESERVATION_BILLET',
          type_destination: 'BUDGET_PERSONNEL',
          montant: montantFCFA,
          montant_avant: budgetPersonnel.montant_restant.toNumber(),
          montant_apres: nouveauMontantRestant,
          description: `Annulation de vol - Order ID: ${orderId}`,
          effectue_par: user.matricule,
          effectue_par_id: user.id,
          role_effectue_par: user.role,
          target_matricule: user.matricule,
        },
      }),
    ])

    console.log('Transaction réussie: ReservationBillet, BudgetPersonnel et AuditBudget mis à jour')

    res.status(200).json(confirmedCancellation)
  } catch (error) {
    console.error('Error confirming order cancellation with Duffel SDK:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      errorDetails: error,
      requestBody: req.body,
    })

    // Extraire les détails de l'erreur Duffel si disponibles
    const duffelError = error as any
    const duffelErrors = duffelError?.errors || []
    const duffelMeta = duffelError?.meta || {}

    // Retourner l'erreur Duffel telle quelle pour que le frontend puisse gérer
    res.status(duffelMeta?.status || 500).json({
      errors: duffelErrors,
      meta: duffelMeta,
    })
  }
}

export const searchFlightsAdvanced = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      dateDepart,
      dateRetour,
      aeroportDepart,
      aeroportArrivee,
      classe,
      nombrePassenger,
    } = req.body as {
      dateDepart?: string
      dateRetour?: string
      aeroportDepart?: string
      aeroportArrivee?: string
      classe?: string
      nombrePassenger?: number
    }

    if (!dateDepart || !aeroportDepart || !aeroportArrivee || !classe || !nombrePassenger) {
      res.status(400).json({
        message: 'dateDepart, aeroportDepart, aeroportArrivee, classe et nombrePassenger sont requis',
      })
      return
    }

    console.log('Recherche de vols avancée avec SDK Duffel:', {
      dateDepart,
      dateRetour,
      aeroportDepart,
      aeroportArrivee,
      classe,
      nombrePassenger,
    })

    const slices: any[] = [
      {
        origin: aeroportDepart,
        destination: aeroportArrivee,
        departure_date: dateDepart,
      },
    ]

    if (dateRetour) {
      slices.push({
        origin: aeroportArrivee,
        destination: aeroportDepart,
        departure_date: dateRetour,
      })
    }

    const passengers = Array.from({ length: nombrePassenger }, () => ({ type: 'adult' }))

    const offerRequestParams: any = {
      slices,
      passengers,
      cabin_class: classe,
    }

    const offerRequest = await duffel.offerRequests.create(offerRequestParams)

    console.log('Offer Request créé:', offerRequest.data.id)

    const offers = await duffel.offers.list({
      offer_request_id: offerRequest.data.id,
    })

    console.log('Offres récupérées:', offers.data.length)

    res.status(200).json({
      offer_request_id: offerRequest.data.id,
      offers: offers.data,
      total: offers.data.length,
    })
  } catch (error) {
    console.error('Error searching flights with Duffel SDK:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      errorDetails: error,
      requestBody: req.body,
    })
    res.status(500).json({
      message: 'Erreur lors de la recherche de vols',
      error: error instanceof Error ? error.message : String(error),
      errorDetails: error,
    })
  }
}
