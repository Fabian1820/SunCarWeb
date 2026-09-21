import { METODOS_PAGO, MONEDAS } from "@/lib/utils/solineras"
import type {
  ConfiguracionSolinera,
  MetodoPago,
  Moneda,
} from "@/lib/types/feats/solineras/solinera-types"

/**
 * Borrador de la configuración de una solinera (horario, reglas y cobro) y su
 * validación en el cliente. Los límites son los del backend
 * (`ConfiguracionSolinera` en domain/entities/solinera.py): fuera de ellos el
 * servidor responde 422, así que se comprueban antes de enviar.
 */

export type ClaveRegla =
  | "gracia_reserva_min"
  | "gracia_retiro_min"
  | "tiempo_maximo_min"
  | "duracion_minima_min"
  | "intervalo_reserva_min"
  | "reserva_anticipacion_max_dias"
  | "presentacion_anticipada_min"

export interface ReglaDef {
  clave: ClaveRegla
  etiqueta: string
  unidad: "min" | "días"
  min: number
  max: number
  ayuda: string
}

/** Reglas que afectan a una carga en el puesto. */
export const REGLAS_CARGA: ReglaDef[] = [
  {
    clave: "tiempo_maximo_min",
    etiqueta: "Tiempo máximo de una carga",
    unidad: "min",
    min: 30,
    max: 1440,
    ayuda: "Tope de una carga: el panel la marca en rojo al pasarlo. De 30 a 1440 min (24 h).",
  },
  {
    clave: "duracion_minima_min",
    etiqueta: "Tiempo mínimo de una carga",
    unidad: "min",
    min: 5,
    max: 240,
    ayuda: "Lo menos que se puede pedir al iniciar una carga. De 5 a 240 min.",
  },
  {
    clave: "gracia_retiro_min",
    etiqueta: "Margen para retirar el vehículo",
    unidad: "min",
    min: 0,
    max: 240,
    ayuda:
      "Minutos que un vehículo puede seguir en el puesto tras terminar de cargar antes de que el panel avise. De 0 a 240 min.",
  },
]

/** Reglas que afectan a las reservas. */
export const REGLAS_RESERVA: ReglaDef[] = [
  {
    clave: "gracia_reserva_min",
    etiqueta: "Espera a quien reservó",
    unidad: "min",
    min: 0,
    max: 120,
    ayuda: "Minutos que se espera a quien reservó antes de liberar el puesto. De 0 a 120 min.",
  },
  {
    clave: "presentacion_anticipada_min",
    etiqueta: "Llegada anticipada",
    unidad: "min",
    min: 0,
    max: 240,
    ayuda: "Cuánto antes de su hora puede llegar quien reservó. De 0 a 240 min.",
  },
  {
    clave: "intervalo_reserva_min",
    etiqueta: "Intervalo entre horas de reserva",
    unidad: "min",
    min: 5,
    max: 240,
    ayuda:
      "Separación entre las horas que se ofrecen al reservar: con 30 salen 8:00, 8:30, 9:00... De 5 a 240 min.",
  },
  {
    clave: "reserva_anticipacion_max_dias",
    etiqueta: "Reservar con hasta",
    unidad: "días",
    min: 1,
    max: 365,
    ayuda: "Con cuántos días de anticipación, como máximo, se puede reservar. De 1 a 365 días.",
  },
]

const TODAS_LAS_REGLAS: ReglaDef[] = [...REGLAS_CARGA, ...REGLAS_RESERVA]

// --- Borrador ---------------------------------------------------------------

export interface FilaHorario {
  /** 1 = lunes ... 7 = domingo */
  dia_semana: number
  activo: boolean
  apertura: string
  cierre: string
}

export interface BorradorConfiguracion {
  horario: FilaHorario[]
  /** Como texto: así se puede escribir un número a medias sin que salte. */
  reglas: Record<ClaveRegla, string>
  metodos_pago: MetodoPago[]
  monedas_aceptadas: Moneda[]
}

const APERTURA_POR_DEFECTO = "07:00"
const CIERRE_POR_DEFECTO = "19:00"

/** Los mismos valores por defecto que el backend, por si el detalle llegara sin configuración. */
const REGLAS_POR_DEFECTO: Record<ClaveRegla, number> = {
  gracia_reserva_min: 15,
  gracia_retiro_min: 10,
  tiempo_maximo_min: 480,
  duracion_minima_min: 15,
  intervalo_reserva_min: 30,
  reserva_anticipacion_max_dias: 30,
  presentacion_anticipada_min: 30,
}

const METODOS: MetodoPago[] = METODOS_PAGO.map((m) => m.value)

/** Deja la selección en el orden canónico, para que marcar y desmarcar no la reordene. */
export function ordenarMetodos(elegidos: readonly MetodoPago[]): MetodoPago[] {
  return METODOS.filter((m) => elegidos.includes(m))
}

