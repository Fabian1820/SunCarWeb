import type { Moneda } from "@/lib/types/feats/solineras/solinera-types"

/**
 * Cálculo del importe de una carga, idéntico al del backend
 * (`calcular_importe` en application/services/solinera_calculos.py). Si allí
 * cambia la fórmula, hay que cambiarla aquí también: la vista previa de las
 * tarifas y los cálculos del mostrador deben dar la misma cifra que el ticket.
 *
 * Se cobra por hora, en fracciones completas y nunca menos del mínimo.
 */

/** Lo que define cómo se cobra: es la parte de una `Tarifa` (o de su copia en la carga) que interviene. */
export interface ReglaCobro {
  precio_hora: number
  fraccion_min: number
  minimo_min: number
  moneda: Moneda
}

export interface DesgloseImporte {
  /** Minutos reales que se pasaron a la fórmula (enteros, sin negativos). */
  minutos: number
  /** `max(minutos, minimo)`: lo que se cobra antes de completar la fracción. */
  cobrables: number
  /** Fracciones completas que se cobran. */
  fracciones: number
  /** `fracciones * fraccion`: los minutos que finalmente se cobran. */
  minutos_cobrados: number
  /** Ya redondeado: a la unidad si es CUP, a 2 decimales si no. */
  importe: number
  /** true si el mínimo subió la cuenta (el cliente estuvo menos que el mínimo). */
  aplicaMinimo: boolean
}

/** Entero no negativo; lo que no es un número finito cuenta como 0. Como el `int()` del backend, trunca. */
function entero(valor: number): number {
  return Number.isFinite(valor) ? Math.max(0, Math.trunc(valor)) : 0
}

/**
 * Redondeo «mitad hacia arriba» de `precio * minutos / 60`, como el
 * `ROUND_HALF_UP` de Decimal del backend. Se hace con enteros porque en coma
 * flotante 1,005 se queda en 1,00499… y el resultado difería en un centavo.
 *
 * El precio se escala a 4 decimales (nadie tarifa con más). Con `decimales`
 * decimales de resultado: importe = precio_hora * minutos / 60.
 */
function importeRedondeado(precioHora: number, minutosCobrados: number, decimales: 0 | 2): number {
  const ESCALA_PRECIO = 10_000
  const precioEscalado = Math.round(Math.max(0, precioHora) * ESCALA_PRECIO)
  const numerador = precioEscalado * minutosCobrados
  const denominador = 60 * (ESCALA_PRECIO / 10 ** decimales)
  const unidades = Math.floor((2 * numerador + denominador) / (2 * denominador))
  return decimales === 0 ? unidades : unidades / 100
}

/**
 * Importe de una carga de `minutos` con la regla de cobro dada.
 *
 * ```
 * cobrables        = max(minutos, minimo)
 * fracciones       = ceil(cobrables / fraccion)
 * minutos_cobrados = fracciones * fraccion
 * importe          = precio_hora * minutos_cobrados / 60
 * ```
 * Ejemplo: 250 CUP/h, fracción 15, mínimo 30 y 70 minutos → 75 min → 313 CUP.
 */
export function calcularImporte(regla: ReglaCobro, minutos: number): DesgloseImporte {
  const fraccion = Math.max(entero(regla.fraccion_min), 1)
  const minimo = entero(regla.minimo_min)
  const reales = entero(minutos)
  const cobrables = Math.max(reales, minimo)
  const fracciones = Math.ceil(cobrables / fraccion)
  const minutosCobrados = fracciones * fraccion
  return {
    minutos: reales,
    cobrables,
    fracciones,
    minutos_cobrados: minutosCobrados,
    importe: importeRedondeado(regla.precio_hora, minutosCobrados, regla.moneda === "CUP" ? 0 : 2),
    aplicaMinimo: minimo > reales,
  }
}
