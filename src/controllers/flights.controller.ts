import type { Request, Response } from "express";
import { Duffel } from "@duffel/api";
import { Prisma } from "@prisma/client";
import prisma from "../lib/prismaClient";
import {
  AppError,
  BadRequestError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
  DuffelApiError,
} from "../utils/AppError";
import { parseStringParam } from "../utils/validation";
import { sendReservationTicketEmail } from "../services/ticket-email.service";

if (!process.env.DUFFEL_API_KEY) {
  throw new Error("DUFFEL_API_KEY environment variable is required");
}

const duffel = new Duffel({
  token: process.env.DUFFEL_API_KEY,
});

// Taux de conversion vers FCFA
const CONVERSION_RATES = {
  USD: 550,
  EUR: 650,
  XOF: 1,
};

function convertToFCFA(amount: string, currency: string): number {
  const rate = CONVERSION_RATES[currency as keyof typeof CONVERSION_RATES] || 1;
  return parseFloat(amount) * rate;
}

interface FlightUser {
  id: number;
  prenom: string | null;
  nom: string | null;
  civilite: string | null;
  email: string | null;
  telephone: string | null;
  genre: string | null;
  code_pays: string | null;
  numero_passport: string | null;
  date_expiration_passport: Date | null;
  date_naissance: Date | null;
  entrepriseId: number;
  matricule: string;
  role: string;
  entreprise?: { identifiant: string | null } | null;
}

type PassportUser = FlightUser & {
  numero_passport: string;
  date_expiration_passport: Date;
};

function assertPassport(user: FlightUser): asserts user is PassportUser {
  if (!user.numero_passport || !user.date_expiration_passport) {
    throw new BadRequestError(
      "Les informations de passeport (numéro et date d'expiration) sont obligatoires pour la réservation",
      "MISSING_PASSPORT",
    );
  }
}

function buildPassenger(
  passengerId: string,
  user: PassportUser,
): Record<string, unknown> {
  const passenger: Record<string, unknown> = {
    id: passengerId,
    given_name: user.prenom,
    family_name: user.nom,
    born_on: user.date_naissance?.toISOString().split("T")[0] ?? "1990-01-01",
  };

  if (user.civilite) passenger.title = user.civilite.toLowerCase();
  if (user.email) passenger.email = user.email;
  if (user.telephone) passenger.phone_number = user.telephone;
  if (user.genre) passenger.gender = user.genre.toLowerCase();

  passenger.identity_documents = [
    {
      type: "passport",
      number: user.numero_passport,
      expires_on: user.date_expiration_passport.toISOString().split("T")[0],
      issuing_country_code: user.code_pays ?? "SN",
      unique_identifier: user.numero_passport,
    },
  ];

  return passenger;
}

const FLIGHT_USER_SELECT = {
  id: true,
  prenom: true,
  nom: true,
  civilite: true,
  email: true,
  telephone: true,
  genre: true,
  code_pays: true,
  numero_passport: true,
  date_expiration_passport: true,
  date_naissance: true,
  entrepriseId: true,
  matricule: true,
  role: true,
  entreprise: { select: { identifiant: true } },
} satisfies Prisma.UserSelect;

async function fetchFlightUser(matricule: string): Promise<FlightUser> {
  const user = await prisma.user.findUnique({
    where: { matricule },
    select: FLIGHT_USER_SELECT,
  });
  if (!user) {
    throw new NotFoundError("Utilisateur non trouvé", "USER_NOT_FOUND");
  }
  return user as unknown as FlightUser;
}

interface OrderSegments {
  firstSegment: any;
  lastSegment: any;
  secondFirstSegment: any;
  secondLastSegment: any;
  isRoundTrip: boolean;
}

function extractOrderSegments(order: any): OrderSegments {
  const firstSlice = order.data.slices?.[0];
  const firstSegment = firstSlice?.segments?.[0];
  const lastSegment = firstSlice?.segments?.[firstSlice.segments.length - 1];
  const secondSlice = order.data.slices?.[1];
  const secondFirstSegment = secondSlice?.segments?.[0];
  const secondLastSegment =
    secondSlice?.segments?.[secondSlice.segments.length - 1];

  return {
    firstSegment,
    lastSegment,
    secondFirstSegment,
    secondLastSegment,
    isRoundTrip: !!secondSlice,
  };
}

interface ReservationBilletInput {
  segments: OrderSegments;
  totalAmount: string;
  totalCurrency: string;
  bookingReference?: string | undefined;
  orderId: string;
  ownerName?: string | undefined;
  uniqueIdentifier?: string | undefined;
  createdAt?: string | undefined;
}

function buildReservationBilletData(input: ReservationBilletInput): any {
  const { firstSegment, lastSegment, secondFirstSegment, secondLastSegment } =
    input.segments;

  return {
    numeroReservation: input.bookingReference ?? null,
    numeroOrder: input.orderId ?? null,
    compagnieAerienne: input.ownerName ?? null,
    numeroVolAller: firstSegment?.marketing_carrier_flight_number ?? null,
    numeroVolRetour:
      secondFirstSegment?.marketing_carrier_flight_number ?? null,
    dateVolDepart: firstSegment?.departing_at
      ? new Date(firstSegment.departing_at)
      : null,
    dateVolArrivee: lastSegment?.arriving_at
      ? new Date(lastSegment.arriving_at)
      : null,
    dateVolRetourDepart: secondFirstSegment?.departing_at
      ? new Date(secondFirstSegment.departing_at)
      : null,
    dateVolRetourArrivee: secondLastSegment?.arriving_at
      ? new Date(secondLastSegment.arriving_at)
      : null,
    aeroportDepart: firstSegment?.origin?.iata_code ?? null,
    aeroportArrivee: lastSegment?.destination?.iata_code ?? null,
    classe: firstSegment?.passengers?.[0]?.cabin_class || "Y",
    prix: input.totalAmount,
    devise: input.totalCurrency || "XOF",
    statut: "EMISE",
    numeroBillet: input.uniqueIdentifier ?? null,
    dateEmission: input.createdAt ? new Date(input.createdAt) : null,
  };
}

