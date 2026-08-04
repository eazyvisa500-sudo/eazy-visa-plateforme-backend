import PDFDocument from "pdfkit";
import { PassThrough } from "stream";

type TicketData = {
  numeroReservation: string;
  numeroOrder: string | null;
  compagnieAerienne: string | null;
  numeroVolAller: string | null;
  numeroVolRetour: string | null;
  dateVolDepart: Date | null;
  dateVolArrivee: Date | null;
  dateVolRetourDepart: Date | null;
  dateVolRetourArrivee: Date | null;
  aeroportDepart: string | null;
  aeroportArrivee: string | null;
  classe: string;
  numeroBillet: string | null;
  demandeVoyage: {
    depart: string;
    arrive: string;
    allerRetour: boolean;
    user: {
      prenom: string;
      nom: string;
      date_naissance: Date | null;
      genre: string | null;
      matricule: string;
    };
    entreprise: {
      nom: string;
    };
  };
};

const classLabels: Record<string, string> = {
  Y: "Économique",
  W: "Premium",
  J: "Affaires",
  F: "Première",
};

const formatDateTime = (date: Date | null) =>
  date
    ? new Intl.DateTimeFormat("fr-FR", {
        dateStyle: "long",
        timeStyle: "short",
        timeZone: "UTC",
      }).format(date)
    : "Non renseigné";

const formatDate = (date: Date | null) =>
  date
    ? new Intl.DateTimeFormat("fr-FR", {
        dateStyle: "long",
        timeZone: "UTC",
      }).format(date)
    : "Non renseignée";

const drawSection = (doc: PDFKit.PDFDocument, title: string, height: number) => {
  doc.font("Helvetica-Bold").fontSize(16).fillColor("#202124").text(title);
  const y = doc.y + 8;
  doc.roundedRect(40, y, 515, height, 5).lineWidth(1).strokeColor("#DADCE0").stroke();
  return y;
};

const drawFlight = (
  doc: PDFKit.PDFDocument,
  data: TicketData,
  title: string,
  departure: Date | null,
  arrival: Date | null,
  origin: string,
  destination: string,
  flightNumber: string | null,
) => {
  const y = drawSection(doc, title, 125);
  doc.font("Helvetica-Bold").fontSize(14).fillColor("#A11B1B").text(`${origin}  →  ${destination}`, 58, y + 18);
  doc.font("Helvetica").fontSize(10).fillColor("#5F6368").text(data.compagnieAerienne || "Compagnie non renseignée", 58, y + 42);
  doc.font("Helvetica-Bold").fontSize(10).fillColor("#202124").text(`Départ : ${formatDateTime(departure)}`, 58, y + 68);
  doc.text(`Arrivée : ${formatDateTime(arrival)}`, 58, y + 88);
  doc.font("Helvetica").fillColor("#5F6368").text(`Vol : ${flightNumber || "Non renseigné"}`, 390, y + 20, { width: 145, align: "right" });
  doc.text(`Classe : ${classLabels[data.classe] || data.classe}`, 360, y + 88, { width: 175, align: "right" });
  doc.y = y + 145;
};

export const generateTicketPdf = (data: TicketData): PassThrough => {
  const doc = new PDFDocument({ size: "A4", margin: 40, info: { Title: `Billet ${data.numeroReservation}` } });
  const stream = new PassThrough();
  doc.pipe(stream);

  doc.font("Helvetica-Bold").fontSize(20).fillColor("#202124").text(data.demandeVoyage.entreprise.nom, 40, 40);
  doc.fontSize(11).fillColor("#5F6368").text("Billet électronique", 40, 66);
  doc.font("Helvetica-Bold").fontSize(12).fillColor("#202124").text("Référence de réservation", 350, 40, { width: 205, align: "right" });
  doc.fontSize(18).text(data.numeroReservation, 350, 58, { width: 205, align: "right" });
  doc.moveTo(40, 92).lineTo(555, 92).strokeColor("#A11B1B").lineWidth(2).stroke();
  doc.y = 115;

  drawFlight(
    doc,
    data,
    "Détails du vol",
    data.dateVolDepart,
    data.dateVolArrivee,
    data.aeroportDepart || data.demandeVoyage.depart,
    data.aeroportArrivee || data.demandeVoyage.arrive,
    data.numeroVolAller,
  );

  if (data.demandeVoyage.allerRetour && data.dateVolRetourDepart) {
    drawFlight(
      doc,
      data,
      "Vol retour",
      data.dateVolRetourDepart,
      data.dateVolRetourArrivee,
      data.aeroportArrivee || data.demandeVoyage.arrive,
      data.aeroportDepart || data.demandeVoyage.depart,
      data.numeroVolRetour,
    );
  }

  const passengerY = drawSection(doc, "Passager", 115);
  const passengerName = `${data.demandeVoyage.user.prenom} ${data.demandeVoyage.user.nom}`;
  doc.font("Helvetica-Bold").fontSize(13).fillColor("#202124").text(passengerName, 58, passengerY + 18);
  doc.font("Helvetica").fontSize(10).fillColor("#5F6368").text("Date de naissance", 58, passengerY + 50);
  doc.fillColor("#202124").text(formatDate(data.demandeVoyage.user.date_naissance), 58, passengerY + 67);
  doc.fillColor("#5F6368").text("Genre", 265, passengerY + 50);
  doc.fillColor("#202124").text(data.demandeVoyage.user.genre || "Non renseigné", 265, passengerY + 67);
  doc.fillColor("#5F6368").text("Matricule", 440, passengerY + 50);
  doc.fillColor("#202124").text(data.demandeVoyage.user.matricule, 440, passengerY + 67);
  doc.y = passengerY + 140;

  const ticketY = drawSection(doc, "Numéro de billet", 60);
  doc.font("Helvetica").fontSize(11).fillColor("#202124").text(`${passengerName} : ${data.numeroBillet || data.numeroOrder || "En attente d’émission"}`, 58, ticketY + 22);

  doc.fontSize(8).fillColor("#80868B").text("Ce document est un récapitulatif de réservation. Présentez une pièce d’identité valide lors de l’enregistrement.", 40, 790, { width: 515, align: "center" });
  doc.end();
  return stream;
};
