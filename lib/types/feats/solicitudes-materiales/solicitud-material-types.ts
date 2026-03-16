export interface SolicitudMaterialItem {
  material_id: string;
  cantidad: number;
}

export interface SolicitudMaterialItemDetalle {
  material_id: string;
  cantidad: number;
  material_codigo?: string;
  material_descripcion?: string;
  um?: string;
  // Legacy flat fields
  codigo?: string;
  descripcion?: string;
  // Nested full catalog object
  material?: MaterialSugeridoInfo;
}

export interface SolicitudClienteInfo {
  id: string;
  numero?: string;
  nombre?: string;
  telefono?: string;
  direccion?: string;
}

export interface SolicitudAlmacenInfo {
  id: string;
  nombre: string;
  codigo?: string;
  direccion?: string;
  responsable?: string;
}

export interface SolicitudTrabajadorInfo {
  id: string;
  ci?: string;
  nombre?: string;
  cargo?: string;
}

export interface SolicitudMaterial {
  id: string;
  codigo?: string;
  estado?: "nueva" | "usada" | "anulada" | string;
  // Legacy flat IDs (kept for compatibility)
  cliente_id?: string | null;
  almacen_id: string;
  trabajador_id?: string;
  // Nested relation objects (populated since backend fix)
  cliente?: SolicitudClienteInfo | null;
  almacen?: SolicitudAlmacenInfo;
  trabajador?: SolicitudTrabajadorInfo;
  responsable_recogida?: string | null;
  fecha_recogida?: string | null;
  materiales: SolicitudMaterialItemDetalle[];
  fecha_creacion?: string;
  fecha_actualizacion?: string;
}

export interface SolicitudMaterialCreateData {
  cliente_id?: string | null;
  almacen_id: string;
  responsable_recogida?: string | null;
  fecha_recogida?: string | null;
  materiales: SolicitudMaterialItem[];
}

export interface SolicitudMaterialUpdateData {
  cliente_id?: string | null;
  almacen_id?: string;
  responsable_recogida?: string | null;
  fecha_recogida?: string | null;
  materiales?: SolicitudMaterialItem[];
}

export interface MaterialSugeridoInfo {
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

export interface MaterialSugerido {
  material_id: string;
  material_codigo?: string;
  material_descripcion?: string;
  um?: string;
  cantidad: number;
  // Nested full catalog object — populated by backend since fix
  material?: MaterialSugeridoInfo;
  // Legacy flat fields (fallback)
  codigo?: string;
  descripcion?: string;
  nombre?: string;
  foto?: string;
  precio?: number;
}

export interface MaterialesSugeridosResponse {
  materiales: MaterialSugerido[];
  materiales_sin_vinculo?: string[];
}

export interface SolicitudMaterialListResponse {
  solicitudes?: SolicitudMaterial[];
  data?: SolicitudMaterial[];
  total?: number;
  skip?: number;
  limit?: number;
}
