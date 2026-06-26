/**
 * Usuarios autorizados (por CI) para editar cobros/pagos de clientes.
 *
 * La edición de cobros está restringida a estos usuarios. El botón de editar
 * solo se muestra para ellos y la trazabilidad de la edición (quién y cuándo)
 * se registra siempre en el backend.
 */
export const CIS_AUTORIZADOS_EDITAR_COBRO: readonly string[] = [
  "89111923372", // Yanaisi Matamoros Barnet
  "93030504902", // Mauricio Delfin Alvarez Ricardo
];

/**
 * Determina si un usuario (por su CI) puede editar cobros/pagos.
 */
export function puedeEditarCobro(ci: string | null | undefined): boolean {
  if (!ci) return false;
  return CIS_AUTORIZADOS_EDITAR_COBRO.includes(ci.trim());
}
