"use client"

import { useState, useCallback, useRef } from "react"
import {
  ObrasTerminadasService,
  type ObraTerminada,
  type OfertaDetalleObras,
  type FacturaClienteObra,
  type ObrasTerminadasFiltros,
  type ObrasTerminadasTotales,
} from "@/lib/services/feats/obras-terminadas/obras-terminadas-service"

export type { ObraTerminada, OfertaDetalleObras, FacturaClienteObra, ObrasTerminadasTotales }

const TOTALES_VACIOS: ObrasTerminadasTotales = {
  total_cobrado: 0,
  total_pendiente: 0,
  total_facturado: 0,
  total_descuento: 0,
}

export type OfertaObra = ObraTerminada

const PAGE_SIZE = 20

export function useObrasTerminadas() {
  const [obras, setObras] = useState<ObraTerminada[]>([])
  const [total, setTotal] = useState(0)
  const [totales, setTotales] = useState<ObrasTerminadasTotales>(TOTALES_VACIOS)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [detalleCache, setDetalleCache] = useState<Record<string, OfertaDetalleObras>>({})
  const [detalleLoading, setDetalleLoading] = useState<Record<string, boolean>>({})
  const [detalleError, setDetalleError] = useState<Record<string, string>>({})

  // Facturas cliente — carga lazy al tocar la pestaña
  const [facturasClienteCache, setFacturasClienteCache] = useState<Record<string, FacturaClienteObra[]>>({})
  const [facturasClienteLoading, setFacturasClienteLoading] = useState<Record<string, boolean>>({})
  const [facturasClienteError, setFacturasClienteError] = useState<Record<string, string>>({})
  const facturasClienteInFlightRef = useRef<Set<string>>(new Set())

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
      facturasClienteInFlightRef.current.clear()
      setDetalleCache({})
      setDetalleLoading({})
      setDetalleError({})
      setFacturasClienteCache({})
      setFacturasClienteLoading({})
      setFacturasClienteError({})
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
      setTotales(resp.totales ?? TOTALES_VACIOS)
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

  const fetchFacturasCliente = useCallback(async (ofertaId: string) => {
    if (!ofertaId) return
    if (facturasClienteCache[ofertaId] !== undefined) return
    if (facturasClienteInFlightRef.current.has(ofertaId)) return

    facturasClienteInFlightRef.current.add(ofertaId)
    setFacturasClienteLoading((prev) => ({ ...prev, [ofertaId]: true }))
    setFacturasClienteError((prev) => { const n = { ...prev }; delete n[ofertaId]; return n })

    try {
      const data = await ObrasTerminadasService.getFacturasCliente(ofertaId)
      setFacturasClienteCache((prev) => ({ ...prev, [ofertaId]: data }))
    } catch (err) {
      setFacturasClienteError((prev) => ({
        ...prev,
        [ofertaId]: err instanceof Error ? err.message : "Error al cargar facturas cliente",
      }))
    } finally {
      facturasClienteInFlightRef.current.delete(ofertaId)
      setFacturasClienteLoading((prev) => { const n = { ...prev }; delete n[ofertaId]; return n })
    }
  }, [facturasClienteCache])

  const ofertasConPagos = obras
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return {
    obras,
    total,
    totales,
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
    fetchFacturasCliente,
    facturasClienteCache,
    facturasClienteLoading,
    facturasClienteError,
  }
}
