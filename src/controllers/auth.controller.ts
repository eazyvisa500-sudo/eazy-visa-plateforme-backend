import type { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import prisma from '../lib/prismaClient'
import { BadRequestError, UnauthorizedError, ForbiddenError, AppError } from '../utils/AppError'

// Fixed dummy hash used to keep response times constant when no user matches,
// mitigating user-enumeration timing attacks.
const DUMMY_HASH = bcrypt.hashSync('dummy-password-not-used', 10)

interface LoginBody {
  email: string
  mot_de_passe: string
}

function sanitizeLoginBody(body: unknown): LoginBody {
  if (!body || typeof body !== 'object') {
    throw new BadRequestError('Corps de requête invalide', 'INVALID_BODY')
  }

  const { email, mot_de_passe } = body as Record<string, unknown>
  const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''
  const cleanPassword = typeof mot_de_passe === 'string' ? mot_de_passe : ''

  if (!cleanEmail || !cleanPassword) {
    throw new BadRequestError('Email et mot de passe requis', 'MISSING_CREDENTIALS')
  }

  return { email: cleanEmail, mot_de_passe: cleanPassword }
}

function getJwtSecret(): string {
  const secret = process.env['JWT_SECRET']
  if (!secret) {
    throw new AppError('Configuration JWT manquante', 500, 'CONFIG_MISSING')
  }
  return secret
}

export const loginSuperAdmin = async (req: Request, res: Response): Promise<void> => {
  const { email, mot_de_passe } = sanitizeLoginBody(req.body)

  const adminEmail = process.env['email_admin']
  const adminPassword = process.env['Mot_de_passe_admin']
  const jwtSecret = getJwtSecret()

  if (!adminEmail || !adminPassword) {
    throw new AppError('Configuration admin manquante', 500, 'CONFIG_MISSING')
  }

  const normalizedAdminEmail = adminEmail.trim().toLowerCase()

  if (email !== normalizedAdminEmail || mot_de_passe !== adminPassword) {
    throw new UnauthorizedError('Email ou mot de passe incorrect', 'INVALID_CREDENTIALS')
  }

  const token = jwt.sign(
    { email: normalizedAdminEmail, role: 'SUPERADMIN' },
    jwtSecret,
    { expiresIn: '24h' }
  )

  res.status(200).json({
    message: 'Connexion réussie',
    token,
    superadmin: {
      email: normalizedAdminEmail,
      role: 'SUPERADMIN',
    },
  })
}

export const loginUser = async (req: Request, res: Response): Promise<void> => {
  const { email, mot_de_passe } = sanitizeLoginBody(req.body)

  const jwtSecret = getJwtSecret()

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      entreprise: {
        select: { identifiant: true, is_active: true },
      },
    },
  })

  if (!user?.entreprise) {
    // Obscure missing user/entreprise with the same timing as a real password check.
    await bcrypt.compare(mot_de_passe, DUMMY_HASH)
    throw new UnauthorizedError('Email ou mot de passe incorrect', 'INVALID_CREDENTIALS')
  }

  const isValid = await bcrypt.compare(mot_de_passe, user.mot_de_passe)
  if (!isValid) {
    throw new UnauthorizedError('Email ou mot de passe incorrect', 'INVALID_CREDENTIALS')
  }

  if (!user.entreprise.is_active) {
    throw new ForbiddenError("L'entreprise est désactivée", 'ENTREPRISE_INACTIVE')
  }

  if (user.is_block) {
    throw new ForbiddenError('Compte bloqué. Contactez votre administrateur.', 'ACCOUNT_BLOCKED')
  }

  const identifiantEntreprise = user.entreprise.identifiant

  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      entrepriseId: user.entrepriseId,
      matricule: user.matricule,
      identifiantEntreprise,
    },
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
