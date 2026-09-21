"use client"

import { useMemo, useState } from "react"
import { AlertTriangle, Loader2, Pencil, Plus } from "lucide-react"
import { Button } from "@/components/shared/atom/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/shared/atom/alert-dialog"
import { Skeleton } from "@/components/shared/molecule/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shared/molecule/table"
import { useToast } from "@/hooks/use-toast"
import { usePermisosSolineras, useTarifas } from "@/hooks/use-solineras"
import { SolineraService } from "@/lib/services/feats/solineras/solinera-service"
import { TIPOS_VEHICULO, etiquetaVehiculo, formatearDuracion, formatearMonto } from "@/lib/utils/solineras"
import { cn } from "@/lib/utils"
import type { Tarifa, TipoVehiculo } from "@/lib/types/feats/solineras/solinera-types"
import { TarifaDialog } from "./tarifa-dialog"
import type { TabSolineraProps } from "./tab-props"

/** Tipos de vehículo que no tienen dónde cobrarse: sin tarifa propia activa y sin una general activa. */
function tiposSinTarifa(activas: Tarifa[]): TipoVehiculo[] {
  if (activas.some((t) => t.tipo_vehiculo === null)) return []
  return TIPOS_VEHICULO.map((t) => t.value).filter((tipo) => !activas.some((t) => t.tipo_vehiculo === tipo))
}

