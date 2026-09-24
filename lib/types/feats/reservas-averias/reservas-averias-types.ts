/** Almacén Reservas Averías (Operaciones). Backend: /operaciones/almacen-reservas-averias */

export interface StockReservaAveria {
  material_id: string
  material_codigo?: string | null
  material_nombre?: string | null
  material_descripcion?: string | null
  um?: string | null
  categoria?: string | null
  foto?: string | null
  /** Instaladora + indistinto (ventas no cuenta en este almacén). */
  cantidad: number
  /** Reservado por otros clientes. */
  cantidad_reservada: number
  /** Lo que se puede sacar. */
  cantidad_disponible: number
  /** Precio de instaladora; el de venta si el material no tiene. */
  precio_unitario: number
  ubicacion_en_almacen?: string | null
}

export interface AveriaPendiente {
  id: string
  codigo?: string | null
  descripcion?: string | null
  estado: string
  fecha_reporte?: string | null
}

export interface SacarMaterialesData {
  cliente_numero: string
  averia_id: string
  responsable_recogida: string
  responsable_recogida_ci?: string | null
  materiales: Array<{ material_id: string; cantidad: number }>
}

export interface SalidaCreada {
  solicitud_id: string
  solicitud_codigo: string
  vale_id: string
  vale_codigo: string
  servicio_id: string
}

export interface FaltanteStock {
  material_id: string
  material_codigo?: string | null
  material_descripcion?: string | null
  cantidad_solicitada: number
  cantidad_disponible: number
}

export interface MaterialSalidaAveria {
  material_id: string
  material_codigo?: string | null
  material_descripcion?: string | null
  um?: string | null
  cantidad: number
  precio_unitario: number
}

export interface SalidaReservaAveria {
  vale_id: string
  vale_codigo: string
  solicitud_material_id?: string | null
  estado: "usado" | "anulado" | "devuelto" | string
  fecha: string
  recogido_por?: string | null
  recogido_por_ci?: string | null
  cliente_numero?: string | null
  cliente_nombre?: string | null
  averia_id?: string | null
  averia_codigo?: string | null
  averia_descripcion?: string | null
  servicio_id?: string | null
  materiales: MaterialSalidaAveria[]
  importe: number
  motivo_anulacion?: string | null
  creado_por_ci?: string | null
}

/** Una entrada al almacén: una transferencia, un vale anulado o una entrada directa, con sus materiales. */
export interface EntradaReservaAveria {
  id: string
  tipo: "transferencia" | "entrada" | string
  fecha: string
  almacen_origen_nombre?: string | null
  referencia?: string | null
  motivo?: string | null
  usuario?: string | null
  solicitante?: string | null
  aprobador?: string | null
  materiales: Array<{
    material_id: string
    material_codigo?: string | null
    material_descripcion?: string | null
    foto?: string | null
    um?: string | null
    cantidad: number
  }>
}

/** Lo que se llevó para una avería desde el almacén Reservas Averías (neto de devoluciones). */
export interface MaterialesDeAveria {
  averia_id: string
  vales: Array<{
    vale_id: string
    vale_codigo: string
    estado: string
    fecha: string
    recogido_por?: string | null
    materiales: Array<{
      material_id: string
      material_codigo?: string | null
      material_descripcion?: string | null
      um?: string | null
      cantidad: number
      cantidad_devuelta: number
      cantidad_neta: number
    }>
  }>
  totales: Array<{
    material_id: string
    material_codigo?: string | null
    material_descripcion?: string | null
    um?: string | null
    cantidad: number
  }>
}

export interface Paginado<T> {
  data: T[]
  total: number
}
