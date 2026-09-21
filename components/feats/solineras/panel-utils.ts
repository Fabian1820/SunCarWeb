import { SolineraService } from "@/lib/services/feats/solineras/solinera-service"
import type { Moneda, Tarifa, TipoVehiculo } from "@/lib/types/feats/solineras/solinera-types"

/** La tarifa que se aplicaría a un tipo de vehículo: la suya, o la general. */
export function tarifaPara(tarifas: Tarifa[], tipo: TipoVehiculo): Tarifa | undefined {
  const activas = tarifas.filter((t) => t.activa)
  return activas.find((t) => t.tipo_vehiculo === tipo) ?? activas.find((t) => t.tipo_vehiculo === null)
}

/** Convierte lo escrito en un campo numérico ("1,5" o "1.5") a número; NaN si no es válido. */
export function leerNumero(texto: string): number {
  if (texto.trim() === "") return Number.NaN
  return Number(texto.replace(",", "."))
}

/**
 * Abre el ticket en una pestaña nueva.
 *
 * Los navegadores solo dejan abrir una ventana desde el gesto del usuario, y el
 * ticket hay que pedirlo al servidor (asíncrono): por eso `prepararVentana` se
 * llama primero, dentro del clic, y `mostrarTicket` la rellena cuando llega el PDF.
 * Si el navegador la bloquea, devuelve null y quien llama ofrece un botón.
 */
export function prepararVentana(): Window | null {
  return window.open("about:blank", "_blank")
}

export async function mostrarTicket(
  solineraId: string,
  cargaId: string,
  ventana: Window | null,
): Promise<boolean> {
  try {
    const pdf = await SolineraService.ticketPdf(solineraId, cargaId)
    const url = URL.createObjectURL(pdf)
    // Se libera pasado un rato: la pestaña nueva ya tiene el archivo cargado.
    setTimeout(() => URL.revokeObjectURL(url), 5 * 60_000)
    if (ventana && !ventana.closed) {
      ventana.location.href = url
      return true
    }
    return window.open(url, "_blank") !== null
  } catch (error) {
    ventana?.close()
    throw error
  }
}

/** Cuánto suma lo que falta cobrar, expresado en la moneda en que paga el cliente. */
export function pendienteEnMoneda(
  pendiente: number,
  monedaCarga: Moneda,
  monedaPago: Moneda,
  tasaCup: number,
): number | null {
  if (monedaPago === monedaCarga) return pendiente
  if (!(tasaCup > 0)) return null
  if (monedaCarga === "CUP") return pendiente / tasaCup
  if (monedaPago === "CUP") return pendiente * tasaCup
  return null // dos monedas extranjeras: hay que pasar por CUP
}

/** Lo que un pago aporta a la carga, en la moneda de la carga. */
export function aplicadoEnMonedaCarga(
  monto: number,
  monedaPago: Moneda,
  monedaCarga: Moneda,
  tasaCup: number,
): number | null {
  if (monedaPago === monedaCarga) return monto
  if (!(tasaCup > 0)) return null
  if (monedaCarga === "CUP") return monto * tasaCup
  if (monedaPago === "CUP") return monto / tasaCup
  return null
}
