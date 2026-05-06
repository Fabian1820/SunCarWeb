export const ESTADOS_ENVIO_CONTENEDOR = [
  "despachado",
  "recibido",
  "cancelado",
] as const;

export type EstadoEnvioContenedor = (typeof ESTADOS_ENVIO_CONTENEDOR)[number];

export const TIPOS_ENVIO_CONTENEDOR = ["maritimo", "aereo", "otro"] as const;
export type TipoEnvioContenedor = (typeof TIPOS_ENVIO_CONTENEDOR)[number];

export const TIPOS_CONTENEDOR = ["20DV", "40DV", "40HC"] as const;
export type TipoContenedor = (typeof TIPOS_CONTENEDOR)[number];

export const TIPO_CONTENEDOR_LABELS: Record<TipoContenedor, string> = {
  "20DV": "20' DV (Dry Van)",
  "40DV": "40' DV (Dry Van)",
  "40HC": "40' HC (High Cube)",
};

export const MONEDAS_COSTO = ["USD", "EUR", "MLC", "CUP"] as const;
export type MonedaCosto = (typeof MONEDAS_COSTO)[number];

export type TipoArchivoEnvio = "imagen" | "video" | "audio" | "documento";

export interface ArchivoEnvioContenedor {
  id: string;
  url: string;
  tipo: TipoArchivoEnvio;
  nombre: string;
  tamano: number;
  mime_type: string;
  created_at: string;
}

export interface CostoImportacion {
  descripcion: string;
  monto: number;
  moneda: MonedaCosto;
}

export interface EnvioContenedorMaterial {
  material_id: string;
  material_codigo: string;
  material_nombre: string;
  cantidad: number;
  precio_unitario_cif: number;
  porciento_extra: number;
  costo_calc?: number;
  precio_venta_calc?: number;
  precio_instaladora_calc?: number;
  porciento_rebajable_venta: number;
}

export interface EnvioContenedor {
  id: string;
  nombre: string;
  descripcion?: string;
  // Identificación documental
  bl?: string;
  referencia_buque?: string;
  sello?: string;
  // Transporte
  buque?: string;
  tipo_contenedor?: TipoContenedor;
  puerto_origen?: string;
  pais_origen?: string;
  puerto_destino?: string;
  // Partes involucradas
  proveedor?: string;
  cliente?: string;
  transitaria?: string;
  // Fechas
  fecha_envio: string;
  fecha_llegada_aproximada: string;
  estado: EstadoEnvioContenedor;
  tipo_envio?: TipoEnvioContenedor;
  pagado: boolean;
  costos: CostoImportacion[];
  porciento_instaladora: number;
  porciento_ventas: number;
  materiales: EnvioContenedorMaterial[];
  archivos: ArchivoEnvioContenedor[];
  created_at?: string;
  updated_at?: string;
}

export interface EnvioContenedorCreateData {
  nombre: string;
  descripcion?: string;
  // Identificación documental
  bl?: string;
  referencia_buque?: string;
  sello?: string;
  // Transporte
  buque?: string;
  tipo_contenedor?: TipoContenedor;
  puerto_origen?: string;
  pais_origen?: string;
  puerto_destino?: string;
  // Partes involucradas
  proveedor?: string;
  cliente?: string;
  transitaria?: string;
  // Fechas
  fecha_envio: string;
  fecha_llegada_aproximada: string;
  estado: EstadoEnvioContenedor;
  tipo_envio?: TipoEnvioContenedor;
  pagado?: boolean;
  costos?: CostoImportacion[];
  porciento_instaladora?: number;
  porciento_ventas?: number;
  materiales: EnvioContenedorMaterial[];
}

export interface StockMaterialEnvio {
  material_id: string;
  material_codigo: string;
  material_nombre: string;
  cantidad_envio: number;
  cantidad_stock_actual: number;
}

export interface MaterialDatosBulk {
  precio: number;
  precio_instaladora: number;
  costo: number;
  stock_total: number;
}

export interface AplicarPreciosMaterialPayload {
  material_id: string;
  precio_unitario_cif: number;
  porciento_extra: number;
  costo_calc?: number;
  precio_venta_calc?: number;
  precio_instaladora_calc?: number;
  porciento_rebajable_venta: number;
}

export const ENVIO_CONTENEDOR_ESTADO_LABELS: Record<EstadoEnvioContenedor, string> = {
  despachado: "Despachado",
  recibido: "Recibido",
  cancelado: "Cancelado",
};

export const TIPO_ENVIO_LABELS: Record<TipoEnvioContenedor, string> = {
  maritimo: "Marítimo",
  aereo: "Aéreo",
  otro: "Otro",
};

// Costos pre-cargados según tipo de envío
export const COSTOS_SUGERIDOS: Record<TipoEnvioContenedor, Omit<CostoImportacion, "monto">[]> = {
  maritimo: [
    { descripcion: "Flete marítimo", moneda: "USD" },
    { descripcion: "Seguro de carga", moneda: "USD" },
    { descripcion: "Conocimiento de embarque (BL)", moneda: "USD" },
    { descripcion: "THC origen (Terminal Handling Charge)", moneda: "USD" },
    { descripcion: "THC destino", moneda: "USD" },
    { descripcion: "Gastos portuarios", moneda: "USD" },
    { descripcion: "Despacho aduanero", moneda: "USD" },
    { descripcion: "Arancel aduanero", moneda: "USD" },
    { descripcion: "Transporte terrestre interno", moneda: "CUP" },
    { descripcion: "Gastos bancarios / transferencia", moneda: "USD" },
  ],
  aereo: [
    { descripcion: "Flete aéreo", moneda: "USD" },
    { descripcion: "Seguro aéreo", moneda: "USD" },
    { descripcion: "Guía aérea (AWB)", moneda: "USD" },
    { descripcion: "Gastos de aeropuerto", moneda: "USD" },
    { descripcion: "Despacho aduanero", moneda: "USD" },
    { descripcion: "Arancel aduanero", moneda: "USD" },
    { descripcion: "Transporte terrestre interno", moneda: "CUP" },
    { descripcion: "Gastos bancarios / transferencia", moneda: "USD" },
  ],
  otro: [
    { descripcion: "Flete / transporte", moneda: "USD" },
    { descripcion: "Seguro", moneda: "USD" },
    { descripcion: "Despacho aduanero", moneda: "USD" },
    { descripcion: "Arancel aduanero", moneda: "USD" },
    { descripcion: "Transporte terrestre interno", moneda: "CUP" },
    { descripcion: "Gastos bancarios / transferencia", moneda: "USD" },
  ],
};
