"use client"

import { useState, useCallback, useRef } from "react"
import {
  ObrasTerminadasService,
  type ObraTerminada,
  type OfertaDetalleObras,
  type ObrasTerminadasFiltros,
} from "@/lib/services/feats/obras-terminadas/obras-terminadas-service"

export type { ObraTerminada, OfertaDetalleObras }

export type OfertaObra = ObraTerminada

const PAGE_SIZE = 20

export function useObrasTerminadas() {
  const [obras, setObras] = useState<ObraTerminada[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [detalleCache, setDetalleCache] = useState<Record<string, OfertaDetalleObras>>({})
  const [detalleLoading, setDetalleLoading] = useState<Record<string, boolean>>({})
  const [detalleError, setDetalleError] = useState<Record<string, string>>({})

  const cacheRef = useRef<Record<string, OfertaDetalleObras>>({})
  const inFlightRef = useRef<Set<string>>(new Set())
  const abortRef = useRef<AbortController | null>(null)
  const lastFiltrosRef = useRef<ObrasTerminadasFiltros>({})

  const fetchData = useCallback(async (filtros: ObrasTerminadasFiltros = {}, pageNum = 0) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const { signal } = controller

    setLoading(true)
    setError(null)
    lastFiltrosRef.current = filtros

    if (pageNum === 0) {
      cacheRef.current = {}
      inFlightRef.current.clear()
      setDetalleCache({})
      setDetalleLoading({})
      setDetalleError({})
    }

    try {
      const resp = await ObrasTerminadasService.getDatos(
        { limit: PAGE_SIZE, skip: pageNum * PAGE_SIZE, ...filtros },
        signal,
      )
      if (signal.aborted) return

      const data = resp.data ?? []
      setObras(data)
      setTotal(resp.total ?? 0)
      setPage(pageNum)
    } catch (err) {
      if (signal.aborted) return
      setError(err instanceof Error ? err.message : "Error al cargar obras terminadas")
    } finally {
      if (!signal.aborted) setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const goToPage = useCallback((pageNum: number) => {
    fetchData(lastFiltrosRef.current, pageNum)
  }, [fetchData])

  const fetchDetalle = useCallback(async (ofertaId: string, signal?: AbortSignal) => {
    if (!ofertaId || signal?.aborted) return
    if (cacheRef.current[ofertaId]) return
    if (inFlightRef.current.has(ofertaId)) return

    inFlightRef.current.add(ofertaId)
    setDetalleLoading((prev) => ({ ...prev, [ofertaId]: true }))
    setDetalleError((prev) => { const n = { ...prev }; delete n[ofertaId]; return n })

    try {
      const detalle = await ObrasTerminadasService.getOfertaDetalle(ofertaId, signal)
      if (signal?.aborted) return
      cacheRef.current[ofertaId] = detalle
      setDetalleCache((prev) => ({ ...prev, [ofertaId]: detalle }))
    } catch (err) {
      if (signal?.aborted || (err instanceof DOMException && err.name === "AbortError")) return
      setDetalleError((prev) => ({
        ...prev,
        [ofertaId]: err instanceof Error ? err.message : "Error al cargar detalle",
      }))
    } finally {
      inFlightRef.current.delete(ofertaId)
      setDetalleLoading((prev) => { const n = { ...prev }; delete n[ofertaId]; return n })
    }
  }, [])

  const ofertasConPagos = obras
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return {
    obras,
    total,
    page,
    totalPages,
    pageSize: PAGE_SIZE,
    ofertasConPagos,
    loading,
    error,
    fetchData,
    goToPage,
    fetchDetalle,
    detalleCache,
    detalleLoading,
    detalleError,
  }
}
