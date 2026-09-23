export interface ValeSalidaMaterialItem {
  material_id: string;
  cantidad: number;
  /** Una serie por unidad; texto libre (puede llevar comas). */
  numeros_serie?: string[];
}

export type ValeSolicitudTipo = "material" | "venta";

export interface ValeSalidaMaterialItemDetalle {
  material_id: string;
  cantidad: number;
  numeros_serie?: string[];
  /** Las mismas series unidas por comas, para exportar. */
  numero_serie?: string;
  alerta_stock?: boolean;
  stock_suficiente?: boolean;
  stock_actual?: number;
  stock_despues?: number;
  faltante?: number;
  material_codigo?: string;
  material_descripcion?: string;
  /**
   * Nombre de catálogo resuelto por el backend en lectura. Preferirlo siempre
   * sobre `material_descripcion`, que es el snapshot congelado al emitir el
   * vale y no identifica al material.
   */
  material_nombre?: string;
  um?: string;
  codigo?: string;
  descripcion?: string;
  material?: ValeMaterialInfo;
}

export interface ValeMaterialInfo {
  codigo?: string;
  nombre?: string;
  descripcion?: string;
  um?: string;
  foto?: string;
  precio?: number;
  marca_id?: string;
  potenciaKW?: number;
  categoria?: string;
}

export interface ValeClienteInfo {
  id: string;
  numero?: string;
  nombre?: string;
  telefono?: string;
  direccion?: string;
}

export interface ValeAlmacenInfo {
  id: string;
  nombre: string;
  codigo?: string;
  direccion?: string;
  responsable?: string;
}

export interface ValeTrabajadorInfo {
  id: string;
  ci?: string;
  nombre?: string;
  cargo?: string;
}

export interface ValeSolicitudInfo {
  id: string;
  codigo?: string;
  motivo_anulacion?: string | null;
  anulada_por_ci?: string | null;
  anulada_en?: string | null;
  solicitud_origen_id?: string | null;
  solicitud_reabierta_id?: string | null;
  reabierta_por_ci?: string | null;
  reabierta_en?: string | null;
  cliente?: ValeClienteInfo | null;
  cliente_venta?: ValeClienteInfo | null;
  almacen?: ValeAlmacenInfo;
  trabajador?: ValeTrabajadorInfo;
  responsable_recogida?: string | null;
  recogio_por?: string | null;
  recogido_por?: string | null;
  recibido_por?: string | null;
  fecha_recogida?: string | null;
  estado?: string;
}

export type TipoAdjuntoVale = "imagen" | "video" | "audio" | "documento";
export type CategoriaAdjuntoVale = "vale_firmado" | "otro";
export type OrigenAdjuntoVale = "web" | "movil";

export interface AdjuntoValeSalida {
  id: string;
  /**
   * Ruta del objeto en el storage. NO sirve para abrir el archivo: el bucket
   * es privado porque estos documentos llevan firmas y datos personales.
   * Para mostrarlo o descargarlo hay que usar `download_url`.
   */
  url: string;
  tipo: TipoAdjuntoVale;
  nombre: string;
  tamano: number;
  mime_type: string;
  categoria: CategoriaAdjuntoVale;
  /** Si entro desde la PC con sesion o desde el movil que escaneo el QR. */
  origen: OrigenAdjuntoVale;
  subido_por_ci?: string | null;
  created_at: string;
  /** URL firmada temporal (1h). Es la unica que abre el archivo. */
  download_url?: string | null;
}

/** Respuesta de POST /{vale_id}/adjuntos/token-movil: el QR para el telefono. */
export interface TokenSubidaMovilVale {
  token: string;
  url: string;
  qr_png_base64: string;
  expira_en: string;
  expira_en_minutos: number;
}

/** Datos minimos que ve quien abre el enlace del QR en el movil. */
export interface ContextoSubidaMovilVale {
  vale_id: string;
  codigo: string;
  estado: string;
  cliente_nombre?: string | null;
  total_materiales: number;
  adjuntos_count: number;
}

export interface ValeSalida {
  id: string;
  codigo?: string;
  estado?: "usado" | "anulado" | "devuelto" | string;
  facturado?: boolean;
  recogio_por?: string | null;
  recogido_por?: string | null;
  recibido_por?: string | null;
  motivo_anulacion?: string | null;
  movimientos_ids?: string[];
  solicitud_tipo?: ValeSolicitudTipo | string;
  solicitud_material_id?: string;
  solicitud_venta_id?: string;
  // Legacy fallback kept for compatibility with old responses
  solicitud_id?: string;
  trabajador_id?: string;
  solicitud_material?: ValeSolicitudInfo | null;
  solicitud_venta?: ValeSolicitudInfo | null;
  // Legacy fallback kept for compatibility with old responses
  solicitud?: ValeSolicitudInfo | null;
  trabajador?: ValeTrabajadorInfo;
  materiales: ValeSalidaMaterialItemDetalle[];
  total_materiales?: number;
  /** Documentos del vale (el firmado, sobre todo). Vacio en vales antiguos. */
  adjuntos?: AdjuntoValeSalida[];
  creado_por_ci?: string;
  fecha_creacion?: string;
  fecha_actualizacion?: string;
}

