export type CategoriaContabilidad =
  | "instaladora_habana"
  | "instaladora_santa_clara"
  | "instaladora_las_tunas"
  | "ventas_habana"
  | "logistica_transporte_seguridad"
  | "socios_ceo"
  | "director"
  | "otros_ingresos";

export const CATEGORIAS_CONTABILIDAD: { value: CategoriaContabilidad; label: string }[] = [
  { value: "instaladora_habana", label: "Instaladora Habana" },
  { value: "instaladora_santa_clara", label: "UEB Santa Clara" },
  { value: "instaladora_las_tunas", label: "UEB Las Tunas" },
  { value: "ventas_habana", label: "Suncar Ventas Habana" },
  { value: "logistica_transporte_seguridad", label: "Logística, transporte y seguridad" },
  { value: "socios_ceo", label: "Ingresos socios o CEO" },
  { value: "director", label: "Ingresos director" },
  { value: "otros_ingresos", label: "Otros ingresos" },
];

/** Montos por código de moneda (USD, CUP, EUR, MLC...), sin convertir. */
export type MontosPorMoneda = Record<string, number>;

export interface IngresosPorTipo {
  tipo: string;
  label: string;
  por_moneda: MontosPorMoneda;
}

export interface IngresosPorPersona {
  persona: string;
  por_moneda: MontosPorMoneda;
}

export interface ContabilidadIngresos {
  por_moneda: MontosPorMoneda;
  por_tipo: IngresosPorTipo[];
  por_persona: IngresosPorPersona[];
}

export interface ContabilidadGeneral {
  ingresos: ContabilidadIngresos;
  gastos: { por_moneda: MontosPorMoneda };
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
