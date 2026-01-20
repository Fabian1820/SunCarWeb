// Tipos para el sistema de Caja Registradora

export type EstadoSesion = 'abierta' | 'cerrada';
export type EstadoOrden = 'pendiente' | 'pagada' | 'cancelada';
export type MetodoPago = 'efectivo' | 'tarjeta' | 'transferencia' | 'mixto';
export type TipoMovimiento = 'entrada' | 'salida';

export interface MovimientoEfectivo {
  id: string;
  sesion_caja_id: string;
  tipo: TipoMovimiento;
  monto: number;
  motivo: string;
  fecha: string;
  usuario: string | null;
}

export interface SesionCaja {
  id: string;
  tienda_id: string;
  numero_sesion: string;
  fecha_apertura: string;
  fecha_cierre: string | null;
  efectivo_apertura: number;
  efectivo_cierre: number | null;
  nota_apertura: string | null;
  nota_cierre: string | null;
  usuario_apertura: string;
  usuario_cierre: string | null;
  estado: EstadoSesion;
  total_ventas: number;
  total_efectivo: number;
  total_tarjeta: number;
  total_transferencia: number;
  movimientos_efectivo: MovimientoEfectivo[];
  created_at: string;
  updated_at: string;
}

export interface ItemOrden {
  material_codigo: string;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  categoria?: string | null;
  almacen_id?: string | null;
}

export interface Pago {
  id: string;
  orden_id: string;
  metodo: MetodoPago;
  monto: number;
  monto_recibido?: number | null;
  cambio?: number | null;
  referencia?: string | null;
  created_at: string;
}

export interface OrdenCompra {
  id: string;
  numero_orden: string;
  sesion_caja_id: string;
  tienda_id: string;
  cliente_id?: string | null;
  cliente_nombre?: string | null;
  cliente_telefono?: string | null;
  fecha_creacion: string;
  fecha_pago: string | null;
  items: ItemOrden[];
  subtotal: number;
  impuesto_porcentaje: number;
  impuesto_monto: number;
  descuento_porcentaje: number;
  descuento_monto: number;
  total: number;
  estado: EstadoOrden;
  metodo_pago: MetodoPago | null;
  pagos: Pago[];
  almacen_id: string | null;
  notas: string | null;
  created_at: string;
  updated_at: string;
}

// Request types
export interface AbrirSesionRequest {
  tienda_id: string;
  efectivo_apertura: number;
  nota_apertura?: string;
}

export interface CerrarSesionRequest {
  efectivo_cierre: number;
  nota_cierre?: string;
}

export interface MovimientoEfectivoRequest {
  tipo: TipoMovimiento;
  monto: number;
  motivo: string;
}

export interface CrearOrdenRequest {
  sesion_caja_id: string;
  tienda_id: string;
  cliente_id?: string;
  cliente_nombre?: string;
  cliente_ci?: string;
  cliente_telefono?: string;
  items: Omit<ItemOrden, 'subtotal'>[];
  impuesto_porcentaje: number;
  descuento_porcentaje: number;
  notas?: string;
}

export interface PagoDetalle {
  metodo: MetodoPago;
  monto: number;
  monto_recibido?: number;
  referencia?: string;
}

export interface PagarOrdenRequest {
  metodo_pago: MetodoPago;
  almacen_id: string;
  pagos: PagoDetalle[];
}

export interface PagarOrdenResponse {
  success: boolean;
  orden: OrdenCompra;
  cambio: number;
  movimientos_inventario: string[];
}

// Totales calculados para UI
export interface TotalesOrden {
  subtotal: number;
  descuento_monto: number;
  base_imponible: number;
  impuesto_monto: number;
  total: number;
}
