"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { Textarea } from "@/components/shared/molecule/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/shared/molecule/dialog"
import { Loader2, MapPin } from "lucide-react"
import type { Cliente, ClienteUpdateData, ElementoPersonalizado, OfertaAsignacion } from "@/lib/api-types"
import { ElementosPersonalizadosFields } from "@/components/feats/leads/elementos-personalizados-fields"
import { OfertasAsignacionFields } from "@/components/feats/leads/ofertas-asignacion-fields"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/shared/atom/select"
import MapPicker from "@/components/shared/organism/MapPickerNoSSR"

interface EditClientDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  client: Cliente
  onSubmit: (data: ClienteUpdateData) => Promise<void>
  isLoading?: boolean
}

export function EditClientDialog({ open, onOpenChange, client, onSubmit, isLoading }: EditClientDialogProps) {
  const [showMapModal, setShowMapModal] = useState(false)

  // Función para convertir fecha ISO a YYYY-MM-DD (para input date)
  const convertToDateInput = (isoDate?: string): string => {
    if (!isoDate) return ''
    if (isoDate.match(/^\d{4}-\d{2}-\d{2}$/)) return isoDate
    try {
      const date = new Date(isoDate)
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      }
    } catch {
      return ''
    }
    return ''
  }

  // Función para convertir ofertas embebidas a asignaciones
  const convertOfertasToAsignaciones = (ofertas: Cliente['ofertas']): OfertaAsignacion[] => {
    if (!ofertas || ofertas.length === 0) return []
    return ofertas
      .filter(oferta => oferta.id)
      .map(oferta => ({
        oferta_id: oferta.id!,
        cantidad: oferta.cantidad || 1
      }))
  }

  // Estado del formulario con valores iniciales del cliente
  const [formData, setFormData] = useState({
    numero: client.numero || '',
    nombre: client.nombre || '',
    direccion: client.direccion || '',
    telefono: client.telefono || '',
    telefono_adicional: client.telefono_adicional || '',
    carnet_identidad: client.carnet_identidad || '',
    fecha_contacto: convertToDateInput(client.fecha_contacto),
    fecha_montaje: convertToDateInput(client.fecha_montaje),
    fecha_instalacion: convertToDateInput(client.fecha_instalacion),
    estado: client.estado || '',
    fuente: client.fuente || '',
    referencia: client.referencia || '',
    pais_contacto: client.pais_contacto || '',
    provincia_montaje: client.provincia_montaje || '',
    comercial: client.comercial || '',
    metodo_pago: client.metodo_pago || '',
    moneda: client.moneda || '',
    comentario: client.comentario || '',
    latitud: client.latitud !== undefined && client.latitud !== null ? String(client.latitud) : '',
    longitud: client.longitud !== undefined && client.longitud !== null ? String(client.longitud) : '',
    ofertas: convertOfertasToAsignaciones(client.ofertas),
    elementos_personalizados: client.elementos_personalizados ?
      JSON.parse(JSON.stringify(client.elementos_personalizados)) : []
  })

  // Guardar valores iniciales para detectar cambios
  const [initialValues] = useState({
    numero: client.numero || '',
    nombre: client.nombre || '',
    direccion: client.direccion || '',
    telefono: client.telefono || '',
    telefono_adicional: client.telefono_adicional || '',
    carnet_identidad: client.carnet_identidad || '',
    fecha_contacto: convertToDateInput(client.fecha_contacto),
    fecha_montaje: convertToDateInput(client.fecha_montaje),
    fecha_instalacion: convertToDateInput(client.fecha_instalacion),
    estado: client.estado || '',
    fuente: client.fuente || '',
    referencia: client.referencia || '',
    pais_contacto: client.pais_contacto || '',
    provincia_montaje: client.provincia_montaje || '',
    comercial: client.comercial || '',
    metodo_pago: client.metodo_pago || '',
    moneda: client.moneda || '',
    comentario: client.comentario || '',
    latitud: client.latitud !== undefined && client.latitud !== null ? String(client.latitud) : '',
    longitud: client.longitud !== undefined && client.longitud !== null ? String(client.longitud) : '',
    ofertas: JSON.stringify(convertOfertasToAsignaciones(client.ofertas)),
    elementos_personalizados: JSON.stringify(client.elementos_personalizados || [])
  })

  // Reset cuando se abre el diálogo con un cliente diferente
  useEffect(() => {
    if (open) {
      setFormData({
        numero: client.numero || '',
        nombre: client.nombre || '',
        direccion: client.direccion || '',
        telefono: client.telefono || '',
        telefono_adicional: client.telefono_adicional || '',
        carnet_identidad: client.carnet_identidad || '',
        fecha_contacto: convertToDateInput(client.fecha_contacto),
        fecha_montaje: convertToDateInput(client.fecha_montaje),
        fecha_instalacion: convertToDateInput(client.fecha_instalacion),
        estado: client.estado || '',
        fuente: client.fuente || '',
        referencia: client.referencia || '',
        pais_contacto: client.pais_contacto || '',
        provincia_montaje: client.provincia_montaje || '',
        comercial: client.comercial || '',
        metodo_pago: client.metodo_pago || '',
        moneda: client.moneda || '',
        comentario: client.comentario || '',
        latitud: client.latitud !== undefined && client.latitud !== null ? String(client.latitud) : '',
        longitud: client.longitud !== undefined && client.longitud !== null ? String(client.longitud) : '',
        ofertas: convertOfertasToAsignaciones(client.ofertas),
        elementos_personalizados: client.elementos_personalizados ?
          JSON.parse(JSON.stringify(client.elementos_personalizados)) : []
      })
    }
  }, [open, client])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleOfertasChange = (items: OfertaAsignacion[]) => {
    setFormData(prev => ({
      ...prev,
      ofertas: items
    }))
  }

  const handleElementosChange = (items: ElementoPersonalizado[]) => {
    setFormData(prev => ({
      ...prev,
      elementos_personalizados: items
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Detectar solo los campos que cambiaron
    const updateData: Record<string, unknown> = {}

    // Campos de texto simples
    const textFields = [
      'numero', 'nombre', 'direccion', 'telefono', 'telefono_adicional', 'carnet_identidad',
      'estado', 'fuente', 'referencia', 'pais_contacto', 'provincia_montaje',
      'comercial', 'metodo_pago', 'moneda', 'comentario'
    ]

    textFields.forEach(field => {
      const currentValue = formData[field as keyof typeof formData]
      const initialValue = initialValues[field as keyof typeof initialValues]

      if (currentValue !== initialValue) {
        updateData[field] = currentValue || undefined
      }
    })

    // Campos de fecha
    const dateFields = ['fecha_contacto', 'fecha_montaje', 'fecha_instalacion']
    dateFields.forEach(field => {
      const currentValue = formData[field as keyof typeof formData]
      const initialValue = initialValues[field as keyof typeof initialValues]

      if (currentValue !== initialValue) {
        updateData[field] = currentValue || undefined
      }
    })

    // Ubicación (latitud y longitud)
    if (formData.latitud !== initialValues.latitud) {
      updateData.latitud = formData.latitud || undefined
    }
    if (formData.longitud !== initialValues.longitud) {
      updateData.longitud = formData.longitud || undefined
    }

    // Ofertas (comparar JSON)
    const currentOfertas = JSON.stringify(formData.ofertas)
    if (currentOfertas !== initialValues.ofertas) {
      updateData.ofertas = formData.ofertas
    }

    // Elementos personalizados (comparar JSON)
    const currentElementos = JSON.stringify(formData.elementos_personalizados)
    if (currentElementos !== initialValues.elementos_personalizados) {
      updateData.elementos_personalizados = formData.elementos_personalizados
    }

    console.log('Campos modificados:', updateData)

    try {
      await onSubmit(updateData as ClienteUpdateData)
      onOpenChange(false)
    } catch (error) {
      console.error('Error al actualizar cliente:', error)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Cliente - {client.nombre}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6 max-h-[calc(90vh-120px)] overflow-y-auto pr-2 overflow-x-hidden">
            {/* Sección 1: Datos Personales */}
            <div className="space-y-4">
              <div className="border-b-2 border-gray-300 pb-3">
                <h3 className="text-base font-bold text-gray-900">Datos Personales</h3>
              </div>
              <div className="space-y-4">
                {/* Campos Obligatorios */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="numero">
                      Número <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="numero"
                      value={formData.numero}
                      onChange={(e) => handleInputChange('numero', e.target.value)}
                      className="text-gray-900 placeholder:text-gray-400"
                    />
                  </div>
                  <div>
                    <Label htmlFor="nombre">
                      Nombre <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="nombre"
                      value={formData.nombre}
                      onChange={(e) => handleInputChange('nombre', e.target.value)}
                      className="text-gray-900 placeholder:text-gray-400"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="direccion">
                    Dirección <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="direccion"
                    value={formData.direccion}
                    onChange={(e) => handleInputChange('direccion', e.target.value)}
                    className="text-gray-900 placeholder:text-gray-400"
                  />
                </div>
                <div>
                  <Label>Ubicación en el Mapa</Label>
                  <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                    <div className="flex gap-2 flex-1">
                      <Input
                        value={formData.latitud}
                        readOnly
                        placeholder="Latitud"
                        className="flex-1 sm:w-32 text-gray-600 bg-gray-50 text-xs sm:text-sm"
                      />
                      <Input
                        value={formData.longitud}
                        readOnly
                        placeholder="Longitud"
                        className="flex-1 sm:w-32 text-gray-600 bg-gray-50 text-xs sm:text-sm"
                      />
                    </div>
                    <Button
                      type="button"
                      className="bg-purple-600 hover:bg-purple-700 text-white shrink-0 sm:shrink-0"
                      size="sm"
                      onClick={() => setShowMapModal(true)}
                    >
                      <MapPin className="h-4 w-4 sm:mr-1" />
                      <span className="hidden sm:inline">Seleccionar en mapa</span>
                    </Button>
                  </div>
                </div>
                {/* Otros Datos Personales */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="carnet_identidad">Carnet de Identidad</Label>
                    <Input
                      id="carnet_identidad"
                      value={formData.carnet_identidad}
                      onChange={(e) => handleInputChange('carnet_identidad', e.target.value)}
                      className="text-gray-900 placeholder:text-gray-400"
                    />
                  </div>
                  <div>
                    <Label htmlFor="telefono">Teléfono</Label>
                    <Input
                      id="telefono"
                      value={formData.telefono}
                      onChange={(e) => handleInputChange('telefono', e.target.value)}
                      className="text-gray-900 placeholder:text-gray-400"
                    />
                  </div>
                  <div>
                    <Label htmlFor="telefono_adicional">Teléfono Adicional</Label>
                    <Input
                      id="telefono_adicional"
                      value={formData.telefono_adicional}
                      onChange={(e) => handleInputChange('telefono_adicional', e.target.value)}
                      className="text-gray-900 placeholder:text-gray-400"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Sección 2: Fechas */}
            <div className="space-y-4">
              <div className="border-b-2 border-gray-300 pb-3">
                <h3 className="text-base font-bold text-gray-900">Fechas</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fecha_contacto">Fecha de Contacto</Label>
                  <Input
                    id="fecha_contacto"
                    type="date"
                    value={formData.fecha_contacto}
                    onChange={(e) => handleInputChange('fecha_contacto', e.target.value)}
                    className="text-gray-900"
                  />
                </div>
                <div>
                  <Label htmlFor="fecha_montaje">Fecha de Montaje</Label>
                  <Input
                    id="fecha_montaje"
                    type="date"
                    value={formData.fecha_montaje}
                    onChange={(e) => handleInputChange('fecha_montaje', e.target.value)}
                    className="text-gray-900"
                  />
                </div>
                <div>
                  <Label htmlFor="fecha_instalacion">Fecha de Instalación</Label>
                  <Input
                    id="fecha_instalacion"
                    type="date"
                    value={formData.fecha_instalacion}
                    onChange={(e) => handleInputChange('fecha_instalacion', e.target.value)}
                    className="text-gray-900"
                  />
                </div>
              </div>
            </div>

            {/* Sección 3: Información Comercial */}
            <div className="space-y-4">
              <div className="border-b-2 border-gray-300 pb-3">
                <h3 className="text-base font-bold text-gray-900">Información Comercial</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="estado">Estado</Label>
                  <Input
                    id="estado"
                    value={formData.estado}
                    onChange={(e) => handleInputChange('estado', e.target.value)}
                    className="text-gray-900 placeholder:text-gray-400"
                  />
                </div>
                <div>
                  <Label htmlFor="fuente">Fuente</Label>
                  <Input
                    id="fuente"
                    value={formData.fuente}
                    onChange={(e) => handleInputChange('fuente', e.target.value)}
                    className="text-gray-900 placeholder:text-gray-400"
                  />
                </div>
                <div>
                  <Label htmlFor="referencia">Referencia</Label>
                  <Input
                    id="referencia"
                    value={formData.referencia}
                    onChange={(e) => handleInputChange('referencia', e.target.value)}
                    className="text-gray-900 placeholder:text-gray-400"
                  />
                </div>
                <div>
                  <Label htmlFor="pais_contacto">País de Contacto</Label>
                  <Input
                    id="pais_contacto"
                    value={formData.pais_contacto}
                    onChange={(e) => handleInputChange('pais_contacto', e.target.value)}
                    className="text-gray-900 placeholder:text-gray-400"
                  />
                </div>
                <div>
                  <Label htmlFor="provincia_montaje">Provincia de Montaje</Label>
                  <Input
                    id="provincia_montaje"
                    value={formData.provincia_montaje}
                    onChange={(e) => handleInputChange('provincia_montaje', e.target.value)}
                    className="text-gray-900 placeholder:text-gray-400"
                  />
                </div>
                <div>
                  <Label htmlFor="comercial">Comercial</Label>
                  <Select
                    value={formData.comercial}
                    onValueChange={(value) => handleInputChange('comercial', value)}
                  >
                    <SelectTrigger id="comercial" className="text-gray-900">
                      <SelectValue placeholder="Seleccionar comercial" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Dashel">Dashel</SelectItem>
                      <SelectItem value="Grethel">Grethel</SelectItem>
                      <SelectItem value="Yanet">Yanet</SelectItem>
                      <SelectItem value="Yany">Yany</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Sección 4: Información de Pago */}
            <div className="space-y-4">
              <div className="border-b-2 border-gray-300 pb-3">
                <h3 className="text-base font-bold text-gray-900">Información de Pago</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="metodo_pago">Método de Pago</Label>
                  <Input
                    id="metodo_pago"
                    value={formData.metodo_pago}
                    onChange={(e) => handleInputChange('metodo_pago', e.target.value)}
                    className="text-gray-900 placeholder:text-gray-400"
                  />
                </div>
                <div>
                  <Label htmlFor="moneda">Moneda</Label>
                  <Input
                    id="moneda"
                    value={formData.moneda}
                    onChange={(e) => handleInputChange('moneda', e.target.value)}
                    className="text-gray-900 placeholder:text-gray-400"
                  />
                </div>
              </div>
            </div>

            {/* Sección 5: Comentarios y Detalles */}
            <div className="space-y-4">
              <div className="border-b-2 border-gray-300 pb-3">
                <h3 className="text-base font-bold text-gray-900">Comentarios y Detalles</h3>
              </div>
              <div>
                <Label htmlFor="comentario">Comentario</Label>
                <Textarea
                  id="comentario"
                  value={formData.comentario}
                  onChange={(e) => handleInputChange('comentario', e.target.value)}
                  rows={3}
                  className="text-gray-900 placeholder:text-gray-400"
                />
              </div>
              <div className="space-y-6">
                <OfertasAsignacionFields
                  value={formData.ofertas}
                  onChange={handleOfertasChange}
                />

                <ElementosPersonalizadosFields
                  value={formData.elementos_personalizados}
                  onChange={handleElementosChange}
                />
              </div>
            </div>

            {/* Botones */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Guardar Cambios'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de mapa para seleccionar ubicación */}
      <Dialog open={showMapModal} onOpenChange={setShowMapModal}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Seleccionar ubicación en el mapa</DialogTitle>
          </DialogHeader>
          <div className="mb-4 text-gray-700">
            Haz click en el mapa para seleccionar la ubicación. Solo se guardarán latitud y longitud.
          </div>
          <MapPicker
            initialLat={formData.latitud ? parseFloat(formData.latitud) : 23.1136}
            initialLng={formData.longitud ? parseFloat(formData.longitud) : -82.3666}
            onSelect={(lat: number, lng: number) => {
              setFormData(prev => ({
                ...prev,
                latitud: String(lat),
                longitud: String(lng)
              }))
            }}
          />
          <div className="flex justify-end pt-4">
            <Button
              type="button"
              className="bg-purple-600 hover:bg-purple-700 text-white"
              onClick={() => setShowMapModal(false)}
            >
              Confirmar ubicación
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
