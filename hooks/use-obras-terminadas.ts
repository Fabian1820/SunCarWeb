"use client"

import { useState, useCallback } from "react"
import {
  ObrasTerminadasService,
  type ObraTerminada,
  type ClienteDetalleObras,
  type ObrasTerminadasFiltros,
} from "@/lib/services/feats/obras-terminadas/obras-terminadas-service"

/* ── Re-exportar tipos para no romper imports existentes ─────────── */
export type { ObraTerminada, ClienteDetalleObras }

/** @deprecated Usa ObraTerminada */
export type OfertaObra = ObraTerminada

/** @deprecated Usa ClienteDetalleObras */
export type DetalleCliente = ClienteDetalleObras & { fecha_instalacion?: string | null }

/* ── Hook ────────────────────────────────────────────────────────── */

export function useObrasTerminadas() {
  const [obras, setObras] = useState<ObraTerminada[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Caché de detalle por cliente_numero
  const [detalleCache, setDetalleCache] = useState<Record<string, ClienteDetalleObras>>({})
  const [detalleLoading, setDetalleLoading] = useState<Record<string, boolean>>({})
  const [detalleError, setDetalleError] = useState<Record<string, string>>({})

  /* ── Carga principal: UN solo endpoint, todo en el backend ────── */
  const fetchData = useCallback(async (filtros: ObrasTerminadasFiltros = {}) => {
    setLoading(true)
    setError(null)
    setDetalleCache({})

    try {
      const resp = await ObrasTerminadasService.getDatos({
        limit: 500,
        ...filtros,
      })
      setObras(resp.data ?? [])
      setTotal(resp.total ?? 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar obras terminadas")
    } finally {
      setLoading(false)
    }
  }, [])

  /* ── Detalle lazy: llamada individual por cliente ─────────────── */
  const fetchDetalle = useCallback(async (clienteNumero: string) => {
    if (!clienteNumero || detalleCache[clienteNumero]) return

    setDetalleLoading((prev) => ({ ...prev, [clienteNumero]: true }))
    setDetalleError((prev) => { const n = { ...prev }; delete n[clienteNumero]; return n })

    try {
      const detalle = await ObrasTerminadasService.getClienteDetalle(clienteNumero)
      setDetalleCache((prev) => ({ ...prev, [clienteNumero]: detalle }))
    } catch (err) {
      setDetalleError((prev) => ({
        ...prev,
        [clienteNumero]: err instanceof Error ? err.message : "Error al cargar detalle",
      }))
    } finally {
      setDetalleLoading((prev) => { const n = { ...prev }; delete n[clienteNumero]; return n })
    }
  }, [detalleCache])

  /* ── Alias de compatibilidad con código anterior ──────────────── */
  const ofertasConPagos = obras

  return {
    obras,
    total,
    ofertasConPagos,
    loading,
    error,
    fetchData,
    fetchDetalle,
    detalleCache,
    detalleLoading,
    detalleError,
  }
}
