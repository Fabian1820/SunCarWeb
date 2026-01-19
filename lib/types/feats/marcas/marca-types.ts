// Tipos para el módulo de Marcas

/**
 * Tipos de material válidos
 */
export type TipoMaterial = 'BATERÍAS' | 'INVERSORES' | 'PANELES' | 'OTRO'

/**
 * Entidad Marca (nomenclador de marcas)
 */
export interface Marca {
  id?: string
  nombre: string
  descripcion?: string
  tipos_material: TipoMaterial[]
  is_active: boolean
}

/**
 * Request para crear una marca
 */
export interface MarcaCreateRequest {
  nombre: string
  descripcion?: string
  tipos_material: TipoMaterial[]
  is_active?: boolean
}

/**
 * Request para actualizar una marca (todos los campos opcionales)
 */
export interface MarcaUpdateRequest {
  nombre?: string
  descripcion?: string
  tipos_material?: TipoMaterial[]
  is_active?: boolean
}

/**
 * Versión simplificada de Marca para dropdowns
 */
export interface MarcaSimplificada {
  id: string
  nombre: string
  tipos_material: TipoMaterial[]
}
