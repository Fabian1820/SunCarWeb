// Configuración de la API
// Función para obtener la URL de la API directamente del backend
function getApiBaseUrl(): string {
  const backendUrlEnv = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.suncarsrl.com'
  // Solo forzar https en producción (cuando no es localhost)
  const isLocalhost = backendUrlEnv.includes('localhost') || backendUrlEnv.includes('127.0.0.1')
  const backendUrl = isLocalhost 
    ? backendUrlEnv.replace(/\/+$/, '')
    : backendUrlEnv.replace(/^http:\/\//i, 'https://').replace(/\/+$/, '')
  const apiUrl = backendUrl.endsWith('/api') ? backendUrl : `${backendUrl}/api`
  
  console.log('✅ Using direct backend URL:', apiUrl)
  console.log('🔧 Backend base URL:', backendUrl)
  
  return apiUrl
}

// Exportar la URL base
export const API_BASE_URL = getApiBaseUrl()

// Log inicial para verificar configuración
console.log('🔧 API Configuration loaded:', {
  API_BASE_URL,
  timestamp: new Date().toISOString()
})

// Headers comunes para las peticiones
export const API_HEADERS = {
  'Content-Type': 'application/json',
}

// Configuración de timeout
export const API_TIMEOUT = 10000 // 10 segundos

// Las funciones de autenticación se manejan directamente en apiRequest()
// usando el token guardado en localStorage por el AuthContext

// Función helper para hacer peticiones HTTP con autenticación automática
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit & { responseType?: 'json' | 'blob' } = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`
  const { responseType = 'json', ...requestOptions } = options

  console.log('🚀 Starting API request:', { endpoint, url, API_BASE_URL })
  console.log('🌍 Environment check:', {
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
    NODE_ENV: process.env.NODE_ENV,
    isBrowser: typeof window !== 'undefined'
  })

  try {
    // Obtener token de autenticación del localStorage
    let authToken = ''
    if (typeof window !== 'undefined') {
      authToken = localStorage.getItem('auth_token') || ''
      if (authToken) {
        console.log('🔐 Using auth token from localStorage:', authToken.substring(0, 20) + '...')
      } else {
        console.warn('⚠️ No auth token found in localStorage')
      }
    }

    // Preparar headers base
    const baseHeaders: Record<string, string> = {}

    // Agregar token de autorización si existe
    if (authToken) {
      baseHeaders['Authorization'] = `Bearer ${authToken}`
    }

    // Solo agregar Content-Type si no es FormData
    if (!(requestOptions.body instanceof FormData)) {
      baseHeaders['Content-Type'] = 'application/json'
    }

    // Extraer headers de requestOptions para hacer merge correcto
    const { headers: requestHeaders, ...restOptions } = requestOptions

    const config: RequestInit = {
      ...restOptions,
      headers: {
        ...baseHeaders,
        ...(requestHeaders || {}),
      },
    }


    const method = (config.method || 'GET').toUpperCase()
    const isLeadsCreateEndpoint = endpoint === '/leads/' || endpoint === '/leads'
    if (isLeadsCreateEndpoint && method === 'POST' && typeof config.body === 'string') {
      try {
        const payload = JSON.parse(config.body) as {
          nombre?: string
          telefono?: string
          estado?: string
          fuente?: string
          direccion?: string
        }

        const nombre = payload.nombre?.trim().toLowerCase()
        const telefono = payload.telefono?.trim()
        const estado = payload.estado?.trim().toLowerCase()
        const fuente = payload.fuente?.trim().toLowerCase()
        const direccion = payload.direccion?.trim().toLowerCase()

        const isPlaceholderLead =
          nombre === 'cliente temporal' &&
          telefono === '+00000000000' &&
          estado === 'nuevo' &&
          fuente === 'sistema' &&
          direccion === 'temporal'

        if (isPlaceholderLead) {
          throw new Error(
            'Se bloqueó un lead temporal de marcador de posición. Completa nombre, teléfono y dirección reales.'
          )
        }
      } catch (parseOrValidationError) {
        if (
          parseOrValidationError instanceof Error &&
          parseOrValidationError.message.includes('bloqueó un lead temporal')
        ) {
          console.error('⛔ Payload bloqueado para POST /leads/:', parseOrValidationError.message)
          throw parseOrValidationError
        }
      }
    }
    console.log(`📡 Making API request to: ${url}`)
    console.log('📋 Request config:', {
      method: config.method || 'GET',
      headers: config.headers,
      body: config.body ? 'Present' : 'None',
      responseType
    })
    console.log('🔐 Authorization header:', config.headers?.['Authorization'] ? 'Present' : 'NOT FOUND')

    const response = await fetch(url, config)
    console.log('📨 Response received:', { status: response.status, ok: response.ok, url: response.url })

    // Intentar parsear la respuesta como JSON siempre, incluso si hay error HTTP
    let data: any
    try {
      if (responseType === 'blob') {
        const blob = await response.blob()
        console.log('📄 API Response blob size:', blob.size)
        
        // Si hay error HTTP con blob, intentar leer como texto para ver si es JSON
        if (!response.ok) {
          const text = await blob.text()
          try {
            const jsonData = JSON.parse(text)
            // Devolver el error para que el servicio lo maneje
            if (jsonData.success === false || jsonData.detail || jsonData.error) {
              console.log('📦 Returning error response from blob')
              return jsonData as T
            }
          } catch {
            // No es JSON, lanzar error
            throw new Error(`HTTP error! status: ${response.status}`)
          }
        }
        
        return blob as unknown as T
      }
      
      data = await response.json()
      console.log('📦 Response data:', data)
    } catch (parseError) {
      console.error('❌ Could not parse response as JSON')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      throw parseError
    }

    // Si la respuesta tiene estructura de error del backend
    // Devolverla tal cual para que el servicio la maneje
    // Soporta tanto el formato nuevo (success: false) como el antiguo (detail)
    if (data.success === false || (data.detail && !response.ok) || data.error) {
      console.log('📦 Returning error response to service for handling')
      return data as T
    }

    // Si el HTTP status no es OK pero no tenemos estructura de error, lanzar excepción
    if (!response.ok) {
      console.error(`❌ API request failed: ${response.status} ${response.statusText}`)
      console.error('❌ Error data:', data)

      // Detectar token expirado o inválido (401)
      if (response.status === 401) {
        const errorMessage = data.detail || data.message || ''

        // Si el token está expirado o inválido, cerrar sesión automáticamente
        if (errorMessage.toLowerCase().includes('token') &&
            (errorMessage.toLowerCase().includes('expirado') ||
             errorMessage.toLowerCase().includes('inválido') ||
             errorMessage.toLowerCase().includes('invalido'))) {
          console.warn('🔐 Token expirado o inválido - cerrando sesión automáticamente')

          // Limpiar localStorage
          if (typeof window !== 'undefined') {
            localStorage.removeItem('auth_token')
            localStorage.removeItem('user_data')

            // Recargar la página para mostrar el login
            setTimeout(() => {
              window.location.reload()
            }, 500)
          }
        }
      }

      // Para errores 400 (Bad Request), devolver la respuesta como error estructurado
      // en lugar de lanzar excepción para evitar el overlay de Next.js
      if (response.status === 400) {
        console.log('📦 Returning 400 error as structured response')
        return {
          success: false,
          error: {
            code: 'BAD_REQUEST',
            title: 'Error de Validación',
            message: data.detail || data.message || 'Error en la solicitud',
          }
        } as T
      }

      throw new Error(data.detail || data.message || `HTTP error! status: ${response.status}`)
    }

    return data
  } catch (error) {
    console.error('💥 API Request Error:', error)
    console.error('💥 API Request Error Details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      name: error instanceof Error ? error.name : 'Unknown',
      url,
      endpoint,
      stack: error instanceof Error ? error.stack : undefined,
      errorType: typeof error,
      errorString: String(error)
    })
    throw error
  }
} 