interface AuditBudgetInput {
  reference: string;
  entrepriseId: number;
  action: string;
  type_source: string;
  type_destination: string;
  montant: number;
  montant_avant: number;
  montant_apres: number;
  description: string;
  effectue_par: string;
  effectue_par_id: number;
  role_effectue_par: string;
  target_matricule: string;
}

function buildAuditBudgetData(input: AuditBudgetInput): AuditBudgetInput {
  return input;
}

function handleFlightError(error: unknown, message: string): never {
  if (error instanceof AppError) {
    throw error;
  }

  const duffelError = error as any;
  const duffelErrors = duffelError?.errors || [];
  const duffelMeta = duffelError?.meta || {};
  const status =
    typeof duffelMeta?.status === "number" ? duffelMeta.status : 500;
  const firstDuffelError = duffelErrors[0] as
    | { message?: string; title?: string }
    | undefined;
  const detailedMessage = firstDuffelError?.message || firstDuffelError?.title;

  throw new DuffelApiError(
    detailedMessage ? `${message}: ${detailedMessage}` : message,
    duffelErrors,
    duffelMeta,
    status,
  );
}

function handleCancellationError(error: unknown): never {
  if (error instanceof AppError) {
    throw error;
  }

  const duffelError = error as any;
  const duffelErrors = duffelError?.errors || [];
  const duffelMeta = duffelError?.meta || {};
  const status =
    typeof duffelMeta?.status === "number" ? duffelMeta.status : 500;

  throw new DuffelApiError(
    "Erreur Duffel lors de l'annulation",
    duffelErrors,
    duffelMeta,
    status,
  );
}

interface BookFlightBody {
  selected_offers: string[];
  matricule: string;
  passenger_id: string;
  demandeVoyageId: number;
}

function validateBookFlightBody(body: unknown): BookFlightBody {
  if (!body || typeof body !== "object") {
    throw new BadRequestError("Corps de requête invalide", "INVALID_BODY");
  }
  const { selected_offers, matricule, passenger_id, demandeVoyageId } =
    body as Record<string, unknown>;
  if (
    !Array.isArray(selected_offers) ||
    selected_offers.length === 0 ||
    !selected_offers.every((o) => typeof o === "string" && o.length > 0)
  ) {
    throw new BadRequestError(
      "selected_offers doit être un tableau de chaînes non vide",
      "INVALID_SELECTED_OFFERS",
    );
  }
  if (typeof matricule !== "string" || !matricule.trim()) {
    throw new BadRequestError("matricule requis", "INVALID_MATRICULE");
  }
  if (typeof passenger_id !== "string" || !passenger_id.trim()) {
    throw new BadRequestError("passenger_id requis", "INVALID_PASSENGER_ID");
  }
  if (
    typeof demandeVoyageId !== "number" ||
    !Number.isInteger(demandeVoyageId)
  ) {
    throw new BadRequestError(
      "demandeVoyageId requis",
      "INVALID_DEMANDE_VOYAGE_ID",
    );
  }
  return {
    selected_offers: selected_offers as string[],
    matricule: matricule.trim(),
    passenger_id: passenger_id.trim(),
    demandeVoyageId,
  };
}

interface GroupFlightBody {
  selected_offers: string[];
  matricules: string[];
  passenger_ids: string[];
  demandeVoyageIds: number[];
}

function validateGroupFlightBody(body: unknown): GroupFlightBody {
  if (!body || typeof body !== "object") {
    throw new BadRequestError("Corps de requête invalide", "INVALID_BODY");
  }
  const { selected_offers, matricules, passenger_ids, demandeVoyageIds } =
    body as Record<string, unknown>;
  if (
    !Array.isArray(selected_offers) ||
    selected_offers.length === 0 ||
    !selected_offers.every((o) => typeof o === "string" && o.length > 0)
  ) {
    throw new BadRequestError(
      "selected_offers doit être un tableau de chaînes non vide",
      "INVALID_SELECTED_OFFERS",
    );
  }
  if (
    !Array.isArray(matricules) ||
    matricules.length === 0 ||
    !matricules.every((m) => typeof m === "string" && m.trim())
  ) {
    throw new BadRequestError(
      "matricules requis (tableau non vide)",
      "INVALID_MATRICULES",
    );
  }
  if (
    !Array.isArray(passenger_ids) ||
    passenger_ids.length === 0 ||
    !passenger_ids.every((p) => typeof p === "string" && p.trim())
  ) {
    throw new BadRequestError(
      "passenger_ids requis (tableau non vide)",
      "INVALID_PASSENGER_IDS",
    );
  }
  if (
    !Array.isArray(demandeVoyageIds) ||
    demandeVoyageIds.length === 0 ||
    !demandeVoyageIds.every((d) => typeof d === "number" && Number.isInteger(d))
  ) {
    throw new BadRequestError(
      "demandeVoyageIds requis (tableau non vide)",
      "INVALID_DEMANDE_VOYAGE_IDS",
    );
  }
  if (
    matricules.length !== passenger_ids.length ||
    matricules.length !== demandeVoyageIds.length
  ) {
    throw new BadRequestError(
      "Les tableaux matricules, passenger_ids et demandeVoyageIds doivent avoir la même longueur",
      "LENGTH_MISMATCH",
    );
  }
  return {
    selected_offers: selected_offers as string[],
    matricules: matricules as string[],
    passenger_ids: passenger_ids as string[],
    demandeVoyageIds: demandeVoyageIds as number[],
  };
}

