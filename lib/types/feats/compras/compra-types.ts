export const ESTADOS_COMPRA = [
  "solicitado",
  "enviado",
  "arribado",
  "recibido_parcial",
  "recibido",
  "cancelado",
] as const;
export type EstadoCompra = (typeof ESTADOS_COMPRA)[number];

export const TIPOS_COMPRA = ["maritimo", "aereo", "local", "otro"] as const;
export type TipoCompra = (typeof TIPOS_COMPRA)[number];

export const TIPOS_CONTENEDOR = ["20DV", "40DV", "40HC"] as const;
export type TipoContenedor = (typeof TIPOS_CONTENEDOR)[number];

export const TIPO_CONTENEDOR_LABELS: Record<TipoContenedor, string> = {
  "20DV": "20' DV (Dry Van)",
  "40DV": "40' DV (Dry Van)",
  "40HC": "40' HC (High Cube)",
};

export const MONEDAS_COSTO = ["USD", "EUR", "MLC", "CUP"] as const;
export type MonedaCosto = (typeof MONEDAS_COSTO)[number];

export type TipoArchivoCompra = "imagen" | "video" | "audio" | "documento";

export interface ArchivoCompra {
  id: string;
  url: string;
  tipo: TipoArchivoCompra;
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

export interface DatosMaritimo {
  bl?: string;
  referencia_buque?: string;
  sello?: string;
  buque?: string;
  tipo_contenedor?: TipoContenedor;
  puerto_origen?: string;
  pais_origen?: string;
  puerto_destino?: string;
  transitaria?: string;
}

export interface CompraMaterial {
  material_id: string;
  material_codigo: string;
  material_nombre: string;
  cantidad: number;
  precio_unitario_cif: number;
  porciento_recargo: number;
  costo: number;
  precio_venta_sugerido?: number | null;
  precio_instaladora_sugerido?: number | null;
  precio_venta_final?: number | null;
  precio_instaladora_final?: number | null;
  porciento_rebajable_venta: number;
  cantidad_entrada_aprobada: number;
  /**
   * Flag por material: indica si los precios de la ficha ya fueron aplicados
   * al catálogo de productos (POST /aplicar-precios). Permanece false mientras
   * se hace guardado parcial con PATCH /ficha.
   */
  precios_aplicados?: boolean;
  /** @deprecated mantenido por compatibilidad con compras antiguas migradas */
  cantidad_ajuste_cierre?: number;
  /** @deprecated mantenido por compatibilidad con compras antiguas migradas */
  motivo_ajuste_cierre?: string;
}

export interface Compra {
  id: string;
  nombre: string;
  descripcion?: string;
  tipo: TipoCompra;
  proveedor?: string;
  cliente?: string;
  fecha_envio: string;
  fecha_llegada_aproximada: string;
  estado: EstadoCompra;
  pagado: boolean;
  datos_maritimo?: DatosMaritimo | null;
  costos: CostoImportacion[];
  total_costos?: number;
  valor_mercancia?: number;
  tasa_conversion_eur_usd?: number | null;
  tasa_conversion_mlc_usd?: number | null;
  tasa_conversion_cup_usd?: number | null;
  porciento_cargo_envio_sugerido?: number;
  porciento_cargo_envio_impuestos?: number;
  porciento_instaladora: number;
  porciento_ventas: number;
  materiales: CompraMaterial[];
  archivos: ArchivoCompra[];
  /** Motivo informado al hacer POST /cancelar. */
  motivo_cancelacion?: string;
  /** @deprecated mantenido por compatibilidad con compras antiguas migradas */
  motivo_cierre_ajuste?: string;
  created_at?: string;
  updated_at?: string;
  deleted?: boolean;
}

export interface CompraMaterialCreate {
  material_id: string;
  material_codigo: string;
  material_nombre: string;
  cantidad: number;
  precio_unitario_cif?: number;
  porciento_recargo?: number;
  costo?: number;
  precio_venta_sugerido?: number | null;
  precio_instaladora_sugerido?: number | null;
  precio_venta_final?: number | null;
  precio_instaladora_final?: number | null;
  porciento_rebajable_venta?: number;
}

export interface CompraCreateData {
  nombre: string;
  descripcion?: string;
  tipo: TipoCompra;
  proveedor?: string;
  cliente?: string;
  fecha_envio: string;
  fecha_llegada_aproximada: string;
  estado?: EstadoCompra;
  pagado?: boolean;
  datos_maritimo?: DatosMaritimo | null;
  costos?: CostoImportacion[];
  porciento_instaladora?: number;
  porciento_ventas?: number;
  total_costos?: number;
  valor_mercancia?: number;
  tasa_conversion_eur_usd?: number | null;
  tasa_conversion_mlc_usd?: number | null;
  tasa_conversion_cup_usd?: number | null;
  porciento_cargo_envio_sugerido?: number;
  porciento_cargo_envio_impuestos?: number;
  materiales: CompraMaterialCreate[];
}

// Payload del POST /api/compras/{id}/cancelar
export interface CancelarCompraRequest {
  motivo?: string;
}

// Payload del PATCH /api/compras/{id}/ficha (guardado parcial de la ficha sin
// aplicar precios al catálogo de productos).
export interface FichaPatchMaterial {
  material_id: string;
  precio_unitario_cif?: number;
  porciento_recargo?: number;
  costo?: number;
  precio_venta_sugerido?: number | null;
  precio_instaladora_sugerido?: number | null;
  precio_venta_final?: number | null;
  precio_instaladora_final?: number | null;
  porciento_rebajable_venta?: number;
}

export interface FichaPatchRequest {
  materiales: FichaPatchMaterial[];
}

// Payload del POST /api/compras/{id}/ponderar-costo
export interface PonderarCostoRequest {
  material_ids?: string[];
}

export interface PonderarCostoResponse {
  actualizados: number;
  kardex_recalculados: string[];
  /** material_ids sin costo definido en la ficha — no se ponderaron */
  sin_costo_ficha: string[];
  /** kardex_ids que no aplicaban la regla de ponderación */
  no_aplicables: string[];
  /**
   * Mapa material_id → costo global nuevo propagado al catálogo (null si el
   * cálculo se hizo pero el material no se pudo resolver al producto para
   * actualizar el catálogo; en ese caso el kardex sí quedó regularizado).
   */
  costos_catalogo_propagados: Record<string, number | null>;
}

export interface AjustarCostoRequest {
  material_ids?: string[];
}

export interface AjustarCostoResponse {
  actualizados: number;
  kardex_ajustados: string[];
  sin_costo_ficha: string[];
  sin_kardex: string[];
  costos_catalogo_propagados: Record<string, number | null>;
}

export interface StockMaterialCompra {
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
  porciento_rebajable_venta?: number;
}

/**
 * Payload de POST /api/compras/{id}/aplicar-precios.
 * Backend solo propaga al catálogo: precio_venta_final, precio_instaladora_final
 * y porciento_rebajable_venta. El resto de campos persistidos de la ficha
 * (CIF, recargo, costo, sugeridos) viven en la compra y se guardan con
 * PATCH /ficha — no se mandan acá.
 */
export interface AplicarPreciosMaterialPayload {
  material_id: string;
  precio_venta_final?: number | null;
  precio_instaladora_final?: number | null;
  porciento_rebajable_venta: number;
}

export const COMPRA_ESTADO_LABELS: Record<EstadoCompra, string> = {
  solicitado: "Solicitado",
  enviado: "Enviado",
  arribado: "Arribado",
  recibido_parcial: "Recibido parcial",
  recibido: "Recibido",
  cancelado: "Cancelado",
};

export const TIPO_COMPRA_LABELS: Record<TipoCompra, string> = {
  maritimo: "Marítimo",
  aereo: "Aéreo",
  local: "Local",
  otro: "Otro",
};

export const COSTOS_SUGERIDOS: Record<TipoCompra, Omit<CostoImportacion, "monto">[]> = {
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
  local: [
    { descripcion: "Transporte interno", moneda: "CUP" },
    { descripcion: "Gastos bancarios / transferencia", moneda: "CUP" },
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
