"use client"

import { Fragment, useMemo, useState } from "react"
import Link from "next/link"
import { Badge } from "@/components/shared/atom/badge"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select"
import { MaterialImage } from "@/components/shared/molecule/material-image"
import { SmartPagination } from "@/components/shared/molecule/smart-pagination"
import { ExportButtons } from "@/components/shared/molecule/export-buttons"
import {
  AlertCircle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  ExternalLink,
  Loader2,
  Package,
  RefreshCw,
  Search,
  X,
  XCircle,
} from "lucide-react"
import {
  useTransferenciasAlmacenes,
  type TransferenciaRow,
  type TransferenciaSortKey,
} from "@/hooks/use-transferencias-almacenes"

const ESTADO_CONFIG: Record<
  string,
  { label: string; icon: typeof Clock; className: string; dot: string }
> = {
  pendiente: {
    label: "Pendiente",
    icon: Clock,
    className: "bg-yellow-50 text-yellow-700 border-yellow-200",
    dot: "bg-yellow-500",
  },
  procesando: {
    label: "Procesando",
    icon: Loader2,
    className: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
  },
  aprobada: {
    label: "Aprobada",
    icon: CheckCircle2,
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
  denegada: {
    label: "Denegada",
    icon: XCircle,
    className: "bg-red-50 text-red-700 border-red-200",
    dot: "bg-red-500",
  },
}

const ESTADO_FALLBACK = {
  label: "—",
  icon: Clock,
  className: "bg-gray-50 text-gray-600 border-gray-200",
  dot: "bg-gray-400",
}

function formatFecha(fecha?: string | null): string {
  if (!fecha) return "—"
  const d = new Date(fecha)
  if (Number.isNaN(d.getTime())) return String(fecha)
  return d.toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatFechaCorta(fecha?: string | null): string {
  if (!fecha) return "—"
  const d = new Date(fecha)
  if (Number.isNaN(d.getTime())) return String(fecha)
  return d.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function formatCantidad(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2)
}

function EstadoBadge({ estado }: { estado: string }) {
  const config = ESTADO_CONFIG[estado] || ESTADO_FALLBACK
  const Icon = config.icon
  return (
    <Badge variant="outline" className={`gap-1 font-medium ${config.className}`}>
      <Icon className={`h-3 w-3 ${estado === "procesando" ? "animate-spin" : ""}`} />
      {config.label}
    </Badge>
  )
}

function ResumenCard({
  label,
  value,
  hint,
  dotClassName,
}: {
  label: string
  value: string | number
  hint?: string
  dotClassName?: string
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
      <div className="flex items-center gap-2">
        {dotClassName && <span className={`h-2 w-2 rounded-full ${dotClassName}`} />}
        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
          {label}
        </span>
      </div>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  )
}

function SortHeader({
  label,
  columnKey,
  activeKey,
  direction,
  onSort,
  className,
}: {
  label: string
  columnKey: TransferenciaSortKey
  activeKey: TransferenciaSortKey
  direction: "asc" | "desc"
  onSort: (key: TransferenciaSortKey) => void
  className?: string
}) {
  const active = activeKey === columnKey
  const Icon = !active ? ArrowUpDown : direction === "asc" ? ArrowUp : ArrowDown
  return (
    <th className={`py-3 px-3 text-left font-semibold text-gray-900 ${className || ""}`}>
      <button
        type="button"
        onClick={() => onSort(columnKey)}
        className={`inline-flex items-center gap-1 hover:text-emerald-700 transition-colors ${
          active ? "text-emerald-700" : ""
        }`}
      >
        {label}
        <Icon className={`h-3.5 w-3.5 ${active ? "opacity-100" : "opacity-40"}`} />
      </button>
    </th>
  )
}

function DetalleTransferencia({ row }: { row: TransferenciaRow }) {
  return (
    <div className="bg-gray-50/70 px-4 py-4 space-y-4">
      {/* Ficha de datos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-2 text-sm">
        <div>
          <span className="text-xs text-gray-500 block">Solicitada por</span>
          <span className="text-gray-900">{row.solicitante || "—"}</span>
          {row.solicitante_ci && (
            <span className="block text-xs text-gray-400 font-mono">
              CI {row.solicitante_ci}
            </span>
          )}
        </div>
        <div>
          <span className="text-xs text-gray-500 block">Fecha de solicitud</span>
          <span className="text-gray-900">{formatFecha(row.fecha_solicitud)}</span>
        </div>
        <div>
          <span className="text-xs text-gray-500 block">
            {row.estado === "denegada" ? "Denegada por" : "Aprobada por"}
          </span>
          <span className="text-gray-900">{row.aprobador || "—"}</span>
          {row.aprobador_ci && (
            <span className="block text-xs text-gray-400 font-mono">
              CI {row.aprobador_ci}
            </span>
          )}
        </div>
        <div>
          <span className="text-xs text-gray-500 block">Fecha de resolución</span>
          <span className="text-gray-900">{formatFecha(row.fecha_resolucion)}</span>
        </div>
        {row.motivo && (
          <div className="sm:col-span-2">
            <span className="text-xs text-gray-500 block">Motivo</span>
            <span className="text-gray-900 break-words">{row.motivo}</span>
          </div>
        )}
        {row.referencia && (
          <div>
            <span className="text-xs text-gray-500 block">Referencia</span>
            <span className="text-gray-900 break-words">{row.referencia}</span>
          </div>
        )}
        {row.comentario_resolucion && (
          <div className="sm:col-span-2">
            <span className="text-xs text-gray-500 block">Comentario de resolución</span>
            <span className="text-gray-900 break-words">{row.comentario_resolucion}</span>
          </div>
        )}
        <div>
          <span className="text-xs text-gray-500 block">ID de la transferencia</span>
          <span className="text-gray-900 font-mono text-xs break-all">{row.id}</span>
        </div>
        <div>
          <span className="text-xs text-gray-500 block">Movimientos generados</span>
          <span className="text-gray-900">
            {row.movimiento_ids.length > 0
              ? `${row.movimiento_ids.length} movimiento(s) de inventario`
              : "Ninguno (aún no se aplicó al stock)"}
          </span>
        </div>
      </div>

      {/* Materiales */}
      <div className="rounded-md border border-gray-200 bg-white overflow-x-auto">
        <table className="w-full text-sm min-w-[520px]">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-xs text-gray-600">
              <th className="text-left py-2 px-3 font-medium">Material</th>
              <th className="text-right py-2 px-3 font-medium">Cantidad</th>
              <th className="text-left py-2 px-3 font-medium">UM</th>
              <th className="text-left py-2 px-3 font-medium">Ubicación en origen</th>
            </tr>
          </thead>
          <tbody>
            {row.items.map((item, i) => (
              <tr
                key={`${row.id}-${item.material_id}-${i}`}
                className="border-b border-gray-100 last:border-0"
              >
                <td className="py-2 px-3">
                  <div className="flex items-center gap-2">
                    <MaterialImage
                      foto={item.foto}
                      fotoDisponible={item.foto_disponible}
                      alt={item.nombre}
                      className="relative h-9 w-9 rounded border border-gray-200 bg-white shrink-0 flex items-center justify-center"
                      imgClassName="h-9 w-9 rounded object-contain p-0.5"
                      fallback={<Package className="h-4 w-4 text-gray-400" />}
                    />
                    <div className="min-w-0">
                      <div className="text-gray-900 break-words">{item.nombre}</div>
                      {item.codigo && (
                        <div className="text-xs text-gray-400 font-mono">
                          {item.codigo}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-2 px-3 text-right font-medium text-gray-900 align-middle">
                  {formatCantidad(item.cantidad)}
                </td>
                <td className="py-2 px-3 text-gray-500 align-middle">
                  {item.um || "—"}
                </td>
                <td className="py-2 px-3 text-gray-500 align-middle">
                  {item.ubicacion_en_almacen || "—"}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-200 bg-gray-50 text-sm">
              <td className="py-2 px-3 font-medium text-gray-700">
                {row.total_materiales} material(es)
              </td>
              <td className="py-2 px-3 text-right font-semibold text-gray-900">
                {formatCantidad(row.total_cantidad)}
              </td>
              <td className="py-2 px-3 text-xs text-gray-400">
                {row.um_unica || "varias UM"}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href={`/almacenes/${row.origen_id}`}>
          <Button variant="outline" size="sm">
            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
            Ir al almacén origen
          </Button>
        </Link>
        <Link href={`/almacenes/${row.destino_id}`}>
          <Button variant="outline" size="sm">
            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
            Ir al almacén destino
          </Button>
        </Link>
      </div>
    </div>
  )
}

/**
 * Listado global de transferencias entre almacenes: todas las solicitudes de
 * traspaso (pendientes, aprobadas, denegadas) con filtros, orden, detalle
 * expandible y exportación. Solo consulta — aprobar/denegar sigue viviendo en
 * la vista del almacén, que es donde está la validación de permisos.
 */
export function TransferenciasAlmacenesTable() {
  const {
    loading,
    error,
    refetch,
    transferencias,
    transferenciasFiltradas,
    resumen,
    filters,
    setFilters,
    resetFilters,
    hasActiveFilters,
    sortKey,
    sortDir,
    toggleSort,
    page,
    totalPages,
    pageSize,
    setPage,
    almacenes,
    solicitantes,
  } = useTransferenciasAlmacenes()

  const [expandedId, setExpandedId] = useState<string | null>(null)

  const exportOptions = useMemo(
    () => ({
      title: "Transferencias entre almacenes",
      subtitle: hasActiveFilters
        ? `${transferenciasFiltradas.length} transferencia(s) — filtros aplicados`
        : `${transferenciasFiltradas.length} transferencia(s)`,
      columns: [
        { header: "Fecha solicitud", key: "fecha_solicitud", width: 18 },
        { header: "Estado", key: "estado", width: 12 },
        { header: "Origen", key: "origen", width: 22 },
        { header: "Destino", key: "destino", width: 22 },
        { header: "Material", key: "material", width: 32 },
        { header: "Cantidad", key: "cantidad", width: 12 },
        { header: "UM", key: "um", width: 8 },
        { header: "Solicitante", key: "solicitante", width: 22 },
        { header: "Aprobador", key: "aprobador", width: 22 },
        { header: "Fecha resolución", key: "fecha_resolucion", width: 18 },
        { header: "Motivo", key: "motivo", width: 30 },
      ],
      // Una fila por transferencia; los materiales se apilan dentro de la fila.
      stackedColumnKeys: ["material", "cantidad", "um"],
      data: transferenciasFiltradas.map((row) => ({
        fecha_solicitud: formatFecha(row.fecha_solicitud),
        estado: (ESTADO_CONFIG[row.estado] || ESTADO_FALLBACK).label,
        origen: row.origen_nombre,
        destino: row.destino_nombre,
        material: row.items.map((i) =>
          i.codigo ? `${i.nombre} (${i.codigo})` : i.nombre,
        ),
        cantidad: row.items.map((i) => i.cantidad),
        um: row.items.map((i) => i.um || "—"),
        solicitante: row.solicitante || "—",
        aprobador: row.aprobador || "—",
        fecha_resolucion: formatFecha(row.fecha_resolucion),
        motivo: row.motivo || "—",
      })),
    }),
    [transferenciasFiltradas, hasActiveFilters],
  )

  const rangoVisible = useMemo(() => {
    if (transferenciasFiltradas.length === 0) return null
    const desde = (page - 1) * pageSize + 1
    const hasta = Math.min(page * pageSize, transferenciasFiltradas.length)
    return `${desde}–${hasta} de ${transferenciasFiltradas.length}`
  }, [page, pageSize, transferenciasFiltradas.length])

  if (error && transferenciasFiltradas.length === 0 && !loading) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          Error al cargar las transferencias
        </h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button variant="outline" onClick={refetch}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Reintentar
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <ResumenCard
          label="Transferencias"
          value={resumen.total}
          hint={hasActiveFilters ? "con los filtros aplicados" : "en total"}
        />
        <ResumenCard
          label="Pendientes"
          value={resumen.pendientes + resumen.procesando}
          hint={
            resumen.procesando > 0
              ? `${resumen.procesando} en proceso`
              : "esperando aprobación"
          }
          dotClassName="bg-yellow-500"
        />
        <ResumenCard
          label="Aprobadas"
          value={resumen.aprobadas}
          hint={`${resumen.lineasAprobadas} línea(s) de material movidas`}
          dotClassName="bg-emerald-500"
        />
        <ResumenCard
          label="Denegadas"
          value={resumen.denegadas}
          dotClassName="bg-red-500"
        />
      </div>

      {/* Filtros */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="xl:col-span-2">
            <Label className="text-sm font-medium text-gray-700 mb-2 block">
              Buscar
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={filters.q}
                onChange={(e) => setFilters({ q: e.target.value })}
                placeholder="Material, almacén, persona, motivo o referencia"
                className="pl-9"
              />
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">
              Almacén origen
            </Label>
            <Select
              value={filters.origen_id}
              onValueChange={(value) => setFilters({ origen_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {almacenes.map((a) => (
                  <SelectItem key={`origen-${a.id}`} value={a.id as string}>
                    {a.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">
              Almacén destino
            </Label>
            <Select
              value={filters.destino_id}
              onValueChange={(value) => setFilters({ destino_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {almacenes.map((a) => (
                  <SelectItem key={`destino-${a.id}`} value={a.id as string}>
                    {a.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">
              Estado
            </Label>
            <Select
              value={filters.estado}
              onValueChange={(value) => setFilters({ estado: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="pendiente">Pendientes</SelectItem>
                <SelectItem value="aprobada">Aprobadas</SelectItem>
                <SelectItem value="denegada">Denegadas</SelectItem>
                <SelectItem value="procesando">Procesando</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">
              Solicitante
            </Label>
            <Select
              value={filters.solicitante}
              onValueChange={(value) => setFilters({ solicitante: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {solicitantes.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">
              Desde
            </Label>
            <Input
              type="date"
              value={filters.fecha_desde}
              onChange={(e) => setFilters({ fecha_desde: e.target.value })}
            />
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">
              Hasta
            </Label>
            <Input
              type="date"
              value={filters.fecha_hasta}
              onChange={(e) => setFilters({ fecha_hasta: e.target.value })}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={refetch} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="ml-2">Refrescar</span>
            </Button>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                <X className="h-4 w-4 mr-1.5" />
                Limpiar filtros
              </Button>
            )}
            {rangoVisible && (
              <span className="text-sm text-gray-500">{rangoVisible}</span>
            )}
          </div>
          <ExportButtons
            exportOptions={exportOptions}
            baseFilename="transferencias-almacenes"
            variant="compact"
          />
        </div>
      </div>

      {/* Tabla */}
      {loading && transferencias.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
          <span className="ml-2 text-gray-500">Cargando transferencias...</span>
        </div>
      ) : transferenciasFiltradas.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-gray-200 rounded-lg">
          <ArrowRight className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {hasActiveFilters
              ? "Sin transferencias para estos filtros"
              : "Aún no hay transferencias registradas"}
          </h3>
          <p className="text-gray-500 text-sm">
            {hasActiveFilters
              ? "Ajusta o limpia los filtros para ver más resultados."
              : "Los traspasos entre almacenes aparecerán aquí en cuanto se soliciten."}
          </p>
          {hasActiveFilters && (
            <Button variant="outline" size="sm" className="mt-4" onClick={resetFilters}>
              <X className="h-4 w-4 mr-1.5" />
              Limpiar filtros
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="w-8 py-3 px-3" />
                <SortHeader
                  label="Fecha"
                  columnKey="fecha_solicitud"
                  activeKey={sortKey}
                  direction={sortDir}
                  onSort={toggleSort}
                />
                <SortHeader
                  label="Origen"
                  columnKey="origen"
                  activeKey={sortKey}
                  direction={sortDir}
                  onSort={toggleSort}
                />
                <SortHeader
                  label="Destino"
                  columnKey="destino"
                  activeKey={sortKey}
                  direction={sortDir}
                  onSort={toggleSort}
                />
                <SortHeader
                  label="Materiales"
                  columnKey="materiales"
                  activeKey={sortKey}
                  direction={sortDir}
                  onSort={toggleSort}
                />
                <SortHeader
                  label="Cantidad"
                  columnKey="cantidad"
                  activeKey={sortKey}
                  direction={sortDir}
                  onSort={toggleSort}
                />
                <SortHeader
                  label="Solicitante"
                  columnKey="solicitante"
                  activeKey={sortKey}
                  direction={sortDir}
                  onSort={toggleSort}
                />
                <SortHeader
                  label="Estado"
                  columnKey="estado"
                  activeKey={sortKey}
                  direction={sortDir}
                  onSort={toggleSort}
                />
              </tr>
            </thead>
            <tbody>
              {transferencias.map((row) => {
                const isExpanded = expandedId === row.id
                return (
                  <Fragment key={row.id}>
                    <tr
                      className={`border-b border-gray-100 cursor-pointer transition-colors ${
                        isExpanded ? "bg-emerald-50/60" : "hover:bg-gray-50"
                      }`}
                      onClick={() => setExpandedId(isExpanded ? null : row.id)}
                    >
                      <td className="py-3 px-3 align-middle">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-gray-500" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        )}
                      </td>
                      <td className="py-3 px-3 align-middle whitespace-nowrap">
                        <div className="text-gray-900">
                          {formatFechaCorta(row.fecha_solicitud)}
                        </div>
                        {row.fecha_resolucion && (
                          <div className="text-xs text-gray-400">
                            resuelta {formatFechaCorta(row.fecha_resolucion)}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 align-middle">
                        <span className="text-gray-900">{row.origen_nombre}</span>
                      </td>
                      <td className="py-3 px-3 align-middle">
                        <div className="flex items-center gap-1.5">
                          <ArrowRight className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          <span className="text-gray-900">{row.destino_nombre}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 align-middle">
                        <span className="text-gray-900">{row.total_materiales}</span>
                      </td>
                      <td className="py-3 px-3 align-middle">
                        <span className="font-medium text-gray-900">
                          {formatCantidad(row.total_cantidad)}
                        </span>{" "}
                        <span className="text-xs text-gray-400">
                          {row.um_unica || "(varias UM)"}
                        </span>
                      </td>
                      <td className="py-3 px-3 align-middle">
                        <div className="text-gray-900">{row.solicitante || "—"}</div>
                        {row.aprobador && (
                          <div className="text-xs text-gray-400">
                            {row.estado === "denegada" ? "denegó" : "aprobó"}:{" "}
                            {row.aprobador}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 align-middle">
                        <EstadoBadge estado={row.estado} />
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="border-b border-gray-200">
                        <td colSpan={8} className="p-0">
                          <DetalleTransferencia row={row} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <SmartPagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  )
}
