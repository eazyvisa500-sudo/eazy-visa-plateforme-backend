import nodemailer from "nodemailer";
import prisma from "../lib/prismaClient";
import { generateTicketPdf } from "./ticket-pdf.service";

export type TicketEmailResult =
  | { sent: true; recipient: string }
  | { sent: false; recipient: string | null; error: string };

const escapeHtml = (value: string) =>
  value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character]!);

const getTransporter = () => {
  const host ="smtp.ionos.fr";
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.IONOS_USER || process.env.SMTP_USER;
  const pass = process.env.IONOS_PASSWORD || process.env.SMTP_PASSWORD;
  const secure = (process.env.SMTP_SECURE === "true" && port === 465) || port === 465;

  if (!user || !pass) {
    throw new Error("IONOS_USER/IONOS_PASSWORD ou SMTP_USER/SMTP_PASSWORD manquants");
  }

  return {
    transporter: nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    }),
    config: { host, port, secure, user },
  };
};

export const sendReservationTicketEmail = async (
  reservationId: number,
): Promise<TicketEmailResult> => {
  let recipient: string | null = null;

  try {
    const reservation = await prisma.reservationBillet.findUnique({
      where: { id: reservationId },
      include: {
        demandeVoyage: {
          include: {
            user: true,
            entreprise: true,
          },
        },
      },
    });

    if (!reservation) {
      console.error(`[MAIL] Réservation ${reservationId} introuvable`);
      return { sent: false, recipient, error: "Réservation introuvable" };
    }

    recipient = reservation.demandeVoyage.user.email;
    const passengerName = `${reservation.demandeVoyage.user.prenom} ${reservation.demandeVoyage.user.nom}`;
    const safePassengerName = escapeHtml(passengerName);
    const safeReference = escapeHtml(reservation.numeroReservation);
    const safeOrigin = escapeHtml(reservation.aeroportDepart || reservation.demandeVoyage.depart);
    const safeDestination = escapeHtml(reservation.aeroportArrivee || reservation.demandeVoyage.arrive);
    const safeCompany = escapeHtml(reservation.demandeVoyage.entreprise.nom);
    const { transporter, config } = getTransporter();

    console.log(
      `[MAIL] Connexion SMTP ${config.host}:${config.port} (secure=${config.secure}, user=${config.user})`,
    );
    console.log(
      `[MAIL] Envoi du billet ${reservation.numeroReservation} vers ${recipient}...`,
    );
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.IONOS_USER || process.env.SMTP_USER,
      to: recipient,
      subject: `Votre billet électronique - ${reservation.numeroReservation}`,
      text: `Bonjour ${passengerName},\n\nVotre réservation de vol est confirmée. Votre billet électronique est joint à cet e-mail.\n\nRéférence : ${reservation.numeroReservation}\nTrajet : ${reservation.aeroportDepart || reservation.demandeVoyage.depart} - ${reservation.aeroportArrivee || reservation.demandeVoyage.arrive}\n\nCordialement,\n${reservation.demandeVoyage.entreprise.nom}`,
      html: `<p>Bonjour <strong>${safePassengerName}</strong>,</p><p>Votre réservation de vol est confirmée. Votre billet électronique est joint à cet e-mail.</p><p><strong>Référence :</strong> ${safeReference}<br><strong>Trajet :</strong> ${safeOrigin} → ${safeDestination}</p><p>Cordialement,<br>${safeCompany}</p>`,
      attachments: [
        {
          filename: `billet-${reservation.numeroReservation.replace(/[^a-zA-Z0-9_-]/g, "-")}.pdf`,
          content: generateTicketPdf(reservation),
          contentType: "application/pdf",
        },
      ],
    });
    console.log(
      `[MAIL] Billet accepté par IONOS pour ${recipient} (messageId: ${info.messageId}, accepted: ${info.accepted?.join(", ") || "non renseigné"}, rejected: ${info.rejected?.join(", ") || "aucun"})`,
    );
    return { sent: true, recipient };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Échec de l’envoi du billet";
    console.error(
      `[MAIL] Échec de l’envoi pour la réservation ${reservationId}${recipient ? ` vers ${recipient}` : ""}: ${message}`,
    );
    return {
      sent: false,
      recipient,
      error: message,
    };
  }
};