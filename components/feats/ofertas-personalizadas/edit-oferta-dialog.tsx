"use client"

import { useState, useEffect, FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/shared/atom/button'
import { Input } from '@/components/shared/molecule/input'
import { Label } from '@/components/shared/atom/label'
import { Checkbox } from '@/components/shared/molecule/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/shared/molecule/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shared/molecule/tabs'
import { ClienteSelectorField } from './cliente-selector-field'
import { EquiposField } from './equipos-field'
import { UtilesField } from './utiles-field'
import { ServicioSelectorField } from './servicio-selector-field'
import type {
  OfertaPersonalizada,
  OfertaPersonalizadaUpdateRequest,
  InversorItem,
  BateriaItem,
  PanelItem,
  UtilItem,
  ServicioOfertaItem,
} from '@/lib/types/feats/ofertas-personalizadas/oferta-personalizada-types'

interface EditOfertaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  oferta: OfertaPersonalizada | null
  onSubmit: (id: string, data: OfertaPersonalizadaUpdateRequest) => Promise<void>
  isLoading?: boolean
}

export function EditOfertaDialog({
  open,
  onOpenChange,
  oferta,
  onSubmit,
  isLoading = false,
}: EditOfertaDialogProps) {
  const [contactType, setContactType] = useState<'cliente' | 'lead'>('cliente')
  const [clienteId, setClienteId] = useState<string>('')
  const [leadId, setLeadId] = useState<string>('')
  const [inversores, setInversores] = useState<InversorItem[]>([])
  const [baterias, setBaterias] = useState<BateriaItem[]>([])
  const [paneles, setPaneles] = useState<PanelItem[]>([])
  const [utiles, setUtiles] = useState<UtilItem[]>([])
  const [servicios, setServicios] = useState<ServicioOfertaItem[]>([])
  const [precio, setPrecio] = useState<string>('')
  const [pagada, setPagada] = useState<boolean>(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Cargar datos de la oferta cuando cambia
  useEffect(() => {
    if (oferta) {
      const hasLead = Boolean(oferta.lead_id)
      setContactType(hasLead ? 'lead' : 'cliente')
      setClienteId(oferta.cliente_id || '')
      setLeadId(oferta.lead_id || '')
      setInversores(oferta.inversores || [])
      setBaterias(oferta.baterias || [])
      setPaneles(oferta.paneles || [])
      setUtiles(oferta.utiles || [])
      setServicios(oferta.servicios || [])
      setPrecio(oferta.precio !== undefined ? oferta.precio.toString() : '')
      setPagada(oferta.pagada || false)
      setErrors({})
    }
  }, [oferta])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    const hasCliente = Boolean(clienteId)
    const hasLead = Boolean(leadId)

    if (!hasCliente && !hasLead) {
      newErrors.destinatario = 'Selecciona un cliente o un lead'
    } else if (contactType === 'cliente' && !hasCliente) {
      newErrors.destinatario = 'Selecciona un cliente'
    } else if (contactType === 'lead' && !hasLead) {
      newErrors.destinatario = 'Selecciona un lead'
    }

    // Al menos un item debe estar presente
    const hasItems =
      inversores.length > 0 ||
      baterias.length > 0 ||
      paneles.length > 0 ||
      utiles.length > 0 ||
      servicios.length > 0

    if (!hasItems) {
      newErrors.items = 'Agrega al menos un inversor, batería, panel, útil o servicio'
    }

    const precioNum = parseFloat(precio)
    if (precio && (isNaN(precioNum) || precioNum < 0)) {
      newErrors.precio = 'Ingresa un precio válido'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!oferta || !oferta.id) {
      return
    }

    if (!validateForm()) {
      return
    }

    const data: OfertaPersonalizadaUpdateRequest = {
      cliente_id: clienteId || undefined,
      lead_id: leadId || undefined,
      inversores: inversores.length > 0 ? inversores : undefined,
      baterias: baterias.length > 0 ? baterias : undefined,
      paneles: paneles.length > 0 ? paneles : undefined,
      utiles: utiles.length > 0 ? utiles : undefined,
      servicios: servicios.length > 0 ? servicios : undefined,
      precio: precio ? parseFloat(precio) : undefined,
      pagada,
    }

    await onSubmit(oferta.id, data)
  }

  if (!oferta) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Oferta Personalizada</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Cliente */}
          <div>
            <ClienteSelectorField
              contactType={contactType}
              onContactTypeChange={(type) => {
                setContactType(type)
                if (type === 'cliente') {
                  setLeadId('')
                } else {
                  setClienteId('')
                }
                setErrors((prev) => {
                  const { destinatario, ...rest } = prev
                  return rest
                })
              }}
              clienteId={clienteId}
              leadId={leadId}
              onClienteChange={setClienteId}
              onLeadChange={setLeadId}
              label="Cliente o Lead"
            />
            {errors.destinatario && (
              <p className="text-sm text-red-500 mt-1">{errors.destinatario}</p>
            )}
          </div>

          {/* Tabs para equipos, útiles y servicios */}
          <Tabs defaultValue="equipos" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="equipos">Equipos</TabsTrigger>
              <TabsTrigger value="utiles">Útiles</TabsTrigger>
              <TabsTrigger value="servicios">Servicios</TabsTrigger>
            </TabsList>

            {/* Tab: Equipos (Inversores, Baterías, Paneles) */}
            <TabsContent value="equipos" className="space-y-6 mt-4">
              <EquiposField
                type="inversor"
                value={inversores}
                onChange={setInversores}
                label="Inversores"
              />
              <EquiposField
                type="bateria"
                value={baterias}
                onChange={setBaterias}
                label="Baterías"
              />
              <EquiposField
                type="panel"
                value={paneles}
                onChange={setPaneles}
                label="Paneles Solares"
              />
            </TabsContent>

            {/* Tab: Útiles */}
            <TabsContent value="utiles" className="space-y-4 mt-4">
              <UtilesField value={utiles} onChange={setUtiles} />
            </TabsContent>

            {/* Tab: Servicios */}
            <TabsContent value="servicios" className="space-y-4 mt-4">
              <ServicioSelectorField value={servicios} onChange={setServicios} />
            </TabsContent>
          </Tabs>

          {/* Error si no hay items */}
          {errors.items && (
            <p className="text-sm text-red-500 bg-red-50 p-2 rounded">{errors.items}</p>
          )}

          {/* Precio y Estado de Pago */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="precio-edit">Precio Total (opcional)</Label>
              <Input
                id="precio-edit"
                type="number"
                placeholder="Ej: 12500.00"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                min="0"
                step="0.01"
              />
              {errors.precio && <p className="text-sm text-red-500 mt-1">{errors.precio}</p>}
            </div>

            <div className="flex items-center space-x-2 pt-8">
              <Checkbox
                id="pagada-edit"
                checked={pagada}
                onCheckedChange={(checked) => setPagada(checked === true)}
              />
              <Label htmlFor="pagada-edit" className="cursor-pointer">
                Marcar como pagada
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar Cambios'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
