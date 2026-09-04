/**
 * Estados posibles de un cliente, tal como se guardan en `clientes.estado`.
 *
 * Fuente única para los selectores que filtran por estado del cliente
 * (tabla de clientes, informes de dirección…). El texto es el valor real de
 * BD, con tildes y mayúsculas incluidas: cualquier comparación debe
 * normalizarse antes (ver `normalizarEstadoCliente`).
 */
export const ESTADOS_CLIENTE = [
  "Equipo instalado con éxito",
  "Esperando equipo",
  "Pendiente de instalación",
  "Instalación en Proceso",
  "Pendiente de visita",
  "Pendiente de visitarnos",
  "No interesado",
] as const

/** Estado que marca la obra ya terminada (base del informe de cobros). */
export const ESTADO_EQUIPO_INSTALADO = "Equipo instalado con éxito"

/** Minúsculas y sin tildes, para comparar estados que vienen escritos distinto. */
export function normalizarEstadoCliente(estado?: string | null): string {
  return (estado || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
}
