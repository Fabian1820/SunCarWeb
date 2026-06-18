"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog"
import { Badge } from "@/components/shared/atom/badge"
import { Loader2, Warehouse, Package, Boxes } from "lucide-react"
import { InventarioService } from "@/lib/services/feats/inventario/inventario-service"
import type {
  MaterialStockItem,
  StockPools,
} from "@/lib/types/feats/inventario/inventario-types"
import { PoolsDistributionDialog } from "@/components/feats/inventario/pools-distribution-dialog"

export interface StockMaterialRef {
  material_id?: string
  codigo?: string | number
  nombre?: string
  descripcion?: string
  um?: string
}

interface MaterialStockDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  material: StockMaterialRef | null
}

export function MaterialStockDialog({ open, onOpenChange, material }: MaterialStockDialogProps) {
  const [item, setItem] = useState<MaterialStockItem | null>(null)
  const [loading, setLoading] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [poolsDialog, setPoolsDialog] = useState<{
    open: boolean
    titulo: string
    contexto?: string
    pools?: StockPools
    cantidadTotal?: number
    almacen_id?: string
  }>({ open: false, titulo: "" })

  const cargar = useCallback(async (ref: StockMaterialRef) => {
    setLoading(true)
    setNotFound(false)
    setItem(null)
    try {
      const codigo = ref.codigo != null ? String(ref.codigo) : ""
      const res = await InventarioService.getMaterialesStock({ q: codigo, limit: 25 })
      const lista: MaterialStockItem[] = Array.isArray((res as any)?.data)
        ? (res as any).data
        : Array.isArray(res)
          ? (res as any)
          : []
      const encontrado =
        lista.find((m) => ref.material_id && m.material_id === ref.material_id) ||
        lista.find((m) => String(m.codigo) === codigo) ||
        null
      setItem(encontrado)
      setNotFound(!encontrado)
    } catch {
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open && material) void cargar(material)
    else if (!open) {
      setItem(null)
      setNotFound(false)
    }
  }, [open, material, cargar])

  if (!material) return null

  const total = item?.total ?? 0
  const porAlmacen = item?.por_almacen ?? []
  const conExistencia = porAlmacen.filter((p) => p.cantidad > 0)

  const handleAbrirPools = (pa: (typeof porAlmacen)[number]) => {
    setPoolsDialog({
      open: true,
      titulo: material.nombre || material.descripcion || `Material ${material.codigo ?? ""}`,
      contexto: pa.almacen_nombre || pa.almacen_id,
      pools: pa.pools,
      cantidadTotal: pa.cantidad,
      almacen_id: pa.almacen_id,
    })
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Boxes className="h-5 w-5 text-sky-600" />
              <div>
                <span className="block">
                  {material.nombre || material.descripcion || `Material ${material.codigo}`}
                </span>
                <span className="text-xs font-normal text-gray-500 block mt-0.5">
                  {material.codigo != null ? `Código: ${material.codigo}` : ""}
                </span>
              </div>
            </DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-12 gap-3 text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin text-sky-600" />
              <span className="text-sm">Cargando stock...</span>
            </div>
          ) : notFound ? (
            <div className="text-center py-12">
              <Package className="h-8 w-8 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Este material no tiene registro de stock en inventario.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Total */}
              <div className="rounded-lg border border-sky-100 bg-sky-50/60 p-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-sky-800">
                  <Warehouse className="h-4 w-4" />
                  Stock total en todos los almacenes
                </div>
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-base font-bold border ${
                    total > 0
                      ? "bg-sky-100 text-sky-800 border-sky-200"
                      : "bg-gray-100 text-gray-500 border-gray-200"
                  }`}
                >
                  {total}
                </span>
              </div>

              {/* Desglose por almacén */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Desglose por almacén
                </p>
                {conExistencia.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">Sin existencias en ningún almacén.</p>
                ) : (
                  <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                    {conExistencia.map((pa) => (
                      <button
                        key={pa.almacen_id}
                        type="button"
                        onClick={() => handleAbrirPools(pa)}
                        title="Ver distribución por sector y transferir"
                        className="w-full flex items-center justify-between gap-3 rounded-md border border-gray-100 p-3 hover:bg-sky-50 hover:border-sky-200 cursor-pointer transition-colors text-left"
                      >
                        <div className="flex items-center gap-2 text-sm text-gray-800">
                          <Warehouse className="h-3.5 w-3.5 text-gray-400" />
                          {pa.almacen_nombre || pa.almacen_id}
                          {pa.cantidad_reservada != null && pa.cantidad_reservada > 0 && (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">
                              {pa.cantidad_reservada} reservada
                            </Badge>
                          )}
                        </div>
                        <span className="inline-flex rounded-full px-2.5 py-0.5 text-sm font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          {pa.cantidad}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <PoolsDistributionDialog
        open={poolsDialog.open}
        onOpenChange={(o) => setPoolsDialog((p) => ({ ...p, open: o }))}
        titulo={poolsDialog.titulo}
        contexto={poolsDialog.contexto}
        pools={poolsDialog.pools}
        cantidadTotal={poolsDialog.cantidadTotal}
        um={material.um}
        mostrarReserva
        material_id={material.material_id}
        almacen_id={poolsDialog.almacen_id}
        onTraspasoCompleto={
          material.material_id
            ? async () => {
                // Refrescar stock del material tras el traspaso.
                await cargar(material)
                setPoolsDialog((p) => ({ ...p, open: false }))
              }
            : undefined
        }
      />
    </>
  )
}
