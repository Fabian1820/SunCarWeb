"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { Textarea } from "@/components/shared/molecule/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/shared/molecule/dialog"
import { Calendar } from "@/components/shared/molecule/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/shared/molecule/popover"
import { CalendarIcon, Loader2, MapPin } from "lucide-react"
import type { Cliente, ClienteUpdateData, ElementoPersonalizado, OfertaAsignacion, OfertaEmbebida } from "@/lib/api-types"
import { ElementosPersonalizadosFields } from "@/components/feats/leads/elementos-personalizados-fields"
import { OfertasAsignacionFields } from "@/components/feats/leads/ofertas-asignacion-fields"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/shared/atom/select"
import MapPicker from "@/components/shared/organism/MapPickerNoSSR"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"

interface EditClientDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  client: Cliente
  onSubmit: (data: ClienteUpdateData) => Promise<void>
  isLoading?: boolean
}

type FieldOption = {
  value: string
  label: string
  type: 'text' | 'date' | 'textarea' | 'datalist' | 'ofertas' | 'elementos' | 'datetime' | 'location'
  datalistOptions?: string[]
}

const FIELD_OPTIONS: FieldOption[] = [
  { value: 'nombre', label: 'Nombre', type: 'text' },
  { value: 'direccion', label: 'Dirección', type: 'text' },
  { value: 'telefono', label: 'Teléfono', type: 'text' },
  { value: 'telefono_adicional', label: 'Teléfono Adicional', type: 'text' },
  { value: 'carnet_identidad', label: 'Carnet de Identidad', type: 'text' },
  { value: 'fecha_contacto', label: 'Fecha de Contacto', type: 'date' },
  { value: 'fecha_montaje', label: 'Fecha de Montaje', type: 'date' },
  { value: 'fecha_instalacion', label: 'Fecha de Instalación', type: 'datetime' },
  { value: 'estado', label: 'Estado', type: 'text' },
  { value: 'fuente', label: 'Fuente', type: 'datalist', datalistOptions: ['página web', 'redes sociales', 'referencia', 'publicidad', 'evento', 'llamada fría', 'email', 'otro'] },
  { value: 'referencia', label: 'Referencia', type: 'text' },
  { value: 'pais_contacto', label: 'País de Contacto', type: 'datalist', datalistOptions: ['Cuba', 'España', 'México', 'Argentina', 'Colombia', 'Venezuela', 'Chile', 'Perú', 'Ecuador', 'Uruguay', 'Paraguay', 'Bolivia', 'Costa Rica', 'Panamá', 'Guatemala', 'Honduras', 'El Salvador', 'Nicaragua', 'República Dominicana', 'Puerto Rico', 'Estados Unidos', 'Canadá', 'Brasil', 'Francia', 'Italia', 'Alemania', 'Reino Unido', 'Portugal'] },
  { value: 'provincia_montaje', label: 'Provincia de Montaje', type: 'text' },
  { value: 'comercial', label: 'Comercial Asignado', type: 'text' },
  { value: 'metodo_pago', label: 'Método de Pago', type: 'text' },
  { value: 'moneda', label: 'Moneda', type: 'text' },
  { value: 'comentario', label: 'Comentario', type: 'textarea' },
  { value: 'location', label: 'Ubicación (Latitud/Longitud)', type: 'location' },
  { value: 'ofertas', label: 'Ofertas Asignadas', type: 'ofertas' },
  { value: 'elementos_personalizados', label: 'Elementos Personalizados', type: 'elementos' },
]

