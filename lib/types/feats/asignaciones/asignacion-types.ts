// ── Medios Básicos ────────────────────────────────────────────────────────────

export interface MedioBasico {
  id: string
  codigo?: string | null
  nombre: string
  precio?: number | null
}

export interface MedioBasicoCreateData {
  nombre: string
  precio?: number
}

export interface MedioBasicoUpdateData {
  nombre?: string
  precio?: number
}

// ── Asignaciones trabajadores ─────────────────────────────────────────────────

export interface Asignacion {
  id: string
  item_tipo: 'medio_basico' | 'material'
  item_id: string
  nombre: string
  precio?: number | null
  cantidad: number
  numero_serie?: string | null
  asignado_por?: string | null
}

// Forma plana que devuelve el endpoint GET /asignaciones-trabajadores/
export interface AsignacionTrabajadorFlat extends Asignacion {
  ci: string
}

export interface TrabajadorConAsignaciones {
  id?: string
  CI: string
  nombre: string
  cargo: string
  asignaciones: Asignacion[]
}

export interface AsignacionCreateData {
  item_tipo: 'medio_basico' | 'material'
  item_id: string
  cantidad: number
  numero_serie?: string
  asignado_por?: string
}

export interface AsignacionUpdateData {
  cantidad?: number
  numero_serie?: string
}

// ── Asignaciones instalaciones ────────────────────────────────────────────────

export type TipoInstalacion = 'almacen' | 'tienda' | 'sede'

export interface Instalacion {
  id: string
  nombre: string
  codigo?: string
}

export interface AsignacionInstalacion {
  id: string
  item_tipo: 'medio_basico' | 'material'
  item_id: string
  nombre: string
  precio?: number | null
  cantidad: number
  numero_serie?: string | null
  asignado_por?: string | null
}

export interface InstalacionConAsignaciones {
  id: string
  nombre: string
  codigo?: string
  asignaciones: AsignacionInstalacion[]
}

// Forma plana que devuelve el endpoint GET /asignaciones-instalaciones/{tipo}
export interface AsignacionInstalacionFlat extends AsignacionInstalacion {
  instalacion_id: string
}

export interface AsignacionInstalacionCreateData {
  item_tipo: 'medio_basico' | 'material'
  item_id: string
  cantidad: number
  numero_serie?: string
  asignado_por?: string
}

export interface AsignacionInstalacionUpdateData {
  cantidad?: number
  numero_serie?: string
}

// ── Catálogo de materiales ────────────────────────────────────────────────────

export interface MaterialCatalogo {
  material_id: string
  nombre: string
  categoria: string
  precio?: number | null
}

export const CATEGORIAS_MATERIAL = [
  'herramientas',
  'insumos',
  'equipo de clima',
  'activos fijos',
  'cargador electrico',
  'mppt',
  'transformadores y medidores',
  'paneles',
  'baterias',
  'inversores',
] as const

export type CategoriaMaterial = typeof CATEGORIAS_MATERIAL[number]

// ── Herramientas (legacy, mantenido para compatibilidad) ──────────────────────

export interface HerramientaCatalogo {
  producto_id: string
  nombre: string
  descripcion: string
  precio: number
  codigo: string
}

export interface HerramientaAsignada {
  id: string
  producto_id: string
  nombre: string
  precio?: number | null
  cantidad: number
  numero_serie?: string | null
}

export interface HerramientaAsignarData {
  producto_id: string
  cantidad: number
  numero_serie?: string
}

export interface HerramientaUpdateData {
  cantidad?: number
  numero_serie?: string
}

export interface HerramientaCatalogoCreateData {
  nombre: string
  codigo: string
  descripcion?: string
  precio?: number
}

export interface HerramientaCatalogoUpdateData {
  nombre?: string
  codigo?: string
  descripcion?: string
  precio?: number
}
