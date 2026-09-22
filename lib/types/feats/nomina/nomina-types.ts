export type EstadoNomina = "abierta" | "cerrada"

export interface PeriodoNominaResumen {
  anio: number
  mes: number
  estado: EstadoNomina
}

export interface LineaNomina {
  trabajador_ci: string
  nombre: string
  departamento_id: string
  departamento_nombre: string
  cargo: string
  sedes_ids: string[]
  // Oficial (CUP)
  salario_basico: number
  /** salario básico ÷ horas base del mes (190,6) */
  tarifa_hora: number
  horas: number
  a_cobrar_cup: number
  /** Suma de lo que le toca en todos los repartos complementarios (USD). */
  complementario_usd: number
}

export interface TotalesGrupo {
  trabajadores: number
  horas: number
  a_cobrar_cup: number
  complementario_usd: number
}

export interface CargoNomina {
  cargo: string
  totales: TotalesGrupo
  trabajadores: LineaNomina[]
}

export interface DepartamentoNomina {
  departamento_id: string
  nombre: string
  totales: TotalesGrupo
  cargos: CargoNomina[]
}

/** Un trabajador dentro de un reparto complementario. */
export interface MiembroReparto {
  trabajador_ci: string
  nombre: string
  departamento_id: string
  departamento_nombre: string
  cargo: string
  sedes_ids: string[]
  /** % del trabajador en este reparto. Funciona como peso: no tiene que sumar 100. */
  porcentaje: number
  /** Su parte real: % ÷ suma de los % del reparto. */
  porcentaje_efectivo: number
  complementario_usd: number
}

/** Dinero en USD con una etiqueta, que se reparte entre sus miembros según su %. */
export interface Reparto {
  id: string
  etiqueta: string
  monto_usd: number
  /** Lo que tenía el mes anterior; solo es una sugerencia. */
  monto_anterior_usd: number
  suma_porcentajes: number
  repartido_usd: number
  /** Hay monto pero nadie con %: no se está repartiendo. */
  sin_repartir_usd: number
  miembros: MiembroReparto[]
}

export interface SedeNomina {
  id: string
  nombre: string
}

export interface HojaNomina {
  anio: number
  mes: number
  estado: EstadoNomina
  horas_base_mes: number
  cerrada_por: string | null
  cerrada_en: string | null
  totales: TotalesGrupo & { a_distribuir_usd: number; sin_repartir_usd: number }
  /** Sedes en las que hay algún trabajador este mes, para el filtro. */
  sedes: SedeNomina[]
  departamentos: DepartamentoNomina[]
  repartos: Reparto[]
}

/** Campos de la parte oficial que se editan celda a celda. */
export type CambiosLinea = Partial<Pick<LineaNomina, "salario_basico" | "horas">>

export type TipoPlantilla = "departamento" | "sede"
