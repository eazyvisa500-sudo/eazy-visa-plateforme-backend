import type { Request, Response } from "express";
import process from "process";
import { BadRequestError } from "../utils/AppError";
import { parseStringParam } from "../utils/validation";

const DUFFEL_API_KEY = process.env.DUFFEL_API_KEY;
const DUFFEL_API_URL = "https://api.duffel.com";

export const searchFlights = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const body = req.body as Record<string, unknown>;
  const origin = parseStringParam(body.origin, "origin");
  const destination = parseStringParam(body.destination, "destination");
  const departureDate = parseStringParam(body.departureDate, "departureDate");
  const returnDate =
    body.returnDate === undefined
      ? undefined
      : parseStringParam(body.returnDate, "returnDate");
  const cabinClass =
    body.cabinClass === undefined
      ? "economy"
      : parseStringParam(body.cabinClass, "cabinClass");

  const slices: {
    origin: string;
    destination: string;
    departure_date: string;
  }[] = [
    {
      origin,
      destination,
      departure_date: departureDate,
    },
  ];

  if (returnDate) {
    slices.push({
      origin: destination,
      destination: origin,
      departure_date: returnDate,
    });
  }

  const requestBody = {
    data: {
      slices,
      passengers: [
        {
          type: "adult",
          id: "passenger_1",
        },
      ],
      cabin_class: cabinClass,
    },
  };

  const response = await fetch(`${DUFFEL_API_URL}/air/offer_requests`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${DUFFEL_API_KEY}`,
      "Duffel-Version": "v2",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new BadRequestError(
      `Duffel API error: ${response.statusText} - ${JSON.stringify(errorData)}`,
      "DUFFEL_ERROR",
    );
  }

  const data = await response.json();

  res.status(200).json(data);
};