export function EditClientDialog({ open, onOpenChange, client, onSubmit, isLoading }: EditClientDialogProps) {
  const [selectedField, setSelectedField] = useState<string>('')
  const [fieldValue, setFieldValue] = useState<string>('')
  const [ofertas, setOfertas] = useState<OfertaAsignacion[]>([])
  const [elementosPersonalizados, setElementosPersonalizados] = useState<ElementoPersonalizado[]>([])
  const [fechaInstalacion, setFechaInstalacion] = useState<Date | undefined>(undefined)
  const [showMapModal, setShowMapModal] = useState(false)
  const [latLng, setLatLng] = useState<{ lat: string, lng: string }>({ lat: '', lng: '' })

  // Función para convertir ofertas embebidas a asignaciones
  const convertOfertasToAsignaciones = (ofertasEmbebidas: OfertaEmbebida[] | undefined): OfertaAsignacion[] => {
    if (!ofertasEmbebidas || ofertasEmbebidas.length === 0) return []
    return ofertasEmbebidas
      .filter(oferta => oferta.id)
      .map(oferta => ({
        oferta_id: oferta.id!,
        cantidad: oferta.cantidad || 1
      }))
  }

  const convertDateToInput = (value?: string): string => {
    if (!value) return ""
    if (value.match(/^\d{4}-\d{2}-\d{2}$/)) return value
    if (value.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const [day, month, year] = value.split("/")
      return `${year}-${month}-${day}`
    }
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) {
      const month = String(parsed.getMonth() + 1).padStart(2, "0")
      const day = String(parsed.getDate()).padStart(2, "0")
      return `${parsed.getFullYear()}-${month}-${day}`
    }
    return ""
  }

  // Reset cuando cambia el campo seleccionado
  useEffect(() => {
    if (!selectedField || !client) return

    const fieldConfig = FIELD_OPTIONS.find(f => f.value === selectedField)
    if (!fieldConfig) return

    // Inicializar el valor del campo con el valor actual del cliente
    if (fieldConfig.type === 'date') {
      setFieldValue(convertDateToInput(client[selectedField as keyof Cliente] as string))
    } else if (fieldConfig.type === 'datetime') {
      setFechaInstalacion(client.fecha_instalacion ? new Date(client.fecha_instalacion) : undefined)
    } else if (fieldConfig.type === 'location') {
      setLatLng({
        lat: client.latitud !== undefined && client.latitud !== null ? String(client.latitud) : '',
        lng: client.longitud !== undefined && client.longitud !== null ? String(client.longitud) : '',
      })
    } else if (fieldConfig.type === 'ofertas') {
      setOfertas(convertOfertasToAsignaciones(client.ofertas))
    } else if (fieldConfig.type === 'elementos') {
      setElementosPersonalizados(
        client.elementos_personalizados ? JSON.parse(JSON.stringify(client.elementos_personalizados)) : []
      )
    } else {
      setFieldValue((client[selectedField as keyof Cliente] as string) || '')
    }
  }, [selectedField, client])

  // Reset cuando se abre/cierra el diálogo
  useEffect(() => {
    if (!open) {
      setSelectedField('')
      setFieldValue('')
      setOfertas([])
      setElementosPersonalizados([])
      setFechaInstalacion(undefined)
      setLatLng({ lat: '', lng: '' })
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedField) {
      return
    }

    const fieldConfig = FIELD_OPTIONS.find(f => f.value === selectedField)
    if (!fieldConfig) return

    // Construir el objeto de actualización con SOLO el campo seleccionado
    const updateData: Record<string, unknown> = {}

    if (fieldConfig.type === 'date') {
      updateData[selectedField] = fieldValue
      console.log('Enviando fecha:', { campo: selectedField, valor: fieldValue })
    } else if (fieldConfig.type === 'datetime') {
      const isoDate = fechaInstalacion ? fechaInstalacion.toISOString() : undefined
      updateData['fecha_instalacion'] = isoDate
      console.log('Enviando datetime:', { campo: 'fecha_instalacion', valor: isoDate })
    } else if (fieldConfig.type === 'location') {
      updateData['latitud'] = latLng.lat || undefined
      updateData['longitud'] = latLng.lng || undefined
      console.log('Enviando ubicación:', { latitud: latLng.lat, longitud: latLng.lng })
    } else if (fieldConfig.type === 'ofertas') {
      updateData['ofertas'] = ofertas
      console.log('Enviando ofertas:', { campo: 'ofertas', valor: ofertas })
    } else if (fieldConfig.type === 'elementos') {
      updateData['elementos_personalizados'] = elementosPersonalizados
      console.log('Enviando elementos:', { campo: 'elementos_personalizados', valor: elementosPersonalizados })
    } else {
      updateData[selectedField] = fieldValue
      console.log('Enviando campo:', { campo: selectedField, valor: fieldValue })
    }

    console.log('Objeto completo de actualización:', updateData)

    try {
      await onSubmit(updateData as ClienteUpdateData)
      onOpenChange(false)
    } catch (error) {
      console.error('Error al actualizar cliente:', error)
    }
  }

  const handleCancel = () => {
    setSelectedField('')
    setFieldValue('')
    setOfertas([])
    setElementosPersonalizados([])
    setFechaInstalacion(undefined)
    setLatLng({ lat: '', lng: '' })
    onOpenChange(false)
  }

  const selectedFieldConfig = FIELD_OPTIONS.find(f => f.value === selectedField)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Cliente - {client.nombre}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Paso 1: Seleccionar campo a editar */}
          <div>
            <Label htmlFor="field-selector">
              ¿Qué campo deseas actualizar? <span className="text-red-500">*</span>
            </Label>
            <Select value={selectedField} onValueChange={setSelectedField}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un campo..." />
              </SelectTrigger>
              <SelectContent>
                {FIELD_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Paso 2: Mostrar el campo seleccionado */}
          {selectedField && selectedFieldConfig && (
            <div className="border-t pt-6">
              <h3 className="text-sm font-medium mb-4">Editar: {selectedFieldConfig.label}</h3>

              {selectedFieldConfig.type === 'text' && (
                <div>
                  <Label htmlFor="field-value">{selectedFieldConfig.label}</Label>
                  <Input
                    id="field-value"
                    value={fieldValue}
                    onChange={(e) => setFieldValue(e.target.value)}
                    placeholder={`Ingresa ${selectedFieldConfig.label.toLowerCase()}`}
                  />
                </div>
              )}

              {selectedFieldConfig.type === 'date' && (
                <div>
                  <Label htmlFor="field-value">{selectedFieldConfig.label}</Label>
                  <Input
                    id="field-value"
                    type="date"
                    value={fieldValue}
                    onChange={(e) => setFieldValue(e.target.value)}
                  />
                </div>
              )}

              {selectedFieldConfig.type === 'textarea' && (
                <div>
                  <Label htmlFor="field-value">{selectedFieldConfig.label}</Label>
                  <Textarea
                    id="field-value"
                    value={fieldValue}
                    onChange={(e) => setFieldValue(e.target.value)}
                    placeholder={`Ingresa ${selectedFieldConfig.label.toLowerCase()}`}
                    rows={4}
                  />
                </div>
              )}

              {selectedFieldConfig.type === 'datalist' && (
                <div>
                  <Label htmlFor="field-value">{selectedFieldConfig.label}</Label>
                  <Input
                    id="field-value"
                    list={`datalist-${selectedField}`}
                    value={fieldValue}
                    onChange={(e) => setFieldValue(e.target.value)}
                    placeholder={`Escribir o seleccionar ${selectedFieldConfig.label.toLowerCase()}`}
                  />
                  <datalist id={`datalist-${selectedField}`}>
                    {selectedFieldConfig.datalistOptions?.map((option) => (
                      <option key={option} value={option} />
                    ))}
                  </datalist>
                </div>
              )}

              {selectedFieldConfig.type === 'datetime' && (
                <div>
                  <Label>Fecha de Instalación</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !fechaInstalacion && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {fechaInstalacion ? (
                          format(fechaInstalacion, "PPP 'a las' p", { locale: es })
                        ) : (
                          <span>Seleccionar fecha</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={fechaInstalacion}
                        onSelect={setFechaInstalacion}
                        locale={es}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              {selectedFieldConfig.type === 'location' && (
                <div>
                  <Label>Ubicación (usar mapa para precisión)</Label>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input value={latLng.lat} placeholder="Latitud" readOnly className="flex-1" />
                      <Input value={latLng.lng} placeholder="Longitud" readOnly className="flex-1" />
                    </div>
                    <Button
                      type="button"
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                      onClick={() => setShowMapModal(true)}
                    >
                      <MapPin className="h-4 w-4 mr-2" /> Seleccionar en mapa
                    </Button>
                  </div>
                </div>
              )}

              {selectedFieldConfig.type === 'ofertas' && (
                <OfertasAsignacionFields
                  value={ofertas}
                  onChange={setOfertas}
                />
              )}

              {selectedFieldConfig.type === 'elementos' && (
                <ElementosPersonalizadosFields
                  value={elementosPersonalizados}
                  onChange={setElementosPersonalizados}
                />
              )}
            </div>
          )}

          {/* Botones */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white"
              disabled={isLoading || !selectedField}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Actualizar Campo'
              )}
            </Button>
          </div>
        </form>

        {/* Modal de mapa para seleccionar ubicación */}
        <Dialog open={showMapModal} onOpenChange={setShowMapModal}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Seleccionar ubicación en el mapa</DialogTitle>
            </DialogHeader>
            <div className="mb-4 text-gray-700">Haz click en el mapa para seleccionar la ubicación. Solo se guardarán latitud y longitud.</div>
            <MapPicker
              initialLat={latLng.lat ? parseFloat(latLng.lat) : 23.1136}
              initialLng={latLng.lng ? parseFloat(latLng.lng) : -82.3666}
              onSelect={(lat: number, lng: number) => {
                setLatLng({ lat: String(lat), lng: String(lng) })
              }}
            />
            <div className="flex justify-end pt-4">
              <Button type="button" className="bg-purple-600 hover:bg-purple-700 text-white" onClick={() => setShowMapModal(false)}>
                Confirmar ubicación
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  )
}
