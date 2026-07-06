"use client"

import { useEffect, useRef, useState } from "react"
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"

import { Label } from "@/components/shared/atom/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select"
import { Button } from "@/components/shared/atom/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/shared/molecule/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/shared/molecule/command"
import { cn } from "@/lib/utils"
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

  useEffect(() => {
    let activo = true
    setLoadingFuentes(true)
    FuenteService.getFuentes(true)
      .then((data) => { if (activo) setFuentes(data) })
      .catch(() => { if (activo) setFuentes([]) })
      .finally(() => { if (activo) setLoadingFuentes(false) })
    return () => { activo = false }
  }, [])

  const fuenteActual = fuentes.find((f) => f.nombre === fuente)

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
      </div>

      {fuenteActual?.requiere_referencia && (
        <div className="space-y-1">
          <Label>{etiquetaReferencia(fuenteActual.tipo_referencia)}</Label>
          {fuenteActual.tipo_referencia === "sucursal" ? (
            <SucursalSelect
              value={fuenteReferencia || ""}
              onChange={(v) => onChange(fuente, v)}
            />
          ) : (
            <ReferenciaCombobox
              tipo={fuenteActual.tipo_referencia!}
              value={fuenteReferencia || ""}
              onChange={(v) => onChange(fuente, v)}
            />
          )}
        </div>
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

/** Trabajadores: endpoint ligero /trabajadores/opciones (solo id+nombre) */
/** Clientes: búsqueda async con debounce, limit 20 */
function ReferenciaCombobox({
  tipo,
  value,
  onChange,
}: {
  tipo: "trabajador" | "cliente"
  value: string
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [opciones, setOpciones] = useState<Opcion[]>([])
  const [loading, setLoading] = useState(false)
  const cargado = useRef(false)

  // Trabajadores: endpoint ligero, carga única
  useEffect(() => {
    if (tipo !== "trabajador" || cargado.current) return
    cargado.current = true
    setLoading(true)
    TrabajadorOpcionesService.getOpciones()
      .then((data) => {
        setOpciones((data || []).map((t) => ({ value: t.nombre, label: t.nombre })))
      })
      .catch(() => setOpciones([]))
      .finally(() => setLoading(false))
  }, [tipo])

  // Clientes: búsqueda async con debounce
  useEffect(() => {
    if (tipo !== "cliente") return
    let activo = true
    setLoading(true)
    const t = setTimeout(async () => {
      try {
        const res = await ClienteService.getClientes({ q: query.trim() || undefined, limit: 20 })
        if (!activo) return
        setOpciones(
          (res.clients || []).map((c) => ({
            value: `${c.nombre} (${c.numero})`,
            label: `${c.nombre} (${c.numero})`,
          }))
        )
      } catch {
        if (activo) setOpciones([])
      } finally {
        if (activo) setLoading(false)
      }
    }, 300)
    return () => { activo = false; clearTimeout(t) }
  }, [tipo, query])

  const placeholder = tipo === "trabajador" ? "Buscar trabajador..." : "Buscar cliente..."

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal text-gray-900"
        >
          <span className={cn("truncate", !value && "text-gray-400")}>
            {value || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={tipo === "trabajador"}>
          <CommandInput placeholder={placeholder} value={query} onValueChange={setQuery} />
          <CommandList>
            {loading ? (
              <div className="flex items-center justify-center py-6 text-sm text-gray-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cargando...
              </div>
            ) : (
              <>
                <CommandEmpty>Sin resultados</CommandEmpty>
                <CommandGroup>
                  {opciones.map((o) => (
                    <CommandItem
                      key={o.value}
                      value={o.value}
                      onSelect={() => { onChange(o.value); setOpen(false) }}
                    >
                      <Check className={cn("mr-2 h-4 w-4", value === o.value ? "opacity-100" : "opacity-0")} />
                      {o.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
