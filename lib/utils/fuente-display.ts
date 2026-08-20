/**
 * Fuentes cuyo valor por sí solo no dice nada ("Trabajador", "Sucursal",
 * "Otro cliente"): necesitan mostrar también su fuente_referencia para que
 * se sepa de quién se trata.
 */
const FUENTES_CON_REFERENCIA = new Set(["Sucursal", "Trabajador", "Otro cliente"]);

/** True si esta fuente necesita mostrar su fuente_referencia para tener sentido. */
export function esFuenteConReferencia(fuente?: string | null): boolean {
  return !!fuente && FUENTES_CON_REFERENCIA.has(fuente);
}

/**
 * Texto de una sola línea para el campo fuente (tooltips, detalle en texto
 * plano): si la fuente requiere referencia y la tiene, la concatena
 * ("Trabajador: Fernando Ferrera Dabo"). Para el resto, devuelve la fuente
 * tal cual.
 */
export function formatFuenteConReferencia(
  fuente?: string | null,
  fuenteReferencia?: string | null,
): string | undefined {
  if (!fuente) return undefined;
  if (esFuenteConReferencia(fuente) && fuenteReferencia) {
    return `${fuente}: ${fuenteReferencia}`;
  }
  return fuente;
}
