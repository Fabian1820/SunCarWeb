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
import {
  FUENTES_FIJAS,
  fuenteRequiereReferencia,
  etiquetaReferencia,
} from "@/lib/constants/fuentes"
import { SedeService, TrabajadorService, ClienteService } from "@/lib/api-services"

interface FuenteSelectorProps {
  fuente: string
  fuenteReferencia?: string
  onChange: (fuente: string, fuenteReferencia: string) => void
}

type Opcion = { value: string; label: string }

/**
 * Selector de fuente con lista FIJA. Para "Sucursal", "Trabajador" y
 * "Otro cliente" muestra un sub-selector con la referencia concreta.
 */
export function FuenteSelector({
  fuente,
  fuenteReferencia,
  onChange,
}: FuenteSelectorProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="fuente">Fuente</Label>
        <Select
          value={fuente || undefined}
          onValueChange={(value) => {
            // Al cambiar el tipo de fuente, se limpia la referencia previa.
            onChange(value, "")
          }}
        >
          <SelectTrigger id="fuente" className="text-gray-900">
            <SelectValue placeholder="Seleccionar fuente" />
          </SelectTrigger>
          <SelectContent>
            {FUENTES_FIJAS.map((f) => (
              <SelectItem key={f} value={f}>
                {f}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {fuenteRequiereReferencia(fuente) && (
        <div className="space-y-1">
          <Label>{etiquetaReferencia(fuente)}</Label>
          {fuente === "Sucursal" ? (
            <SucursalSelect
              value={fuenteReferencia || ""}
              onChange={(v) => onChange(fuente, v)}
            />
          ) : (
            <ReferenciaCombobox
              tipo={fuente as "Trabajador" | "Otro cliente"}
              value={fuenteReferencia || ""}
              onChange={(v) => onChange(fuente, v)}
            />
          )}
        </div>
      )}
    </div>
  )
}

/** Sub-selector de sucursal: lista las sedes. */
function SucursalSelect({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const [sedes, setSedes] = useState<Opcion[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let activo = true
    setLoading(true)
    SedeService.getSedes()
      .then((data) => {
        if (!activo) return
        setSedes(
          (data || []).map((s) => ({ value: s.nombre, label: s.nombre })),
        )
      })
      .catch(() => activo && setSedes([]))
      .finally(() => activo && setLoading(false))
    return () => {
      activo = false
    }
  }, [])

  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger className="text-gray-900">
        <SelectValue
          placeholder={loading ? "Cargando sucursales..." : "Seleccionar sucursal"}
        />
      </SelectTrigger>
      <SelectContent>
        {sedes.map((s) => (
          <SelectItem key={s.value} value={s.value}>
            {s.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/** Combobox buscable para Trabajador (lista local) y Otro cliente (búsqueda async). */
function ReferenciaCombobox({
  tipo,
  value,
  onChange,
}: {
  tipo: "Trabajador" | "Otro cliente"
  value: string
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [opciones, setOpciones] = useState<Opcion[]>([])
  const [loading, setLoading] = useState(false)
  const trabajadoresCargados = useRef(false)

  // Trabajadores: cargar todos una vez (filtrado en cliente).
  useEffect(() => {
    if (tipo !== "Trabajador" || trabajadoresCargados.current) return
    trabajadoresCargados.current = true
    setLoading(true)
    TrabajadorService.getAllTrabajadores()
      .then((data) => {
        setOpciones(
          (data || [])
            .filter((t) => t.activo !== false)
            .map((t) => ({ value: t.nombre, label: t.nombre })),
        )
      })
      .catch(() => setOpciones([]))
      .finally(() => setLoading(false))
  }, [tipo])

  // Otro cliente: búsqueda async con debounce.
  useEffect(() => {
    if (tipo !== "Otro cliente") return
    const term = query.trim()
    let activo = true
    setLoading(true)
    const t = setTimeout(async () => {
      try {
        const res = await ClienteService.getClientes({
          q: term || undefined,
          limit: 20,
        })
        if (!activo) return
        setOpciones(
          (res.clients || []).map((c) => ({
            value: `${c.nombre} (${c.numero})`,
            label: `${c.nombre} (${c.numero})`,
          })),
        )
      } catch {
        if (activo) setOpciones([])
      } finally {
        if (activo) setLoading(false)
      }
    }, 300)
    return () => {
      activo = false
      clearTimeout(t)
    }
  }, [tipo, query])

  const placeholder =
    tipo === "Trabajador" ? "Buscar trabajador..." : "Buscar cliente..."

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
        <Command shouldFilter={tipo === "Trabajador"}>
          <CommandInput
            placeholder={placeholder}
            value={query}
            onValueChange={setQuery}
          />
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
                      onSelect={() => {
                        onChange(o.value)
                        setOpen(false)
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === o.value ? "opacity-100" : "opacity-0",
                        )}
                      />
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
