export type CategoriaSolicitud = "bug" | "mejora" | "idea" | "otro";
export type EstadoSolicitud =
  | "pendiente"
  | "posible"
  | "no_posible"
  | "no_aplica";
export type ResolucionSolicitud = "posible" | "no_posible" | "no_aplica";

export interface SolicitudDesarrollo {
  id: string;
  usuario_ci: string;
  usuario_nombre: string;
  categoria: CategoriaSolicitud;
  pantalla?: string | null;
  mensaje: string;
  estado: EstadoSolicitud;
  respuesta?: string | null;
  respondido_por?: string | null;
  terminada: boolean;
  vista: boolean;
  fecha_creacion: string;
  fecha_respuesta?: string | null;
  fecha_terminada?: string | null;
}

export const ETIQUETA_CATEGORIA: Record<CategoriaSolicitud, string> = {
  bug: "Bug",
  mejora: "Mejora",
  idea: "Idea",
  otro: "Otro",
};

export const ETIQUETA_ESTADO: Record<EstadoSolicitud, string> = {
  pendiente: "Pendiente",
  posible: "Posible",
  no_posible: "No posible",
  no_aplica: "No aplica",
};
