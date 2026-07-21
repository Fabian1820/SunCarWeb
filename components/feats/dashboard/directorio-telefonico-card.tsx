"use client"

import { useEffect, useState } from "react"
import { Phone, Search, Briefcase, Loader2, Contact } from "lucide-react"
import { WorkerAvatar } from "@/components/feats/worker/worker-avatar"
import { TrabajadorService } from "@/lib/api-services"
import type { TrabajadorDirectorioItem } from "@/lib/types/feats/trabajador/directorio-types"

const RESULT_LIMIT = 8

export function DirectorioTelefonicoCard() {
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [resultados, setResultados] = useState<TrabajadorDirectorioItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Debounce: evita disparar una búsqueda al backend en cada tecla.
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedQuery(query.trim())
    }, 350)
    return () => window.clearTimeout(timeoutId)
  }, [query])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    TrabajadorService.buscarDirectorio(debouncedQuery, RESULT_LIMIT)
      .then((data) => {
        if (cancelled) return
        setResultados(data)
      })
      .catch((e) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : "No se pudo cargar el directorio")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [debouncedQuery])

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200/70 bg-white/80 shadow-sm backdrop-blur-sm">
      <div className="flex items-center gap-3 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-white px-5 py-4">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
          <Contact className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Directorio telefónico
          </p>
          <p className="text-sm text-gray-500">Busca a un compañero por nombre o cargo</p>
        </div>
      </div>

      <div className="px-5 py-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ej: María, Comercial, Almacén..."
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        <div className="mt-3 space-y-1.5">
          {loading ? (
            <div className="flex items-center justify-center py-6 text-gray-400">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : error ? (
            <p className="py-4 text-center text-sm text-red-600">{error}</p>
          ) : resultados.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-500">
              No se encontraron trabajadores para &quot;{debouncedQuery}&quot;.
            </p>
          ) : (
            resultados.map((trabajador) => (
              <div
                key={trabajador.CI}
                className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-gray-50"
              >
                <WorkerAvatar
                  src={trabajador.foto_perfil}
                  nombre={trabajador.nombre}
                  className="h-10 w-10 flex-shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900" title={trabajador.nombre}>
                    {trabajador.nombre}
                  </p>
                  <p className="flex items-center gap-1 truncate text-xs text-gray-500" title={trabajador.cargo}>
                    <Briefcase className="h-3 w-3 flex-shrink-0" />
                    {trabajador.cargo || "No definido"}
                  </p>
                </div>
                {trabajador.telefono ? (
                  <a
                    href={`tel:${trabajador.telefono}`}
                    className="flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-100"
                    title={`Llamar a ${trabajador.nombre}`}
                  >
                    <Phone className="h-3.5 w-3.5" />
                    {trabajador.telefono}
                  </a>
                ) : (
                  <span className="flex-shrink-0 text-xs text-gray-400">Sin teléfono</span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
