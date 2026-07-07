"use client"

import { useCallback, useEffect, useState } from "react"
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
import { Loader2, Coins, Warehouse, Layers, Info, AlertTriangle } from "lucide-react"
import { KardexCostoService } from "@/lib/services/feats/kardex-costo/kardex-costo-service"
import { InventarioService } from "@/lib/services/feats/inventario/inventario-service"
import { FichaCostoService } from "@/lib/services/feats/fichas-costo/ficha-costo-service"

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
  const [modo, setModo] = useState<Modo>("cargando")
  const [stockTotal, setStockTotal] = useState(0)
  const [almacenesConKardex, setAlmacenesConKardex] = useState(0)
  const [pendienteAbierta, setPendienteAbierta] = useState(false)
  const [nuevoCosto, setNuevoCosto] = useState("")
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
      const lista: any[] = Array.isArray((stockRes as any)?.data) ? (stockRes as any).data : []
      const encontrado =
        lista.find((m) => mat.material_id && m.material_id === mat.material_id) ||
        lista.find((m) => String(m.codigo) === codigo) ||
        null
      const total = Number(encontrado?.total ?? 0)
      setStockTotal(total)
      setAlmacenesConKardex(almacenes)
      setPendienteAbierta(pendiente)
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
      if (modo === "kardex") {
        const r = await KardexCostoService.ajusteCosto([{ material_id: material.material_id, costo }])
        if (!r?.ajustados?.length && r?.con_pendiente?.length) {
          toast({
            title: "No se pudo ajustar",
            description:
              "Este material tiene una entrada pendiente de costeo. Costea esa compra (ponderar / sincronizar) antes de corregir el costo aquí.",
            variant: "destructive",
          })
          return
        }
        const a = r?.ajustados?.[0]
        const om = a?.almacenes_pendientes_omitidos
        msg = a
          ? `Costo corregido en el kardex (ajuste en ${a.almacenes ?? 0} almacén/es${om ? `, ${om} pendiente(s) omitido(s)` : ""}).`
          : "El costo ya estaba en ese valor."
      } else if (modo === "saldo_inicial") {
        const r = await KardexCostoService.saldoInicial([{ material_id: material.material_id, costo }])
        const n = r?.sembrados?.length ?? 0
        msg = `Costo registrado como saldo inicial (${n} apertura/s de kardex).`
      } else {
        if (!material.producto_id) throw new Error("No se pudo resolver el producto del material.")
        await FichaCostoService.editPreciosCosto(material.producto_id, material.codigo, { costo })
        msg = "Costo de referencia guardado en el catálogo."
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
        titulo: "Costo gestionado por el kardex",
        texto: `Este material ya tiene kardex (${almacenesConKardex} almacén/es). Su costo es el promedio ponderado. Al guardar se registra un ajuste de costo en todos sus almacenes y se sincroniza el catálogo.`,
      }
    if (modo === "saldo_inicial")
      return {
        icon: <Warehouse className="h-4 w-4 text-sky-600" />,
        cls: "bg-sky-50 border-sky-200 text-sky-800",
        titulo: "Se registrará como saldo inicial",
        texto: `Este material tiene ${stockTotal} en stock pero aún sin costo en el kardex. Al guardar se crea la fila de apertura del kardex (stock actual a este costo) y se sincroniza el catálogo — así las compras futuras promedian bien.`,
      }
    return {
      icon: <Info className="h-4 w-4 text-gray-500" />,
      cls: "bg-gray-50 border-gray-200 text-gray-700",
      titulo: "Costo de referencia",
      texto: "Este material no tiene stock ni kardex. El costo se guarda como referencia en el catálogo (útil para cotizar). Cuando entre stock por una compra, el costo real de esa compra tomará el mando automáticamente.",
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
            <span className="text-sm">Analizando kardex y stock…</span>
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
                  Tiene entrada pendiente de costeo
                </div>
                <p className="text-xs mt-1 leading-relaxed">
                  Uno o más almacenes tienen stock sin costear: esos NO se ajustan aquí (costea esa compra con ponderar / sincronizar). Si todos están pendientes, el ajuste se rechaza.
                </p>
              </div>
            )}

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
          </div>
        )}

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={handleGuardar}
            disabled={saving || modo === "cargando"}
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