export interface ValeSalidaCreateData {
  solicitud_material_id?: string;
  solicitud_venta_id?: string;
  materiales: ValeSalidaMaterialItem[];
  /**
   * Autoriza incluir materiales sin `habilitar_venta_web` en ESTE vale.
   * No modifica el catálogo: el material no se publica en la tienda pública.
   */
  venta_excepcional?: boolean;
  /** Obligatorio si `venta_excepcional`: motivo y quién autorizó, en un solo texto. */
  motivo_venta_excepcional?: string;
}

export interface ValeSalidaAnularData {
  motivo_anulacion: string;
}

export interface ValeSolicitudPendiente {
  tipo_solicitud: ValeSolicitudTipo | string;
  solicitud_id: string;
  codigo?: string;
  estado?: "nueva" | "usada" | string;
  tiene_alertas_stock?: boolean;
  total_materiales_con_alerta?: number;
  cliente?: ValeClienteInfo | null;
  cliente_venta?: ValeClienteInfo | null;
  almacen?: ValeAlmacenInfo;
  trabajador?: ValeTrabajadorInfo;
  responsable_recogida?: string | null;
  recogio_por?: string | null;
  recogido_por?: string | null;
  recibido_por?: string | null;
  fecha_recogida?: string | null;
  materiales: ValeSalidaMaterialItemDetalle[];
  vale_id?: string | null;
  puede_generar_vale?: boolean;
  fecha_creacion?: string;
  fecha_actualizacion?: string;
}

export interface ValeSalidaListResponse {
  vales?: ValeSalida[];
  data?: ValeSalida[];
  total?: number;
  skip?: number;
  limit?: number;
}

export interface DevolucionValeMaterialPayload {
  material_id: string;
  cantidad: number;
  numeros_serie?: string[];
}

export interface DevolucionValeCreateData {
  vale_id: string;
  responsable_devolucion: string;
  comentario: string;
  materiales: DevolucionValeMaterialPayload[];
}

export interface DevolucionValeMaterial {
  material_id: string;
  cantidad: number;
  numeros_serie?: string[];
  material_codigo?: string;
  material_descripcion?: string;
  material_nombre?: string;
  um?: string;
}

export interface DevolucionVale {
  id: string;
  vale_id: string;
  responsable_devolucion?: string;
  comentario?: string | null;
  materiales: DevolucionValeMaterial[];
  creado_por_ci?: string;
  fecha_creacion?: string;
  fecha_actualizacion?: string;
}

export interface DevolucionValeResumenMaterial {
  material_id: string;
  cantidad_salida: number;
  cantidad_devuelta: number;
  cantidad_disponible_devolver: number;
  material_codigo?: string;
  material_descripcion?: string;
  material_nombre?: string;
  um?: string;
  /** Series con que salió en el vale, las que volvieron y las que siguen fuera. */
  numeros_serie?: string[];
  numeros_serie_devueltos?: string[];
  numeros_serie_pendientes?: string[];
  /** Todas las unidades salieron con serie: al devolver hay que decir cuáles. */
  requiere_series?: boolean;
}

export interface DevolucionValeResumen {
  vale_id: string;
  materiales: DevolucionValeResumenMaterial[];
}

// ========================================
// Summary Types (Optimized for Table Views)
// ========================================

export interface ValeSalidaSummaryMaterial {
  material_id: string;
  cantidad: number;
  material_codigo?: string | null;
  material_descripcion?: string | null;
  material_nombre?: string | null;
  um?: string | null;
}

export interface ValeSalidaSummary {
  id: string;
  codigo?: string;
  solicitud_tipo?: "material" | "venta";
  solicitud_codigo?: string;
  estado?: "usado" | "anulado" | "devuelto" | string;
  /** Alguna devolución de material, parcial o total (`devuelto` es solo la total). */
  tiene_devolucion?: boolean;
  materiales_resumen?: string; // e.g., "5 materiales"
  /** Array detallado de materiales — añadido por el backend para el summary. */
  materiales?: ValeSalidaSummaryMaterial[];
  cliente_nombre?: string;
  /** Nombre del trabajador que creó el vale (operador de almacén). */
  creador_nombre?: string;
  /** Nombre del trabajador que creó la solicitud asociada (material o venta). */
  solicitud_creador_nombre?: string;
  recibido_por?: string | null;
  fecha_recogida?: string | null; // Fecha en que se recogieron los materiales
  /**
   * Cuantos documentos tiene adjuntos. Viene en el mismo summary, sin peticion
   * extra: es lo que pinta el indicador de la columna Acciones.
   */
  adjuntos_count?: number;
  fecha_creacion?: string;
}

export interface ValeSalidaSummaryResponse {
  success?: boolean;
  message?: string;
  data: ValeSalidaSummary[];
  total: number;
}
