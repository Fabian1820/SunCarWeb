"use client"

import { useCallback, useEffect, useState } from "react"
import {
  AlertCircle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Loader2,
  PackageMinus,
  RefreshCw,
  Search,
} from "lucide-react"
import { RouteGuard } from "@/components/auth/route-guard"
import { ModuleHeader } from "@/components/shared/organism/module-header"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/molecule/input"
import { Card, CardContent } from "@/components/shared/molecule/card"
import { MaterialImage } from "@/components/shared/molecule/material-image"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/shared/molecule/tabs"
import { SacarMaterialesDialog } from "@/components/feats/reservas-averias/sacar-materiales-dialog"
import { SalidasAveriasPanel } from "@/components/feats/reservas-averias/salidas-averias-panel"
import { SolicitudesTransferenciaTable } from "@/components/feats/inventario/solicitudes-transferencia-table"
import { ReservasAveriasService } from "@/lib/services/feats/reservas-averias/reservas-averias-service"
import { InventarioService, MaterialService } from "@/lib/api-services"
import type { Almacen } from "@/lib/inventario-types"
import type { Material } from "@/lib/material-types"
import type {
  EntradaReservaAveria,
  StockReservaAveria,
} from "@/lib/types/feats/reservas-averias/reservas-averias-types"
import { parseFechaUtc } from "@/lib/utils/fecha-utc"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

const MODULO = "almacen-reservas-averias"
const PAGE = 30

const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n || 0)
const fmt = (n: number) => Number((n || 0).toFixed(4)).toString()
/** Las fechas de los movimientos llegan en UTC sin zona. */
const fechaHora = (v?: string | null) =>
  parseFechaUtc(v)?.toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }) ?? "—"

function tituloEntrada(e: EntradaReservaAveria): string {
  if (e.tipo === "transferencia") return `Transferencia desde ${e.almacen_origen_nombre || "otro almacén"}`
  if ((e.referencia || "").endsWith("-anulacion"))
    return `Devolución por anulación del vale ${(e.referencia || "").replace(/-anulacion$/, "")}`
  return "Entrada directa"
}

