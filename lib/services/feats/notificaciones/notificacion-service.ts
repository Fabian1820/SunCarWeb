import { apiRequest } from "@/lib/api-config"

export interface Notificacion {
  id: string
  tipo: string
  titulo: string
  mensaje: string
  leida: boolean
  fecha: string
  cliente_numero: string
  cliente_nombre: string
}

export interface ConteoNotificaciones {
  no_leidas: number
}

export const NotificacionService = {
  async getMisNotificaciones(): Promise<Notificacion[]> {
    try {
      const data = await apiRequest<Notificacion[]>("/notificaciones/mis-notificaciones")
      return Array.isArray(data) ? data : []
    } catch (error) {
      console.error("[NotificacionService] Error al obtener notificaciones:", error)
      return []
    }
  },

  async getConteo(): Promise<ConteoNotificaciones> {
    try {
      const data = await apiRequest<ConteoNotificaciones>("/notificaciones/mis-notificaciones/conteo")
      return data && typeof (data as ConteoNotificaciones).no_leidas === "number"
        ? (data as ConteoNotificaciones)
        : { no_leidas: 0 }
    } catch (error) {
      console.error("[NotificacionService] Error al obtener conteo:", error)
      return { no_leidas: 0 }
    }
  },

  async marcarLeida(id: string): Promise<void> {
    try {
      await apiRequest(`/notificaciones/mis-notificaciones/${id}/leer`, {
        method: "PATCH",
      })
    } catch (error) {
      console.error("[NotificacionService] Error al marcar como leída:", error)
    }
  },

  async eliminar(id: string): Promise<void> {
    try {
      await apiRequest(`/notificaciones/mis-notificaciones/${id}`, {
        method: "DELETE",
      })
    } catch (error) {
      console.error("[NotificacionService] Error al eliminar notificación:", error)
    }
  },
}
