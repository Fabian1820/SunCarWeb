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
  // Oficial (CUP)
  salario_basico: number
  /** salario básico ÷ horas base del mes (190,6) */
  tarifa_hora: number
  horas: number
  a_cobrar_cup: number
  // Complementario (USD)
  participa: boolean
  /** % fijo, igual todos los meses. Funciona como peso: no tiene que sumar 100. */
  porcentaje: number
  /** Su parte real del total: % ÷ suma de los % de los seleccionados. */
  porcentaje_efectivo: number
  complementario_usd: number
}

export interface TotalesGrupo {
  trabajadores: number
  horas: number
  a_cobrar_cup: number
  participan: number
  suma_porcentajes: number
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

export interface HojaNomina {
  anio: number
  mes: number
  estado: EstadoNomina
  horas_base_mes: number
  cerrada_por: string | null
  cerrada_en: string | null
  totales: TotalesGrupo & { total_complementario_usd: number }
  departamentos: DepartamentoNomina[]
}

/** Campos que se pueden editar celda a celda en una fila. */
export type CambiosLinea = Partial<
  Pick<LineaNomina, "salario_basico" | "horas" | "participa" | "porcentaje">
>
