export interface SolicitudMaterialItem {
  material_id: string
  cantidad: number
}

export interface SolicitudMaterialItemDetalle {
  material_id: string
  cantidad: number
  codigo?: string
  descripcion?: string
  um?: string
}

export interface SolicitudMaterial {
  id: string
  codigo?: string
  cliente_id?: string | null
  cliente_nombre?: string
  cliente_numero?: string
  almacen_id: string
  almacen_nombre?: string
  trabajador_id?: string
  trabajador_nombre?: string
  materiales: SolicitudMaterialItemDetalle[]
  fecha_creacion?: string
  fecha_actualizacion?: string
}

export interface SolicitudMaterialCreateData {
  cliente_id?: string | null
  almacen_id: string
  materiales: SolicitudMaterialItem[]
}

export interface SolicitudMaterialUpdateData {
  cliente_id?: string | null
  almacen_id?: string
  materiales?: SolicitudMaterialItem[]
}

export interface MaterialSugerido {
  material_id: string
  codigo?: string
  descripcion?: string
  nombre?: string
  um?: string
  cantidad: number
  foto?: string
  precio?: number
}

export interface MaterialesSugeridosResponse {
  materiales: MaterialSugerido[]
  materiales_sin_vinculo?: string[]
}

export interface SolicitudMaterialListResponse {
  solicitudes?: SolicitudMaterial[]
  data?: SolicitudMaterial[]
  total?: number
  skip?: number
  limit?: number
}
