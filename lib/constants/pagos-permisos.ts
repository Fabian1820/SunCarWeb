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
 * Determina si un usuario (por su CI, o por ser superAdmin) puede editar
 * cobros/pagos.
 */
export function puedeEditarCobro(
  ci: string | null | undefined,
  isSuperAdmin?: boolean,
): boolean {
  if (isSuperAdmin) return true;
  if (!ci) return false;
  return CIS_AUTORIZADOS_EDITAR_COBRO.includes(ci.trim());
}

/**
 * Sub-permiso ADITIVO que habilita el botón "Cancelar pago" en la tabla
 * "Todos los cobros" (`facturas/pagos-clientes`).
 *
 * Es aditivo a propósito: se verifica con `hasExactPermission`, así que tener
 * el módulo padre (`facturas` o `facturas/pagos-clientes`) NO lo concede. Se
 * asigna y se quita desde el panel /permisos, sin tocar código.
 *
 * Declarado en el catálogo (`lib/modulos-catalogo.ts`, sub-permiso de
 * `facturas/pagos-clientes`), que es quien lo sincroniza con la colección
 * `modulos` de la BD.
 */
export const PERMISO_CANCELAR_COBRO = "facturas/pagos-clientes/cancelar-cobro";
