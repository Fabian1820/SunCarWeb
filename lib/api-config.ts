// Configuración de la API
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

// Headers comunes para las peticiones
export const API_HEADERS = {
  'Content-Type': 'application/json',
}

// Configuración de timeout
export const API_TIMEOUT = 10000 // 10 segundos

// Función para obtener el token del localStorage
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('suncar-token')
}

// Función para obtener headers con autenticación
function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken()
  const headers: Record<string, string> = { ...API_HEADERS }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
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