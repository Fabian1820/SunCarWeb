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
  link_cliente?: boolean
  dias_alerta?: number  // solo en tipo "demora_instalacion"
}

export interface ConteoNotificaciones {
  no_leidas: number
}

export const NotificacionService = {
  async getMisNotificaciones(): Promise<Notificacion[]> {
    try {
      // El backend responde con { success, data: [...], total } — extraer .data
      const resp = await apiRequest<
        { success: boolean; data: Notificacion[]; total: number } | Notificacion[]
      >("/notificaciones/mis-notificaciones")
      if (Array.isArray(resp)) return resp
      if (resp && Array.isArray((resp as { data?: Notificacion[] }).data)) {
        return (resp as { data: Notificacion[] }).data
      }
      return []
    } catch (error) {
      console.error("[NotificacionService] Error al obtener notificaciones:", error)
      return []
    }
  },

  async getConteo(): Promise<ConteoNotificaciones | null> {
    try {
      const data = await apiRequest<ConteoNotificaciones>("/notificaciones/mis-notificaciones/conteo")
      return data && typeof (data as ConteoNotificaciones).no_leidas === "number"
        ? (data as ConteoNotificaciones)
        : null
    } catch {
      // Devuelve null para que el componente conserve el último valor conocido
      return null
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

  async marcarTodasLeidas(tipo?: string): Promise<number> {
    try {
      const qs = tipo ? `?tipo=${encodeURIComponent(tipo)}` : ""
      const r = await apiRequest<{ marcadas: number }>(
        `/notificaciones/mis-notificaciones/marcar-todas-leidas${qs}`,
        { method: "PATCH" }
      )
      return (r as { marcadas?: number })?.marcadas ?? 0
    } catch (error) {
      console.error("[NotificacionService] Error al marcar todas:", error)
      return 0
    }
  },

  async eliminarTodas(tipo?: string): Promise<number> {
    try {
      const qs = tipo ? `?tipo=${encodeURIComponent(tipo)}` : ""
      const r = await apiRequest<{ eliminadas: number }>(
        `/notificaciones/mis-notificaciones${qs}`,
        { method: "DELETE" }
      )
      return (r as { eliminadas?: number })?.eliminadas ?? 0
    } catch (error) {
      console.error("[NotificacionService] Error al eliminar todas:", error)
      return 0
    }
  },
}
