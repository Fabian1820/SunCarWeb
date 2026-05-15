"use client"

import { useEffect, useRef, useState, Fragment } from "react"
import {
  Package,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  ArrowUp,
  ArrowDown,
  Loader2,
  Pencil,
} from "lucide-react"
import { Button } from "@/components/shared/atom/button"
import { SmartPagination } from "@/components/shared/molecule/smart-pagination"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/shared/molecule/tooltip"
import type { MaterialStockItem } from "@/lib/inventario-types"
import type {
  MaterialesStockSort,
  MaterialesStockSortBy,
} from "@/hooks/use-materiales-stock"

interface MaterialesStockTableProps {
  data: MaterialStockItem[]
  loading: boolean
  /** Si está definido, la tabla muestra "Stock en {almacenSeleccionadoNombre}" en vez de Total y oculta el expandible. */
  almacenSeleccionadoId?: string
  almacenSeleccionadoNombre?: string
  sort: MaterialesStockSort
  onSortChange: (sort_by: MaterialesStockSortBy) => void
  /**
   * Si está definido, la columna "Stockaje mín." es editable inline.
   * Debe retornar una promesa que resuelva en éxito o lance en error.
   */
  onEditStockMinimo?: (
    material_id: string,
    nuevoValor: number | null,
  ) => Promise<void>
  pagination?: {
    page: number
    totalPages: number
    total: number
    limit: number
    onPageChange: (page: number) => void
  }
}

interface HeaderCellProps {
  label: string
  sortKey?: MaterialesStockSortBy
  currentSort: MaterialesStockSort
  onSortChange: (sort_by: MaterialesStockSortBy) => void
  className?: string
  align?: "left" | "center" | "right"
}

function HeaderCell({
  label,
  sortKey,
  currentSort,
  onSortChange,
  className = "",
  align = "left",
}: HeaderCellProps) {
  const alignClass =
    align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left"

  if (!sortKey) {
    return (
      <th className={`${alignClass} py-3 px-2 font-semibold text-gray-900 ${className}`}>
        {label}
      </th>
    )
  }

  const isActive = currentSort.sort_by === sortKey
  const Icon = !isActive
    ? ChevronsUpDown
    : currentSort.sort_dir === "asc"
      ? ArrowUp
      : ArrowDown

  return (
    <th className={`${alignClass} py-3 px-2 font-semibold text-gray-900 ${className}`}>
      <button
        type="button"
        onClick={() => onSortChange(sortKey)}
        className={`inline-flex items-center gap-1 hover:text-amber-700 transition-colors ${
          align === "center" ? "mx-auto" : ""
        } ${isActive ? "text-amber-700" : ""}`}
      >
        {label}
        <Icon className="h-3.5 w-3.5" />
      </button>
    </th>
  )
}

interface StockMinimoCellProps {
  material_id: string
  value: number | null | undefined
  onSave?: (material_id: string, nuevoValor: number | null) => Promise<void>
}

