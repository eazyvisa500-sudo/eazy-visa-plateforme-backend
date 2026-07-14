import type { Request, Response } from 'express'
import prisma from '../lib/prismaClient'

export const createForfait = async (req: Request, res: Response): Promise<void> => {
  try {
    const { entrepriseId, nombre_user_autorise } = req.body as {
      entrepriseId?: number
      nombre_user_autorise?: number
    }

    if (!entrepriseId || !nombre_user_autorise) {
      res.status(400).json({ message: 'entrepriseId et nombre_user_autorise sont requis' })
      return
    }

    // Vérifier que l'entreprise existe
    const entreprise = await prisma.entreprise.findUnique({
      where: { id: entrepriseId },
    })

    if (!entreprise) {
      res.status(404).json({ message: 'Entreprise non trouvée' })
      return
    }

    // Vérifier si un forfait existe déjà pour cette entreprise
    const existingForfait = await prisma.forfait.findUnique({
      where: { entrepriseId },
    })

    if (existingForfait) {
      res.status(409).json({ message: 'Un forfait existe déjà pour cette entreprise' })
      return
    }

    const forfait = await prisma.forfait.create({
      data: {
        entrepriseId,
        nombre_user_autorise,
        nombre_user_actuel: 0,
      },
      include: {
        entreprise: {
          select: {
            id: true,
            nom: true,
            identifiant: true,
          },
        },
      },
    })

    res.status(201).json({ message: 'Forfait créé avec succès', forfait })
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la création du forfait', error: error instanceof Error ? error.message : String(error) })
  }
}

export const getAllForfaits = async (req: Request, res: Response): Promise<void> => {
  try {
    const forfaits = await prisma.forfait.findMany({
      include: {
        entreprise: {
          select: {
            id: true,
            nom: true,
            identifiant: true,
          },
        },
      },
    })

    res.status(200).json({ total: forfaits.length, forfaits })
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération des forfaits', error: error instanceof Error ? error.message : String(error) })
  }
}

export const getForfaitById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const forfait = await prisma.forfait.findUnique({
      where: { id: Number(id) },
      include: {
        entreprise: {
          select: {
            id: true,
            nom: true,
            identifiant: true,
          },
        },
      },
    })

    if (!forfait) {
      res.status(404).json({ message: 'Forfait non trouvé' })
      return
    }

    res.status(200).json(forfait)
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération du forfait', error: error instanceof Error ? error.message : String(error) })
  }
}

export const getForfaitByEntreprise = async (req: Request, res: Response): Promise<void> => {
  try {
    const { entrepriseId } = req.params

    const forfait = await prisma.forfait.findUnique({
      where: { entrepriseId: Number(entrepriseId) },
      include: {
        entreprise: {
          select: {
            id: true,
            nom: true,
            identifiant: true,
          },
        },
      },
    })

    if (!forfait) {
      res.status(404).json({ message: 'Aucun forfait trouvé pour cette entreprise' })
      return
    }

    res.status(200).json(forfait)
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération du forfait', error: error instanceof Error ? error.message : String(error) })
  }
}

export const updateForfait = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { nombre_user_autorise, nombre_user_actuel } = req.body as {
      nombre_user_autorise?: number
      nombre_user_actuel?: number
    }

    const forfait = await prisma.forfait.findUnique({
      where: { id: Number(id) },
    })

    if (!forfait) {
      res.status(404).json({ message: 'Forfait non trouvé' })
      return
    }

    // Si nombre_user_actuel est fourni, vérifier qu'il ne dépasse pas nombre_user_autorise
    if (nombre_user_actuel !== undefined) {
      const maxUsers = nombre_user_autorise ?? forfait.nombre_user_autorise
      if (nombre_user_actuel > maxUsers) {
        res.status(400).json({ message: 'Le nombre d\'utilisateurs actuels ne peut pas dépasser le nombre autorisé' })
        return
      }
    }

    const updatedForfait = await prisma.forfait.update({
      where: { id: Number(id) },
      data: {
        ...(nombre_user_autorise !== undefined && { nombre_user_autorise }),
        ...(nombre_user_actuel !== undefined && { nombre_user_actuel }),
      },
      include: {
        entreprise: {
          select: {
            id: true,
            nom: true,
            identifiant: true,
          },
        },
      },
    })

    res.status(200).json({ message: 'Forfait mis à jour avec succès', forfait: updatedForfait })
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la mise à jour du forfait', error: error instanceof Error ? error.message : String(error) })
  }
}

export const incrementUserCount = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const forfait = await prisma.forfait.findUnique({
      where: { id: Number(id) },
    })

    if (!forfait) {
      res.status(404).json({ message: 'Forfait non trouvé' })
      return
    }

    if (forfait.nombre_user_actuel >= forfait.nombre_user_autorise) {
      res.status(400).json({ message: 'Le nombre maximum d\'utilisateurs autorisés est atteint' })
      return
    }

    const updatedForfait = await prisma.forfait.update({
      where: { id: Number(id) },
      data: {
        nombre_user_actuel: forfait.nombre_user_actuel + 1,
      },
      include: {
        entreprise: {
          select: {
            id: true,
            nom: true,
            identifiant: true,
          },
        },
      },
    })

    res.status(200).json({ message: 'Nombre d\'utilisateurs incrémenté avec succès', forfait: updatedForfait })
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de l\'incrémentation du nombre d\'utilisateurs', error: error instanceof Error ? error.message : String(error) })
  }
}

export const decrementUserCount = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const forfait = await prisma.forfait.findUnique({
      where: { id: Number(id) },
    })

    if (!forfait) {
      res.status(404).json({ message: 'Forfait non trouvé' })
      return
    }

    if (forfait.nombre_user_actuel <= 0) {
      res.status(400).json({ message: 'Le nombre d\'utilisateurs actuels ne peut pas être négatif' })
      return
    }

    const updatedForfait = await prisma.forfait.update({
      where: { id: Number(id) },
      data: {
        nombre_user_actuel: forfait.nombre_user_actuel - 1,
      },
      include: {
        entreprise: {
          select: {
            id: true,
            nom: true,
            identifiant: true,
          },
        },
      },
    })

    res.status(200).json({ message: 'Nombre d\'utilisateurs décrémenté avec succès', forfait: updatedForfait })
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la décrémentation du nombre d\'utilisateurs', error: error instanceof Error ? error.message : String(error) })
  }
}

export const deleteForfait = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const forfait = await prisma.forfait.findUnique({
      where: { id: Number(id) },
    })

    if (!forfait) {
      res.status(404).json({ message: 'Forfait non trouvé' })
      return
    }

    await prisma.forfait.delete({
      where: { id: Number(id) },
    })

    res.status(200).json({ message: 'Forfait supprimé avec succès' })
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la suppression du forfait', error: error instanceof Error ? error.message : String(error) })
  }
}

export const getForfaitByCurrentUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user

    if (!user || !user.entrepriseId) {
      res.status(400).json({ message: 'Utilisateur non authentifié ou sans entreprise' })
      return
    }

    const forfait = await prisma.forfait.findUnique({
      where: { entrepriseId: user.entrepriseId },
      include: {
        entreprise: {
          select: {
            id: true,
            nom: true,
            identifiant: true,
          },
        },
      },
    })

    if (!forfait) {
      res.status(404).json({ message: 'Aucun forfait trouvé pour votre entreprise' })
      return
    }

    res.status(200).json(forfait)
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération du forfait', error: error instanceof Error ? error.message : String(error) })
  }
}
