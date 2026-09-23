/**
 * Permisos de Facturación → Por facturar. Los tres son ADITIVOS y se
 * verifican con `hasExactPermission`: tener "facturas" no los concede, hay que
 * asignarlos explícitamente desde /permisos. Solo el superAdmin los tiene de
 * oficio.
 *
 * El backend comprueba los mismos (presentation/routers/facturacion_pendiente_router.py).
 */

/** Ver el módulo: la lista de clientes por facturar y su detalle. */
export const PERMISO_POR_FACTURAR = "facturas/por-facturar"

/** Facturar una oferta o marcarla como "no facturar". */
export const PERMISO_POR_FACTURAR_FACTURAR = "facturas/por-facturar/facturar"

/** Pestaña "Oferta vs almacén": lo ofertado contra lo que salió en vales. */
export const PERMISO_POR_FACTURAR_COMPARATIVA = "facturas/por-facturar/comparativa"

export const PERMISOS_POR_FACTURAR = [
  PERMISO_POR_FACTURAR,
  PERMISO_POR_FACTURAR_FACTURAR,
  PERMISO_POR_FACTURAR_COMPARATIVA,
]
