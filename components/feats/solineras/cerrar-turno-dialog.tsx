"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, Info, Loader2, Plus } from "lucide-react"
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
import { SolineraService } from "@/lib/services/feats/solineras/solinera-service"
import { MONEDAS } from "@/lib/utils/solineras"
import { cn } from "@/lib/utils"
import type { MontosPorMoneda, Moneda, Turno } from "@/lib/types/feats/solineras/solinera-types"

const NOTA_MAX = 300

// --- Utilidades de montos del turno (las usa también la pestaña Turnos) --------

const redondear = (valor: number) => Math.round(valor * 100) / 100

/** Los CUP enteros van sin decimales; si trae centavos se muestran para no ocultar una diferencia real. */
export function formatearMontoExacto(monto: number, moneda: Moneda): string {
  const valor = redondear(monto)
  const decimales = moneda === "CUP" && Number.isInteger(valor) ? 0 : 2
  const numero = new Intl.NumberFormat("es-CU", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(Math.abs(valor))
  return `${valor < 0 ? "−" : ""}${numero} ${moneda}`
}

/** Diferencia de caja con signo: +50 CUP, −50 CUP, 0 CUP. */
export function formatearDiferencia(diferencia: number, moneda: Moneda): string {
  const valor = redondear(diferencia)
  if (valor === 0) return `0 ${moneda}`
  return `${valor > 0 ? "+" : ""}${formatearMontoExacto(valor, moneda)}`
}

/** Verde si cuadra, rojo si falta dinero, ámbar si sobra. */
export function claseDiferencia(diferencia: number): string {
  const valor = redondear(diferencia)
  if (valor === 0) return "text-emerald-700"
  return valor < 0 ? "text-red-700" : "text-amber-700"
}

export function etiquetaDiferencia(diferencia: number): string {
  const valor = redondear(diferencia)
  if (valor === 0) return "Cuadra"
  return valor < 0 ? "Falta" : "Sobra"
}

/** Las monedas que aparecen en cualquiera de los mapas, en el orden CUP, USD, EUR. */
export function monedasEn(...mapas: (MontosPorMoneda | undefined)[]): Moneda[] {
  return MONEDAS.filter((m) => mapas.some((mapa) => mapa && m in mapa))
}

/** Lo que debería haber en caja: el que trae el turno, o fondo + efectivo cobrado si el backend no lo envía. */
export function efectivoEsperadoDe(turno: Turno): MontosPorMoneda {
  if (turno.efectivo_esperado) return turno.efectivo_esperado
  const esperado: MontosPorMoneda = {}
  for (const m of monedasEn(turno.fondo_inicial, turno.totales?.efectivo)) {
    esperado[m] = redondear((turno.fondo_inicial[m] ?? 0) + (turno.totales?.efectivo?.[m] ?? 0))
  }
  return esperado
}

/** Lo que escribió la persona en un campo de monto: vacío, un número ≥ 0, o inválido (valor null). */
export function leerMonto(texto: string): { vacio: boolean; valor: number | null } {
  const limpio = texto.trim()
  if (limpio === "") return { vacio: true, valor: null }
  const numero = Number(limpio)
  return { vacio: false, valor: Number.isFinite(numero) && numero >= 0 ? redondear(numero) : null }
}

// --- Diálogo ---------------------------------------------------------------------

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  solineraId: string
  /** El turno tal como estaba al pulsar «Cerrar turno»: los esperados no cambian mientras se cuenta. */
  turno: Turno | null
  /** Monedas que acepta la solinera: solo de estas se ofrece «contar otra». */
  monedasAceptadas: Moneda[]
  onCerrado: (turno: Turno) => void
}

/**
 * Arqueo y cierre del turno. La persona cuenta el efectivo de cada moneda y ve al
 * momento cuánto falta o sobra; al cerrar, el diálogo pasa a un resumen.
 */
