"use client"

import { Fragment } from "react"
import { AlertTriangle, Trash2, UserPlus, X } from "lucide-react"
import { Badge } from "@/components/shared/atom/badge"
import { Button } from "@/components/shared/atom/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shared/molecule/table"
import { cn } from "@/lib/utils"
import type { MiembroReparto, Reparto } from "@/lib/types/feats/nomina/nomina-types"
import { CeldaNumero, CeldaTexto, formatoMonto } from "./celdas"

interface Props {
  reparto: Reparto
  bloqueado: boolean
  onEditar: (cambios: { etiqueta?: string; monto_usd?: number }) => void
  onBorrar: () => void
  onAnadir: () => void
  onEditarPorcentaje: (ci: string, porcentaje: number) => void
  onQuitar: (ci: string) => void
}

const th = "whitespace-nowrap px-2 text-xs font-semibold uppercase tracking-wide text-gray-600"
const pct = (n: number) => n.toLocaleString("es", { maximumFractionDigits: 2 })

/** Agrupa los miembros por departamento y cargo, conservando el orden que manda el backend. */
function agrupar(miembros: MiembroReparto[]) {
  const grupos: Array<{ clave: string; departamento: string; cargo: string; miembros: MiembroReparto[] }> = []
  for (const m of miembros) {
    const clave = `${m.departamento_id}|${m.cargo}`
    const ultimo = grupos[grupos.length - 1]
    if (ultimo && ultimo.clave === clave) ultimo.miembros.push(m)
    else grupos.push({ clave, departamento: m.departamento_nombre, cargo: m.cargo, miembros: [m] })
  }
  return grupos
}

