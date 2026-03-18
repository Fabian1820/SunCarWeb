const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

export function isValidObjectId(value: unknown): value is string {
  return typeof value === "string" && OBJECT_ID_REGEX.test(value);
}

export function normalizeOptionalObjectId(
  value: unknown,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed;
}

export function ensureValidObjectId(
  value: unknown,
  fieldName: string,
): string | null | undefined {
  const normalized = normalizeOptionalObjectId(value);
  if (normalized === undefined || normalized === null) {
    return normalized;
  }

  if (!isValidObjectId(normalized)) {
    throw new Error(
      `${fieldName} invalido. Debe tener formato ObjectId de 24 caracteres hexadecimales.`,
    );
  }

  return normalized;
}
