// Tipos y enums para el módulo de Facturas

export type FacturaTipo = 'instaladora' | 'cliente_directo';
export type FacturaSubTipo = 'brigada' | 'cliente';
export type EstadoFactura = 'terminada_pagada' | 'terminada_no_pagada' | 'no_terminada';

export interface ItemVale {
    material_id: string;
    codigo: string;
    descripcion: string;
    precio: number;
    cantidad: number;
    subtotal?: number;
}

export interface Vale {
    id?: string;
    fecha: string; // ISO date string
    items: ItemVale[];
    total?: number;
}

export interface Factura {
    id?: string;
    numero_factura: string;
    tipo: FacturaTipo;
    subtipo?: FacturaSubTipo | null;
    cliente_id?: string | null;
    nombre_cliente?: string;
    fecha_creacion?: string; // ISO date string
    vales: Vale[];
    pagada: boolean;
    terminada: boolean;
    total?: number;
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
    mes?: number;
    anio?: number;
    fecha_especifica?: string;
    nombre_cliente?: string;
    estado?: EstadoFactura;
}

export interface NumeroFacturaSugerido {
    numero_sugerido: string;
    mensaje: string;
}
