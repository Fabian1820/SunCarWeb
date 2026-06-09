// ── Medios Básicos ────────────────────────────────────────────────────────────

export interface MedioBasico {
  id: string
  codigo?: string | null
  nombre: string
  precio?: number | null
  foto?: string | null
}

export interface MedioBasicoCreateData {
  nombre: string
  precio?: number
  foto?: string | null
}

export interface MedioBasicoUpdateData {
  nombre?: string
  precio?: number
  foto?: string | null
}

// ── Movimientos / historial ───────────────────────────────────────────────────

export type TipoMovimiento = 'creacion' | 'reduccion' | 'eliminacion'

export type MotivoMovimiento = 'devolucion' | 'perdida' | 'rotura' | 'transferencia' | 'ajuste' | 'otro'

export const MOTIVOS_MOVIMIENTO: { value: MotivoMovimiento; label: string }[] = [
  { value: 'devolucion', label: 'Devolución' },
  { value: 'perdida', label: 'Pérdida' },
  { value: 'rotura', label: 'Rotura' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'ajuste', label: 'Ajuste' },
  { value: 'otro', label: 'Otro' },
]

export interface MovimientoAsignacion {
  fecha: string
  tipo: TipoMovimiento
  actor_ci?: string | null
  cantidad_anterior: number
  cantidad_nueva: number
  motivo?: MotivoMovimiento | null
  nota?: string | null
}

// ── Asignaciones trabajadores ─────────────────────────────────────────────────

export interface Asignacion {
  id: string
  item_tipo: 'medio_basico' | 'material'
  item_id: string
  nombre: string
  descripcion?: string | null
  /** Precio de costo unitario (antes se llamaba "precio"). */
  costo?: number | null
  cantidad: number
  numero_serie?: string | null
  fecha_asignacion?: string | null
  asignado_por?: string | null
  activo?: boolean
  fecha_actualizacion?: string | null
  historial?: MovimientoAsignacion[]
  // ── Derivados contables (devueltos por el backend, no se editan) ───────────
  /** costo / 60 — cuota mensual de depreciación por unidad. */
  depreciacion_mensual?: number
  /** cantidad × dep_mensual × meses_transcurridos (topado al costo total). */
  valor_depreciado?: number
  /** costo_total − valor_depreciado. */
  valor_residual?: number
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
  descripcion?: string
}

export interface AsignacionUpdateData {
  cantidad?: number
  numero_serie?: string
  descripcion?: string
  motivo?: MotivoMovimiento
  nota?: string
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
  descripcion?: string | null
  costo?: number | null
  cantidad: number
  numero_serie?: string | null
  fecha_asignacion?: string | null
  asignado_por?: string | null
  activo?: boolean
  fecha_actualizacion?: string | null
  historial?: MovimientoAsignacion[]
  depreciacion_mensual?: number
  valor_depreciado?: number
  valor_residual?: number
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
  descripcion?: string
}

export interface AsignacionInstalacionUpdateData {
  cantidad?: number
  numero_serie?: string
  descripcion?: string
  motivo?: MotivoMovimiento
  nota?: string
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
