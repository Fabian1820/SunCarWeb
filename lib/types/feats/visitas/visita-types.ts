// Tipos para la entidad Visita
// Las visitas se crean automáticamente cuando un lead/cliente cambia a estado "Pendiente de visita"

export type TipoEntidad = "lead" | "cliente";
export type EstadoVisita = "programada" | "completada" | "cancelada";

/**
 * Modelo completo de Visita (retornado por el backend)
 */
export interface Visita {
  id?: string;
  tipo: TipoEntidad; // "lead" | "cliente"
  entidad_id: string; // ID del lead o número del cliente
  nombre: string; // Nombre del lead/cliente
  telefono: string; // Teléfono del lead/cliente
  direccion?: string; // Dirección
  estado: EstadoVisita; // "programada" | "completada" | "cancelada"
  motivo: string; // Motivo de la visita (viene de motivo_visita del formulario)
  fecha_programada?: string; // Fecha cuando se programa (ISO 8601)
  fecha_creacion: string; // Fecha de creación del registro (ISO 8601)
  fecha_completada?: string; // Fecha cuando se completa (ISO 8601)
  comercial?: string; // Comercial asignado
  notas?: string; // Notas adicionales
}

/**
 * Datos para crear una visita (usado internamente por el backend)
 * El frontend NO crea visitas directamente, se crean automáticamente
 */
export interface VisitaCreateData {
  tipo: TipoEntidad;
  entidad_id: string;
  nombre: string;
  telefono: string;
  direccion?: string;
  estado: EstadoVisita;
  motivo: string;
  fecha_programada?: string;
  comercial?: string;
  notas?: string;
}

/**
 * Datos para actualizar una visita
 */
export interface VisitaUpdateData {
  estado?: EstadoVisita;
  motivo?: string;
  fecha_programada?: string;
  fecha_completada?: string;
  comercial?: string;
  notas?: string;
}

/**
 * Respuesta del backend al listar visitas
 */
export interface VisitasResponse {
  success: boolean;
  message: string;
  data: {
    visitas: Visita[];
    total: number;
  };
}

/**
 * Filtros para consultar visitas
 */
export interface VisitasFilters {
  estado?: EstadoVisita;
  tipo?: TipoEntidad;
  comercial?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  search?: string; // Búsqueda por nombre, teléfono, etc.
}
