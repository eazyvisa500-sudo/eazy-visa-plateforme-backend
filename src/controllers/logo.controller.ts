import type { Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import prisma from '../lib/prismaClient'
import { uploadToR2, deleteFromR2, getPresignedUrl } from '../lib/r2'
import { NotFoundError, BadRequestError } from '../utils/AppError'

export const getLogoEntreprise = async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(String(req.params['id'] ?? '0'))

  const entreprise = await prisma.entreprise.findUnique({ where: { id } })
  if (!entreprise) {
    throw new NotFoundError('Entreprise')
  }
  if (!entreprise.logo) {
    throw new NotFoundError('Logo', 'LOGO_NOT_FOUND')
  }

  const logoUrl = await getPresignedUrl(entreprise.logo, 3600)
  res.status(200).json({ logo_url: logoUrl })
}

export const uploadLogoEntreprise = async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(String(req.params['id'] ?? '0'))

  const file = req.file
  if (!file) {
    throw new BadRequestError('Fichier image requis', 'FILE_REQUIRED')
  }

  const entreprise = await prisma.entreprise.findUnique({ where: { id } })
  if (!entreprise) {
    throw new NotFoundError('Entreprise')
  }

  if (entreprise.logo) {
    await deleteFromR2(entreprise.logo).catch(() => {})
  }

  const ext = file.originalname.split('.').pop() ?? 'jpg'
  const key = `logos/entreprises/${id}-${uuidv4()}.${ext}`
  await uploadToR2(key, file.buffer, file.mimetype)

  const updated = await prisma.entreprise.update({
    where: { id },
    data: { logo: key },
  })

  const logoUrl = await getPresignedUrl(key)

  res.status(200).json({
    message: 'Logo mis à jour avec succès',
    logo_url: logoUrl,
    entreprise: { ...updated, logo_url: logoUrl },
  })
}
