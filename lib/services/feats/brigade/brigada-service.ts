/* eslint-disable @typescript-eslint/no-explicit-any */

import { apiRequest } from '../../../api-config'
import type { Brigada as ApiBrigada } from '../../../api-types'
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

  static async eliminarBrigada(brigadaId: string): Promise<boolean> {
    const response = await apiRequest<{ success: boolean }>(`/brigadas/${brigadaId}`, {
      method: 'DELETE',
    })
    return response.success === true
  }

  static async eliminarTrabajadorDeBrigada(brigadaId: string, trabajadorCi: string): Promise<boolean> {
    const response = await apiRequest<{ success: boolean }>(`/brigadas/${brigadaId}/trabajadores/${trabajadorCi}`, {
      method: 'DELETE',
    })
    return response.success === true
  }
}
