export interface ValeSalidaMaterialItem {
  material_id: string;
  cantidad: number;
}

export type ValeSolicitudTipo = "material" | "venta";

export interface ValeSalidaMaterialItemDetalle {
  material_id: string;
  cantidad: number;
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
