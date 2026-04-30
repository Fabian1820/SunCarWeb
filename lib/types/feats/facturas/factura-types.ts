// Tipos y enums para el módulo de Facturas

export type FacturaTipo = "instaladora" | "cliente_directo" | "venta";
export type FacturaSubTipo = "brigada" | "cliente";
export type EstadoFactura =
  | "terminada_pagada"
  | "terminada_no_pagada"
  | "no_terminada";

export interface ItemVale {
  material_id: string;
  codigo: string;
  descripcion: string;
  precio: number;
  cantidad: number;
  subtotal?: number;
  descuento?: number | null;    // % de descuento (0-20)
  precio_pagado?: number | null; // precio final tras descuento
}

export interface Vale {
  id?: string; // ID del vale (puede ser el ID del vale de salida si proviene de uno)
  id_vale_salida?: string | null; // Referencia al vale de salida original (si aplica)
  fecha: string; // ISO date string
  items: ItemVale[];
  total?: number;
}

export interface OfertaInfo {
  oferta_id: string;
  numero_oferta: string;
  nombre_automatico: string;
  precio_final: number;
  monto_cobrado: number;
  monto_pendiente: number;
}

export interface Factura {
  id?: string;
  numero_factura: string;
  tipo: FacturaTipo;
  subtipo?: FacturaSubTipo | null;
  cliente_id?: string | null;
  trabajador_ci?: string | null;
  nombre_responsable?: string | null;
  // Legacy: mantener por compatibilidad con datos existentes
  responsable_nombre?: string | null;
  nombre_cliente?: string;
  fecha_creacion?: string; // ISO date string
  vales: Vale[];
  pagada: boolean;
  terminada: boolean;
  anulada?: boolean;
  motivo_anulacion?: string | null;
  total?: number;
  total_pagado?: number | null; // Suma de precio_pagado × cantidad (lo que pagó el cliente)
}

export interface FacturaConsolidada {
  id?: string;
  numero_factura: string;
  tipo: FacturaTipo;
  subtipo?: FacturaSubTipo | null;
  mes?: string;
  fecha?: string;
  fecha_creacion: string;
  cliente_nombre?: string;
  cliente_codigo?: string;
  cliente_direccion?: string;
  nombre_responsable?: string | null;
  total_factura: number;
  ofertas: OfertaInfo[];
  total_cobrado_todas_ofertas: number;
  monto_pendiente_materiales: number;
  total_pagado?: number | null; // Suma de precio_pagado × cantidad (lo que pagó el cliente)
  pagada: boolean;
  terminada: boolean;
  anulada?: boolean;
  motivo_anulacion?: string | null;
}

export interface FacturaListItem {
  id: string;
  numero_factura: string;
  nombre_cliente: string;
  total: number;
  pagada: boolean;
  terminada: boolean;
  fecha_creacion: string;
}

export interface FacturaStats {
  total_facturado: number;
  total_facturas: number;
  terminadas_pagadas: number;
  terminadas_no_pagadas: number;
  no_terminadas: number;
}

export interface FacturaFilters {
  mes_vale?: number;
  anio_vale?: number;
  fecha_vale?: string;
  nombre_cliente?: string;
  estado?: EstadoFactura;
  tipo?: FacturaTipo;
  subtipo?: FacturaSubTipo;
}

export interface NumeroFacturaSugerido {
  numero_sugerido: string;
  mensaje: string;
}
