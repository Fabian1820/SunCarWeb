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
      
      // El backend devuelve { success: true, data: { id, lider: { CI }, integrantes: [] } }
      if (response?.success && response.data) {
        brigada = response.data
      } else if (response && typeof response === 'object' && 'lider' in response) {
        // Fallback: si la respuesta es directamente la brigada (sin wrapper)
        brigada = response as ApiBrigada
      }
      
      // Si tenemos la brigada, cargar el nombre del líder desde trabajadores
      if (brigada && brigada.lider) {
        const liderCI = brigada.lider.CI || brigada.lider_ci
        if (liderCI) {
          console.log(`Cargando nombre del líder con CI: ${liderCI}`)
          const trabajador = await TrabajadorService.getTrabajadorByCI(liderCI)
          if (trabajador?.nombre) {
            // Actualizar el nombre del líder en el objeto brigada
            brigada.lider = {
              ...brigada.lider,
              nombre: trabajador.nombre,
              CI: liderCI
            }
            console.log(`Nombre del líder cargado: ${trabajador.nombre}`)
          }
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
