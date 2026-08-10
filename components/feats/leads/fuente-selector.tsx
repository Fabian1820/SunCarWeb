"use client"

import { useEffect, useRef, useState } from "react"

import { Label } from "@/components/shared/atom/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select"
import { TrabajadorSearchSelector } from "@/components/feats/worker/trabajador-search-selector"
import { ClienteSearchSelector } from "@/components/feats/cliente/cliente-search-selector"
import {
  FuenteService,
  TrabajadorService,
  SedeService,
  ClienteService,
} from "@/lib/api-services"
import type { Fuente } from "@/lib/types/feats/fuentes/fuente-types"
import type { Trabajador } from "@/lib/api-types"
import type { Cliente } from "@/lib/types/feats/customer/cliente-types"

interface FuenteSelectorProps {
  /** Opcional: los formularios de lead/cliente arrancan sin fuente elegida. */
  fuente?: string
  fuenteReferencia?: string
  onChange: (fuente: string, fuenteReferencia: string) => void
}

type Opcion = { value: string; label: string }

export function FuenteSelector({ fuente, fuenteReferencia, onChange }: FuenteSelectorProps) {
  const [fuentes, setFuentes] = useState<Fuente[]>([])
  const [loadingFuentes, setLoadingFuentes] = useState(false)
  const [fuentesError, setFuentesError] = useState<string | null>(null)

  useEffect(() => {
    let activo = true
    setLoadingFuentes(true)
    setFuentesError(null)
    FuenteService.getFuentes(true)
      .then((data) => { if (activo) setFuentes(data) })
      .catch((err) => {
        if (!activo) return
        console.error("FuenteSelector: fallo al cargar fuentes", err)
        setFuentes([])
        setFuentesError(
          err instanceof Error ? err.message : "No se pudieron cargar las fuentes"
        )
      })
      .finally(() => { if (activo) setLoadingFuentes(false) })
    return () => { activo = false }
  }, [])

  const fuenteActual = fuentes.find((f) => f.nombre === fuente)
  const tipoRef = fuenteActual?.tipo_referencia
  const referenciaValida =
    fuenteActual?.requiere_referencia &&
    (tipoRef === "sucursal" || tipoRef === "trabajador" || tipoRef === "cliente")
  const referenciaMalConfigurada =
    fuenteActual?.requiere_referencia && !referenciaValida

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="fuente">Fuente</Label>
        <Select
          value={fuente || undefined}
          onValueChange={(value) => onChange(value, "")}
        >
          <SelectTrigger id="fuente" className="text-gray-900">
            <SelectValue placeholder={loadingFuentes ? "Cargando..." : "Seleccionar fuente"} />
          </SelectTrigger>
          <SelectContent>
            {fuentes.map((f) => (
              <SelectItem key={f.id} value={f.nombre}>
                {f.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {fuentesError && (
          <p className="text-xs text-red-600 mt-1">{fuentesError}</p>
        )}
      </div>

      {referenciaValida && (
        <div>
          {tipoRef === "sucursal" ? (
            <>
              <Label>{etiquetaReferencia(tipoRef)}</Label>
              <SucursalSelect
                value={fuenteReferencia || ""}
                onChange={(v) => onChange(fuente ?? "", v)}
              />
            </>
          ) : (
            <ReferenciaSelector
              tipo={tipoRef as "trabajador" | "cliente"}
              label={etiquetaReferencia(tipoRef)}
              value={fuenteReferencia || ""}
              onChange={(v) => onChange(fuente ?? "", v)}
            />
          )}
        </div>
      )}
      {referenciaMalConfigurada && (
        <p className="text-xs text-amber-600">
          Esta fuente requiere referencia pero no tiene un tipo válido configurado
          (revisar en Gestionar Fuentes).
        </p>
      )}
    </div>
  )
}

function etiquetaReferencia(tipo: string | null | undefined): string {
  if (tipo === "sucursal") return "Sucursal"
  if (tipo === "trabajador") return "Trabajador"
  if (tipo === "cliente") return "Cliente que recomendó"
  return "Referencia"
}

/** Sucursales: lista completa (son pocas, ~8) */
function SucursalSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [opciones, setOpciones] = useState<Opcion[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let activo = true
    setLoading(true)
    SedeService.getSedes(true)
      .then((data) => {
        if (!activo) return
        setOpciones((data || []).map((s) => ({ value: s.nombre, label: s.nombre })))
      })
      .catch(() => activo && setOpciones([]))
      .finally(() => activo && setLoading(false))
    return () => { activo = false }
  }, [])

  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger className="text-gray-900">
        <SelectValue placeholder={loading ? "Cargando sucursales..." : "Seleccionar sucursal"} />
      </SelectTrigger>
      <SelectContent>
        {opciones.map((s) => (
          <SelectItem key={s.value} value={s.value}>
            {s.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/**
 * Trabajadores y clientes: reutiliza TrabajadorSearchSelector / ClienteSearchSelector,
 * los MISMOS componentes que usa el módulo de Ofertas (crear oferta confeccionada) para
 * elegir el cliente/lead. Son un <Input> + panel flotante en un <div> absoluto normal,
 * SIN Popover/Portal de Radix — evita los problemas de clicks que no abren nada cuando
 * el picker vive dentro de un Dialog largo con scroll (que sí rompía el combobox basado
 * en cmdk+Popover usado antes acá).
 *
 * fuenteReferencia se sigue guardando como texto legible ("nombre" para trabajador,
 * "nombre (numero)" para cliente) para no romper la regla de prioridad automática que
 * lee ese campo en edit-lead-dialog.tsx — por eso este componente traduce id/CI <-> texto
 * en ambas direcciones.
 */
function ReferenciaSelector({
  tipo,
  label,
  value,
  onChange,
}: {
  tipo: "trabajador" | "cliente"
  label: string
  value: string
  onChange: (v: string) => void
}) {
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const cargadoRef = useRef<"trabajador" | "cliente" | null>(null)

  useEffect(() => {
    if (cargadoRef.current === tipo) return
    let activo = true
    setLoading(true)
    setFetchError(null)

    const cargar = async () => {
      try {
        if (tipo === "trabajador") {
          const data = await TrabajadorService.getAllTrabajadores()
          if (!activo) return
          setTrabajadores(data || [])
        } else {
          const res = await ClienteService.getClientes()
          if (!activo) return
          setClientes(res.clients || [])
        }
        cargadoRef.current = tipo
      } catch (err) {
        if (!activo) return
        console.error(`ReferenciaSelector: fallo al cargar ${tipo}s`, err)
        setFetchError(
          err instanceof Error
            ? err.message
            : tipo === "trabajador"
              ? "No se pudieron cargar los trabajadores"
              : "No se pudieron cargar los clientes",
        )
      } finally {
        if (activo) setLoading(false)
      }
    }
    void cargar()
    return () => { activo = false }
  }, [tipo])

  if (tipo === "trabajador") {
    const seleccionado = trabajadores.find((t) => t.nombre === value)
    return (
      <div className="space-y-1">
        <TrabajadorSearchSelector
          label={label}
          trabajadores={trabajadores}
          value={seleccionado?.CI || ""}
          onChange={(ci) => {
            const t = trabajadores.find((x) => x.CI === ci)
            onChange(t ? t.nombre : "")
          }}
          placeholder="Buscar trabajador..."
          loading={loading}
        />
        {fetchError && (
          <p className="text-xs text-red-600">Error: {fetchError}</p>
        )}
      </div>
    )
  }

  const seleccionado = clientes.find((c) => `${c.nombre} (${c.numero})` === value)
  return (
    <div className="space-y-1">
      <ClienteSearchSelector
        label={label}
        clients={clientes}
        value={seleccionado?.id || seleccionado?.numero || ""}
        onChange={(id) => {
          const c = clientes.find((x) => (x.id || x.numero) === id)
          onChange(c ? `${c.nombre} (${c.numero})` : "")
        }}
        placeholder="Buscar cliente..."
        loading={loading}
      />
      {fetchError && (
        <p className="text-xs text-red-600">Error: {fetchError}</p>
      )}
    </div>
  )
}
