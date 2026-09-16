"use client"

import { useState } from "react"
import { Button } from "@/components/shared/atom/button"
import { Label } from "@/components/shared/atom/label"
import { SearchableSelect } from "@/components/shared/molecule/searchable-select"
import { UserPlus, X } from "lucide-react"
import type { Trabajador } from "@/lib/api-types"

export function AgregarIntegranteForm({ onSubmit, onCancel, loading, candidatos }: {
  onSubmit: (data: { trabajador: Trabajador }) => void
  onCancel: () => void
  loading?: boolean
  candidatos: Trabajador[]
}) {
  const [ci, setCi] = useState("")
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const trabajador = candidatos.find((t) => t.CI === ci)
    if (!trabajador) {
      setError("Selecciona un trabajador")
      return
    }
    onSubmit({ trabajador })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label className="text-sm font-medium text-gray-700 mb-2 block">
          Trabajador a agregar
        </Label>
        {candidatos.length === 0 ? (
          <div className="px-2 py-4 text-sm text-gray-500 text-center border rounded-md">
            No hay instaladores disponibles: todos ya están en alguna brigada o son jefes.
          </div>
        ) : (
          <SearchableSelect
            value={ci}
            onValueChange={setCi}
            options={candidatos.map((t) => ({
              value: t.CI,
              label: `${t.nombre} (CI: ${t.CI})`,
            }))}
            placeholder="Seleccione un trabajador"
            searchPlaceholder="Buscar por nombre o CI..."
            disablePortal
            className={error ? "border-red-300" : ""}
          />
        )}
        {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
      </div>
      <div className="flex justify-end gap-2 pt-2">
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
          disabled={loading || candidatos.length === 0}
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
