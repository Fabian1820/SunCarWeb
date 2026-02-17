import { useState, useEffect } from 'react'
import { PagosService, type OfertaConfirmadaSinPago } from '@/lib/services/feats/pagos/pagos-service'
import { PagoService, type OfertaConPagos } from '@/lib/services/feats/pagos/pago-service'

export function usePagos() {
  const [ofertasSinPago, setOfertasSinPago] = useState<OfertaConfirmadaSinPago[]>([])
  const [ofertasConSaldoPendiente, setOfertasConSaldoPendiente] = useState<OfertaConfirmadaSinPago[]>([])
  const [ofertasConPagos, setOfertasConPagos] = useState<OfertaConPagos[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOfertasSinPago = async () => {
    try {
      const data = await PagosService.getOfertasConfirmadasSinPago()
      setOfertasSinPago(data)
    } catch (err: any) {
      console.error('[usePagos] Error:', err)
    }
  }

  const fetchOfertasConSaldoPendiente = async () => {
    try {
      const data = await PagosService.getOfertasConfirmadasConSaldoPendiente()
      setOfertasConSaldoPendiente(data)
    } catch (err: any) {
      console.error('[usePagos] Error:', err)
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
    try {
      await Promise.all([
        fetchOfertasSinPago(),
        fetchOfertasConSaldoPendiente(),
        fetchOfertasConPagos()
      ])
    } catch (err: any) {
      setError(err.message || 'Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refetch()
  }, [])

  return {
    ofertasSinPago,
    ofertasConSaldoPendiente,
    ofertasConPagos,
    loading,
    error,
    refetch,
  }
}