interface GroupFlightDirectBody {
  selected_offers: string[];
  matricules: string[];
  passenger_ids: string[];
}

function validateGroupFlightDirectBody(body: unknown): GroupFlightDirectBody {
  if (!body || typeof body !== "object") {
    throw new BadRequestError("Corps de requête invalide", "INVALID_BODY");
  }
  const { selected_offers, matricules, passenger_ids } = body as Record<
    string,
    unknown
  >;
  if (
    !Array.isArray(selected_offers) ||
    selected_offers.length === 0 ||
    !selected_offers.every((o) => typeof o === "string" && o.length > 0)
  ) {
    throw new BadRequestError(
      "selected_offers doit être un tableau de chaînes non vide",
      "INVALID_SELECTED_OFFERS",
    );
  }
  if (
    !Array.isArray(matricules) ||
    matricules.length === 0 ||
    !matricules.every((m) => typeof m === "string" && m.trim())
  ) {
    throw new BadRequestError(
      "matricules requis (tableau non vide)",
      "INVALID_MATRICULES",
    );
  }
  if (
    !Array.isArray(passenger_ids) ||
    passenger_ids.length === 0 ||
    !passenger_ids.every((p) => typeof p === "string" && p.trim())
  ) {
    throw new BadRequestError(
      "passenger_ids requis (tableau non vide)",
      "INVALID_PASSENGER_IDS",
    );
  }
  if (matricules.length !== passenger_ids.length) {
    throw new BadRequestError(
      "Les tableaux matricules et passenger_ids doivent avoir la même longueur",
      "LENGTH_MISMATCH",
    );
  }
  if (new Set(matricules).size !== matricules.length) {
    throw new BadRequestError(
      "Un employé ne peut être associé qu'à un seul passager",
      "DUPLICATE_PASSENGER_ASSIGNMENT",
    );
  }
  return {
    selected_offers: selected_offers as string[],
    matricules: matricules as string[],
    passenger_ids: passenger_ids as string[],
  };
}

interface SearchFlightsBody {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string | undefined;
  passengers: number;
  cabinClass: string;
  maxStops?: number | undefined;
  limit: number;
  offset: number;
}

function validateSearchFlightsBody(body: unknown): SearchFlightsBody {
  if (!body || typeof body !== "object") {
    throw new BadRequestError("Corps de requête invalide", "INVALID_BODY");
  }
  const {
    origin,
    destination,
    departureDate,
    returnDate,
    passengers,
    cabinClass,
    maxStops,
    limit,
    offset,
  } = body as Record<string, unknown>;

  if (
    typeof origin !== "string" ||
    !origin.trim() ||
    typeof destination !== "string" ||
    !destination.trim() ||
    typeof departureDate !== "string" ||
    !departureDate.trim()
  ) {
    throw new BadRequestError(
      "origin, destination et departureDate sont requis",
      "MISSING_FIELDS",
    );
  }

  const passengerCount =
    typeof passengers === "number" &&
    Number.isInteger(passengers) &&
    passengers >= 1 &&
    passengers <= 9
      ? passengers
      : undefined;
  if (passengerCount === undefined) {
    throw new BadRequestError(
      "passengers doit être un entier entre 1 et 9",
      "INVALID_PASSENGERS",
    );
  }

  const cabin =
    typeof cabinClass === "string" && cabinClass.trim()
      ? cabinClass
      : "economy";

  const maxConnections =
    typeof maxStops === "number" && Number.isInteger(maxStops) && maxStops >= 0
      ? maxStops
      : undefined;
  if (maxStops !== undefined && maxConnections === undefined) {
    throw new BadRequestError(
      "maxStops doit être un entier positif",
      "INVALID_MAX_STOPS",
    );
  }

  const limitNumber =
    typeof limit === "number" && Number.isInteger(limit) && limit > 0
      ? limit
      : 20;
  const offsetNumber =
    typeof offset === "number" && Number.isInteger(offset) && offset >= 0
      ? offset
      : 0;

  return {
    origin,
    destination,
    departureDate,
    returnDate:
      typeof returnDate === "string" && returnDate.trim()
        ? returnDate
        : undefined,
    passengers: passengerCount,
    cabinClass: cabin,
    maxStops: maxConnections,
    limit: limitNumber,
    offset: offsetNumber,
  };
}

interface SearchFlightsAdvancedBody {
  dateDepart: string;
  dateRetour?: string | undefined;
  aeroportDepart: string;
  aeroportArrivee: string;
  classe: string;
  nombrePassenger: number;
}

