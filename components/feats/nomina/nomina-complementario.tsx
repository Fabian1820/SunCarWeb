"use client"

import { Info } from "lucide-react"
import { Checkbox } from "@/components/shared/molecule/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shared/molecule/table"
import { cn } from "@/lib/utils"
import type { CambiosLinea, DepartamentoNomina, HojaNomina } from "@/lib/types/feats/nomina/nomina-types"
import { CeldaNumero, formatoMonto } from "./celdas"

interface Props {
  hoja: HojaNomina
  departamentos: DepartamentoNomina[]
  bloqueado: boolean
  onEditarLinea: (ci: string, cambios: CambiosLinea) => void
  onFijarTotal: (totalUsd: number) => void
}

const th = "whitespace-nowrap px-2 text-xs font-semibold uppercase tracking-wide text-gray-600"
const pct = (n: number) => n.toLocaleString("es", { maximumFractionDigits: 2 })

/**
 * Salario complementario: se marcan los trabajadores que participan este mes, se
 * escribe el total y se reparte según el % fijo de cada uno. Los % son pesos:
 * si no suman 100, igualmente se reparte el total entero.
 */
export function NominaComplementario({
  hoja,
  departamentos,
  bloqueado,
  onEditarLinea,
  onFijarTotal,
}: Props) {
  const t = hoja.totales
  const total = t.total_complementario_usd
  const sinNadie = total > 0 && t.suma_porcentajes === 0
  const sumaDistinta = t.suma_porcentajes > 0 && Math.abs(t.suma_porcentajes - 100) > 0.005

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Total a distribuir este mes</span>
            <span className="mt-1 flex items-center rounded-lg border border-gray-300 bg-white pl-3">
              <span className="text-sm text-gray-500">USD</span>
              <CeldaNumero
                ariaLabel="Total complementario a distribuir en USD"
                value={total}
                disabled={bloqueado}
                onCommit={onFijarTotal}
                className="h-11 w-40 border-0 text-lg font-semibold"
              />
            </span>
          </label>
          <Dato titulo="Seleccionados" valor={String(t.participan)} />
          <Dato titulo="Suma de los %" valor={`${pct(t.suma_porcentajes)}%`} />
          <Dato titulo="Repartido" valor={`USD ${formatoMonto(t.complementario_usd)}`} fuerte />
        </div>

        {sinNadie && (
          <Aviso tono="ambar">
            Hay un total pero ningún trabajador seleccionado con %: no se está repartiendo nada.
          </Aviso>
        )}
        {sumaDistinta && (
          <Aviso tono="azul">
            Los % suman {pct(t.suma_porcentajes)}, no 100. No pasa nada: se reparte el total entero en
            proporción a cada %. La columna «% real» muestra la parte que le toca a cada uno.
          </Aviso>
        )}
      </div>

      {departamentos.length === 0 && (
        <p className="text-sm text-gray-500">No hay trabajadores que mostrar.</p>
      )}

      {departamentos.map((d) => {
        const todos = d.cargos.flatMap((c) => c.trabajadores)
        const marcados = todos.filter((x) => x.participa).length
        const cambiarTodos = (valor: boolean) =>
          todos
            .filter((x) => x.participa !== valor)
            .forEach((x) => onEditarLinea(x.trabajador_ci, { participa: valor }))

        return (
          <section
            key={d.departamento_id}
            className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
          >
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-[#E6F4EF]/60 px-4 py-3">
              <div>
                <h2 className="text-base font-semibold text-[#012928]">{d.nombre}</h2>
                <p className="text-xs text-gray-500">
                  {d.totales.participan} de {d.totales.trabajadores} seleccionados · USD{" "}
                  {formatoMonto(d.totales.complementario_usd)}
                </p>
              </div>
              {!bloqueado && (
                <div className="flex gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => cambiarTodos(true)}
                    disabled={marcados === todos.length}
                    className="rounded-full border border-[#012928]/30 px-3 py-1 text-[#012928] hover:bg-white disabled:opacity-40"
                  >
                    Seleccionar todos
                  </button>
                  <button
                    type="button"
                    onClick={() => cambiarTodos(false)}
                    disabled={marcados === 0}
                    className="rounded-full border border-gray-300 px-3 py-1 text-gray-600 hover:bg-white disabled:opacity-40"
                  >
                    Quitar todos
                  </button>
                </div>
              )}
            </header>

            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className={cn(th, "w-14 text-center")}>Entra</TableHead>
                  <TableHead className={cn(th, "min-w-[14rem]")}>Trabajador</TableHead>
                  <TableHead className={cn(th, "text-right")}>% fijo</TableHead>
                  <TableHead className={cn(th, "text-right")}>% real</TableHead>
                  <TableHead className={cn(th, "text-right")}>Le toca USD</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {d.cargos.map((c) => (
                  <CargoFilas key={c.cargo}>
                    <TableRow className="bg-gray-50/80 hover:bg-gray-50/80">
                      <TableCell colSpan={5} className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        {c.cargo}
                        <span className="ml-2 font-normal normal-case text-gray-400">
                          {c.totales.participan} de {c.totales.trabajadores}
                        </span>
                      </TableCell>
                    </TableRow>
                    {c.trabajadores.map((x) => (
                      <TableRow key={x.trabajador_ci} className={cn(!x.participa && "text-gray-400")}>
                        <TableCell className="text-center">
                          <Checkbox
                            aria-label={`${x.nombre} entra en el reparto`}
                            checked={x.participa}
                            disabled={bloqueado}
                            onCheckedChange={(v) =>
                              onEditarLinea(x.trabajador_ci, { participa: v === true })
                            }
                          />
                        </TableCell>
                        <TableCell className={cn("px-2 py-1 font-medium", x.participa ? "text-gray-900" : "text-gray-500")}>
                          {x.nombre}
                          <span className="block text-xs font-normal text-gray-400">{x.trabajador_ci}</span>
                        </TableCell>
                        <TableCell className="w-28 px-1 py-1">
                          <CeldaNumero
                            ariaLabel={`Porcentaje fijo de ${x.nombre}`}
                            value={x.porcentaje}
                            max={100}
                            disabled={bloqueado}
                            onCommit={(v) => onEditarLinea(x.trabajador_ci, { porcentaje: v })}
                          />
                        </TableCell>
                        <TableCell className="px-3 py-1 text-right tabular-nums">
                          {x.participa && x.porcentaje > 0 ? `${pct(x.porcentaje_efectivo)}%` : "—"}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "px-3 py-1 text-right text-base tabular-nums",
                            x.participa && x.complementario_usd > 0
                              ? "font-semibold text-[#012928]"
                              : "text-gray-400",
                          )}
                        >
                          {formatoMonto(x.complementario_usd)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </CargoFilas>
                ))}
              </TableBody>
            </Table>
          </section>
        )
      })}
    </div>
  )
}

/** Agrupa las filas de un cargo sin añadir nada al DOM. */
function CargoFilas({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

function Dato({ titulo, valor, fuerte }: { titulo: string; valor: string; fuerte?: boolean }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{titulo}</p>
      <p className={cn("mt-1 tabular-nums text-[#012928]", fuerte ? "text-xl font-semibold" : "text-lg")}>
        {valor}
      </p>
    </div>
  )
}

function Aviso({ tono, children }: { tono: "ambar" | "azul"; children: React.ReactNode }) {
  return (
    <p
      className={cn(
        "mt-4 flex items-start gap-2 rounded-lg px-3 py-2 text-sm",
        tono === "ambar" ? "bg-amber-50 text-amber-900" : "bg-sky-50 text-sky-900",
      )}
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </p>
  )
}
