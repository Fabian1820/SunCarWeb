import { apiRequest } from "../../../api-config"
import type {
  EstadoOficinaResponse,
  QuienEstaAhoraResponse,
  ReporteDiarioResponse,
  MarcarAsistenciaResponse,
  EliminarMarcajeResponse,
} from "../../../types/asistencia-types"

export class AsistenciaService {
  static async getQuienEstaAhora(): Promise<QuienEstaAhoraResponse> {
    try {
      return await apiRequest<QuienEstaAhoraResponse>("/asistencia/quien-esta-ahora")
    } catch (error) {
      console.error("Error al obtener quien está ahora:", error)
      return { success: false, message: "Error al obtener lista", data: { total: 0, trabajadores: [] } }
    }
  }

  static async getReporteDiario(fecha?: string): Promise<ReporteDiarioResponse> {
    const query = fecha ? `?fecha=${fecha}` : ""
    try {
      return await apiRequest<ReporteDiarioResponse>(`/asistencia/reporte-diario${query}`)
    } catch (error) {
      console.error("Error al obtener reporte diario:", error)
      return {
        success: false,
        message: "Error al obtener reporte",
        data: { fecha: fecha ?? "", trabajadores: [], resumen: { total_trabajadores: 0, presentes_hoy: 0, ausentes: 0, actualmente_en_oficina: 0 } },
      }
    }
  }

  static async marcarAsistencia(ci: string, comentarios?: string): Promise<MarcarAsistenciaResponse> {
    return apiRequest<MarcarAsistenciaResponse>("/asistencia/marcar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trabajador_ci: ci, ...(comentarios ? { comentarios } : {}) }),
    })
  }

  static async eliminarMarcaje(id: string): Promise<EliminarMarcajeResponse> {
    return apiRequest<EliminarMarcajeResponse>(`/asistencia/${id}`, { method: "DELETE" })
  }

  static async estaEnOficina(ci: string): Promise<EstadoOficinaResponse> {
    try {
      return await apiRequest<EstadoOficinaResponse>(`/asistencia/trabajador/${ci}/esta-en-oficina`)
    } catch (error) {
      console.error(`Error al verificar asistencia de ${ci}:`, error)
      return { success: false, message: "Error al obtener estado", data: { trabajador_ci: ci, esta_en_oficina: false, ultimo_marcaje: null } }
    }
  }

  static async verificarEstadoMultiple(cis: string[]): Promise<Map<string, boolean>> {
    const estadoMap = new Map<string, boolean>()
    cis.forEach((ci) => estadoMap.set(ci, false))
    try {
      const response = await this.getQuienEstaAhora()
      if (response.success && response.data?.trabajadores) {
        response.data.trabajadores.forEach((t) => {
          if (cis.includes(t.trabajador_ci)) estadoMap.set(t.trabajador_ci, true)
        })
      }
    } catch (error) {
      console.error("Error al verificar estado múltiple:", error)
    }
    return estadoMap
  }
}