function validateSearchFlightsAdvancedBody(
  body: unknown,
): SearchFlightsAdvancedBody {
  if (!body || typeof body !== "object") {
    throw new BadRequestError("Corps de requête invalide", "INVALID_BODY");
  }
  const {
    dateDepart,
    dateRetour,
    aeroportDepart,
    aeroportArrivee,
    classe,
    nombrePassenger,
  } = body as Record<string, unknown>;

  if (
    typeof dateDepart !== "string" ||
    !dateDepart.trim() ||
    typeof aeroportDepart !== "string" ||
    !aeroportDepart.trim() ||
    typeof aeroportArrivee !== "string" ||
    !aeroportArrivee.trim() ||
    typeof classe !== "string" ||
    !classe.trim()
  ) {
    throw new BadRequestError(
      "dateDepart, aeroportDepart, aeroportArrivee et classe sont requis",
      "MISSING_FIELDS",
    );
  }

  const passengerCount =
    typeof nombrePassenger === "number" &&
    Number.isInteger(nombrePassenger) &&
    nombrePassenger >= 1 &&
    nombrePassenger <= 9
      ? nombrePassenger
      : undefined;
  if (passengerCount === undefined) {
    throw new BadRequestError(
      "nombrePassenger doit être un entier entre 1 et 9",
      "INVALID_PASSENGER_COUNT",
    );
  }

  return {
    dateDepart,
    dateRetour:
      typeof dateRetour === "string" && dateRetour.trim()
        ? dateRetour
        : undefined,
    aeroportDepart,
    aeroportArrivee,
    classe,
    nombrePassenger: passengerCount,
  };
}

interface DuffelSlice {
  origin: string;
  destination: string;
  departure_date: string;
}

function buildDuffelOfferRequest(params: {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string | undefined;
  passengerCount: number;
  cabinClass: string;
  maxStops?: number | undefined;
}): any {
  const slices: DuffelSlice[] = [
    {
      origin: params.origin,
      destination: params.destination,
      departure_date: params.departureDate,
    },
  ];

  if (params.returnDate) {
    slices.push({
      origin: params.destination,
      destination: params.origin,
      departure_date: params.returnDate,
    });
  }

  const offerRequestParams: any = {
    slices,
    passengers: Array.from({ length: params.passengerCount }, () => ({
      type: "adult",
    })),
    cabin_class: params.cabinClass,
  };

  if (params.maxStops !== undefined) {
    offerRequestParams.max_connections = params.maxStops;
  }

  return offerRequestParams;
}

function handleSearchError(error: unknown, message: string): never {
  if (error instanceof AppError) {
    throw error;
  }

  throw new DuffelApiError(
    message,
    [],
    { originalError: error instanceof Error ? error.message : String(error) },
    500,
    "DUFFEL_SEARCH_ERROR",
  );
}

function handleGetOrderError(error: unknown, message: string): never {
  if (error instanceof AppError) {
    throw error;
  }

  const duffelError = error as any;
  const duffelErrors = duffelError?.errors || [];
  const duffelMeta = duffelError?.meta || {};
  const status =
    typeof duffelMeta?.status === "number" ? duffelMeta.status : 500;

  throw new DuffelApiError(message, duffelErrors, duffelMeta, status);
}

function handleAirportSuggestionError(error: unknown): never {
  if (error instanceof AppError) {
    throw error;
  }

  throw new DuffelApiError(
    "Erreur lors de la recherche des aéroports",
    [],
    { originalError: error instanceof Error ? error.message : String(error) },
    500,
    "DUFFEL_AIRPORT_ERROR",
  );
}

export const searchFlights = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const {
      origin,
      destination,
      departureDate,
      returnDate,
      passengers,
      cabinClass,
      maxStops,
      limit,
      offset,
    } = validateSearchFlightsBody(req.body);

    const offerRequestParams = buildDuffelOfferRequest({
      origin,
      destination,
      departureDate,
      returnDate,
      passengerCount: passengers,
      cabinClass,
      maxStops,
    });

    const offerRequest = await duffel.offerRequests.create(offerRequestParams);

    const offers = await duffel.offers.list({
      offer_request_id: offerRequest.data.id,
    });

    const paginatedOffers = offers.data.slice(offset, offset + limit);

    res.status(200).json({
      offer_request_id: offerRequest.data.id,
      offers: paginatedOffers,
      pagination: {
        total: offers.data.length,
        limit,
        offset,
        has_more: offset + limit < offers.data.length,
      },
    });
  } catch (error) {
    handleSearchError(error, "Erreur lors de la recherche de vols");
  }
};

