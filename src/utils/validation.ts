import { BadRequestError } from "./AppError";

export function parseStringParam(value: unknown, field = "Valeur"): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new BadRequestError(`${field} invalide`, "INVALID_STRING");
  }
  return value.trim();
}

export function parseIdParam(value: unknown): number {
  const id = typeof value === "string" ? parseInt(value, 10) : NaN;
  if (Number.isNaN(id) || id <= 0) {
    throw new BadRequestError("ID invalide", "INVALID_ID");
  }
  return id;
}

export function parsePositiveInt(value: unknown, field = "Valeur"): number {
  const num = parseIntValue(value, field);
  if (num <= 0) {
    throw new BadRequestError(`${field} invalide`, "INVALID_NUMBER");
  }
  return num;
}

export function parseNonNegativeInt(value: unknown, field = "Valeur"): number {
  const num = parseIntValue(value, field);
  if (num < 0) {
    throw new BadRequestError(`${field} invalide`, "INVALID_NUMBER");
  }
  return num;
}

function parseIntValue(value: unknown, field: string): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  const str = typeof value === "string" ? value.trim() : "";
  const num = str ? parseInt(str, 10) : NaN;
  if (Number.isNaN(num)) {
    throw new BadRequestError(`${field} invalide`, "INVALID_NUMBER");
  }
  return num;
}

export function parseOptionalPositiveInt(
  value: unknown,
  fallback: number,
  field = "Valeur",
): number {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  return parsePositiveInt(value, field);
}

export function parsePagination(
  page: unknown,
  limit: unknown,
): { page: number; limit: number; skip: number } {
  const pageNum = parsePositiveInt(page, "page");
  const limitNum = Math.min(100, parsePositiveInt(limit, "limit"));
  return { page: pageNum, limit: limitNum, skip: (pageNum - 1) * limitNum };
}

export function parseBooleanFlag(
  value: unknown,
  field = "Valeur",
): boolean | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== "boolean") {
    throw new BadRequestError(`${field} doit être un booléen`, "INVALID_TYPE");
  }
  return value;
}

export function parsePositiveNumber(value: unknown, field = "Valeur"): number {
  let num: number;
  if (typeof value === "number" && Number.isFinite(value)) {
    num = value;
  } else if (typeof value === "string") {
    const str = value.trim();
    num = str ? parseFloat(str) : NaN;
  } else {
    num = NaN;
  }
  if (Number.isNaN(num) || num <= 0) {
    throw new BadRequestError(`${field} invalide`, "INVALID_NUMBER");
  }
  return num;
}
