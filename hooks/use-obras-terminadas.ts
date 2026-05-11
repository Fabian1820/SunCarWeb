"use client"

import { useState, useCallback, useRef } from "react"
import {
  PagoService,
  type OfertaConPagos,
} from "@/lib/services/feats/pagos/pago-service"
import { TrabajosDiariosService } from "@/lib/services/feats/instalaciones/trabajos-diarios-service"
import { ClienteService } from "@/lib/services/feats/customer/cliente-service"
import { ValeSalidaService } from "@/lib/services/feats/vales-salida/vale-salida-service"
import type { TrabajoDiarioRegistro } from "@/lib/types/feats/instalaciones/trabajos-diarios-types"
import type { ValeSalida } from "@/lib/types/feats/vales-salida/vale-salida-types"

/* ── Tipos públicos ──────────────────────────────────────────────── */

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

/* ── Hook ────────────────────────────────────────────────────────── */

export function useObrasTerminadas() {
  const [ofertasConPagos, setOfertasConPagos] = useState<OfertaObra[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Datos base para resolver el detalle de forma instantánea
  const trabajosRef = useRef<TrabajoDiarioRegistro[]>([])
  const valesRef = useRef<ValeSalida[]>([])

  // Caché de detalle por cliente_numero — evita recalcular
  const [detalleCache, setDetalleCache] = useState<Record<string, DetalleCliente>>({})
  // detalleLoading y detalleError se mantienen por compatibilidad con la tabla;
  // en este modo siempre resuelven inmediatamente (sin red extra)
  const [detalleLoading] = useState<Record<string, boolean>>({})
  const [detalleError] = useState<Record<string, string>>({})

  /* ── Normalización de estado (sin tildes, minúsculas) ────────── */
  const normEstado = (s?: string | null) =>
    (s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()

  /* ── Carga inicial ───────────────────────────────────────────── */
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    setDetalleCache({})

    try {
      const [ofertas, trabajos, clientesResp, valesResp] = await Promise.all([
        PagoService.getOfertasConPagos(),
        TrabajosDiariosService.getTrabajosTodos().catch(() => [] as TrabajoDiarioRegistro[]),
        ClienteService.getClientes({ limit: 1000 }).catch(() => ({ clients: [] })),
        ValeSalidaService.getVales({ limit: 1000 }).catch(() => [] as ValeSalida[]),
      ])

      // Guardar en refs para uso en fetchDetalle
      trabajosRef.current = trabajos
      valesRef.current = Array.isArray(valesResp) ? valesResp : []

      // ── Mapa cliente_numero → datos enriquecidos ──────────────
      const clienteMap = new Map<string, {
        estado?: string
        comercial?: string
        fecha_creacion?: string
      }>()
      for (const c of clientesResp.clients || []) {
        const key = (c.numero || "").trim()
        if (key) {
          clienteMap.set(key, {
            estado: c.estado,
            comercial: c.comercial,
            fecha_creacion: c.fecha_creacion || c.created_at,
          })
        }
      }

      // ── Mapa cliente_numero → fecha del último trabajo terminado
      const fechaFinMap = new Map<string, string>()
      for (const t of trabajos) {
        if (!t.instalacion_terminada) continue
        const key = (t.cliente_numero || t.cliente_id || "").trim()
        if (!key) continue
        const fecha = t.fecha || t.fecha_trabajo || t.fin?.fecha || t.created_at || ""
        if (!fecha) continue
        const actual = fechaFinMap.get(key)
        if (!actual || fecha > actual) fechaFinMap.set(key, fecha)
      }

      // ── Enriquecer y filtrar ──────────────────────────────────
      const enriquecidas: OfertaObra[] = ofertas.map((oferta) => {
        const codigo = (oferta.cliente_numero || oferta.contacto?.codigo || "").trim()
        const clienteData = clienteMap.get(codigo)
        const enriquecida: OfertaObra = { ...oferta }

        if (clienteData) {
          if (!enriquecida.contacto?.estado && clienteData.estado) {
            enriquecida.contacto = { ...enriquecida.contacto, estado: clienteData.estado }
          }
          enriquecida.comercial_nombre = clienteData.comercial ?? null
          enriquecida.fecha_creacion_cliente = clienteData.fecha_creacion ?? null
        }

        enriquecida.fecha_instalacion_cliente = fechaFinMap.get(codigo) ?? null
        return enriquecida
      })

      // Solo clientes con "Equipo instalado con éxito"
      const soloInstalados = enriquecidas.filter((o) =>
        normEstado(o.contacto?.estado).includes("equipo instalado con exito"),
      )

      setOfertasConPagos(soloInstalados)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar los datos")
    } finally {
      setLoading(false)
    }
  }, [])

  /* ── Detalle lazy: resuelve desde los datos ya cargados ──────── */
  const fetchDetalle = useCallback(
    async (clienteNumero: string) => {
      if (!clienteNumero || detalleCache[clienteNumero]) return

      const match = clienteNumero.trim()

      const trabajos = trabajosRef.current.filter(
        (t) =>
          (t.cliente_numero || "").trim() === match ||
          (t.cliente_id || "").trim() === match,
      )

      const vales = valesRef.current.filter((v) => {
        const solicitud = v.solicitud_material || v.solicitud_venta || (v as any).solicitud
        const num = (
          solicitud?.cliente?.numero ||
          solicitud?.cliente_venta?.numero ||
          ""
        ).trim()
        return num === match
      })

      // Fecha instalación desde los trabajos de este cliente
      const terminados = trabajos.filter((t) => t.instalacion_terminada)
      let fechaInstalacion: string | null = null
      if (terminados.length) {
        fechaInstalacion = terminados.reduce((best, t) => {
          const f = t.fecha || t.fecha_trabajo || t.fin?.fecha || t.created_at || ""
          return f > best ? f : best
        }, "")
      }

      setDetalleCache((prev) => ({
        ...prev,
        [clienteNumero]: { trabajos, vales, fecha_instalacion: fechaInstalacion },
      }))
    },
    [detalleCache],
  )

  return {
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