/** ["moto", "auto", "triciclo"] -> "moto, auto y triciclo" */
function unirLista(items: string[]): string {
  if (items.length <= 1) return items.join("")
  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`
}

const nombresDe = (tipos: TipoVehiculo[]) => tipos.map((t) => etiquetaVehiculo(t).toLowerCase())

/** formatearMonto redondea los CUP a la unidad; un precio por hora con decimales no debe mentir. */
function formatearPrecioHora(tarifa: Tarifa): string {
  if (tarifa.moneda === "CUP" && !Number.isInteger(tarifa.precio_hora)) {
    const numero = new Intl.NumberFormat("es-CU", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(tarifa.precio_hora)
    return `${numero} CUP`
  }
  return formatearMonto(tarifa.precio_hora, tarifa.moneda)
}

const formatearMinimo = (minutos: number) => (minutos === 0 ? "Sin mínimo" : formatearDuracion(minutos))

const nombreVehiculo = (tarifa: Tarifa) =>
  tarifa.tipo_vehiculo ? etiquetaVehiculo(tarifa.tipo_vehiculo) : "Todos los vehículos"

function EstadoTarifa({ activa }: { activa: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        activa ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700",
      )}
    >
      {activa ? "Activa" : "Inactiva"}
    </span>
  )
}

export function TarifasTab({ solinera }: TabSolineraProps) {
  const { toast } = useToast()
  const { puedeAdministrarRed } = usePermisosSolineras()
  const { data: tarifas, loading, refrescando, error, recargar } = useTarifas(solinera.id)

  const [dialogoAbierto, setDialogoAbierto] = useState(false)
  const [editada, setEditada] = useState<Tarifa | null>(null)
  const [confirmando, setConfirmando] = useState(false)
  const [aDesactivar, setADesactivar] = useState<Tarifa | null>(null)
  const [cambiando, setCambiando] = useState<string | null>(null)

  const activas = useMemo(() => (tarifas ?? []).filter((t) => t.activa), [tarifas])
  const sinTarifa = useMemo(() => tiposSinTarifa(activas), [activas])

  const abrirNueva = () => {
    setEditada(null)
    setDialogoAbierto(true)
  }

  const abrirEdicion = (tarifa: Tarifa) => {
    setEditada(tarifa)
    setDialogoAbierto(true)
  }

  const cambiarActiva = async (tarifa: Tarifa, activa: boolean) => {
    setCambiando(tarifa.id)
    try {
      await SolineraService.actualizarTarifa(solinera.id, tarifa.id, { activa })
      toast({ title: activa ? "Tarifa activada" : "Tarifa desactivada", description: tarifa.nombre })
      await recargar()
    } catch (err) {
      toast({
        title: activa ? "No se pudo activar la tarifa" : "No se pudo desactivar la tarifa",
        description: err instanceof Error ? err.message : "Inténtalo de nuevo",
        variant: "destructive",
      })
    } finally {
      setCambiando(null)
    }
  }

  const pedirDesactivar = (tarifa: Tarifa) => {
    setADesactivar(tarifa)
    setConfirmando(true)
  }

  /** Qué pasa con los vehículos de una tarifa si se desactiva, dicho con lo que hay ahora. */
  const consecuencia = (tarifa: Tarifa): string => {
    const restantes = activas.filter((t) => t.id !== tarifa.id)
    const nuevos = tiposSinTarifa(restantes).filter((tipo) => !sinTarifa.includes(tipo))
    if (nuevos.length > 0) {
      return `No se podrán iniciar cargas de ${unirLista(nombresDe(nuevos))} hasta que haya otra tarifa activa para ellos.`
    }
    if (tarifa.tipo_vehiculo !== null) {
      return `${nombreVehiculo(tarifa)} pasará a cobrarse con la tarifa general.`
    }
    return "Todos los tipos de vehículo siguen teniendo su propia tarifa."
  }

  const acciones = (tarifa: Tarifa, tamano: "default" | "sm") => (
    <>
      <Button
        variant="outline"
        size={tamano}
        onClick={() => abrirEdicion(tarifa)}
        aria-label={`Editar la tarifa ${tarifa.nombre}`}
      >
        <Pencil />
        Editar
      </Button>
      <Button
        variant="outline"
        size={tamano}
        disabled={cambiando !== null}
        onClick={() => (tarifa.activa ? pedirDesactivar(tarifa) : void cambiarActiva(tarifa, true))}
        aria-label={`${tarifa.activa ? "Desactivar" : "Activar"} la tarifa ${tarifa.nombre}`}
      >
        {cambiando === tarifa.id && <Loader2 className="animate-spin" />}
        {tarifa.activa ? "Desactivar" : "Activar"}
      </Button>
    </>
  )

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Se cobra por hora, en fracciones completas, y nunca menos del mínimo.
        </p>
        {puedeAdministrarRed && (
          <Button onClick={abrirNueva} className="sm:shrink-0">
            <Plus />
            Nueva tarifa
          </Button>
        )}
      </div>

      {tarifas && tarifas.length > 0 && sinTarifa.length > 0 && (
        <p
          role="status"
          className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {activas.length === 0
              ? "No hay ninguna tarifa activa: no se podrán iniciar cargas de ningún vehículo hasta crear una tarifa."
              : `Sin tarifa activa para ${unirLista(nombresDe(sinTarifa))}: no se podrán iniciar cargas de ese tipo hasta crear una tarifa.`}
          </span>
        </p>
      )}

      {error && !loading && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between"
        >
          <span>{tarifas ? `No se pudo actualizar la lista: ${error}` : error}</span>
          <Button variant="outline" onClick={() => void recargar()} disabled={refrescando}>
            {refrescando && <Loader2 className="animate-spin" />}
            Reintentar
          </Button>
        </div>
      )}

      {loading && !tarifas && (
        <div className="grid gap-2" aria-busy="true" aria-label="Cargando tarifas">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      )}

      {tarifas && tarifas.length === 0 && (
        <div className="rounded-lg border border-dashed p-6 text-sm">
          <p className="font-medium">Aún no hay tarifas en esta solinera</p>
          <p className="mt-1 text-muted-foreground">
            No se podrán iniciar cargas de ningún vehículo hasta crear una tarifa.
            {puedeAdministrarRed ? " Empieza con «Nueva tarifa»." : ""}
          </p>
        </div>
      )}

      {tarifas && tarifas.length > 0 && (
        <>
          {/* Móvil: una fila apilada por tarifa, sin scroll horizontal. */}
          <ul className="divide-y rounded-lg border bg-card md:hidden">
            {tarifas.map((t) => (
              <li key={t.id} className="grid gap-3 p-3">
                <div className={cn("grid gap-1", !t.activa && "opacity-60")}>
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 font-medium">{t.nombre}</p>
                    <EstadoTarifa activa={t.activa} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {nombreVehiculo(t)} · versión {t.version}
                  </p>
                  <p className="text-base font-semibold tabular-nums">{formatearPrecioHora(t)} por hora</p>
                  <p className="text-sm tabular-nums text-muted-foreground">
                    Fracción {formatearDuracion(t.fraccion_min)} · Mínimo {formatearMinimo(t.minimo_min)}
                  </p>
                </div>
                {puedeAdministrarRed && <div className="grid grid-cols-2 gap-2">{acciones(t, "default")}</div>}
              </li>
            ))}
          </ul>

          {/* Escritorio: tabla. */}
          <div className="hidden rounded-lg border bg-card md:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Nombre</TableHead>
                  <TableHead>Vehículo</TableHead>
                  <TableHead className="text-right">Precio por hora</TableHead>
                  <TableHead>Fracción</TableHead>
                  <TableHead>Mínimo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Versión</TableHead>
                  {puedeAdministrarRed && (
                    <TableHead>
                      <span className="sr-only">Acciones</span>
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {tarifas.map((t) => {
                  const atenuada = !t.activa && "opacity-60"
                  return (
                    <TableRow key={t.id}>
                      <TableCell className={cn("font-medium", atenuada)}>{t.nombre}</TableCell>
                      <TableCell className={atenuada || undefined}>{nombreVehiculo(t)}</TableCell>
                      <TableCell className={cn("text-right font-semibold tabular-nums", atenuada)}>
                        {formatearPrecioHora(t)}
                      </TableCell>
                      <TableCell className={cn("tabular-nums", atenuada)}>{formatearDuracion(t.fraccion_min)}</TableCell>
                      <TableCell className={cn("tabular-nums", atenuada)}>{formatearMinimo(t.minimo_min)}</TableCell>
                      <TableCell className={atenuada || undefined}>
                        <EstadoTarifa activa={t.activa} />
                      </TableCell>
                      <TableCell className={cn("text-right tabular-nums", atenuada)}>v{t.version}</TableCell>
                      {puedeAdministrarRed && (
                        <TableCell>
                          <div className="flex justify-end gap-2">{acciones(t, "sm")}</div>
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {puedeAdministrarRed && (
        <>
          <TarifaDialog
            open={dialogoAbierto}
            onOpenChange={setDialogoAbierto}
            solineraId={solinera.id}
            tarifa={editada}
            tarifas={tarifas ?? []}
            onGuardada={() => void recargar()}
          />

          <AlertDialog open={confirmando} onOpenChange={setConfirmando}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Desactivar «{aDesactivar?.nombre}»?</AlertDialogTitle>
                <AlertDialogDescription>
                  {aDesactivar ? consecuencia(aDesactivar) : ""} Las cargas en curso siguen con esta tarifa.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    if (aDesactivar) void cambiarActiva(aDesactivar, false)
                  }}
                >
                  Desactivar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  )
}
