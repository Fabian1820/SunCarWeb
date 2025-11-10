"use client"

import { useState, useEffect, useMemo } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/shared/molecule/input'
import { Label } from '@/components/shared/atom/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/atom/select'
import { ClienteService } from '@/lib/services/feats/customer/cliente-service'
import type { Cliente } from '@/lib/api-types'

interface ClienteSelectorFieldProps {
  value: string
  onChange: (value: string) => void
  label?: string
  placeholder?: string
}

export function ClienteSelectorField({
  value,
  onChange,
  label = 'Cliente',
  placeholder = 'Busca y selecciona un cliente',
}: ClienteSelectorFieldProps) {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // Cargar todos los clientes al montar
  useEffect(() => {
    const loadClientes = async () => {
      setLoading(true)
      try {
        const data = await ClienteService.getClientes()
        setClientes(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error('Error loading clientes:', error)
        setClientes([])
      } finally {
        setLoading(false)
      }
    }
    loadClientes()
  }, [])

  // Filtrar clientes por búsqueda
  const filteredClientes = useMemo(() => {
    if (!searchTerm.trim()) return clientes

    const term = searchTerm.toLowerCase()
    return clientes.filter(
      (cliente) =>
        cliente.nombre?.toLowerCase().includes(term) ||
        cliente.numero?.toLowerCase().includes(term) ||
        cliente.direccion?.toLowerCase().includes(term)
    )
  }, [clientes, searchTerm])

  // Obtener nombre del cliente seleccionado
  const selectedCliente = clientes.find((c) => c.id === value)

  return (
    <div className="space-y-2">
      <Label>{label}</Label>

      {/* Campo de búsqueda */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre, número o dirección..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Selector de cliente */}
      <Select value={value} onValueChange={onChange} disabled={loading}>
        <SelectTrigger>
          <SelectValue
            placeholder={loading ? 'Cargando clientes...' : placeholder}
          >
            {selectedCliente
              ? `${selectedCliente.nombre || 'Sin nombre'} - ${selectedCliente.numero || 'Sin número'}`
              : placeholder}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-[300px]">
          {filteredClientes.length > 0 ? (
            filteredClientes.map((cliente) => (
              <SelectItem key={cliente.id} value={cliente.id || ''}>
                <div className="flex flex-col">
                  <span className="font-medium">
                    {cliente.nombre || 'Sin nombre'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {cliente.numero || 'Sin número'} - {cliente.direccion || 'Sin dirección'}
                  </span>
                </div>
              </SelectItem>
            ))
          ) : (
            <SelectItem value="no-clientes" disabled>
              {loading
                ? 'Cargando...'
                : searchTerm
                  ? 'No se encontraron clientes'
                  : 'No hay clientes disponibles'}
            </SelectItem>
          )}
        </SelectContent>
      </Select>

      {/* Cliente seleccionado */}
      {selectedCliente && (
        <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
          <strong>Seleccionado:</strong> {selectedCliente.nombre} -{' '}
          {selectedCliente.direccion}
        </div>
      )}
    </div>
  )
}
