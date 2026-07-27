export type CategoriaSolicitud = "bug" | "mejora" | "idea" | "otro";
export type EstadoSolicitud = "pendiente" | "respondida";

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
  vista: boolean;
  fecha_creacion: string;
  fecha_respuesta?: string | null;
}
