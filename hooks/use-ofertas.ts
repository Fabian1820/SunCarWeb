"use client"

import { useState, useEffect } from 'react'
import { OfertaService } from '@/lib/api-services'
import type { Oferta, OfertaSimplificada, CreateOfertaRequest, UpdateOfertaRequest } from '@/lib/api-types'

export interface UseOfertasReturn {
  ofertas: Oferta[]
  ofertasSimplificadas: OfertaSimplificada[]
  loading: boolean
  error: string | null
  crearOferta: (data: CreateOfertaRequest) => Promise<boolean>
  actualizarOferta: (id: string, data: UpdateOfertaRequest) => Promise<boolean>
  eliminarOferta: (id: string) => Promise<boolean>
  obtenerOfertaPorId: (id: string) => Promise<Oferta | null>
  recargarOfertas: () => Promise<void>
}

export function useOfertas(): UseOfertasReturn {
  const [ofertas, setOfertas] = useState<Oferta[]>([])
  const [ofertasSimplificadas, setOfertasSimplificadas] = useState<OfertaSimplificada[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cargarOfertas = async () => {
    try {
      setLoading(true)
      setError(null)

      const [ofertasCompletas, ofertasSimples] = await Promise.all([
        OfertaService.getOfertas(),
        OfertaService.getOfertasSimplificadas()
      ])

      setOfertas(ofertasCompletas)
      setOfertasSimplificadas(ofertasSimples)
    } catch (err: any) {
      console.error('Error al cargar ofertas:', err)
      setError(err.message || 'Error al cargar las ofertas')
    } finally {
      setLoading(false)
    }
  }

  const crearOferta = async (data: CreateOfertaRequest): Promise<boolean> => {
    try {
      setError(null)
      const ofertaId = await OfertaService.createOferta(data)
      console.log('Oferta creada con ID:', ofertaId)

      // Recargar ofertas después de crear
      await cargarOfertas()
      return true
    } catch (err: any) {
      console.error('Error al crear oferta:', err)
      setError(err.message || 'Error al crear la oferta')
      return false
    }
  }

  const actualizarOferta = async (id: string, data: UpdateOfertaRequest): Promise<boolean> => {
    try {
      setError(null)
      const success = await OfertaService.updateOferta(id, data)

      if (success) {
        // Recargar ofertas después de actualizar
        await cargarOfertas()
        return true
      } else {
        setError('No se pudo actualizar la oferta')
        return false
      }
    } catch (err: any) {
      console.error('Error al actualizar oferta:', err)
      setError(err.message || 'Error al actualizar la oferta')
      return false
    }
  }

  const eliminarOferta = async (id: string): Promise<boolean> => {
    try {
      setError(null)
      const success = await OfertaService.deleteOferta(id)

      if (success) {
        // Actualizar estado local sin recargar todo
        setOfertas(prev => prev.filter(oferta => oferta.id !== id))
        setOfertasSimplificadas(prev => prev.filter(oferta => oferta.id !== id))
        return true
      } else {
        setError('No se pudo eliminar la oferta')
        return false
      }
    } catch (err: any) {
      console.error('Error al eliminar oferta:', err)
      setError(err.message || 'Error al eliminar la oferta')
      return false
    }
  }

  const obtenerOfertaPorId = async (id: string): Promise<Oferta | null> => {
    try {
      setError(null)
      return await OfertaService.getOfertaById(id)
    } catch (err: any) {
      console.error('Error al obtener oferta por ID:', err)
      setError(err.message || 'Error al obtener la oferta')
      return null
    }
  }

  const recargarOfertas = async () => {
    await cargarOfertas()
  }

  // Cargar ofertas al montar el componente
  useEffect(() => {
    cargarOfertas()
  }, [])

  return {
    ofertas,
    ofertasSimplificadas,
    loading,
    error,
    crearOferta,
    actualizarOferta,
    eliminarOferta,
    obtenerOfertaPorId,
    recargarOfertas
  }
}