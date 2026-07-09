"use client"

import { useMemo, useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shared/molecule/table"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/molecule/input"
import { Badge } from "@/components/shared/atom/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog"
import {
  Search,
  RefreshCw,
  AlertCircle,
  Eye,
  FileDown,
  Loader2,
} from "lucide-react"
import {
  ObrasTerminadasService,
  type ObraTerminada,
  type FacturaClienteObra,
} from "@/lib/services/feats/obras-terminadas/obras-terminadas-service"
import { ExportFacturaClienteService } from "@/lib/services/feats/obras-terminadas/export-factura-cliente-service"
import { FacturasClientePanel } from "./obras-terminadas-table"

interface FacturasObrasTerminadasTableProps {
  obras: ObraTerminada[]
  loading: boolean
  error: string | null
  onRefresh: () => void
  /** Exporta todas las facturas listadas (respetando filtros) en un único PDF, una por página. */
  onExportarTodas?: (obras: ObraTerminada[]) => Promise<void> | void
  onExportarExcel?: () => Promise<void> | void
  variant?: "default" | "embedded"
  searchValue?: string
  onSearchChange?: (value: string) => void
  totalCount?: number
  footer?: React.ReactNode
  totales?: {
    total_cobrado: number
    total_pendiente: number
    total_facturado: number
    total_descuento: number
  } | null
}

const formatCurrency = (v?: number | null) => {
  const n = Number(v)
  if (!Number.isFinite(n)) return "—"
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(n)
}

const formatDate = (d?: string | null) => {
  if (!d) return "—"
  const [y, m, day] = String(d).slice(0, 10).split("-").map(Number)
  if (!y || !m || !day) {
    const parsed = new Date(d)
    return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleDateString("es-ES")
  }
  return new Date(y, m - 1, day).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

export function FacturasObrasTerminadasTable({
  obras,
  loading,
  error,
  onRefresh,
  onExportarTodas,
  onExportarExcel,
  variant = "default",
  searchValue,
  onSearchChange,
  totalCount,
  footer,
  totales,
}: FacturasObrasTerminadasTableProps) {
  const isSearchControlled = searchValue !== undefined
  const [internalSearch, setInternalSearch] = useState("")
  const search = isSearchControlled ? (searchValue as string) : internalSearch
  const setSearch = (v: string) => {
    if (isSearchControlled) onSearchChange?.(v)
    else setInternalSearch(v)
  }

  const [exportingAll, setExportingAll] = useState(false)
  const [exportingExcel, setExportingExcel] = useState(false)
  const [exportingRowId, setExportingRowId] = useState<string | null>(null)
  const [detalleLoadingId, setDetalleLoadingId] = useState<string | null>(null)
  const [detalleCache, setDetalleCache] = useState<Record<string, FacturaClienteObra[]>>({})
  const [detalleObra, setDetalleObra] = useState<ObraTerminada | null>(null)
  const [detalleOpen, setDetalleOpen] = useState(false)

  const filtered = useMemo(() => {
    if (isSearchControlled) return obras
    if (!search.trim()) return obras
    const term = search.toLowerCase()
    return obras.filter((o) =>
      (o.numero_factura || "").toLowerCase().includes(term) ||
      (o.cliente_nombre || o.nombre_completo || "").toLowerCase().includes(term) ||
      (o.cliente_numero || "").toLowerCase().includes(term) ||
      (o.numero_oferta || "").toLowerCase().includes(term) ||
      (o.comercial || "").toLowerCase().includes(term),
    )
  }, [obras, search, isSearchControlled])

  const rowKey = (o: ObraTerminada) => o.oferta_id || o.numero_factura || o.numero_oferta || ""

  const getFacturaDetalle = async (obra: ObraTerminada): Promise<FacturaClienteObra[]> => {
    const key = rowKey(obra)
    if (detalleCache[key]) return detalleCache[key]
    const facturas = await ObrasTerminadasService.getFacturasCliente(obra.oferta_id || "")
    setDetalleCache((prev) => ({ ...prev, [key]: facturas }))
    return facturas
  }

  const handleVerDetalle = async (obra: ObraTerminada) => {
    const key = rowKey(obra)
    setDetalleLoadingId(key)
    try {
      await getFacturaDetalle(obra)
      setDetalleObra(obra)
      setDetalleOpen(true)
    } finally {
      setDetalleLoadingId(null)
    }
  }

  const handleExportarPdf = async (obra: ObraTerminada) => {
    const key = rowKey(obra)
    setExportingRowId(key)
    try {
      const facturas = await getFacturaDetalle(obra)
      if (facturas[0]) {
        await ExportFacturaClienteService.exportarPDF(facturas[0], obra)
      }
    } finally {
      setExportingRowId(null)
    }
  }

  const em = variant === "embedded"

  return (
    <div className={em ? "" : "space-y-4"}>
      <div className={`flex items-center gap-3 flex-wrap ${em ? "px-6 py-4" : ""}`}>
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            className="pl-9"
            placeholder="Buscar por factura, cliente, oferta, comercial..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" size="icon" onClick={onRefresh} title="Recargar">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
        {onExportarTodas && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-red-700 border-red-300 hover:bg-red-50"
            disabled={exportingAll || filtered.length === 0}
            title="Exportar todas las facturas listadas en un único PDF"
            onClick={async () => {
              if (filtered.length === 0) return
              setExportingAll(true)
              try {
                await onExportarTodas(filtered)
              } finally {
                setExportingAll(false)
              }
            }}
          >
            {exportingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            <span className="hidden sm:inline">{exportingAll ? "Generando..." : "Exportar todas (PDF)"}</span>
          </Button>
        )}
        {onExportarExcel && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-green-700 border-green-300 hover:bg-green-50"
            disabled={exportingExcel || filtered.length === 0}
            title="Exportar a Excel las facturas listadas"
            onClick={async () => {
              setExportingExcel(true)
              try {
                await onExportarExcel()
              } finally {
                setExportingExcel(false)
              }
            }}
          >
            {exportingExcel ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            <span className="hidden sm:inline">{exportingExcel ? "Generando..." : "Exportar Excel"}</span>
          </Button>
        )}
        <Badge variant="secondary" className="text-xs">
          {totalCount != null ? `${filtered.length} de ${totalCount} facturas` : `${filtered.length} facturas`}
        </Badge>
      </div>

      {totales && (
        <div className={`text-sm ${em ? "px-6 pb-2" : "pb-1"}`}>
          <div className="flex flex-wrap gap-3 items-center">
            <span className="text-gray-500">
              Facturado: <strong className="text-gray-800">{formatCurrency(totales.total_facturado)}</strong>
            </span>
            <span className="text-gray-300">|</span>
            <span className="text-gray-500">
              Cobrado: <strong className="text-green-700">{formatCurrency(totales.total_cobrado)}</strong>
            </span>
            <span className="text-gray-300">|</span>
            <span className="text-gray-500">
              Pendiente: <strong className="text-red-600">{formatCurrency(totales.total_pendiente)}</strong>
            </span>
            {totales.total_descuento > 0 && (
              <>
                <span className="text-gray-300">|</span>
                <span className="text-gray-500">
                  Descuentos: <strong className="text-emerald-600">{formatCurrency(totales.total_descuento)}</strong>
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className={`flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2 ${em ? "mx-6" : ""}`}>
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {loading && obras.length === 0 ? (
        <div className={`text-center py-12 text-gray-500 text-sm ${em ? "px-6 pb-6" : ""}`}>
          Cargando facturas...
        </div>
      ) : filtered.length === 0 ? (
        <div className={`text-center py-12 text-gray-400 text-sm ${em ? "px-6 pb-6" : ""}`}>
          {search ? "No se encontraron facturas con ese criterio" : "No hay facturas de obras terminadas"}
        </div>
      ) : (
        <div className={em ? "border-t overflow-x-auto" : "rounded-lg border overflow-x-auto"}>
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="font-semibold">Nº Factura</TableHead>
                <TableHead className="font-semibold">Cliente</TableHead>
                <TableHead className="font-semibold">Fecha facturación</TableHead>
                <TableHead className="font-semibold text-right">Total</TableHead>
                <TableHead className="font-semibold text-right">Descuento</TableHead>
                <TableHead className="font-semibold text-right">Cobrado</TableHead>
                <TableHead className="font-semibold text-right">Pendiente</TableHead>
                <TableHead className="font-semibold">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((o) => {
                const key = rowKey(o)
                const isExportingRow = exportingRowId === key
                const isLoadingDetalle = detalleLoadingId === key
                const pendiente = o.monto_pendiente ?? 0
                return (
                  <TableRow key={key} className="hover:bg-gray-50 transition-colors">
                    <TableCell className="font-medium text-blue-700 text-sm">
                      {o.numero_factura || "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div>{o.cliente_nombre || o.nombre_completo || "—"}</div>
                      {o.numero_oferta && (
                        <div className="text-xs text-gray-500">#{o.numero_oferta}</div>
                      )}
                      {o.comercial && (
                        <div className="text-xs text-gray-500 italic">Comercial: {o.comercial}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(o.fecha_facturacion)}</TableCell>
                    <TableCell className="text-sm text-right">{formatCurrency(o.precio_final)}</TableCell>
                    <TableCell className="text-sm text-right text-emerald-600">
                      {o.descuento_oferta ? formatCurrency(o.descuento_oferta) : <span className="text-gray-300">—</span>}
                    </TableCell>
                    <TableCell className="text-sm text-right text-green-700">{formatCurrency(o.total_pagado)}</TableCell>
                    <TableCell className="text-sm text-right text-red-600">
                      {pendiente > 0.01 ? formatCurrency(pendiente) : <span className="text-green-600">Pagada ✓</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                          onClick={() => void handleVerDetalle(o)}
                          disabled={isLoadingDetalle}
                          title="Ver detalles"
                        >
                          {isLoadingDetalle ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50"
                          onClick={() => void handleExportarPdf(o)}
                          disabled={isExportingRow}
                          title="Exportar PDF"
                        >
                          {isExportingRow ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
      {footer}

      <Dialog open={detalleOpen} onOpenChange={setDetalleOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Factura {detalleObra?.numero_factura || detalleObra?.numero_oferta || ""}
            </DialogTitle>
          </DialogHeader>
          {detalleObra && (
            <FacturasClientePanel
              facturas={detalleCache[rowKey(detalleObra)] || []}
              oferta={detalleObra}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
