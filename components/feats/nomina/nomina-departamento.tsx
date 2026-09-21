"use client"

import { AlertTriangle } from "lucide-react"
import { Badge } from "@/components/shared/atom/badge"
import { Checkbox } from "@/components/shared/molecule/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shared/molecule/table"
import { cn } from "@/lib/utils"
import type {
  CambiosLinea,
  DepartamentoNomina,
  FormaCobro,
} from "@/lib/types/feats/nomina/nomina-types"
import { CeldaNumero, CeldaTexto, formatoMonto } from "./celdas"

interface Props {
  departamento: DepartamentoNomina
  bloqueado: boolean
  onEditarLinea: (ci: string, cambios: CambiosLinea) => void
  onFijarFondo: (departamentoId: string, fondoUsd: number) => void
}

const th = "whitespace-nowrap px-2 text-xs font-semibold uppercase tracking-wide text-gray-600"

export function NominaDepartamento({ departamento: d, bloqueado, onEditarLinea, onFijarFondo }: Props) {
  const sugerido = d.fondo_usd === 0 && d.fondo_anterior_usd > 0

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <header className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-gray-200 bg-[#E6F4EF]/60 px-4 py-3">
        <div className="min-w-[10rem]">
          <h2 className="text-base font-semibold text-[#012928]">{d.nombre}</h2>
          <p className="text-xs text-gray-500">
            {d.trabajadores.length} {d.trabajadores.length === 1 ? "trabajador" : "trabajadores"}
          </p>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <span className="font-medium text-gray-700">Fondo complementario</span>
          <span className="flex items-center rounded-lg border border-gray-300 bg-white pl-2">
            <span className="text-sm text-gray-500">USD</span>
            <CeldaNumero
              ariaLabel={`Fondo de ${d.nombre}`}
              value={d.fondo_usd}
              disabled={bloqueado}
              onCommit={(v) => onFijarFondo(d.departamento_id, v)}
              className="w-28 border-0"
            />
          </span>
        </label>

        {sugerido && !bloqueado && (
          <button
            type="button"
            onClick={() => onFijarFondo(d.departamento_id, d.fondo_anterior_usd)}
            className="rounded-full border border-dashed border-[#012928]/40 px-3 py-1 text-xs text-[#012928] hover:bg-white"
          >
            Usar el del mes anterior: USD {formatoMonto(d.fondo_anterior_usd)}
          </button>
        )}

        <div className="ml-auto flex flex-wrap items-center gap-2 text-sm">
          <Badge className="bg-white text-gray-700 ring-1 ring-gray-200">
            Asignado {d.porcentaje_asignado.toLocaleString("es", { maximumFractionDigits: 2 })}%
          </Badge>
          {d.excedido ? (
            <Badge className="bg-red-100 text-red-700">
              <AlertTriangle className="mr-1 h-3 w-3" /> Pasa del 100%
            </Badge>
          ) : (
            <Badge
              className={cn(
                d.sin_repartir_usd > 0 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800",
              )}
            >
              Sin repartir USD {formatoMonto(d.sin_repartir_usd)}
            </Badge>
          )}
        </div>
      </header>

      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className={cn(th, "min-w-[11rem]")}>Trabajador</TableHead>
            <TableHead className={cn(th, "text-right")}>Horas</TableHead>
            <TableHead className={cn(th, "text-right")}>Tarifa/h CUP</TableHead>
            <TableHead className={cn(th, "text-right")}>Bruto CUP</TableHead>
            <TableHead className={cn(th, "text-right")}>Retenc. CUP</TableHead>
            <TableHead className={cn(th, "text-right")}>Neto CUP</TableHead>
            <TableHead className={cn(th, "border-l text-right")}>% fondo</TableHead>
            <TableHead className={cn(th, "text-right")}>Compl. USD</TableHead>
            <TableHead className={cn(th, "border-l")}>Cobro</TableHead>
            <TableHead className={cn(th, "min-w-[9rem]")}>Tarjeta</TableHead>
            <TableHead className={cn(th, "text-center")}>Pagó oficial</TableHead>
            <TableHead className={cn(th, "text-center")}>Pagó compl.</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {d.trabajadores.map((t) => (
            <TableRow key={t.trabajador_ci}>
              <TableCell className="px-2 py-1 font-medium text-gray-900">
                {t.nombre}
                <span className="block text-xs font-normal text-gray-400">{t.trabajador_ci}</span>
              </TableCell>
              <TableCell className="w-24 px-1 py-1">
                <CeldaNumero
                  ariaLabel={`Horas de ${t.nombre}`}
                  value={t.horas}
                  max={744}
                  disabled={bloqueado}
                  onCommit={(v) => onEditarLinea(t.trabajador_ci, { horas: v })}
                />
              </TableCell>
              <TableCell className="w-28 px-1 py-1">
                <CeldaNumero
                  ariaLabel={`Tarifa por hora de ${t.nombre}`}
                  value={t.tarifa_hora}
                  disabled={bloqueado}
                  onCommit={(v) => onEditarLinea(t.trabajador_ci, { tarifa_hora: v })}
                />
              </TableCell>
              <TableCell className="px-2 py-1 text-right tabular-nums">{formatoMonto(t.bruto_cup)}</TableCell>
              <TableCell className="w-28 px-1 py-1">
                <CeldaNumero
                  ariaLabel={`Retenciones de ${t.nombre}`}
                  value={t.retenciones}
                  disabled={bloqueado}
                  onCommit={(v) => onEditarLinea(t.trabajador_ci, { retenciones: v })}
                />
              </TableCell>
              <TableCell className="px-2 py-1 text-right font-medium tabular-nums">
                {formatoMonto(t.neto_cup)}
              </TableCell>
              <TableCell className="w-24 border-l px-1 py-1">
                <CeldaNumero
                  ariaLabel={`Porcentaje del fondo de ${t.nombre}`}
                  value={t.porcentaje_depto}
                  max={100}
                  disabled={bloqueado}
                  onCommit={(v) => onEditarLinea(t.trabajador_ci, { porcentaje_depto: v })}
                />
              </TableCell>
              <TableCell className="px-2 py-1 text-right font-medium tabular-nums">
                {formatoMonto(t.complementario_usd)}
              </TableCell>
              <TableCell className="border-l px-1 py-1">
                <select
                  aria-label={`Forma de cobro de ${t.nombre}`}
                  disabled={bloqueado}
                  value={t.forma_cobro}
                  onChange={(e) =>
                    onEditarLinea(t.trabajador_ci, { forma_cobro: e.target.value as FormaCobro })
                  }
                  className="h-8 rounded-md border border-gray-200 bg-white px-2 text-sm disabled:text-gray-500"
                >
                  <option value="tarjeta">Tarjeta</option>
                  <option value="efectivo">Efectivo</option>
                </select>
              </TableCell>
              <TableCell className="px-1 py-1">
                {t.forma_cobro === "tarjeta" ? (
                  <CeldaTexto
                    ariaLabel={`Tarjeta de ${t.nombre}`}
                    value={t.tarjeta}
                    placeholder="Nº de tarjeta"
                    disabled={bloqueado}
                    onCommit={(v) => onEditarLinea(t.trabajador_ci, { tarjeta: v })}
                  />
                ) : (
                  <span className="px-2 text-xs text-gray-400">—</span>
                )}
              </TableCell>
              <TableCell className="text-center">
                <Checkbox
                  aria-label={`Oficial pagado a ${t.nombre}`}
                  checked={t.pagado_oficial}
                  disabled={bloqueado}
                  onCheckedChange={(v) => onEditarLinea(t.trabajador_ci, { pagado_oficial: v === true })}
                />
              </TableCell>
              <TableCell className="text-center">
                <Checkbox
                  aria-label={`Complementario pagado a ${t.nombre}`}
                  checked={t.pagado_complementario}
                  disabled={bloqueado}
                  onCheckedChange={(v) =>
                    onEditarLinea(t.trabajador_ci, { pagado_complementario: v === true })
                  }
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow className="bg-gray-50 font-semibold hover:bg-gray-50">
            <TableCell className="px-2">Total {d.nombre}</TableCell>
            <TableCell className="px-2 text-right tabular-nums">
              {d.totales.horas.toLocaleString("es", { maximumFractionDigits: 2 })}
            </TableCell>
            <TableCell />
            <TableCell className="px-2 text-right tabular-nums">{formatoMonto(d.totales.bruto_cup)}</TableCell>
            <TableCell className="px-2 text-right tabular-nums">
              {formatoMonto(d.totales.retenciones_cup)}
            </TableCell>
            <TableCell className="px-2 text-right tabular-nums">{formatoMonto(d.totales.neto_cup)}</TableCell>
            <TableCell className="border-l px-2 text-right tabular-nums">
              {d.porcentaje_asignado.toLocaleString("es", { maximumFractionDigits: 2 })}%
            </TableCell>
            <TableCell className="px-2 text-right tabular-nums">
              {formatoMonto(d.totales.complementario_usd)}
            </TableCell>
            <TableCell colSpan={4} />
          </TableRow>
        </TableFooter>
      </Table>
    </section>
  )
}
