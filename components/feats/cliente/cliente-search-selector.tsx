"use client"

import { useMemo, useState } from "react"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { Button } from "@/components/shared/atom/button"
import { Search, User, X } from "lucide-react"
import type { Cliente } from "@/lib/types/feats/customer/cliente-types"

interface ClienteSearchSelectorProps {
  label: string
  clients: Cliente[]
  value: string
  onChange: (id: string) => void
  placeholder?: string
  disabled?: boolean
  loading?: boolean
}

export function ClienteSearchSelector({
  label,
  clients,
  value,
  onChange,
  placeholder = "Buscar cliente...",
  disabled = false,
  loading = false,
}: ClienteSearchSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [showResults, setShowResults] = useState(false)

  const selectedCliente = clients.find(
    (cliente) => cliente.id === value || cliente.numero === value
  )

  const filteredClientes = useMemo(() => {
    if (!searchTerm.trim()) return []
    const term = searchTerm.toLowerCase()
    return clients.filter(
      (cliente) =>
        cliente.nombre?.toLowerCase().includes(term) ||
        cliente.numero?.toLowerCase().includes(term) ||
        cliente.direccion?.toLowerCase().includes(term)
    )
  }, [clients, searchTerm])

  const handleSelect = (id: string) => {
    onChange(id)
    setSearchTerm("")
    setShowResults(false)
  }

  const handleClear = () => {
    onChange("")
    setSearchTerm("")
    setShowResults(false)
  }

  const handleSearchFocus = () => {
    if (!selectedCliente) {
      setShowResults(true)
    }
  }

  return (
    <div className="relative">
      <Label>{label}</Label>

      {selectedCliente && !showResults ? (
        <div className="mt-1 h-10 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg flex items-center">
          <div className="flex items-center justify-between gap-2 w-full">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-blue-900 truncate text-sm leading-tight">
                {selectedCliente.nombre || "Sin nombre"}
              </p>
              <p className="text-xs text-blue-700">
                {selectedCliente.numero ? `Código: ${selectedCliente.numero}` : "Sin código"}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              disabled={disabled}
              className="text-blue-700 hover:text-blue-900 hover:bg-blue-100 flex-shrink-0 h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="relative mt-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder={loading ? "Cargando..." : placeholder}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setShowResults(true)
              }}
              onFocus={handleSearchFocus}
              className="pl-10"
              disabled={disabled || loading}
            />
          </div>

          {showResults && searchTerm && (
            <div className="absolute z-10 left-0 right-0 mt-1 border rounded-lg max-h-[180px] overflow-y-auto bg-white shadow-lg">
              {loading ? (
                <div className="px-4 py-6 text-center text-gray-500">
                  Cargando clientes...
                </div>
              ) : filteredClientes.length > 0 ? (
                <div className="divide-y">
                  {filteredClientes.slice(0, 20).map((cliente) => {
                    const id = cliente.id || cliente.numero
                    if (!id) return null
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => handleSelect(id)}
                        className="w-full text-left px-4 py-2.5 hover:bg-blue-50 transition-colors focus:bg-blue-50 focus:outline-none"
                      >
                        <p className="font-medium text-gray-900 text-sm">
                          {cliente.nombre || "Sin nombre"}
                        </p>
                        <p className="text-xs text-gray-600 mt-0.5">
                          {(cliente.numero || "Sin código") +
                            " - " +
                            (cliente.direccion || "Sin dirección")}
                        </p>
                      </button>
                    )
                  })}
                  {filteredClientes.length > 20 && (
                    <div className="px-4 py-2 text-xs text-gray-500 text-center bg-gray-50">
                      Mostrando 20 de {filteredClientes.length} resultados
                    </div>
                  )}
                </div>
              ) : (
                <div className="px-4 py-6 text-center">
                  <User className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No se encontraron clientes</p>
                  <p className="text-xs text-gray-400 mt-1">Intenta con otro término</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
