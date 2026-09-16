"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { InventarioService, MaterialService } from "@/lib/api-services"
import type {
  Almacen,
  SolicitudTransferencia,
  SolicitudTransferenciaEstado,
} from "@/lib/inventario-types"
import type { Material } from "@/lib/material-types"

export type TransferenciaSortKey =
  | "fecha_solicitud"
  | "fecha_resolucion"
  | "origen"
  | "destino"
  | "materiales"
  | "cantidad"
  | "solicitante"
  | "estado"

export interface TransferenciasFilters {
  q: string
  origen_id: string
  destino_id: string
  estado: string
  solicitante: string
  fecha_desde: string
  fecha_hasta: string
}

export const FILTROS_TRANSFERENCIAS_INICIALES: TransferenciasFilters = {
  q: "",
  origen_id: "all",
  destino_id: "all",
  estado: "all",
  solicitante: "all",
  fecha_desde: "",
  fecha_hasta: "",
}

/** Item de la transferencia ya resuelto contra el catálogo de materiales. */
export interface TransferenciaItemResuelto {
  material_id: string
  codigo?: string
  nombre: string
  descripcion?: string
  foto?: string
  foto_disponible?: boolean | null
  um?: string
  cantidad: number
  ubicacion_en_almacen?: string | null
}

/** Una transferencia lista para pintar: nombres resueltos y totales calculados. */
export interface TransferenciaRow {
  id: string
  estado: SolicitudTransferenciaEstado
  origen_id: string
  origen_nombre: string
  destino_id: string
  destino_nombre: string
  items: TransferenciaItemResuelto[]
  total_materiales: number
  total_cantidad: number
  /**
   * UM común a todos los items, o `undefined` si la transferencia mezcla
   * unidades. Sumar 111 paneles con 250 m de cable no significa nada, así que
   * la UI solo etiqueta `total_cantidad` cuando hay una sola UM.
   */
  um_unica?: string
  motivo?: string | null
  referencia?: string | null
  solicitante: string
  solicitante_ci?: string
  aprobador?: string | null
  aprobador_ci?: string | null
  comentario_resolucion?: string | null
  fecha_solicitud: string
  fecha_resolucion?: string | null
  movimiento_ids: string[]
  /** Texto plano precalculado para la búsqueda libre. */
  searchBlob: string
}

const PAGE_SIZE = 20

function toTime(value?: string | null): number {
  if (!value) return 0
  const t = new Date(value).getTime()
  return Number.isNaN(t) ? 0 : t
}

/**
 * Transferencias entre almacenes a nivel global (todas, no las de un almacén).
 *
 * El backend expone `/solicitudes-transferencia/` sin paginación y el volumen es
 * bajo (decenas de documentos), así que se trae todo una vez y el filtrado,
 * ordenamiento y paginado son en cliente: filtros instantáneos sin round-trip.
 * Cada solicitud aprobada ES la transferencia ejecutada — los movimientos de
 * inventario de tipo `transferencia` se generan al aprobarla y quedan enlazados
 * en `movimiento_ids`.
 */