export const bookFlight = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { selected_offers, matricule, passenger_id, demandeVoyageId } =
      validateBookFlightBody(req.body);

    const user = await fetchFlightUser(matricule);

    assertPassport(user);

    const passenger = buildPassenger(passenger_id, user);

    // Refresh l'offre avant de créer l'ordre
    const refreshedOffer = await duffel.offers.get(selected_offers[0]!);

    // Vérifier le budget de l'utilisateur avant de confirmer la réservation
    const budgetPersonnel = await prisma.budgetPersonnel.findFirst({
      where: { matricule },
    });

    if (!budgetPersonnel) {
      throw new NotFoundError("Budget personnel");
    }

    if (budgetPersonnel.bloquer) {
      throw new ForbiddenError(
        "Budget bloqué pour cet utilisateur",
        "BUDGET_BLOQUE",
      );
    }

    const totalAmount = refreshedOffer.data.total_amount;
    const totalCurrency = refreshedOffer.data.total_currency;
    const montantFCFA = convertToFCFA(totalAmount, totalCurrency);
    const budgetRestant = budgetPersonnel.montant_restant.toNumber();

    if (budgetRestant < montantFCFA) {
      throw new BadRequestError(
        `Budget insuffisant. Restant: ${budgetRestant}, requis: ${montantFCFA} ${totalCurrency}`,
        "INSUFFICIENT_BUDGET",
      );
    }

    const orderParams: any = {
      type: "instant",
      selected_offers,
      passengers: [passenger],
    };

    // Utiliser les prix de l'offre rafraîchie
    if (refreshedOffer.data.payment_requirements) {
      orderParams.payments = [
        {
          type: "balance",
          currency: refreshedOffer.data.total_currency,
          amount: refreshedOffer.data.total_amount,
        },
      ];
    }

    const order = await duffel.orders.create(orderParams);

    const reservationBillet = await prisma.reservationBillet.findFirst({
      where: { demandeVoyageId },
    });

    if (!reservationBillet) {
      throw new NotFoundError("Réservation de billet");
    }

    // Vérifier que la réservation est en attente
    if (reservationBillet.statut !== "EN_ATTENTE") {
      throw new ConflictError(
        `Cette réservation n'est pas en attente (statut: ${reservationBillet.statut})`,
        "RESERVATION_NOT_PENDING",
      );
    }

    const bookingReference = order.data.booking_reference;
    const orderTotalAmount = order.data.total_amount;
    const orderTotalCurrency = order.data.total_currency;
    const uniqueIdentifier = order.data.documents?.[0]?.unique_identifier;
    const ownerName = order.data.owner?.name;
    const segments = extractOrderSegments(order);

    const reservationData = buildReservationBilletData({
      segments,
      totalAmount: orderTotalAmount,
      totalCurrency: orderTotalCurrency,
      bookingReference,
      orderId: order.data.id,
      ownerName,
      uniqueIdentifier,
      createdAt: order.data.created_at,
    });

    const nouveauMontantUtilise =
      budgetPersonnel.montant_utilise.toNumber() + montantFCFA;
    const nouveauMontantRestant =
      budgetPersonnel.montant_restant.toNumber() - montantFCFA;

    await prisma.$transaction([
      prisma.reservationBillet.update({
        where: { id: reservationBillet.id },
        data: reservationData,
      }),
      prisma.budgetPersonnel.update({
        where: { id: budgetPersonnel.id },
        data: {
          montant_utilise: nouveauMontantUtilise,
          montant_restant: nouveauMontantRestant,
        },
      }),
      prisma.auditBudget.create({
        data: buildAuditBudgetData({
          reference: budgetPersonnel.reference,
          entrepriseId: user.entrepriseId,
          action: "RESERVATION_BILLET",
          type_source: "BUDGET_PERSONNEL",
          type_destination: "RESERVATION_BILLET",
          montant: montantFCFA,
          montant_avant: budgetRestant,
          montant_apres: nouveauMontantRestant,
          description: `Réservation de vol - Référence: ${bookingReference}`,
          effectue_par: user.matricule,
          effectue_par_id: user.id,
          role_effectue_par: user.role,
          target_matricule: user.matricule,
        }),
      }),
    ]);

    const ticketEmail = await sendReservationTicketEmail(reservationBillet.id);
    res.status(200).json({ ...order.data, ticketEmail });
  } catch (error) {
    handleFlightError(error, "Erreur lors de la réservation du vol");
  }
};

