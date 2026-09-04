/**
 * Depreciación de asignaciones: cuota mensual del LOTE.
 *
 * El backend expone dos campos distintos y es fácil confundirlos:
 *  - `depreciacion_mensual`       → cuota POR UNIDAD (costo / 60)
 *  - `depreciacion_mensual_total` → cuota del LOTE (unitaria × cantidad)
 *
 * El resto de derivados contables (costo_total, valor_depreciado, valor_residual)
 * son del lote, así que cualquier total o columna que se sume debe usar el de lote.
 * Usar el unitario en una suma fue justo el bug que descuadraba el Excel del plan
 * de depreciación contra la tarjeta de resumen.
 *
 * El fallback cubre el hueco mientras el backend con `depreciacion_mensual_total`
 * no esté desplegado; es la única multiplicación por cantidad que debe existir.
 */
export interface AsignacionDepreciable {
  cantidad: number
  depreciacion_mensual?: number
  depreciacion_mensual_total?: number
}

export const depMensualLote = (a: AsignacionDepreciable): number =>
  a.depreciacion_mensual_total ?? (a.depreciacion_mensual ?? 0) * a.cantidad