export function CerrarTurnoDialog({ open, onOpenChange, solineraId, turno, monedasAceptadas, onCerrado }: Props) {
  const { toast } = useToast()
  const [contado, setContado] = useState<Partial<Record<Moneda, string>>>({})
  const [extras, setExtras] = useState<Moneda[]>([])
  const [nota, setNota] = useState("")
  const [cerrando, setCerrando] = useState(false)
  const [resultado, setResultado] = useState<Turno | null>(null)

  useEffect(() => {
    if (!open) return
    setContado({})
    setExtras([])
    setNota("")
    setResultado(null)
  }, [open, turno?.id])

  const esperado = useMemo(() => (turno ? efectivoEsperadoDe(turno) : {}), [turno])
  const campos = MONEDAS.filter((m) => m in esperado || extras.includes(m))
  const anadibles = MONEDAS.filter((m) => !campos.includes(m) && monedasAceptadas.includes(m))

  const filas = campos.map((moneda) => {
    const esperadoMoneda = esperado[moneda] ?? 0
    const lectura = leerMonto(contado[moneda] ?? "")
    return {
      moneda,
      esperado: esperadoMoneda,
      requerido: esperadoMoneda !== 0,
      vacio: lectura.vacio,
      valor: lectura.valor,
      invalido: !lectura.vacio && lectura.valor === null,
      diferencia: lectura.valor === null ? null : redondear(lectura.valor - esperadoMoneda),
    }
  })

  const faltan = filas.filter((f) => f.requerido && f.vacio).map((f) => f.moneda)
  const hayInvalidos = filas.some((f) => f.invalido)
  const hayDiferencia = filas.some((f) => f.diferencia !== null && f.diferencia !== 0)
  const puedeCerrar = !!turno && !cerrando && faltan.length === 0 && !hayInvalidos
  const pendientes = turno?.totales?.comprobantes_pendientes ?? 0

  const cerrar = async () => {
    if (!turno || !puedeCerrar) return
    const montos: MontosPorMoneda = {}
    for (const f of filas) {
      if (f.valor !== null) montos[f.moneda] = f.valor
    }
    setCerrando(true)
    try {
      const cerrado = await SolineraService.cerrarTurno(solineraId, turno.id, {
        contado: montos,
        nota: nota.trim() || null,
      })
      toast({ title: "Turno cerrado" })
      setResultado(cerrado)
      onCerrado(cerrado)
    } catch (error) {
      toast({
        title: "No se pudo cerrar el turno",
        description: error instanceof Error ? error.message : "Inténtalo de nuevo",
        variant: "destructive",
      })
    } finally {
      setCerrando(false)
    }
  }

  // --- Resumen tras cerrar ---
  if (resultado) {
    const monedas = monedasEn(resultado.efectivo_esperado, resultado.efectivo_contado, resultado.diferencia)
    const sinCobrar = resultado.cargas_sin_cobrar ?? 0
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Turno cerrado</DialogTitle>
            <DialogDescription>Este es el arqueo que quedó registrado.</DialogDescription>
          </DialogHeader>

          {monedas.length === 0 ? (
            <p className="text-sm text-muted-foreground">No había efectivo en caja: no hubo nada que contar.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[22rem] text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th scope="col" className="py-2 pr-3 font-medium">
                      Moneda
                    </th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">
                      Esperado
                    </th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">
                      Contado
                    </th>
                    <th scope="col" className="py-2 pl-3 text-right font-medium">
                      Diferencia
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {monedas.map((m) => {
                    const esperadoM = resultado.efectivo_esperado?.[m] ?? 0
                    const contadoM = resultado.efectivo_contado?.[m]
                    const diferencia = resultado.diferencia?.[m]
                    return (
                      <tr key={m} className="border-b last:border-b-0">
                        <th scope="row" className="py-2.5 pr-3 text-left font-semibold">
                          {m}
                        </th>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {formatearMontoExacto(esperadoM, m)}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {contadoM === undefined ? "—" : formatearMontoExacto(contadoM, m)}
                        </td>
                        <td
                          className={cn(
                            "py-2.5 pl-3 text-right font-semibold tabular-nums",
                            diferencia === undefined ? "text-muted-foreground" : claseDiferencia(diferencia),
                          )}
                        >
                          {diferencia === undefined ? "—" : formatearDiferencia(diferencia, m)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {sinCobrar > 0 && (
            <p
              role="status"
              className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {sinCobrar === 1
                ? "Queda 1 carga terminada sin cobrar."
                : `Quedan ${sinCobrar} cargas terminadas sin cobrar.`}
            </p>
          )}

          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Listo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  // --- Arqueo ---
  return (
    <Dialog open={open} onOpenChange={(valor) => !cerrando && onOpenChange(valor)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Cerrar turno</DialogTitle>
          <DialogDescription>
            Cuenta el efectivo que hay en caja. La diferencia se calcula sobre lo que el sistema espera: el fondo
            inicial más lo cobrado en efectivo.
          </DialogDescription>
        </DialogHeader>

        {pendientes > 0 && (
          <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            {pendientes === 1
              ? "Hay 1 comprobante de pago por validar."
              : `Hay ${pendientes} comprobantes de pago por validar.`}
          </p>
        )}

        {filas.length === 0 ? (
          <p className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
            No se espera efectivo en caja: no hubo fondo inicial ni cobros en efectivo. Puedes cerrar el turno
            directamente.
          </p>
        ) : (
          <div className="grid gap-4">
            {filas.map((f) => (
              <div key={f.moneda} className="grid gap-2 border-b pb-4 last:border-b-0 last:pb-0">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-semibold">{f.moneda}</span>
                  <span className="text-sm text-muted-foreground">
                    Esperado{" "}
                    <span className="font-semibold tabular-nums text-foreground">
                      {formatearMontoExacto(f.esperado, f.moneda)}
                    </span>
                  </span>
                </div>
                <div className="grid grid-cols-[1fr_auto] items-start gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor={`contado-${f.moneda}`}>Efectivo contado en {f.moneda}</Label>
                    <Input
                      id={`contado-${f.moneda}`}
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="any"
                      value={contado[f.moneda] ?? ""}
                      onChange={(e) => setContado((c) => ({ ...c, [f.moneda]: e.target.value }))}
                      placeholder={f.requerido ? "Cuéntalo" : "0"}
                      aria-invalid={f.invalido}
                      className="h-11 tabular-nums"
                    />
                    {f.invalido && <p className="text-xs text-destructive">Escribe un monto de 0 o más.</p>}
                  </div>
                  <div className="min-w-[6.5rem] text-right" aria-live="polite">
                    <p className="text-sm font-medium leading-none">Diferencia</p>
                    {f.diferencia === null ? (
                      <p className="mt-2.5 text-base tabular-nums text-muted-foreground">—</p>
                    ) : (
                      <>
                        <p className={cn("mt-2 text-base font-semibold tabular-nums", claseDiferencia(f.diferencia))}>
                          {formatearDiferencia(f.diferencia, f.moneda)}
                        </p>
                        <p className={cn("text-xs", claseDiferencia(f.diferencia))}>
                          {etiquetaDiferencia(f.diferencia)}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {anadibles.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">¿Hay efectivo en otra moneda?</span>
            {anadibles.map((m) => (
              <Button
                key={m}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setExtras((e) => [...e, m])}
              >
                <Plus className="mr-1 h-4 w-4" />
                Contar {m}
              </Button>
            ))}
          </div>
        )}

        <div className="grid gap-1.5">
          <Label htmlFor="cierre-nota">Nota del cierre (opcional)</Label>
          <Textarea
            id="cierre-nota"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            maxLength={NOTA_MAX}
            rows={2}
            className="min-h-[60px]"
            placeholder={hayDiferencia ? "A qué se debe la diferencia" : "Alguna observación del turno"}
          />
          {hayDiferencia && nota.trim() === "" && (
            <p className="text-xs text-amber-800">Hay diferencia en la caja: conviene anotar a qué se debe.</p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {faltan.length > 0 && (
            <p className="text-xs text-muted-foreground sm:mr-auto sm:self-center">
              Falta contar el efectivo en {faltan.join(" y ")}.
            </p>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={cerrando}>
            Cancelar
          </Button>
          <Button onClick={cerrar} disabled={!puedeCerrar}>
            {cerrando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Cerrar turno
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
