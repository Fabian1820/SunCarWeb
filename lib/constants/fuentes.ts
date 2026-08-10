/**
 * Catálogo FIJO de fuentes de leads/clientes.
 *
 * Single source of truth para el selector de fuente. Ya no se permiten fuentes
 * personalizadas: la lista es cerrada. Tres de ellas requieren una referencia
 * adicional (qué sucursal / qué trabajador / qué cliente):
 *   - "Sucursal"     → se elige una sede
 *   - "Trabajador"   → se elige el trabajador que refirió
 *   - "Otro cliente" → se elige el cliente que recomendó
 */

export const FUENTES_FIJAS = [
  "Página Web",
  "Instagram",
  "Facebook",
  "Messenger",
  "Mensaje de WhatsApp",
  "Llamada",
  "Correo",
  "Directo",
  "Visita",
  "Sucursal",
  "Trabajador",
  "Otro cliente",
] as const

export type FuenteFija = (typeof FUENTES_FIJAS)[number]

/** Fuentes que requieren seleccionar una referencia concreta. */
export const FUENTES_CON_REFERENCIA: FuenteFija[] = [
  "Sucursal",
  "Trabajador",
  "Otro cliente",
]

/** Indica si una fuente requiere referencia adicional. */
export function fuenteRequiereReferencia(fuente?: string | null): boolean {
  return !!fuente && FUENTES_CON_REFERENCIA.includes(fuente as FuenteFija)
}

/** Etiqueta del sub-selector según la fuente. */
export function etiquetaReferencia(fuente?: string | null): string {
  switch (fuente) {
    case "Sucursal":
      return "Sucursal"
    case "Trabajador":
      return "Trabajador que refirió"
    case "Otro cliente":
      return "Cliente que recomendó"
    default:
      return "Referencia"
  }
}
