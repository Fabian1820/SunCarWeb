"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/shared/molecule/dialog"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Coins, Warehouse, Layers, Info, AlertTriangle, ExternalLink } from "lucide-react"
import { KardexCostoService } from "@/lib/services/feats/kardex-costo/kardex-costo-service"
import { InventarioService } from "@/lib/services/feats/inventario/inventario-service"

export interface CostoMaterialRef {
  material_id: string
  producto_id?: string
  codigo: string | number
  nombre?: string
  costo?: number
}

// Modo derivado del estado real del material:
//  - kardex:        ya tiene kardex -> corregir con ajuste de costo
//  - saldo_inicial: tiene stock sin kardex -> registrar apertura del kardex
//  - referencia:    sin stock ni kardex -> costo de referencia en el catálogo
type Modo = "cargando" | "kardex" | "saldo_inicial" | "referencia"

const fmt = (n?: number | null) =>
  typeof n === "number" && Number.isFinite(n) ? `$${n.toFixed(2)}` : "—"

export function EstablecerCostoDialog({
  open,
  onOpenChange,
  material,
  onSaved,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  material: CostoMaterialRef | null
  onSaved: () => void
}) {
  const { toast } = useToast()
  const router = useRouter()
  const [modo, setModo] = useState<Modo>("cargando")
  const [stockTotal, setStockTotal] = useState(0)
  const [almacenesConKardex, setAlmacenesConKardex] = useState(0)
  const [pendienteAbierta, setPendienteAbierta] = useState(false)
  const [comprasPendientes, setComprasPendientes] = useState<string[]>([])
  const [nuevoCosto, setNuevoCosto] = useState("")
  const [motivo, setMotivo] = useState("")
  const [saving, setSaving] = useState(false)

  const analizar = useCallback(async (mat: CostoMaterialRef) => {
    setModo("cargando")
    try {
      const codigo = mat.codigo != null ? String(mat.codigo) : ""
      const [historial, stockRes] = await Promise.all([
        KardexCostoService.getHistorial({ material_id: mat.material_id, limit: 200 }),
        InventarioService.getMaterialesStock({ q: codigo, limit: 25 }).catch(
          () => ({ data: [] }) as any,
        ),
      ])
      const tieneKardex = historial.length > 0
      const almacenes = new Set(historial.map((k) => k.almacen_id)).size
      const pendiente = historial.some((k) => k.pendiente_costeo && !k.regularizada_por)
      const compras = Array.from(
        new Set(
          historial
            .filter((k) => k.pendiente_costeo && !k.regularizada_por && k.compra_id)
            .map((k) => k.compra_id as string),
        ),
      )
      const lista: any[] = Array.isArray((stockRes as any)?.data) ? (stockRes as any).data : []
      const encontrado =
        lista.find((m) => mat.material_id && m.material_id === mat.material_id) ||
        lista.find((m) => String(m.codigo) === codigo) ||
        null
      const total = Number(encontrado?.total ?? 0)
      setStockTotal(total)
      setAlmacenesConKardex(almacenes)
      setPendienteAbierta(pendiente)
      setComprasPendientes(compras)
      setModo(tieneKardex ? "kardex" : total > 0 ? "saldo_inicial" : "referencia")
      setNuevoCosto(typeof mat.costo === "number" && mat.costo > 0 ? String(mat.costo) : "")
    } catch {
      setModo("referencia")
    }
  }, [])

  useEffect(() => {
    if (open && material) void analizar(material)
    else if (!open) {
      setModo("cargando")
      setNuevoCosto("")
      setStockTotal(0)
      setAlmacenesConKardex(0)
      setPendienteAbierta(false)
      setComprasPendientes([])
      setMotivo("")
    }
  }, [open, material, analizar])

  const handleGuardar = async () => {
    if (!material) return
    const costo = Number(nuevoCosto)
    if (!Number.isFinite(costo) || costo <= 0) {
      toast({ title: "Costo inválido", description: "Ingresa un costo mayor que 0.", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      let msg = ""
      const causa = motivo.trim() || undefined
      if (modo === "kardex") {
        const r = await KardexCostoService.ajusteCosto([{ material_id: material.material_id, costo, motivo: causa }])
        if (!r?.ajustados?.length && r?.con_pendiente?.length) {
          toast({
            title: "No se pudo corregir",
            description:
              "Este material tiene una compra sin costo asignado. Asigna primero el costo de esa compra y vuelve a intentarlo.",
            variant: "destructive",
          })
          return
        }
        const a = r?.ajustados?.[0]
        msg = a
          ? `Costo corregido en ${a.almacenes ?? 0} almacén/es.`
          : "El costo ya estaba en ese valor."
      } else if (modo === "saldo_inicial") {
        const r = await KardexCostoService.saldoInicial([{ material_id: material.material_id, costo, motivo: causa }])
        const n = r?.sembrados?.length ?? 0
        msg = `Costo inicial registrado en ${n} almacén/es.`
      } else {
        // referencia: el costo no se define a mano (entra por compras). No debería
        // llegar aquí porque el botón se oculta para materiales sin existencias.
        return
      }
      toast({ title: "Costo actualizado", description: msg })
      onSaved()
      onOpenChange(false)
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "No se pudo guardar el costo.", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  if (!material) return null

  const banner = (() => {
    if (modo === "kardex")
      return {
        icon: <Layers className="h-4 w-4 text-amber-600" />,
        cls: "bg-amber-50 border-amber-200 text-amber-800",
        titulo: "El costo lo calcula el sistema",
        texto: `Este material ya tiene costo registrado en ${almacenesConKardex} almacén/es: es el promedio de sus compras. Al guardar se registra una corrección de costo en todos sus almacenes y queda en el historial de costos.`,
      }
    if (modo === "saldo_inicial")
      return {
        icon: <Warehouse className="h-4 w-4 text-sky-600" />,
        cls: "bg-sky-50 border-sky-200 text-sky-800",
        titulo: "Se registrará como costo inicial",
        texto: `Este material tiene ${stockTotal} en existencia pero todavía sin costo registrado. Al guardar, esa existencia queda valorada a este costo — así las compras futuras promedian bien.`,
      }
    return {
      icon: <Info className="h-4 w-4 text-gray-500" />,
      cls: "bg-gray-50 border-gray-200 text-gray-700",
      titulo: "El costo entra por compras",
      texto: "Este material no tiene existencias ni costo registrado. Su costo se registra a través de una compra (al aprobar la entrada con su costo), no a mano aquí.",
    }
  })()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-amber-600" />
            <div>
              <span className="block">Establecer costo</span>
              <span className="text-xs font-normal text-gray-500 block mt-0.5">
                {material.nombre || `Material ${material.codigo}`}
              </span>
            </div>
          </DialogTitle>
        </DialogHeader>

        {modo === "cargando" ? (
          <div className="flex items-center justify-center py-10 gap-3 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin text-amber-600" />
            <span className="text-sm">Analizando costos y existencias…</span>
          </div>
        ) : (
          <div className="space-y-4">
            <div className={`rounded-lg border p-3 ${banner.cls}`}>
              <div className="flex items-center gap-2 text-sm font-semibold">
                {banner.icon}
                {banner.titulo}
              </div>
              <p className="text-xs mt-1 leading-relaxed">{banner.texto}</p>
            </div>

            {modo === "kardex" && pendienteAbierta && (
              <div className="rounded-lg border p-3 bg-red-50 border-red-200 text-red-700">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <AlertTriangle className="h-4 w-4" />
                  Hay una compra sin costo asignado
                </div>
                <p className="text-xs mt-1 leading-relaxed">
                  Este material tiene existencias que aún no tienen costo, así que la corrección no se puede aplicar. Asigna el costo de esa compra y vuelve.
                </p>
                {comprasPendientes.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {comprasPendientes.map((cid) => (
                      <Button
                        key={cid}
                        size="sm"
                        variant="outline"
                        className="border-red-300 text-red-700 hover:bg-red-100"
                        onClick={() => router.push(`/compras/${cid}/ficha-costo`)}
                      >
                        <ExternalLink className="h-3.5 w-3.5 mr-1" />
                        Ir a costear la compra
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {modo !== "referencia" && !(modo === "kardex" && pendienteAbierta) && (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Costo actual</span>
                  <span className="font-semibold text-gray-900">{fmt(material.costo)}</span>
                </div>

                <div>
                  <Label htmlFor="nuevo-costo" className="text-sm font-medium text-gray-700 mb-1.5 block">
                    Nuevo costo
                  </Label>
                  <Input
                    id="nuevo-costo"
                    type="number"
                    step="0.01"
                    min="0"
                    value={nuevoCosto}
                    onChange={(e) => setNuevoCosto(e.target.value)}
                    placeholder="0.00"
                    disabled={saving}
                    autoFocus
                  />
                </div>

                <div>
                  <Label htmlFor="motivo-costo" className="text-sm font-medium text-gray-700 mb-1.5 block">
                    Motivo / causa <span className="text-gray-400 font-normal">(opcional)</span>
                  </Label>
                  <Input
                    id="motivo-costo"
                    type="text"
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    placeholder={modo === "kardex" ? "Ej: corrección de error de digitación" : "Ej: carga de costo inicial"}
                    disabled={saving}
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    Queda registrado en el historial de costos con tu usuario y la fecha.
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={handleGuardar}
            disabled={saving || modo === "cargando" || modo === "referencia" || (modo === "kardex" && pendienteAbierta)}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            Guardar costo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
