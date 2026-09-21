"use client"

import { useEffect, useRef, useState } from "react"
import { FileCheck2, Loader2, Paperclip } from "lucide-react"
import { Button } from "@/components/shared/atom/button"
import { Label } from "@/components/shared/atom/label"
import { Input } from "@/components/shared/molecule/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog"
import { useToast } from "@/hooks/use-toast"
import { SolineraService } from "@/lib/services/feats/solineras/solinera-service"
import { METODOS_PAGO, formatearMonto } from "@/lib/utils/solineras"
import { cn } from "@/lib/utils"
import { aplicadoEnMonedaCarga, leerNumero, pendienteEnMoneda } from "./panel-utils"
import type {
  Carga,
  ConfiguracionSolinera,
  MetodoPago,
  Moneda,
  PagoSolinera,
} from "@/lib/types/feats/solineras/solinera-types"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  solineraId: string
  carga: Carga
  configuracion: ConfiguracionSolinera
  onRegistrado: (pago: PagoSolinera) => void
}

const TAMANO_MAX = 5 * 1024 * 1024

/** Redondea a la unidad los CUP y al centavo el resto, como se cobra en la calle. */
function redondear(valor: number, moneda: Moneda): number {
  return moneda === "CUP" ? Math.round(valor) : Math.round(valor * 100) / 100
}

