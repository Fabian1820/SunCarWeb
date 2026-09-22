"use client"

import { Checkbox } from "@/components/shared/molecule/checkbox"
import { Input } from "@/components/shared/molecule/input"
import { cn } from "@/lib/utils"
import { METODOS_PAGO, MONEDAS } from "@/lib/utils/solineras"
import type { MetodoPago, Moneda } from "@/lib/types/feats/solineras/solinera-types"
import { Campo, descripcionDe } from "./config-comun"
import {
  REGLAS_CARGA,
  REGLAS_RESERVA,
  type ClaveRegla,
  type ErroresConfiguracion,
  type ReglaDef,
} from "./config-validacion"

interface ReglasProps {
  valores: Record<ClaveRegla, string>
  errores: ErroresConfiguracion["reglas"]
  editable: boolean
  onCambiar: (clave: ClaveRegla, valor: string) => void
}

function GrupoReglas({
  titulo,
  reglas,
  valores,
  errores,
  editable,
  onCambiar,
}: ReglasProps & { titulo: string; reglas: ReglaDef[] }) {
  return (
    <fieldset className="grid gap-4">
      <legend className="mb-1 text-sm font-medium text-foreground">{titulo}</legend>
      <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
        {reglas.map((regla) => {
          const id = `regla-${regla.clave}`
          return (
            <Campo
              key={regla.clave}
              id={id}
              etiqueta={regla.etiqueta}
              ayuda={regla.ayuda}
              error={errores[regla.clave]}
            >
              <div className="relative">
                <Input
                  id={id}
                  type="number"
                  inputMode="numeric"
                  step={1}
                  min={regla.min}
                  max={regla.max}
                  value={valores[regla.clave]}
                  onChange={(e) => onCambiar(regla.clave, e.target.value)}
                  disabled={!editable}
                  aria-invalid={Boolean(errores[regla.clave])}
                  aria-describedby={descripcionDe(id)}
                  className="pr-14 tabular-nums"
                />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
                >
                  {regla.unidad}
                </span>
              </div>
            </Campo>
          )
        })}
      </div>
    </fieldset>
  )
}

/** Las siete reglas numéricas, en dos grupos: las de la carga y las de las reservas. */
export function ReglasCampos(props: ReglasProps) {
  return (
    <div className="grid gap-8">
      <GrupoReglas {...props} titulo="Cargas" reglas={REGLAS_CARGA} />
      <GrupoReglas {...props} titulo="Reservas" reglas={REGLAS_RESERVA} />
    </div>
  )
}

interface OpcionProps {
  id: string
  etiqueta: string
  nota?: string
  marcada: boolean
  editable: boolean
  onCambiar: (marcada: boolean) => void
}

function Opcion({ id, etiqueta, nota, marcada, editable, onCambiar }: OpcionProps) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex min-h-10 items-center gap-3 rounded-md border px-3 py-2 text-sm",
        editable ? "cursor-pointer hover:bg-accent/50" : "cursor-default",
      )}
    >
      <Checkbox
        id={id}
        checked={marcada}
        onCheckedChange={(v) => onCambiar(v === true)}
        disabled={!editable}
      />
      <span className="font-medium">{etiqueta}</span>
      {nota && <span className="text-xs text-muted-foreground">{nota}</span>}
    </label>
  )
}

interface CobroProps {
  metodos: MetodoPago[]
  monedas: Moneda[]
  errores: Pick<ErroresConfiguracion, "metodos" | "monedas">
  editable: boolean
  onMetodo: (metodo: MetodoPago, marcado: boolean) => void
  onMoneda: (moneda: Moneda, marcada: boolean) => void
}

/** Métodos de pago y monedas que el operador puede elegir al cobrar. */
export function CobroCampos({ metodos, monedas, errores, editable, onMetodo, onMoneda }: CobroProps) {
  return (
    <div className="grid gap-8">
      <fieldset aria-describedby="cobro-metodos-error">
        <legend className="mb-3 text-sm font-medium">Métodos de pago que se aceptan</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {METODOS_PAGO.map((m) => (
            <Opcion
              key={m.value}
              id={`cobro-metodo-${m.value}`}
              etiqueta={m.label}
              nota={m.electronico ? "lleva comprobante" : undefined}
              marcada={metodos.includes(m.value)}
              editable={editable}
              onCambiar={(marcado) => onMetodo(m.value, marcado)}
            />
          ))}
        </div>
        {errores.metodos && (
          <p id="cobro-metodos-error" role="alert" className="mt-2 text-xs text-destructive">
            {errores.metodos}
          </p>
        )}
      </fieldset>

      <fieldset aria-describedby="cobro-monedas-error">
        <legend className="mb-3 text-sm font-medium">Monedas que se aceptan</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {MONEDAS.map((moneda) => (
            <Opcion
              key={moneda}
              id={`cobro-moneda-${moneda}`}
              etiqueta={moneda}
              marcada={monedas.includes(moneda)}
              editable={editable}
              onCambiar={(marcada) => onMoneda(moneda, marcada)}
            />
          ))}
        </div>
        {errores.monedas && (
          <p id="cobro-monedas-error" role="alert" className="mt-2 text-xs text-destructive">
            {errores.monedas}
          </p>
        )}
      </fieldset>
    </div>
  )
}