/** Un reparto: etiqueta, monto en USD y los trabajadores que se lo reparten según su %. */
export function RepartoCard({
  reparto: r,
  bloqueado,
  onEditar,
  onBorrar,
  onAnadir,
  onEditarPorcentaje,
  onQuitar,
}: Props) {
  const sugerido = r.monto_usd === 0 && r.monto_anterior_usd > 0
  const grupos = agrupar(r.miembros)
  const sinPorcentaje = r.miembros.filter((m) => m.porcentaje === 0).length
  // Cabeceras de departamento: solo cuando cambia respecto al grupo anterior.
  let departamentoAnterior = ""

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <header className="space-y-3 border-b border-gray-200 bg-[#E6F4EF]/60 px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="min-w-[12rem] flex-1">
            <CeldaTexto
              ariaLabel="Etiqueta del reparto"
              value={r.etiqueta}
              disabled={bloqueado}
              onCommit={(v) => v && onEditar({ etiqueta: v })}
              className="h-9 text-base font-semibold text-[#012928]"
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <span className="font-medium text-gray-700">A repartir</span>
            <span className="flex items-center rounded-lg border border-gray-300 bg-white pl-2">
              <span className="text-sm text-gray-500">USD</span>
              <CeldaNumero
                ariaLabel={`Monto de ${r.etiqueta}`}
                value={r.monto_usd}
                disabled={bloqueado}
                onCommit={(v) => onEditar({ monto_usd: v })}
                className="w-28 border-0 font-semibold"
              />
            </span>
          </label>

          {sugerido && !bloqueado && (
            <button
              type="button"
              onClick={() => onEditar({ monto_usd: r.monto_anterior_usd })}
              className="rounded-full border border-dashed border-[#012928]/40 px-3 py-1 text-xs text-[#012928] hover:bg-white"
            >
              Usar el del mes anterior: USD {formatoMonto(r.monto_anterior_usd)}
            </button>
          )}

          <div className="ml-auto flex items-center gap-2">
            {!bloqueado && (
              <>
                <Button variant="outline" size="sm" onClick={onAnadir}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Añadir trabajadores
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Borrar el reparto ${r.etiqueta}`}
                  title="Borrar el reparto"
                  onClick={() => {
                    if (window.confirm(`¿Borrar el reparto «${r.etiqueta}»? Se pierde su lista de trabajadores y sus %.`)) {
                      onBorrar()
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge className="bg-white text-gray-700 ring-1 ring-gray-200">
            {r.miembros.length} {r.miembros.length === 1 ? "trabajador" : "trabajadores"}
          </Badge>
          <Badge className="bg-white text-gray-700 ring-1 ring-gray-200">Suma de los % {pct(r.suma_porcentajes)}</Badge>
          {r.sin_repartir_usd > 0 && (
            <Badge className="bg-amber-100 text-amber-800">
              <AlertTriangle className="mr-1 h-3 w-3" />
              Sin repartir USD {formatoMonto(r.sin_repartir_usd)}: nadie tiene %
            </Badge>
          )}
          {sinPorcentaje > 0 && r.sin_repartir_usd === 0 && (
            <Badge className="bg-amber-100 text-amber-800">
              {sinPorcentaje} sin % (no reciben nada)
            </Badge>
          )}
        </div>
      </header>

      {r.miembros.length === 0 ? (
        <p className="px-4 py-6 text-sm text-gray-500">
          Este reparto todavía no tiene trabajadores.
          {!bloqueado && " Usa «Añadir trabajadores» para elegirlos."}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className={cn(th, "min-w-[14rem]")}>Trabajador</TableHead>
              <TableHead className={cn(th, "text-right")}>% fijo</TableHead>
              <TableHead className={cn(th, "text-right")}>% real</TableHead>
              <TableHead className={cn(th, "text-right")}>Le toca USD</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {grupos.map((g) => {
              const cabeceraDepto = g.departamento !== departamentoAnterior
              departamentoAnterior = g.departamento
              return (
                <Fragment key={g.clave}>
                  {cabeceraDepto && (
                    <TableRow className="bg-gray-100/70 hover:bg-gray-100/70">
                      <TableCell colSpan={5} className="px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-[#012928]">
                        {g.departamento}
                      </TableCell>
                    </TableRow>
                  )}
                  <TableRow className="bg-gray-50/80 hover:bg-gray-50/80">
                    <TableCell colSpan={5} className="px-3 py-1 text-xs font-semibold text-gray-500">
                      {g.cargo}
                    </TableCell>
                  </TableRow>
                  {g.miembros.map((m) => (
                    <TableRow key={m.trabajador_ci}>
                      <TableCell className="px-2 py-1 font-medium text-gray-900">
                        {m.nombre}
                        <span className="block text-xs font-normal text-gray-400">{m.trabajador_ci}</span>
                      </TableCell>
                      <TableCell className="w-28 px-1 py-1">
                        <CeldaNumero
                          ariaLabel={`Porcentaje de ${m.nombre} en ${r.etiqueta}`}
                          value={m.porcentaje}
                          max={100}
                          disabled={bloqueado}
                          onCommit={(v) => onEditarPorcentaje(m.trabajador_ci, v)}
                          className={cn(m.porcentaje === 0 && "bg-amber-50")}
                        />
                      </TableCell>
                      <TableCell className="px-3 py-1 text-right tabular-nums">
                        {m.porcentaje > 0 ? `${pct(m.porcentaje_efectivo)}%` : "—"}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "px-3 py-1 text-right text-base tabular-nums",
                          m.complementario_usd > 0 ? "font-semibold text-[#012928]" : "text-gray-400",
                        )}
                      >
                        {formatoMonto(m.complementario_usd)}
                      </TableCell>
                      <TableCell className="px-1 py-1 text-center">
                        {!bloqueado && (
                          <button
                            type="button"
                            aria-label={`Quitar a ${m.nombre} del reparto ${r.etiqueta}`}
                            title="Quitar del reparto"
                            onClick={() => onQuitar(m.trabajador_ci)}
                            className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </Fragment>
              )
            })}
          </TableBody>
        </Table>
      )}
    </section>
  )
}
