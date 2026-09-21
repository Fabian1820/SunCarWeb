export type FormaCobro = "tarjeta" | "efectivo"
export type EstadoNomina = "abierta" | "cerrada"

export interface PeriodoNominaResumen {
  anio: number
  mes: number
  estado: EstadoNomina
}

export interface LineaNomina {
  anio: number
  mes: number
  trabajador_ci: string
  nombre: string
  departamento_id: string
  departamento_nombre: string
  // Oficial (CUP)
  horas: number
  tarifa_hora: number
  retenciones: number
  bruto_cup: number
  neto_cup: number
  // Complementario (USD): % del fondo de su departamento
  porcentaje_depto: number
  complementario_usd: number
  forma_cobro: FormaCobro
  tarjeta: string | null
  pagado_oficial: boolean
  pagado_complementario: boolean
  pagado_oficial_en?: string | null
  pagado_complementario_en?: string | null
  notas: string | null
}

export interface TotalesDepartamento {
  horas: number
  bruto_cup: number
  retenciones_cup: number
  neto_cup: number
  complementario_usd: number
}

export interface DepartamentoNomina {
  departamento_id: string
  nombre: string
  fondo_usd: number
  fondo_anterior_usd: number
  porcentaje_asignado: number
  repartido_usd: number
  sin_repartir_usd: number
  excedido: boolean
  totales: TotalesDepartamento
  trabajadores: LineaNomina[]
}

export interface TotalesNomina extends TotalesDepartamento {
  /** Solo viene si el mes tiene tasa de cambio. */
  total_real_cup: number | null
}

export interface HojaNomina {
  anio: number
  mes: number
  estado: EstadoNomina
  tasa_cambio: number | null
  cerrada_por: string | null
  cerrada_en: string | null
  totales: TotalesNomina
  departamentos: DepartamentoNomina[]
}

/** Campos que se pueden editar celda a celda en una fila. */
export type CambiosLinea = Partial<
  Pick<
    LineaNomina,
    | "horas"
    | "tarifa_hora"
    | "retenciones"
    | "porcentaje_depto"
    | "forma_cobro"
    | "tarjeta"
    | "pagado_oficial"
    | "pagado_complementario"
    | "notas"
  >
>
