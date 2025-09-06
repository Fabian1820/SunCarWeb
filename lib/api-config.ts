// Configuración de la API
// Función para procesar la URL del backend
function processBackendUrl(url: string): string {
  // Si la URL no termina en /api, la agregamos
  if (!url.endsWith('/api')) {
    return url + '/api'
  }
  return url
}
// Función para obtener la URL de la API de forma robusta
function getApiBaseUrl(): string {
  // Detectar entorno
  const isProduction = process.env.NODE_ENV === 'production'
  const isBrowser = typeof window !== 'undefined'
  
  // Log para debugging
  console.log('Environment detection:', {
    NODE_ENV: process.env.NODE_ENV,
    isProduction,
    isBrowser,
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL
  })
  
  // Prioridad: 1. Variable de entorno, 2. Localhost por defecto
  const envUrl = process.env.NEXT_PUBLIC_BACKEND_URL
  
  if (envUrl) {
    const processedUrl = processBackendUrl(envUrl)
    console.log('✅ Using API URL from environment:', processedUrl)
    return processedUrl
  }
  
  // Fallback para desarrollo local
  const defaultUrl = 'http://localhost:8000/api'
  console.warn('⚠️ Using default API URL (no environment variable found):', defaultUrl)
  return defaultUrl
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

// Función para obtener el token del localStorage
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  const token = localStorage.getItem('suncar-token')
  console.log('🔐 Auth token retrieved:', token ? 'Present' : 'Not found')
  return token
}

// Función para obtener headers con autenticación
function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken()
  const headers: Record<string, string> = { ...API_HEADERS }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
    console.log('🔐 Authorization header added:', `Bearer ${token.substring(0, 10)}...`)
  } else {
    console.warn('⚠️ No auth token found, request will be sent without authorization')
  }
  
  return headers
}

// Función helper para hacer peticiones HTTP con autenticación automática
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`
  
  const config: RequestInit = {
    headers: {
      ...getAuthHeaders(),
      ...options.headers,
    },
    ...options,
  }

  try {
    console.log(`Making API request to: ${url}`)
    console.log('Request config:', { 
      method: config.method || 'GET',
      headers: config.headers,
      body: config.body ? 'Present' : 'None'
    })

    const response = await fetch(url, config)
    
    if (!response.ok) {
      console.error(`API request failed: ${response.status} ${response.statusText}`)
      const errorData = await response.json().catch(() => ({}))
      console.error('Error data:', errorData)
      throw new Error(errorData.detail || errorData.message || `HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    console.log('API Response data:', data)
    return data
  } catch (error) {
    console.error('API Request Error:', error)
    throw error
  }
} 