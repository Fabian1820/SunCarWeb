"use client"

import { useState, useCallback, useRef } from "react"
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

/* ── Async pool: mantiene N requests siempre en vuelo ───────────── */
// Mejor que lotes secuenciales: cuando termina uno, arranca el siguiente
// inmediatamente sin esperar a que complete el resto del lote.
async function runPool(tasks: (() => Promise<void>)[], concurrency: number): Promise<void> {
  const iter = tasks[Symbol.iterator]()

  async function worker(): Promise<void> {
    for (let item = iter.next(); !item.done; item = iter.next()) {
      await item.value()
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker()),
  )
}

const PREFETCH_CONCURRENCY = 8

/* ── Hook ────────────────────────────────────────────────────────── */

export function useObrasTerminadas() {
  const [obras, setObras] = useState<ObraTerminada[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [detalleCache, setDetalleCache] = useState<Record<string, ClienteDetalleObras>>({})
  const [detalleLoading, setDetalleLoading] = useState<Record<string, boolean>>({})
  const [detalleError, setDetalleError] = useState<Record<string, string>>({})

  // Ref síncrono del caché: fetchDetalle no necesita depender del estado React
  const cacheRef = useRef<Record<string, ClienteDetalleObras>>({})

  // Requests en vuelo: evita duplicados cuando prefetch y expansión manual coinciden
  const inFlightRef = useRef<Set<string>>(new Set())

  // AbortController del fetchData activo: permite cancelar fetch + prefetch anteriores
  const abortRef = useRef<AbortController | null>(null)

  /* ── Carga principal ─────────────────────────────────────────────── */
  const fetchData = useCallback(async (filtros: ObrasTerminadasFiltros = {}) => {
    // Cancelar ciclo anterior (fetch principal + prefetch en background)
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const { signal } = controller

    setLoading(true)
    setError(null)
    cacheRef.current = {}
    inFlightRef.current.clear()
    setDetalleCache({})
    setDetalleLoading({})
    setDetalleError({})

    try {
      const resp = await ObrasTerminadasService.getDatos({ limit: 500, ...filtros }, signal)
      if (signal.aborted) return

      const data = resp.data ?? []
      setObras(data)
      setTotal(resp.total ?? 0)

      // Prefetch en background: fire-and-forget, no bloquea la UI
      void prefetchDetalles(data, signal)
    } catch (err) {
      if (signal.aborted) return
      setError(err instanceof Error ? err.message : "Error al cargar obras terminadas")
    } finally {
      if (!signal.aborted) setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ── Detalle individual ──────────────────────────────────────────── */
  // Sin dependencias: usa refs estables → callback nunca se recrea → sin re-renders extra
  const fetchDetalle = useCallback(async (clienteNumero: string, signal?: AbortSignal) => {
    if (!clienteNumero || signal?.aborted) return
    if (cacheRef.current[clienteNumero]) return      // ya en caché
    if (inFlightRef.current.has(clienteNumero)) return // ya en vuelo

    inFlightRef.current.add(clienteNumero)
    setDetalleLoading((prev) => ({ ...prev, [clienteNumero]: true }))
    setDetalleError((prev) => { const n = { ...prev }; delete n[clienteNumero]; return n })

    try {
      const detalle = await ObrasTerminadasService.getClienteDetalle(clienteNumero, signal)
      if (signal?.aborted) return
      cacheRef.current[clienteNumero] = detalle
      setDetalleCache((prev) => ({ ...prev, [clienteNumero]: detalle }))
    } catch (err) {
      // No reportar errores de cancelación
      if (signal?.aborted || (err instanceof DOMException && err.name === "AbortError")) return
      setDetalleError((prev) => ({
        ...prev,
        [clienteNumero]: err instanceof Error ? err.message : "Error al cargar detalle",
      }))
    } finally {
      inFlightRef.current.delete(clienteNumero)
      setDetalleLoading((prev) => { const n = { ...prev }; delete n[clienteNumero]; return n })
    }
  }, []) // Sin dependencias — cacheRef e inFlightRef son refs estables

  /* ── Prefetch en background con pool de concurrencia real ────────── */
  // runPool mantiene PREFETCH_CONCURRENCY requests en vuelo en todo momento
  // (a diferencia de lotes secuenciales donde hay espera entre cada lote)
  async function prefetchDetalles(data: ObraTerminada[], signal: AbortSignal): Promise<void> {
    const numeros = [
      ...new Set(
        data
          .map((o) => (o.cliente_numero || o.contacto?.codigo || "").trim())
          .filter(Boolean),
      ),
    ]
    const tasks = numeros.map((num) => () => fetchDetalle(num, signal))
    await runPool(tasks, PREFETCH_CONCURRENCY)
  }

  /* ── Alias de compatibilidad ─────────────────────────────────────── */
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
