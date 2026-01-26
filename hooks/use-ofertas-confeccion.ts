import { useState, useEffect, useCallback } from 'react'
import { useToast } from './use-toast'
import { API_CONFIG } from '@/lib/api-config'

export interface OfertaConfeccion {
  id: string
  nombre: string
  tipo: 'generica' | 'personalizada'
  estado: 'en_revision' | 'aprobada_para_enviar' | 'enviada_a_cliente' | 'confirmada_por_cliente' | 'reservada'
  cliente_id?: string
  cliente_nombre?: string
  foto_portada?: string
  precio_final: number
  total_materiales: number
  margen_comercial: number
  costo_transportacion: number
  fecha_creacion: string
  fecha_actualizacion: string
}

export function useOfertasConfeccion() {
  const [ofertas, setOfertas] = useState<OfertaConfeccion[]>([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const fetchOfertas = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/ofertas-confeccion`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      })

      if (!response.ok) {
        throw new Error('Error al cargar ofertas')
      }

      const data = await response.json()
      setOfertas(Array.isArray(data) ? data : [])
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
      const response = await fetch(`${API_CONFIG.BASE_URL}/ofertas-confeccion/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      })

      if (!response.ok) {
        throw new Error('Error al eliminar oferta')
      }

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
