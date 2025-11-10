// Configuración de la API
// Función para obtener la URL de la API directamente del backend
function getApiBaseUrl(): string {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.suncarsrl.com'
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

    const config: RequestInit = {
      headers: {
        ...baseHeaders,
        ...(requestOptions.headers || {}),
      },
      ...requestOptions,
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

    if (!response.ok) {
      console.error(`❌ API request failed: ${response.status} ${response.statusText}`)
      const errorData = await response.json().catch(() => ({}))
      console.error('❌ Error data:', errorData)

      // Detectar token expirado o inválido (401)
      if (response.status === 401) {
        const errorMessage = errorData.detail || errorData.message || ''

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
            // Usamos un pequeño delay para que el usuario vea el mensaje de error
            setTimeout(() => {
              window.location.reload()
            }, 500)
          }
        }
      }

      throw new Error(errorData.detail || errorData.message || `HTTP error! status: ${response.status}`)
    }

    if (responseType === 'blob') {
      const blob = await response.blob()
      console.log('📄 API Response blob size:', blob.size)
      return blob as unknown as T
    }

    const data = await response.json()
    console.log('✅ API Response data:', data)
    return data
  } catch (error) {
    console.error('💥 API Request Error Details:', {
      error: error,
      message: error instanceof Error ? error.message : 'Unknown error',
      url,
      endpoint,
      stack: error instanceof Error ? error.stack : undefined
    })
    throw error
  }
} 