/**
 * Fuentes cuyo valor por sí solo no dice nada ("Trabajador", "Sucursal",
 * "Otro cliente"): necesitan mostrar también su fuente_referencia para que
 * se sepa de quién se trata.
 */
const FUENTES_CON_REFERENCIA = new Set(["Sucursal", "Trabajador", "Otro cliente"]);

/**
 * Texto a mostrar para el campo fuente en tablas/detalle: si la fuente es
 * una de las que requieren referencia y la referencia existe, la concatena
 * ("Trabajador: Fernando Ferrera Dabo"). Para el resto, devuelve la fuente tal cual.
 */
export function formatFuenteConReferencia(
  fuente?: string | null,
  fuenteReferencia?: string | null,
): string | undefined {
  if (!fuente) return undefined;
  if (FUENTES_CON_REFERENCIA.has(fuente) && fuenteReferencia) {
    return `${fuente}: ${fuenteReferencia}`;
  }
  return fuente;
}
