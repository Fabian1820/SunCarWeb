"use client"

import { useEffect, useRef, useState } from "react"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { Loader2, Plus, Search, X } from "lucide-react"
import { MaterialService } from "@/lib/services/feats/materials/material-service"
import type { Material } from "@/lib/types/feats/materials/material-types"

export interface MaterialSeleccionado {
  codigo: string
  descripcion: string
}

interface MaterialesOfertasSelectorProps {
  seleccionados: MaterialSeleccionado[]
  onChange: (materiales: MaterialSeleccionado[]) => void
  max?: number
  disabled?: boolean
}

const mismoCodigo = (a: string, b: string) => a.trim().toUpperCase() === b.trim().toUpperCase()

export function MaterialesOfertasSelector({
  seleccionados,
  onChange,
  max = 20,
  disabled = false,
}: MaterialesOfertasSelectorProps) {
  const [texto, setTexto] = useState("")
  const [resultados, setResultados] = useState<Material[]>([])
  const [buscando, setBuscando] = useState(false)
  const [abierto, setAbierto] = useState(false)
  const contenedorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const termino = texto.trim()
    if (termino.length < 2) {
      setResultados([])
      setBuscando(false)
      return
    }
    let cancelado = false
    setBuscando(true)
    const temporizador = setTimeout(async () => {
      try {
        // El endpoint admin devuelve el `codigo` real del material; el público
        // lo expone como `id`, y el normalizador acabaría usando el nombre.
        const encontrados = await MaterialService.searchMaterialesConCosto(termino, 15)
        if (!cancelado) setResultados(encontrados)
      } catch {
        if (!cancelado) setResultados([])
      } finally {
        if (!cancelado) setBuscando(false)
      }
    }, 300)
    return () => {
      cancelado = true
      clearTimeout(temporizador)
    }
  }, [texto])

  useEffect(() => {
    const cerrar = (e: MouseEvent) => {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) setAbierto(false)
    }
    document.addEventListener("mousedown", cerrar)
    return () => document.removeEventListener("mousedown", cerrar)
  }, [])

  const lleno = seleccionados.length >= max
  const termino = texto.trim()
  const yaElegido = (codigo: string) => seleccionados.some((m) => mismoCodigo(m.codigo, codigo))
  const exacto = resultados.find((m) => mismoCodigo(String(m.codigo), termino))

  const agregar = (codigo: string, descripcion: string) => {
    const limpio = codigo.trim()
    if (!limpio || yaElegido(limpio) || lleno) return
    onChange([...seleccionados, { codigo: limpio, descripcion: descripcion.trim() || limpio }])
    setTexto("")
    setResultados([])
    setAbierto(false)
  }

  const quitar = (codigo: string) => onChange(seleccionados.filter((m) => m.codigo !== codigo))

  const alPulsarTecla = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setAbierto(false)
      return
    }
    if (e.key !== "Enter" || !termino) return
    e.preventDefault()
    const elegido = exacto ?? (resultados.length === 1 ? resultados[0] : undefined)
    if (elegido) agregar(String(elegido.codigo), elegido.nombre || elegido.descripcion)
  }

  return (
    <div ref={contenedorRef}>
      <Label htmlFor="buscar-material-ofertas">Materiales</Label>

      {seleccionados.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {seleccionados.map((m) => (
            <span
              key={m.codigo}
              className="inline-flex max-w-full items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 py-1 pl-3 pr-1 text-sm text-emerald-900"
            >
              <span className="truncate">
                <span className="font-semibold">{m.codigo}</span>
                {!mismoCodigo(m.descripcion, m.codigo) && (
                  <span className="text-emerald-800/80"> · {m.descripcion}</span>
                )}
              </span>
              <button
                type="button"
                onClick={() => quitar(m.codigo)}
                disabled={disabled}
                className="rounded-full p-1 hover:bg-emerald-100"
                aria-label={`Quitar ${m.codigo}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative mt-2">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          id="buscar-material-ofertas"
          placeholder={lleno ? `Máximo ${max} materiales` : "Busca por código o nombre: FLA 48314, batería 16kw…"}
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value)
            setAbierto(true)
          }}
          onFocus={() => setAbierto(true)}
          onKeyDown={alPulsarTecla}
          className="pl-10"
          disabled={disabled || lleno}
          autoComplete="off"
        />

        {abierto && termino.length >= 2 && (
          <div className="absolute left-0 right-0 z-20 mt-1 max-h-72 overflow-y-auto rounded-lg border bg-white shadow-lg">
            {buscando ? (
              <div className="flex items-center gap-2 px-4 py-3 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Buscando…
              </div>
            ) : (
              <>
                {resultados.length === 0 && (
                  <p className="px-4 py-3 text-sm text-gray-500">Ningún material del catálogo coincide.</p>
                )}
                {resultados.map((m) => {
                  const codigo = String(m.codigo)
                  const elegido = yaElegido(codigo)
                  return (
                    <button
                      key={`${m.producto_id ?? m.id}-${codigo}`}
                      type="button"
                      disabled={elegido}
                      onClick={() => agregar(codigo, m.nombre || m.descripcion)}
                      className="flex w-full items-start justify-between gap-3 border-b px-4 py-2 text-left last:border-b-0 hover:bg-emerald-50 disabled:cursor-default disabled:opacity-50"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-gray-900">
                          {m.nombre || m.descripcion}
                        </span>
                        <span className="block text-xs text-gray-500">
                          {codigo}
                          {m.categoria ? ` · ${m.categoria}` : ""}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-gray-500">
                        {elegido ? "Añadido" : typeof m.precio === "number" ? `$${m.precio.toFixed(2)}` : ""}
                      </span>
                    </button>
                  )
                })}
                {!exacto && !yaElegido(termino) && (
                  <button
                    type="button"
                    onClick={() => agregar(termino, termino)}
                    className="flex w-full items-center gap-2 border-t px-4 py-2 text-left text-sm text-emerald-800 hover:bg-emerald-50"
                  >
                    <Plus className="h-4 w-4" /> Buscar el código «{termino}» tal cual, aunque no esté en el catálogo
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
      <p className="mt-1 text-xs text-gray-500">Puedes añadir varios materiales (hasta {max}) y buscarlos juntos.</p>
    </div>
  )
}
