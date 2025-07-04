// Configuración de la API
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

// Headers comunes para las peticiones
export const API_HEADERS = {
  'Content-Type': 'application/json',
}

// Configuración de timeout
export const API_TIMEOUT = 10000 // 10 segundos

// Función helper para hacer peticiones HTTP
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`
  
  const config: RequestInit = {
    headers: {
      ...API_HEADERS,
      ...options.headers,
    },
    ...options,
  }

  try {
    const response = await fetch(url, config)
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error('API Request Error:', error)
    throw error
  }
} 