"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { Textarea } from "@/components/shared/molecule/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/shared/atom/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/shared/molecule/dialog"
import { Loader2, MapPin } from "lucide-react"
import { MaterialSearchSelector } from "@/components/feats/materials/material-search-selector"
import type { ClienteCreateData } from "@/lib/api-types"
import { useAuth } from "@/contexts/auth-context"
import { apiRequest } from "@/lib/api-config"
import MapPicker from "@/components/shared/organism/MapPickerNoSSR"

interface Provincia {
  codigo: string
  nombre: string
}

interface Municipio {
  codigo: string
  nombre: string
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

interface CreateClientDialogProps {
  onSubmit: (data: ClienteCreateData) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export function CreateClientDialog({ onSubmit, onCancel, isLoading }: CreateClientDialogProps) {
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
  const [showMapModal, setShowMapModal] = useState(false)
  const [clientLatLng, setClientLatLng] = useState<{ lat: string, lng: string }>({ lat: '', lng: '' })
  
  // Estado para equipo propio
  const [equipoPropio, setEquipoPropio] = useState<boolean | undefined>(undefined)
  const [mostrarPreguntaEquipoPropio, setMostrarPreguntaEquipoPropio] = useState(false)
  
  // Estados para la oferta
  const [oferta, setOferta] = useState({
    inversor_codigo: '',
    inversor_cantidad: 1,
    bateria_codigo: '',
    bateria_cantidad: 1,
    panel_codigo: '',
    panel_cantidad: 1,
    elementos_personalizados: '',
    aprobada: false,
    pagada: false,
    costo_oferta: 0,
    costo_extra: 0,
    costo_transporte: 0,
    razon_costo_extra: ''
  })

  // Calcular costo final automáticamente (incluye costo de transporte)
  const costoFinal = oferta.costo_oferta + oferta.costo_extra + oferta.costo_transporte
  
  // Función para convertir fecha DD/MM/YYYY a YYYY-MM-DD (para input date)
  const convertToDateInput = (ddmmyyyy: string): string => {
    if (!ddmmyyyy) return ''
    if (ddmmyyyy.match(/^\d{4}-\d{2}-\d{2}$/)) return ddmmyyyy // Ya está en formato ISO
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

  // Obtener fecha actual en formato DD/MM/YYYY
  const getCurrentDateDDMMYYYY = (): string => {
    const today = new Date()
    const day = today.getDate().toString().padStart(2, '0')
    const month = (today.getMonth() + 1).toString().padStart(2, '0')
    const year = today.getFullYear()
    return `${day}/${month}/${year}`
  }

  const [formData, setFormData] = useState<ClienteCreateData>({
    numero: '',
    fecha_contacto: getCurrentDateDDMMYYYY(), // Fecha actual en formato DD/MM/YYYY
    nombre: '',
    telefono: '',
    telefono_adicional: '',
    estado: 'Pendiente de instalación',
    fuente: '',
    referencia: '',
    direccion: '',
    pais_contacto: '',
    comentario: '',
    provincia_montaje: '',
    municipio: '',
    comercial: user?.nombre || '', // Asignar automáticamente el nombre del usuario actual
    ofertas: [],
    elementos_personalizados: [],
    metodo_pago: '',
    moneda: '',
    carnet_identidad: '',
    fecha_montaje: '',
    fecha_instalacion: '',
    falta_instalacion: '',
  })

  const [generandoCodigo, setGenerandoCodigo] = useState(false)
  const [errorCodigo, setErrorCodigo] = useState('')

  // Actualizar el comercial cuando el usuario cambie (por si acaso)
  useEffect(() => {
    if (user?.nombre) {
      setFormData(prev => ({
        ...prev,
        comercial: user.nombre
      }))
    }
  }, [user])

  // Generar código automáticamente cuando se tengan provincia, municipio e inversor (o equipo propio)
  useEffect(() => {
    const generarCodigoAutomatico = async () => {
      // Verificar que tengamos provincia y municipio
      if (!selectedProvinciaCodigo || !formData.municipio) {
        // Si falta algún dato, limpiar el código
        if (formData.numero) {
          setFormData(prev => ({ ...prev, numero: '' }))
        }
        setMostrarPreguntaEquipoPropio(false)
        return
      }

      // Verificar si hay inversor seleccionado
      const tieneInversor = oferta.inversor_codigo && oferta.inversor_codigo.trim() !== ''
      
      // Si no hay inversor y no se ha respondido sobre equipo propio, mostrar pregunta
      if (!tieneInversor && equipoPropio === undefined) {
        setMostrarPreguntaEquipoPropio(true)
        if (formData.numero) {
          setFormData(prev => ({ ...prev, numero: '' }))
        }
        return
      }

      // Si no hay inversor y se indicó que NO es equipo propio, no generar código
      if (!tieneInversor && equipoPropio === false) {
        setMostrarPreguntaEquipoPropio(true)
        setErrorCodigo('Debes seleccionar un inversor para generar el código del cliente')
        if (formData.numero) {
          setFormData(prev => ({ ...prev, numero: '' }))
        }
        return
      }

      // Si llegamos aquí, podemos generar el código
      // Caso 1: Tiene inversor
      // Caso 2: No tiene inversor pero equipoPropio === true
      
      if (!tieneInversor && !equipoPropio) {
        // No debería llegar aquí, pero por seguridad
        return
      }

      setGenerandoCodigo(true)
      setErrorCodigo('')
      setMostrarPreguntaEquipoPropio(false)

      try {
        if (equipoPropio) {
          // Generar código con prefijo P para equipo propio
          // Crear lead temporal sin inversor
          const leadTemporal = {
            fecha_contacto: new Date().toISOString().split('T')[0],
            nombre: formData.nombre || 'Cliente Temporal',
            telefono: formData.telefono || '+00000000000',
            estado: 'nuevo',
            fuente: 'Sistema',
            direccion: formData.direccion || 'Temporal',
            provincia_montaje: formData.provincia_montaje,
            municipio: formData.municipio,
            comercial: user?.nombre || 'Sistema',
            ofertas: [] // Sin ofertas para equipo propio
          }

          console.log('📝 Creando lead temporal para equipo propio:', leadTemporal)

          const responseCrear = await apiRequest<{
            success: boolean
            message: string
            data: { id: string }
          }>('/leads/', {
            method: 'POST',
            body: JSON.stringify(leadTemporal)
          })

          if (!responseCrear.success || !responseCrear.data?.id) {
            throw new Error('Error al crear lead temporal')
          }

          const leadId = responseCrear.data.id
          console.log('✅ Lead temporal creado con ID:', leadId)

          // Generar código con equipo_propio=true
          const responseGenerar = await apiRequest<{
            success: boolean
            message: string
            codigo_generado: string
          }>(`/leads/${leadId}/generar-codigo-cliente?equipo_propio=true`)

          if (!responseGenerar.success || !responseGenerar.codigo_generado) {
            throw new Error(responseGenerar.message || 'Error al generar el código')
          }

          const codigoGenerado = responseGenerar.codigo_generado
          console.log('✅ Código generado para equipo propio:', codigoGenerado)

          // Eliminar el lead temporal
          try {
            await apiRequest(`/leads/${leadId}`, {
              method: 'DELETE'
            })
            console.log('✅ Lead temporal eliminado')
          } catch (error) {
            console.warn('⚠️ No se pudo eliminar el lead temporal:', error)
          }

          // Validar formato P + 9 dígitos
          if (codigoGenerado.length !== 10 || !/^P\d{9}$/.test(codigoGenerado)) {
            throw new Error(
              `El código generado tiene un formato incorrecto: "${codigoGenerado}". ` +
              `Debe ser P seguido de 9 dígitos.`
            )
          }

          setFormData(prev => ({
            ...prev,
            numero: codigoGenerado
          }))

          console.log('✅ Código generado automáticamente para equipo propio:', codigoGenerado)
        } else {
          // Generar código normal con inversor
          const inversorSeleccionado = inversores.find(inv => String(inv.codigo) === String(oferta.inversor_codigo))
          
          if (!inversorSeleccionado) {
            throw new Error('No se encontró el inversor seleccionado')
          }

          const municipioSeleccionado = municipios.find(m => m.nombre === formData.municipio)
          
          if (!municipioSeleccionado) {
            throw new Error('No se encontró el municipio seleccionado')
          }

          const leadTemporal = {
            fecha_contacto: new Date().toISOString().split('T')[0],
            nombre: formData.nombre || 'Cliente Temporal',
            telefono: formData.telefono || '+00000000000',
            estado: 'nuevo',
            fuente: 'Sistema',
            direccion: formData.direccion || 'Temporal',
            provincia_montaje: formData.provincia_montaje,
            municipio: formData.municipio,
            comercial: user?.nombre || 'Sistema',
            ofertas: [{
              id: 'temp-' + Date.now(),
              descripcion: inversorSeleccionado.descripcion,
              descripcion_detallada: inversorSeleccionado.descripcion,
              inversor_codigo: String(inversorSeleccionado.codigo),
              inversor_nombre: inversorSeleccionado.descripcion,
              precio: inversorSeleccionado.precio || 0,
              precio_cliente: inversorSeleccionado.precio || 0,
              marca: inversorSeleccionado.descripcion.split(' ')[0],
              moneda: 'USD',
              financiamiento: false,
              elementos: [],
              cantidad: 1
            }]
          }

          console.log('📝 Creando lead temporal para generar código:', leadTemporal)

          const responseCrear = await apiRequest<{
            success: boolean
            message: string
            data: { id: string }
          }>('/leads/', {
            method: 'POST',
            body: JSON.stringify(leadTemporal)
          })

          if (!responseCrear.success || !responseCrear.data?.id) {
            throw new Error('Error al crear lead temporal')
          }

          const leadId = responseCrear.data.id
          console.log('✅ Lead temporal creado con ID:', leadId)

          const responseGenerar = await apiRequest<{
            success: boolean
            message: string
            codigo_generado: string
          }>(`/leads/${leadId}/generar-codigo-cliente`)

          if (!responseGenerar.success || !responseGenerar.codigo_generado) {
            throw new Error(responseGenerar.message || 'Error al generar el código')
          }

          const codigoGenerado = responseGenerar.codigo_generado
          console.log('✅ Código generado:', codigoGenerado)

          try {
            await apiRequest(`/leads/${leadId}`, {
              method: 'DELETE'
            })
            console.log('✅ Lead temporal eliminado')
          } catch (error) {
            console.warn('⚠️ No se pudo eliminar el lead temporal:', error)
          }

          if (codigoGenerado.length !== 10) {
            throw new Error(
              `El código generado tiene un formato incorrecto. ` +
              `Se esperaban 10 caracteres pero se recibieron ${codigoGenerado.length}. ` +
              `Código recibido: "${codigoGenerado}".`
            )
          }

          if (!/^[A-Z]\d{9}$/.test(codigoGenerado)) {
            throw new Error(
              `El código generado tiene un formato inválido: "${codigoGenerado}". ` +
              `Debe ser 1 letra mayúscula seguida de 9 dígitos.`
            )
          }

          setFormData(prev => ({
            ...prev,
            numero: codigoGenerado
          }))

          console.log('✅ Código generado automáticamente:', codigoGenerado)
        }
      } catch (error) {
        console.error('❌ Error al generar código:', error)
        const mensaje = error instanceof Error ? error.message : 'Error al generar el código de cliente'
        setErrorCodigo(mensaje)
        setFormData(prev => ({ ...prev, numero: '' }))
      } finally {
        setGenerandoCodigo(false)
      }
    }

    // Solo generar si tenemos los materiales cargados
    if (!loadingMateriales && inversores.length > 0) {
      generarCodigoAutomatico()
    }
  }, [selectedProvinciaCodigo, formData.municipio, formData.provincia_montaje, formData.nombre, formData.telefono, oferta.inversor_codigo, equipoPropio, inversores, municipios, loadingMateriales])

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

  // Cargar materiales (inversores, baterías, paneles) al montar el componente
  useEffect(() => {
    const fetchMateriales = async () => {
      setLoadingMateriales(true)
      try {
        console.log('🔄 Iniciando carga de materiales desde /productos/')
        
        // Obtener todos los productos/categorías de una vez
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
        
        console.log('📦 Respuesta completa del servidor:', response)
        
        if (!response.success) {
          console.error('❌ La respuesta no fue exitosa:', response.message)
          return
        }
        
        const productos = response.data || []
        console.log('📋 Total de categorías recibidas:', productos.length)
        console.log('📋 Categorías disponibles:', productos.map(p => p.categoria))
        
        // Buscar inversores
        const inversoresCategoria = productos.find(p => p.categoria === 'INVERSORES')
        if (inversoresCategoria?.materiales && inversoresCategoria.materiales.length > 0) {
          console.log('✅ Inversores encontrados:', inversoresCategoria.materiales.length)
          console.log('📝 Primer inversor:', inversoresCategoria.materiales[0])
          setInversores(inversoresCategoria.materiales)
        } else {
          console.warn('⚠️ No se encontró la categoría INVERSORES o no tiene materiales')
          setInversores([])
        }
        
        // Buscar baterías (con tilde)
        const bateriasCategoria = productos.find(p => p.categoria === 'BATERÍAS')
        if (bateriasCategoria?.materiales && bateriasCategoria.materiales.length > 0) {
          console.log('✅ Baterías encontradas:', bateriasCategoria.materiales.length)
          console.log('📝 Primera batería:', bateriasCategoria.materiales[0])
          setBaterias(bateriasCategoria.materiales)
        } else {
          console.warn('⚠️ No se encontró la categoría BATERÍAS o no tiene materiales')
          setBaterias([])
        }
        
        // Buscar paneles
        const panelesCategoria = productos.find(p => p.categoria === 'PANELES')
        if (panelesCategoria?.materiales && panelesCategoria.materiales.length > 0) {
          console.log('✅ Paneles encontrados:', panelesCategoria.materiales.length)
          console.log('📝 Primer panel:', panelesCategoria.materiales[0])
          setPaneles(panelesCategoria.materiales)
        } else {
          console.warn('⚠️ No se encontró la categoría PANELES o no tiene materiales')
          setPaneles([])
        }
        
      } catch (error) {
        console.error('❌ Error al cargar materiales:', error)
        if (error instanceof Error) {
          console.error('❌ Mensaje de error:', error.message)
          console.error('❌ Stack:', error.stack)
        }
      } finally {
        setLoadingMateriales(false)
      }
    }

    fetchMateriales()
  }, [])

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

  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleInputChange = (field: keyof ClienteCreateData, value: string) => {
    let processedValue = value

    // Convertir fecha de input date (YYYY-MM-DD) a formato DD/MM/YYYY
    if (field === 'fecha_contacto' || field === 'fecha_montaje' || field === 'fecha_instalacion') {
      processedValue = convertFromDateInput(value)
    }

    setFormData(prev => ({
      ...prev,
      [field]: processedValue
    }))

    // Limpiar error del campo cuando el usuario empiece a escribir
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }))
    }
  }

  // Función para detectar país desde el número de teléfono
  const detectCountryFromPhone = async (phoneNumber: string) => {
    // Solo intentar detectar si el número tiene formato internacional (empieza con +)
    if (!phoneNumber || !phoneNumber.trim().startsWith('+')) {
      return
    }

    // Validar que tenga al menos 10 dígitos (sin contar el +)
    // Esto evita llamadas al API con números incompletos
    const digitsOnly = phoneNumber.replace(/[^\d]/g, '')
    if (digitsOnly.length < 10) {
      console.log('⏳ Número muy corto, esperando más dígitos...', digitsOnly.length, 'de 10 mínimo')
      return
    }

    setDetectingCountry(true)
    try {
      // Limpiar el número: remover espacios y caracteres especiales excepto el +
      const cleanedNumber = phoneNumber.replace(/[^\d+]/g, '')
      
      console.log('🔍 Detectando país para número:', phoneNumber)
      console.log('🧹 Número limpio enviado:', cleanedNumber)
      
      // Obtener token de autenticación
      const authToken = localStorage.getItem('auth_token') || ''
      
      // Usar fetch directamente para tener más control sobre la URL
      const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.suncarsrl.com'
      const url = `${API_BASE_URL}/api/phone/country?phone_number=${encodeURIComponent(cleanedNumber)}`
      
      console.log('📡 URL completa:', url)
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      })

      console.log('📨 Status de respuesta:', response.status)

      if (!response.ok) {
        // Intentar obtener el mensaje de error del servidor
        const errorData = await response.json().catch(() => ({ detail: 'Error desconocido' }))
        console.error('❌ Respuesta no exitosa:', response.status, response.statusText)
        console.error('❌ Detalle del error:', errorData.detail || errorData.message || 'Sin detalles')
        
        // Si no se pudo detectar, dejar el campo vacío
        setFormData(prev => ({
          ...prev,
          pais_contacto: ''
        }))
        return
      }

      const data: PhoneCountryResponse = await response.json()
      console.log('✅ Respuesta del servidor:', data)

      if (data.success && data.data && data.data.is_valid) {
        console.log('✅ País detectado:', data.data.country_name)
        console.log('📱 Operador:', data.data.carrier || 'No disponible')
        console.log('🌍 Código ISO:', data.data.country_iso)
        
        // Actualizar el país de contacto con el país detectado
        setFormData(prev => ({
          ...prev,
          pais_contacto: data.data.country_name
        }))
      } else {
        console.warn('⚠️ Número no válido, dejando país vacío')
        // Si el número no es válido, dejar vacío
        setFormData(prev => ({
          ...prev,
          pais_contacto: ''
        }))
      }
    } catch (error) {
      // Mostrar más detalles del error
      console.error('❌ Error completo al detectar país:', error)
      if (error instanceof Error) {
        console.error('❌ Mensaje de error:', error.message)
      }
      // En caso de error, dejar vacío
      setFormData(prev => ({
        ...prev,
        pais_contacto: ''
      }))
    } finally {
      setDetectingCountry(false)
    }
  }

  // Handler especial para el campo teléfono que detecta el país
  const handleTelefonoChange = (value: string) => {
    handleInputChange('telefono', value)
  }

  // Efecto para detectar país automáticamente con debounce
  useEffect(() => {
    // Solo detectar si el número tiene formato internacional y longitud mínima realista
    // Mínimo: + (1) + código país (1-3) + número (7-15) = al menos 10 caracteres
    if (formData.telefono && 
        formData.telefono.trim().startsWith('+') && 
        formData.telefono.replace(/[^\d]/g, '').length >= 10) { // Al menos 10 dígitos (sin contar el +)
      
      const timeoutId = setTimeout(() => {
        detectCountryFromPhone(formData.telefono)
      }, 800) // Aumentado a 800ms para dar más tiempo al usuario
      
      return () => clearTimeout(timeoutId)
    }
  }, [formData.telefono])

  const handleProvinciaChange = (provinciaNombre: string) => {
    // Encontrar el código de la provincia seleccionada
    const provincia = provincias.find(p => p.nombre === provinciaNombre)
    
    if (provincia) {
      setSelectedProvinciaCodigo(provincia.codigo)
      setFormData(prev => ({
        ...prev,
        provincia_montaje: provinciaNombre,
        municipio: '' // Limpiar municipio cuando cambia la provincia
      }))
      // Limpiar error si existe
      if (errors.provincia_montaje) {
        setErrors(prev => ({
          ...prev,
          provincia_montaje: ''
        }))
      }
    }
  }

  const sanitizeClientData = (data: ClienteCreateData): ClienteCreateData => {
    const cleaned: Record<string, unknown> = { ...data }

    Object.entries(cleaned).forEach(([key, value]) => {
      // No eliminar el array de ofertas, lo necesitamos siempre
      if (key === 'ofertas') {
        return
      }

      if (typeof value === 'string' && value.trim() === '') {
        delete cleaned[key]
        return
      }

      if (Array.isArray(value) && value.length === 0) {
        delete cleaned[key]
      }
    })

    return cleaned as unknown as ClienteCreateData
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    // Campos obligatorios
    if (!formData.numero.trim()) {
      newErrors.numero = 'El código de cliente es obligatorio'
    }
    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es obligatorio'
    }
    if (!formData.telefono.trim()) {
      newErrors.telefono = 'El teléfono es obligatorio'
    }
    if (!formData.direccion.trim()) {
      newErrors.direccion = 'La dirección es obligatoria'
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
      const inversorSeleccionado = inversores.find(inv => String(inv.codigo) === oferta.inversor_codigo)
      const bateriaSeleccionada = baterias.find(bat => String(bat.codigo) === oferta.bateria_codigo)
      const panelSeleccionado = paneles.find(pan => String(pan.codigo) === oferta.panel_codigo)

      // Construir el objeto de oferta desde el estado 'oferta' incluyendo las descripciones
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
      const clientDataWithOferta: ClienteCreateData = {
        ...formData,
        fecha_contacto: getCurrentDateDDMMYYYY(),
        // Mantener el estado seleccionado por el usuario (no sobrescribir)
        latitud: clientLatLng.lat || undefined,
        longitud: clientLatLng.lng || undefined,
        ofertas: [ofertaToSend],
        equipo_propio: equipoPropio,  // ✅ Agregar campo equipo_propio
      }

      await onSubmit(sanitizeClientData(clientDataWithOferta))
    } catch (error) {
      console.error('Error al crear cliente:', error)
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto pr-2 overflow-x-hidden">
      {/* Sección 1: Datos Personales */}
      <div className="border-2 border-gray-300 rounded-lg p-6 bg-white shadow-sm">
        <div className="pb-4 mb-4 border-b-2 border-gray-200">
          <h3 className="text-xl font-bold text-gray-900">Datos Personales</h3>
          <p className="text-sm text-gray-500 mt-1">Información básica del contacto</p>
        </div>
        <div className="space-y-4">
          {/* 1. Nombre y Referencia */}
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

          {/* 2. Codigo y Carnet */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="numero">
                Código de cliente <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="numero"
                  value={formData.numero}
                  readOnly
                  disabled
                  className={`text-gray-900 bg-gray-50 ${errors.numero ? 'border-red-500' : ''}`}
                  placeholder={generandoCodigo ? 'Generando código...' : 'Seleccione provincia, municipio e inversor (o marque equipo propio)'}
                />
                {generandoCodigo && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                  </div>
                )}
              </div>
              {errorCodigo && (
                <p className="text-sm text-red-500 mt-1">{errorCodigo}</p>
              )}
              {!errorCodigo && !generandoCodigo && formData.numero && (
                <p className="text-sm text-green-600 mt-1">
                  ✓ Código generado automáticamente
                  {equipoPropio && ' (Equipo propio - Prefijo P)'}
                </p>
              )}
              {!errorCodigo && !generandoCodigo && !formData.numero && !mostrarPreguntaEquipoPropio && (
                <p className="text-sm text-gray-500 mt-1">
                  El código se generará automáticamente al seleccionar provincia, municipio e inversor
                </p>
              )}
              {errors.numero && (
                <p className="text-sm text-red-500 mt-1">{errors.numero}</p>
              )}
            </div>
            <div>
              <Label htmlFor="carnet_identidad">Carnet de identidad</Label>
              <Input
                id="carnet_identidad"
                value={formData.carnet_identidad || ''}
                onChange={(e) => handleInputChange('carnet_identidad', e.target.value)}
                className="text-gray-900 placeholder:text-gray-400"
              />
            </div>
          </div>

          {/* Pregunta sobre equipo propio - solo si no hay inversor */}
          {mostrarPreguntaEquipoPropio && (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4">
              <Label className="text-sm font-semibold text-amber-900 mb-3 block">
                ¿El equipo es propio del cliente?
              </Label>
              <p className="text-xs text-amber-700 mb-3">
                No has seleccionado un inversor. Si el cliente ya tiene su propio equipo instalado, 
                el código empezará con "P". Si necesita equipo, debes seleccionar un inversor.
              </p>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className={`flex-1 ${equipoPropio === true ? 'bg-amber-100 border-amber-500 border-2' : 'border-amber-300'} hover:bg-amber-100`}
                  onClick={() => {
                    setEquipoPropio(true)
                    setErrorCodigo('')
                  }}
                >
                  {equipoPropio === true && '✓ '}Sí, es propio
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className={`flex-1 ${equipoPropio === false ? 'bg-amber-100 border-amber-500 border-2' : 'border-amber-300'} hover:bg-amber-100`}
                  onClick={() => {
                    setEquipoPropio(false)
                    setErrorCodigo('Debes seleccionar un inversor para generar el código del cliente')
                  }}
                >
                  {equipoPropio === false && '✓ '}No, necesita equipo
                </Button>
              </div>
            </div>
          )}

          {/* 3. Estado y Fuente */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="estado">Estado</Label>
              <Select
                value={formData.estado}
                onValueChange={(value) => handleInputChange('estado', value)}
              >
                <SelectTrigger id="estado" className="text-gray-900">
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Equipo instalado con éxito">Equipo instalado con éxito</SelectItem>
                  <SelectItem value="Esperando equipo">Esperando equipo</SelectItem>
                  <SelectItem value="Pendiente de instalación">Pendiente de instalación</SelectItem>
                  <SelectItem value="Instalación en Proceso">Instalación en Proceso</SelectItem>
                </SelectContent>
              </Select>
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
                    <SelectItem value="Pagina Web">Pagina Web</SelectItem>
                    <SelectItem value="Instagram">Instagram</SelectItem>
                    <SelectItem value="Facebook">Facebook</SelectItem>
                    <SelectItem value="Directo">Directo</SelectItem>
                    <SelectItem value="Mensaje de Whatsapp">Mensaje de Whatsapp</SelectItem>
                    <SelectItem value="Visita">Visita</SelectItem>
                    <SelectItem value="__custom__">Otra (escribir manualmente)</SelectItem>
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
                    Volver a opciones predefinidas
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Campo condicional: Falta Instalación */}
          {formData.estado === 'Instalación en Proceso' && (
            <div>
              <Label htmlFor="falta_instalacion">¿Qué le falta a la instalación?</Label>
              <Textarea
                id="falta_instalacion"
                value={formData.falta_instalacion || ''}
                onChange={(e) => handleInputChange('falta_instalacion', e.target.value)}
                rows={2}
                className="text-gray-900 placeholder:text-gray-400"
                placeholder="Describe qué le falta para completar la instalación..."
              />
            </div>
          )}

          {/* 4. Dirección */}
          <div>
            <Label htmlFor="direccion">Dirección</Label>
            <Input
              id="direccion"
              value={formData.direccion}
              onChange={(e) => handleInputChange('direccion', e.target.value)}
              className="text-gray-900 placeholder:text-gray-400"
            />
            {errors.direccion && (
              <p className="text-sm text-red-500 mt-1">{errors.direccion}</p>
            )}
          </div>

          {/* 5. Provincia y Municipio */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="provincia_montaje">Provincia</Label>
              <Select
                value={formData.provincia_montaje}
                onValueChange={handleProvinciaChange}
                disabled={loadingProvincias}
              >
                <SelectTrigger id="provincia_montaje" className="text-gray-900">
                  <SelectValue placeholder={loadingProvincias ? 'Cargando...' : 'Seleccionar provincia'} />
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
                        ? 'Seleccione una provincia primero'
                        : loadingMunicipios
                        ? 'Cargando...'
                        : 'Seleccionar municipio'
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

          {/* 6. Ubicación en el mapa */}
          <div>
            <Label>Ubicación en el mapa</Label>
            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
              <div className="flex gap-2 flex-1">
                <Input
                  value={clientLatLng.lat}
                  readOnly
                  className="flex-1 sm:w-32 text-gray-600 bg-gray-50 text-xs sm:text-sm"
                />
                <Input
                  value={clientLatLng.lng}
                  readOnly
                  className="flex-1 sm:w-32 text-gray-600 bg-gray-50 text-xs sm:text-sm"
                />
              </div>
              <Button
                type="button"
                className="bg-purple-600 hover:bg-purple-700 text-white shrink-0"
                size="sm"
                onClick={() => setShowMapModal(true)}
              >
                <MapPin className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Seleccionar en mapa</span>
              </Button>
            </div>
          </div>

          {/* 7. Telefono y Pais */}
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
                <p className="text-sm text-blue-500 mt-1">Detectando pais...</p>
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
          <div>
            <Label htmlFor="pais_contacto">País de contacto</Label>
            <Input
              id="pais_contacto"
              value={formData.pais_contacto || ''}
              onChange={(e) => handleInputChange('pais_contacto', e.target.value)}
              className="text-gray-900 placeholder:text-gray-400"
            />
          </div>

        </div>
      </div>

      <div className="border-2 border-gray-300 rounded-lg p-6 bg-white shadow-sm">
        <div className="pb-4 mb-4 border-b-2 border-gray-200">
          <h3 className="text-xl font-bold text-gray-900">Fechas de Instalacion</h3>
          <p className="text-sm text-gray-500 mt-1">Inicio y fin de la instalacion</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="fecha_montaje">Fecha de inicio de instalación</Label>
            <Input
              id="fecha_montaje"
              type="date"
              value={convertToDateInput(formData.fecha_montaje || '')}
              onChange={(e) => handleInputChange('fecha_montaje', e.target.value)}
              className="text-gray-900"
            />
          </div>
          <div>
            <Label htmlFor="fecha_instalacion">Fecha de fin de instalación</Label>
            <Input
              id="fecha_instalacion"
              type="date"
              value={convertToDateInput(formData.fecha_instalacion || '')}
              onChange={(e) => handleInputChange('fecha_instalacion', e.target.value)}
              className="text-gray-900"
            />
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
          {/* Fila 1: Inversor y Cantidad */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <MaterialSearchSelector
                label="Inversor"
                materials={inversores}
                value={oferta.inversor_codigo}
                onChange={(value) => setOferta(prev => ({ ...prev, inversor_codigo: value }))}
                placeholder="Buscar inversor por nombre o código..."
                disabled={loadingMateriales}
                loading={loadingMateriales}
              />
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

          {/* Fila 2: Batería y Cantidad */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <MaterialSearchSelector
                label="Batería"
                materials={baterias}
                value={oferta.bateria_codigo}
                onChange={(value) => setOferta(prev => ({ ...prev, bateria_codigo: value }))}
                placeholder="Buscar batería por nombre o código..."
                disabled={loadingMateriales}
                loading={loadingMateriales}
              />
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

          {/* Fila 3: Panel y Cantidad */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <MaterialSearchSelector
                label="Panel"
                materials={paneles}
                value={oferta.panel_codigo}
                onChange={(value) => setOferta(prev => ({ ...prev, panel_codigo: value }))}
                placeholder="Buscar panel por nombre o código..."
                disabled={loadingMateriales}
                loading={loadingMateriales}
              />
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

          {/* Fila 4: Elementos Personalizados */}
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

          {/* Fila 5: Estado de la Oferta */}
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
          {/* Fila 1: Costos - Primera fila */}
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
            {/* Costo de Transporte (solo si provincia != La Habana) */}
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

          {/* Fila 2: Costo Final, Método de Pago y Moneda */}
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

          {/* Fila 3: Razón del Costo Extra */}
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
          onClick={onCancel}
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
            'Crear Cliente'
          )}
        </Button>
      </div>
    </form>

      <Dialog open={showMapModal} onOpenChange={setShowMapModal}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Seleccionar ubicación en el mapa</DialogTitle>
          </DialogHeader>
          <div className="mb-4 text-gray-700">
            Haz click en el mapa para seleccionar la ubicación. Solo se guardarán latitud y longitud.
          </div>
          <MapPicker
            initialLat={clientLatLng.lat ? parseFloat(clientLatLng.lat) : 23.1136}
            initialLng={clientLatLng.lng ? parseFloat(clientLatLng.lng) : -82.3666}
            onSelect={(lat: number, lng: number) => {
              setClientLatLng({ lat: String(lat), lng: String(lng) })
            }}
          />
          <div className="flex justify-end pt-4">
            <Button type="button" className="bg-purple-600 hover:bg-purple-700 text-white" onClick={() => setShowMapModal(false)}>
              Confirmar ubicación
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
