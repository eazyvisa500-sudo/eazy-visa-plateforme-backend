import type { Request, Response, NextFunction } from 'express'
import { AppError } from '../utils/AppError'

interface PrismaError {
  code?: string
  meta?: Record<string, unknown>
}

function isPrismaError(err: unknown): err is PrismaError {
  return typeof err === 'object' && err !== null && 'code' in err
}

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Erreur opérationnelle connue
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        statusCode: err.statusCode,
      },
    })
    return
  }

  // Erreurs Prisma connues
  if (isPrismaError(err)) {
    switch (err.code) {
      case 'P2002': {
        const target = (err.meta?.target as string[])?.join(', ') ?? 'champ'
        res.status(409).json({
          success: false,
          error: {
            code: 'UNIQUE_CONSTRAINT_VIOLATION',
            message: `Contrainte d'unicité violée : ${target}`,
            statusCode: 409,
          },
        })
        return
      }
      case 'P2003': {
        res.status(404).json({
          success: false,
          error: {
            code: 'FOREIGN_KEY_CONSTRAINT_VIOLATION',
            message: 'Contrainte de clé étrangère violée : ressource liée non trouvée',
            statusCode: 404,
          },
        })
        return
      }
      case 'P2025': {
        res.status(404).json({
          success: false,
          error: {
            code: 'RECORD_NOT_FOUND',
            message: "L'enregistrement demandé n'existe pas ou a été modifié",
            statusCode: 404,
          },
        })
        return
      }
    }
  }

  // Erreur inconnue
  const statusCode = (err as { statusCode?: number }).statusCode ?? 500
  res.status(statusCode).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env['NODE_ENV'] === 'production' ? 'Erreur serveur' : err.message,
      statusCode,
    },
  })
}