function StockMinimoCell({ material_id, value, onSave }: StockMinimoCellProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState("")
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  const formatted =
    typeof value === "number" ? String(value) : null

  const startEdit = () => {
    if (!onSave || saving) return
    setDraft(formatted ?? "")
    setErrorMsg(null)
    setEditing(true)
  }

  const cancel = () => {
    setEditing(false)
    setDraft("")
    setErrorMsg(null)
  }

  const commit = async () => {
    if (!onSave) {
      cancel()
      return
    }
    const trimmed = draft.trim()
    let nuevoValor: number | null
    if (trimmed === "") {
      nuevoValor = null
    } else {
      const parsed = Number(trimmed)
      if (!Number.isFinite(parsed) || parsed < 0 || !Number.isInteger(parsed)) {
        setErrorMsg("Número entero ≥ 0")
        return
      }
      nuevoValor = parsed
    }

    const currentValue = typeof value === "number" ? value : null
    if (nuevoValor === currentValue) {
      cancel()
      return
    }

    setSaving(true)
    setErrorMsg(null)
    try {
      await onSave(material_id, nuevoValor)
      setEditing(false)
      setDraft("")
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "No se pudo guardar",
      )
    } finally {
      setSaving(false)
    }
  }

  if (!onSave) {
    return (
      <span className="text-sm text-gray-700">
        {formatted ?? <span className="text-gray-300">—</span>}
      </span>
    )
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1">
          <input
            ref={inputRef}
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            value={draft}
            disabled={saving}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                commit()
              } else if (e.key === "Escape") {
                e.preventDefault()
                cancel()
              }
            }}
            onBlur={() => {
              if (!saving) cancel()
            }}
            placeholder="—"
            className="w-20 h-8 rounded border border-amber-300 px-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-600" />}
        </div>
        {errorMsg && (
          <span className="text-[10px] text-red-600">{errorMsg}</span>
        )}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={startEdit}
      className="group inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-amber-100 transition-colors"
      title="Click para editar"
    >
      <span
        className={`text-sm font-medium ${
          formatted == null ? "text-gray-400" : "text-gray-800"
        }`}
      >
        {formatted ?? "—"}
      </span>
      <Pencil className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  )
}

