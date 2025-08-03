import { useState, useEffect } from 'react'
import { AtencionClienteService } from '@/lib/api-services'
import type { MensajeCliente } from '@/lib/api-types'

interface UseAtencionClienteReturn {
  mensajes: MensajeCliente[]
  loading: boolean
  error: string | null
  estadisticas: {
    total: number
    nuevos: number
    en_proceso: number
    respondidos: number
    cerrados: number
    por_tipo: Record<string, number>
    por_prioridad: Record<string, number>
  } | null
  refetch: () => Promise<void>
  actualizarEstado: (mensajeId: string, estado: 'nuevo' | 'en_proceso' | 'respondido' | 'cerrado') => Promise<boolean>
  actualizarPrioridad: (mensajeId: string, prioridad: 'baja' | 'media' | 'alta' | 'urgente') => Promise<boolean>
  crearRespuesta: (mensajeId: string, contenido: string, autorCi: string, autorNombre: string, esPublica?: boolean) => Promise<string>
  filtrarMensajes: (filtros: {
    estado?: 'nuevo' | 'en_proceso' | 'respondido' | 'cerrado'
    tipo?: 'queja' | 'consulta' | 'sugerencia' | 'reclamo'
    prioridad?: 'baja' | 'media' | 'alta' | 'urgente'
    cliente_numero?: string
    fecha_inicio?: string
    fecha_fin?: string
  }) => Promise<void>
}

export function useAtencionCliente(filtrosIniciales?: {
  estado?: 'nuevo' | 'en_proceso' | 'respondido' | 'cerrado'
  tipo?: 'queja' | 'consulta' | 'sugerencia' | 'reclamo'
  prioridad?: 'baja' | 'media' | 'alta' | 'urgente'
  cliente_numero?: string
  fecha_inicio?: string
  fecha_fin?: string
}): UseAtencionClienteReturn {
  const [mensajes, setMensajes] = useState<MensajeCliente[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [estadisticas, setEstadisticas] = useState<UseAtencionClienteReturn['estadisticas']>(null)
  const [filtrosActuales, setFiltrosActuales] = useState(filtrosIniciales || {})

  const fetchData = async (filtros = filtrosActuales) => {
    try {
      setLoading(true)
      setError(null)
      const [mensajesData, estadisticasData] = await Promise.all([
        AtencionClienteService.getMensajes(filtros),
        AtencionClienteService.getEstadisticas()
      ])
      setMensajes(mensajesData)
      setEstadisticas(estadisticasData)
    } catch (err) {
      console.error('Error fetching mensajes:', err)
      setError(err instanceof Error ? err.message : 'Error al cargar los mensajes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const actualizarEstado = async (mensajeId: string, estado: 'nuevo' | 'en_proceso' | 'respondido' | 'cerrado') => {
    const success = await AtencionClienteService.actualizarEstadoMensaje(mensajeId, estado)
    if (success) {
      await fetchData()
    }
    return success
  }

  const actualizarPrioridad = async (mensajeId: string, prioridad: 'baja' | 'media' | 'alta' | 'urgente') => {
    const success = await AtencionClienteService.actualizarPrioridad(mensajeId, prioridad)
    if (success) {
      await fetchData()
    }
    return success
  }

  const crearRespuesta = async (mensajeId: string, contenido: string, autorCi: string, autorNombre: string, esPublica: boolean = true) => {
    const respuestaId = await AtencionClienteService.crearRespuesta(mensajeId, contenido, autorCi, autorNombre, esPublica)
    await fetchData()
    return respuestaId
  }

  const filtrarMensajes = async (filtros: {
    estado?: 'nuevo' | 'en_proceso' | 'respondido' | 'cerrado'
    tipo?: 'queja' | 'consulta' | 'sugerencia' | 'reclamo'
    prioridad?: 'baja' | 'media' | 'alta' | 'urgente'
    cliente_numero?: string
    fecha_inicio?: string
    fecha_fin?: string
  }) => {
    setFiltrosActuales(filtros)
    await fetchData(filtros)
  }

  return {
    mensajes,
    loading,
    error,
    estadisticas,
    refetch: fetchData,
    actualizarEstado,
    actualizarPrioridad,
    crearRespuesta,
    filtrarMensajes
  }
}