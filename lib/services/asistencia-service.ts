/**
 * Servicio para el sistema de control de asistencia
 * Endpoints basados en docs/API_ASISTENCIA.md
 */

import { apiRequest } from "../api-config"
import type { EstadoOficinaResponse, QuienEstaAhoraResponse } from "../types/asistencia-types"

export class AsistenciaService {
  /**
   * Verifica si un trabajador específico está en la oficina
   * GET /api/asistencia/trabajador/{ci}/esta-en-oficina
   */
  static async estaEnOficina(ci: string): Promise<EstadoOficinaResponse> {
    try {
      const response = await apiRequest<EstadoOficinaResponse>(
        `/asistencia/trabajador/${ci}/esta-en-oficina`,
        {
          method: "GET",
        }
      )
      return response
    } catch (error) {
      console.error(`Error al verificar asistencia de trabajador ${ci}:`, error)
      // Retornar respuesta por defecto en caso de error
      return {
        success: false,
        message: "Error al obtener estado",
        data: {
          trabajador_ci: ci,
          esta_en_oficina: false,
          ultimo_marcaje: null
        }
      }
    }
  }

  /**
   * Obtiene la lista de todos los trabajadores que están actualmente en la oficina
   * GET /api/asistencia/quien-esta-ahora
   *
   * Este endpoint devuelve SOLO los trabajadores que:
   * - Han marcado entrada HOY
   * - NO han marcado salida después de esa entrada
   * - Su último marcaje del día es de tipo "entrada"
   */
  static async quienEstaAhora(): Promise<QuienEstaAhoraResponse> {
    try {
      const response = await apiRequest<QuienEstaAhoraResponse>(
        "/asistencia/quien-esta-ahora",
        {
          method: "GET",
        }
      )
      console.log("📋 Respuesta de quien-esta-ahora:", response)
      return response
    } catch (error) {
      console.error("❌ Error al obtener quien está en oficina:", error)
      // Retornar respuesta vacía en caso de error
      return {
        success: false,
        message: "Error al obtener lista de asistencia",
        data: {
          total: 0,
          trabajadores: []
        }
      }
    }
  }

  /**
   * Verifica el estado de múltiples trabajadores
   * Utiliza quien-esta-ahora para eficiencia y construye un mapa de estados
   *
   * Estrategia: Un trabajador está "en oficina" si su último marcaje del día fue "entrada"
   */
  static async verificarEstadoMultiple(
    cis: string[]
  ): Promise<Map<string, boolean>> {
    const estadoMap = new Map<string, boolean>()

    try {
      console.log(`🔍 Verificando asistencia de ${cis.length} trabajadores no brigadistas`)

      // Inicializar todos como no presentes
      cis.forEach((ci) => estadoMap.set(ci, false))

      // Obtener lista de quién está en oficina ahora
      const response = await this.quienEstaAhora()

      if (!response.success) {
        console.warn("⚠️ La respuesta no fue exitosa:", response.message)
        return estadoMap
      }

      // Marcar los que están presentes según el backend
      if (response.data && response.data.trabajadores) {
        console.log(`✅ Trabajadores en oficina según backend: ${response.data.total}`)
        response.data.trabajadores.forEach((trabajador) => {
          if (cis.includes(trabajador.trabajador_ci)) {
            estadoMap.set(trabajador.trabajador_ci, true)
            console.log(`  ✓ ${trabajador.trabajador_ci} está en oficina desde ${trabajador.hora_entrada}`)
          }
        })
      } else {
        console.warn("⚠️ No hay datos de trabajadores en la respuesta")
      }

      const enOficina = Array.from(estadoMap.values()).filter(v => v).length
      console.log(`📊 Resultado final: ${enOficina} de ${cis.length} trabajadores en oficina`)

      return estadoMap
    } catch (error) {
      console.error("❌ Error crítico al verificar estado múltiple:", error)
      // En caso de error, devolver todos como no presentes
      cis.forEach((ci) => estadoMap.set(ci, false))
      return estadoMap
    }
  }
}
