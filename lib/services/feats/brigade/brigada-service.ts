/* eslint-disable @typescript-eslint/no-explicit-any */

import { apiRequest } from '../../../api-config'
import type { Brigada as ApiBrigada } from '../../../api-types'
import type { BrigadaRequest, TeamMember } from '../../../brigade-types'
import { TrabajadorService } from '../worker/trabajador-service'

export class BrigadaService {
  static async getAllBrigadas(): Promise<ApiBrigada[]> {
    console.log('Calling getAllBrigadas endpoint')
    const response = await apiRequest<{ data: ApiBrigada[] }>('/brigadas/')
    console.log('BrigadaService.getAllBrigadas response:', response)
    console.log('Type of response:', typeof response, 'Is array:', Array.isArray(response))
    const data = response.data || []
    console.log('Extracted data:', data)
    return data
  }

  static async getBrigadaById(brigadaId: string): Promise<ApiBrigada | null> {
    try {
      const response = await apiRequest<{ success?: boolean; data?: ApiBrigada }>(`/brigadas/${brigadaId}`)
      console.log(`getBrigadaById(${brigadaId}) response:`, response)
      
      let brigada: ApiBrigada | null = null
      
      // El backend devuelve { success: true, data: { id, lider_ci, lider: { CI }, integrantes: [] } }
      if (response?.success && response.data) {
        brigada = response.data
      } else if (response && typeof response === 'object' && ('lider_ci' in response || 'lider' in response)) {
        // Fallback: si la respuesta es directamente la brigada (sin wrapper)
        brigada = response as ApiBrigada
      }
      
      // Si tenemos la brigada, cargar el nombre del líder desde trabajadores
      if (brigada) {
        // Obtener el CI del líder (puede estar en lider_ci o en lider.CI)
        const liderCI = brigada.lider_ci || brigada.lider?.CI
        
        if (liderCI) {
          console.log(`Cargando nombre del líder con CI: ${liderCI}`)
          const trabajador = await TrabajadorService.getTrabajadorByCI(liderCI)
          console.log(`Trabajador obtenido:`, trabajador)
          
          if (trabajador?.nombre) {
            // Actualizar el objeto lider con toda la información del trabajador
            brigada.lider = {
              id: trabajador.id || trabajador.CI,
              CI: trabajador.CI,
              nombre: trabajador.nombre,
              tiene_contraseña: trabajador.tiene_contraseña || false,
              telefono: trabajador.telefono,
              email: trabajador.email
            }
            console.log(`Nombre del líder cargado: ${trabajador.nombre}`)
          } else {
            console.warn(`No se pudo obtener el nombre del trabajador con CI: ${liderCI}`)
          }
        } else {
          console.warn(`No se encontró CI del líder en la brigada`)
        }
      }
      
      return brigada
    } catch (error) {
      console.error(`Error obteniendo brigada ${brigadaId}:`, error)
      return null
    }
  }

  static async createBrigada(brigadaData: any): Promise<string> {
    console.log('Calling createBrigada with:', brigadaData)
    const response = await apiRequest<{ brigada_id?: string; id?: string }>('/brigadas/', {
      method: 'POST',
      body: JSON.stringify(brigadaData),
    })
    console.log('createBrigada response:', response)
    return response.brigada_id || response.id || 'success'
  }

  static async buscarBrigadas(nombre: string): Promise<ApiBrigada[]> {
    return apiRequest<ApiBrigada[]>(`/brigadas/buscar?nombre=${encodeURIComponent(nombre)}`)
  }

  // PUT /brigadas/{brigada_id} — se identifica por el _id de Mongo de la brigada.
  static async updateBrigada(brigadaId: string, brigadaData: BrigadaRequest): Promise<boolean> {
    const response = await apiRequest<{ success: boolean; message?: string }>(`/brigadas/${brigadaId}`, {
      method: 'PUT',
      body: JSON.stringify(brigadaData),
    })
    return response.success === true
  }

  // POST /brigadas/{brigada_id}/trabajadores — se identifica por el _id de Mongo de la brigada.
  static async addTrabajador(brigadaId: string, trabajador: TeamMember): Promise<boolean> {
    const response = await apiRequest<{ success: boolean; message?: string }>(`/brigadas/${brigadaId}/trabajadores`, {
      method: 'POST',
      body: JSON.stringify({ nombre: trabajador.nombre, CI: trabajador.CI }),
    })
    return response.success === true
  }

  // OJO: el backend identifica esta ruta por el CI del líder, no por el _id de la brigada.
  static async deleteBrigada(liderCi: string): Promise<boolean> {
    return BrigadaService.eliminarBrigada(liderCi)
  }

  // OJO: el backend identifica esta ruta por el CI del líder, no por el _id de la brigada.
  static async removeTrabajador(liderCi: string, trabajadorCi: string): Promise<boolean> {
    return BrigadaService.eliminarTrabajadorDeBrigada(liderCi, trabajadorCi)
  }

  // DELETE /brigadas/{lider_ci} — el parámetro es el CI del líder, no el _id de la brigada.
  static async eliminarBrigada(liderCi: string): Promise<boolean> {
    const response = await apiRequest<{ success: boolean }>(`/brigadas/${liderCi}`, {
      method: 'DELETE',
    })
    return response.success === true
  }

  // DELETE /brigadas/{lider_ci}/trabajadores/{trabajador_ci} — el primer parámetro es el CI del líder.
  static async eliminarTrabajadorDeBrigada(liderCi: string, trabajadorCi: string): Promise<boolean> {
    const response = await apiRequest<{ success: boolean }>(`/brigadas/${liderCi}/trabajadores/${trabajadorCi}`, {
      method: 'DELETE',
    })
    return response.success === true
  }
}