export const bookGroupFlight = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { selected_offers, matricules, passenger_ids, demandeVoyageIds } =
      validateGroupFlightBody(req.body);

    const users = await Promise.all(
      matricules.map((matricule) =>
        prisma.user.findUnique({
          where: { matricule },
          select: FLIGHT_USER_SELECT,
        }),
      ),
    );

    const missingUserIndexes = users
      .map((u, i) => (!u ? i : -1))
      .filter((i) => i !== -1);
    if (missingUserIndexes.length > 0) {
      throw new BadRequestError(
        `Certains utilisateurs n'ont pas été trouvés: ${missingUserIndexes.map((i) => matricules[i]).join(", ")}`,
        "USERS_NOT_FOUND",
      );
    }

    const validUsers = users.filter(
      (u) => u !== null,
    ) as unknown as FlightUser[];

    const usersWithoutPassport = validUsers.filter(
      (u) => !u.numero_passport || !u.date_expiration_passport,
    );
    if (usersWithoutPassport.length > 0) {
      throw new BadRequestError(
        `Les informations de passeport sont obligatoires pour: ${usersWithoutPassport.map((u) => u.matricule).join(", ")}`,
        "PASSPORT_REQUIRED",
      );
    }

    const passengers = validUsers.map((user, index) => {
      assertPassport(user);
      return buildPassenger(passenger_ids[index]!, user);
    });

    // Refresh l'offre avant de créer l'ordre
    const refreshedOffer = await duffel.offers.get(selected_offers[0]!);

    // Vérifier le budget de chaque utilisateur avant de confirmer la réservation
    const budgetsPersonnels = await Promise.all(
      matricules.map((matricule) =>
        prisma.budgetPersonnel.findFirst({
          where: { matricule },
        }),
      ),
    );

    const missingBudgets = budgetsPersonnels.filter((b) => !b);
    if (missingBudgets.length > 0) {
      throw new BadRequestError(
        `Certains utilisateurs n'ont pas de budget: ${matricules.filter((_, i) => !budgetsPersonnels[i]).join(", ")}`,
        "BUDGET_NOT_FOUND",
      );
    }

    const blockedBudgets = budgetsPersonnels.filter((b) => b?.bloquer);
    if (blockedBudgets.length > 0) {
      throw new ForbiddenError(
        `Certains budgets sont bloqués: ${budgetsPersonnels
          .filter((b) => b?.bloquer)
          .map((b, i) => matricules[i])
          .join(", ")}`,
        "BUDGET_BLOCKED",
      );
    }

    const totalAmount = refreshedOffer.data.total_amount;
    const totalCurrency = refreshedOffer.data.total_currency;
    const montantFCFA = convertToFCFA(totalAmount, totalCurrency);

    // Vérifier que chaque utilisateur a un budget suffisant
    const insufficientBudgets = budgetsPersonnels.filter(
      (b) => b!.montant_restant.toNumber() < montantFCFA,
    );
    if (insufficientBudgets.length > 0) {
      throw new BadRequestError(
        `Certains utilisateurs ont un budget insuffisant (${montantFCFA} requis): ${budgetsPersonnels
          .filter((b) => b!.montant_restant.toNumber() < montantFCFA)
          .map((b, i) => matricules[i])
          .join(", ")}`,
        "INSUFFICIENT_BUDGETS",
      );
    }

    const orderParams: any = {
      type: "instant",
      selected_offers,
      passengers,
    };

    // Utiliser les prix de l'offre rafraîchie
    if (refreshedOffer.data.payment_requirements) {
      orderParams.payments = [
        {
          type: "balance",
          currency: refreshedOffer.data.total_currency,
          amount: refreshedOffer.data.total_amount,
        },
      ];
    }

    const order = await duffel.orders.create(orderParams);

    // Récupérer toutes les réservations de billets
    const reservationsBillets = await Promise.all(
      demandeVoyageIds.map((demandeVoyageId) =>
        prisma.reservationBillet.findFirst({
          where: { demandeVoyageId },
        }),
      ),
    );

    const missingReservations = reservationsBillets.filter((r) => !r);
    if (missingReservations.length > 0) {
      throw new BadRequestError(
        `Certaines réservations de billet n'ont pas été trouvées: ${demandeVoyageIds
          .filter((_, i) => !reservationsBillets[i])
          .join(", ")}`,
        "RESERVATIONS_NOT_FOUND",
      );
    }

    // Vérifier que toutes les réservations sont en attente
    const notPendingReservations = reservationsBillets.filter(
      (r) => r?.statut !== "EN_ATTENTE",
    );
    if (notPendingReservations.length > 0) {
      throw new ConflictError(
        `Certaines réservations ne sont pas en attente: ${reservationsBillets
          .filter((r) => r?.statut !== "EN_ATTENTE")
          .map((r, i) => String(demandeVoyageIds[i]))
          .join(", ")}`,
        "RESERVATIONS_NOT_PENDING",
      );
    }

    const bookingReference = order.data.booking_reference;
    const orderTotalAmount = order.data.total_amount;
    const orderTotalCurrency = order.data.total_currency;
    const uniqueIdentifier = order.data.documents?.[0]?.unique_identifier;
    const ownerName = order.data.owner?.name;
    const segments = extractOrderSegments(order);

    const reservationData = buildReservationBilletData({
      segments,
      totalAmount: orderTotalAmount,
      totalCurrency: orderTotalCurrency,
      bookingReference,
      orderId: order.data.id,
      ownerName,
      uniqueIdentifier,
      createdAt: order.data.created_at,
    });

    const updateOperations = [];

    for (let i = 0; i < reservationsBillets.length; i++) {
      const reservation = reservationsBillets[i]!;
      const user = validUsers[i]!;
      const budget = budgetsPersonnels[i]!;

      const nouveauMontantUtilise =
        budget.montant_utilise.toNumber() + montantFCFA;
      const nouveauMontantRestant =
        budget.montant_restant.toNumber() - montantFCFA;

      updateOperations.push(
        prisma.reservationBillet.update({
          where: { id: reservation.id },
          data: reservationData,
        }),
        prisma.budgetPersonnel.update({
          where: { id: budget.id },
          data: {
            montant_utilise: nouveauMontantUtilise,
            montant_restant: nouveauMontantRestant,
          },
        }),
        prisma.auditBudget.create({
          data: buildAuditBudgetData({
            reference: budget.reference,
            entrepriseId: user.entrepriseId,
            action: "RESERVATION_BILLET",
            type_source: "BUDGET_PERSONNEL",
            type_destination: "RESERVATION_BILLET",
            montant: montantFCFA,
            montant_avant: budget.montant_restant.toNumber(),
            montant_apres: nouveauMontantRestant,
            description: `Réservation de vol groupé - Référence: ${bookingReference}`,
            effectue_par: user.matricule,
            effectue_par_id: user.id,
            role_effectue_par: user.role,
            target_matricule: user.matricule,
          }),
        }),
      );
    }

    await prisma.$transaction(updateOperations);

    const ticketEmails = await Promise.all(
      reservationsBillets.map((reservation) =>
        sendReservationTicketEmail(reservation!.id),
      ),
    );
    res.status(200).json({
      order: order.data,
      passengers: matricules,
      totalPassengers: matricules.length,
      ticketEmails,
    });
  } catch (error) {
    handleFlightError(error, "Erreur lors de la réservation du vol");
  }
};

