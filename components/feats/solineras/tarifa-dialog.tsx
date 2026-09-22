"use client"

import { useState, type FormEvent } from "react"
import { AlertTriangle, Loader2 } from "lucide-react"
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
import { MONEDAS, TIPOS_VEHICULO, etiquetaVehiculo, formatearMonto } from "@/lib/utils/solineras"
import { calcularImporte } from "@/lib/utils/solineras-importe"
import type { Moneda, Tarifa, TipoVehiculo } from "@/lib/types/feats/solineras/solinera-types"

const TODOS = "todos"
type ValorTipo = TipoVehiculo | typeof TODOS

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  solineraId: string
  /** null = crear una tarifa nueva. */
  tarifa: Tarifa | null
  /** Todas las de la solinera: sirve para avisar de que ya hay una activa para ese vehículo. */
  tarifas: Tarifa[]
  onGuardada: () => void
}

export function TarifaDialog({ open, onOpenChange, solineraId, tarifa, tarifas, onGuardada }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* El formulario solo existe con el diálogo abierto: cada apertura arranca con sus valores. */}
      <DialogContent className="max-w-lg">
        <FormularioTarifa
          solineraId={solineraId}
          tarifa={tarifa}
          tarifas={tarifas}
          onCerrar={() => onOpenChange(false)}
          onGuardada={onGuardada}
        />
      </DialogContent>
    </Dialog>
  )
}

/** "3,5" y "3.5" valen lo mismo: en el mostrador se teclea con coma. */
function parsearDecimal(texto: string): number | null {
  const limpio = texto.trim().replace(",", ".")
  return /^\d+(\.\d+)?$/.test(limpio) ? Number(limpio) : null
}

function parsearEntero(texto: string): number | null {
  const limpio = texto.trim()
  return /^\d+$/.test(limpio) ? Number(limpio) : null
}

function entre(valor: number | null, minimo: number, maximo: number): boolean {
  return valor !== null && valor >= minimo && valor <= maximo
}

