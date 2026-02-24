import type { ClienteFoto } from "../customer/cliente-types";

export interface OfertaEntregaItem {
  cantidad: number;
  fecha: string;
}

export interface OfertaInstalacionItem {
  material_codigo?: string;
  descripcion?: string;
  precio?: number;
  cantidad?: number;
  categoria?: string;
  seccion?: string;
  entregas?: OfertaEntregaItem[];
  cantidad_pendiente_por_entregar?: number;
  [key: string]: unknown;
}

export interface OfertaInstalacion {
  id?: string;
  _id?: string;
  oferta_id?: string;
  numero_oferta?: string;
  nombre?: string;
  nombre_automatico?: string;
  inversor_codigo?: string | null;
  inversor_cantidad?: number;
  inversor_nombre?: string | null;
  bateria_codigo?: string | null;
  bateria_cantidad?: number;
  bateria_nombre?: string | null;
  panel_codigo?: string | null;
  panel_cantidad?: number;
  panel_nombre?: string | null;
  costo_oferta?: number;
  costo_extra?: number;
  costo_transporte?: number;
  aprobada?: boolean;
  pagada?: boolean;
  elementos_personalizados?: string | null;
  razon_costo_extra?: string | null;
  items?: OfertaInstalacionItem[];
  [key: string]: unknown;
}

export interface InstalacionNueva {
  tipo: "lead" | "cliente";
  id: string;
  numero?: string;
  nombre: string;
  telefono: string;
  direccion: string;
  ofertas?: OfertaInstalacion[];
  estado: string;
  fecha_contacto?: string;
  falta_instalacion?: string;
  original?: unknown;
  fotos?: ClienteFoto[];
  [key: string]: unknown;
}

export interface PendienteVisita {
  id: string;
  tipo: "lead" | "cliente";
  nombre: string;
  telefono: string;
  direccion: string;
  provincia: string;
  municipio: string;
  estado: string;
  comentario: string;
  fuente: string;
  referencia: string;
  comercial: string;
  prioridad: string;
  fecha_contacto: string;
  ofertas?: any[]; // Array de ofertas (mismo formato que leads/clientes)
  fotos?: ClienteFoto[];
  // Campos exclusivos de clientes
  numero?: string;
  carnet_identidad?: string;
  latitud?: string;
  longitud?: string;
}

export interface PendientesVisitaFilters {
  searchTerm?: string;
  tipo?: "todos" | "leads" | "clientes";
  provincia?: string;
}
