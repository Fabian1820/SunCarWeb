const DAY_MS = 24 * 60 * 60 * 1000;

export type FechaRecogidaBadgeKind =
  | "today"
  | "tomorrow"
  | "future"
  | "past"
  | "unknown";

export interface FechaRecogidaBadge {
  label: string;
  kind: FechaRecogidaBadgeKind;
  daysDiff: number | null;
}

const parseDateOnly = (dateStr?: string | null): Date | null => {
  if (!dateStr) return null;

  const isoDateOnly = /^(\d{4})-(\d{2})-(\d{2})$/;
  const match = dateStr.match(isoDateOnly);
  if (match) {
    const [, year, month, day] = match;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

const toDayStart = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const getFechaRecogidaDayDiff = (
  dateStr?: string | null,
  now: Date = new Date(),
): number | null => {
  const target = parseDateOnly(dateStr);
  if (!target) return null;

  const diffMs = toDayStart(target).getTime() - toDayStart(now).getTime();
  return Math.round(diffMs / DAY_MS);
};

export const formatFechaRecogida = (
  dateStr?: string | null,
  locale = "es-ES",
): string => {
  const parsed = parseDateOnly(dateStr);
  if (!parsed) return "Hoy";

  return parsed.toLocaleDateString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

export const getFechaRecogidaBadge = (
  dateStr?: string | null,
  now: Date = new Date(),
): FechaRecogidaBadge => {
  const diff = getFechaRecogidaDayDiff(dateStr, now);

  if (diff === null) {
    return { label: "Hoy", kind: "unknown", daysDiff: null };
  }

  if (diff === 0) {
    return { label: "Hoy", kind: "today", daysDiff: diff };
  }

  if (diff === 1) {
    return { label: "Mañana", kind: "tomorrow", daysDiff: diff };
  }

  if (diff > 1) {
    return { label: `En ${diff} días`, kind: "future", daysDiff: diff };
  }

  if (diff === -1) {
    return { label: "Ayer", kind: "past", daysDiff: diff };
  }

  return {
    label: `Hace ${Math.abs(diff)} días`,
    kind: "past",
    daysDiff: diff,
  };
};