export function MaterialesStockTable({
  data,
  loading,
  almacenSeleccionadoId,
  almacenSeleccionadoNombre,
  sort,
  onSortChange,
  onEditStockMinimo,
  pagination,
}: MaterialesStockTableProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const isFiltroAlmacen = !!almacenSeleccionadoId
  const stockColLabel = isFiltroAlmacen
    ? `Stock en ${almacenSeleccionadoNombre || "almacén"}`
    : "Stock Total"

  if (!loading && data.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No se encontraron materiales
        </h3>
        <p className="text-gray-600">
          Ajusta los filtros para ver materiales con stock.
        </p>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-[1px] flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
          </div>
        )}

        <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
          <table className="w-full min-w-[820px]">
            <thead>
              <tr className="border-b border-gray-200">
                {!isFiltroAlmacen && (
                  <th className="w-[40px] py-3 px-2"></th>
                )}
                <th className="text-left py-3 px-2 font-semibold text-gray-900 w-[56px]">
                  Foto
                </th>
                <HeaderCell
                  label="Código"
                  sortKey="codigo"
                  currentSort={sort}
                  onSortChange={onSortChange}
                  className="w-[120px]"
                />
                <HeaderCell
                  label="Nombre"
                  sortKey="nombre"
                  currentSort={sort}
                  onSortChange={onSortChange}
                  className="min-w-[200px]"
                />
                <HeaderCell
                  label="Categoría"
                  sortKey="categoria"
                  currentSort={sort}
                  onSortChange={onSortChange}
                  className="w-[120px]"
                />
                <th className="text-left py-3 px-2 font-semibold text-gray-900 w-[110px]">
                  Marca
                </th>
                <th className="text-left py-3 px-2 font-semibold text-gray-900 w-[90px]">
                  Potencia
                </th>
                <th className="text-left py-3 px-2 font-semibold text-gray-900 w-[60px]">
                  UM
                </th>
                <th className="text-center py-3 px-2 font-semibold text-gray-900 w-[110px]">
                  Stockaje mín.
                </th>
                <HeaderCell
                  label={stockColLabel}
                  sortKey="total"
                  currentSort={sort}
                  onSortChange={onSortChange}
                  className="w-[140px] bg-amber-50"
                  align="center"
                />
              </tr>
            </thead>
            <tbody>
              {data.map((row) => {
                const rowKey = row.material_id || row.codigo
                const isExpanded = expanded.has(rowKey)
                const nombre = row.nombre || row.descripcion || "Sin nombre"
                const colSpan = isFiltroAlmacen ? 8 : 9

                return (
                  <Fragment key={rowKey}>
                    <tr className="border-b border-gray-100 hover:bg-gray-50">
                      {/* Expandir */}
                      {!isFiltroAlmacen && (
                        <td className="py-3 px-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => toggleExpand(rowKey)}
                            aria-label={isExpanded ? "Colapsar" : "Expandir"}
                            disabled={row.por_almacen.length === 0}
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </td>
                      )}

                      {/* Foto */}
                      <td className="py-3 px-2">
                        {row.foto ? (
                          <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-50 border border-gray-200">
                            <img
                              src={row.foto}
                              alt={nombre}
                              className="w-full h-full object-contain p-1"
                            />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center border border-amber-200">
                            <Package className="h-5 w-5 text-amber-700" />
                          </div>
                        )}
                      </td>

                      {/* Código */}
                      <td className="py-3 px-2">
                        <div className="text-sm font-semibold text-gray-900">
                          {row.codigo}
                        </div>
                      </td>

                      {/* Nombre */}
                      <td className="py-3 px-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="text-sm font-medium text-gray-900 truncate cursor-help max-w-[280px]">
                              {nombre}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">{nombre}</p>
                          </TooltipContent>
                        </Tooltip>
                      </td>

                      {/* Categoría */}
                      <td className="py-3 px-2">
                        <span className="text-sm text-gray-700">
                          {row.categoria || "—"}
                        </span>
                      </td>

                      {/* Marca */}
                      <td className="py-3 px-2">
                        <span className="text-sm text-gray-700">
                          {row.marca_nombre || "—"}
                        </span>
                      </td>

                      {/* Potencia */}
                      <td className="py-3 px-2">
                        <span className="text-sm text-gray-700">
                          {row.potencia_kw !== undefined && row.potencia_kw !== null
                            ? `${row.potencia_kw} KW`
                            : "—"}
                        </span>
                      </td>

                      {/* UM */}
                      <td className="py-3 px-2">
                        <span className="text-sm text-gray-700">
                          {row.um || "—"}
                        </span>
                      </td>

                      {/* Stockaje mínimo (editable) */}
                      <td className="py-3 px-2 text-center">
                        <StockMinimoCell
                          material_id={row.material_id}
                          value={row.stockaje_minimo}
                          onSave={onEditStockMinimo}
                        />
                      </td>

                      {/* Total / Stock en almacen */}
                      <td className="py-3 px-2 text-center bg-amber-50">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold border ${
                            row.total > 0
                              ? "bg-amber-100 text-amber-800 border-amber-200"
                              : "bg-gray-100 text-gray-500 border-gray-200"
                          }`}
                        >
                          {row.total}
                        </span>
                      </td>
                    </tr>

                    {/* Detalle por almacén */}
                    {!isFiltroAlmacen && isExpanded && (
                      <tr className="bg-amber-50/30 border-b border-gray-100">
                        <td colSpan={colSpan} className="py-3 px-4">
                          {row.por_almacen.length === 0 ? (
                            <div className="text-sm text-gray-500 italic">
                              Sin existencias en ningún almacén.
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {row.por_almacen.map((pa) => {
                                const reservada = pa.cantidad_reservada ?? 0
                                return (
                                  <div
                                    key={pa.almacen_id}
                                    className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm ${
                                      pa.cantidad > 0
                                        ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                                        : "bg-gray-50 border-gray-200 text-gray-500"
                                    }`}
                                  >
                                    <span className="font-medium">
                                      {pa.almacen_nombre}:
                                    </span>
                                    <span className="font-semibold">
                                      {pa.cantidad}
                                    </span>
                                    {reservada > 0 && (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span className="text-[11px] bg-white/70 rounded px-1.5 py-0.5 text-amber-700 border border-amber-200 cursor-help">
                                            {reservada} res.
                                          </span>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Cantidad reservada</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>

        {pagination && pagination.totalPages > 1 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4 pt-4 border-t border-gray-100">
            <div className="text-sm text-gray-600">
              Mostrando{" "}
              <span className="font-medium">
                {(pagination.page - 1) * pagination.limit + 1}–
                {Math.min(pagination.page * pagination.limit, pagination.total)}
              </span>{" "}
              de <span className="font-medium">{pagination.total}</span> materiales
            </div>
            <SmartPagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={pagination.onPageChange}
            />
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}
