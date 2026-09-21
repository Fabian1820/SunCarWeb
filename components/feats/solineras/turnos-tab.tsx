"use client"

import { useState } from "react"
import { AlertCircle, Info, Loader2 } from "lucide-react"
import { Button } from "@/components/shared/atom/button"
import { Skeleton } from "@/components/shared/molecule/skeleton"
import { AbrirTurnoDialog } from "@/components/feats/solineras/abrir-turno-dialog"
import {
  CerrarTurnoDialog,
  claseDiferencia,
  efectivoEsperadoDe,
  formatearDiferencia,
  formatearMontoExacto,
  monedasEn,
} from "@/components/feats/solineras/cerrar-turno-dialog"
import { useCarga } from "@/hooks/use-solineras"
import { useToast } from "@/hooks/use-toast"
import { SolineraService } from "@/lib/services/feats/solineras/solinera-service"
import { METODOS_PAGO, MONEDAS, formatearDuracion, formatearFechaHora } from "@/lib/utils/solineras"
import { cn } from "@/lib/utils"
import type { Moneda, MontosPorMoneda, Turno } from "@/lib/types/feats/solineras/solinera-types"
import type { TabSolineraProps } from "./tab-props"

const POR_PAGINA = 30
const MONEDAS_POR_DEFECTO: Moneda[] = ["CUP", "USD"]

