/* eslint-disable @typescript-eslint/no-explicit-any */

import { apiRequest } from '../../../api-config'
import type { Trabajador as ApiTrabajador } from '../../../api-types'
import type { BirthdaysResponse } from '../../../types/feats/trabajador/birthday-types'
import type { DirectorioTelefonicoResponse, TrabajadorDirectorioItem } from '../../../types/feats/trabajador/directorio-types'
import { ensureValidObjectId, normalizeOptionalObjectId } from '../../../utils/object-id'

export interface TrabajadorRelacionesPayload {
  sede_id?: string | null
  departamento_id?: string | null
}

export interface ActualizarTrabajadorPayload extends TrabajadorRelacionesPayload {
  nombre?: string
  nuevo_ci?: string
  activo?: boolean
  cargo?: string
}

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

  static async getTrabajadorByCI(ci: string): Promise<ApiTrabajador | null> {
    try {
      const response = await apiRequest<{ success?: boolean; data?: ApiTrabajador }>(`/trabajadores/ci/${ci}`)
      console.log(`getTrabajadorByCI(${ci}) response:`, response)
      
      // El backend devuelve { success: true, data: { CI, nombre, cargo, ... } }
      if (response?.success && response.data) {
        return response.data
      }
      
      // Fallback: si la respuesta es directamente el trabajador
      if (response && typeof response === 'object' && 'CI' in response) {
        return response as ApiTrabajador
      }
      
      return null
    } catch (error) {
      console.error(`Error obteniendo trabajador ${ci}:`, error)
      return null
    }
  }

  static async buscarTrabajadores(nombre: string): Promise<ApiTrabajador[]> {
    const raw = await apiRequest<any>(`/trabajadores/buscar?nombre=${encodeURIComponent(nombre)}`)
    if (Array.isArray(raw)) return raw
    if (Array.isArray(raw?.data)) return raw.data
    if (Array.isArray(raw?.trabajadores)) return raw.trabajadores
    return []
  }

  /** Búsqueda optimizada por nombre o cargo para el directorio telefónico. */
  static async buscarDirectorio(query: string, limit = 20): Promise<TrabajadorDirectorioItem[]> {
    const params = new URLSearchParams({ q: query, limit: String(limit) })
    const response = await apiRequest<DirectorioTelefonicoResponse>(`/trabajadores/directorio?${params.toString()}`)
    return response?.data ?? []
  }

  static async crearTrabajador(
    ci: string,
    nombre: string,
    contrasena?: string,
    relaciones?: TrabajadorRelacionesPayload
  ): Promise<string> {
    const sedeId = ensureValidObjectId(relaciones?.sede_id, 'sede_id')
    const departamentoId = ensureValidObjectId(relaciones?.departamento_id, 'departamento_id')

    const payload: Record<string, unknown> = {
      ci,
      nombre,
      contrasena,
    }

    if (sedeId !== undefined) payload.sede_id = sedeId
    if (departamentoId !== undefined) payload.departamento_id = departamentoId

    console.log('Calling crearTrabajador with:', payload)
    const response = await apiRequest<{ trabajador_id?: string; brigada_id?: string }>('/trabajadores/', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    console.log('crearTrabajador response:', response)
    return response.trabajador_id || response.brigada_id || 'success'
  }

  static async crearJefeBrigada(
    ci: string,
    nombre: string,
    contrasena: string,
    integrantes: { CI: string; nombre?: string }[],
    relaciones?: TrabajadorRelacionesPayload
  ): Promise<string> {
    const sedeId = ensureValidObjectId(relaciones?.sede_id, 'sede_id')
    const departamentoId = ensureValidObjectId(relaciones?.departamento_id, 'departamento_id')

    console.log('Calling crearJefeBrigada with:', { ci, nombre, contrasena, integrantes, sedeId, departamentoId })
    let integrantesFinal = integrantes
    if (integrantes.length > 0 && !integrantes[0].nombre) {
      const trabajadores = await this.getAllTrabajadores()
      integrantesFinal = integrantes.map((i) => {
        const t = trabajadores.find((t) => t.CI === i.CI)
        return { CI: i.CI, nombre: t ? t.nombre : '' }
      })
    }
    try {
      const payload: Record<string, unknown> = {
        ci,
        nombre,
        contrasena,
        integrantes: integrantesFinal,
      }

      if (sedeId !== undefined) payload.sede_id = sedeId
      if (departamentoId !== undefined) payload.departamento_id = departamentoId

      const response = await apiRequest<{ trabajador_id?: string; brigada_id?: string }>(
        '/trabajadores/jefes_brigada',
        {
          method: 'POST',
          body: JSON.stringify(payload),
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

  static async actualizarEstadoTrabajador(ci: string, activo: boolean): Promise<boolean> {
    const body = JSON.stringify({ activo })

    try {
      const response = await apiRequest<{ success?: boolean }>(`/trabajadores/${ci}/rrhh`, {
        method: 'PUT',
        body,
      })
      return response.success !== false
    } catch (rrhhError) {
      console.warn('No se pudo actualizar estado en /rrhh, intentando endpoint general:', rrhhError)
      const response = await apiRequest<{ success?: boolean }>(`/trabajadores/${ci}`, {
        method: 'PUT',
        body,
      })
      return response.success !== false
    }
  }

  static async darBajaTrabajador(ci: string): Promise<boolean> {
    return this.actualizarEstadoTrabajador(ci, false)
  }

  static async actualizarApoyoInstaladora(ci: string, esApoyoInstaladora: boolean): Promise<boolean> {
    const response = await apiRequest<{ success?: boolean }>(`/trabajadores/${ci}/rrhh`, {
      method: 'PUT',
      body: JSON.stringify({ es_apoyo_instaladora: esApoyoInstaladora }),
    })
    return response.success !== false
  }

  static async reactivarTrabajador(ci: string): Promise<boolean> {
    return this.actualizarEstadoTrabajador(ci, true)
  }

  static async actualizarTrabajador(ci: string, payload: ActualizarTrabajadorPayload): Promise<boolean> {
    const sedeId = ensureValidObjectId(payload.sede_id, 'sede_id')
    const departamentoId = ensureValidObjectId(payload.departamento_id, 'departamento_id')

    const body: Record<string, unknown> = {}

    if (payload.nombre !== undefined) {
      body.nombre = payload.nombre
    }
    if (payload.nuevo_ci !== undefined) {
      body.nuevo_ci = payload.nuevo_ci
    }
    if (payload.activo !== undefined) {
      body.activo = payload.activo
    }
    if (payload.cargo !== undefined) {
      body.cargo = payload.cargo
    }
    if (sedeId !== undefined) {
      body.sede_id = sedeId
    }
    if (departamentoId !== undefined) {
      body.departamento_id = departamentoId
    }

    // El backend responde 400 si no llega ningÃºn campo para actualizar.
    if (Object.keys(body).length === 0) {
      throw new Error('No se enviaron campos para actualizar el trabajador.')
    }

    const response = await apiRequest<{ success?: boolean; message?: string; error?: { message?: string } }>(`/trabajadores/${ci}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
    if (response.success === false) {
      throw new Error(response.message || response.error?.message || 'El backend rechazó la actualización.')
    }
    return true
  }

  static async actualizarRelacionesTrabajador(ci: string, relaciones: TrabajadorRelacionesPayload): Promise<boolean> {
    const sedeId = normalizeOptionalObjectId(relaciones.sede_id)
    const departamentoId = normalizeOptionalObjectId(relaciones.departamento_id)

    return this.actualizarTrabajador(ci, {
      sede_id: sedeId,
      departamento_id: departamentoId,
    })
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

  static async subirFotoTrabajador(ci: string, foto: File): Promise<string> {
    const formData = new FormData()
    formData.append('foto', foto)

    const response = await apiRequest<{ success?: boolean; message?: string; foto_perfil?: string }>(
      `/trabajadores/${ci}/foto`,
      {
        method: 'POST',
        body: formData,
      }
    )
    if (response.success === false || !response.foto_perfil) {
      throw new Error(response.message || 'No se pudo subir la foto de perfil.')
    }
    return response.foto_perfil
  }

  static async eliminarFotoTrabajador(ci: string): Promise<boolean> {
    const response = await apiRequest<{ success?: boolean; message?: string }>(`/trabajadores/${ci}/foto`, {
      method: 'DELETE',
    })
    return response.success !== false
  }

  static async eliminarContrasenaTrabajador(ci: string): Promise<boolean> {
    const response = await apiRequest<{ success: boolean }>(`/trabajadores/${ci}/contrasena`, {
      method: 'DELETE',
    })
    return response.success === true
  }

  /**
   * Obtiene la lista de trabajadores que cumplen años hoy
   * @returns Lista de trabajadores con cumpleaños hoy
   */
  static async getCumpleanosHoy(): Promise<BirthdaysResponse> {
    try {
      const response = await apiRequest<BirthdaysResponse>('/trabajadores/cumpleanos/hoy')
      return response
    } catch (error) {
      console.error('Error obteniendo cumpleaños:', error)
      return {
        success: false,
        message: 'Error al obtener cumpleaños',
        data: []
      }
    }
  }

  /**
   * Obtiene los trabajadores que cumplen años en los próximos 7 días (hoy incluido).
   * Cada elemento incluye foto_perfil, fecha (YYYY-MM-DD) y es_hoy.
   */
  static async getCumpleanosSemana(): Promise<BirthdaysResponse> {
    try {
      const response = await apiRequest<BirthdaysResponse>('/trabajadores/cumpleanos/semana')
      return response
    } catch (error) {
      console.error('Error obteniendo cumpleaños de la semana:', error)
      return {
        success: false,
        message: 'Error al obtener cumpleaños de la semana',
        data: []
      }
    }
  }
}
