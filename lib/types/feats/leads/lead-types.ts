// Lead feature types aligned with backend payloads (2024-11 revision).

export interface ElementoPersonalizado {
  descripcion: string;
  cantidad: number;
}

// Oferta asignacion: usado al CREAR/ACTUALIZAR leads
// El backend busca la oferta por ID y la embebe completa (snapshot)
export interface OfertaAsignacion {
  oferta_id: string; // ID de la oferta en el catálogo (OBLIGATORIO)
  cantidad: number; // Cantidad solicitada (debe ser mayor a 0)
}

// Oferta embebida: retornada por el backend al LEER leads
// Contiene snapshot completo de la oferta en el momento de creación
export interface OfertaEmbebida {
  inversor_codigo: string | null;
  inversor_nombre?: string | null;
  inversor_cantidad: number;
  bateria_codigo: string | null;
  bateria_nombre?: string | null;
  bateria_cantidad: number;
  panel_codigo: string | null;
  panel_nombre?: string | null;
  panel_cantidad: number;
  costo_oferta: number;
  costo_extra: number;
  costo_transporte: number;
  aprobada: boolean;
  pagada: boolean;
  elementos_personalizados: string | null;
  razon_costo_extra: string | null;
}

export interface LeadFoto {
  url: string;
  fecha: string;
  tipo: "instalacion" | "averia";
}

export interface Lead {
  id?: string;
  fecha_contacto: string;
  nombre: string;
  telefono: string;
  telefono_adicional?: string;
  estado: string;
  fuente?: string;
  referencia?: string;
  direccion?: string;
  pais_contacto?: string;
  comentario?: string;
  provincia_montaje?: string;
  municipio?: string;
  comercial?: string;
  ofertas?: OfertaEmbebida[];
  fotos?: LeadFoto[];
  elementos_personalizados?: ElementoPersonalizado[];
  comprobante_pago_url?: string;
  metodo_pago?: string;
  moneda?: string;
  prioridad?: "Alta" | "Media" | "Baja";
  motivo_visita?: string; // ⚠️ CAMPO TEMPORAL: NO se guarda en lead. Se usa para crear visita automática.
}

export interface LeadResponse {
  success: boolean;
  message: string;
  data: Lead | Lead[] | null;
  total?: number;
  skip?: number;
  limit?: number;
}

export interface LeadCreateData {
  fecha_contacto: string;
  nombre: string;
  telefono: string;
  estado: string;
  telefono_adicional?: string;
  fuente?: string;
  referencia?: string;
  direccion?: string;
  pais_contacto?: string;
  comentario?: string;
  provincia_montaje?: string;
  municipio?: string;
  comercial?: string;
  ofertas?: OfertaAsignacion[]; // Al crear: solo enviar oferta_id + cantidad
  elementos_personalizados?: ElementoPersonalizado[];
  comprobante_pago_url?: string;
  metodo_pago?: string;
  moneda?: string;
  prioridad?: "Alta" | "Media" | "Baja";
  motivo_visita?: string; // ⚠️ CAMPO TEMPORAL: Se envía al backend para crear visita. NO se guarda en lead.
}

export interface LeadUpdateData {
  fecha_contacto?: string;
  nombre?: string;
  telefono?: string;
  telefono_adicional?: string;
  estado?: string;
  fuente?: string;
  referencia?: string;
  direccion?: string;
  pais_contacto?: string;
  comentario?: string;
  provincia_montaje?: string;
  municipio?: string;
  comercial?: string;
  ofertas?: OfertaAsignacion[]; // Al actualizar: solo enviar oferta_id + cantidad
  elementos_personalizados?: ElementoPersonalizado[];
  comprobante_pago_url?: string;
  metodo_pago?: string;
  moneda?: string;
  prioridad?: "Alta" | "Media" | "Baja";
  motivo_visita?: string; // ⚠️ CAMPO TEMPORAL: Se envía al backend para crear visita. NO se guarda en lead.
}

export interface LeadConversionRequest {
  numero: string;
  fecha_montaje?: string;
  latitud?: string | number;
  longitud?: string | number;
  carnet_identidad?: string;
  fecha_instalacion?: string;
  comprobante_pago_url?: string;
  metodo_pago?: string;
  moneda?: string;
  estado?: string;
  fuente?: string;
  municipio?: string;
  equipo_propio?: boolean;
}
