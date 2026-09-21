"use client"

import { useState } from "react"
import { Building2, MapPin, Plus } from "lucide-react"
import { Button } from "@/components/shared/atom/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog"
import type { HojaNomina, Reparto, TipoPlantilla } from "@/lib/types/feats/nomina/nomina-types"
import { formatoMonto } from "./celdas"
import { RepartoCard } from "./reparto-card"
import { AgregarTrabajadoresDialog } from "./agregar-trabajadores-dialog"

interface Props {
  hoja: HojaNomina
  /** Repartos con los filtros de la pantalla ya aplicados. */
  repartos: Reparto[]
  hayFiltros: boolean
  bloqueado: boolean
  onCrear: (etiqueta: string, montoUsd: number) => Promise<boolean>
  onPlantilla: (tipo: TipoPlantilla) => void
  onEditarReparto: (repartoId: string, cambios: { etiqueta?: string; monto_usd?: number }) => void
  onBorrarReparto: (repartoId: string) => void
  onAgregarMiembros: (repartoId: string, cis: string[]) => void
  onEditarMiembro: (repartoId: string, ci: string, porcentaje: number) => void
  onQuitarMiembro: (repartoId: string, ci: string) => void
}

/**
 * Salario complementario: varios repartos por mes. Cada uno tiene una etiqueta, un
 * monto en USD y sus trabajadores con su %. Se pueden hacer por departamento, por
 * sede o sueltos. Los % son pesos: si no suman 100, igual se reparte el monto entero.
 */
export function NominaComplementario({
  hoja,
  repartos,
  hayFiltros,
  bloqueado,
  onCrear,
  onPlantilla,
  onEditarReparto,
  onBorrarReparto,
  onAgregarMiembros,
  onEditarMiembro,
  onQuitarMiembro,
}: Props) {
  const [nuevo, setNuevo] = useState(false)
  const [etiqueta, setEtiqueta] = useState("")
  const [monto, setMonto] = useState("")
  const [anadirA, setAnadirA] = useState<string | null>(null)

  const t = hoja.totales
  const repartoAnadir = (hoja.repartos ?? []).find((r) => r.id === anadirA) ?? null

  const plantilla = (tipo: TipoPlantilla) => {
    const que = tipo === "departamento" ? "departamento" : "sede"
    if (
      window.confirm(
        `Se creará un reparto por cada ${que} con todos sus trabajadores (los que ya existan con ese nombre no se tocan). El monto de cada uno lo pones tú. ¿Seguir?`,
      )
    ) {
      onPlantilla(tipo)
    }
  }

  const crear = async () => {
    const valor = Number(monto.replace(",", "."))
    const ok = await onCrear(etiqueta.trim(), Number.isFinite(valor) && valor > 0 ? valor : 0)
    if (ok) {
      setNuevo(false)
      setEtiqueta("")
      setMonto("")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="grid grid-cols-3 gap-3">
          <Dato titulo="A distribuir" valor={`USD ${formatoMonto(t.a_distribuir_usd)}`} />
          <Dato titulo="Repartido" valor={`USD ${formatoMonto(t.complementario_usd)}`} />
          <Dato
            titulo="Sin repartir"
            valor={`USD ${formatoMonto(t.sin_repartir_usd)}`}
            aviso={t.sin_repartir_usd > 0}
          />
        </div>

        {!bloqueado && (
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => plantilla("departamento")}>
              <Building2 className="mr-2 h-4 w-4" />
              Uno por departamento
            </Button>
            <Button variant="outline" onClick={() => plantilla("sede")}>
              <MapPin className="mr-2 h-4 w-4" />
              Uno por sede
            </Button>
            <Button onClick={() => setNuevo(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo reparto
            </Button>
          </div>
        )}
      </div>

      {(hoja.repartos ?? []).length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
          <p className="text-gray-700">Este mes todavía no hay repartos.</p>
          <p className="mx-auto mt-1 max-w-lg text-sm text-gray-500">
            Un reparto es un dinero en USD con una etiqueta, que se divide entre los trabajadores que elijas
            según su %. Crea uno suelto, o uno por cada departamento o sede.
          </p>
        </div>
      )}

      {(hoja.repartos ?? []).length > 0 && repartos.length === 0 && hayFiltros && (
        <p className="text-sm text-gray-500">Ningún reparto tiene trabajadores con esos filtros.</p>
      )}

      {repartos.map((r) => (
        <RepartoCard
          key={r.id}
          reparto={r}
          bloqueado={bloqueado}
          onEditar={(c) => onEditarReparto(r.id, c)}
          onBorrar={() => onBorrarReparto(r.id)}
          onAnadir={() => setAnadirA(r.id)}
          onEditarPorcentaje={(ci, p) => onEditarMiembro(r.id, ci, p)}
          onQuitar={(ci) => onQuitarMiembro(r.id, ci)}
        />
      ))}

      <AgregarTrabajadoresDialog
        open={anadirA !== null}
        onOpenChange={(abierto) => !abierto && setAnadirA(null)}
        hoja={hoja}
        reparto={repartoAnadir}
        onAgregar={(cis) => repartoAnadir && onAgregarMiembros(repartoAnadir.id, cis)}
      />

      <Dialog open={nuevo} onOpenChange={setNuevo}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo reparto</DialogTitle>
            <DialogDescription>
              Ponle una etiqueta y, si ya lo sabes, el monto. Los trabajadores los eliges después.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Etiqueta
              <input
                autoFocus
                value={etiqueta}
                onChange={(e) => setEtiqueta(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && etiqueta.trim() && crear()}
                placeholder="Ej.: Bono de ventas, Sede Camagüey…"
                maxLength={60}
                className="mt-1 h-10 w-full rounded-xl border border-gray-300 px-3 text-sm focus:border-[#012928] focus:outline-none focus:ring-1 focus:ring-[#012928]"
              />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Monto a repartir (USD)
              <input
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                inputMode="decimal"
                placeholder="0"
                className="mt-1 h-10 w-full rounded-xl border border-gray-300 px-3 text-right text-sm tabular-nums focus:border-[#012928] focus:outline-none focus:ring-1 focus:ring-[#012928]"
              />
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNuevo(false)}>
              Cancelar
            </Button>
            <Button onClick={crear} disabled={!etiqueta.trim()}>
              Crear reparto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Dato({ titulo, valor, aviso }: { titulo: string; valor: string; aviso?: boolean }) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3 shadow-sm ${aviso ? "border-amber-200 bg-amber-50" : "border-gray-200 bg-white"}`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{titulo}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-[#012928]">{valor}</p>
    </div>
  )
}
