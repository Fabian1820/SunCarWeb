"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { Textarea } from "@/components/shared/molecule/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/shared/molecule/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/shared/atom/select"
import { Loader2 } from "lucide-react"
import type { Lead, LeadUpdateData } from "@/lib/api-types"
import { useAuth } from "@/contexts/auth-context"
import { apiRequest } from "@/lib/api-config"

interface Provincia {
  codigo: string
  nombre: string
}

interface Municipio {
  codigo: string
  nombre: string
}

interface EditLeadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lead: Lead
  onSubmit: (data: LeadUpdateData) => Promise<void>
  isLoading?: boolean
}

interface PhoneCountryResponse {
  success: boolean
  message: string
  data: {
    phone_number: string
    formatted_number: string
    e164_format: string
    country_code: string
    country_iso: string
    country_name: string
    carrier: string | null
    is_valid: boolean
  }
}

export function EditLeadDialog({ open, onOpenChange, lead, onSubmit, isLoading }: EditLeadDialogProps) {
  const { user } = useAuth()
  
  const [provincias, setProvincias] = useState<Provincia[]>([])
  const [municipios, setMunicipios] = useState<Municipio[]>([])
  const [loadingProvincias, setLoadingProvincias] = useState(false)
  const [loadingMunicipios, setLoadingMunicipios] = useState(false)
  const [selectedProvinciaCodigo, setSelectedProvinciaCodigo] = useState<string>('')
  const [detectingCountry, setDetectingCountry] = useState(false)
  
  // Estados para materiales de oferta
  const [inversores, setInversores] = useState<Array<{codigo: string | number, descripcion: string, precio?: number}>>([])
  const [baterias, setBaterias] = useState<Array<{codigo: string | number, descripcion: string, precio?: number}>>([])
  const [paneles, setPaneles] = useState<Array<{codigo: string | number, descripcion: string, precio?: number}>>([])
  const [loadingMateriales, setLoadingMateriales] = useState(false)
  
  // Estado para controlar si se está usando fuente personalizada
  const [usandoFuentePersonalizada, setUsandoFuentePersonalizada] = useState(false)

  // Estados para la oferta (inicializar con la primera oferta del lead si existe)
  const [oferta, setOferta] = useState({
    inversor_codigo: lead.ofertas?.[0]?.inversor_codigo || '',
    inversor_cantidad: lead.ofertas?.[0]?.inversor_cantidad || 1,
    bateria_codigo: lead.ofertas?.[0]?.bateria_codigo || '',
    bateria_cantidad: lead.ofertas?.[0]?.bateria_cantidad || 1,
    panel_codigo: lead.ofertas?.[0]?.panel_codigo || '',
    panel_cantidad: lead.ofertas?.[0]?.panel_cantidad || 1,
    elementos_personalizados: lead.ofertas?.[0]?.elementos_personalizados || '',
    aprobada: lead.ofertas?.[0]?.aprobada || false,
    pagada: lead.ofertas?.[0]?.pagada || false,
    costo_oferta: lead.ofertas?.[0]?.costo_oferta || 0,
    costo_extra: lead.ofertas?.[0]?.costo_extra || 0,
    costo_transporte: lead.ofertas?.[0]?.costo_transporte || 0,
    razon_costo_extra: lead.ofertas?.[0]?.razon_costo_extra || ''
  })

  // Calcular costo final automáticamente (incluye costo de transporte)
  const costoFinal = oferta.costo_oferta + oferta.costo_extra + oferta.costo_transporte
  
  // Función para convertir fecha DD/MM/YYYY a YYYY-MM-DD (para input date)
  const convertToDateInput = (ddmmyyyy: string): string => {
    if (!ddmmyyyy) return ''
    if (ddmmyyyy.match(/^\d{4}-\d{2}-\d{2}$/)) return ddmmyyyy
    if (ddmmyyyy.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const [day, month, year] = ddmmyyyy.split('/')
      return `${year}-${month}-${day}`
    }
    return ''
  }

  // Función para convertir fecha YYYY-MM-DD a DD/MM/YYYY (para enviar al backend)
  const convertFromDateInput = (yyyymmdd: string): string => {
    if (!yyyymmdd) return ''
    const [year, month, day] = yyyymmdd.split('-')
    return `${day}/${month}/${year}`
  }

  const [formData, setFormData] = useState({
    fecha_contacto: convertToDateInput(lead.fecha_contacto),
    nombre: lead.nombre || '',
    telefono: lead.telefono || '',
    telefono_adicional: lead.telefono_adicional || '',
    estado: lead.estado || '',
    fuente: lead.fuente || '',
    referencia: lead.referencia || '',
    direccion: lead.direccion || '',
    pais_contacto: lead.pais_contacto || '',
    comentario: lead.comentario || '',
    provincia_montaje: lead.provincia_montaje || '',
    municipio: lead.municipio || '',
    comercial: lead.comercial || user?.nombre || '',
    metodo_pago: lead.metodo_pago || '',
    moneda: lead.moneda || '',
  })

  const estadosDisponibles = [
    'Esperando equipo',
    'No interesado',
    'Pendiente de instalación',
    'Pendiente de presupuesto',
    'Pendiente de visita',
    'Pendiente de visitarnos',
    'Proximamente',
    'Revisando ofertas',
    'Sin respuesta'
  ]

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Reset cuando se abre el diálogo con un lead diferente
  useEffect(() => {
    if (open) {
      console.log('🔄 Reseteando formulario con lead:', lead)
      
      setFormData({
        fecha_contacto: convertToDateInput(lead.fecha_contacto),
        nombre: lead.nombre || '',
        telefono: lead.telefono || '',
        telefono_adicional: lead.telefono_adicional || '',
        estado: lead.estado || '',
        fuente: lead.fuente || '',
        referencia: lead.referencia || '',
        direccion: lead.direccion || '',
        pais_contacto: lead.pais_contacto || '',
        comentario: lead.comentario || '',
        provincia_montaje: lead.provincia_montaje || '',
        municipio: lead.municipio || '',
        comercial: lead.comercial || user?.nombre || '',
        metodo_pago: lead.metodo_pago || '',
        moneda: lead.moneda || '',
      })
      
      // Si el lead tiene provincia, buscar su código para cargar municipios
      if (lead.provincia_montaje && provincias.length > 0) {
        const provincia = provincias.find(p => p.nombre === lead.provincia_montaje)
        if (provincia) {
          console.log('🗺️ Provincia encontrada, estableciendo código:', provincia.codigo)
          setSelectedProvinciaCodigo(provincia.codigo)
        }
      } else {
        setSelectedProvinciaCodigo('')
      }
    }
  }, [open, lead, user, provincias])

  // Resetear oferta DESPUÉS de que los materiales se hayan cargado
  useEffect(() => {
    if (open && !loadingMateriales && (inversores.length > 0 || baterias.length > 0 || paneles.length > 0)) {
      console.log('🔄 Reseteando oferta con datos del lead:', lead.ofertas?.[0])
      setOferta({
        inversor_codigo: lead.ofertas?.[0]?.inversor_codigo || '',
        inversor_cantidad: lead.ofertas?.[0]?.inversor_cantidad || 1,
        bateria_codigo: lead.ofertas?.[0]?.bateria_codigo || '',
        bateria_cantidad: lead.ofertas?.[0]?.bateria_cantidad || 1,
        panel_codigo: lead.ofertas?.[0]?.panel_codigo || '',
        panel_cantidad: lead.ofertas?.[0]?.panel_cantidad || 1,
        elementos_personalizados: lead.ofertas?.[0]?.elementos_personalizados || '',
        aprobada: lead.ofertas?.[0]?.aprobada || false,
        pagada: lead.ofertas?.[0]?.pagada || false,
        costo_oferta: lead.ofertas?.[0]?.costo_oferta || 0,
        costo_extra: lead.ofertas?.[0]?.costo_extra || 0,
        costo_transporte: lead.ofertas?.[0]?.costo_transporte || 0,
        razon_costo_extra: lead.ofertas?.[0]?.razon_costo_extra || ''
      })
    }
  }, [open, loadingMateriales, inversores.length, baterias.length, paneles.length, lead])

  // Cargar provincias al montar el componente
  useEffect(() => {
    const fetchProvincias = async () => {
      setLoadingProvincias(true)
      try {
        const response = await apiRequest<{
          success: boolean
          message: string
          data: Provincia[]
          total: number
        }>('/provincias/', {
          method: 'GET'
        })
        
        if (response.success && response.data) {
          setProvincias(response.data)
        }
      } catch (error) {
        console.error('Error al cargar provincias:', error)
      } finally {
        setLoadingProvincias(false)
      }
    }

    fetchProvincias()
  }, [])

  // Cargar materiales cuando se abre el diálogo
  useEffect(() => {
    if (!open) return // Solo cargar si el diálogo está abierto
    
    const fetchMateriales = async () => {
      setLoadingMateriales(true)
      try {
        const response = await apiRequest<{
          success: boolean
          message: string
          data: Array<{
            id: string
            categoria: string
            foto?: string
            esVendible?: boolean
            materiales?: Array<{codigo: string | number, descripcion: string, um?: string, precio?: number}>
          }>
        }>('/productos/', {
          method: 'GET'
        })
        
        if (!response.success) {
          return
        }
        
        const productos = response.data || []
        
        const inversoresCategoria = productos.find(p => p.categoria === 'INVERSORES')
        if (inversoresCategoria?.materiales && inversoresCategoria.materiales.length > 0) {
          setInversores(inversoresCategoria.materiales)
        }
        
        const bateriasCategoria = productos.find(p => p.categoria === 'BATERÍAS')
        if (bateriasCategoria?.materiales && bateriasCategoria.materiales.length > 0) {
          setBaterias(bateriasCategoria.materiales)
        }
        
        const panelesCategoria = productos.find(p => p.categoria === 'PANELES')
        if (panelesCategoria?.materiales && panelesCategoria.materiales.length > 0) {
          setPaneles(panelesCategoria.materiales)
        }
        
      } catch (error) {
        console.error('Error al cargar materiales:', error)
      } finally {
        setLoadingMateriales(false)
      }
    }

    fetchMateriales()
  }, [open]) // Cambiar dependencia de [] a [open]

  // Cargar municipios cuando se selecciona una provincia
  useEffect(() => {
    const fetchMunicipios = async () => {
      if (!selectedProvinciaCodigo) {
        setMunicipios([])
        return
      }

      setLoadingMunicipios(true)
      try {
        const response = await apiRequest<{
          success: boolean
          message: string
          data: Municipio[]
          total: number
        }>(`/provincias/provincia/${selectedProvinciaCodigo}/municipios`, {
          method: 'GET'
        })
        
        if (response.success && response.data) {
          setMunicipios(response.data)
        }
      } catch (error) {
        console.error('Error al cargar municipios:', error)
        setMunicipios([])
      } finally {
        setLoadingMunicipios(false)
      }
    }

    fetchMunicipios()
  }, [selectedProvinciaCodigo])

  const handleInputChange = (field: string, value: string) => {
    let processedValue = value

    if (field === 'fecha_contacto') {
      processedValue = convertFromDateInput(value)
    }

    setFormData(prev => ({
      ...prev,
      [field]: processedValue
    }))

    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }))
    }
  }

  // Función para detectar país desde el número de teléfono
  const detectCountryFromPhone = async (phoneNumber: string) => {
    if (!phoneNumber || !phoneNumber.trim().startsWith('+')) {
      return
    }

    const digitsOnly = phoneNumber.replace(/[^\d]/g, '')
    if (digitsOnly.length < 10) {
      return
    }

    setDetectingCountry(true)
    try {
      const cleanedNumber = phoneNumber.replace(/[^\d+]/g, '')
      const authToken = localStorage.getItem('auth_token') || ''
      const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.suncarsrl.com'
      const url = `${API_BASE_URL}/api/phone/country?phone_number=${encodeURIComponent(cleanedNumber)}`
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      })

      if (!response.ok) {
        setFormData(prev => ({
          ...prev,
          pais_contacto: ''
        }))
        return
      }

      const data: PhoneCountryResponse = await response.json()

      if (data.success && data.data && data.data.is_valid) {
        setFormData(prev => ({
          ...prev,
          pais_contacto: data.data.country_name
        }))
      } else {
        setFormData(prev => ({
          ...prev,
          pais_contacto: ''
        }))
      }
    } catch (error) {
      console.error('Error al detectar país:', error)
      setFormData(prev => ({
        ...prev,
        pais_contacto: ''
      }))
    } finally {
      setDetectingCountry(false)
    }
  }

  const handleTelefonoChange = (value: string) => {
    handleInputChange('telefono', value)
  }

  useEffect(() => {
    if (formData.telefono && 
        formData.telefono.trim().startsWith('+') && 
        formData.telefono.replace(/[^\d]/g, '').length >= 10) {
      
      const timeoutId = setTimeout(() => {
        detectCountryFromPhone(formData.telefono)
      }, 800)
      
      return () => clearTimeout(timeoutId)
    }
  }, [formData.telefono])

  const handleProvinciaChange = (provinciaNombre: string) => {
    const provincia = provincias.find(p => p.nombre === provinciaNombre)
    
    if (provincia) {
      setSelectedProvinciaCodigo(provincia.codigo)
      setFormData(prev => ({
        ...prev,
        provincia_montaje: provinciaNombre,
        municipio: ''
      }))
      if (errors.provincia_montaje) {
        setErrors(prev => ({
          ...prev,
          provincia_montaje: ''
        }))
      }
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.fecha_contacto.trim()) {
      newErrors.fecha_contacto = 'La fecha de contacto es obligatoria'
    }
    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es obligatorio'
    }
    if (!formData.telefono.trim()) {
      newErrors.telefono = 'El teléfono es obligatorio'
    }
    if (!formData.estado.trim()) {
      newErrors.estado = 'El estado es obligatorio'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      // Buscar las descripciones de los productos seleccionados
      console.log('🔍 Buscando inversor con código:', oferta.inversor_codigo)
      console.log('📦 Inversores disponibles:', inversores.map(inv => ({ codigo: inv.codigo, descripcion: inv.descripcion })))
      
      const inversorSeleccionado = inversores.find(inv => String(inv.codigo) === String(oferta.inversor_codigo))
      const bateriaSeleccionada = baterias.find(bat => String(bat.codigo) === String(oferta.bateria_codigo))
      const panelSeleccionado = paneles.find(pan => String(pan.codigo) === String(oferta.panel_codigo))

      console.log('✅ Inversor encontrado:', inversorSeleccionado)
      console.log('✅ Batería encontrada:', bateriaSeleccionada)
      console.log('✅ Panel encontrado:', panelSeleccionado)

      // Construir el objeto de oferta incluyendo las descripciones
      const ofertaToSend = {
        inversor_codigo: oferta.inversor_codigo || '',
        inversor_nombre: inversorSeleccionado?.descripcion || '',
        inversor_cantidad: oferta.inversor_cantidad,
        bateria_codigo: oferta.bateria_codigo || '',
        bateria_nombre: bateriaSeleccionada?.descripcion || '',
        bateria_cantidad: oferta.bateria_cantidad,
        panel_codigo: oferta.panel_codigo || '',
        panel_nombre: panelSeleccionado?.descripcion || '',
        panel_cantidad: oferta.panel_cantidad,
        elementos_personalizados: oferta.elementos_personalizados || '',
        aprobada: oferta.aprobada,
        pagada: oferta.pagada,
        costo_oferta: oferta.costo_oferta,
        costo_extra: oferta.costo_extra,
        costo_transporte: oferta.costo_transporte,
        razon_costo_extra: oferta.razon_costo_extra || ''
      }

      console.log('📦 Oferta a enviar:', ofertaToSend)

      // Crear el leadData con la oferta incluida
      const leadDataWithOferta = {
        ...formData,
        fecha_contacto: convertFromDateInput(formData.fecha_contacto),
        ofertas: [ofertaToSend]
      }

      console.log('📤 Actualizando lead con oferta:', leadDataWithOferta)

      await onSubmit(leadDataWithOferta as LeadUpdateData)
      onOpenChange(false)
    } catch (error) {
      console.error('Error al actualizar lead:', error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Editar Lead - {lead.nombre}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto pr-2 overflow-x-hidden">

          {/* Sección 1: Datos Personales */}
          <div className="border-2 border-gray-300 rounded-lg p-6 bg-white shadow-sm">
            <div className="pb-4 mb-4 border-b-2 border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Datos Personales</h3>
              <p className="text-sm text-gray-500 mt-1">Información básica del contacto</p>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fecha_contacto">
                    Fecha de Contacto <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="fecha_contacto"
                    type="date"
                    value={formData.fecha_contacto}
                    onChange={(e) => handleInputChange('fecha_contacto', e.target.value)}
                    className={`text-gray-900 ${errors.fecha_contacto ? 'border-red-500' : ''}`}
                  />
                  {errors.fecha_contacto && (
                    <p className="text-sm text-red-500 mt-1">{errors.fecha_contacto}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="comercial">Comercial</Label>
                  <Input
                    id="comercial"
                    value={formData.comercial}
                    onChange={(e) => handleInputChange('comercial', e.target.value)}
                    className="text-gray-900 placeholder:text-gray-400"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nombre">
                    Nombre <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => handleInputChange('nombre', e.target.value)}
                    className={`text-gray-900 placeholder:text-gray-400 ${errors.nombre ? 'border-red-500' : ''}`}
                  />
                  {errors.nombre && (
                    <p className="text-sm text-red-500 mt-1">{errors.nombre}</p>
                  )}
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
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="telefono">
                    Teléfono <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="telefono"
                    value={formData.telefono}
                    onChange={(e) => handleTelefonoChange(e.target.value)}
                    placeholder="+53 5 1234567"
                    className={`text-gray-900 placeholder:text-gray-400 ${errors.telefono ? 'border-red-500' : ''}`}
                  />
                  {errors.telefono && (
                    <p className="text-sm text-red-500 mt-1">{errors.telefono}</p>
                  )}
                  {detectingCountry && (
                    <p className="text-sm text-blue-500 mt-1">Detectando país...</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="telefono_adicional">Teléfono Adicional</Label>
                  <Input
                    id="telefono_adicional"
                    value={formData.telefono_adicional || ''}
                    onChange={(e) => handleInputChange('telefono_adicional', e.target.value)}
                    placeholder="+53 5 1234567"
                    className="text-gray-900 placeholder:text-gray-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="estado">
                    Estado <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.estado}
                    onValueChange={(value) => handleInputChange('estado', value)}
                  >
                    <SelectTrigger 
                      id="estado" 
                      className={`text-gray-900 ${errors.estado ? 'border-red-500' : ''}`}
                    >
                      <SelectValue placeholder="Seleccionar estado" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px] overflow-y-auto">
                      {estadosDisponibles.map((estado) => (
                        <SelectItem key={estado} value={estado}>
                          {estado}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.estado && (
                    <p className="text-sm text-red-500 mt-1">{errors.estado}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="fuente">Fuente</Label>
                  {!usandoFuentePersonalizada ? (
                    <Select
                      value={formData.fuente}
                      onValueChange={(value) => {
                        if (value === '__custom__') {
                          setUsandoFuentePersonalizada(true)
                          handleInputChange('fuente', '')
                        } else {
                          handleInputChange('fuente', value)
                        }
                      }}
                    >
                      <SelectTrigger id="fuente" className="text-gray-900">
                        <SelectValue placeholder="Seleccionar fuente" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px] overflow-y-auto">
                        <SelectItem value="Página Web">Página Web</SelectItem>
                        <SelectItem value="Instagram">Instagram</SelectItem>
                        <SelectItem value="Facebook">Facebook</SelectItem>
                        <SelectItem value="Directo">Directo</SelectItem>
                        <SelectItem value="Mensaje de Whatsapp">Mensaje de Whatsapp</SelectItem>
                        <SelectItem value="Visita">Visita</SelectItem>
                        <SelectItem value="__custom__">✏️ Otra (escribir manualmente)</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="space-y-2">
                      <Input
                        id="fuente-custom"
                        type="text"
                        value={formData.fuente}
                        onChange={(e) => handleInputChange('fuente', e.target.value)}
                        placeholder="Escribe la fuente personalizada..."
                        className="text-gray-900 placeholder:text-gray-400"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setUsandoFuentePersonalizada(false)
                          handleInputChange('fuente', '')
                        }}
                        className="text-xs"
                      >
                        ← Volver a opciones predefinidas
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <Label htmlFor="direccion">Dirección</Label>
                <Input
                  id="direccion"
                  value={formData.direccion}
                  onChange={(e) => handleInputChange('direccion', e.target.value)}
                  className="text-gray-900 placeholder:text-gray-400"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="provincia_montaje">Provincia</Label>
                  <Select
                    value={formData.provincia_montaje}
                    onValueChange={handleProvinciaChange}
                    disabled={loadingProvincias}
                  >
                    <SelectTrigger id="provincia_montaje" className="text-gray-900">
                      <SelectValue placeholder={loadingProvincias ? "Cargando..." : "Seleccionar provincia"} />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px] overflow-y-auto">
                      {provincias.map((provincia, index) => (
                        <SelectItem key={`provincia-${provincia.codigo}-${index}`} value={provincia.nombre}>
                          {provincia.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="municipio">Municipio</Label>
                  <Select
                    value={formData.municipio || ''}
                    onValueChange={(value) => handleInputChange('municipio', value)}
                    disabled={!selectedProvinciaCodigo || loadingMunicipios}
                  >
                    <SelectTrigger id="municipio" className="text-gray-900">
                      <SelectValue 
                        placeholder={
                          !selectedProvinciaCodigo 
                            ? "Seleccione una provincia primero" 
                            : loadingMunicipios 
                            ? "Cargando..." 
                            : "Seleccionar municipio"
                        } 
                      />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px] overflow-y-auto">
                      {municipios.map((municipio, index) => (
                        <SelectItem key={`municipio-${municipio.codigo}-${index}`} value={municipio.nombre}>
                          {municipio.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <Label htmlFor="referencia">Referencia</Label>
                  <Input
                    id="referencia"
                    value={formData.referencia}
                    onChange={(e) => handleInputChange('referencia', e.target.value)}
                    className="text-gray-900 placeholder:text-gray-400"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Sección 2: Oferta */}
          <div className="border-2 border-gray-300 rounded-lg p-6 bg-white shadow-sm">
            <div className="pb-4 mb-4 border-b-2 border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Oferta</h3>
              <p className="text-sm text-gray-500 mt-1">Detalles de productos y costos</p>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="inversor">Inversor</Label>
                  <Select
                    value={oferta.inversor_codigo && inversores.length > 0 ? String(oferta.inversor_codigo) : ''}
                    onValueChange={(value) => {
                      setOferta(prev => ({ ...prev, inversor_codigo: value }))
                    }}
                    disabled={loadingMateriales || inversores.length === 0}
                  >
                    <SelectTrigger id="inversor" className="text-gray-900">
                      <SelectValue 
                        placeholder={
                          loadingMateriales 
                            ? "Cargando..." 
                            : inversores.length === 0 
                            ? "No hay inversores disponibles" 
                            : "Seleccionar inversor"
                        } 
                      />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px] overflow-y-auto">
                      {inversores.map((inv, index) => (
                        <SelectItem key={`inv-${inv.codigo}-${index}`} value={String(inv.codigo)}>
                          {inv.descripcion}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="inversor_cantidad">Cantidad</Label>
                  <Input
                    id="inversor_cantidad"
                    type="number"
                    min="1"
                    value={oferta.inversor_cantidad}
                    onChange={(e) => setOferta(prev => ({ ...prev, inversor_cantidad: parseInt(e.target.value) || 1 }))}
                    className="text-gray-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="bateria">Batería</Label>
                  <Select
                    value={oferta.bateria_codigo && baterias.length > 0 ? String(oferta.bateria_codigo) : ''}
                    onValueChange={(value) => {
                      setOferta(prev => ({ ...prev, bateria_codigo: value }))
                    }}
                    disabled={loadingMateriales || baterias.length === 0}
                  >
                    <SelectTrigger id="bateria" className="text-gray-900">
                      <SelectValue 
                        placeholder={
                          loadingMateriales 
                            ? "Cargando..." 
                            : baterias.length === 0 
                            ? "No hay baterías disponibles" 
                            : "Seleccionar batería"
                        } 
                      />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px] overflow-y-auto">
                      {baterias.map((bat, index) => (
                        <SelectItem key={`bat-${bat.codigo}-${index}`} value={String(bat.codigo)}>
                          {bat.descripcion}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="bateria_cantidad">Cantidad</Label>
                  <Input
                    id="bateria_cantidad"
                    type="number"
                    min="1"
                    value={oferta.bateria_cantidad}
                    onChange={(e) => setOferta(prev => ({ ...prev, bateria_cantidad: parseInt(e.target.value) || 1 }))}
                    className="text-gray-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="panel">Panel</Label>
                  <Select
                    value={oferta.panel_codigo && paneles.length > 0 ? String(oferta.panel_codigo) : ''}
                    onValueChange={(value) => {
                      setOferta(prev => ({ ...prev, panel_codigo: value }))
                    }}
                    disabled={loadingMateriales || paneles.length === 0}
                  >
                    <SelectTrigger id="panel" className="text-gray-900">
                      <SelectValue 
                        placeholder={
                          loadingMateriales 
                            ? "Cargando..." 
                            : paneles.length === 0 
                            ? "No hay paneles disponibles" 
                            : "Seleccionar panel"
                        } 
                      />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px] overflow-y-auto">
                      {paneles.map((pan, index) => (
                        <SelectItem key={`pan-${pan.codigo}-${index}`} value={String(pan.codigo)}>
                          {pan.descripcion}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="panel_cantidad">Cantidad</Label>
                  <Input
                    id="panel_cantidad"
                    type="number"
                    min="1"
                    value={oferta.panel_cantidad}
                    onChange={(e) => setOferta(prev => ({ ...prev, panel_cantidad: parseInt(e.target.value) || 1 }))}
                    className="text-gray-900"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="elementos_personalizados">Elementos Personalizados (Comentario)</Label>
                <Textarea
                  id="elementos_personalizados"
                  value={oferta.elementos_personalizados}
                  onChange={(e) => setOferta(prev => ({ ...prev, elementos_personalizados: e.target.value }))}
                  rows={2}
                  className="text-gray-900 placeholder:text-gray-400"
                  placeholder="Describe elementos adicionales o personalizados..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2 p-3 border rounded-md">
                  <input
                    type="checkbox"
                    id="aprobada"
                    checked={oferta.aprobada}
                    onChange={(e) => setOferta(prev => ({ ...prev, aprobada: e.target.checked }))}
                    className="h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <Label htmlFor="aprobada" className="cursor-pointer font-medium">
                    Oferta Aprobada
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-md">
                  <input
                    type="checkbox"
                    id="pagada"
                    checked={oferta.pagada}
                    onChange={(e) => setOferta(prev => ({ ...prev, pagada: e.target.checked }))}
                    className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <Label htmlFor="pagada" className="cursor-pointer font-medium">
                    Oferta Pagada
                  </Label>
                </div>
              </div>
            </div>
          </div>

          {/* Sección 3: Costos y Pago */}
          <div className="border-2 border-gray-300 rounded-lg p-6 bg-white shadow-sm">
            <div className="pb-4 mb-4 border-b-2 border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Costos y Pago</h3>
              <p className="text-sm text-gray-500 mt-1">Información financiera de la oferta</p>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="costo_oferta">Costo de Oferta</Label>
                  <Input
                    id="costo_oferta"
                    type="number"
                    min="0"
                    step="0.01"
                    value={oferta.costo_oferta}
                    onChange={(e) => setOferta(prev => ({ ...prev, costo_oferta: parseFloat(e.target.value) || 0 }))}
                    className="text-gray-900"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="costo_extra">Costo Extra</Label>
                  <Input
                    id="costo_extra"
                    type="number"
                    min="0"
                    step="0.01"
                    value={oferta.costo_extra}
                    onChange={(e) => setOferta(prev => ({ ...prev, costo_extra: parseFloat(e.target.value) || 0 }))}
                    className="text-gray-900"
                    placeholder="0.00"
                  />
                </div>
                {formData.provincia_montaje && formData.provincia_montaje !== 'La Habana' ? (
                  <div>
                    <Label htmlFor="costo_transporte">Costo de Transporte</Label>
                    <Input
                      id="costo_transporte"
                      type="number"
                      min="0"
                      step="0.01"
                      value={oferta.costo_transporte || 0}
                      onChange={(e) => setOferta(prev => ({ ...prev, costo_transporte: parseFloat(e.target.value) || 0 }))}
                      className="text-gray-900"
                      placeholder="0.00"
                    />
                  </div>
                ) : (
                  <div></div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="costo_final_2">Costo Final</Label>
                  <Input
                    id="costo_final_2"
                    type="number"
                    value={costoFinal.toFixed(2)}
                    disabled
                    className="text-gray-900 bg-gray-100"
                  />
                </div>
                <div>
                  <Label htmlFor="metodo_pago">Método de Pago</Label>
                  <Input
                    id="metodo_pago"
                    value={formData.metodo_pago || ''}
                    onChange={(e) => handleInputChange('metodo_pago', e.target.value)}
                    className="text-gray-900 placeholder:text-gray-400"
                  />
                </div>
                <div>
                  <Label htmlFor="moneda">Moneda</Label>
                  <Input
                    id="moneda"
                    value={formData.moneda || ''}
                    onChange={(e) => handleInputChange('moneda', e.target.value)}
                    className="text-gray-900 placeholder:text-gray-400"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="razon_costo_extra">Razón del Costo Extra</Label>
                <Input
                  id="razon_costo_extra"
                  value={oferta.razon_costo_extra}
                  onChange={(e) => setOferta(prev => ({ ...prev, razon_costo_extra: e.target.value }))}
                  className="text-gray-900 placeholder:text-gray-400"
                  placeholder="Ej: Transporte, instalación especial, materiales adicionales..."
                />
              </div>
            </div>
          </div>

          {/* Comentarios */}
          <div className="space-y-2">
            <Label htmlFor="comentario">Comentario</Label>
            <Textarea
              id="comentario"
              value={formData.comentario || ''}
              onChange={(e) => handleInputChange('comentario', e.target.value)}
              rows={3}
              className="text-gray-900 placeholder:text-gray-400"
            />
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
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white"
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
  )
}
