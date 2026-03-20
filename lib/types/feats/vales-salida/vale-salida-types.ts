export interface ValeSalidaMaterialItem {
  material_id: string;
  cantidad: number;
  numero_serie?: string;
}

export type ValeSolicitudTipo = "material" | "venta";

export interface ValeSalidaMaterialItemDetalle {
  material_id: string;
  cantidad: number;
  numero_serie?: string;
  alerta_stock?: boolean;
  stock_suficiente?: boolean;
  stock_actual?: number;
  stock_despues?: number;
  faltante?: number;
  material_codigo?: string;
  material_descripcion?: string;
  um?: string;
  codigo?: string;
  descripcion?: string;
  material?: ValeMaterialInfo;
}

export interface ValeMaterialInfo {
  codigo?: string;
  nombre?: string;
  descripcion?: string;
  um?: string;
  foto?: string;
  precio?: number;
  marca_id?: string;
  potenciaKW?: number;
  categoria?: string;
}

export interface ValeClienteInfo {
  id: string;
  numero?: string;
  nombre?: string;
  telefono?: string;
  direccion?: string;
}

export interface ValeAlmacenInfo {
  id: string;
  nombre: string;
  codigo?: string;
  direccion?: string;
  responsable?: string;
}

export interface ValeTrabajadorInfo {
  id: string;
  ci?: string;
  nombre?: string;
  cargo?: string;
}

export interface ValeSolicitudInfo {
  id: string;
  codigo?: string;
  motivo_anulacion?: string | null;
  anulada_por_ci?: string | null;
  anulada_en?: string | null;
  solicitud_origen_id?: string | null;
  solicitud_reabierta_id?: string | null;
  reabierta_por_ci?: string | null;
  reabierta_en?: string | null;
  cliente?: ValeClienteInfo | null;
  cliente_venta?: ValeClienteInfo | null;
  almacen?: ValeAlmacenInfo;
  trabajador?: ValeTrabajadorInfo;
  responsable_recogida?: string | null;
  recogio_por?: string | null;
  recogido_por?: string | null;
  recibido_por?: string | null;
  fecha_recogida?: string | null;
  estado?: string;
}

export interface ValeSalida {
  id: string;
  codigo?: string;
  estado?: "usado" | "anulado" | string;
  facturado?: boolean;
  recogio_por?: string | null;
  recogido_por?: string | null;
  recibido_por?: string | null;
  motivo_anulacion?: string | null;
  movimientos_ids?: string[];
  solicitud_tipo?: ValeSolicitudTipo | string;
  solicitud_material_id?: string;
  solicitud_venta_id?: string;
  // Legacy fallback kept for compatibility with old responses
  solicitud_id?: string;
  trabajador_id?: string;
  solicitud_material?: ValeSolicitudInfo | null;
  solicitud_venta?: ValeSolicitudInfo | null;
  // Legacy fallback kept for compatibility with old responses
  solicitud?: ValeSolicitudInfo | null;
  trabajador?: ValeTrabajadorInfo;
  materiales: ValeSalidaMaterialItemDetalle[];
  total_materiales?: number;
  creado_por_ci?: string;
  fecha_creacion?: string;
  fecha_actualizacion?: string;
}

export interface ValeSalidaCreateData {
  solicitud_material_id?: string;
  solicitud_venta_id?: string;
  materiales: ValeSalidaMaterialItem[];
}

export interface ValeSalidaAnularData {
  motivo_anulacion: string;
}

export interface ValeSolicitudPendiente {
  tipo_solicitud: ValeSolicitudTipo | string;
  solicitud_id: string;
  codigo?: string;
  estado?: "nueva" | "usada" | string;
  tiene_alertas_stock?: boolean;
  total_materiales_con_alerta?: number;
  cliente?: ValeClienteInfo | null;
  cliente_venta?: ValeClienteInfo | null;
  almacen?: ValeAlmacenInfo;
  trabajador?: ValeTrabajadorInfo;
  responsable_recogida?: string | null;
  recogio_por?: string | null;
  recogido_por?: string | null;
  recibido_por?: string | null;
  fecha_recogida?: string | null;
  materiales: ValeSalidaMaterialItemDetalle[];
  vale_id?: string | null;
  puede_generar_vale?: boolean;
  fecha_creacion?: string;
  fecha_actualizacion?: string;
}

export interface ValeSalidaListResponse {
  vales?: ValeSalida[];
  data?: ValeSalida[];
  total?: number;
  skip?: number;
  limit?: number;
}

export interface DevolucionValeMaterialPayload {
  material_id: string;
  cantidad: number;
}

export interface DevolucionValeCreateData {
  vale_id: string;
  responsable_devolucion: string;
  comentario?: string;
  materiales: DevolucionValeMaterialPayload[];
}

export interface DevolucionValeMaterial {
  material_id: string;
  cantidad: number;
  material_codigo?: string;
  material_descripcion?: string;
  um?: string;
}

export interface DevolucionVale {
  id: string;
  vale_id: string;
  responsable_devolucion?: string;
  comentario?: string | null;
  materiales: DevolucionValeMaterial[];
  creado_por_ci?: string;
  fecha_creacion?: string;
  fecha_actualizacion?: string;
}

export interface DevolucionValeResumenMaterial {
  material_id: string;
  cantidad_salida: number;
  cantidad_devuelta: number;
  cantidad_disponible_devolver: number;
  material_codigo?: string;
  material_descripcion?: string;
  um?: string;
}

export interface DevolucionValeResumen {
  vale_id: string;
  materiales: DevolucionValeResumenMaterial[];
}

// ========================================
// Summary Types (Optimized for Table Views)
// ========================================

export interface ValeSalidaSummary {
  id: string;
  codigo?: string;
  solicitud_tipo?: "material" | "venta";
  solicitud_codigo?: string;
  estado?: "usado" | "anulado" | string;
  materiales_resumen?: string; // e.g., "5 materiales"
  cliente_nombre?: string;
  creador_nombre?: string;
  recibido_por?: string | null;
  fecha_creacion?: string;
}

export interface ValeSalidaSummaryResponse {
  success?: boolean;
  message?: string;
  data: ValeSalidaSummary[];
  total: number;
}
