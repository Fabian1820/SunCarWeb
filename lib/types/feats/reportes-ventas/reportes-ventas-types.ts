export type EstadoOfertaVenta = "enviada" | "confirmada" | "cancelada" | "pagada";

export interface PagoOfertaVenta {
  id: string;
  solicitud_venta_id?: string;
  monto: number;
  moneda: string;
  monto_usd: number;
  metodo_pago: string;
  fecha: string;
}

export interface ContactoOfertaVenta {
  id: string;
  numero?: string | null;
  nombre: string;
  telefono?: string | null;
  direccion?: string | null;
  provincia?: string | null;
  municipio?: string | null;
  comercial: string;
}

export interface OfertaVentaConComercial {
  id: string;
  codigo: string;
  estado: EstadoOfertaVenta;
  precio_total: number;
  fecha_creacion: string;
  fecha_actualizacion: string;
  fecha_confirmada?: string | null;
  materiales_count: number;
  observaciones?: string | null;
  cliente: ContactoOfertaVenta;
  pagos: PagoOfertaVenta[];
  total_pagado: number;
  monto_pendiente: number;
  fecha_primer_pago?: string | null;
}

export interface OfertasConComercialResponse {
  success: boolean;
  message?: string;
  data: OfertaVentaConComercial[];
}

export interface OfertasConComercialParams {
  skip?: number;
  limit?: number;
  cliente_venta_id?: string;
  almacen_id?: string;
  estado?: EstadoOfertaVenta;
  q?: string;
}

export interface EstadisticaVendedor {
  comercial: string;
  total_ofertas: number;
  ofertas_confirmadas: number;
  ofertas_pagadas: number;
  total_vendido: number;
  total_cobrado: number;
}

export interface ResultadosVentasFilters {
  searchTerm?: string;
  comercial?: string;
  estado?: EstadoOfertaVenta | "todos";
  fechaInicio?: string;
  fechaFin?: string;
  mes?: string;
  anio?: string;
}

export interface ClienteVentaConResumen {
  id: string;
  numero?: string | null;
  nombre: string;
  telefono?: string | null;
  direccion?: string | null;
  provincia?: string | null;
  municipio?: string | null;
  ci?: string | null;
  comercial?: string | null;
  fecha_creacion?: string | null;
  fecha_actualizacion?: string | null;
  ofertas_count: number;
  ofertas_confirmadas_count: number;
  ofertas_pagadas_count: number;
  ultima_oferta_fecha?: string | null;
}

export interface EstadisticaClientesVendedor {
  comercial: string;
  total_clientes: number;
  clientes_con_ofertas: number;
  clientes_sin_ofertas: number;
  total_ofertas: number;
  total_confirmadas: number;
  total_pagadas: number;
}
