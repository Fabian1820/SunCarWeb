export interface MedioBasico {
  id: string
  nombre: string
  precio?: number | null
}

export interface Asignacion {
  id: string
  medio_basico_id: string
  nombre: string
  precio?: number | null
  cantidad: number
  numero_serie?: string | null
}

export interface TrabajadorConAsignaciones {
  id: string
  CI: string
  nombre: string
  cargo: string
  asignaciones: Asignacion[]
  herramientas?: HerramientaAsignada[]
}

export interface AsignacionCreateData {
  medio_basico_id?: string
  nuevo_medio_basico?: { nombre: string; precio?: number }
  cantidad: number
  numero_serie?: string
}

export interface AsignacionUpdateData {
  cantidad?: number
  numero_serie?: string
}

export interface MedioBasicoCreateData {
  nombre: string
  precio?: number
}

export interface MedioBasicoUpdateData {
  nombre?: string
  precio?: number
}

// ── Herramientas ──────────────────────────────────────────────────────────────

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