export const bookGroupFlightDirect = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { selected_offers, matricules, passenger_ids } =
      validateGroupFlightDirectBody(req.body);

    const users = await Promise.all(
      matricules.map((matricule) =>
        prisma.user.findUnique({
          where: { matricule },
          select: FLIGHT_USER_SELECT,
        }),
      ),
    );

    const missingUserIndexes = users
      .map((u, i) => (!u ? i : -1))
      .filter((i) => i !== -1);
    if (missingUserIndexes.length > 0) {
      throw new BadRequestError(
        `Certains utilisateurs n'ont pas été trouvés: ${missingUserIndexes.map((i) => matricules[i]).join(", ")}`,
        "USERS_NOT_FOUND",
      );
    }

    const validUsers = users.filter(
      (u) => u !== null,
    ) as unknown as FlightUser[];

    const usersWithoutPassport = validUsers.filter(
      (u) => !u.numero_passport || !u.date_expiration_passport,
    );
    if (usersWithoutPassport.length > 0) {
      throw new BadRequestError(
        `Les informations de passeport sont obligatoires pour: ${usersWithoutPassport.map((u) => u.matricule).join(", ")}`,
        "PASSPORT_REQUIRED",
      );
    }

    const passengers = validUsers.map((user, index) => {
      assertPassport(user);
      return buildPassenger(passenger_ids[index]!, user);
    });

    // Refresh l'offre avant de créer l'ordre
    const refreshedOffer = await duffel.offers.get(selected_offers[0]!);

    // Vérifier le budget de chaque utilisateur avant de confirmer la réservation
    const budgetsPersonnels = await Promise.all(
      matricules.map((matricule) =>
        prisma.budgetPersonnel.findFirst({
          where: { matricule },
        }),
      ),
    );

    const missingBudgets = budgetsPersonnels.filter((b) => !b);
    if (missingBudgets.length > 0) {
      throw new BadRequestError(
        `Certains utilisateurs n'ont pas de budget: ${matricules.filter((_, i) => !budgetsPersonnels[i]).join(", ")}`,
        "BUDGET_NOT_FOUND",
      );
    }

    const blockedBudgets = budgetsPersonnels.filter((b) => b?.bloquer);
    if (blockedBudgets.length > 0) {
      throw new ForbiddenError(
        `Certains budgets sont bloqués: ${budgetsPersonnels
          .filter((b) => b?.bloquer)
          .map((b, i) => matricules[i])
          .join(", ")}`,
        "BUDGET_BLOCKED",
      );
    }

    const totalAmount = refreshedOffer.data.total_amount;
    const totalCurrency = refreshedOffer.data.total_currency;
    const montantFCFA = convertToFCFA(totalAmount, totalCurrency);

    // Vérifier que chaque utilisateur a un budget suffisant
    const insufficientBudgets = budgetsPersonnels.filter(
      (b) => b!.montant_restant.toNumber() < montantFCFA,
    );
    if (insufficientBudgets.length > 0) {
      throw new BadRequestError(
        `Certains utilisateurs ont un budget insuffisant (${montantFCFA} requis): ${budgetsPersonnels
          .filter((b) => b!.montant_restant.toNumber() < montantFCFA)
          .map((b, i) => matricules[i])
          .join(", ")}`,
        "INSUFFICIENT_BUDGETS",
      );
    }

    const orderParams: any = {
      type: "instant",
      selected_offers,
      passengers,
    };

    // Utiliser les prix de l'offre rafraîchie
    if (refreshedOffer.data.payment_requirements) {
      orderParams.payments = [
        {
          type: "balance",
          currency: refreshedOffer.data.total_currency,
          amount: refreshedOffer.data.total_amount,
        },
      ];
    }

    const order = await duffel.orders.create(orderParams);

    const bookingReference = order.data.booking_reference;
    const orderTotalAmount = order.data.total_amount;
    const orderTotalCurrency = order.data.total_currency;
    const uniqueIdentifier = order.data.documents?.[0]?.unique_identifier;
    const ownerName = order.data.owner?.name;
    const segments = extractOrderSegments(order);

    const reservationData = buildReservationBilletData({
      segments,
      totalAmount: orderTotalAmount,
      totalCurrency: orderTotalCurrency,
      bookingReference,
      orderId: order.data.id,
      ownerName,
      uniqueIdentifier,
      createdAt: order.data.created_at,
    });

    const createdReservationIds: number[] = [];
    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < validUsers.length; i++) {
        const user = validUsers[i]!;
        const budget = budgetsPersonnels[i]!;

        const nouveauMontantUtilise =
          budget.montant_utilise.toNumber() + montantFCFA;
        const nouveauMontantRestant =
          budget.montant_restant.toNumber() - montantFCFA;

        const demandeVoyage = await tx.demandeVoyage.create({
          data: {
            matricule: user.matricule,
            identifiant_entreprise: user.entreprise?.identifiant || "",
            depart: segments.firstSegment?.origin?.iata_code || "",
            arrive: segments.lastSegment?.destination?.iata_code || "",
            allerRetour: segments.isRoundTrip,
            dateDepart: segments.firstSegment?.departing_at
              ? new Date(segments.firstSegment.departing_at)
              : new Date(),
            dateRetour: segments.secondFirstSegment?.departing_at
              ? new Date(segments.secondFirstSegment.departing_at)
              : null,
            classe: segments.firstSegment?.passengers?.[0]?.cabin_class || "Y",
            hotel: "NON_INCLUS",
            motif: "Réservation directe",
            statut: "APPROUVEE",
          },
        });

        const reservationBillet = await tx.reservationBillet.create({
          data: {
            ...reservationData,
            demandeVoyageId: demandeVoyage.id,
            matricule: user.matricule,
            allerRetour: segments.isRoundTrip,
          },
        });
        createdReservationIds.push(reservationBillet.id);

        await tx.budgetPersonnel.update({
          where: { id: budget.id },
          data: {
            montant_utilise: nouveauMontantUtilise,
            montant_restant: nouveauMontantRestant,
          },
        });

        await tx.auditBudget.create({
          data: buildAuditBudgetData({
            reference: budget.reference,
            entrepriseId: user.entrepriseId,
            action: "RESERVATION_BILLET",
            type_source: "BUDGET_PERSONNEL",
            type_destination: "RESERVATION_BILLET",
            montant: montantFCFA,
            montant_avant: budget.montant_restant.toNumber(),
            montant_apres: nouveauMontantRestant,
            description: `Réservation de vol groupé directe - Référence: ${bookingReference}`,
            effectue_par: user.matricule,
            effectue_par_id: user.id,
            role_effectue_par: user.role,
            target_matricule: user.matricule,
          }),
        });
      }
    });

    const ticketEmails = await Promise.all(
      createdReservationIds.map(sendReservationTicketEmail),
    );
    res.status(200).json({
      order: order.data,
      passengers: matricules,
      totalPassengers: matricules.length,
      ticketEmails,
    });
  } catch (error) {
    handleFlightError(error, "Erreur lors de la réservation du vol");
  }
};

