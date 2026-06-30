import type { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import prisma from '../lib/prismaClient'

export const loginSuperAdmin = async (req: Request, res: Response): Promise<void> => {
  const { email, mot_de_passe } = req.body as { email: string; mot_de_passe: string }

  const adminEmail = process.env['email_admin']
  const adminPassword = process.env['Mot_de_passe_admin']
  const jwtSecret = process.env['JWT_SECRET']

  if (!adminEmail || !adminPassword || !jwtSecret) {
    res.status(500).json({ message: 'Configuration serveur manquante' })
    return
  }

  if (!email || !mot_de_passe) {
    res.status(400).json({ message: 'Email et mot de passe requis' })
    return
  }

  if (email !== adminEmail || mot_de_passe !== adminPassword) {
    res.status(401).json({ message: 'Email ou mot de passe incorrect' })
    return
  }

  const token = jwt.sign(
    { email: adminEmail, role: 'SUPERADMIN' },
    jwtSecret,
    { expiresIn: '24h' }
  )

  res.status(200).json({
    message: 'Connexion réussie',
    token,
    superadmin: {
      email: adminEmail,
      role: 'SUPERADMIN',
    },
  })
}

export const loginUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, mot_de_passe } = req.body as { email: string; mot_de_passe: string }

    const jwtSecret = process.env['JWT_SECRET']
    if (!jwtSecret) {
      res.status(500).json({ message: 'Configuration JWT manquante' })
      return
    }

    if (!email || !mot_de_passe) {
      res.status(400).json({ message: 'Email et mot de passe requis' })
      return
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      res.status(401).json({ message: 'Email ou mot de passe incorrect' })
      return
    }

    const isValid = await bcrypt.compare(mot_de_passe, user.mot_de_passe)
    if (!isValid) {
      res.status(401).json({ message: 'Email ou mot de passe incorrect' })
      return
    }

    if (user.is_block) {
      res.status(403).json({ message: 'Compte bloqué. Contactez votre administrateur.' })
      return
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, entrepriseId: user.entrepriseId },
      jwtSecret,
      { expiresIn: '24h' }
    )

    res.status(200).json({
      message: 'Connexion réussie',
      token,
      user: {
        id: user.id,
        email: user.email,
        prenom: user.prenom,
        nom: user.nom,
        role: user.role,
        entrepriseId: user.entrepriseId,
      },
    })
  } catch (error: unknown) {
    res.status(500).json({ message: 'Erreur serveur', error })
  }
}
