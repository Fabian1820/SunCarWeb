import type {
  ClienteVenta,
  ClienteVentaCreateData,
  ClienteVentaUpdateData,
} from "../clientes-ventas/cliente-venta-types";

export interface SolicitudVentaMaterialItem {
  material_id: string;
  cantidad: number;
}

export interface MaterialVentaInfo {
  id?: string;
  codigo?: string;
  nombre?: string;
  descripcion?: string;
  um?: string;
  foto?: string;
  precio?: number;
  habilitar_venta_web?: boolean;
  categoria?: string;
}

export interface SolicitudVentaMaterialItemDetalle {
  material_id: string;
  cantidad: number;
  material_codigo?: string;
  material_descripcion?: string;
  um?: string;
  codigo?: string;
  descripcion?: string;
  material?: MaterialVentaInfo;
}

export interface SolicitudVentaAlmacenInfo {
  id: string;
  nombre: string;
  codigo?: string;
  direccion?: string;
  responsable?: string;
}

export interface SolicitudVentaTrabajadorInfo {
  id: string;
  ci?: string;
  nombre?: string;
  cargo?: string;
}

export interface SolicitudVenta {
  id: string;
  codigo?: string;
  estado?: "nueva" | "usada" | "anulada" | string;
  motivo_anulacion?: string | null;
  anulada_por_ci?: string | null;
  anulada_en?: string | null;
  solicitud_origen_id?: string | null;
  solicitud_reabierta_id?: string | null;
  reabierta_por_ci?: string | null;
  reabierta_en?: string | null;
  cliente_venta_id?: string;
  cliente_venta?: ClienteVenta | null;
  almacen_id: string;
  almacen?: SolicitudVentaAlmacenInfo;
  trabajador_id?: string;
  trabajador?: SolicitudVentaTrabajadorInfo;
  materiales: SolicitudVentaMaterialItemDetalle[];
  fecha_creacion?: string;
  fecha_actualizacion?: string;
}

export interface SolicitudVentaCreateData {
  cliente_venta_id?: string;
  cliente_venta?: ClienteVentaCreateData;
  almacen_id: string;
  materiales: SolicitudVentaMaterialItem[];
}

export interface SolicitudVentaUpdateData {
  cliente_venta_id?: string;
  cliente_venta?: ClienteVentaUpdateData;
  almacen_id?: string;
  materiales?: SolicitudVentaMaterialItem[];
}

export interface SolicitudVentaAnularData {
  motivo_anulacion: string;
}

export interface SolicitudVentaListParams {
  skip?: number;
  limit?: number;
  cliente_venta_id?: string;
  cliente_venta_numero?: string;
  almacen_id?: string;
  trabajador_id?: string;
  q?: string; // Búsqueda de texto libre (antes era 'codigo')
  estado?: "nueva" | "usada" | "anulada" | string;
}

export interface SolicitudVentaListResponse {
  solicitudes?: SolicitudVenta[];
  data?: SolicitudVenta[];
  total?: number;
  skip?: number;
  limit?: number;
}

export interface MaterialVentaWeb {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  um?: string;
  foto?: string;
  precio?: number;
  habilitar_venta_web?: boolean;
  categoria?: string;
}

// ========================================
// Summary Types (Optimized for Table Views)
// ========================================

export interface SolicitudVentaSummary {
  id: string;
  codigo?: string;
  estado?: "nueva" | "usada" | "anulada" | string;
  cliente_venta_nombre?: string;
  almacen_nombre?: string;
  creador_nombre?: string;
  materiales_resumen?: string; // e.g., "4 materiales"
  fecha_creacion?: string;
}

export interface SolicitudVentaSummaryResponse {
  success?: boolean;
  message?: string;
  data: SolicitudVentaSummary[];
  total: number;
}