export function TurnosTab({ solinera }: TabSolineraProps) {
  const { toast } = useToast()
  const [abriendo, setAbriendo] = useState(false)
  const [turnoACerrar, setTurnoACerrar] = useState<Turno | null>(null)
  const [preparandoCierre, setPreparandoCierre] = useState(false)
  const [pagina, setPagina] = useState(0)

  const aceptadas = MONEDAS.filter((m) => solinera.configuracion?.monedas_aceptadas.includes(m))
  const monedas = aceptadas.length > 0 ? aceptadas : MONEDAS_POR_DEFECTO

  // Los cobros de otras pantallas mueven los totales del turno: se refresca solo.
  const actual = useCarga<Turno | null>(() => SolineraService.turnoActual(solinera.id), [solinera.id], {
    intervaloMs: 30_000,
  })
  const historial = useCarga(
    () => SolineraService.listarTurnos(solinera.id, pagina * POR_PAGINA, POR_PAGINA),
    [solinera.id, pagina],
  )

  const refrescarHistorial = () => {
    if (pagina === 0) void historial.recargar()
    else setPagina(0)
  }

  // Antes del arqueo se pide el turno fresco: lo esperado debe incluir lo último que se cobró.
  const iniciarCierre = async () => {
    setPreparandoCierre(true)
    try {
      const fresco = await SolineraService.turnoActual(solinera.id)
      actual.setData(fresco)
      if (fresco) setTurnoACerrar(fresco)
      else toast({ title: "Ya no hay un turno abierto", description: "Otra persona lo cerró hace un momento." })
    } catch (error) {
      toast({
        title: "No se pudo preparar el cierre",
        description: error instanceof Error ? error.message : "Inténtalo de nuevo",
        variant: "destructive",
      })
    } finally {
      setPreparandoCierre(false)
    }
  }

  const turno = actual.data

  return (
    <div className="grid gap-4">
      {/* --- Turno actual -------------------------------------------------- */}
      <section aria-labelledby="turno-actual" className="rounded-lg border bg-card p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 id="turno-actual" className="text-base font-semibold">
              Turno actual
            </h2>
            {turno && (
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                Abierto
              </span>
            )}
          </div>
          {turno === null && (
            <Button onClick={() => setAbriendo(true)}>Abrir turno</Button>
          )}
          {turno && (
            <Button variant="outline" onClick={() => void iniciarCierre()} disabled={preparandoCierre}>
              {preparandoCierre && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cerrar turno
            </Button>
          )}
        </div>

        <div className="mt-4">
          {actual.loading ? (
            <div className="grid gap-3" aria-busy="true">
              <Skeleton className="h-5 w-64" />
              <Skeleton className="h-24" />
            </div>
          ) : actual.error && turno === undefined ? (
            <BloqueError mensaje={actual.error} onReintentar={() => void actual.recargar()} />
          ) : turno === null ? (
            <div>
              <p className="text-lg font-medium">No hay turno abierto</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Mientras no haya un turno abierto no se pueden iniciar cargas ni registrar cobros.
              </p>
            </div>
          ) : turno ? (
            <DetalleTurno turno={turno} />
          ) : null}
        </div>
      </section>

      {/* --- Historial ------------------------------------------------------ */}
      <section aria-labelledby="turnos-historial" className="rounded-lg border bg-card">
        <div className="flex items-baseline justify-between gap-3 p-4 pb-3 sm:p-5 sm:pb-3">
          <h2 id="turnos-historial" className="text-base font-semibold">
            Historial de turnos
          </h2>
          {historial.data && historial.data.total > 0 && (
            <span className="text-sm tabular-nums text-muted-foreground">{historial.data.total}</span>
          )}
        </div>

        {historial.loading ? (
          <div className="grid gap-2 p-4 pt-0 sm:p-5 sm:pt-0" aria-busy="true">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        ) : historial.error && !historial.data ? (
          <div className="p-4 pt-0 sm:p-5 sm:pt-0">
            <BloqueError mensaje={historial.error} onReintentar={() => void historial.recargar()} />
          </div>
        ) : !historial.data || historial.data.data.length === 0 ? (
          <p className="px-4 pb-8 pt-4 text-center text-sm text-muted-foreground sm:px-5">
            Todavía no se ha abierto ningún turno.
          </p>
        ) : (
          <>
            <TablaTurnos turnos={historial.data.data} />
            <Paginacion
              pagina={pagina}
              total={historial.data.total}
              cargando={historial.refrescando}
              onCambiar={setPagina}
            />
          </>
        )}
      </section>

      <AbrirTurnoDialog
        open={abriendo}
        onOpenChange={setAbriendo}
        solineraId={solinera.id}
        monedas={monedas}
        onAbierto={(nuevo) => {
          actual.setData(nuevo)
          refrescarHistorial()
        }}
      />
      <CerrarTurnoDialog
        open={turnoACerrar !== null}
        onOpenChange={(abierto) => !abierto && setTurnoACerrar(null)}
        solineraId={solinera.id}
        turno={turnoACerrar}
        monedasAceptadas={monedas}
        onCerrado={() => {
          actual.setData(null)
          refrescarHistorial()
        }}
      />
    </div>
  )
}

// --- Detalle del turno abierto --------------------------------------------------

function DetalleTurno({ turno }: { turno: Turno }) {
  const esperado = efectivoEsperadoDe(turno)
  const minutosAbierto = (Date.now() - Date.parse(turno.abierto_en)) / 60_000
  const metodos = METODOS_PAGO.filter((m) => {
    const montos = turno.totales?.por_metodo?.[m.value]
    return montos && monedasEn(montos).length > 0
  })
  const pendientes = turno.totales?.comprobantes_pendientes ?? 0

  return (
    <div className="grid gap-5">
      <div>
        <p className="text-sm">
          Abierto por <span className="font-medium">{turno.abierto_por_nombre ?? "—"}</span> el{" "}
          <span className="tabular-nums">{formatearFechaHora(turno.abierto_en)}</span>
          {minutosAbierto >= 1 && (
            <span className="text-muted-foreground"> · lleva {formatearDuracion(minutosAbierto)}</span>
          )}
        </p>
        {turno.nota_apertura && <p className="mt-1 text-sm text-muted-foreground">Nota: {turno.nota_apertura}</p>}
      </div>

      <dl className="grid gap-6 border-t pt-5 md:grid-cols-3">
        <div>
          <dt className="text-sm font-medium text-muted-foreground">Fondo inicial</dt>
          <dd className="mt-2">
            <ListaMontos montos={turno.fondo_inicial} vacio="Sin fondo inicial" />
          </dd>
        </div>

        <div>
          <dt className="text-sm font-medium text-muted-foreground">Cobrado en el turno</dt>
          <dd className="mt-2">
            {metodos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Todavía no se ha cobrado nada</p>
            ) : (
              <ul className="grid gap-1.5">
                {metodos.map((m) => (
                  <li key={m.value} className="flex items-start justify-between gap-3 text-sm">
                    <span>{m.label}</span>
                    <ListaMontos montos={turno.totales.por_metodo[m.value] ?? {}} alinearDerecha pequeno />
                  </li>
                ))}
              </ul>
            )}
          </dd>
        </div>

        <div>
          <dt className="text-sm font-medium text-muted-foreground">Efectivo esperado en caja</dt>
          <dd className="mt-2">
            <ListaMontos montos={esperado} vacio="Sin efectivo" destacado />
            <p className="mt-1 text-xs text-muted-foreground">Fondo inicial más lo cobrado en efectivo.</p>
          </dd>
        </div>
      </dl>

      {pendientes > 0 && (
        <p
          role="status"
          className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
        >
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          {pendientes === 1
            ? "Hay 1 comprobante de pago por validar."
            : `Hay ${pendientes} comprobantes de pago por validar.`}
        </p>
      )}
    </div>
  )
}

/** Una línea por moneda, alineadas y con cifras tabulares. */
function ListaMontos({
  montos,
  vacio,
  destacado,
  pequeno,
  alinearDerecha,
}: {
  montos: MontosPorMoneda
  vacio?: string
  destacado?: boolean
  pequeno?: boolean
  alinearDerecha?: boolean
}) {
  const monedas = monedasEn(montos)
  if (monedas.length === 0) {
    return vacio ? <p className="text-sm text-muted-foreground">{vacio}</p> : <span>—</span>
  }
  return (
    <ul className={cn("grid gap-0.5", alinearDerecha && "text-right")}>
      {monedas.map((m) => (
        <li
          key={m}
          className={cn(
            "tabular-nums",
            destacado ? "text-xl font-semibold" : pequeno ? "text-sm font-medium" : "text-base font-medium",
          )}
        >
          {formatearMontoExacto(montos[m] ?? 0, m)}
        </li>
      ))}
    </ul>
  )
}

