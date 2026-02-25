"use client"

import { useState, useEffect, useMemo } from 'react'
import { Search, User, UserPlus } from 'lucide-react'
import { Input } from '@/components/shared/molecule/input'
import { Label } from '@/components/shared/atom/label'
import { Button } from '@/components/shared/atom/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/atom/select'
import { ClienteService } from '@/lib/services/feats/customer/cliente-service'
import { LeadService } from '@/lib/api-services'
import type { Cliente, Lead } from '@/lib/api-types'

type ContactType = 'cliente' | 'lead'

interface ClienteSelectorFieldProps {
  contactType: ContactType
  onContactTypeChange: (value: ContactType) => void
  clienteId: string
  leadId: string
  onClienteChange: (value: string) => void
  onLeadChange: (value: string) => void
  label?: string
  showContactTypeToggle?: boolean
}

type ClienteWithId = Cliente & { id?: string }

export function ClienteSelectorField({
  contactType,
  onContactTypeChange,
  clienteId,
  leadId,
  onClienteChange,
  onLeadChange,
  label = 'Destinatario',
  showContactTypeToggle = true,
}: ClienteSelectorFieldProps) {
  const [clientes, setClientes] = useState<ClienteWithId[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [clientesLoading, setClientesLoading] = useState(false)
  const [leadsLoading, setLeadsLoading] = useState(false)
  const [clienteSearch, setClienteSearch] = useState('')
  const [leadSearch, setLeadSearch] = useState('')

  // Cargar todos los clientes al montar
  useEffect(() => {
    const loadClientes = async () => {
      setClientesLoading(true)
      try {
        const data = await ClienteService.getClientes()
        // El servicio devuelve { clients: Cliente[], total, skip, limit }
        setClientes(data.clients || [])
      } catch (error) {
        console.error('Error loading clientes:', error)
        setClientes([])
      } finally {
        setClientesLoading(false)
      }
    }
    loadClientes()
  }, [])

  // Cargar leads al montar
  useEffect(() => {
    const loadLeads = async () => {
      setLeadsLoading(true)
      try {
        const { leads } = await LeadService.getLeads()
        setLeads(Array.isArray(leads) ? leads : [])
      } catch (error) {
        console.error('Error loading leads:', error)
        setLeads([])
      } finally {
        setLeadsLoading(false)
      }
    }
    loadLeads()
  }, [])

  // Filtrar clientes por búsqueda
  const filteredClientes = useMemo(() => {
    if (!clienteSearch.trim()) return clientes

    const term = clienteSearch.toLowerCase()
    return clientes.filter(
      (cliente) =>
        cliente.nombre?.toLowerCase().includes(term) ||
        cliente.numero?.toLowerCase().includes(term) ||
        cliente.direccion?.toLowerCase().includes(term)
    )
  }, [clientes, clienteSearch])

  // Filtrar leads por búsqueda
  const filteredLeads = useMemo(() => {
    if (!leadSearch.trim()) return leads

    const term = leadSearch.toLowerCase()
    return leads.filter(
      (lead) =>
        lead.nombre?.toLowerCase().includes(term) ||
        lead.telefono?.toLowerCase().includes(term) ||
        lead.estado?.toLowerCase().includes(term) ||
        lead.direccion?.toLowerCase().includes(term)
    )
  }, [leads, leadSearch])

  const selectedCliente = clientes.find(
    (c) => c.id === clienteId || c.numero === clienteId || c.nombre === clienteId
  )
  const selectedLead = leads.find(
    (l) => l.id === leadId || l.telefono === leadId || l.nombre === leadId
  )
  const usingClientes = contactType === 'cliente'
  const selectPlaceholder = usingClientes
    ? clientesLoading
      ? 'Cargando clientes...'
      : 'Selecciona un cliente'
    : leadsLoading
      ? 'Cargando leads...'
      : 'Selecciona un lead'

  const currentValue = usingClientes ? clienteId : leadId

  const renderClienteOption = (cliente: ClienteWithId, index: number) => {
    const value = cliente.id || cliente.numero || `cliente-${index}`
    return (
      <SelectItem key={value} value={value}>
        <div className="flex flex-col">
          <span className="font-medium">{cliente.nombre || 'Sin nombre'}</span>
          <span className="text-xs text-muted-foreground">
            {(cliente.numero || 'Sin número') +
              ' · ' +
              (cliente.direccion || 'Sin dirección')}
          </span>
        </div>
      </SelectItem>
    )
  }

  const renderLeadOption = (lead: Lead, index: number) => {
    const value = lead.id || lead.telefono || lead.nombre || `lead-${index}`
    return (
      <SelectItem key={value} value={value}>
        <div className="flex flex-col">
          <span className="font-medium">{lead.nombre || 'Sin nombre'}</span>
          <span className="text-xs text-muted-foreground">
            {(lead.telefono || 'Sin teléfono') +
              ' · ' +
              (lead.estado || 'Sin estado')}
          </span>
        </div>
      </SelectItem>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        {showContactTypeToggle ? (
          <div className="flex gap-2">
            <Button
              type="button"
              variant={contactType === 'cliente' ? 'default' : 'outline'}
              size="sm"
              className="flex items-center gap-2"
              onClick={() => onContactTypeChange('cliente')}
            >
              <User className="h-4 w-4" />
              Cliente
            </Button>
            <Button
              type="button"
              variant={contactType === 'lead' ? 'default' : 'outline'}
              size="sm"
              className="flex items-center gap-2"
              onClick={() => onContactTypeChange('lead')}
            >
              <UserPlus className="h-4 w-4" />
              Lead
            </Button>
          </div>
        ) : null}
      </div>

      {/* Campo de búsqueda */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={
            usingClientes
              ? 'Buscar por nombre, número o dirección...'
              : 'Buscar por nombre, teléfono o estado...'
          }
          value={usingClientes ? clienteSearch : leadSearch}
          onChange={(e) =>
            usingClientes ? setClienteSearch(e.target.value) : setLeadSearch(e.target.value)
          }
          className="pl-10"
        />
      </div>

      {/* Selector de cliente o lead */}
      <Select
        value={currentValue}
        onValueChange={(val) => (usingClientes ? onClienteChange(val) : onLeadChange(val))}
        disabled={usingClientes ? clientesLoading : leadsLoading}
      >
        <SelectTrigger>
          <SelectValue placeholder={selectPlaceholder}>
            {usingClientes
              ? selectedCliente
                ? `${selectedCliente.nombre || 'Sin nombre'} - ${selectedCliente.numero || selectedCliente.id || 'Sin número'}`
                : selectPlaceholder
              : selectedLead
                ? `${selectedLead.nombre || 'Sin nombre'} - ${selectedLead.telefono || 'Sin teléfono'}`
                : selectPlaceholder}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-[320px]">
          {usingClientes
            ? filteredClientes.length > 0
              ? filteredClientes.map((cliente, index) => renderClienteOption(cliente, index))
              : (
                <SelectItem value="no-clientes" disabled>
                  {clientesLoading
                    ? 'Cargando...'
                    : clienteSearch
                      ? 'No se encontraron clientes'
                      : 'No hay clientes disponibles'}
                </SelectItem>
                )
            : filteredLeads.length > 0
              ? filteredLeads.map((lead, index) => renderLeadOption(lead, index))
              : (
                <SelectItem value="no-leads" disabled>
                  {leadsLoading
                    ? 'Cargando...'
                    : leadSearch
                      ? 'No se encontraron leads'
                      : 'No hay leads disponibles'}
                </SelectItem>
                )}
        </SelectContent>
      </Select>

      {/* Resumen seleccionado */}
      {usingClientes && selectedCliente && (
        <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
          <strong>Cliente:</strong> {selectedCliente.nombre || 'Sin nombre'} ·{' '}
          {selectedCliente.direccion || 'Sin dirección'}
        </div>
      )}
      {!usingClientes && selectedLead && (
        <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
          <strong>Lead:</strong> {selectedLead.nombre || 'Sin nombre'} ·{' '}
          {selectedLead.telefono || 'Sin teléfono'}
        </div>
      )}
    </div>
  )
}
