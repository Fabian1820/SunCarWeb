export type TrabajoDiarioArchivoTipo = "imagen" | "video" | "audio";

export type TrabajoDiarioTipo =
  | "AVERIA"
  | "INSTALACION NUEVA"
  | "INSTALACION EN PROCESO";

export interface TrabajoDiarioArchivo {
  id: string;
  url: string;
  tipo: TrabajoDiarioArchivoTipo;
  nombre: string;
  tamano: number;
  mime_type: string;
  created_at: string;
}

export interface TrabajoDiarioMomento {
  archivos: TrabajoDiarioArchivo[];
  comentario: string;
  fecha: string;
}

export interface TrabajoDiarioMaterialUtilizado {
  id_material: string;
  codigo_material?: string;
  nombre: string;
  cantidad_utilizada: number;
  en_servicio?: boolean;
  cantidad_en_servicio?: number;
}

export interface TrabajoDiarioRegistro {
  id?: string;
  fecha?: string;
  fecha_trabajo?: string;
  vale_id?: string;
  id_vale_salida?: string;
  vale_codigo?: string;
  solicitud_id?: string;
  id_solicitud_materiales?: string;
  solicitud_codigo?: string;
  fecha_recogida?: string | null;
  responsable_recogida?: string | null;
  responsable_solicitud_materiales?: string | null;
  cliente_id?: string | null;
  cliente_numero?: string | null;
  cliente_nombre?: string | null;
  cliente_telefono?: string | null;
  cliente_direccion?: string | null;
  instaladores?: string[];
  brigadistas?: Array<{ ci: string; nombre?: string }>;
  inicio: TrabajoDiarioMomento;
  fin: TrabajoDiarioMomento;
  tipo_trabajo?: TrabajoDiarioTipo;
  problema_encontrado?: string;
  solucion?: string;
  instalacion_terminada?: boolean;
  queda_pendiente?: string;
  materiales_utilizados: TrabajoDiarioMaterialUtilizado[];
  created_at?: string;
  updated_at?: string;
}

export interface TrabajoDiarioFiltro {
  fecha?: string;
  instalador?: string;
  instaladores?: string[];
  trabajador?: string;
  skip?: number;
  limit?: number;
}

export const createEmptyTrabajoDiario = (): TrabajoDiarioRegistro => ({
  inicio: {
    archivos: [],
    comentario: "",
    fecha: "",
  },
  fin: {
    archivos: [],
    comentario: "",
    fecha: "",
  },
  materiales_utilizados: [],
  instalacion_terminada: false,
});
