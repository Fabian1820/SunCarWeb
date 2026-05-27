export type InventarioMovimientoTipo =
  | "entrada"
  | "salida"
  | "transferencia"
  | "traspaso_sector"
  | "ajuste"
  | "eliminacion"
  | "venta";

export const POOLS_STOCK = ["indistinto", "instaladora", "ventas"] as const;
export type PoolStockKey = (typeof POOLS_STOCK)[number];

export interface PoolStockInfo {
  cantidad: number;
  cantidad_reservada: number;
}

export interface StockPools {
  indistinto: PoolStockInfo;
  instaladora: PoolStockInfo;
  ventas: PoolStockInfo;
}

export const POOL_STOCK_LABELS: Record<PoolStockKey, string> = {
  indistinto: "Indistinto",
  instaladora: "Instaladora",
  ventas: "Ventas",
};

export interface Almacen {
  id?: string;
  nombre: string;
  codigo?: string;
  direccion?: string;
  telefono?: string;
  responsable?: string;
  activo?: boolean;
}

export interface AlmacenInfo {
  id: string;
  nombre: string;
}

export interface Tienda {
  id?: string;
  nombre: string;
  codigo?: string;
  direccion?: string;
  telefono?: string;
  almacenes: AlmacenInfo[];
  activo?: boolean;
  // Campos legacy para compatibilidad (deprecated)
  almacen_id?: string;
  almacen_nombre?: string;
}

export interface StockItem {
  id?: string;
  almacen_id: string;
  almacen_nombre?: string;
  almacen?: Record<string, unknown>;
  material_id?: string;
  material_codigo: string;
  material_descripcion?: string;
  material?: Record<string, unknown>;
  categoria?: string;
  um?: string;
  cantidad: number;
  cantidad_reservada?: number;
  pools?: StockPools;
  ubicacion_en_almacen?: string | null;
  actualizado_en?: string;
}

export interface MovimientoInventario {
  id?: string;
  tipo: InventarioMovimientoTipo;
  material_id?: string;
  material_codigo: string;
  material_descripcion?: string;
  material?: Record<string, unknown>;
  cantidad: number;
  um?: string;
  almacen_origen_id?: string;
  almacen_origen_nombre?: string;
  almacen_destino_id?: string;
  almacen_destino_nombre?: string;
  tienda_id?: string;
  tienda_nombre?: string;
  pool?: PoolStockKey;
  pool_origen?: PoolStockKey;
  pool_destino?: PoolStockKey;
  motivo?: string;
  referencia?: string;
  fecha?: string;
  usuario?: string;
}

export interface AlmacenCreateData {
  nombre: string;
  codigo?: string;
  direccion?: string;
  telefono?: string;
  responsable?: string;
  activo?: boolean;
}

export type AlmacenUpdateData = Partial<AlmacenCreateData>;

export interface TiendaCreateData {
  nombre: string;
  codigo?: string;
  direccion?: string;
  telefono?: string;
  almacenes: AlmacenInfo[];
  activo?: boolean;
}

export type TiendaUpdateData = Partial<TiendaCreateData>;

export interface MovimientoCreateData {
  tipo: InventarioMovimientoTipo;
  material_id?: string;
  material_codigo?: string;
  cantidad: number;
  almacen_origen_id?: string;
  almacen_destino_id?: string;
  tienda_id?: string;
  pool?: PoolStockKey;
  pool_origen?: PoolStockKey;
  pool_destino?: PoolStockKey;
  motivo?: string;
  referencia?: string;
  ubicacion_en_almacen?: string;
}

export interface MovimientoLoteItemData {
  material_codigo: string;
  cantidad: number;
  origen_captura?: "scanner" | "manual" | string;
  estado?: "nuevo" | "usado" | string;
  ubicacion_en_almacen?: string;
}

export interface MovimientoLoteCreateData {
  tipo: "entrada" | "salida";
  almacen_id: string;
  motivo?: string;
  referencia?: string;
  items: MovimientoLoteItemData[];
}

export interface MovimientoLoteResumenPorMaterial {
  material_codigo: string;
  cantidad: number;
}

