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

// Cache del token para evitar múltiples requests
let cachedToken: string | null = null
let tokenExpiry: number = 0

// Función para obtener token dinámicamente del backend
async function getAuthToken(): Promise<string> {
  // Si tenemos un token cacheado y no ha expirado (5 minutos), usarlo
  if (cachedToken && Date.now() < tokenExpiry) {
    console.log('🔄 Using cached auth token')
    return cachedToken
  }

  // Intentar obtener token del localStorage primero
  if (typeof window !== 'undefined') {
    const savedToken = localStorage.getItem('suncar-token')
    if (savedToken) {
      console.log('🔐 Using token from localStorage')
      cachedToken = savedToken
      tokenExpiry = Date.now() + (5 * 60 * 1000) // Cache por 5 minutos
      return savedToken
    }
  }

  try {
    console.log('🔐 Requesting new auth token from backend...')
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.suncarsrl.com'
    const apiUrl = backendUrl.endsWith('/api') ? backendUrl : `${backendUrl}/api`
    
    const response = await fetch(`${apiUrl}/auth/login-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        usuario: 'admin',
        contrasena: 'admin123'
      })
    })

    if (!response.ok) {
      throw new Error(`Auth failed: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    if (!data.success || !data.token) {
      throw new Error(`Auth failed: ${data.message || 'Invalid response'}`)
    }

    // Cachear el token por 5 minutos
    cachedToken = data.token
    tokenExpiry = Date.now() + (5 * 60 * 1000)
    
    // Guardar en localStorage si estamos en el cliente
    if (typeof window !== 'undefined') {
      localStorage.setItem('suncar-token', data.token)
    }
    
    console.log('✅ New auth token obtained:', data.token.substring(0, 10) + '...')
    return data.token

  } catch (error) {
    console.error('❌ Failed to get auth token:', error)
    throw error
  }
}

// Función para obtener headers con autenticación
async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { ...API_HEADERS }
  
  try {
    const token = await getAuthToken()
    headers['Authorization'] = `Bearer ${token}`
    console.log('🔐 Authorization header added:', `Bearer ${token.substring(0, 10)}...`)
  } catch (error) {
    console.warn('⚠️ No auth token available, request will be sent without authorization', error)
  }
  
  return headers
}

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
    // TEMPORAL: Versión simplificada sin auth para debugging
    console.log('🔄 Skipping auth for debugging...')
    
    // Preparar headers base
    const baseHeaders: Record<string, string> = {
      'Authorization': 'Bearer suncar-token-2025', // Token hardcodeado temporalmente
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
    console.log('🔐 Authorization header:', config.headers?.['Authorization'] || 'NOT FOUND')

    const response = await fetch(url, config)
    console.log('📨 Response received:', { status: response.status, ok: response.ok, url: response.url })
    
    if (!response.ok) {
      console.error(`❌ API request failed: ${response.status} ${response.statusText}`)
      const errorData = await response.json().catch(() => ({}))
      console.error('❌ Error data:', errorData)
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