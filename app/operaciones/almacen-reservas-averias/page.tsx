"use client"

import { useCallback, useEffect, useState } from "react"
import {
  AlertCircle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Loader2,
  PackageMinus,
  Printer,
  RefreshCw,
  Search,
  Undo2,
} from "lucide-react"
import { RouteGuard } from "@/components/auth/route-guard"
import { ModuleHeader } from "@/components/shared/organism/module-header"
import { Button } from "@/components/shared/atom/button"
import { Badge } from "@/components/shared/atom/badge"
import { Input } from "@/components/shared/molecule/input"
import { Card, CardContent } from "@/components/shared/molecule/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/shared/molecule/tabs"
import { SacarMaterialesDialog } from "@/components/feats/reservas-averias/sacar-materiales-dialog"
import { AnularValeDialog } from "@/components/feats/vales-salida/anular-vale-dialog"
import { ReservasAveriasService } from "@/lib/services/feats/reservas-averias/reservas-averias-service"
import { ValeSalidaService } from "@/lib/services/feats/vales-salida/vale-salida-service"
import { ExportValeSalidaService } from "@/lib/services/feats/vales-salida/export-vale-salida-service"
import type { ValeSalida } from "@/lib/api-types"
import type {
  EntradaReservaAveria,
  SalidaReservaAveria,
  StockReservaAveria,
} from "@/lib/types/feats/reservas-averias/reservas-averias-types"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

const MODULO = "almacen-reservas-averias"
const PAGE = 30

const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n || 0)
const fmt = (n: number) => Number((n || 0).toFixed(4)).toString()
const fecha = (v?: string | null) =>
  v
    ? new Date(v).toLocaleString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—"

