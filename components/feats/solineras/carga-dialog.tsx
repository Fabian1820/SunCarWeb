"use client"

import { useEffect, useState } from "react"
import { Ban, CheckCircle2, Clock, Loader2, Printer, Wallet } from "lucide-react"
import { Button } from "@/components/shared/atom/button"
import { Label } from "@/components/shared/atom/label"
import { Input } from "@/components/shared/molecule/input"
import { Textarea } from "@/components/shared/molecule/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog"
import { useToast } from "@/hooks/use-toast"
import { useCarga, usePermisosSolineras } from "@/hooks/use-solineras"
import { SolineraService } from "@/lib/services/feats/solineras/solinera-service"
import {
  ETIQUETA_ALERTA,
  ETIQUETA_COMPROBANTE,
  ETIQUETA_ESTADO_CARGA,
  describirVehiculo,
  etiquetaMetodo,
  fechaCuba,
  formatearDuracion,
  formatearFechaHora,
  formatearHora,
  formatearMonto,
} from "@/lib/utils/solineras"
import { cn } from "@/lib/utils"
import { RegistrarPagoDialog } from "./registrar-pago-dialog"
import { mostrarTicket, prepararVentana } from "./panel-utils"
import type { Carga, ConfiguracionSolinera, EstadoCarga } from "@/lib/types/feats/solineras/solinera-types"

interface Props {
  solineraId: string
  cargaId: string | null
  configuracion: ConfiguracionSolinera
  /** Acción que se abre ya preparada (el botón «Terminar» de la tarjeta del puesto). */
  accionInicial?: "terminar" | null
  onOpenChange: (open: boolean) => void
  /** Algo cambió: el panel debe refrescarse. */
  onCambio: () => void
}

const COLOR_ESTADO: Record<EstadoCarga, string> = {
  cargando: "bg-lime-100 text-lime-900",
  terminada: "bg-amber-100 text-amber-900",
  cobrada: "bg-emerald-100 text-emerald-900",
  retirada: "bg-slate-200 text-slate-700",
  anulada: "bg-red-100 text-red-800",
}

type Accion = "terminar" | "retirar" | "anular" | null