export function useTransferenciasAlmacenes() {
  const [solicitudes, setSolicitudes] = useState<SolicitudTransferencia[]>([])
  const [almacenes, setAlmacenes] = useState<Almacen[]>([])
  const [materiales, setMateriales] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [filters, setFiltersState] = useState<TransferenciasFilters>(
    FILTROS_TRANSFERENCIAS_INICIALES,
  )
  const [sortKey, setSortKey] = useState<TransferenciaSortKey>("fecha_solicitud")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [page, setPage] = useState(1)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [solicitudesData, almacenesData, materialesData] = await Promise.all([
        InventarioService.getSolicitudesTransferencia(),
        InventarioService.getAlmacenes(),
        MaterialService.getAllMaterials().catch(() => [] as Material[]),
      ])
      setSolicitudes(Array.isArray(solicitudesData) ? solicitudesData : [])
      setAlmacenes(Array.isArray(almacenesData) ? almacenesData : [])
      setMateriales(Array.isArray(materialesData) ? materialesData : [])
    } catch (err) {
      console.error("Error cargando transferencias:", err)
      setError(
        err instanceof Error ? err.message : "Error al cargar las transferencias",
      )
      setSolicitudes([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchAll()
  }, [fetchAll])

  const almacenNombrePorId = useMemo(() => {
    const map = new Map<string, string>()
    for (const a of almacenes) {
      if (a.id) map.set(a.id, a.nombre)
    }
    return map
  }, [almacenes])

  const materialPorId = useMemo(() => {
    const byId = new Map<string, Material>()
    const byCodigo = new Map<string, Material>()
    for (const m of materiales) {
      // El catálogo expone el ObjectId como `id` y, en algunas respuestas,
      // también como `material_id`: indexamos ambos porque los items de la
      // solicitud guardan uno u otro.
      if (m.id) byId.set(String(m.id), m)
      if (m.material_id) byId.set(String(m.material_id), m)
      if (m.codigo) byCodigo.set(String(m.codigo), m)
    }
    return { byId, byCodigo }
  }, [materiales])

  /** Todas las transferencias resueltas (sin filtrar), ya con nombres y totales. */
  const rows = useMemo<TransferenciaRow[]>(() => {
    return solicitudes.map((s) => {
      const items: TransferenciaItemResuelto[] = (s.items || []).map((item) => {
        const mat =
          materialPorId.byId.get(String(item.material_id)) ||
          (item.material_codigo
            ? materialPorId.byCodigo.get(String(item.material_codigo))
            : undefined)
        // El código del material no es identificador estable: si el catálogo no
        // lo resuelve, no inventamos nombre — mostramos el código crudo.
        const codigo =
          mat?.codigo ||
          (item.material_codigo && item.material_codigo !== item.material_id
            ? item.material_codigo
            : undefined)
        return {
          material_id: String(item.material_id),
          codigo,
          nombre:
            mat?.nombre ||
            mat?.descripcion ||
            codigo ||
            String(item.material_id),
          descripcion: mat?.descripcion,
          foto: mat?.foto as string | undefined,
          foto_disponible: (mat as { foto_disponible?: boolean | null } | undefined)
            ?.foto_disponible,
          um: mat?.um,
          cantidad: Number(item.cantidad) || 0,
          ubicacion_en_almacen: item.ubicacion_en_almacen,
        }
      })

      // Un item sin UM resuelta (material fuera del catálogo) cuenta como UM
      // distinta: preferimos "(varias UM)" antes que etiquetar el total con una
      // unidad que no sabemos si aplica a todo.
      const ums = new Set(items.map((i) => (i.um || "").trim()))

      const origen_nombre =
        almacenNombrePorId.get(s.almacen_origen_id) || "Almacén desconocido"
      const destino_nombre =
        almacenNombrePorId.get(s.almacen_destino_id) || "Almacén desconocido"

      const searchBlob = [
        origen_nombre,
        destino_nombre,
        s.solicitante,
        s.aprobador,
        s.motivo,
        s.referencia,
        s.comentario_resolucion,
        ...items.map((i) => `${i.nombre} ${i.codigo ?? ""}`),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()

      return {
        id: s.id,
        estado: s.estado,
        origen_id: s.almacen_origen_id,
        origen_nombre,
        destino_id: s.almacen_destino_id,
        destino_nombre,
        items,
        total_materiales: items.length,
        total_cantidad: items.reduce((acc, i) => acc + i.cantidad, 0),
        um_unica:
          ums.size === 1 && Array.from(ums)[0] ? Array.from(ums)[0] : undefined,
        motivo: s.motivo,
        referencia: s.referencia,
        solicitante: s.solicitante,
        solicitante_ci: s.solicitante_ci,
        aprobador: s.aprobador,
        aprobador_ci: s.aprobador_ci,
        comentario_resolucion: s.comentario_resolucion,
        fecha_solicitud: s.fecha_solicitud,
        fecha_resolucion: s.fecha_resolucion,
        movimiento_ids: s.movimiento_ids || [],
        searchBlob,
      }
    })
  }, [solicitudes, almacenNombrePorId, materialPorId])

  const solicitantes = useMemo(() => {
    const set = new Set<string>()
    for (const r of rows) {
      if (r.solicitante) set.add(r.solicitante.trim())
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [rows])

  /** Almacenes que realmente participan en alguna transferencia. */
  const almacenesConTransferencias = useMemo(() => {
    const ids = new Set<string>()
    for (const r of rows) {
      ids.add(r.origen_id)
      ids.add(r.destino_id)
    }
    return almacenes
      .filter((a) => a.id && ids.has(a.id))
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
  }, [rows, almacenes])

  const filtered = useMemo(() => {
    const q = filters.q.trim().toLowerCase()
    const desde = filters.fecha_desde ? new Date(`${filters.fecha_desde}T00:00:00`).getTime() : null
    // El "hasta" es inclusivo: se compara contra el final del día elegido.
    const hasta = filters.fecha_hasta ? new Date(`${filters.fecha_hasta}T23:59:59.999`).getTime() : null

    return rows.filter((r) => {
      if (q && !r.searchBlob.includes(q)) return false
      if (filters.origen_id !== "all" && r.origen_id !== filters.origen_id) return false
      if (filters.destino_id !== "all" && r.destino_id !== filters.destino_id) return false
      if (filters.estado !== "all" && r.estado !== filters.estado) return false
      if (filters.solicitante !== "all" && r.solicitante?.trim() !== filters.solicitante)
        return false
      const t = toTime(r.fecha_solicitud)
      if (desde !== null && t < desde) return false
      if (hasta !== null && t > hasta) return false
      return true
    })
  }, [rows, filters])

  const sorted = useMemo(() => {
    const factor = sortDir === "asc" ? 1 : -1
    const copy = [...filtered]
    copy.sort((a, b) => {
      switch (sortKey) {
        case "fecha_resolucion":
          return (toTime(a.fecha_resolucion) - toTime(b.fecha_resolucion)) * factor
        case "origen":
          return a.origen_nombre.localeCompare(b.origen_nombre) * factor
        case "destino":
          return a.destino_nombre.localeCompare(b.destino_nombre) * factor
        case "materiales":
          return (a.total_materiales - b.total_materiales) * factor
        case "cantidad":
          return (a.total_cantidad - b.total_cantidad) * factor
        case "solicitante":
          return (a.solicitante || "").localeCompare(b.solicitante || "") * factor
        case "estado":
          return a.estado.localeCompare(b.estado) * factor
        case "fecha_solicitud":
        default:
          return (toTime(a.fecha_solicitud) - toTime(b.fecha_solicitud)) * factor
      }
    })
    return copy
  }, [filtered, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paginated = useMemo(
    () => sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [sorted, currentPage],
  )

  /** Totales sobre el resultado filtrado, no sobre la página visible. */
  const resumen = useMemo(() => {
    let pendientes = 0
    let aprobadas = 0
    let denegadas = 0
    let procesando = 0
    // Líneas de material, no unidades: las UM se mezclan entre transferencias y
    // sumar cantidades de paneles con metros de cable no dice nada.
    let lineasAprobadas = 0
    for (const r of filtered) {
      if (r.estado === "pendiente") pendientes++
      else if (r.estado === "aprobada") {
        aprobadas++
        lineasAprobadas += r.total_materiales
      } else if (r.estado === "denegada") denegadas++
      else if (r.estado === "procesando") procesando++
    }
    return {
      total: filtered.length,
      pendientes,
      aprobadas,
      denegadas,
      procesando,
      lineasAprobadas,
    }
  }, [filtered])

  const setFilters = useCallback((patch: Partial<TransferenciasFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...patch }))
    setPage(1)
  }, [])

  const resetFilters = useCallback(() => {
    setFiltersState(FILTROS_TRANSFERENCIAS_INICIALES)
    setPage(1)
  }, [])

  const toggleSort = useCallback((key: TransferenciaSortKey) => {
    setSortKey((prevKey) => {
      if (prevKey === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"))
        return prevKey
      }
      // Fechas y magnitudes arrancan descendente (lo más reciente / lo mayor
      // primero); los textos, ascendente.
      setSortDir(
        key === "fecha_solicitud" ||
          key === "fecha_resolucion" ||
          key === "materiales" ||
          key === "cantidad"
          ? "desc"
          : "asc",
      )
      return key
    })
    setPage(1)
  }, [])

  const hasActiveFilters = useMemo(
    () =>
      JSON.stringify(filters) !== JSON.stringify(FILTROS_TRANSFERENCIAS_INICIALES),
    [filters],
  )

  return {
    loading,
    error,
    refetch: fetchAll,
    /** Página visible */
    transferencias: paginated,
    /** Todo el resultado filtrado y ordenado (para exportar) */
    transferenciasFiltradas: sorted,
    resumen,
    filters,
    setFilters,
    resetFilters,
    hasActiveFilters,
    sortKey,
    sortDir,
    toggleSort,
    page: currentPage,
    totalPages,
    pageSize: PAGE_SIZE,
    setPage,
    almacenes: almacenesConTransferencias,
    solicitantes,
  }
}