function FormularioTarifa({
  solineraId,
  tarifa,
  tarifas,
  onCerrar,
  onGuardada,
}: {
  solineraId: string
  tarifa: Tarifa | null
  tarifas: Tarifa[]
  onCerrar: () => void
  onGuardada: () => void
}) {
  const { toast } = useToast()
  const editando = tarifa !== null

  const [tipo, setTipo] = useState<ValorTipo>(tarifa?.tipo_vehiculo ?? TODOS)
  const [nombre, setNombre] = useState(tarifa?.nombre ?? "")
  const [moneda, setMoneda] = useState<Moneda>(tarifa?.moneda ?? "CUP")
  const [precio, setPrecio] = useState(tarifa ? String(tarifa.precio_hora) : "")
  const [fraccion, setFraccion] = useState(String(tarifa?.fraccion_min ?? 15))
  const [minimo, setMinimo] = useState(String(tarifa?.minimo_min ?? 30))
  const [ejemplo, setEjemplo] = useState("70")
  const [guardando, setGuardando] = useState(false)

  const tipoVehiculo: TipoVehiculo | null = tipo === TODOS ? null : tipo
  const nombreSugerido = tipoVehiculo
    ? `Tarifa ${etiquetaVehiculo(tipoVehiculo).toLowerCase()}`
    : "Tarifa general"

  const precioNum = parsearDecimal(precio)
  const fraccionNum = parsearEntero(fraccion)
  const minimoNum = parsearEntero(minimo)
  const ejemploNum = parsearEntero(ejemplo)

  const errorPrecio =
    precio.trim() === ""
      ? null
      : precioNum === null
        ? "Escribe un número, por ejemplo 300 o 3,50."
        : precioNum <= 0
          ? "El precio tiene que ser mayor que cero."
          : precioNum > 1_000_000
            ? "El precio máximo es 1 000 000."
            : null
  const errorFraccion = entre(fraccionNum, 1, 120) ? null : "Un número entero de minutos, entre 1 y 120."
  const errorMinimo = entre(minimoNum, 0, 480) ? null : "Un número entero de minutos, entre 0 y 480."
  const errorNombre = editando && nombre.trim() === "" ? "Escribe un nombre para la tarifa." : null

  // Solo puede haber una tarifa activa por tipo de vehículo (y una general). Se avisa
  // antes de enviar; el backend lo comprueba de todos modos y su mensaje se muestra.
  const activaExistente = editando
    ? undefined
    : tarifas.find((t) => t.activa && t.tipo_vehiculo === tipoVehiculo)

  const precioValido = precioNum !== null && precioNum > 0 && precioNum <= 1_000_000
  const puedeGuardar =
    precioValido &&
    !errorFraccion &&
    !errorMinimo &&
    !errorNombre &&
    !activaExistente &&
    !guardando

  const vista =
    precioValido && fraccionNum !== null && minimoNum !== null && !errorFraccion && !errorMinimo && ejemploNum !== null
      ? calcularImporte(
          { precio_hora: precioNum, fraccion_min: fraccionNum, minimo_min: minimoNum, moneda },
          ejemploNum,
        )
      : null

  const guardar = async (evento: FormEvent) => {
    evento.preventDefault()
    if (!puedeGuardar || precioNum === null || fraccionNum === null || minimoNum === null) return
    setGuardando(true)
    try {
      if (tarifa) {
        await SolineraService.actualizarTarifa(solineraId, tarifa.id, {
          nombre: nombre.trim(),
          moneda,
          precio_hora: precioNum,
          fraccion_min: fraccionNum,
          minimo_min: minimoNum,
        })
        toast({ title: "Tarifa actualizada" })
      } else {
        await SolineraService.crearTarifa(solineraId, {
          nombre: nombre.trim() || nombreSugerido,
          tipo_vehiculo: tipoVehiculo,
          moneda,
          precio_hora: precioNum,
          fraccion_min: fraccionNum,
          minimo_min: minimoNum,
        })
        toast({ title: "Tarifa creada" })
      }
      onGuardada()
      onCerrar()
    } catch (error) {
      toast({
        title: editando ? "No se pudo actualizar la tarifa" : "No se pudo crear la tarifa",
        description: error instanceof Error ? error.message : "Inténtalo de nuevo",
        variant: "destructive",
      })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{editando ? "Editar tarifa" : "Nueva tarifa"}</DialogTitle>
        <DialogDescription>
          {tarifa
            ? `${tarifa.nombre} · versión ${tarifa.version}`
            : "Se cobra por hora, en fracciones completas, y nunca menos del mínimo."}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={guardar} noValidate className="grid gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="tar-tipo">Vehículo</Label>
          <Select value={tipo} onValueChange={(v) => setTipo(v as ValorTipo)} disabled={editando}>
            <SelectTrigger id="tar-tipo">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos los vehículos</SelectItem>
              {TIPOS_VEHICULO.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {editando ? (
            <p className="text-xs text-muted-foreground">
              El vehículo no se puede cambiar: para otro tipo, crea una tarifa nueva.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              «Todos los vehículos» se usa con los tipos que no tengan tarifa propia.
            </p>
          )}
        </div>

        {activaExistente && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Ya hay una tarifa activa para{" "}
              {tipoVehiculo ? etiquetaVehiculo(tipoVehiculo).toLowerCase() : "todos los vehículos"}: «
              {activaExistente.nombre}». Edítala o desactívala antes de crear otra.
            </span>
          </p>
        )}

        <div className="grid gap-1.5">
          <Label htmlFor="tar-nombre">Nombre{editando ? "" : " (opcional)"}</Label>
          <Input
            id="tar-nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder={nombreSugerido}
            maxLength={60}
            autoComplete="off"
            aria-invalid={errorNombre !== null}
          />
          {errorNombre && <p className="text-xs text-destructive">{errorNombre}</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="tar-moneda">Moneda</Label>
            <Select value={moneda} onValueChange={(v) => setMoneda(v as Moneda)}>
              <SelectTrigger id="tar-moneda">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONEDAS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="tar-precio">Precio por hora ({moneda})</Label>
            <Input
              id="tar-precio"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              inputMode="decimal"
              autoComplete="off"
              className="tabular-nums"
              aria-invalid={errorPrecio !== null}
              autoFocus={!editando}
            />
            {errorPrecio && <p className="text-xs text-destructive">{errorPrecio}</p>}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="tar-fraccion">Fracción (min)</Label>
            <Input
              id="tar-fraccion"
              value={fraccion}
              onChange={(e) => setFraccion(e.target.value)}
              inputMode="numeric"
              autoComplete="off"
              className="tabular-nums"
              aria-invalid={errorFraccion !== null}
            />
            {errorFraccion ? (
              <p className="text-xs text-destructive">{errorFraccion}</p>
            ) : (
              <p className="text-xs text-muted-foreground">Se cobra por fracciones completas.</p>
            )}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="tar-minimo">Mínimo (min)</Label>
            <Input
              id="tar-minimo"
              value={minimo}
              onChange={(e) => setMinimo(e.target.value)}
              inputMode="numeric"
              autoComplete="off"
              className="tabular-nums"
              aria-invalid={errorMinimo !== null}
            />
            {errorMinimo ? (
              <p className="text-xs text-destructive">{errorMinimo}</p>
            ) : (
              <p className="text-xs text-muted-foreground">Nunca se cobra menos. 0 = sin mínimo.</p>
            )}
          </div>
        </div>

        <div className="grid gap-2 rounded-lg border bg-muted/40 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">Vista previa</p>
            <div className="flex items-center gap-2">
              <Label htmlFor="tar-ejemplo" className="text-xs font-normal text-muted-foreground">
                Duración de ejemplo
              </Label>
              <Input
                id="tar-ejemplo"
                value={ejemplo}
                onChange={(e) => setEjemplo(e.target.value)}
                inputMode="numeric"
                autoComplete="off"
                className="h-10 w-20 tabular-nums"
                aria-label="Duración de ejemplo en minutos"
                aria-invalid={ejemploNum === null}
              />
              <span className="text-xs text-muted-foreground">min</span>
            </div>
          </div>
          <p className="text-sm tabular-nums" aria-live="polite">
            {vista ? (
              <>
                {vista.minutos} min → se cobran {vista.minutos_cobrados} min →{" "}
                <span className="font-semibold text-primary">{formatearMonto(vista.importe, moneda)}</span>
              </>
            ) : (
              <span className="text-muted-foreground">
                {ejemploNum === null
                  ? "Escribe la duración de ejemplo en minutos."
                  : "Completa el precio, la fracción y el mínimo para ver el cálculo."}
              </span>
            )}
          </p>
          {vista && (
            <p className="text-xs text-muted-foreground">
              {vista.aplicaMinimo
                ? `Como ${vista.minutos} min está por debajo del mínimo, se cobran como mínimo ${vista.cobrables} min.`
                : vista.minutos_cobrados === vista.minutos
                  ? "La duración es una fracción exacta: no se redondea."
                  : "La fracción empezada se cobra completa."}
            </p>
          )}
        </div>

        {editando && (
          <p className="text-xs text-muted-foreground">
            Si cambias el precio, la moneda, la fracción o el mínimo, la tarifa pasa a la versión{" "}
            {(tarifa?.version ?? 1) + 1}. Las cargas ya iniciadas siguen con la tarifa con la que empezaron.
          </p>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!puedeGuardar}>
            {guardando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {editando ? "Guardar cambios" : "Crear tarifa"}
          </Button>
        </DialogFooter>
      </form>
    </>
  )
}
