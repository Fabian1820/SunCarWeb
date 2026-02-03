import { useState, useEffect, useCallback } from 'react'
import { useToast } from './use-toast'
import { apiRequest } from '@/lib/api-config'

export interface OfertaConfeccion {
  id: string
  nombre: string
  nombre_completo?: string // Nombre largo descriptivo para exportaciones
  numero_oferta?: string
  tipo: 'generica' | 'personalizada'
  estado: 'en_revision' | 'aprobada_para_enviar' | 'enviada_a_cliente' | 'confirmada_por_cliente' | 'reservada' | 'rechazada' | 'cancelada'
  almacen_id?: string
  almacen_nombre?: string
  cliente_id?: string
  cliente_numero?: string
  cliente_nombre?: string
  lead_id?: string
  lead_nombre?: string
  nombre_lead_sin_agregar?: string
  foto_portada?: string
  precio_final: number
  total_materiales: number
  margen_comercial: number
  costo_transportacion: number
  subtotal_con_margen?: number
  total_elementos_personalizados?: number
  total_costos_extras?: number
  items?: {
    material_codigo: string
    descripcion: string
    precio: number
    cantidad: number
    categoria: string
    seccion: string
  }[]
  elementos_personalizados?: {
    material_codigo: string
    descripcion: string
    precio: number
    cantidad: number
    categoria: string
  }[]
  secciones_personalizadas?: {
    id: string
    label: string
    tipo: 'materiales' | 'extra'
    tipo_extra?: 'escritura' | 'costo'
    categorias_materiales?: string[]
    contenido_escritura?: string
    costos_extras?: {
      id: string
      descripcion: string
      cantidad: number
      precio_unitario: number
    }[]
  }[]
  componentes_principales?: {
    inversor_seleccionado?: string
    bateria_seleccionada?: string
    panel_seleccionado?: string
  }
  moneda_pago?: 'USD' | 'EUR' | 'CUP'
  tasa_cambio?: number
  pago_transferencia?: boolean
  datos_cuenta?: string
  aplica_contribucion?: boolean
  porcentaje_contribucion?: number
  notas?: string
  fecha_creacion: string
  fecha_actualizacion: string
}

const normalizeOfertaConfeccion = (raw: any): OfertaConfeccion => {
  const tipo = raw.tipo ?? raw.tipo_oferta ?? (raw.es_generica ? 'generica' : 'personalizada')

  return {
    id: raw.id ?? raw._id ?? raw.oferta_id ?? '',
    nombre: raw.nombre ?? raw.nombre_automatico ?? raw.nombre_oferta ?? 'Oferta sin nombre',
    nombre_completo: raw.nombre_completo, // Nombre largo descriptivo
    numero_oferta: raw.numero_oferta,
    tipo: tipo === 'personalizada' ? 'personalizada' : 'generica',
    estado: raw.estado ?? 'en_revision',
    almacen_id: raw.almacen_id ?? raw.almacen?.id ?? raw.almacen?._id,
    almacen_nombre: raw.almacen_nombre ?? raw.almacen?.nombre,
    cliente_id: raw.cliente_id ?? raw.cliente?.id ?? raw.cliente?._id,
    cliente_numero: raw.cliente_numero ?? raw.cliente?.numero,
    cliente_nombre: raw.cliente_nombre ?? raw.cliente?.nombre ?? raw.cliente?.nombre_completo,
    lead_id: raw.lead_id ?? raw.lead?.id ?? raw.lead?._id,
    lead_nombre: raw.lead_nombre ?? raw.lead?.nombre_completo ?? raw.lead?.nombre,
    nombre_lead_sin_agregar: raw.nombre_lead_sin_agregar,
    foto_portada: raw.foto_portada ?? raw.foto_portada_url ?? raw.foto,
    precio_final: raw.precio_final ?? raw.precio ?? 0,
    total_materiales: raw.total_materiales ?? 0,
    margen_comercial: raw.margen_comercial ?? 0,
    costo_transportacion: raw.costo_transportacion ?? 0,
    subtotal_con_margen: raw.subtotal_con_margen ?? 0,
    total_elementos_personalizados: raw.total_elementos_personalizados ?? 0,
    total_costos_extras: raw.total_costos_extras ?? 0,
    items: raw.items ?? raw.materiales ?? [],
    elementos_personalizados: raw.elementos_personalizados ?? [],
    secciones_personalizadas: raw.secciones_personalizadas ?? [],
    componentes_principales: raw.componentes_principales ?? {},
    moneda_pago: raw.moneda_pago ?? 'USD',
    tasa_cambio: raw.tasa_cambio ?? 0,
    pago_transferencia: raw.pago_transferencia ?? false,
    datos_cuenta: raw.datos_cuenta ?? '',
    aplica_contribucion: raw.aplica_contribucion ?? false,
    porcentaje_contribucion: raw.porcentaje_contribucion ?? 0,
    notas: raw.notas,
    fecha_creacion: raw.fecha_creacion ?? raw.created_at ?? '',
    fecha_actualizacion: raw.fecha_actualizacion ?? raw.updated_at ?? '',
  }
}

export function useOfertasConfeccion() {
  const [ofertas, setOfertas] = useState<OfertaConfeccion[]>([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const fetchOfertas = useCallback(async () => {
    setLoading(true)
    try {
      const response = await apiRequest<any>('/ofertas/confeccion/', { method: 'GET' })
      const rawOfertas = Array.isArray(response)
        ? response
        : response?.data ?? response?.results ?? []
      setOfertas(Array.isArray(rawOfertas) ? rawOfertas.map(normalizeOfertaConfeccion) : [])
    } catch (error: any) {
      console.error('Error fetching ofertas:', error)
      toast({
        title: 'Error',
        description: error.message || 'No se pudieron cargar las ofertas',
        variant: 'destructive',
      })
      setOfertas([])
    } finally {
      setLoading(false)
    }
  }, [toast])

  const eliminarOferta = useCallback(async (id: string) => {
    try {
      await apiRequest(`/ofertas/confeccion/${id}`, { method: 'DELETE' })

      toast({
        title: 'Oferta eliminada',
        description: 'La oferta se eliminó correctamente',
      })

      await fetchOfertas()
    } catch (error: any) {
      console.error('Error deleting oferta:', error)
      toast({
        title: 'Error',
        description: error.message || 'No se pudo eliminar la oferta',
        variant: 'destructive',
      })
    }
  }, [toast, fetchOfertas])

  useEffect(() => {
    fetchOfertas()
  }, [fetchOfertas])

  return {
    ofertas,
    loading,
    refetch: fetchOfertas,
    eliminarOferta,
  }
}
