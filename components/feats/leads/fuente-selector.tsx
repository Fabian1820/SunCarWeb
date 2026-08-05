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
import { SearchableSelect } from "@/components/shared/molecule/searchable-select"
import { FuenteService, TrabajadorOpcionesService, SedeService, ClienteService } from "@/lib/api-services"
import type { Fuente } from "@/lib/types/feats/fuentes/fuente-types"

interface FuenteSelectorProps {
  fuente: string
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
        <div className="space-y-1">
          <Label>{etiquetaReferencia(tipoRef)}</Label>
          {tipoRef === "sucursal" ? (
            <SucursalSelect
              value={fuenteReferencia || ""}
              onChange={(v) => onChange(fuente, v)}
            />
          ) : (
            <ReferenciaCombobox
              tipo={tipoRef as "trabajador" | "cliente"}
              value={fuenteReferencia || ""}
              onChange={(v) => onChange(fuente, v)}
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
 * Trabajadores: endpoint ligero /trabajadores/opciones (id+nombre, carga completa).
 * Clientes: GET /clientes/ sin filtros (carga completa), igual que en Crear Oferta
 * (ClienteSearchSelector / ClienteSelectorField) — evitamos la búsqueda server-side
 * con debounce + limit 20 que se perdía resultados y aparentaba no funcionar.
 *
 * Reutiliza SearchableSelect (mismo componente probado en Asistencia y otros
 * módulos): carga el listado completo una sola vez y filtra en el cliente con
 * cmdk, sin depender de un `q` server-side ni de un input controlado.
 */
function ReferenciaCombobox({
  tipo,
  value,
  onChange,
}: {
  tipo: "trabajador" | "cliente"
  value: string
  onChange: (v: string) => void
}) {
  const [opciones, setOpciones] = useState<Opcion[]>([])
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const cargadoRef = useRef<"trabajador" | "cliente" | null>(null)

  useEffect(() => {
    if (cargadoRef.current === tipo) return
    let activo = true
    setLoading(true)
    setFetchError(null)
    setOpciones([])

    const cargar = async () => {
      try {
        if (tipo === "trabajador") {
          const data = await TrabajadorOpcionesService.getOpciones()
          if (!activo) return
          setOpciones((data || []).map((t) => ({ value: t.nombre, label: t.nombre })))
        } else {
          const res = await ClienteService.getClientes()
          if (!activo) return
          setOpciones(
            (res.clients || []).map((c) => ({
              value: `${c.nombre} (${c.numero})`,
              label: `${c.nombre} (${c.numero})`,
            })),
          )
        }
        cargadoRef.current = tipo
      } catch (err) {
        if (!activo) return
        console.error(`ReferenciaCombobox: fallo al cargar ${tipo}s`, err)
        setOpciones([])
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

  const placeholder = tipo === "trabajador" ? "Buscar trabajador..." : "Buscar cliente..."

  return (
    <div className="space-y-1">
      <SearchableSelect
        options={opciones}
        value={value}
        onValueChange={onChange}
        placeholder={loading ? "Cargando..." : placeholder}
        searchPlaceholder={placeholder}
        disabled={loading}
      />
      {fetchError && (
        <p className="text-xs text-red-600">Error: {fetchError}</p>
      )}
    </div>
  )
}
