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

export type TipoMovimiento =
  | 'creacion'
  | 'reduccion'
  | 'eliminacion'
  | 'ajuste_costo'
  | 'transferencia_out'
  | 'transferencia_in'

export type MotivoMovimiento = 'devolucion' | 'perdida' | 'rotura' | 'transferencia' | 'ajuste' | 'otro'

export type TipoEntidad = 'trabajador' | 'almacen' | 'tienda' | 'sede'

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
  actor_nombre?: string | null
  cantidad_anterior?: number | null
  cantidad_nueva?: number | null
  costo_anterior?: number | null
  costo_nuevo?: number | null
  entidad_contraparte_tipo?: TipoEntidad | null
  entidad_contraparte_id?: string | null
  entidad_contraparte_nombre?: string | null
  asignacion_contraparte_id?: string | null
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
  /** Precio de costo unitario. */
  costo?: number | null
  cantidad: number
  numero_serie?: string | null
  /** Cuándo esta entidad concreta empezó a tener el recurso. */
  fecha_asignacion?: string | null
  /** Desde cuándo cuenta la depreciación. Se preserva en transferencias. */
  fecha_inicio_depreciacion?: string | null
  /** Cuándo dejó de tenerlo (transferencia o eliminación). */
  fecha_fin_asignacion?: string | null
  asignado_por?: string | null
  asignado_por_nombre?: string | null
  activo?: boolean
  fecha_actualizacion?: string | null
  historial?: MovimientoAsignacion[]
  // ── Derivados contables (devueltos por el backend, no se editan) ───────────
  depreciacion_mensual?: number
  valor_depreciado?: number
  valor_residual?: number
  meses_transcurridos?: number
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
  /** ISO. Si no se envía, el backend usa hoy. No puede ser futura. */
  fecha_asignacion?: string
  /** Permite asignar aunque el catálogo no tenga costo / costo=0. */
  permitir_costo_cero?: boolean
}

export interface AjustarCostoData {
  nuevo_costo: number
  motivo: MotivoMovimiento
  nota?: string
}

export interface TransferirData {
  entidad_tipo_destino: TipoEntidad
  entidad_id_destino: string
  motivo?: MotivoMovimiento
  nota?: string
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
  fecha_inicio_depreciacion?: string | null
  fecha_fin_asignacion?: string | null
  asignado_por?: string | null
  asignado_por_nombre?: string | null
  activo?: boolean
  fecha_actualizacion?: string | null
  historial?: MovimientoAsignacion[]
  depreciacion_mensual?: number
  valor_depreciado?: number
  valor_residual?: number
  meses_transcurridos?: number
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
  fecha_asignacion?: string
  permitir_costo_cero?: boolean
}

export interface AsignacionInstalacionUpdateData {
  cantidad?: number
  numero_serie?: string
  descripcion?: string
  motivo?: MotivoMovimiento
  nota?: string
}

// ── Plan de depreciación (reporte contable) ───────────────────────────────────

export interface PlanDepreciacionFila {
  id: string
  entidad_tipo: TipoEntidad
  entidad_id: string
  entidad_nombre?: string | null
  item_tipo: 'medio_basico' | 'material'
  item_id: string
  nombre: string
  descripcion?: string | null
  cantidad: number
  numero_serie?: string | null
  costo?: number | null
  costo_total: number
  fecha_asignacion?: string | null
  fecha_inicio_depreciacion?: string | null
  fecha_fin_asignacion?: string | null
  asignado_por?: string | null
  asignado_por_nombre?: string | null
  depreciacion_mensual: number
  valor_depreciado: number
  valor_residual: number
  meses_transcurridos: number
}

export interface PlanDepreciacionTotales {
  costo_total: number
  depreciacion_mensual: number
  valor_depreciado: number
  valor_residual: number
  cantidad_filas: number
}

export interface PlanDepreciacionFiltros {
  entidad_tipo?: TipoEntidad
  item_tipo?: 'medio_basico' | 'material'
  desde?: string  // ISO
  hasta?: string  // ISO
  solo_depreciados?: boolean
  solo_vigentes?: boolean
  incluir_inactivas?: boolean
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
