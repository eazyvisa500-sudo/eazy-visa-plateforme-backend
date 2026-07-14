import type { Request, Response } from 'express'
import process from 'process'

const DUFFEL_API_KEY = process.env.DUFFEL_API_KEY
const DUFFEL_API_URL = 'https://api.duffel.com'

export const searchFlights = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      origin,
      destination,
      departureDate,
      returnDate,
      passengers = 1,
      cabinClass = 'economy',
    } = req.body as {
      origin?: string
      destination?: string
      departureDate?: string
      returnDate?: string
      passengers?: number
      cabinClass?: string
    }

    if (!origin || !destination || !departureDate) {
      res.status(400).json({ message: 'origin, destination et departureDate sont requis' })
      return
    }

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

    const requestBody = {
      data: {
        slices,
        passengers: [
          {
            type: 'adult',
            id: 'passenger_1',
          },
        ],
        cabin_class: cabinClass,
      },
    }

    console.log('Duffel API Request Body:', JSON.stringify(requestBody, null, 2))

    const response = await fetch(`${DUFFEL_API_URL}/air/offer_requests`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DUFFEL_API_KEY}`,
        'Duffel-Version': 'v2',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Duffel API Error Details:', {
        status: response.status,
        statusText: response.statusText,
        errorData: errorData,
      })
      throw new Error(`Duffel API error: ${response.statusText} - ${JSON.stringify(errorData)}`)
    }

    const data = await response.json()
    console.log('Duffel API Response:', JSON.stringify(data, null, 2))

    res.status(200).json(data)
  } catch (error) {
    console.error('Error searching flights from Duffel:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      requestBody: req.body,
    })
    res.status(500).json({ message: 'Erreur lors de la recherche de vols' })
  }
}
