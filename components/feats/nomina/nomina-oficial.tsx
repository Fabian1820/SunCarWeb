"use client"

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
import type { CambiosLinea, DepartamentoNomina } from "@/lib/types/feats/nomina/nomina-types"
import { CeldaNumero, formatoMonto } from "./celdas"

interface Props {
  departamentos: DepartamentoNomina[]
  horasBase: number
  bloqueado: boolean
  onEditarLinea: (ci: string, cambios: CambiosLinea) => void
}

const th = "whitespace-nowrap px-2 text-xs font-semibold uppercase tracking-wide text-gray-600"

/** Salario oficial: salario básico, tarifa por hora, horas trabajadas y lo que toca cobrar. */
export function NominaOficial({ departamentos, horasBase, bloqueado, onEditarLinea }: Props) {
  const base = horasBase.toLocaleString("es", { maximumFractionDigits: 2 })

  if (departamentos.length === 0) {
    return <p className="text-sm text-gray-500">No hay trabajadores que mostrar.</p>
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-600">
        Tarifa por hora = salario básico ÷ {base}. Lo que toca cobrar = tarifa × horas trabajadas. El
        salario básico que cambies aquí se guarda también en la ficha del trabajador.
      </p>

      {departamentos.map((d) => (
        <section
          key={d.departamento_id}
          className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
        >
          <header className="flex items-baseline justify-between gap-3 border-b border-gray-200 bg-[#E6F4EF]/60 px-4 py-3">
            <h2 className="text-base font-semibold text-[#012928]">{d.nombre}</h2>
            <p className="text-xs text-gray-500">
              {d.totales.trabajadores} {d.totales.trabajadores === 1 ? "trabajador" : "trabajadores"}
            </p>
          </header>

          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={cn(th, "min-w-[14rem]")}>Trabajador</TableHead>
                <TableHead className={cn(th, "text-right")}>Salario básico CUP</TableHead>
                <TableHead className={cn(th, "text-right")}>Tarifa/h CUP</TableHead>
                <TableHead className={cn(th, "text-right")}>Horas</TableHead>
                <TableHead className={cn(th, "text-right")}>A cobrar CUP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {d.cargos.flatMap((c) => c.trabajadores).map((t) => (
                <TableRow key={t.trabajador_ci}>
                  <TableCell className="px-2 py-1 font-medium text-gray-900">
                    {t.nombre}
                    <span className="block text-xs font-normal text-gray-400">
                      {t.cargo} · {t.trabajador_ci}
                    </span>
                  </TableCell>
                  <TableCell className="w-40 px-1 py-1">
                    <CeldaNumero
                      ariaLabel={`Salario básico de ${t.nombre}`}
                      value={t.salario_basico}
                      disabled={bloqueado}
                      onCommit={(v) => onEditarLinea(t.trabajador_ci, { salario_basico: v })}
                    />
                  </TableCell>
                  <TableCell
                    className="px-2 py-1 text-right tabular-nums text-gray-600"
                    title={`${t.salario_basico} ÷ ${base}`}
                  >
                    {formatoMonto(t.tarifa_hora)}
                  </TableCell>
                  <TableCell className="w-28 px-1 py-1">
                    <CeldaNumero
                      ariaLabel={`Horas trabajadas de ${t.nombre}`}
                      value={t.horas}
                      max={744}
                      disabled={bloqueado}
                      onCommit={(v) => onEditarLinea(t.trabajador_ci, { horas: v })}
                    />
                  </TableCell>
                  <TableCell className="px-3 py-1 text-right text-base font-semibold tabular-nums text-[#012928]">
                    {formatoMonto(t.a_cobrar_cup)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow className="bg-gray-50 font-semibold hover:bg-gray-50">
                <TableCell className="px-2">Total {d.nombre}</TableCell>
                <TableCell />
                <TableCell />
                <TableCell className="px-3 text-right tabular-nums">
                  {d.totales.horas.toLocaleString("es", { maximumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="px-3 text-right tabular-nums">
                  {formatoMonto(d.totales.a_cobrar_cup)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </section>
      ))}
    </div>
  )
}
