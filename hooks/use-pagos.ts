import { useState, useEffect } from 'react'
import { PagosService, type OfertaConfirmadaSinPago } from '@/lib/services/feats/pagos/pagos-service'

export function usePagos() {
  const [ofertasSinPago, setOfertasSinPago] = useState<OfertaConfirmadaSinPago[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOfertasSinPago = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await PagosService.getOfertasConfirmadasSinPago()
      setOfertasSinPago(data)
    } catch (err: any) {
      setError(err.message || 'Error al cargar ofertas')
      console.error('[usePagos] Error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOfertasSinPago()
  }, [])

  return {
    ofertasSinPago,
    loading,
    error,
    refetch: fetchOfertasSinPago,
  }
}
