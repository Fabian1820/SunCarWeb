export type EstadoSolicitudEnvio =
  | "pendiente"
  | "en_proceso"
  | "completada"
  | "cancelada";

export type UrgenciaSolicitudEnvio = "normal" | "alta";

export interface MaterialSolicitudEnvio {
  material_id: string;
  material_codigo: string;
  material_nombre: string;
  material_descripcion?: string | null;
  material_foto?: string | null;
  um?: string | null;
  /** Lo que pidió el comprador local. */
  cantidad: number;
  /** Lo que compró la compradora al completar (0 = no se consiguió). */
  cantidad_comprada?: number | null;
  cantidad_actual_snapshot?: number | null;
  stockaje_minimo_snapshot?: number | null;
  motivo?: string | null;
  notas?: string | null;
}

export interface SolicitudEnvio {
  id: string;
  codigo: string;
  almacen_id?: string | null;
  urgencia: UrgenciaSolicitudEnvio;
  materiales: MaterialSolicitudEnvio[];
  estado: EstadoSolicitudEnvio;
  notas?: string | null;

  creada_por_ci?: string | null;
  creada_por_nombre?: string | null;
  creada_en?: string | null;
  actualizada_en?: string | null;

  procesada_por_ci?: string | null;
  procesada_por_nombre?: string | null;
  procesada_en?: string | null;
  notas_internacional?: string | null;

  completada_por_ci?: string | null;
  completada_por_nombre?: string | null;
  completada_en?: string | null;
  compra_id?: string | null;

  cancelada_por_ci?: string | null;
  cancelada_por_nombre?: string | null;
  cancelada_en?: string | null;
  motivo_cancelacion?: string | null;
}

export interface SolicitudEnvioCreateData {
  almacen_id?: string | null;
  urgencia?: UrgenciaSolicitudEnvio;
  materiales: MaterialSolicitudEnvio[];
  notas?: string | null;
}

export interface SolicitudEnvioUpdateData {
  almacen_id?: string | null;
  urgencia?: UrgenciaSolicitudEnvio;
  materiales?: MaterialSolicitudEnvio[];
  notas?: string | null;
}

export interface CompletarSolicitudData {
  nombre?: string;
  proveedor?: string;
  tipo?: "maritimo" | "aereo" | "local" | "otro";
  fecha_envio: string; // YYYY-MM-DD
  fecha_llegada_aproximada: string; // YYYY-MM-DD
  materiales_finales?: Array<{
    material_id: string;
    /** 0 = no se consiguió: queda fuera de la compra. */
    cantidad: number;
    precio_unitario_cif?: number;
  }>;
  notas_internacional?: string;
}

export interface ListSolicitudesEnvioParams {
  estado?: EstadoSolicitudEnvio;
  almacen_id?: string;
  urgencia?: UrgenciaSolicitudEnvio;
  codigo?: string;
  material_codigo?: string;
  creada_por_ci?: string;
  desde?: string;
  hasta?: string;
  q?: string;
  /** "cola" = orden de la bandeja internacional (urgencia + antigüedad). */
  orden?: "cola";
  page?: number;
  page_size?: number;
}

export interface SolicitudEnvioListResponse {
  data: SolicitudEnvio[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface CompletarSolicitudResponse {
  solicitud: SolicitudEnvio;
  compra_id: string;
}

/** Clave: `material_id` (el código se reescribe y dejaría la marca huérfana). */
export interface MaterialesEnSolicitudActiva {
  [materialId: string]: Array<{
    id: string;
    codigo: string;
    estado: EstadoSolicitudEnvio;
  }>;
}

export interface AlertaStockIgnorada {
  id: string;
  material_id: string;
  material_codigo?: string | null;
  material_nombre?: string | null;
  ignorada: boolean;
  motivo?: string | null;
  ignorada_por_ci?: string | null;
  ignorada_en?: string | null;
  reactivada_por_ci?: string | null;
  reactivada_en?: string | null;
}
