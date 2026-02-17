import { useState, useEffect } from 'react'
import { PagosService, type OfertaConfirmadaSinPago } from '@/lib/services/feats/pagos/pagos-service'
import { PagoService, type OfertaConPagos } from '@/lib/services/feats/pagos/pago-service'

export function usePagos() {
  const [ofertasSinPago, setOfertasSinPago] = useState<OfertaConfirmadaSinPago[]>([])
  const [ofertasConSaldoPendiente, setOfertasConSaldoPendiente] = useState<OfertaConfirmadaSinPago[]>([])
  const [ofertasConPagos, setOfertasConPagos] = useState<OfertaConPagos[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingSinPago, setLoadingSinPago] = useState(false)
  const [loadingConSaldo, setLoadingConSaldo] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchOfertasSinPago = async () => {
    setLoadingSinPago(true)
    try {
      const data = await PagosService.getOfertasConfirmadasSinPago()
      setOfertasSinPago(data)
    } catch (err: any) {
      console.error('[usePagos] Error:', err)
      setError(err.message || 'Error al cargar ofertas sin pago')
    } finally {
      setLoadingSinPago(false)
    }
  }

  const fetchOfertasConSaldoPendiente = async () => {
    setLoadingConSaldo(true)
    try {
      const data = await PagosService.getOfertasConfirmadasConSaldoPendiente()
      setOfertasConSaldoPendiente(data)
    } catch (err: any) {
      console.error('[usePagos] Error:', err)
      setError(err.message || 'Error al cargar ofertas con saldo pendiente')
    } finally {
      setLoadingConSaldo(false)
    }
  }

  const fetchOfertasConPagos = async () => {
    try {
      const data = await PagoService.getOfertasConPagos()
      setOfertasConPagos(data)
    } catch (err: any) {
      console.error('[usePagos] Error:', err)
    }
  }

  const refetch = async () => {
    setLoading(true)
    setError(null)
    // Cargar en paralelo pero sin esperar a que ambas terminen
    // Cada una actualiza su estado independientemente
    fetchOfertasSinPago()
    fetchOfertasConSaldoPendiente()
    // Desactivar loading general inmediatamente
    setLoading(false)
  }

  const refetchOfertasConPagos = async () => {
    try {
      await fetchOfertasConPagos()
    } catch (err: any) {
      console.error('[usePagos] Error al cargar ofertas con pagos:', err)
    }
  }

  // NO cargar nada automáticamente al montar el hook
  // La página decidirá qué cargar según la vista activa

  return {
    ofertasSinPago,
    ofertasConSaldoPendiente,
    ofertasConPagos,
    loading,
    loadingSinPago,
    loadingConSaldo,
    error,
    refetch,
    refetchOfertasSinPago: fetchOfertasSinPago,
    refetchOfertasConSaldoPendiente: fetchOfertasConSaldoPendiente,
    refetchOfertasConPagos,
  }
}
