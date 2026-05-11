"use client"

import { useState, useCallback } from "react"
import { apiRequest } from "@/lib/api-config"
import type { OfertaConPagos } from "@/lib/services/feats/pagos/pago-service"
import type { TrabajoDiarioRegistro } from "@/lib/types/feats/instalaciones/trabajos-diarios-types"
import type { ValeSalida } from "@/lib/types/feats/vales-salida/vale-salida-types"

/* ── Tipos ───────────────────────────────────────────────────────── */

export interface OfertaObra extends OfertaConPagos {
  comercial_nombre?: string | null
  fecha_creacion_cliente?: string | null
  fecha_instalacion_cliente?: string | null
}

export interface DetalleCliente {
  trabajos: TrabajoDiarioRegistro[]
  vales: ValeSalida[]
  fecha_instalacion?: string | null
}

/* ── Respuesta del endpoint inicial ─────────────────────────────── */

interface ObrasTerminadasResponse {
  ofertas: OfertaObra[]
}

/* ── Hook ────────────────────────────────────────────────────────── */

export function useObrasTerminadas() {
  const [ofertasConPagos, setOfertasConPagos] = useState<OfertaObra[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Caché de detalle por cliente_numero — evita refetch al cerrar/abrir
  const [detalleCache, setDetalleCache] = useState<Record<string, DetalleCliente>>({})
  const [detalleLoading, setDetalleLoading] = useState<Record<string, boolean>>({})
  const [detalleError, setDetalleError] = useState<Record<string, string>>({})

  /* ── Carga inicial: tabla ─────────────────────────────────────── */
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    // Al refrescar, limpiamos la caché de detalles
    setDetalleCache({})
    setDetalleLoading({})
    setDetalleError({})
    try {
      const response = await apiRequest<ObrasTerminadasResponse>(
        "/obras-terminadas/datos",
        { method: "GET" },
      )
      setOfertasConPagos(response.ofertas ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar los datos")
    } finally {
      setLoading(false)
    }
  }, [])

  /* ── Carga lazy: detalle por cliente al expandir fila ─────────── */
  const fetchDetalle = useCallback(
    async (clienteNumero: string) => {
      if (!clienteNumero) return
      // Ya está en caché o cargando → no repetir
      if (detalleCache[clienteNumero] || detalleLoading[clienteNumero]) return

      setDetalleLoading((prev) => ({ ...prev, [clienteNumero]: true }))
      setDetalleError((prev) => { const n = { ...prev }; delete n[clienteNumero]; return n })

      try {
        const data = await apiRequest<DetalleCliente>(
          `/obras-terminadas/cliente/${encodeURIComponent(clienteNumero)}/detalle`,
          { method: "GET" },
        )
        setDetalleCache((prev) => ({ ...prev, [clienteNumero]: data }))
      } catch (err) {
        setDetalleError((prev) => ({
          ...prev,
          [clienteNumero]: err instanceof Error ? err.message : "Error al cargar el detalle",
        }))
      } finally {
        setDetalleLoading((prev) => { const n = { ...prev }; delete n[clienteNumero]; return n })
      }
    },
    [detalleCache, detalleLoading],
  )

  return {
    ofertasConPagos,
    loading,
    error,
    fetchData,
    // Detalle lazy
    fetchDetalle,
    detalleCache,
    detalleLoading,
    detalleError,
  }
}
