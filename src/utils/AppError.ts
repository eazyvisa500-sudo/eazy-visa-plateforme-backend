export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number,
    code: string = "INTERNAL_ERROR",
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    if (details !== undefined) {
      this.details = details;
    }

    Error.captureStackTrace(this, this.constructor);
  }
}

export class DuffelApiError extends AppError {
  constructor(
    message: string,
    duffelErrors: unknown[],
    duffelMeta: unknown,
    statusCode: number = 500,
    code: string = "DUFFEL_ERROR",
  ) {
    super(message, statusCode, code, {
      duffelErrors,
      duffelMeta,
    } as unknown as Record<string, unknown>);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string, code: string = "BAD_REQUEST") {
    super(message, 400, code);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Non autorisé", code: string = "UNAUTHORIZED") {
    super(message, 401, code);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Accès interdit", code: string = "FORBIDDEN") {
    super(message, 403, code);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = "Ressource", code: string = "NOT_FOUND") {
    super(`${resource} non trouvée`, 404, code);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, code: string = "CONFLICT") {
    super(message, 409, code);
  }
}
