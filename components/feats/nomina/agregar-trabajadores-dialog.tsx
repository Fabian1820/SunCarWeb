"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/shared/atom/button"
import { Checkbox } from "@/components/shared/molecule/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog"
import type { HojaNomina, Reparto } from "@/lib/types/feats/nomina/nomina-types"
import { FILTROS_VACIOS, contarTrabajadores, filtrarDepartamentos, type FiltrosNomina } from "./filtro"
import { NominaFiltros } from "./nomina-filtros"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  hoja: HojaNomina
  reparto: Reparto | null
  onAgregar: (cis: string[]) => void
}

/** Elegir trabajadores para un reparto, organizados por departamento y cargo, con filtros. */
export function AgregarTrabajadoresDialog({ open, onOpenChange, hoja, reparto, onAgregar }: Props) {
  const [filtros, setFiltros] = useState<FiltrosNomina>(FILTROS_VACIOS)
  const [elegidos, setElegidos] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (open) {
      setFiltros(FILTROS_VACIOS)
      setElegidos(new Set())
    }
  }, [open, reparto?.id])

  const yaEstan = useMemo(() => new Set((reparto?.miembros ?? []).map((m) => m.trabajador_ci)), [reparto])
  const visibles = useMemo(() => filtrarDepartamentos(hoja.departamentos, filtros), [hoja.departamentos, filtros])
  const cisVisibles = useMemo(
    () => visibles.flatMap((d) => d.cargos.flatMap((c) => c.trabajadores.map((t) => t.trabajador_ci))),
    [visibles],
  )

  const alternar = (ci: string) =>
    setElegidos((prev) => {
      const n = new Set(prev)
      n.has(ci) ? n.delete(ci) : n.add(ci)
      return n
    })

  // Marca o desmarca de golpe un grupo de personas (solo las que aún no están).
  const alternarGrupo = (cis: string[]) => {
    const libres = cis.filter((ci) => !yaEstan.has(ci))
    const todos = libres.every((ci) => elegidos.has(ci))
    setElegidos((prev) => {
      const n = new Set(prev)
      libres.forEach((ci) => (todos ? n.delete(ci) : n.add(ci)))
      return n
    })
  }

  const confirmar = () => {
    onAgregar([...elegidos])
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col">
        <DialogHeader>
          <DialogTitle>Añadir trabajadores a «{reparto?.etiqueta}»</DialogTitle>
          <DialogDescription>
            Entran con el último % que tuvieron en algún reparto (0 si no tenían). Después puedes cambiarlo
            en la tabla del reparto.
          </DialogDescription>
        </DialogHeader>

        <NominaFiltros
          hoja={hoja}
          filtros={filtros}
          onChange={setFiltros}
          mostrando={contarTrabajadores(visibles)}
          total={contarTrabajadores(hoja.departamentos)}
        />

        <div className="flex items-center gap-3 text-sm">
          <button
            type="button"
            onClick={() => alternarGrupo(cisVisibles)}
            className="rounded-full border border-[#012928]/30 px-3 py-1 text-xs text-[#012928] hover:bg-[#E6F4EF]"
          >
            Marcar / desmarcar todos los que se ven
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto rounded-xl border border-gray-100 p-3">
          {visibles.length === 0 && <p className="text-sm text-gray-500">No hay trabajadores con esos filtros.</p>}
          {visibles.map((d) => {
            const cisDepto = d.cargos.flatMap((c) => c.trabajadores.map((t) => t.trabajador_ci))
            return (
              <div key={d.departamento_id}>
                <div className="mb-1 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#012928]">{d.nombre}</h3>
                  <button
                    type="button"
                    onClick={() => alternarGrupo(cisDepto)}
                    className="text-xs text-gray-500 hover:text-[#012928]"
                  >
                    Marcar / desmarcar el departamento
                  </button>
                </div>
                {d.cargos.map((c) => (
                  <div key={c.cargo} className="mb-2 ml-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{c.cargo}</p>
                    <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                      {c.trabajadores.map((t) => {
                        const esta = yaEstan.has(t.trabajador_ci)
                        return (
                          <label
                            key={t.trabajador_ci}
                            className={`flex items-center gap-2 py-1 text-sm ${esta ? "text-gray-400" : "cursor-pointer text-gray-800"}`}
                          >
                            <Checkbox
                              checked={esta || elegidos.has(t.trabajador_ci)}
                              disabled={esta}
                              onCheckedChange={() => alternar(t.trabajador_ci)}
                            />
                            <span>
                              {t.nombre}
                              {esta && <span className="ml-1 text-xs">(ya está)</span>}
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={confirmar}
            disabled={elegidos.size === 0}
            className="bg-suncar-primary text-white hover:bg-suncar-primary/90"
          >
            Añadir {elegidos.size > 0 ? elegidos.size : ""} {elegidos.size === 1 ? "trabajador" : "trabajadores"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