export const getOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseStringParam(req.params["id"], "id");

    const order = await duffel.orders.get(id);

    res.status(200).json(order.data);
  } catch (error) {
    handleGetOrderError(error, "Erreur lors de la récupération de la commande");
  }
};

export const cancelOrder = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const body = req.body as Record<string, unknown>;
    const orderId = parseStringParam(body.orderId, "orderId");

    // Créer un quote d'annulation via Duffel pour vérifier les conditions
    const cancellationQuote = await duffel.orderCancellations.create({
      order_id: orderId,
    });

    res.status(200).json(cancellationQuote);
  } catch (error) {
    handleCancellationError(error);
  }
};

export const confirmOrderCancellation = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const body = req.body as Record<string, unknown>;
    const orderId = parseStringParam(body.orderId, "orderId");

    // Récupérer la réservation de billet correspondant à l'orderId
    const reservationBillet = await prisma.reservationBillet.findFirst({
      where: { numeroOrder: orderId },
    });

    if (!reservationBillet) {
      throw new NotFoundError("Réservation de billet");
    }

    // Vérifier que la réservation n'est pas déjà annulée
    if (reservationBillet.statut === "ANNULEE") {
      throw new ConflictError(
        "Cette réservation est déjà annulée",
        "RESERVATION_ALREADY_CANCELLED",
      );
    }

    // Récupérer l'utilisateur pour le remboursement et l'audit
    const user = await prisma.user.findUnique({
      where: { matricule: reservationBillet.matricule || "" },
      select: {
        id: true,
        prenom: true,
        nom: true,
        entrepriseId: true,
        matricule: true,
        role: true,
      },
    });

    if (!user) {
      throw new NotFoundError("Utilisateur");
    }

    // Récupérer le budget personnel de l'utilisateur
    const budgetPersonnel = await prisma.budgetPersonnel.findFirst({
      where: { matricule: user.matricule },
    });

    if (!budgetPersonnel) {
      throw new NotFoundError("Budget personnel");
    }

    // Étape 1: Créer un quote d'annulation via Duffel
    const cancellationQuote = await duffel.orderCancellations.create({
      order_id: orderId,
    });

    const cancellationId = cancellationQuote.data.id;

    // Étape 2: Confirmer l'annulation avec l'ID du quote
    const confirmedCancellation =
      await duffel.orderCancellations.confirm(cancellationId);

    // Étape 3: Mettre à jour la base de données après annulation réussie
    const montantFCFA = reservationBillet.prix
      ? convertToFCFA(
          reservationBillet.prix.toString(),
          reservationBillet.devise || "XOF",
        )
      : 0;
    const nouveauMontantUtilise = Math.max(
      0,
      budgetPersonnel.montant_utilise.toNumber() - montantFCFA,
    );
    const nouveauMontantRestant =
      budgetPersonnel.montant_restant.toNumber() + montantFCFA;

    await prisma.$transaction([
      prisma.reservationBillet.update({
        where: { id: reservationBillet.id },
        data: {
          statut: "ANNULEE",
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
        data: buildAuditBudgetData({
          reference: budgetPersonnel.reference,
          entrepriseId: user.entrepriseId,
          action: "ANNULATION_BILLET",
          type_source: "RESERVATION_BILLET",
          type_destination: "BUDGET_PERSONNEL",
          montant: montantFCFA,
          montant_avant: budgetPersonnel.montant_restant.toNumber(),
          montant_apres: nouveauMontantRestant,
          description: `Annulation de vol - Order ID: ${orderId}`,
          effectue_par: user.matricule,
          effectue_par_id: user.id,
          role_effectue_par: user.role,
          target_matricule: user.matricule,
        }),
      }),
    ]);

    res.status(200).json(confirmedCancellation);
  } catch (error) {
    handleCancellationError(error);
  }
};

export const searchFlightsAdvanced = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const {
      dateDepart,
      dateRetour,
      aeroportDepart,
      aeroportArrivee,
      classe,
      nombrePassenger,
    } = validateSearchFlightsAdvancedBody(req.body);

    const offerRequestParams = buildDuffelOfferRequest({
      origin: aeroportDepart,
      destination: aeroportArrivee,
      departureDate: dateDepart,
      returnDate: dateRetour,
      passengerCount: nombrePassenger,
      cabinClass: classe,
    });

    const offerRequest = await duffel.offerRequests.create(offerRequestParams);

    const offers = await duffel.offers.list({
      offer_request_id: offerRequest.data.id,
    });

    res.status(200).json({
      offer_request_id: offerRequest.data.id,
      offers: offers.data,
      total: offers.data.length,
    });
  } catch (error) {
    handleSearchError(error, "Erreur lors de la recherche de vols");
  }
};

export const searchAirportSuggestion = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const query = parseStringParam(req.query["query"], "query");

    const response = await fetch(
      `https://api.duffel.com/places/suggestions?query=${encodeURIComponent(query)}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Duffel-Version": "v2",
          Authorization: `Bearer ${process.env.DUFFEL_API_KEY}`,
        },
      },
    );

    const data = await response.json();

    if (!response.ok) {
      throw new DuffelApiError(
        "Erreur Duffel lors des suggestions d'aéroports",
        [],
        data,
        response.status,
      );
    }

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    handleAirportSuggestionError(error);
  }
};
