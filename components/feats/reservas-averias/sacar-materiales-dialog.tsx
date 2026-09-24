"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { Badge } from "@/components/shared/atom/badge"
import { MaterialImage } from "@/components/shared/molecule/material-image"
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Loader2,
  PackageMinus,
  Plus,
  Printer,
  Search,
  Trash2,
  X,
} from "lucide-react"
import { ClienteService, TrabajadorService } from "@/lib/api-services"
import type { Trabajador } from "@/lib/api-types"
import {
  ReservasAveriasService,
  StockInsuficienteError,
} from "@/lib/services/feats/reservas-averias/reservas-averias-service"
import type {
  AveriaPendiente,
  SalidaCreada,
  StockReservaAveria,
} from "@/lib/types/feats/reservas-averias/reservas-averias-types"
import { ValeSalidaService } from "@/lib/services/feats/vales-salida/vale-salida-service"
import { ExportValeSalidaService } from "@/lib/services/feats/vales-salida/export-vale-salida-service"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

interface ClienteLookup {
  id?: string
  numero?: string
  nombre?: string
}

interface LineaSalida {
  material_id: string
  cantidad: string
}

interface SacarMaterialesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n || 0)

const fmt = (n: number) => Number(n.toFixed(4)).toString()

export function SacarMaterialesDialog({ open, onOpenChange, onSuccess }: SacarMaterialesDialogProps) {
  const { toast } = useToast()

  // Quién se lo lleva
  const [responsable, setResponsable] = useState("")
  const [responsableCi, setResponsableCi] = useState<string | null>(null)
  const [responsableResults, setResponsableResults] = useState<Trabajador[]>([])
  const [responsableLoading, setResponsableLoading] = useState(false)

  // Cliente y avería
  const [clienteSearch, setClienteSearch] = useState("")
  const [clienteResults, setClienteResults] = useState<ClienteLookup[]>([])
  const [clienteLoading, setClienteLoading] = useState(false)
  const [cliente, setCliente] = useState<ClienteLookup | null>(null)
  const [averias, setAverias] = useState<AveriaPendiente[]>([])
  const [averiasLoading, setAveriasLoading] = useState(false)
  const [averiaId, setAveriaId] = useState<string | null>(null)

  // Materiales
  const [stock, setStock] = useState<StockReservaAveria[]>([])
  const [stockLoading, setStockLoading] = useState(false)
  const [materialSearch, setMaterialSearch] = useState("")
  const [lineas, setLineas] = useState<LineaSalida[]>([])

  const [submitting, setSubmitting] = useState(false)
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [creada, setCreada] = useState<SalidaCreada | null>(null)

  const reset = useCallback(() => {
    setResponsable("")
    setResponsableCi(null)
    setResponsableResults([])
    setClienteSearch("")
    setClienteResults([])
    setCliente(null)
    setAverias([])
    setAveriaId(null)
    setMaterialSearch("")
    setLineas([])
    setErrorGeneral(null)
    setCreada(null)
  }, [])

  useEffect(() => {
    if (!open) reset()
  }, [open, reset])

  // Stock: se recarga al cambiar de cliente (sus propias reservas no le restan).
  const cargarStock = useCallback(async (clienteNumero?: string) => {
    setStockLoading(true)
    try {
      setStock(await ReservasAveriasService.getStock({ cliente_numero: clienteNumero }))
    } catch (e) {
      setErrorGeneral(e instanceof Error ? e.message : "No se pudo cargar el stock")
    } finally {
      setStockLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) void cargarStock(cliente?.numero)
  }, [open, cliente?.numero, cargarStock])

  // Búsqueda de trabajador
  useEffect(() => {
    const term = responsable.trim()
    if (!term || responsableCi) {
      setResponsableResults([])
      return
    }
    const handler = setTimeout(async () => {
      setResponsableLoading(true)
      try {
        const results = await TrabajadorService.buscarTrabajadores(term)
        setResponsableResults((Array.isArray(results) ? results : []).slice(0, 10) as unknown as Trabajador[])
      } catch {
        setResponsableResults([])
      } finally {
        setResponsableLoading(false)
      }
    }, 300)
    return () => clearTimeout(handler)
  }, [responsable, responsableCi])

  // Búsqueda de cliente
  useEffect(() => {
    if (!clienteSearch.trim() || cliente) {
      setClienteResults([])
      return
    }
    const handler = setTimeout(async () => {
      setClienteLoading(true)
      try {
        const data = await ClienteService.getClientes({ nombre: clienteSearch, activo: true })
        setClienteResults((data.clients || []) as ClienteLookup[])
      } catch {
        setClienteResults([])
      } finally {
        setClienteLoading(false)
      }
    }, 350)
    return () => clearTimeout(handler)
  }, [clienteSearch, cliente])

  const seleccionarCliente = async (c: ClienteLookup) => {
    setCliente(c)
    setClienteResults([])
    setAveriaId(null)
    setAverias([])
    if (!c.numero) return
    setAveriasLoading(true)
    try {
      const pendientes = await ReservasAveriasService.getAveriasPendientes(c.numero)
      setAverias(pendientes)
      if (pendientes.length === 1) setAveriaId(pendientes[0].id)
    } catch (e) {
      toast({
        title: "No se pudieron cargar las averías",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      })
    } finally {
      setAveriasLoading(false)
    }
  }

  const quitarCliente = () => {
    setCliente(null)
    setClienteSearch("")
    setAverias([])
    setAveriaId(null)
  }

  // Materiales
  const stockPorId = useMemo(() => new Map(stock.map((s) => [s.material_id, s])), [stock])
  const idsEnLineas = useMemo(() => new Set(lineas.map((l) => l.material_id)), [lineas])

  const resultadosMaterial = useMemo(() => {
    const t = materialSearch.trim().toLowerCase()
    if (!t) return []
    return stock
      .filter((s) => !idsEnLineas.has(s.material_id))
      .filter((s) =>
        [s.material_codigo, s.material_nombre, s.material_descripcion]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(t)),
      )
      .slice(0, 12)
  }, [materialSearch, stock, idsEnLineas])

  const agregarMaterial = (s: StockReservaAveria) => {
    setLineas((prev) => [...prev, { material_id: s.material_id, cantidad: "1" }])
    setMaterialSearch("")
  }

  const filas = lineas.map((l) => {
    const s = stockPorId.get(l.material_id)
    const cantidad = Number(l.cantidad)
    const disponible = s?.cantidad_disponible ?? 0
    const cantidadValida = Number.isFinite(cantidad) && cantidad > 0
    const excede = cantidadValida && cantidad > disponible + 1e-9
    const precio = s?.precio_unitario ?? 0
    return {
      ...l,
      stock: s,
      cantidadNum: cantidadValida ? cantidad : 0,
      disponible,
      cantidadValida,
      excede,
      subtotal: cantidadValida ? cantidad * precio : 0,
    }
  })

  const hayExceso = filas.some((f) => f.excede)
  const hayCantidadInvalida = filas.some((f) => !f.cantidadValida)
  const total = filas.reduce((a, f) => a + f.subtotal, 0)

  const faltaAlgo: string | null = !responsable.trim()
    ? "Indica quién se lleva el material"
    : !cliente
      ? "Selecciona el cliente"
      : !averiaId
        ? "Selecciona la avería"
        : filas.length === 0
          ? "Agrega al menos un material"
          : hayCantidadInvalida
            ? "Las cantidades deben ser mayores que 0"
            : hayExceso
              ? "Hay materiales sin stock suficiente"
              : null

  const guardar = async () => {
    if (faltaAlgo || !cliente?.numero || !averiaId) return
    setSubmitting(true)
    setErrorGeneral(null)
    try {
      const data = await ReservasAveriasService.sacarMateriales({
        cliente_numero: cliente.numero,
        averia_id: averiaId,
        responsable_recogida: responsable.trim(),
        responsable_recogida_ci: responsableCi,
        materiales: filas.map((f) => ({ material_id: f.material_id, cantidad: f.cantidadNum })),
      })
      setCreada(data)
      onSuccess()
    } catch (e) {
      if (e instanceof StockInsuficienteError) {
        // Otro movimiento cambió el stock mientras se llenaba el formulario:
        // se actualiza el disponible y las filas que no alcanzan se marcan.
        await cargarStock(cliente.numero)
        setErrorGeneral(e.message)
      } else {
        setErrorGeneral(e instanceof Error ? e.message : "No se pudo registrar la salida")
      }
    } finally {
      setSubmitting(false)
    }
  }

  const exportarVale = async (modo: "imprimir" | "pdf") => {
    if (!creada) return
    try {
      const vale = await ValeSalidaService.getValeById(creada.vale_id)
      if (!vale) throw new Error("No se pudo cargar el vale")
      if (modo === "imprimir") await ExportValeSalidaService.imprimirPDF(vale)
      else await ExportValeSalidaService.exportarPDF(vale)
    } catch (e) {
      toast({
        title: "No se pudo generar el PDF del vale",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      })
    }
  }

  const averiaSeleccionada = averias.find((a) => a.id === averiaId)

  return (
    <Dialog open={open} onOpenChange={(v) => !submitting && onOpenChange(v)}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageMinus className="h-5 w-5 text-orange-600" />
            Sacar materiales
          </DialogTitle>
          <DialogDescription>
            Crea a la vez la solicitud y el vale de salida. El material se suma al servicio de la avería del cliente.
          </DialogDescription>
        </DialogHeader>

        {creada ? (
          <div className="space-y-4 py-2">
            <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              <div className="text-sm text-emerald-900">
                <p className="font-semibold">Salida registrada</p>
                <p>
                  Solicitud <strong>{creada.solicitud_codigo}</strong> · Vale <strong>{creada.vale_codigo}</strong>
                </p>
                <p className="mt-1 text-emerald-800">
                  Los materiales quedaron en el servicio &quot;Solución de avería&quot; del cliente. Se cobrará cuando la avería se marque como solucionada.
                </p>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="outline" onClick={() => exportarVale("pdf")}>
                <Download className="mr-2 h-4 w-4" />
                Descargar vale
              </Button>
              <Button variant="outline" onClick={() => exportarVale("imprimir")}>
                <Printer className="mr-2 h-4 w-4" />
                Imprimir vale
              </Button>
              <Button onClick={() => onOpenChange(false)}>Cerrar</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-5 py-2">
            {/* Quién se lo lleva */}
            <div className="space-y-1.5">
              <Label>Quién se lo lleva *</Label>
              {responsableCi ? (
                <div className="flex items-center justify-between rounded-md border bg-gray-50 px-3 py-2 text-sm">
                  <span>
                    <strong>{responsable}</strong>
                    <span className="ml-2 text-gray-500">CI {responsableCi}</span>
                  </span>
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-700"
                    onClick={() => {
                      setResponsable("")
                      setResponsableCi(null)
                    }}
                    aria-label="Cambiar trabajador"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Input
                    value={responsable}
                    onChange={(e) => setResponsable(e.target.value)}
                    placeholder="Buscar trabajador por nombre..."
                  />
                  {responsableLoading && (
                    <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-gray-400" />
                  )}
                  {responsableResults.length > 0 && (
                    <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border bg-white shadow-lg">
                      {responsableResults.map((t) => (
                        <button
                          key={t.CI || t.id}
                          type="button"
                          className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                          onClick={() => {
                            setResponsable(t.nombre)
                            setResponsableCi(t.CI ? String(t.CI) : null)
                            setResponsableResults([])
                          }}
                        >
                          {t.nombre}
                          {t.CI && <span className="ml-2 text-xs text-gray-500">CI {t.CI}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Cliente */}
            <div className="space-y-1.5">
              <Label>Cliente *</Label>
              {cliente ? (
                <div className="flex items-center justify-between rounded-md border bg-gray-50 px-3 py-2 text-sm">
                  <span>
                    <strong>{cliente.nombre}</strong>
                    <span className="ml-2 text-gray-500">N° {cliente.numero}</span>
                  </span>
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-700"
                    onClick={quitarCliente}
                    aria-label="Cambiar cliente"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Input
                    value={clienteSearch}
                    onChange={(e) => setClienteSearch(e.target.value)}
                    placeholder="Buscar cliente por nombre..."
                  />
                  {clienteLoading && (
                    <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-gray-400" />
                  )}
                  {clienteResults.length > 0 && (
                    <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border bg-white shadow-lg">
                      {clienteResults.map((c) => (
                        <button
                          key={c.id || c.numero}
                          type="button"
                          className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                          onClick={() => void seleccionarCliente(c)}
                        >
                          {c.nombre}
                          <span className="ml-2 text-xs text-gray-500">N° {c.numero}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Avería */}
            {cliente && (
              <div className="space-y-1.5">
                <Label>Avería *</Label>
                {averiasLoading ? (
                  <p className="flex items-center text-sm text-gray-500">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cargando averías...
                  </p>
                ) : averias.length === 0 ? (
                  <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    Este cliente no tiene averías pendientes. Registra la avería antes de sacar material.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {averias.map((a) => (
                      <label
                        key={a.id}
                        className={cn(
                          "flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2 text-sm",
                          averiaId === a.id ? "border-orange-400 bg-orange-50" : "hover:bg-gray-50",
                        )}
                      >
                        <input
                          type="radio"
                          name="averia"
                          className="mt-1"
                          checked={averiaId === a.id}
                          onChange={() => setAveriaId(a.id)}
                        />
                        <span>
                          {a.codigo && <strong className="mr-2">{a.codigo}</strong>}
                          {a.descripcion}
                          {a.fecha_reporte && (
                            <span className="block text-xs text-gray-500">
                              Reportada el {new Date(a.fecha_reporte).toLocaleDateString("es-ES")}
                            </span>
                          )}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Materiales */}
            <div className="space-y-2">
              <Label>Materiales *</Label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  value={materialSearch}
                  onChange={(e) => setMaterialSearch(e.target.value)}
                  placeholder={stockLoading ? "Cargando stock..." : "Buscar material del almacén por código o nombre..."}
                  className="pl-9"
                  disabled={stockLoading}
                />
                {resultadosMaterial.length > 0 && (
                  <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-md border bg-white shadow-lg">
                    {resultadosMaterial.map((s) => (
                      <button
                        key={s.material_id}
                        type="button"
                        disabled={s.cantidad_disponible <= 0}
                        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={() => agregarMaterial(s)}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded border border-gray-100 bg-white">
                            <MaterialImage
                              foto={s.foto}
                              alt={s.material_descripcion || s.material_codigo || "Material"}
                              className="h-full w-full"
                              imgClassName="h-full w-full object-contain"
                              fallback={<span className="h-2 w-2 rounded-full bg-gray-200" />}
                            />
                          </span>
                          <span className="min-w-0">
                            <span className="font-medium">{s.material_codigo}</span>
                            <span className="ml-2 text-gray-600">{s.material_descripcion || s.material_nombre}</span>
                          </span>
                        </span>
                        <span className="shrink-0 text-xs text-gray-500">
                          Disp. {fmt(s.cantidad_disponible)} {s.um || ""}
                          <Plus className="ml-1 inline h-3.5 w-3.5" />
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {materialSearch.trim() && !stockLoading && resultadosMaterial.length === 0 && (
                  <p className="mt-1 text-xs text-gray-500">No hay materiales en este almacén que coincidan.</p>
                )}
              </div>

              {filas.length > 0 && (
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                      <tr>
                        <th className="px-3 py-2">Material</th>
                        <th className="px-3 py-2 text-right">Disponible</th>
                        <th className="px-3 py-2">Cantidad</th>
                        <th className="px-3 py-2 text-right">Precio</th>
                        <th className="px-3 py-2 text-right">Subtotal</th>
                        <th className="px-2 py-2" />
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filas.map((f) => (
                        <tr key={f.material_id} className={f.excede ? "bg-red-50" : undefined}>
                          <td className="px-3 py-2">
                            <div className="flex items-start gap-2">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded border border-gray-100 bg-white">
                              <MaterialImage
                                foto={f.stock?.foto}
                                alt={f.stock?.material_descripcion || f.stock?.material_codigo || "Material"}
                                className="h-full w-full"
                                imgClassName="h-full w-full object-contain"
                                fallback={<span className="h-2 w-2 rounded-full bg-gray-200" />}
                              />
                            </span>
                            <div className="min-w-0">
                            <span className="font-medium">{f.stock?.material_codigo || f.material_id}</span>
                            <span className="block text-xs text-gray-600">
                              {f.stock?.material_descripcion || f.stock?.material_nombre}
                            </span>
                            {f.excede && (
                              <span className="mt-1 flex items-center gap-1 text-xs font-medium text-red-700">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                Stock insuficiente: disponible {fmt(f.disponible)}
                              </span>
                            )}
                            </div>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right text-gray-700">
                            {fmt(f.disponible)} {f.stock?.um || ""}
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="number"
                              min={0}
                              step="any"
                              value={f.cantidad}
                              onChange={(e) =>
                                setLineas((prev) =>
                                  prev.map((l) =>
                                    l.material_id === f.material_id ? { ...l, cantidad: e.target.value } : l,
                                  ),
                                )
                              }
                              className={cn("h-8 w-24", f.excede && "border-red-400 focus-visible:ring-red-400")}
                              aria-invalid={f.excede || !f.cantidadValida}
                            />
                          </td>
                          <td className="px-3 py-2 text-right">{money(f.stock?.precio_unitario ?? 0)}</td>
                          <td className="px-3 py-2 text-right font-medium">{money(f.subtotal)}</td>
                          <td className="px-2 py-2">
                            <button
                              type="button"
                              className="text-gray-400 hover:text-red-600"
                              onClick={() =>
                                setLineas((prev) => prev.filter((l) => l.material_id !== f.material_id))
                              }
                              aria-label="Quitar material"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50">
                        <td colSpan={4} className="px-3 py-2 text-right text-sm text-gray-600">
                          Total del servicio (precio de instaladora)
                        </td>
                        <td className="px-3 py-2 text-right font-semibold">{money(total)}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {averiaSeleccionada && filas.length > 0 && (
              <p className="text-xs text-gray-500">
                Se sumará al servicio &quot;Solución de avería{" "}
                {averiaSeleccionada.codigo || averiaSeleccionada.descripcion}&quot; de {cliente?.nombre}.
              </p>
            )}

            {errorGeneral && (
              <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{errorGeneral}</span>
              </div>
            )}

            <DialogFooter className="items-center gap-2 sm:gap-2">
              {faltaAlgo && filas.length > 0 && (
                <Badge variant="outline" className="mr-auto border-amber-200 bg-amber-50 text-amber-800">
                  {faltaAlgo}
                </Badge>
              )}
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                Cancelar
              </Button>
              <Button
                onClick={guardar}
                disabled={Boolean(faltaAlgo) || submitting}
                className="bg-orange-600 hover:bg-orange-700"
                title={faltaAlgo ?? undefined}
              >
                {submitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <PackageMinus className="mr-2 h-4 w-4" />
                )}
                Sacar materiales
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
