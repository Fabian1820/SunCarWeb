import { apiRequest } from "@/lib/api-config";

// Tipos para trabajos de operación
export interface TrabajoOperacion {
  id?: string;
  tipo_trabajo: string;
  contacto_tipo: "cliente" | "lead";
  contacto_id: string;
  oferta_id?: string;
  brigada_id: string;
  comentario?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TrabajoOperacionResponse {
  success: boolean;
  message?: string;
  data?: TrabajoOperacion;
}

export interface TrabajosOperacionListResponse {
  success: boolean;
  data?: TrabajoOperacion[];
}

// Tipos para planificación diaria
export interface PlanificacionDiaria {
  id?: string;
  fecha: string;
  trabajos: TrabajoOperacion[];
  created_at?: string;
  updated_at?: string;
}

export interface PlanificacionDiariaResponse {
  success: boolean;
  message?: string;
  data?: PlanificacionDiaria;
}

export interface PlanificacionDiariaListResponse {
  success: boolean;
  data?: PlanificacionDiaria[];
}

export class PlanificacionDiariaService {
  // ========== Trabajos de Operación ==========

  /**
   * Crea un nuevo trabajo de operación
   */
  static async crearTrabajoOperacion(
    trabajo: Omit<TrabajoOperacion, "id" | "created_at" | "updated_at">
  ): Promise<TrabajoOperacionResponse> {
    return apiRequest<TrabajoOperacionResponse>(
      "/trabajos-operacion/",
      {
        method: "POST",
        body: JSON.stringify(trabajo),
      }
    );
  }

  /**
   * Obtiene un trabajo de operación por ID
   */
  static async obtenerTrabajoOperacion(
    trabajoId: string
  ): Promise<TrabajoOperacionResponse> {
    return apiRequest<TrabajoOperacionResponse>(
      `/trabajos-operacion/${trabajoId}`
    );
  }

  /**
   * Obtiene todos los trabajos de operación
   */
  static async obtenerTodosTrabajos(): Promise<TrabajosOperacionListResponse> {
    return apiRequest<TrabajosOperacionListResponse>("/trabajos-operacion/");
  }

  /**
   * Obtiene trabajos de operación por contacto
   */
  static async obtenerTrabajosPorContacto(
    contactoTipo: "cliente" | "lead",
    contactoId: string
  ): Promise<TrabajosOperacionListResponse> {
    return apiRequest<TrabajosOperacionListResponse>(
      `/trabajos-operacion/contacto/${contactoTipo}/${contactoId}`
    );
  }

  /**
   * Obtiene trabajos de operación por brigada
   */
  static async obtenerTrabajosPorBrigada(
    brigadaId: string
  ): Promise<TrabajosOperacionListResponse> {
    return apiRequest<TrabajosOperacionListResponse>(
      `/trabajos-operacion/brigada/${brigadaId}`
    );
  }

  /**
   * Actualiza un trabajo de operación
   */
  static async actualizarTrabajoOperacion(
    trabajoId: string,
    trabajo: Partial<TrabajoOperacion>
  ): Promise<TrabajoOperacionResponse> {
    return apiRequest<TrabajoOperacionResponse>(
      `/trabajos-operacion/${trabajoId}`,
      {
        method: "PUT",
        body: JSON.stringify(trabajo),
      }
    );
  }

  /**
   * Elimina un trabajo de operación
   */
  static async eliminarTrabajoOperacion(
    trabajoId: string
  ): Promise<{ success: boolean; message?: string }> {
    return apiRequest<{ success: boolean; message?: string }>(
      `/trabajos-operacion/${trabajoId}`,
      {
        method: "DELETE",
      }
    );
  }

  // ========== Planificación Diaria ==========

  /**
   * Crea una nueva planificación diaria
   */
  static async crearPlanificacionDiaria(
    planificacion: Omit<PlanificacionDiaria, "id" | "created_at" | "updated_at">
  ): Promise<PlanificacionDiariaResponse> {
    return apiRequest<PlanificacionDiariaResponse>(
      "/planificacion-diaria/",
      {
        method: "POST",
        body: JSON.stringify(planificacion),
      }
    );
  }

  /**
   * Obtiene una planificación diaria por ID
   */
  static async obtenerPlanificacionDiaria(
    planificacionId: string
  ): Promise<PlanificacionDiariaResponse> {
    return apiRequest<PlanificacionDiariaResponse>(
      `/planificacion-diaria/${planificacionId}`
    );
  }

  /**
   * Obtiene una planificación diaria por fecha
   */
  static async obtenerPlanificacionPorFecha(
    fecha: string
  ): Promise<PlanificacionDiariaResponse> {
    return apiRequest<PlanificacionDiariaResponse>(
      `/planificacion-diaria/fecha/${fecha}`
    );
  }

  /**
   * Obtiene todas las planificaciones diarias
   */
  static async obtenerTodasPlanificaciones(): Promise<PlanificacionDiariaListResponse> {
    return apiRequest<PlanificacionDiariaListResponse>("/planificacion-diaria/");
  }

  /**
   * Obtiene planificaciones en un rango de fechas
   */
  static async obtenerPlanificacionesPorRango(
    fechaInicio: string,
    fechaFin: string
  ): Promise<PlanificacionDiariaListResponse> {
    return apiRequest<PlanificacionDiariaListResponse>(
      `/planificacion-diaria/rango/?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`
    );
  }

  /**
   * Actualiza una planificación diaria completa
   */
  static async actualizarPlanificacionDiaria(
    planificacionId: string,
    planificacion: Partial<PlanificacionDiaria>
  ): Promise<PlanificacionDiariaResponse> {
    return apiRequest<PlanificacionDiariaResponse>(
      `/planificacion-diaria/${planificacionId}`,
      {
        method: "PUT",
        body: JSON.stringify(planificacion),
      }
    );
  }

  /**
   * Agrega un trabajo existente a una planificación diaria
   */
  static async agregarTrabajoAPlanificacion(
    planificacionId: string,
    trabajoId: string
  ): Promise<PlanificacionDiariaResponse> {
    return apiRequest<PlanificacionDiariaResponse>(
      `/planificacion-diaria/${planificacionId}/trabajos/${trabajoId}`,
      {
        method: "POST",
      }
    );
  }

  /**
   * Elimina un trabajo de una planificación diaria
   */
  static async eliminarTrabajoDePlanificacion(
    planificacionId: string,
    trabajoId: string
  ): Promise<PlanificacionDiariaResponse> {
    return apiRequest<PlanificacionDiariaResponse>(
      `/planificacion-diaria/${planificacionId}/trabajos/${trabajoId}`,
      {
        method: "DELETE",
      }
    );
  }

  /**
   * Elimina una planificación diaria completa
   */
  static async eliminarPlanificacionDiaria(
    planificacionId: string
  ): Promise<{ success: boolean; message?: string }> {
    return apiRequest<{ success: boolean; message?: string }>(
      `/planificacion-diaria/${planificacionId}`,
      {
        method: "DELETE",
      }
    );
  }
}