export default function AlmacenReservasAveriasPage() {
  const { toast } = useToast()
  const [almacen, setAlmacen] = useState<{ id: string; nombre: string } | null>(null)
  const [errorAlmacen, setErrorAlmacen] = useState<string | null>(null)
  const [tab, setTab] = useState("stock")
  const [sacarOpen, setSacarOpen] = useState(false)
  const [salidasKey, setSalidasKey] = useState(0)

  // Stock
  const [stock, setStock] = useState<StockReservaAveria[]>([])
  const [stockLoading, setStockLoading] = useState(false)
  const [stockQ, setStockQ] = useState("")

  // Movimientos
  const [vista, setVista] = useState<"salidas" | "entradas">("salidas")
  const [entradas, setEntradas] = useState<EntradaReservaAveria[]>([])
  const [entradasTotal, setEntradasTotal] = useState(0)
  const [entradasSkip, setEntradasSkip] = useState(0)
  const [entradasLoading, setEntradasLoading] = useState(false)

  // Catálogos que pide la tabla de transferencias (nombres de almacén y material).
  const [almacenes, setAlmacenes] = useState<Almacen[]>([])
  const [materiales, setMateriales] = useState<Material[]>([])
  const [transferKey, setTransferKey] = useState(0)

  useEffect(() => {
    ReservasAveriasService.getAlmacen()
      .then((a) => setAlmacen({ id: a.id, nombre: a.nombre }))
      .catch((e) => setErrorAlmacen(e instanceof Error ? e.message : "No se encontró el almacén"))
  }, [])

  const cargarStock = useCallback(
    async (q?: string) => {
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
    },
    [toast],
  )

  const cargarEntradas = useCallback(
    async (skip: number) => {
      setEntradasLoading(true)
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
        setEntradasLoading(false)
      }
    },
    [toast],
  )

  // Búsqueda de stock con espera para no pedir en cada tecla.
  useEffect(() => {
    if (!almacen) return
    const h = setTimeout(() => void cargarStock(stockQ), 300)
    return () => clearTimeout(h)
  }, [stockQ, cargarStock, almacen])

  useEffect(() => {
    if (tab !== "movimientos" || !almacen || almacenes.length > 0) return
    Promise.all([InventarioService.getAlmacenes(), MaterialService.getAllMaterials()])
      .then(([a, m]) => {
        setAlmacenes(a)
        setMateriales(m)
      })
      .catch(() => undefined)
  }, [tab, almacen, almacenes.length])

  useEffect(() => {
    if (tab === "movimientos" && vista === "entradas" && almacen) void cargarEntradas(entradasSkip)
  }, [tab, vista, entradasSkip, cargarEntradas, almacen])

  const refrescarTodo = () => {
    void cargarStock(stockQ)
    setSalidasKey((k) => k + 1)
    setTransferKey((k) => k + 1)
    if (vista === "entradas") void cargarEntradas(entradasSkip)
  }

  const conDisponible = stock.filter((s) => s.cantidad_disponible > 0).length

  return (
    <RouteGuard requiredModule={MODULO}>
      <div className="min-h-screen bg-gradient-to-br from-[#f4f9f6] via-white to-[#fdf3ea]">
        <ModuleHeader
          title="Almacén Reservas Averías"
          subtitle={
            almacen
              ? `Material de reserva para solucionar averías · ${almacen.nombre}`
              : "Material de reserva para solucionar averías"
          }
          badge={{ text: "Operaciones", className: "bg-orange-100 text-orange-800" }}
          className="bg-white shadow-sm border-b border-orange-100"
          actions={
            <Button
              onClick={() => setSacarOpen(true)}
              disabled={!almacen}
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
          ) : !almacen ? (
            <div className="flex items-center justify-center py-16 text-gray-500">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando...
            </div>
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
                      <Button variant="outline" size="sm" onClick={() => void cargarStock(stockQ)} disabled={stockLoading}>
                        <RefreshCw className={cn("mr-1.5 h-4 w-4", stockLoading && "animate-spin")} />
                        Actualizar
                      </Button>
                      <span className="ml-auto text-sm text-gray-600">
                        {stock.length} materiales · {conDisponible} con disponible
                      </span>
                    </div>

                    {stockLoading && stock.length === 0 ? (
                      <div className="flex items-center justify-center py-10 text-gray-500">
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando...
                      </div>
                    ) : stock.length === 0 ? (
                      <p className="py-10 text-center text-sm text-gray-500">
                        {stockQ
                          ? "Ningún material coincide con la búsqueda."
                          : "El almacén no tiene material. Llega por transferencia desde otros almacenes."}
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                            <tr>
                              <th className="px-3 py-2">Material</th>
                              <th className="px-3 py-2 text-right">Disponible</th>
                              <th className="px-3 py-2 text-right">Precio instaladora</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {stock.map((s) => (
                              <tr key={s.material_id}>
                                <td className="px-3 py-2">
                                  <div className="flex items-center gap-3">
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-gray-100 bg-white">
                                      <MaterialImage
                                        foto={s.foto}
                                        alt={s.material_descripcion || s.material_codigo || "Material"}
                                        className="h-full w-full"
                                        imgClassName="h-full w-full object-contain"
                                      />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="font-medium text-gray-900">{s.material_codigo || "—"}</p>
                                      <p className="text-gray-600">{s.material_descripcion || s.material_nombre}</p>
                                      {s.categoria && <p className="text-xs text-gray-400">{s.categoria}</p>}
                                    </div>
                                  </div>
                                </td>
                                <td
                                  className={cn(
                                    "whitespace-nowrap px-3 py-2 text-right font-semibold",
                                    s.cantidad_disponible > 0 ? "text-emerald-700" : "text-red-600",
                                  )}
                                >
                                  {fmt(s.cantidad_disponible)} {s.um || ""}
                                </td>
                                <td className="whitespace-nowrap px-3 py-2 text-right">{money(s.precio_unitario)}</td>
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
                {/* Transferencias que llegan al almacén y faltan por aceptar */}
                <SolicitudesTransferenciaTable
                  key={transferKey}
                  almacenes={almacenes}
                  materiales={materiales}
                  currentAlmacenId={almacen.id}
                  soloPendientesRecibidas
                  onResolved={() => {
                    void cargarStock(stockQ)
                    if (vista === "entradas") void cargarEntradas(0)
                  }}
                />

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
                      <Button variant="outline" size="sm" onClick={refrescarTodo}>
                        <RefreshCw className="mr-1.5 h-4 w-4" />
                        Actualizar
                      </Button>
                    </div>

                    {vista === "salidas" ? (
                      <SalidasAveriasPanel
                        almacenId={almacen.id}
                        refreshKey={salidasKey}
                        onChanged={() => void cargarStock(stockQ)}
                      />
                    ) : entradasLoading && entradas.length === 0 ? (
                      <div className="flex items-center justify-center py-10 text-gray-500">
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando...
                      </div>
                    ) : entradas.length === 0 ? (
                      <p className="py-10 text-center text-sm text-gray-500">No hay entradas registradas.</p>
                    ) : (
                      <div className="space-y-3">
                        <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
                          {entradas.map((e) => (
                            <li key={e.id} className="space-y-2 px-4 py-3">
                              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                                <p className="font-medium text-gray-900">{tituloEntrada(e)}</p>
                                <p className="text-sm tabular-nums text-gray-500">{fechaHora(e.fecha)}</p>
                              </div>
                              {(e.solicitante || e.aprobador || e.usuario) && (
                                <p className="text-xs text-gray-500">
                                  {e.solicitante && <>Solicitó {e.solicitante}</>}
                                  {e.solicitante && e.aprobador && " · "}
                                  {e.aprobador && <>Aceptó {e.aprobador}</>}
                                  {!e.solicitante && !e.aprobador && e.usuario && <>Registró {e.usuario}</>}
                                </p>
                              )}
                              <ul className="space-y-1">
                                {e.materiales.map((m, i) => (
                                  <li key={`${m.material_id}-${i}`} className="flex items-center gap-3 text-sm">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded border border-gray-100 bg-white">
                                      <MaterialImage
                                        foto={m.foto}
                                        alt={m.material_descripcion || m.material_codigo || "Material"}
                                        className="h-full w-full"
                                        imgClassName="h-full w-full object-contain"
                                        fallback={<span className="h-2 w-2 rounded-full bg-gray-200" />}
                                      />
                                    </div>
                                    <span className="min-w-0 flex-1 text-gray-700">
                                      <span className="font-medium text-gray-900">{m.material_codigo}</span>{" "}
                                      {m.material_descripcion}
                                    </span>
                                    <span className="shrink-0 font-medium tabular-nums text-emerald-700">
                                      +{fmt(m.cantidad)} {m.um || ""}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </li>
                          ))}
                        </ul>
                        {entradasTotal > PAGE && (
                          <div className="flex items-center justify-end gap-2 text-sm text-gray-600">
                            <span>
                              {entradasSkip + 1}–{Math.min(entradasSkip + PAGE, entradasTotal)} de {entradasTotal}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={entradasSkip === 0}
                              onClick={() => setEntradasSkip(Math.max(0, entradasSkip - PAGE))}
                            >
                              Anterior
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={entradasSkip + PAGE >= entradasTotal}
                              onClick={() => setEntradasSkip(entradasSkip + PAGE)}
                            >
                              Siguiente
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </main>

        <SacarMaterialesDialog
          open={sacarOpen}
          onOpenChange={setSacarOpen}
          onSuccess={() => {
            void cargarStock(stockQ)
            setSalidasKey((k) => k + 1)
          }}
        />
      </div>
    </RouteGuard>
  )
}
