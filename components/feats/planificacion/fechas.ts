/** Fechas de Planificación, siempre en hora local y como "YYYY-MM-DD". */

export const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
export const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** Con toISOString, a partir de las 8 de la noche "mañana" era pasado. */
export function isoLocal(d: Date): string {
  const dd = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${dd(d.getMonth() + 1)}-${dd(d.getDate())}`;
}

export function aFecha(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function esFechaIso(texto: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(texto) && !Number.isNaN(aFecha(texto).getTime());
}

export function desplazar(iso: string, dias: number): string {
  const f = aFecha(iso);
  f.setDate(f.getDate() + dias);
  return isoLocal(f);
}

/** "Mañana, martes 15 de septiembre" o "Jueves 24 de septiembre". */
export function nombreDia(iso: string, hoy: string): string {
  const f = aFecha(iso);
  const largo = `${DIAS[f.getDay()]} ${f.getDate()} de ${MESES[f.getMonth()]}`;
  const relativo =
    iso === hoy ? "Hoy" : iso === desplazar(hoy, 1) ? "Mañana" : iso === desplazar(hoy, -1) ? "Ayer" : null;
  return relativo ? `${relativo}, ${largo}` : largo.charAt(0).toUpperCase() + largo.slice(1);
}

/** "hoy", "mañana" o "el martes 15". */
export function diaCorto(iso: string, hoy: string): string {
  if (iso === hoy) return "hoy";
  if (iso === desplazar(hoy, 1)) return "mañana";
  if (iso === desplazar(hoy, -1)) return "ayer";
  const f = aFecha(iso);
  return `el ${DIAS[f.getDay()]} ${f.getDate()}`;
}

/** "de mañana" o "del martes 15": para "el plan de…" sin que salga "de el". */
export function delDia(iso: string, hoy: string): string {
  const corto = diaCorto(iso, hoy);
  return corto.startsWith("el ") ? `del ${corto.slice(3)}` : `de ${corto}`;
}
