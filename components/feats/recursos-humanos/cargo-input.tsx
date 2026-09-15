"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, Check, Plus } from "lucide-react"
import { Input } from "@/components/shared/molecule/input"
import { RecursosHumanosService } from "@/lib/services/feats/recursos-humanos/recursos-humanos-service"
import type { CargoEnUso } from "@/lib/recursos-humanos-types"
import { normalizeSearchText } from "@/lib/utils/string-utils"
import { cn } from "@/lib/utils"

// El cargo se escribía a mano y así aparecieron "Custodio Las tunas" y "Custodio las tunas",
// o "Montage" y "Montaje". Este campo sugiere los cargos que ya existen y avisa antes de
// crear uno parecido. El backend, además, guarda la forma existente si solo cambian
// mayúsculas, tildes o espacios.

const clave = (texto: string) => normalizeSearchText(texto).replace(/\s+/g, " ").trim()

function distancia(a: string, b: string): number {
  let anterior = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const actual = [i]
    for (let j = 1; j <= b.length; j++) {
      actual[j] = Math.min(
        anterior[j] + 1,
        actual[j - 1] + 1,
        anterior[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      )
    }
    anterior = actual
  }
  return anterior[b.length]
}

/** Parecido: uno contiene al otro como palabras completas, o difieren en pocas letras. */
function esParecido(a: string, b: string): boolean {
  const [corto, largo] = a.length <= b.length ? [a, b] : [b, a]
  if (corto.length >= 4 && ` ${largo} `.includes(` ${corto} `)) return true
  return distancia(a, b) <= Math.max(1, Math.floor(largo.length * 0.2))
}

const personas = (n: number) => `${n} ${n === 1 ? "persona" : "personas"}`

interface CargoInputProps {
  value: string
  onChange: (cargo: string) => void
  /** Enter sin ninguna sugerencia resaltada. */
  onEnter?: () => void
  /** Escape con la lista ya cerrada. */
  onEscape?: () => void
  id?: string
  placeholder?: string
  disabled?: boolean
  autoFocus?: boolean
  className?: string
  inputClassName?: string
}

export function CargoInput({
  value,
  onChange,
  onEnter,
  onEscape,
  id,
  placeholder = "Escribe o elige un cargo",
  disabled,
  autoFocus,
  className,
  inputClassName,
}: CargoInputProps) {
  const [cargos, setCargos] = useState<CargoEnUso[] | null>(null)
  const [abierto, setAbierto] = useState(false)
  const [resaltado, setResaltado] = useState(-1)

  useEffect(() => {
    let vigente = true
    RecursosHumanosService.getCargosEnUso()
      .then((lista) => { if (vigente) setCargos(lista) })
      .catch((err) => {
        // Sin la lista el campo sigue funcionando como texto libre.
        console.error("No se pudieron cargar los cargos existentes:", err)
        if (vigente) setCargos([])
      })
    return () => { vigente = false }
  }, [])

  const escrito = clave(value)

  const sugerencias = useMemo(() => {
    if (!cargos) return []
    return cargos.filter((c) => !escrito || clave(c.cargo).includes(escrito)).slice(0, 50)
  }, [cargos, escrito])

  const { exacto, parecidos } = useMemo(() => {
    if (!cargos || !escrito) return { exacto: undefined, parecidos: [] as CargoEnUso[] }
    const exacto = cargos.find((c) => clave(c.cargo) === escrito)
    const parecidos = exacto ? [] : cargos.filter((c) => esParecido(clave(c.cargo), escrito)).slice(0, 4)
    return { exacto, parecidos }
  }, [cargos, escrito])

  const elegir = (cargo: string) => {
    onChange(cargo)
    setAbierto(false)
    setResaltado(-1)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault()
      if (!abierto) { setAbierto(true); return }
      const paso = e.key === "ArrowDown" ? 1 : -1
      setResaltado((i) => Math.max(-1, Math.min(sugerencias.length - 1, i + paso)))
    } else if (e.key === "Enter") {
      if (abierto && resaltado >= 0 && sugerencias[resaltado]) {
        e.preventDefault()
        elegir(sugerencias[resaltado].cargo)
      } else if (onEnter) {
        e.preventDefault()
        setAbierto(false)
        onEnter()
      }
    } else if (e.key === "Escape") {
      if (abierto) {
        e.preventDefault()
        e.stopPropagation()
        setAbierto(false)
      } else {
        onEscape?.()
      }
    }
  }

  const mostrarLista = abierto && !disabled && sugerencias.length > 0
  // Si ya coincide exactamente con el único resultado, la lista no aporta nada.
  const listaRedundante = sugerencias.length === 1 && sugerencias[0].cargo === value.trim()

  return (
    <div className={cn("relative", className)}>
      <Input
        id={id}
        type="text"
        value={value}
        autoComplete="off"
        autoFocus={autoFocus}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => { onChange(e.target.value); setAbierto(true); setResaltado(-1) }}
        onFocus={() => setAbierto(true)}
        onBlur={() => setAbierto(false)}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-expanded={mostrarLista}
        aria-autocomplete="list"
        className={inputClassName}
      />

      {mostrarLista && !listaRedundante && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 z-50 mt-1 max-h-56 overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg"
        >
          {sugerencias.map((c, i) => (
            <li
              key={c.cargo}
              role="option"
              aria-selected={i === resaltado}
              // mousedown en vez de click: el blur del input cerraría la lista antes.
              onMouseDown={(e) => { e.preventDefault(); elegir(c.cargo) }}
              onMouseEnter={() => setResaltado(i)}
              className={cn(
                "flex cursor-pointer items-center justify-between gap-3 px-3 py-1.5 text-sm",
                i === resaltado ? "bg-[#E6F4EF] text-[#012928]" : "text-gray-800",
              )}
            >
              <span className="truncate">{c.cargo}</span>
              <span className="shrink-0 text-xs text-gray-400">{personas(c.cantidad)}</span>
            </li>
          ))}
        </ul>
      )}

      {cargos && escrito && (!mostrarLista || listaRedundante) && (
        <div className="mt-1 text-xs">
          {exacto ? (
            exacto.cargo === value.trim() ? (
              <p className="flex items-center gap-1 text-emerald-700">
                <Check className="h-3 w-3" /> Cargo existente · {personas(exacto.cantidad)}
              </p>
            ) : (
              <p className="text-gray-600">
                Ya existe como{" "}
                <button type="button" className="font-medium text-[#012928] underline" onMouseDown={(e) => { e.preventDefault(); elegir(exacto.cargo) }}>
                  {exacto.cargo}
                </button>
                ; se guardará así.
              </p>
            )
          ) : parecidos.length > 0 ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-amber-800">
              <p className="flex items-center gap-1 font-medium">
                <AlertTriangle className="h-3 w-3" /> ¿Es alguno de estos? Así no se repite el cargo:
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                {parecidos.map((c) => (
                  <button
                    key={c.cargo}
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); elegir(c.cargo) }}
                    className="rounded border border-amber-300 bg-white px-1.5 py-0.5 text-amber-900 hover:bg-amber-100"
                  >
                    {c.cargo}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="flex items-center gap-1 text-gray-500">
              <Plus className="h-3 w-3" /> Cargo nuevo: se añadirá a la lista.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