const ESTADO_VALE: Record<string, { label: string; className: string }> = {
  usado: { label: "Entregado", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  anulado: { label: "Anulado", className: "bg-red-50 text-red-700 border-red-200" },
  devuelto: { label: "Devuelto", className: "bg-amber-50 text-amber-700 border-amber-200" },
}

function Paginacion({
  skip,
  total,
  onChange,
}: {
  skip: number
  total: number
  onChange: (skip: number) => void
}) {
  if (total <= PAGE) return null
  return (
    <div className="flex items-center justify-end gap-2 pt-3 text-sm text-gray-600">
      <span>
        {skip + 1}–{Math.min(skip + PAGE, total)} de {total}
      </span>
      <Button variant="outline" size="sm" disabled={skip === 0} onClick={() => onChange(Math.max(0, skip - PAGE))}>
        Anterior
      </Button>
      <Button variant="outline" size="sm" disabled={skip + PAGE >= total} onClick={() => onChange(skip + PAGE)}>
        Siguiente
      </Button>
    </div>
  )
}

export default function AlmacenReservasAveriasPage() {
  const { toast } = useToast()
  const [almacenNombre, setAlmacenNombre] = useState<string | null>(null)
  const [errorAlmacen, setErrorAlmacen] = useState<string | null>(null)
  const [tab, setTab] = useState("stock")
  const [sacarOpen, setSacarOpen] = useState(false)

  // Stock
  const [stock, setStock] = useState<StockReservaAveria[]>([])
  const [stockLoading, setStockLoading] = useState(false)
  const [stockQ, setStockQ] = useState("")

  // Movimientos
  const [vista, setVista] = useState<"salidas" | "entradas">("salidas")
  const [salidas, setSalidas] = useState<SalidaReservaAveria[]>([])
  const [salidasTotal, setSalidasTotal] = useState(0)
  const [salidasSkip, setSalidasSkip] = useState(0)
  const [salidasQ, setSalidasQ] = useState("")
  const [entradas, setEntradas] = useState<EntradaReservaAveria[]>([])
  const [entradasTotal, setEntradasTotal] = useState(0)
  const [entradasSkip, setEntradasSkip] = useState(0)
  const [movLoading, setMovLoading] = useState(false)

  const [valeAnular, setValeAnular] = useState<SalidaReservaAveria | null>(null)
  const [anulando, setAnulando] = useState(false)

  useEffect(() => {
    ReservasAveriasService.getAlmacen()
      .then((a) => setAlmacenNombre(a.nombre))
      .catch((e) => setErrorAlmacen(e instanceof Error ? e.message : "No se encontró el almacén"))
  }, [])

  const cargarStock = useCallback(async (q?: string) => {
    setStockLoading(true)
    try {
      setStock(await ReservasAveriasService.getStock({ q }))
    } catch (e) {
      toast({
        title: "No se pudo cargar el stock",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      })
    } finally {
      setStockLoading(false)
    }
  }, [toast])

  const cargarSalidas = useCallback(async (skip: number, q: string) => {
    setMovLoading(true)
    try {
      const res = await ReservasAveriasService.getSalidas({ skip, limit: PAGE, q })
      setSalidas(res.data)
      setSalidasTotal(res.total)
    } catch (e) {
      toast({
        title: "No se pudieron cargar las salidas",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      })
    } finally {
      setMovLoading(false)
    }
  }, [toast])

  const cargarEntradas = useCallback(async (skip: number) => {
    setMovLoading(true)
    try {
      const res = await ReservasAveriasService.getEntradas({ skip, limit: PAGE })
      setEntradas(res.data)
      setEntradasTotal(res.total)
    } catch (e) {
      toast({
        title: "No se pudieron cargar las entradas",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      })
    } finally {
      setMovLoading(false)
    }
  }, [toast])

  // Búsqueda de stock con espera para no pedir en cada tecla.
  useEffect(() => {
    if (errorAlmacen) return
    const h = setTimeout(() => void cargarStock(stockQ), 300)
    return () => clearTimeout(h)
  }, [stockQ, cargarStock, errorAlmacen])

  useEffect(() => {
    if (tab !== "movimientos" || errorAlmacen) return
    if (vista === "salidas") {
      const h = setTimeout(() => void cargarSalidas(salidasSkip, salidasQ), 300)
      return () => clearTimeout(h)
    }
    void cargarEntradas(entradasSkip)
  }, [tab, vista, salidasSkip, salidasQ, entradasSkip, cargarSalidas, cargarEntradas, errorAlmacen])

  const refrescar = () => {
    void cargarStock(stockQ)
    if (tab === "movimientos") {
      if (vista === "salidas") void cargarSalidas(salidasSkip, salidasQ)
      else void cargarEntradas(entradasSkip)
    }
  }

  const imprimirVale = async (s: SalidaReservaAveria) => {
    try {
      const vale = await ValeSalidaService.getValeById(s.vale_id)
      if (!vale) throw new Error("No se pudo cargar el vale")
      await ExportValeSalidaService.imprimirPDF(vale)
    } catch (e) {
      toast({
        title: "No se pudo imprimir el vale",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      })
    }
  }

  const confirmarAnular = async (motivo: string) => {
    if (!valeAnular) return
    setAnulando(true)
    try {
      await ValeSalidaService.anularVale(valeAnular.vale_id, { motivo_anulacion: motivo })
      toast({
        title: "Vale anulado",
        description: `El vale ${valeAnular.vale_codigo} se anuló y el material volvió al almacén.`,
      })
      setValeAnular(null)
      refrescar()
    } catch (e) {
      toast({
        title: "No se pudo anular el vale",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      })
    } finally {
      setAnulando(false)
    }
  }

  const totalDisponible = stock.reduce((a, s) => a + (s.cantidad_disponible > 0 ? 1 : 0), 0)

  return (
    <RouteGuard requiredModule={MODULO}>
      <div className="min-h-screen bg-gradient-to-br from-[#f4f9f6] via-white to-[#fdf3ea]">
        <ModuleHeader
          title="Almacén Reservas Averías"
          subtitle={almacenNombre ? `Material de reserva para solucionar averías · ${almacenNombre}` : "Material de reserva para solucionar averías"}
          badge={{ text: "Operaciones", className: "bg-orange-100 text-orange-800" }}
          className="bg-white shadow-sm border-b border-orange-100"
          actions={
            <Button
              onClick={() => setSacarOpen(true)}
              disabled={Boolean(errorAlmacen)}
              className="bg-orange-600 hover:bg-orange-700"
            >
              <PackageMinus className="mr-2 h-4 w-4" />
              Sacar materiales
            </Button>
          }
        />

        <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
          {errorAlmacen ? (
            <Card>
              <CardContent className="flex items-start gap-3 py-6 text-sm text-red-800">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                <span>{errorAlmacen}</span>
              </CardContent>
            </Card>
          ) : (
            <Tabs value={tab} onValueChange={setTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-2 sm:w-[420px]">
                <TabsTrigger value="stock">Stock disponible</TabsTrigger>
                <TabsTrigger value="movimientos">Movimientos</TabsTrigger>
              </TabsList>

              {/* ── STOCK ───────────────────────────────────── */}
              <TabsContent value="stock" className="space-y-4">
                <Card>
                  <CardContent className="space-y-4 pt-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative w-full sm:w-80">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <Input
                          value={stockQ}
                          onChange={(e) => setStockQ(e.target.value)}
                          placeholder="Buscar por código o nombre..."
                          className="pl-9"
                        />
                      </div>
                      <Button variant="outline" size="sm" onClick={refrescar} disabled={stockLoading}>
                        <RefreshCw className={cn("mr-1.5 h-4 w-4", stockLoading && "animate-spin")} />
                        Actualizar
                      </Button>
                      <span className="ml-auto text-sm text-gray-600">
                        {stock.length} materiales · {totalDisponible} con disponible
                      </span>
                    </div>

                    {stockLoading && stock.length === 0 ? (
                      <div className="flex items-center justify-center py-10 text-gray-500">
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando...
                      </div>
                    ) : stock.length === 0 ? (
                      <p className="py-10 text-center text-sm text-gray-500">
                        {stockQ ? "Ningún material coincide con la búsqueda." : "El almacén no tiene material. Llega por transferencia desde otros almacenes."}
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                            <tr>
                              <th className="px-3 py-2">Código</th>
                              <th className="px-3 py-2">Material</th>
                              <th className="px-3 py-2 text-right">Existencia</th>
                              <th className="px-3 py-2 text-right">Reservado</th>
                              <th className="px-3 py-2 text-right">Disponible</th>
                              <th className="px-3 py-2 text-right">Precio instaladora</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {stock.map((s) => (
                              <tr key={s.material_id}>
                                <td className="px-3 py-2 font-medium text-gray-900">{s.material_codigo || "—"}</td>
                                <td className="px-3 py-2 text-gray-700">
                                  {s.material_descripcion || s.material_nombre}
                                  {s.categoria && <span className="block text-xs text-gray-500">{s.categoria}</span>}
                                </td>
                                <td className="px-3 py-2 text-right">
                                  {fmt(s.cantidad)} {s.um || ""}
                                </td>
                                <td className="px-3 py-2 text-right text-gray-500">
                                  {s.cantidad_reservada > 0 ? fmt(s.cantidad_reservada) : "—"}
                                </td>
                                <td
                                  className={cn(
                                    "px-3 py-2 text-right font-semibold",
                                    s.cantidad_disponible > 0 ? "text-emerald-700" : "text-red-600",
                                  )}
                                >
                                  {fmt(s.cantidad_disponible)}
                                </td>
                                <td className="px-3 py-2 text-right">{money(s.precio_unitario)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── MOVIMIENTOS ─────────────────────────────── */}
              <TabsContent value="movimientos" className="space-y-4">
                <Card>
                  <CardContent className="space-y-4 pt-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="inline-flex rounded-md border p-0.5">
                        <button
                          type="button"
                          onClick={() => setVista("salidas")}
                          className={cn(
                            "flex items-center gap-1.5 rounded px-3 py-1.5 text-sm",
                            vista === "salidas" ? "bg-orange-600 text-white" : "text-gray-700 hover:bg-gray-50",
                          )}
                        >
                          <ArrowUpFromLine className="h-4 w-4" />
                          Salidas
                        </button>
                        <button
                          type="button"
                          onClick={() => setVista("entradas")}
                          className={cn(
                            "flex items-center gap-1.5 rounded px-3 py-1.5 text-sm",
                            vista === "entradas" ? "bg-emerald-600 text-white" : "text-gray-700 hover:bg-gray-50",
                          )}
                        >
                          <ArrowDownToLine className="h-4 w-4" />
                          Entradas
                        </button>
                      </div>
                      {vista === "salidas" && (
                        <div className="relative w-full sm:w-80">
                          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                          <Input
                            value={salidasQ}
                            onChange={(e) => {
                              setSalidasQ(e.target.value)
                              setSalidasSkip(0)
                            }}
                            placeholder="Buscar vale, cliente, persona, avería o material..."
                            className="pl-9"
                          />
                        </div>
                      )}
                      <Button variant="outline" size="sm" onClick={refrescar} disabled={movLoading}>
                        <RefreshCw className={cn("mr-1.5 h-4 w-4", movLoading && "animate-spin")} />
                        Actualizar
                      </Button>
                    </div>

                    {vista === "salidas" ? (
                      movLoading && salidas.length === 0 ? (
                        <div className="flex items-center justify-center py-10 text-gray-500">
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando...
                        </div>
                      ) : salidas.length === 0 ? (
                        <p className="py-10 text-center text-sm text-gray-500">No hay salidas registradas.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                              <tr>
                                <th className="px-3 py-2">Fecha</th>
                                <th className="px-3 py-2">Vale</th>
                                <th className="px-3 py-2">Se lo llevó</th>
                                <th className="px-3 py-2">Cliente / avería</th>
                                <th className="px-3 py-2">Materiales</th>
                                <th className="px-3 py-2 text-right">Importe</th>
                                <th className="px-3 py-2">Estado</th>
                                <th className="px-3 py-2" />
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 align-top">
                              {salidas.map((s) => {
                                const estado = ESTADO_VALE[s.estado] ?? {
                                  label: s.estado,
                                  className: "bg-gray-50 text-gray-700 border-gray-200",
                                }
                                return (
                                  <tr key={s.vale_id} className={s.estado === "anulado" ? "opacity-60" : undefined}>
                                    <td className="whitespace-nowrap px-3 py-2 text-gray-700">{fecha(s.fecha)}</td>
                                    <td className="px-3 py-2 font-medium text-gray-900">{s.vale_codigo}</td>
                                    <td className="px-3 py-2">
                                      {s.recogido_por || "—"}
                                      {s.recogido_por_ci && (
                                        <span className="block text-xs text-gray-500">CI {s.recogido_por_ci}</span>
                                      )}
                                    </td>
                                    <td className="px-3 py-2">
                                      <span className="font-medium">{s.cliente_nombre || "—"}</span>
                                      {s.cliente_numero && (
                                        <span className="block text-xs text-gray-500">N° {s.cliente_numero}</span>
                                      )}
                                      {(s.averia_codigo || s.averia_descripcion) && (
                                        <span className="mt-1 block text-xs text-orange-700">
                                          Avería {s.averia_codigo ? `${s.averia_codigo} · ` : ""}
                                          {s.averia_descripcion}
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-3 py-2">
                                      <ul className="space-y-0.5">
                                        {s.materiales.map((m) => (
                                          <li key={m.material_id} className="text-gray-700">
                                            <span className="font-medium">{fmt(m.cantidad)}</span> {m.um || ""} ×{" "}
                                            {m.material_codigo ? `${m.material_codigo} ` : ""}
                                            <span className="text-gray-500">{m.material_descripcion}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-2 text-right">{money(s.importe)}</td>
                                    <td className="px-3 py-2">
                                      <Badge variant="outline" className={estado.className}>
                                        {estado.label}
                                      </Badge>
                                      {s.motivo_anulacion && (
                                        <span className="mt-1 block text-xs text-gray-500">{s.motivo_anulacion}</span>
                                      )}
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-2 text-right">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => void imprimirVale(s)}
                                        title="Imprimir vale"
                                      >
                                        <Printer className="h-4 w-4" />
                                      </Button>
                                      {s.estado === "usado" && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => setValeAnular(s)}
                                          title="Anular vale"
                                          className="text-red-600 hover:text-red-700"
                                        >
                                          <Undo2 className="h-4 w-4" />
                                        </Button>
                                      )}
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                          <Paginacion skip={salidasSkip} total={salidasTotal} onChange={setSalidasSkip} />
                        </div>
                      )
                    ) : movLoading && entradas.length === 0 ? (
                      <div className="flex items-center justify-center py-10 text-gray-500">
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando...
                      </div>
                    ) : entradas.length === 0 ? (
                      <p className="py-10 text-center text-sm text-gray-500">No hay entradas registradas.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                            <tr>
                              <th className="px-3 py-2">Fecha</th>
                              <th className="px-3 py-2">Origen</th>
                              <th className="px-3 py-2">Material</th>
                              <th className="px-3 py-2 text-right">Cantidad</th>
                              <th className="px-3 py-2">Referencia</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {entradas.map((e) => (
                              <tr key={e.id}>
                                <td className="whitespace-nowrap px-3 py-2 text-gray-700">{fecha(e.fecha)}</td>
                                <td className="px-3 py-2">
                                  {e.tipo === "transferencia"
                                    ? `Transferencia desde ${e.almacen_origen_nombre || "otro almacén"}`
                                    : (e.referencia || "").endsWith("-anulacion")
                                      ? "Devolución por vale anulado"
                                      : "Entrada directa"}
                                </td>
                                <td className="px-3 py-2">
                                  <span className="font-medium">{e.material_codigo}</span>
                                  <span className="ml-2 text-gray-600">{e.material_descripcion}</span>
                                </td>
                                <td className="px-3 py-2 text-right font-medium text-emerald-700">
                                  +{fmt(e.cantidad)} {e.um || ""}
                                </td>
                                <td className="px-3 py-2 text-gray-500">{e.referencia || e.motivo || "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <Paginacion skip={entradasSkip} total={entradasTotal} onChange={setEntradasSkip} />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </main>

        <SacarMaterialesDialog open={sacarOpen} onOpenChange={setSacarOpen} onSuccess={refrescar} />

        <AnularValeDialog
          open={valeAnular !== null}
          onOpenChange={(v) => {
            if (!v) setValeAnular(null)
          }}
          vale={
            valeAnular
              ? ({ id: valeAnular.vale_id, codigo: valeAnular.vale_codigo, materiales: [] } as unknown as ValeSalida)
              : null
          }
          onConfirm={confirmarAnular}
          isLoading={anulando}
        />
      </div>
    </RouteGuard>
  )
}