export function CargaDialog({ solineraId, cargaId, configuracion, accionInicial, onOpenChange, onCambio }: Props) {
  const { toast } = useToast()
  const { puedeAnular } = usePermisosSolineras()
  const { data: carga, loading, error, setData, recargar } = useCarga<Carga>(
    () => SolineraService.obtenerCarga(solineraId, cargaId as string),
    [solineraId, cargaId],
    { activo: cargaId !== null },
  )

  const [accion, setAccion] = useState<Accion>(null)
  const [ocupado, setOcupado] = useState(false)
  const [cobrando, setCobrando] = useState(false)
  const [horaFin, setHoraFin] = useState("")
  const [motivo, setMotivo] = useState("")

  const abierto = cargaId !== null

  useEffect(() => {
    setAccion(accionInicial ?? null)
    setHoraFin("")
    setMotivo("")
  }, [cargaId, accionInicial])

  const cerrar = () => {
    setAccion(null)
    setHoraFin("")
    setMotivo("")
    onOpenChange(false)
  }

  /** Ejecuta una acción del backend y deja la carga al día en pantalla. */
  const ejecutar = async (nombre: string, hacer: () => Promise<Carga>, exito: string): Promise<Carga | null> => {
    setOcupado(true)
    try {
      const actualizada = await hacer()
      toast({ title: exito })
      onCambio()
      // El detalle trae también los pagos: se vuelve a pedir en vez de mezclar.
      await recargar()
      return actualizada
    } catch (err) {
      toast({
        title: `No se pudo ${nombre}`,
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      })
      return null
    } finally {
      setOcupado(false)
    }
  }

  const terminar = async () => {
    if (!carga) return
    let finCarga: string | undefined
    if (horaFin) {
      // «HH:MM» de hoy, hora de Cuba. Sin zona el backend lo entiende como hora de Cuba.
      finCarga = `${fechaCuba()}T${horaFin}`
    }
    const resultado = await ejecutar("terminar la carga", () => SolineraService.terminarCarga(solineraId, carga.id, { finCarga }), "Carga terminada")
    if (resultado) {
      setAccion(null)
      // Recién terminada y con importe: lo natural es cobrar enseguida.
      if (resultado.estado === "terminada") setCobrando(true)
    }
  }

  const retirar = async () => {
    if (!carga) return
    const resultado = await ejecutar("retirar el vehículo", () => SolineraService.retirarCarga(solineraId, carga.id), "Vehículo entregado")
    if (resultado) cerrar()
  }

  const anular = async () => {
    if (!carga) return
    const resultado = await ejecutar("anular la carga", () => SolineraService.anularCarga(solineraId, carga.id, motivo.trim()), "Carga anulada")
    if (resultado) cerrar()
  }

  const imprimir = async () => {
    if (!carga) return
    const ventana = prepararVentana()
    try {
      await mostrarTicket(solineraId, carga.id, ventana)
    } catch (err) {
      toast({
        title: "No se pudo generar el ticket",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      })
    }
  }

  return (
    <>
      <Dialog open={abierto} onOpenChange={(o) => !o && cerrar()}>
        <DialogContent className="max-w-lg">
          {loading || !carga ? (
            <>
              <DialogHeader>
                <DialogTitle>Carga</DialogTitle>
                <DialogDescription className={cn(error && "text-destructive")}>
                  {error ?? "Cargando…"}
                </DialogDescription>
              </DialogHeader>
              {error && (
                <DialogFooter>
                  <Button variant="outline" onClick={() => void recargar()}>
                    Reintentar
                  </Button>
                </DialogFooter>
              )}
            </>
          ) : (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 pr-6">
                  <DialogTitle className="font-mono text-base">{carga.codigo}</DialogTitle>
                  <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", COLOR_ESTADO[carga.estado])}>
                    {ETIQUETA_ESTADO_CARGA[carga.estado]}
                  </span>
                </div>
                <DialogDescription>
                  Puesto {carga.puesto_codigo} · {carga.cliente.nombre}
                </DialogDescription>
              </DialogHeader>

              {carga.alertas.length > 0 && (
                <ul className="grid gap-1.5">
                  {carga.alertas.map((a) => (
                    <li key={a} className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                      <Clock className="h-4 w-4 shrink-0" />
                      {ETIQUETA_ALERTA[a]}
                    </li>
                  ))}
                </ul>
              )}

              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <Dato titulo="Cliente" valor={carga.cliente.nombre} sub={carga.cliente.telefono} />
                <Dato titulo="Vehículo" valor={describirVehiculo(carga.vehiculo)} />
                <Dato titulo="Inicio" valor={formatearFechaHora(carga.inicio)} />
                <Dato
                  titulo="Tiempo pedido"
                  valor={formatearDuracion(carga.duracion_prevista_min)}
                  sub={`Saldría hacia las ${formatearHora(carga.fin_previsto)}`}
                />
                {carga.fin_carga && (
                  <Dato
                    titulo="Terminó"
                    valor={formatearHora(carga.fin_carga)}
                    sub={`${formatearDuracion(carga.minutos_cargados)} de carga · se cobran ${formatearDuracion(carga.minutos_cobrados)}`}
                  />
                )}
                <Dato
                  titulo="Tarifa"
                  valor={`${formatearMonto(carga.tarifa.precio_hora, carga.tarifa.moneda)} / hora`}
                  sub={`Fracciones de ${carga.tarifa.fraccion_min} min · mínimo ${carga.tarifa.minimo_min} min`}
                />
              </dl>

              <div className="rounded-lg border bg-muted/40 p-4">
                {carga.estado === "cargando" ? (
                  <div className="flex items-baseline justify-between gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Lleva {formatearDuracion(carga.minutos_transcurridos)}</p>
                      <p className="text-2xl font-semibold tabular-nums">
                        {formatearMonto(carga.importe_acumulado, carga.moneda)}
                      </p>
                    </div>
                    <p className="text-right text-xs text-muted-foreground">
                      Es lo que costaría si termina ahora.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <Cifra titulo="Importe" valor={formatearMonto(carga.importe, carga.moneda)} />
                    <Cifra titulo="Cobrado" valor={formatearMonto(carga.pagado, carga.moneda)} />
                    <Cifra
                      titulo="Pendiente"
                      valor={formatearMonto(carga.pendiente, carga.moneda)}
                      destacado={(carga.pendiente ?? 0) > 0}
                    />
                  </div>
                )}
              </div>

              {carga.pagos && carga.pagos.length > 0 && (
                <section aria-label="Pagos de esta carga">
                  <h3 className="mb-2 text-sm font-medium">Pagos</h3>
                  <ul className="divide-y rounded-lg border text-sm">
                    {carga.pagos.map((p) => (
                      <li key={p.id} className={cn("flex items-center justify-between gap-3 px-3 py-2", p.estado === "cancelado" && "text-muted-foreground line-through")}>
                        <span>
                          {etiquetaMetodo(p.metodo)}
                          {p.comprobante && (
                            <span className="ml-2 text-xs no-underline">
                              · {ETIQUETA_COMPROBANTE[p.comprobante.estado]}
                            </span>
                          )}
                        </span>
                        <span className="tabular-nums">{formatearMonto(p.monto, p.moneda)}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Acciones según en qué punto está la carga */}
              {accion === "terminar" && (
                <div className="grid gap-2 rounded-lg border p-3">
                  <Label htmlFor="sol-hora-fin">¿A qué hora terminó de cargar?</Label>
                  <Input
                    id="sol-hora-fin"
                    type="time"
                    value={horaFin}
                    onChange={(e) => setHoraFin(e.target.value)}
                    className="w-36"
                  />
                  <p className="text-xs text-muted-foreground">
                    Déjalo vacío si terminó ahora. Si el vehículo terminó antes y no se marcó, pon su hora real para no
                    cobrarle de más.
                  </p>
                  <div className="flex gap-2">
                    <Button onClick={terminar} disabled={ocupado}>
                      {ocupado && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Terminar carga
                    </Button>
                    <Button variant="ghost" onClick={() => setAccion(null)} disabled={ocupado}>
                      Volver
                    </Button>
                  </div>
                </div>
              )}

              {accion === "anular" && (
                <div className="grid gap-2 rounded-lg border border-red-200 p-3">
                  <Label htmlFor="sol-motivo-anular">Motivo de la anulación</Label>
                  <Textarea
                    id="sol-motivo-anular"
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    rows={2}
                    maxLength={200}
                  />
                  <div className="flex gap-2">
                    <Button variant="destructive" onClick={anular} disabled={ocupado || motivo.trim().length < 3}>
                      {ocupado && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Anular carga
                    </Button>
                    <Button variant="ghost" onClick={() => setAccion(null)} disabled={ocupado}>
                      Volver
                    </Button>
                  </div>
                </div>
              )}

              {accion === "retirar" && (
                <div className="grid gap-2 rounded-lg border p-3">
                  <p className="text-sm">
                    Confirma que el cliente se lleva su vehículo. El puesto {carga.puesto_codigo} quedará libre.
                  </p>
                  <div className="flex gap-2">
                    <Button onClick={retirar} disabled={ocupado}>
                      {ocupado && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Entregar vehículo
                    </Button>
                    <Button variant="ghost" onClick={() => setAccion(null)} disabled={ocupado}>
                      Volver
                    </Button>
                  </div>
                </div>
              )}

              {accion === null && (
                <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between sm:space-x-0">
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={imprimir}>
                      <Printer className="mr-2 h-4 w-4" />
                      Ticket
                    </Button>
                    {puedeAnular && ["cargando", "terminada", "cobrada"].includes(carga.estado) && (
                      <Button variant="ghost" className="text-red-700 hover:text-red-800" onClick={() => setAccion("anular")}>
                        <Ban className="mr-2 h-4 w-4" />
                        Anular
                      </Button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {carga.estado === "cargando" && (
                      <Button onClick={() => setAccion("terminar")}>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Terminar carga
                      </Button>
                    )}
                    {carga.estado === "terminada" && (
                      <Button onClick={() => setCobrando(true)}>
                        <Wallet className="mr-2 h-4 w-4" />
                        Cobrar
                      </Button>
                    )}
                    {carga.estado === "cobrada" && (
                      <Button onClick={() => setAccion("retirar")}>Entregar vehículo</Button>
                    )}
                  </div>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {carga && (
        <RegistrarPagoDialog
          open={cobrando}
          onOpenChange={setCobrando}
          solineraId={solineraId}
          carga={carga}
          configuracion={configuracion}
          onRegistrado={async () => {
            onCambio()
            const actualizada = await SolineraService.obtenerCarga(solineraId, carga.id).catch(() => null)
            if (actualizada) {
              setData(actualizada)
              // Saldada: lo siguiente es entregar el vehículo.
              if (actualizada.estado === "cobrada") setAccion("retirar")
            }
          }}
        />
      )}
    </>
  )
}

function Dato({ titulo, valor, sub }: { titulo: string; valor: string; sub?: string | null }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{titulo}</dt>
      <dd className="font-medium">{valor}</dd>
      {sub && <dd className="text-xs text-muted-foreground">{sub}</dd>}
    </div>
  )
}

function Cifra({ titulo, valor, destacado }: { titulo: string; valor: string; destacado?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{titulo}</p>
      <p className={cn("font-semibold tabular-nums", destacado && "text-amber-800")}>{valor}</p>
    </div>
  )
}
