export interface AsignacionOption {
  id: string;
  nombre: string;
  tipo: "brigada" | "tecnico";
}

export interface OfertaTrabajoItem {
  material_codigo?: string;
  descripcion?: string;
  cantidad?: number;
  cantidad_pendiente_por_entregar?: number;
  cantidad_en_servicio?: number;
  en_servicio?: boolean;
  entregas?: Array<{ cantidad?: number; fecha?: string }>;
}

export interface OfertaTrabajo {
  id?: string;
  _id?: string;
  oferta_id?: string;
  numero_oferta?: string;
  nombre?: string;
  nombre_automatico?: string;
  items?: OfertaTrabajoItem[];
}
