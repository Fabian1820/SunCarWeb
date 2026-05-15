export type EstadoOfertaVenta = "enviada" | "confirmada" | "cancelada" | "pagada";

export interface OfertaVentaMaterialDetalle {
  id?: string;
  material_id: string;
  cantidad: number;
  precio: number;
  descuento_porcentaje?: number;
  aumento_porcentaje?: number;
  subtotal?: number;
  // Snapshot del material guardado en el backend
  codigo?: string;
  descripcion?: string;
  um?: string;
  categoria?: string;
  foto_url?: string;
}

export interface OfertaVenta {
  id: string;
  codigo?: string;
  cliente_venta_id: string;
  cliente_nombre?: string;
  cliente_numero?: string;
  almacen_id?: string;
  almacen_nombre?: string;
  estado: EstadoOfertaVenta;
  metodo_pago?: string;
  moneda_pago?: string;
  precio_total: number;
  observaciones?: string;
  descuento_free?: boolean;
  motivo_descuento_free?: string;
  materiales: OfertaVentaMaterialDetalle[];
  fecha_creacion?: string;
  fecha_actualizacion?: string;
}

export interface OfertaVentaCreateData {
  cliente_venta_id: string;
  almacen_id?: string;
  estado?: EstadoOfertaVenta;
  metodo_pago?: string;
  moneda_pago?: string;
  observaciones?: string;
  materiales: {
    material_id: string;
    cantidad: number;
    precio: number;
    descuento_porcentaje?: number;
    aumento_porcentaje?: number;
  }[];
}

export interface OfertaVentaUpdateData {
  almacen_id?: string;
  estado?: EstadoOfertaVenta;
  metodo_pago?: string;
  moneda_pago?: string;
  observaciones?: string;
  materiales?: {
    material_id: string;
    cantidad: number;
    precio: number;
    descuento_porcentaje?: number;
    aumento_porcentaje?: number;
  }[];
}

export interface OfertaVentaListParams {
  cliente_venta_id?: string;
  estado?: EstadoOfertaVenta;
  skip?: number;
  limit?: number;
}

export interface OfertaVentaListResponse {
  success?: boolean;
  total?: number;
  data?: OfertaVenta[];
}
