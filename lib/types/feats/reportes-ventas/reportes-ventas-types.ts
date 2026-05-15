export interface ContactoVenta {
  id: string;
  numero?: string | null;
  nombre: string;
  telefono?: string | null;
  direccion?: string | null;
  provincia?: string | null;
  municipio?: string | null;
  comercial: string;
}

export interface FacturaVentaConComercial {
  id: string;
  numero: string;
  fecha: string;
  fecha_creacion: string;
  solicitudes_count: number;
  materiales_count: number;
  cliente: ContactoVenta;
  precio_total: number;
  precio_bruto: number;
  tiene_descuento: boolean;
  descuento_monto: number;
  total_pagado: number;
  monto_pendiente: number;
  fecha_primer_pago?: string | null;
  notas?: string | null;
  creado_por_ci?: string | null;
}

export interface FacturasConComercialResponse {
  success: boolean;
  message?: string;
  data: FacturaVentaConComercial[];
}

export interface FacturasConComercialParams {
  skip?: number;
  limit?: number;
  cliente_venta_id?: string;
  comercial?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
}

export interface EstadisticaVendedor {
  comercial: string;
  cantidad_ventas: number;
  ventas_con_descuento: number;
  total_vendido: number;
  total_cobrado: number;
  venta_mas_alta: number;
}

export interface ResultadosVentasFilters {
  searchTerm?: string;
  comercial?: string;
  conDescuento?: "todos" | "si" | "no";
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
