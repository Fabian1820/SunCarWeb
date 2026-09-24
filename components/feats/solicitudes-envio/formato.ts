import { parseFechaUtc } from "@/lib/utils/fecha-utc";

/**
 * Las fechas de la solicitud llegan del backend en UTC y sin zona; leídas con
 * `new Date()` salían 4 horas adelantadas (y con fecha de mañana a partir de
 * las 8 de la noche).
 */
export function fechaHora(iso?: string | null): string {
  const fecha = parseFechaUtc(iso);
  return fecha ? fecha.toLocaleString() : "—";
}

export function fechaCorta(iso?: string | null): string {
  const fecha = parseFechaUtc(iso);
  return fecha ? fecha.toLocaleDateString() : "—";
}

/** Día local en formato `YYYY-MM-DD` (para inputs de fecha), `dias` después de hoy. */
export function diaLocal(dias = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toLocaleDateString("en-CA");
}

/** Nombre de quien hizo la acción; el CI solo si no se guardó el nombre. */
export function persona(nombre?: string | null, ci?: string | null): string {
  return nombre || ci || "—";
}
