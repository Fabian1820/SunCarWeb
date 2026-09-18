/** Antes era una unión fija; ahora las categorías son dinámicas (se pueden
 * crear y editar desde el panel), así que el código es cualquier string. */
export type CategoriaContabilidad = string;

export interface CategoriaIngreso {
  id: string;
  codigo: string;
  label: string;
}

export interface CategoriaIngresoUpsertRequest {
  label: string;
}

/** Montos por código de moneda (USD, CUP, EUR, MLC...), sin convertir. */
export type MontosPorMoneda = Record<string, number>;

export interface IngresosPorTipo {
  tipo: string;
  label: string;
  por_moneda: MontosPorMoneda;
  /** Total en USD (ver ContabilidadIngresos.total_usd). */
  total_usd: number;
}

export interface IngresosPorPersona {
  persona: string;
  por_moneda: MontosPorMoneda;
  total_usd: number;
}

export interface ContabilidadMovimiento {
  id: string;
  tipo: string;
  persona: string;
  detalle: string;
  moneda: string;
  monto: number;
  /** USD del cobro con la tasa real del día; null si el sistema no lo guardó. */
  monto_usd: number | null;
  excluido: boolean;
  categoria_automatica: CategoriaContabilidad;
}

export interface MovimientoExclusionUpdateRequest {
  excluido: boolean;
}

export interface MovimientoCategoriaUpdateRequest {
  categoria: CategoriaContabilidad | null;
}

export interface ContabilidadIngresos {
  por_moneda: MontosPorMoneda;
  /** Total general en USD: suma del monto_usd que el sistema guardó en cada
   * cobro (tasa real de ese día). No se convierte nada con tasas de hoy. */
  total_usd: number;
  /** Lo que no se pudo llevar a USD porque el cobro no lo guardó. */
  sin_convertir: MontosPorMoneda;
  por_tipo: IngresosPorTipo[];
  por_persona: IngresosPorPersona[];
  movimientos: ContabilidadMovimiento[];
}

export interface ContabilidadGastoMovimiento {
  fecha: string;
  persona: string;
  detalle: string;
  moneda: string;
  monto: number;
}

export interface ContabilidadGastos {
  por_moneda: MontosPorMoneda;
  movimientos: ContabilidadGastoMovimiento[];
}

export interface ContabilidadGeneral {
  ingresos: ContabilidadIngresos;
  gastos: ContabilidadGastos;
  saldo: { por_moneda: MontosPorMoneda };
}

export interface ContabilidadCategoriaResumen {
  categoria: CategoriaContabilidad;
  label: string;
  ingresos: ContabilidadIngresos;
}

export interface ContabilidadResumen {
  inicio: string;
  fin: string;
  general: ContabilidadGeneral;
  por_categoria: ContabilidadCategoriaResumen[];
}

export interface BilleteraConSaldo {
  persona: string;
  estado: string;
  por_moneda: MontosPorMoneda;
}

export interface BilleterasResumen {
  por_moneda: MontosPorMoneda;
  billeteras: BilleteraConSaldo[];
}

export interface PersonaCategoria {
  id: string;
  persona_ci?: string | null;
  persona_nombre: string;
  categoria: CategoriaContabilidad;
  activo: boolean;
}

export interface PersonaCategoriaUpsertRequest {
  persona_ci?: string | null;
  persona_nombre: string;
  categoria: CategoriaContabilidad;
  activo?: boolean;
}