// --- Historial ------------------------------------------------------------------

/** Una línea por moneda, con la misma fila para cada moneda en las tres columnas de dinero. */
function CeldaMontos({
  monedas,
  montos,
  conSigno,
}: {
  monedas: Moneda[]
  montos: MontosPorMoneda | undefined
  conSigno?: boolean
}) {
  if (!montos || monedas.length === 0) return <span className="text-muted-foreground">—</span>
  return (
    <ul className="grid gap-0.5">
      {monedas.map((m) => {
        const valor = montos[m]
        if (valor === undefined) {
          return (
            <li key={m} className="text-muted-foreground">
              —
            </li>
          )
        }
        return (
          <li key={m} className={cn("tabular-nums", conSigno && cn("font-medium", claseDiferencia(valor)))}>
            {conSigno ? formatearDiferencia(valor, m) : formatearMontoExacto(valor, m)}
          </li>
        )
      })}
    </ul>
  )
}

function TablaTurnos({ turnos }: { turnos: Turno[] }) {
  return (
    <div className="overflow-x-auto border-t">
      <table className="w-full min-w-[56rem] text-sm">
        <thead>
          <tr className="border-b bg-muted/40 text-left text-muted-foreground">
            <th scope="col" className="px-4 py-2.5 font-medium sm:pl-5">
              Abierto por
            </th>
            <th scope="col" className="px-3 py-2.5 font-medium">
              Abierto
            </th>
            <th scope="col" className="px-3 py-2.5 font-medium">
              Cerrado
            </th>
            <th scope="col" className="px-3 py-2.5 font-medium">
              Esperado
            </th>
            <th scope="col" className="px-3 py-2.5 font-medium">
              Contado
            </th>
            <th scope="col" className="px-3 py-2.5 font-medium">
              Diferencia
            </th>
            <th scope="col" className="px-4 py-2.5 font-medium sm:pr-5">
              Nota de cierre
            </th>
          </tr>
        </thead>
        <tbody>
          {turnos.map((t) => {
            const abierto = t.estado === "abierto"
            const monedas = monedasEn(t.efectivo_esperado, t.efectivo_contado, t.diferencia)
            return (
              <tr key={t.id} className="border-b align-top last:border-b-0">
                <td className="px-4 py-3 sm:pl-5">
                  <span className="font-medium">{t.abierto_por_nombre ?? "—"}</span>
                </td>
                <td className="whitespace-nowrap px-3 py-3 tabular-nums">{formatearFechaHora(t.abierto_en)}</td>
                <td className="whitespace-nowrap px-3 py-3">
                  {abierto ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                      Abierto
                    </span>
                  ) : (
                    <>
                      <span className="tabular-nums">{formatearFechaHora(t.cerrado_en)}</span>
                      {t.cerrado_por_nombre && (
                        <span className="block text-xs text-muted-foreground">{t.cerrado_por_nombre}</span>
                      )}
                    </>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-3">
                  <CeldaMontos monedas={monedas} montos={abierto ? undefined : t.efectivo_esperado} />
                </td>
                <td className="whitespace-nowrap px-3 py-3">
                  <CeldaMontos monedas={monedas} montos={abierto ? undefined : t.efectivo_contado} />
                </td>
                <td className="whitespace-nowrap px-3 py-3">
                  <CeldaMontos monedas={monedas} montos={abierto ? undefined : t.diferencia} conSigno />
                </td>
                <td className="min-w-[12rem] max-w-xs px-4 py-3 text-muted-foreground sm:pr-5">
                  {t.nota_cierre || "—"}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function Paginacion({
  pagina,
  total,
  cargando,
  onCambiar,
}: {
  pagina: number
  total: number
  cargando: boolean
  onCambiar: (pagina: number) => void
}) {
  const desde = pagina * POR_PAGINA + 1
  const hasta = Math.min((pagina + 1) * POR_PAGINA, total)
  const hayMas = hasta < total
  if (total <= POR_PAGINA) return null
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t p-3 sm:px-5">
      <p className="text-sm tabular-nums text-muted-foreground">
        {desde}–{hasta} de {total}
      </p>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => onCambiar(pagina - 1)} disabled={pagina === 0 || cargando}>
          Anterior
        </Button>
        <Button variant="outline" onClick={() => onCambiar(pagina + 1)} disabled={!hayMas || cargando}>
          Siguiente
        </Button>
      </div>
    </div>
  )
}

function BloqueError({ mensaje, onReintentar }: { mensaje: string; onReintentar: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-center">
      <p className="flex items-center gap-2 text-sm text-red-800">
        <AlertCircle className="h-4 w-4 shrink-0" />
        {mensaje}
      </p>
      <Button type="button" variant="outline" onClick={onReintentar}>
        Reintentar
      </Button>
    </div>
  )
}
