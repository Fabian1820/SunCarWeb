export type MonedaPresupuesto = "USD" | "CUP";

export type EstadoPresupuesto =
  | "borrador"
  | "enviada"
  | "devuelta"
  | "aprobada"
  | "anulada";

export type EstadoItemPresupuesto = "pendiente" | "aprobado" | "rechazado";

export type TipoPresupuesto = "ordinario" | "extraordinario";

export const TITULO_PRESUPUESTO_POR_DEFECTO =
  "Presupuesto para el cumplimiento de las actividades de Logística, Transporte y Seguridad Interna";

/**
 * El ítem no lleva precio unitario ni cantidad numérica: el logístico calcula
 * fuera y escribe el importe total de la línea, igual que en el Word que se usa
 * hoy. `cantidad_um` es un único campo de texto ("6 galones", "2 sacos").
 *
 * `importe` puede venir vacío: en el documento real hay líneas sin importe
 * ("Mano de Obra") y bloques donde un importe cubre varias líneas seguidas.
 */
export interface ItemPresupuesto {
  numero: number;
  local: string | null;
  /** Solo la usa el bloque de Seguridad y Protección ("Custodios"). */
  actividad: string | null;
  material: string;
  cantidad_um: string | null;
  importe: number | null;
  moneda: MonedaPresupuesto | null;
  estado: EstadoItemPresupuesto;
  comentario_rechazo: string | null;
  /** Sugerencia del aprobador. Nunca sustituye a `importe`. */
  importe_sugerido: number | null;
  moneda_sugerida: MonedaPresupuesto | null;
}

export interface SedePresupuesto {
  orden: number;
  /** null cuando el nombre se escribió a mano y no es una sede registrada. */
  sede_id: string | null;
  sede_nombre: string;
  items: ItemPresupuesto[];
}

export interface TotalSede {
  orden: number;
  sede_id: string | null;
  sede_nombre: string;
  es_sede_registrada: boolean;
  total_usd: number;
  total_cup: number;
  total_en_usd: number;
  cantidad_items: number;
}

export interface TotalesPresupuesto {
  por_sede: TotalSede[];
  total_usd: number;
  total_cup: number;
  total_cup_en_usd: number;
  total_general_usd: number;
  tasa_cup_por_usd: number;
  /** El backend decide el layout según cuántos bloques haya. */
  layout_tabla: "ancha" | "transpuesta";
}

export interface ResumenRevision {
  pendientes: number;
  aprobados: number;
  rechazados: number;
  total: number;
}

export interface RondaHistorial {
  ronda: number;
  accion: string;
  estado_resultante: EstadoPresupuesto;
  por_ci: string | null;
  por_nombre: string | null;
  en: string;
  comentario: string | null;
  tasa_cup_por_usd: number | null;
}

export interface PresupuestoLogistica {
  id: string;
  numero: string;
  titulo: string;
  tipo: TipoPresupuesto;
  mes: number;
  anio: number;
  estado: EstadoPresupuesto;
  tasa_cup_por_usd: number;
  sedes: SedePresupuesto[];

  confeccionado_por_ci: string | null;
  confeccionado_por_nombre: string | null;
  confeccionado_por_cargo: string | null;

  aprobado_por_ci: string | null;
  aprobado_por_nombre: string | null;
  aprobado_por_cargo: string | null;
  aprobado_en: string | null;

  enviado_en: string | null;
  devuelto_en: string | null;
  comentario_devolucion: string | null;

  anulada: boolean;
  motivo_anulacion: string | null;
  anulada_en: string | null;

  ronda: number;
  historial: RondaHistorial[];

  fecha_creacion: string;
  fecha_actualizacion: string;

  totales: TotalesPresupuesto;
  revision: ResumenRevision;
  editable: boolean;
}

export interface ItemPresupuestoInput {
  numero: number;
  local?: string | null;
  actividad?: string | null;
  material: string;
  cantidad_um?: string | null;
  importe?: number | null;
  moneda?: MonedaPresupuesto | null;
}

export interface SedePresupuestoInput {
  orden: number;
  sede_id?: string | null;
  sede_nombre: string;
  items: ItemPresupuestoInput[];
}

export interface PresupuestoCreateData {
  titulo?: string;
  tipo: TipoPresupuesto;
  mes: number;
  anio: number;
  tasa_cup_por_usd: number;
  sedes: SedePresupuestoInput[];
}

export interface PresupuestoUpdateData {
  titulo?: string;
  tasa_cup_por_usd?: number;
  sedes?: SedePresupuestoInput[];
}

export interface DecisionItem {
  sede_nombre: string;
  numero: number;
  estado: EstadoItemPresupuesto;
  comentario_rechazo?: string | null;
  importe_sugerido?: number | null;
  moneda_sugerida?: MonedaPresupuesto | null;
}

export interface SugerenciasPresupuesto {
  materiales: string[];
  locales: string[];
  sedes_libres: string[];
}

export interface ListarPresupuestosParams {
  anio?: number;
  mes?: number;
  estado?: EstadoPresupuesto;
  tipo?: TipoPresupuesto;
  skip?: number;
  limit?: number;
}

export const ESTADO_PRESUPUESTO_LABEL: Record<EstadoPresupuesto, string> = {
  borrador: "Borrador",
  enviada: "Enviado a aprobación",
  devuelta: "Devuelto para ajuste",
  aprobada: "Aprobado",
  anulada: "Anulado",
};

export const MESES_ES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
] as const;

export function nombreMes(mes: number): string {
  return MESES_ES[mes - 1] ?? String(mes);
}