export function ordenarMonedas(elegidas: readonly Moneda[]): Moneda[] {
  return MONEDAS.filter((m) => elegidas.includes(m))
}

export function borradorDesde(config: ConfiguracionSolinera | undefined): BorradorConfiguracion {
  const horario: FilaHorario[] = Array.from({ length: 7 }, (_, i) => {
    const dia = i + 1
    const h = config?.horario?.find((x) => x.dia_semana === dia)
    return {
      dia_semana: dia,
      activo: h ? h.activo : true,
      apertura: h?.apertura ?? APERTURA_POR_DEFECTO,
      cierre: h?.cierre ?? CIERRE_POR_DEFECTO,
    }
  })

  const reglas = {} as Record<ClaveRegla, string>
  for (const regla of TODAS_LAS_REGLAS) {
    reglas[regla.clave] = String(config?.[regla.clave] ?? REGLAS_POR_DEFECTO[regla.clave])
  }

  return {
    horario,
    reglas,
    metodos_pago: ordenarMetodos(config?.metodos_pago ?? METODOS),
    monedas_aceptadas: ordenarMonedas(config?.monedas_aceptadas ?? ["CUP", "USD"]),
  }
}

// --- Validación -------------------------------------------------------------

export interface ErroresConfiguracion {
  /** Por día de la semana (1..7). */
  horario: Record<number, string>
  reglas: Partial<Record<ClaveRegla, string>>
  metodos?: string
  monedas?: string
}

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/

const aMinutos = (hora: string) => {
  const [h, m] = hora.split(":")
  return Number(h) * 60 + Number(m)
}

export function validarConfiguracion(b: BorradorConfiguracion): ErroresConfiguracion {
  const errores: ErroresConfiguracion = { horario: {}, reglas: {} }

  for (const fila of b.horario) {
    if (!fila.activo) continue
    if (!HORA.test(fila.apertura) || !HORA.test(fila.cierre)) {
      errores.horario[fila.dia_semana] = "Indica la hora de apertura y la de cierre."
    } else if (aMinutos(fila.cierre) <= aMinutos(fila.apertura)) {
      errores.horario[fila.dia_semana] = "El cierre debe ser posterior a la apertura."
    }
  }

  for (const regla of TODAS_LAS_REGLAS) {
    const texto = b.reglas[regla.clave].trim()
    if (!/^\d+$/.test(texto)) {
      errores.reglas[regla.clave] = "Escribe un número entero."
      continue
    }
    const valor = Number(texto)
    if (valor < regla.min || valor > regla.max) {
      errores.reglas[regla.clave] = `Debe estar entre ${regla.min} y ${regla.max}.`
    }
  }

  // Si el mínimo supera al máximo, nadie podría iniciar una carga.
  if (!errores.reglas.duracion_minima_min && !errores.reglas.tiempo_maximo_min) {
    if (Number(b.reglas.duracion_minima_min) > Number(b.reglas.tiempo_maximo_min)) {
      errores.reglas.duracion_minima_min =
        "No puede ser mayor que el tiempo máximo de una carga."
    }
  }

  if (b.metodos_pago.length === 0) errores.metodos = "Marca al menos un método de pago."
  if (b.monedas_aceptadas.length === 0) errores.monedas = "Marca al menos una moneda."

  return errores
}

export function hayErrores(e: ErroresConfiguracion): boolean {
  return (
    Object.keys(e.horario).length > 0 ||
    Object.keys(e.reglas).length > 0 ||
    Boolean(e.metodos) ||
    Boolean(e.monedas)
  )
}

/** Arma el objeto COMPLETO que espera el backend. Solo se llama con un borrador válido. */
export function aConfiguracion(b: BorradorConfiguracion): ConfiguracionSolinera {
  const numero = (clave: ClaveRegla) => Number(b.reglas[clave].trim())
  return {
    horario: b.horario.map((f) => ({
      dia_semana: f.dia_semana,
      activo: f.activo,
      // Un día cerrado conserva horas válidas: el backend exige el formato HH:MM siempre.
      apertura: HORA.test(f.apertura) ? f.apertura : APERTURA_POR_DEFECTO,
      cierre: HORA.test(f.cierre) ? f.cierre : CIERRE_POR_DEFECTO,
    })),
    gracia_reserva_min: numero("gracia_reserva_min"),
    gracia_retiro_min: numero("gracia_retiro_min"),
    tiempo_maximo_min: numero("tiempo_maximo_min"),
    duracion_minima_min: numero("duracion_minima_min"),
    intervalo_reserva_min: numero("intervalo_reserva_min"),
    reserva_anticipacion_max_dias: numero("reserva_anticipacion_max_dias"),
    presentacion_anticipada_min: numero("presentacion_anticipada_min"),
    metodos_pago: ordenarMetodos(b.metodos_pago),
    monedas_aceptadas: ordenarMonedas(b.monedas_aceptadas),
  }
}
