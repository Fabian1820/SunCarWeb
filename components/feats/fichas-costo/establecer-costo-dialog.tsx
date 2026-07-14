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
import { Loader2, Coins, Warehouse, Layers, Info, AlertTriangle, ExternalLink, Pencil } from "lucide-react"
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
//  - kardex:        ya tiene costo registrado -> corregir (por almacén o general)
//  - saldo_inicial: tiene existencia sin costo -> registrar costo inicial
//  - referencia:    sin existencia ni costo -> el costo entra por compras
type Modo = "cargando" | "kardex" | "saldo_inicial" | "referencia"

interface AlmacenCosto {
  almacen_id: string
  nombre: string
  costo: number
  stock: number
  pendiente: boolean
  compra_id?: string
}

// objetivo del ajuste (solo modo kardex): null = pantalla de selección,
// "general" = igualar todos, o un almacen_id = corregir ese almacén.
type Objetivo = null | "general" | string

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
  const [pendienteAbierta, setPendienteAbierta] = useState(false)
  const [comprasPendientes, setComprasPendientes] = useState<string[]>([])
  const [desglose, setDesglose] = useState<AlmacenCosto[]>([])
  const [objetivo, setObjetivo] = useState<Objetivo>(null)
  const [nuevoCosto, setNuevoCosto] = useState("")
  const [motivo, setMotivo] = useState("")
  const [saving, setSaving] = useState(false)

  const analizar = useCallback(async (mat: CostoMaterialRef) => {
    setModo("cargando")
    try {
      const codigo = mat.codigo != null ? String(mat.codigo) : ""
      const [historial, stockRes, almacenesRes] = await Promise.all([
        KardexCostoService.getHistorial({ material_id: mat.material_id, limit: 200 }),
        InventarioService.getMaterialesStock({ q: codigo, limit: 25 }).catch(() => ({ data: [] }) as any),
        InventarioService.getAlmacenes().catch(() => [] as any[]),
      ])
      const tieneKardex = historial.length > 0
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

      // Costo + pendiente + compra por almacén = primera fila (más reciente) por almacén.
      const porAlm: Record<string, { costo: number; pendiente: boolean; compra_id?: string }> = {}
      for (const k of historial) {
        const aid = String(k.almacen_id)
        if (aid in porAlm) continue
        porAlm[aid] = {
          costo: Number(k.costo_nuevo ?? 0),
          pendiente: !!(k.pendiente_costeo && !k.regularizada_por),
          compra_id: typeof k.compra_id === "string" ? k.compra_id : undefined,
        }
      }
      const nombreAlm: Record<string, string> = {}
      for (const a of (almacenesRes as any[])) if (a?.id) nombreAlm[String(a.id)] = a.nombre
      const stockAlm: Record<string, number> = {}
      for (const pa of (encontrado?.por_almacen ?? []) as any[]) {
        const aid = String(pa.almacen_id)
        stockAlm[aid] = Number(pa.cantidad ?? 0)
        if (pa.almacen_nombre && !nombreAlm[aid]) nombreAlm[aid] = pa.almacen_nombre
      }
      const desg: AlmacenCosto[] = Object.keys(porAlm).map((aid) => ({
        almacen_id: aid,
        nombre: nombreAlm[aid] || `${aid.slice(0, 6)}…`,
        costo: porAlm[aid].costo,
        stock: stockAlm[aid] ?? 0,
        pendiente: porAlm[aid].pendiente,
        compra_id: porAlm[aid].compra_id,
      }))

      setStockTotal(total)
      setPendienteAbierta(pendiente)
      setComprasPendientes(compras)
      setDesglose(desg)
      setObjetivo(null)
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
      setPendienteAbierta(false)
      setComprasPendientes([])
      setDesglose([])
      setObjetivo(null)
      setMotivo("")
    }
  }, [open, material, analizar])

  const elegirGeneral = () => {
    setObjetivo("general")
    setNuevoCosto(typeof material?.costo === "number" && material.costo > 0 ? String(material.costo) : "")
    setMotivo("")
  }
  const elegirAlmacen = (d: AlmacenCosto) => {
    setObjetivo(d.almacen_id)
    setNuevoCosto(d.costo > 0 ? String(d.costo) : "")
    setMotivo("")
  }

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
        const esGeneral = objetivo === "general"
        const item: any = { material_id: material.material_id, costo, motivo: causa }
        if (objetivo && !esGeneral) item.almacen_id = objetivo
        const r = await KardexCostoService.ajusteCosto([item])
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
        if (!a) msg = "El costo ya estaba en ese valor."
        else if (esGeneral) msg = `Costo igualado en ${a.almacenes ?? 0} almacén/es.`
        else {
          const nom = desglose.find((d) => d.almacen_id === objetivo)?.nombre ?? "el almacén"
          msg = `Costo corregido en ${nom}.`
        }
      } else if (modo === "saldo_inicial") {
        const r = await KardexCostoService.saldoInicial([{ material_id: material.material_id, costo, motivo: causa }])
        msg = `Costo inicial registrado en ${r?.sembrados?.length ?? 0} almacén/es.`
      } else {
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
        texto: "El costo se lleva por almacén (cada uno tiene el suyo, según sus compras). El costo que ves en la ficha es el promedio de todos.",
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

  const editando = (modo === "kardex" && objetivo !== null) || modo === "saldo_inicial"

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

            {/* ---------- MODO KARDEX: selección de alcance ---------- */}
            {modo === "kardex" && objetivo === null && (
              <div className="space-y-3">
                {pendienteAbierta && (
                  <div className="rounded-lg border p-3 bg-red-50 border-red-200 text-red-700">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <AlertTriangle className="h-4 w-4" />
                      Hay una compra sin costo asignado
                    </div>
                    <p className="text-xs mt-1 leading-relaxed">
                      Uno o más almacenes tienen existencia sin costo. Esos no se pueden corregir hasta asignar el costo de su compra.
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

                <div>
                  <p className="text-xs text-gray-500 mb-1.5">
                    Costo por almacén — la ficha muestra el promedio:{" "}
                    <span className="font-semibold text-gray-700">{fmt(material.costo)}</span>
                  </p>
                  <div className="rounded-lg border border-gray-100 divide-y divide-gray-100">
                    {desglose.map((d) => (
                      <div key={d.almacen_id} className="flex items-center justify-between gap-2 px-3 py-2">
                        <div className="min-w-0">
                          <p className="text-sm text-gray-900 truncate">{d.nombre}</p>
                          <p className="text-[11px] text-gray-400">{d.stock} u. en existencia</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {d.pendiente ? (
                            <span className="text-[11px] text-red-500">sin costo aún</span>
                          ) : (
                            <>
                              <span className="text-sm font-semibold text-gray-900">{fmt(d.costo)}</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                onClick={() => elegirAlmacen(d)}
                                title={`Corregir el costo de ${d.nombre}`}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  disabled={pendienteAbierta}
                  onClick={elegirGeneral}
                >
                  <Layers className="h-3.5 w-3.5 mr-1.5" />
                  Ajuste general (igualar todos los almacenes)
                </Button>
                {pendienteAbierta && (
                  <p className="text-[11px] text-gray-400 -mt-1">
                    El ajuste general se habilita cuando no haya compras sin costo.
                  </p>
                )}
              </div>
            )}

            {/* ---------- MODO KARDEX: edición (general o un almacén) ---------- */}
            {modo === "kardex" && objetivo !== null && (
              <div
                className={`rounded-lg border p-3 ${
                  objetivo === "general"
                    ? "bg-amber-50 border-amber-200 text-amber-800"
                    : "bg-blue-50 border-blue-200 text-blue-800"
                }`}
              >
                <p className="text-sm font-semibold">
                  {objetivo === "general"
                    ? "Ajuste general — todos los almacenes"
                    : `Corregir costo — ${desglose.find((d) => d.almacen_id === objetivo)?.nombre ?? "almacén"}`}
                </p>
                <p className="text-xs mt-1 leading-relaxed">
                  {objetivo === "general"
                    ? `Pone el mismo costo en los ${desglose.length} almacenes (los iguala). Si tenían costos distintos, se pierden esas diferencias.`
                    : "Corrige el costo solo de este almacén. Los demás no se tocan; el promedio de la ficha se recalcula solo."}
                </p>
              </div>
            )}

            {/* ---------- Inputs (edición kardex o costo inicial) ---------- */}
            {editando && (
              <>
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
          {editando ? (
            <>
              <Button
                variant="outline"
                onClick={() => (modo === "kardex" ? setObjetivo(null) : onOpenChange(false))}
                disabled={saving}
              >
                {modo === "kardex" ? "Volver" : "Cancelar"}
              </Button>
              <Button
                onClick={handleGuardar}
                disabled={saving}
                className="bg-amber-600 hover:bg-amber-700"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Guardar costo
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cerrar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
