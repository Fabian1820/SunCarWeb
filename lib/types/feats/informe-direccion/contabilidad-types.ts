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
  { value: "instaladora_santa_clara", label: "Instaladora Santa Clara" },
  { value: "instaladora_las_tunas", label: "Instaladora Las Tunas" },
  { value: "ventas_habana", label: "Suncar Ventas Habana" },
  { value: "logistica_transporte_seguridad", label: "Logística, transporte y seguridad" },
  { value: "socios_ceo", label: "Ingresos socios o CEO" },
  { value: "director", label: "Ingresos director" },
  { value: "otros_ingresos", label: "Otros ingresos" },
];

export interface ContabilidadGeneral {
  ingresos: number;
  ingresos_instaladora: number;
  ingresos_ventas: number;
  ingresos_otros_wallet: number;
  gastos: number;
  saldo: number;
}

export interface ContabilidadCategoriaResumen {
  categoria: CategoriaContabilidad;
  label: string;
  ingresos: number;
  gastos: number;
  saldo: number;
}

export interface ContabilidadSinCategoria {
  ingresos: number;
  gastos: number;
  saldo: number;
  personas: string[];
}

export interface ContabilidadResumen {
  inicio: string;
  fin: string;
  general: ContabilidadGeneral;
  por_categoria: ContabilidadCategoriaResumen[];
  sin_categoria: ContabilidadSinCategoria;
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
