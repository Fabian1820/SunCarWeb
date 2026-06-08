"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/shared/molecule/tabs"
import { Badge } from "@/components/shared/atom/badge"
import { Button } from "@/components/shared/atom/button"
import {
  DollarSign,
  Percent,
  Tag,
  TrendingUp,
  Calculator,
  Loader2,
  Package,
  CalendarDays,
  Warehouse,
  ShoppingCart,
  ExternalLink,
} from "lucide-react"
import { KardexCostoService } from "@/lib/services/feats/kardex-costo/kardex-costo-service"
import { InventarioService } from "@/lib/services/feats/inventario/inventario-service"
import type { KardexCosto } from "@/lib/types/feats/kardex-costo/kardex-costo-types"

export interface DetalleMaterial {
  material_id?: string
  codigo?: string | number
  nombre?: string
  descripcion?: string
  marca?: string
  um?: string
  costo?: number
  precio?: number
  precio_instaladora?: number
  porciento_rebajable_venta?: number
}

interface MaterialContableDetalleProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  material: DetalleMaterial | null
}

const fmtMoney = (n?: number | null): string =>
  typeof n === "number" && Number.isFinite(n) ? `$${n.toFixed(2)}` : "N/A"

const fmtDate = (value?: string): string => {
  if (!value) return "-"
  const d = new Date(value)
  if (isNaN(d.getTime())) return value
  return d.toLocaleDateString("es-CU", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export function MaterialContableDetalle({ open, onOpenChange, material }: MaterialContableDetalleProps) {
  const router = useRouter()
  const [kardex, setKardex] = useState<KardexCosto[]>([])
  const [loadingKardex, setLoadingKardex] = useState(false)
  const [almacenes, setAlmacenes] = useState<Record<string, string>>({})

  const cargarKardex = useCallback(async (materialId: string) => {
    setLoadingKardex(true)
    try {
      const [historial, listaAlmacenes] = await Promise.all([
        KardexCostoService.getHistorial({ material_id: materialId, limit: 200 }),
        InventarioService.getAlmacenes().catch(() => []),
      ])
      const mapa: Record<string, string> = {}
      for (const a of listaAlmacenes) {
        if (a.id) mapa[a.id] = a.nombre
      }
      setAlmacenes(mapa)
      setKardex(historial)
    } catch {
      setKardex([])
    } finally {
      setLoadingKardex(false)
    }
  }, [])

  useEffect(() => {
    if (open && material?.material_id) {
      void cargarKardex(material.material_id)
    } else if (!open) {
      setKardex([])
    }
  }, [open, material?.material_id, cargarKardex])

  // Compras que afectaron el costo de este material (derivadas del kardex).
  const compras = useMemo(
    () => kardex.filter((k) => typeof k.compra_id === "string" && k.compra_id),
    [kardex],
  )

  // Margen sobre el precio instaladora (el más alto); cae al precio de venta
  // si no hay instaladora.
  const margen = useMemo(() => {
    const costo = material?.costo
    const base =
      typeof material?.precio_instaladora === "number"
        ? material.precio_instaladora
        : material?.precio
    if (typeof costo !== "number" || typeof base !== "number" || costo <= 0) return null
    return {
      ganancia: base - costo,
      porcentaje: ((base - costo) / costo) * 100,
    }
  }, [material?.costo, material?.precio, material?.precio_instaladora])

  const nombreAlmacen = (id: string) => almacenes[id] || `${id.slice(0, 6)}…`

  if (!material) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-amber-600" />
            <div>
              <span className="block">
                {material.nombre || material.descripcion || `Material ${material.codigo}`}
              </span>
              <span className="text-xs font-normal text-gray-500 block mt-0.5">
                {[material.codigo != null && `Código: ${material.codigo}`, material.marca, material.um]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="precios" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="precios">Precios y margen</TabsTrigger>
            <TabsTrigger value="kardex">Kardex</TabsTrigger>
            <TabsTrigger value="compras">Compras</TabsTrigger>
          </TabsList>

          {/* ---------- PRECIOS Y MARGEN ---------- */}
          <TabsContent value="precios" className="mt-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <DataCard icon={<DollarSign className="h-4 w-4 text-gray-500" />} label="Costo" value={fmtMoney(material.costo)} />
              <DataCard icon={<DollarSign className="h-4 w-4 text-emerald-600" />} label="Precio venta" value={fmtMoney(material.precio)} accent="emerald" />
              <DataCard icon={<DollarSign className="h-4 w-4 text-indigo-600" />} label="Precio instaladora" value={fmtMoney(material.precio_instaladora)} accent="indigo" />
              <DataCard
                icon={<Tag className="h-4 w-4 text-gray-500" />}
                label="Rebajable"
                value={material.porciento_rebajable_venta != null ? `${material.porciento_rebajable_venta}%` : "N/A"}
              />
              <DataCard
                icon={<TrendingUp className="h-4 w-4 text-amber-600" />}
                label="Ganancia (instaladora)"
                value={margen ? fmtMoney(margen.ganancia) : "N/A"}
                accent="amber"
              />
              <DataCard
                icon={<Percent className="h-4 w-4 text-amber-600" />}
                label="Margen s/ costo (instaladora)"
                value={margen ? `${margen.porcentaje.toFixed(1)}%` : "N/A"}
                accent="amber"
              />
            </div>
            <p className="text-xs text-gray-400 mt-3">
              El margen se calcula sobre el costo, usando el precio instaladora (el más alto). Para modificar costo y precios usa el botón de edición en la tabla.
            </p>
          </TabsContent>

          {/* ---------- KARDEX ---------- */}
          <TabsContent value="kardex" className="mt-4">
            {loadingKardex ? (
              <div className="flex items-center justify-center py-12 gap-3 text-gray-500">
                <Loader2 className="h-5 w-5 animate-spin text-amber-600" />
                <span className="text-sm">Cargando kardex...</span>
              </div>
            ) : kardex.length === 0 ? (
              <EmptyState icon={<Warehouse className="h-8 w-8 text-gray-300" />} text="Sin movimientos de kardex para este material." />
            ) : (
              <div className="overflow-x-auto max-h-[50vh]">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-gray-50/90">
                    <tr className="border-b border-gray-100 text-gray-600">
                      <th className="text-left py-2 px-2 font-semibold">Fecha</th>
                      <th className="text-left py-2 px-2 font-semibold">Almacén</th>
                      <th className="text-right py-2 px-2 font-semibold">Cant. entrada</th>
                      <th className="text-right py-2 px-2 font-semibold">Costo entrada</th>
                      <th className="text-right py-2 px-2 font-semibold">Cant. nueva</th>
                      <th className="text-right py-2 px-2 font-semibold">Costo ponderado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kardex.map((k) => (
                      <tr key={k.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-1.5 px-2 whitespace-nowrap">{fmtDate(k.fecha)}</td>
                        <td className="py-1.5 px-2">{nombreAlmacen(k.almacen_id)}</td>
                        <td className="py-1.5 px-2 text-right">{k.cantidad_entrada}</td>
                        <td className="py-1.5 px-2 text-right">{fmtMoney(k.costo_entrada)}</td>
                        <td className="py-1.5 px-2 text-right">{k.cantidad_nueva}</td>
                        <td className="py-1.5 px-2 text-right font-semibold text-amber-700">{fmtMoney(k.costo_nuevo)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* ---------- COMPRAS ---------- */}
          <TabsContent value="compras" className="mt-4">
            {loadingKardex ? (
              <div className="flex items-center justify-center py-12 gap-3 text-gray-500">
                <Loader2 className="h-5 w-5 animate-spin text-amber-600" />
                <span className="text-sm">Cargando compras...</span>
              </div>
            ) : compras.length === 0 ? (
              <EmptyState
                icon={<ShoppingCart className="h-8 w-8 text-gray-300" />}
                text="No hay compras registradas que hayan afectado el costo de este material."
              />
            ) : (
              <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                {compras.map((k) => (
                  <div
                    key={k.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-gray-100 p-3 hover:bg-gray-50"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                        <CalendarDays className="h-3.5 w-3.5 text-gray-400" />
                        {fmtDate(k.fecha)}
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">
                          {nombreAlmacen(k.almacen_id)}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Entrada {k.cantidad_entrada} u. · costo {fmtMoney(k.costo_entrada)} → ponderado {fmtMoney(k.costo_nuevo)}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/compras/${k.compra_id}`)}
                      title="Ver compra"
                    >
                      <ExternalLink className="h-3.5 w-3.5 mr-1" />
                      Ver compra
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

function DataCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode
  label: string
  value: string
  accent?: "emerald" | "indigo" | "amber"
}) {
  const accentClass =
    accent === "emerald"
      ? "text-emerald-700"
      : accent === "indigo"
        ? "text-indigo-700"
        : accent === "amber"
          ? "text-amber-700"
          : "text-gray-900"
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-3">
      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        {icon}
        {label}
      </div>
      <p className={`mt-1 text-lg font-semibold ${accentClass}`}>{value}</p>
    </div>
  )
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="text-center py-12">
      <div className="mx-auto mb-3 flex justify-center">{icon}</div>
      <p className="text-sm text-gray-500">{text}</p>
    </div>
  )
}