export function RegistrarPagoDialog({
  open,
  onOpenChange,
  solineraId,
  carga,
  configuracion,
  onRegistrado,
}: Props) {
  const { toast } = useToast()
  const pendiente = carga.pendiente ?? 0
  const metodos = METODOS_PAGO.filter((m) => configuracion.metodos_pago.includes(m.value))

  const [metodo, setMetodo] = useState<MetodoPago>(metodos[0]?.value ?? "efectivo")
  const [moneda, setMoneda] = useState<Moneda>(carga.moneda)
  const [tasa, setTasa] = useState("")
  const [monto, setMonto] = useState("")
  const [recibido, setRecibido] = useState("")
  const [transaccion, setTransaccion] = useState("")
  const [comprobante, setComprobante] = useState<{ url: string; nombre: string } | null>(null)
  const [subiendo, setSubiendo] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const entradaArchivo = useRef<HTMLInputElement>(null)

  const electronico = METODOS_PAGO.find((m) => m.value === metodo)?.electronico ?? false
  const tasaNumero = leerNumero(tasa)
  const montoNumero = leerNumero(monto)
  const cambiaMoneda = moneda !== carga.moneda

  // Cada vez que se abre, todo vuelve al punto de partida: lo que falta, en la
  // moneda de la carga y en el primer método aceptado.
  useEffect(() => {
    if (!open) return
    setMetodo(metodos[0]?.value ?? "efectivo")
    setMoneda(carga.moneda)
    setTasa("")
    setMonto(String(redondear(pendiente, carga.moneda)))
    setRecibido("")
    setTransaccion("")
    setComprobante(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, carga.id, pendiente])

  // Al cambiar de moneda o de tasa se propone de nuevo lo que falta en esa moneda.
  const proponerMonto = (nuevaMoneda: Moneda, tasaTexto: string) => {
    const enMoneda = pendienteEnMoneda(pendiente, carga.moneda, nuevaMoneda, leerNumero(tasaTexto))
    if (enMoneda === null) {
      setMonto("")
      return
    }
    let propuesto = redondear(enMoneda, nuevaMoneda)
    // Redondear hacia arriba podría pasarse de lo pendiente: el backend lo rechaza.
    const aplicado = aplicadoEnMonedaCarga(propuesto, nuevaMoneda, carga.moneda, leerNumero(tasaTexto))
    if (aplicado !== null && aplicado > pendiente + (carga.moneda === "CUP" ? 1 : 0.01)) {
      propuesto = Math.floor(enMoneda * 100) / 100
    }
    setMonto(String(propuesto))
  }

  const aplicado = aplicadoEnMonedaCarga(montoNumero, moneda, carga.moneda, tasaNumero)
  const conversionImposible = cambiaMoneda && carga.moneda !== "CUP" && moneda !== "CUP"
  const excede =
    aplicado !== null && aplicado > pendiente + (carga.moneda === "CUP" ? 1 : 0.01)
  const restante = aplicado !== null ? pendiente - aplicado : null
  const recibidoNumero = leerNumero(recibido)
  const cambio = metodo === "efectivo" && !cambiaMoneda && recibidoNumero > montoNumero ? recibidoNumero - montoNumero : 0

  const subirArchivo = async (archivo: File) => {
    if (archivo.size > TAMANO_MAX) {
      toast({ title: "El archivo es muy grande", description: "El máximo es 5 MB.", variant: "destructive" })
      return
    }
    setSubiendo(true)
    try {
      const { url } = await SolineraService.subirComprobante(solineraId, archivo)
      setComprobante({ url, nombre: archivo.name })
    } catch (error) {
      setComprobante(null)
      toast({
        title: "No se pudo subir el comprobante",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      })
    } finally {
      setSubiendo(false)
      if (entradaArchivo.current) entradaArchivo.current.value = ""
    }
  }

  const valido =
    montoNumero > 0 &&
    !excede &&
    !conversionImposible &&
    (!cambiaMoneda || tasaNumero > 0) &&
    (!electronico || (transaccion.trim().length >= 3 && comprobante !== null)) &&
    !subiendo &&
    !guardando

  const guardar = async () => {
    setGuardando(true)
    try {
      const pago = await SolineraService.registrarPago(solineraId, {
        carga_id: carga.id,
        metodo,
        monto: montoNumero,
        moneda,
        tasa_cambio: cambiaMoneda ? tasaNumero : null,
        numero_transaccion: electronico ? transaccion.trim() : null,
        comprobante_url: electronico ? comprobante?.url ?? null : null,
      })
      toast({
        title: "Pago registrado",
        description: `${formatearMonto(pago.monto, pago.moneda)} · ${METODOS_PAGO.find((m) => m.value === pago.metodo)?.label}`,
      })
      onRegistrado(pago)
      onOpenChange(false)
    } catch (error) {
      toast({
        title: "No se pudo registrar el pago",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cobrar {carga.codigo}</DialogTitle>
          <DialogDescription>
            Falta cobrar{" "}
            <strong className="tabular-nums text-foreground">{formatearMonto(pendiente, carga.moneda)}</strong> de{" "}
            {formatearMonto(carga.importe, carga.moneda)}. Puedes pagarlo en partes y con distintos métodos.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label>Método de pago</Label>
            <div className="grid grid-cols-2 gap-2">
              {metodos.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  aria-pressed={metodo === m.value}
                  onClick={() => setMetodo(m.value)}
                  className={cn(
                    "h-11 rounded-lg border px-3 text-sm font-medium transition-colors",
                    metodo === m.value ? "border-primary bg-primary/5 text-primary" : "hover:border-primary/50",
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Moneda</Label>
              <Select
                value={moneda}
                onValueChange={(v) => {
                  setMoneda(v as Moneda)
                  proponerMonto(v as Moneda, tasa)
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {configuracion.monedas_aceptadas.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {cambiaMoneda && (
              <div className="grid gap-1.5">
                <Label htmlFor="sol-pago-tasa">CUP por 1 {moneda === "CUP" ? carga.moneda : moneda}</Label>
                <Input
                  id="sol-pago-tasa"
                  inputMode="decimal"
                  value={tasa}
                  onChange={(e) => {
                    setTasa(e.target.value)
                    proponerMonto(moneda, e.target.value)
                  }}
                  placeholder="Tasa del día"
                />
              </div>
            )}
          </div>

          {conversionImposible && (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
              Esta carga está en {carga.moneda}: se puede pagar en {carga.moneda} o en CUP, no en {moneda}.
            </p>
          )}

          <div className="grid gap-1.5">
            <Label htmlFor="sol-pago-monto">Monto que entra en caja ({moneda})</Label>
            <Input
              id="sol-pago-monto"
              inputMode="decimal"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              className="tabular-nums"
              aria-invalid={excede}
            />
            {cambiaMoneda && aplicado !== null && montoNumero > 0 && (
              <p className="text-xs text-muted-foreground">
                Cubre {formatearMonto(redondear(aplicado, carga.moneda), carga.moneda)} de la carga.
              </p>
            )}
            {excede && <p className="text-xs text-destructive">Es más de lo que falta por cobrar.</p>}
            {!excede && restante !== null && restante > (carga.moneda === "CUP" ? 1 : 0.01) && montoNumero > 0 && (
              <p className="text-xs text-muted-foreground">
                Después de este pago quedarán {formatearMonto(redondear(restante, carga.moneda), carga.moneda)} por
                cobrar.
              </p>
            )}
          </div>

          {metodo === "efectivo" && !cambiaMoneda && (
            <div className="grid gap-1.5">
              <Label htmlFor="sol-pago-recibido">El cliente entrega (opcional)</Label>
              <Input
                id="sol-pago-recibido"
                inputMode="decimal"
                value={recibido}
                onChange={(e) => setRecibido(e.target.value)}
                className="tabular-nums"
              />
              {cambio > 0 && (
                <p className="text-sm font-medium tabular-nums text-foreground">
                  Devolver de cambio: {formatearMonto(redondear(cambio, moneda), moneda)}
                </p>
              )}
            </div>
          )}

          {electronico && (
            <>
              <div className="grid gap-1.5">
                <Label htmlFor="sol-pago-trx">Número de transacción</Label>
                <Input
                  id="sol-pago-trx"
                  value={transaccion}
                  onChange={(e) => setTransaccion(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Captura o PDF del comprobante</Label>
                <input
                  ref={entradaArchivo}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  className="sr-only"
                  id="sol-pago-archivo"
                  onChange={(e) => {
                    const archivo = e.target.files?.[0]
                    if (archivo) void subirArchivo(archivo)
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 justify-start"
                  onClick={() => entradaArchivo.current?.click()}
                  disabled={subiendo}
                >
                  {subiendo ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : comprobante ? (
                    <FileCheck2 className="mr-2 h-4 w-4 text-emerald-700" />
                  ) : (
                    <Paperclip className="mr-2 h-4 w-4" />
                  )}
                  <span className="truncate">
                    {subiendo ? "Subiendo…" : comprobante ? comprobante.nombre : "Adjuntar comprobante"}
                  </span>
                </Button>
                <p className="text-xs text-muted-foreground">
                  Quedará por validar hasta que contabilidad lo revise. JPG, PNG, WEBP o PDF, hasta 5 MB.
                </p>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={guardando}>
            Cancelar
          </Button>
          <Button onClick={guardar} disabled={!valido}>
            {guardando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Registrar pago
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
