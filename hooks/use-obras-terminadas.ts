"use client"

import { useState, useCallback } from "react"
import {
  PagoService,
  type OfertaConPagos,
} from "@/lib/services/feats/pagos/pago-service"
import { TrabajosDiariosService } from "@/lib/services/feats/instalaciones/trabajos-diarios-service"
import { ClienteService } from "@/lib/services/feats/customer/cliente-service"
import { ValeSalidaService } from "@/lib/services/feats/vales-salida/vale-salida-service"
import type { TrabajoDiarioRegistro } from "@/lib/types/feats/instalaciones/trabajos-diarios-types"
import type { ValeSalida } from "@/lib/types/feats/vales-salida/vale-salida-types"

export interface OfertaObra extends OfertaConPagos {
  comercial_nombre?: string | null
  fecha_creacion_cliente?: string | null
  fecha_instalacion_cliente?: string | null
}

export function useObrasTerminadas() {
  const [ofertasConPagos, setOfertasConPagos] = useState<OfertaObra[]>([])
  const [trabajosDiarios, setTrabajosDiarios] = useState<TrabajoDiarioRegistro[]>([])
  const [valesSalida, setValesSalida] = useState<ValeSalida[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [ofertas, trabajos, clientesResp, valesResp] = await Promise.all([
        PagoService.getOfertasConPagos(),
        TrabajosDiariosService.getTrabajosTodos().catch(() => [] as TrabajoDiarioRegistro[]),
        ClienteService.getClientes({ limit: 1000 }).catch(() => ({ clients: [] })),
        ValeSalidaService.getVales({ limit: 1000 }).catch(() => [] as ValeSalida[]),
      ])

      // Mapa código_cliente → datos enriquecidos
      const clienteMap = new Map<string, {
        estado?: string
        comercial?: string
        fecha_creacion?: string
        fecha_instalacion?: string
      }>()

      for (const c of clientesResp.clients || []) {
        const key = (c.numero || "").trim()
        if (key) {
          clienteMap.set(key, {
            estado: c.estado,
            comercial: c.comercial,
            fecha_creacion: c.fecha_creacion || c.created_at,
            fecha_instalacion: c.fecha_instalacion || c.fecha_montaje,
          })
        }
      }

      // Mapa cliente_numero → fecha del trabajo diario con instalacion_terminada=true (la más reciente)
      const fechaFinInstalacionMap = new Map<string, string>()
      for (const t of trabajos) {
        if (!t.instalacion_terminada) continue
        const key = (t.cliente_numero || t.cliente_id || "").trim()
        if (!key) continue
        const fechaTrabajo = t.fecha || t.fecha_trabajo || t.fin?.fecha || t.created_at || ""
        if (!fechaTrabajo) continue
        const actual = fechaFinInstalacionMap.get(key)
        // Guardamos la más reciente
        if (!actual || fechaTrabajo > actual) {
          fechaFinInstalacionMap.set(key, fechaTrabajo)
        }
      }

      // Enriquecer cada oferta
      const enriquecidas: OfertaObra[] = ofertas.map((oferta) => {
        const codigo = (oferta.cliente_numero || oferta.contacto?.codigo || "").trim()
        const clienteData = clienteMap.get(codigo)
        const enriquecida: OfertaObra = { ...oferta }

        if (clienteData) {
          if (!enriquecida.contacto.estado && clienteData.estado) {
            enriquecida.contacto = {
              ...enriquecida.contacto,
              estado: clienteData.estado,
            }
          }
          enriquecida.comercial_nombre = clienteData.comercial ?? null
          enriquecida.fecha_creacion_cliente = clienteData.fecha_creacion ?? null
        }

        // Fecha fin instalación: del trabajo diario con instalacion_terminada=true
        enriquecida.fecha_instalacion_cliente = fechaFinInstalacionMap.get(codigo) ?? null

        return enriquecida
      })

      // Solo mostrar ofertas de clientes con estado "Equipo instalado con éxito" (cualquier variante)
      const normEstado = (s?: string | null) =>
        (s || "")
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .trim()

      const soloInstalados = enriquecidas.filter((o) =>
        normEstado(o.contacto?.estado).includes("equipo instalado con exito"),
      )

      setOfertasConPagos(soloInstalados)
      setTrabajosDiarios(trabajos)
      setValesSalida(Array.isArray(valesResp) ? valesResp : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar los datos")
    } finally {
      setLoading(false)
    }
  }, [])

  const getTrabajosPorCliente = useCallback(
    (clienteNumero?: string | null, contactoCodigo?: string | null): TrabajoDiarioRegistro[] => {
      const match = (clienteNumero || contactoCodigo || "").trim()
      if (!match) return []
      return trabajosDiarios.filter(
        (t) =>
          (t.cliente_numero || "").trim() === match ||
          (t.cliente_id || "").trim() === match,
      )
    },
    [trabajosDiarios],
  )

  const getValesPorCliente = useCallback(
    (clienteNumero?: string | null, contactoCodigo?: string | null): ValeSalida[] => {
      const match = (clienteNumero || contactoCodigo || "").trim()
      if (!match) return []
      return valesSalida.filter((v) => {
        const solicitud = v.solicitud_material || v.solicitud_venta || v.solicitud
        const clienteNum = (
          solicitud?.cliente?.numero ||
          solicitud?.cliente_venta?.numero ||
          ""
        ).trim()
        return clienteNum === match
      })
    },
    [valesSalida],
  )

  return {
    ofertasConPagos,
    trabajosDiarios,
    valesSalida,
    loading,
    error,
    fetchData,
    getTrabajosPorCliente,
    getValesPorCliente,
  }
}