export interface MovimientoLoteResponse {
  total_materiales_distintos: number;
  total_cantidad: number;
  por_material: MovimientoLoteResumenPorMaterial[];
}

export interface VentaItem {
  material_codigo: string;
  cantidad: number;
  almacen_id: string;
}

export interface VentaCreateData {
  tienda_id: string;
  referencia?: string;
  items: VentaItem[];
}

// ── Solicitudes de Transferencia ──

export type SolicitudTransferenciaEstado = "pendiente" | "aprobada" | "denegada";

export interface SolicitudTransferenciaItem {
  material_id: string;
  material_codigo?: string;
  cantidad: number;
  ubicacion_en_almacen?: string | null;
}

export interface SolicitudTransferencia {
  id: string;
  almacen_origen_id: string;
  almacen_destino_id: string;
  items: SolicitudTransferenciaItem[];
  motivo?: string | null;
  referencia?: string | null;
  estado: SolicitudTransferenciaEstado;
  solicitante: string;
  solicitante_ci: string;
  aprobador?: string | null;
  aprobador_ci?: string | null;
  comentario_resolucion?: string | null;
  fecha_solicitud: string;
  fecha_resolucion?: string | null;
  movimiento_ids: string[];
}

export interface SolicitudTransferenciaCreateData {
  almacen_origen_id: string;
  almacen_destino_id: string;
  items: {
    material_id: string;
    cantidad: number;
    ubicacion_en_almacen?: string;
  }[];
  motivo?: string;
  referencia?: string;
}

// ── Análisis de Stock Mínimo ──────────────────────────────────────────────────

export type EstadoStock = "critico" | "alerta" | "ok";

export interface ProductoAnalisisStock {
  material_codigo: string;
  material_id?: string | null;
  nombre?: string | null;
  descripcion?: string | null;
  categoria?: string | null;
  um?: string | null;
  foto?: string | null;
  cantidad_actual: number;
  demanda_diaria_promedio: number;
  demanda_max_dia: number;
  std_diaria: number;
  dias_con_movimiento: number;
  stock_seguridad_recomendado: number;
  stock_minimo_recomendado: number;
  dias_restantes_estimados?: number | null;
  estado: EstadoStock;
  lead_time_dias: number;
  nivel_servicio: string;
}

export interface ResumenAnalisisStock {
  total_productos: number;
  criticos: number;
  alertas: number;
  ok: number;
  dias_dataset: number;
  lead_time_dias: number;
  nivel_servicio_pct: string;
}

export interface AnalisisStockMinimoResponse {
  success: boolean;
  message: string;
  resumen: ResumenAnalisisStock;
  productos: ProductoAnalisisStock[];
}

// ── Materiales con Stock Agregado (matriz materiales × almacenes) ────────────

export interface MaterialStockPorAlmacenItem {
  almacen_id: string;
  almacen_nombre: string;
  cantidad: number;
  cantidad_reservada?: number;
  pools?: StockPools;
}

export interface MaterialStockItem {
  material_id: string;
  codigo: string;
  nombre?: string;
  descripcion?: string;
  categoria?: string;
  marca_id?: string;
  marca_nombre?: string;
  potencia_kw?: number;
  um?: string;
  foto?: string;
  stockaje_minimo?: number | null;
  total: number;
  por_almacen: MaterialStockPorAlmacenItem[];
}

export interface AlmacenDisponibleItem {
  id: string;
  nombre: string;
}

export interface MaterialesStockResponse {
  data: MaterialStockItem[];
  total: number;
  skip: number;
  limit: number;
  almacenes_disponibles: AlmacenDisponibleItem[];
}

export interface MaterialesStockParams {
  q?: string;
  categoria?: string;
  marca_id?: string;
  potencia_kw?: string;
  almacen_id?: string;
  cantidad_filter?: "con_stock" | "sin_stock" | "all";
  sort_by?: "nombre" | "codigo" | "total" | "categoria";
  sort_dir?: "asc" | "desc";
  skip?: number;
  limit?: number;
}
