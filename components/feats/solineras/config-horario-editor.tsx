"use client"

import { Switch } from "@/components/shared/molecule/switch"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { DIAS_SEMANA } from "@/lib/utils/solineras"
import type { FilaHorario } from "./config-validacion"

interface Props {
  filas: FilaHorario[]
  /** Error de cada día (1..7). */
  errores: Record<number, string>
  editable: boolean
  onCambiar: (dia: number, cambios: Partial<Omit<FilaHorario, "dia_semana">>) => void
}

/** Siete filas, de lunes a domingo: si abre ese día y de qué hora a qué hora (hora de Cuba). */
export function HorarioEditor({ filas, errores, editable, onCambiar }: Props) {
  return (
    <ul className="divide-y rounded-md border">
      {filas.map((fila) => {
        const dia = DIAS_SEMANA[fila.dia_semana - 1]
        const diaMinusculas = dia.toLowerCase()
        const idAbre = `horario-${fila.dia_semana}-abre`
        const idApertura = `horario-${fila.dia_semana}-apertura`
        const idCierre = `horario-${fila.dia_semana}-cierre`
        const error = errores[fila.dia_semana]

        return (
          <li key={fila.dia_semana} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2.5">
            <span className="w-24 text-sm font-medium">{dia}</span>

            <div className="flex min-h-10 items-center gap-2">
              <Switch
                id={idAbre}
                checked={fila.activo}
                onCheckedChange={(activo) => onCambiar(fila.dia_semana, { activo })}
                disabled={!editable}
              />
              <Label htmlFor={idAbre} className="text-sm font-normal">
                Abre
              </Label>
            </div>

            {fila.activo ? (
              <div className="flex items-center gap-2">
                <Input
                  id={idApertura}
                  type="time"
                  value={fila.apertura}
                  onChange={(e) => onCambiar(fila.dia_semana, { apertura: e.target.value })}
                  disabled={!editable}
                  aria-label={`Hora de apertura del ${diaMinusculas}`}
                  aria-invalid={Boolean(error)}
                  className="w-32 tabular-nums"
                />
                <span aria-hidden="true" className="text-sm text-muted-foreground">
                  a
                </span>
                <Input
                  id={idCierre}
                  type="time"
                  value={fila.cierre}
                  onChange={(e) => onCambiar(fila.dia_semana, { cierre: e.target.value })}
                  disabled={!editable}
                  aria-label={`Hora de cierre del ${diaMinusculas}`}
                  aria-invalid={Boolean(error)}
                  className="w-32 tabular-nums"
                />
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">Cerrado</span>
            )}

            {error && (
              <p role="alert" className="basis-full text-xs text-destructive sm:pl-28">
                {error}
              </p>
            )}
          </li>
        )
      })}
    </ul>
  )
}
