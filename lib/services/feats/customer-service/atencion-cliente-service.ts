import { apiRequest } from '../../../api-config'
import type { MensajeCliente } from '../../../api-types'

export class AtencionClienteService {
  static async getMensajes(params: {
    estado?: 'nuevo' | 'en_proceso' | 'respondido' | 'cerrado'
    tipo?: 'queja' | 'consulta' | 'sugerencia' | 'reclamo'
    prioridad?: 'baja' | 'media' | 'alta' | 'urgente'
    cliente_numero?: string
    fecha_inicio?: string
    fecha_fin?: string
  } = {}): Promise<MensajeCliente[]> {
    const search = new URLSearchParams()
    if (params.estado) search.append('estado', params.estado)
    if (params.tipo) search.append('tipo', params.tipo)
    if (params.prioridad) search.append('prioridad', params.prioridad)
    if (params.cliente_numero) search.append('cliente_numero', params.cliente_numero)
    if (params.fecha_inicio) search.append('fecha_inicio', params.fecha_inicio)
    if (params.fecha_fin) search.append('fecha_fin', params.fecha_fin)
    const endpoint = `/atencion-cliente/mensajes${search.toString() ? `?${search.toString()}` : ''}`
    return apiRequest(endpoint)
  }

  static async getMensaje(mensajeId: string): Promise<MensajeCliente> {
    const endpoint = `/atencion-cliente/mensajes/${mensajeId}`
    return apiRequest(endpoint)
  }

  static async actualizarEstadoMensaje(
    mensajeId: string,
    estado: 'nuevo' | 'en_proceso' | 'respondido' | 'cerrado'
  ): Promise<boolean> {
    const response = await apiRequest<{ success: boolean }>(`/atencion-cliente/mensajes/${mensajeId}/estado`, {
      method: 'PUT',
      body: JSON.stringify({ estado }),
    })
    return response.success === true
  }

  static async crearRespuesta(
    mensajeId: string,
    contenido: string,
    autorCi: string,
    autorNombre: string,
    esPublica: boolean = true
  ): Promise<string> {
    const response = await apiRequest<{ respuesta_id?: string; id?: string }>(
      `/atencion-cliente/mensajes/${mensajeId}/respuestas`,
      {
        method: 'POST',
        body: JSON.stringify({
          contenido,
          autor: autorCi,
          autor_nombre: autorNombre,
          es_publica: esPublica,
        }),
      }
    )
    return response.respuesta_id || response.id || 'success'
  }

  static async getEstadisticas(): Promise<{
    total: number
    nuevos: number
    en_proceso: number
    respondidos: number
    cerrados: number
    por_tipo: Record<string, number>
    por_prioridad: Record<string, number>
  }> {
    const endpoint = `/atencion-cliente/estadisticas`
    return apiRequest(endpoint)
  }

  static async actualizarPrioridad(
    mensajeId: string,
    prioridad: 'baja' | 'media' | 'alta' | 'urgente'
  ): Promise<boolean> {
    const response = await apiRequest<{ success: boolean }>(`/atencion-cliente/mensajes/${mensajeId}/prioridad`, {
      method: 'PUT',
      body: JSON.stringify({ prioridad }),
    })
    return response.success === true
  }
}
