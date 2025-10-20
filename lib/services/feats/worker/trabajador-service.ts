/* eslint-disable @typescript-eslint/no-explicit-any */

import { apiRequest } from '../../../api-config'
import type { Trabajador as ApiTrabajador } from '../../../api-types'

export class TrabajadorService {
  static async getAllTrabajadores(): Promise<ApiTrabajador[]> {
    console.log('Calling getAllTrabajadores endpoint')
    const response = await apiRequest<{ data: ApiTrabajador[] }>('/trabajadores/')
    console.log('TrabajadorService.getAllTrabajadores response:', response)
    console.log('Type of response:', typeof response, 'Is array:', Array.isArray(response))
    const data = response.data || []
    console.log('Extracted data:', data)
    return data
  }

  static async buscarTrabajadores(nombre: string): Promise<ApiTrabajador[]> {
    return apiRequest<ApiTrabajador[]>(`/trabajadores/buscar?nombre=${encodeURIComponent(nombre)}`)
  }

  static async crearTrabajador(ci: string, nombre: string, contrasena?: string): Promise<string> {
    console.log('Calling crearTrabajador with:', { ci, nombre, contrasena })
    const response = await apiRequest<{ trabajador_id?: string; brigada_id?: string }>('/trabajadores/', {
      method: 'POST',
      body: JSON.stringify({ ci, nombre, contrasena }),
    })
    console.log('crearTrabajador response:', response)
    return response.trabajador_id || response.brigada_id || 'success'
  }

  static async crearJefeBrigada(
    ci: string,
    nombre: string,
    contrasena: string,
    integrantes: { CI: string; nombre?: string }[]
  ): Promise<string> {
    console.log('Calling crearJefeBrigada with:', { ci, nombre, contrasena, integrantes })
    let integrantesFinal = integrantes
    if (integrantes.length > 0 && !integrantes[0].nombre) {
      const trabajadores = await this.getAllTrabajadores()
      integrantesFinal = integrantes.map((i) => {
        const t = trabajadores.find((t) => t.CI === i.CI)
        return { CI: i.CI, nombre: t ? t.nombre : '' }
      })
    }
    try {
      const response = await apiRequest<{ trabajador_id?: string; brigada_id?: string }>(
        '/trabajadores/jefes_brigada',
        {
          method: 'POST',
          body: JSON.stringify({ ci, nombre, contrasena, integrantes: integrantesFinal }),
        }
      )
      console.log('crearJefeBrigada response:', response)
      return response.trabajador_id || response.brigada_id || 'success'
    } catch (error) {
      console.error('Backend error in crearJefeBrigada:', error)
      throw error
    }
  }

  static async convertirTrabajadorAJefe(
    ci: string,
    contrasena: string,
    integrantes: { CI: string; nombre?: string }[]
  ): Promise<boolean> {
    console.log('Calling convertirTrabajadorAJefe with:', { ci, contrasena, integrantes })
    try {
      let integrantesFinal = integrantes
      if (integrantes.length > 0 && !integrantes[0].nombre) {
        const trabajadores = await this.getAllTrabajadores()
        integrantesFinal = integrantes.map((i) => {
          const t = trabajadores.find((t) => t.CI === i.CI)
          return { CI: i.CI, nombre: t ? t.nombre : '' }
        })
      }
      const response = await apiRequest<{ success: boolean }>(`/trabajadores/${ci}/convertir_jefe`, {
        method: 'POST',
        body: JSON.stringify({ contrasena, integrantes: integrantesFinal }),
      })
      console.log('convertirTrabajadorAJefe response:', response)
      return response.success === true
    } catch (error) {
      console.error('Error in convertirTrabajadorAJefe:', error)
      throw error
    }
  }

  static async crearTrabajadorYAsignarBrigada(
    ci: string,
    nombre: string,
    contrasena: string,
    brigada_id: string
  ): Promise<boolean> {
    console.log('Calling crearTrabajadorYAsignarBrigada with:', { ci, nombre, contrasena, brigada_id })
    const response = await apiRequest<{ success: boolean }>('/trabajadores/asignar_brigada', {
      method: 'POST',
      body: JSON.stringify({ ci, nombre, contrasena, brigada_id }),
    })
    console.log('crearTrabajadorYAsignarBrigada response:', response)
    return response.success === true
  }

  static async asignarTrabajadorABrigada(brigadaId: string, ci: string, nombre: string): Promise<boolean> {
    console.log('Calling asignarTrabajadorABrigada with:', { brigadaId, ci, nombre })
    const response = await apiRequest<{ success: boolean }>(`/brigadas/${brigadaId}/trabajadores`, {
      method: 'POST',
      body: JSON.stringify({ CI: ci, nombre }),
    })
    console.log('asignarTrabajadorABrigada response:', response)
    return response.success === true
  }

  static async eliminarTrabajador(ci: string): Promise<boolean> {
    const response = await apiRequest<{ success: boolean }>(`/trabajadores/${ci}`, {
      method: 'DELETE',
    })
    return response.success === true
  }

  static async actualizarTrabajador(ci: string, nombre: string, nuevoCi?: string): Promise<boolean> {
    const body: any = { nombre }
    if (nuevoCi) {
      body.nuevo_ci = nuevoCi
    }

    const response = await apiRequest<{ success: boolean }>(`/trabajadores/${ci}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
    return response.success === true
  }

  static async eliminarTrabajadorDeBrigada(ci: string, brigadaId: string): Promise<boolean> {
    const response = await apiRequest<{ success: boolean }>(`/trabajadores/${ci}/brigada/${brigadaId}`, {
      method: 'DELETE',
    })
    return response.success === true
  }

  static async getHorasTrabajadas(ci: string, fecha_inicio: string, fecha_fin: string) {
    const response = await apiRequest<{ data: any }>(
      `/trabajadores/horas-trabajadas/${ci}?fecha_inicio=${fecha_inicio}&fecha_fin=${fecha_fin}`
    )
    return response.data
  }

  static async getHorasTrabajadasTodos(fecha_inicio: string, fecha_fin: string) {
    const response = await apiRequest<{ data: any }>(
      `/trabajadores/horas-trabajadas-todos?fecha_inicio=${fecha_inicio}&fecha_fin=${fecha_fin}`
    )
    return response.data
  }

  static async eliminarContrasenaTrabajador(ci: string): Promise<boolean> {
    const response = await apiRequest<{ success: boolean }>(`/trabajadores/${ci}/contrasena`, {
      method: 'DELETE',
    })
    return response.success === true
  }
}
