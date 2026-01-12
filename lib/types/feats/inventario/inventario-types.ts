export type InventarioMovimientoTipo = "entrada" | "salida" | "transferencia" | "ajuste" | "venta"

export interface Almacen {
  id?: string
  nombre: string
  codigo?: string
  direccion?: string
  telefono?: string
  responsable?: string
  activo?: boolean
}

export interface Tienda {
  id?: string
  nombre: string
  codigo?: string
  direccion?: string
  telefono?: string
  almacen_id: string
  almacen_nombre?: string
  activo?: boolean
}

export interface StockItem {
  id?: string
  almacen_id: string
  almacen_nombre?: string
  material_codigo: string
  material_descripcion?: string
  categoria?: string
  um?: string
  cantidad: number
  actualizado_en?: string
}

export interface MovimientoInventario {
  id?: string
  tipo: InventarioMovimientoTipo
  material_codigo: string
  material_descripcion?: string
  cantidad: number
  um?: string
  almacen_origen_id?: string
  almacen_origen_nombre?: string
  almacen_destino_id?: string
  almacen_destino_nombre?: string
  tienda_id?: string
  tienda_nombre?: string
  motivo?: string
  referencia?: string
  fecha?: string
  usuario?: string
}

export interface AlmacenCreateData {
  nombre: string
  codigo?: string
  direccion?: string
  telefono?: string
  responsable?: string
  activo?: boolean
}

export type AlmacenUpdateData = Partial<AlmacenCreateData>

export interface TiendaCreateData {
  nombre: string
  codigo?: string
  direccion?: string
  telefono?: string
  almacen_id: string
  activo?: boolean
}

export type TiendaUpdateData = Partial<TiendaCreateData>

export interface MovimientoCreateData {
  tipo: InventarioMovimientoTipo
  material_codigo: string
  cantidad: number
  almacen_origen_id?: string
  almacen_destino_id?: string
  tienda_id?: string
  motivo?: string
  referencia?: string
}

export interface VentaItem {
  material_codigo: string
  cantidad: number
}

export interface VentaCreateData {
  tienda_id: string
  referencia?: string
  items: VentaItem[]
}
