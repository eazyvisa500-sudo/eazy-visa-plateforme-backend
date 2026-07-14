import type { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import prisma from '../lib/prismaClient'
import { BadRequestError, UnauthorizedError, ForbiddenError, AppError } from '../utils/AppError'

export const loginSuperAdmin = async (req: Request, res: Response): Promise<void> => {
  const { email, mot_de_passe } = req.body as { email: string; mot_de_passe: string }

  const adminEmail = process.env['email_admin']
  const adminPassword = process.env['Mot_de_passe_admin']
  const jwtSecret = process.env['JWT_SECRET']

  if (!adminEmail || !adminPassword || !jwtSecret) {
    throw new AppError('Configuration serveur manquante', 500, 'CONFIG_MISSING')
  }

  if (!email || !mot_de_passe) {
    throw new BadRequestError('Email et mot de passe requis', 'MISSING_CREDENTIALS')
  }

  if (email !== adminEmail || mot_de_passe !== adminPassword) {
    throw new UnauthorizedError('Email ou mot de passe incorrect', 'INVALID_CREDENTIALS')
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
  const { email, mot_de_passe } = req.body as { email: string; mot_de_passe: string }

  const jwtSecret = process.env['JWT_SECRET']
  if (!jwtSecret) {
    throw new AppError('Configuration JWT manquante', 500, 'CONFIG_MISSING')
  }

  if (!email || !mot_de_passe) {
    throw new BadRequestError('Email et mot de passe requis', 'MISSING_CREDENTIALS')
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    throw new UnauthorizedError('Email ou mot de passe incorrect', 'INVALID_CREDENTIALS')
  }

  const isValid = await bcrypt.compare(mot_de_passe, user.mot_de_passe)
  if (!isValid) {
    throw new UnauthorizedError('Email ou mot de passe incorrect', 'INVALID_CREDENTIALS')
  }

  if (user.is_block) {
    throw new ForbiddenError('Compte bloqué. Contactez votre administrateur.', 'ACCOUNT_BLOCKED')
  }

  const entreprise = await prisma.entreprise.findUnique({ where: { id: user.entrepriseId } })
  const identifiantEntreprise = entreprise?.identifiant ?? ''

  const token = jwt.sign(
<<<<<<< HEAD
    {
      id: user.id,
      email: user.email,
      role: user.role,
      entrepriseId: user.entrepriseId,
      matricule: user.matricule,
      identifiantEntreprise,
      civilite: user.civilite,
      genre: user.genre,
      numero_passport: user.numero_passport,
      date_expiration_passport: user.date_expiration_passport,
    },
=======
    { id: user.id, email: user.email, role: user.role, entrepriseId: user.entrepriseId, matricule: user.matricule, identifiantEntreprise },
>>>>>>> 237a3e01a673dca26acb8f75d6a0fef8c514bac8
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
      matricule: user.matricule,
      role: user.role,
      entrepriseId: user.entrepriseId,
      identifiantEntreprise,
    },
  })
}
