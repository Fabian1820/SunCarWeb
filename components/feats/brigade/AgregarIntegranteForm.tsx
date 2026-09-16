"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/molecule/input"
import { Search, Check, UserPlus, X } from "lucide-react"
import type { Trabajador } from "@/lib/api-types"

export function AgregarIntegranteForm({ onSubmit, onCancel, loading, candidatos }: {
  onSubmit: (data: { trabajador: Trabajador }) => void
  onCancel: () => void
  loading?: boolean
  candidatos: Trabajador[]
}) {
  const [query, setQuery] = useState("")
  const [ci, setCi] = useState("")

  const filtrados = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return candidatos
    return candidatos.filter(
      (t) => t.nombre.toLowerCase().includes(q) || t.CI.includes(q),
    )
  }, [query, candidatos])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trabajador = candidatos.find((t) => t.CI === ci)
    if (!trabajador) return
    onSubmit({ trabajador })
  }

  if (candidatos.length === 0) {
    return (
      <div className="space-y-4">
        <div className="px-3 py-8 text-sm text-gray-500 text-center border rounded-lg">
          No hay instaladores disponibles: todos ya están en alguna brigada o son jefes.
        </div>
        <div className="flex justify-end">
          <Button type="button" variant="outline" onClick={onCancel} size="icon" className="w-10 sm:w-auto sm:px-4 touch-manipulation">
            <X className="h-4 w-4" />
            <span className="hidden sm:inline">Cerrar</span>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre o CI..."
          className="pl-9"
        />
      </div>

      <div className="border rounded-lg max-h-72 overflow-y-auto divide-y divide-gray-100">
        {filtrados.length > 0 ? (
          filtrados.map((t) => {
            const selected = t.CI === ci
            return (
              <button
                key={t.CI}
                type="button"
                onClick={() => setCi(t.CI)}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left touch-manipulation ${
                  selected ? "bg-blue-50" : "hover:bg-gray-50"
                }`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{t.nombre}</p>
                  <p className="text-xs text-gray-500">CI: {t.CI}</p>
                </div>
                {selected && <Check className="h-4 w-4 text-blue-600 shrink-0" />}
              </button>
            )
          })
        ) : (
          <p className="text-sm text-gray-500 text-center py-6">Sin resultados</p>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
          size="icon"
          className="w-10 sm:w-auto sm:px-4 touch-manipulation"
          title="Cancelar"
          aria-label="Cancelar"
        >
          <X className="h-4 w-4" />
          <span className="hidden sm:inline">Cancelar</span>
          <span className="sr-only">Cancelar</span>
        </Button>
        <Button
          type="submit"
          disabled={loading || !ci}
          size="icon"
          className="w-10 sm:w-auto sm:px-4 touch-manipulation"
          title="Agregar"
          aria-label="Agregar"
        >
          <UserPlus className="h-4 w-4" />
          <span className="hidden sm:inline">{loading ? "Agregando..." : "Agregar"}</span>
          <span className="sr-only">{loading ? "Agregando..." : "Agregar"}</span>
        </Button>
      </div>
    </form>
  )
}
