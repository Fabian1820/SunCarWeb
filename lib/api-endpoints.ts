/**
 * Endpoints centralizados de la API
 * Mantener sincronizado con la configuración del backend
 */

const API_BASE = '/api/ofertas/confeccion'

export const OFERTAS_CONFECCION_ENDPOINTS = {
  // Listar clientes con ofertas
  CLIENTES_CON_OFERTAS: `${API_BASE}/clientes-con-ofertas`,
  
  // Obtener todas las ofertas de un cliente
  OFERTAS_CLIENTE: (numero: string) => `${API_BASE}/cliente/${numero}`,
  
  // Listar leads con ofertas
  LEADS_CON_OFERTAS: `${API_BASE}/leads-con-ofertas`,
  
  // Obtener todas las ofertas de un lead
  OFERTAS_LEAD: (leadId: string) => `${API_BASE}/lead/${leadId}`,
  
  // Crear oferta
  CREAR: API_BASE,
  
  // Obtener oferta por ID
  OBTENER: (id: string) => `${API_BASE}/${id}`,
  
  // Actualizar oferta
  ACTUALIZAR: (id: string) => `${API_BASE}/${id}`,
  
  // Eliminar oferta
  ELIMINAR: (id: string) => `${API_BASE}/${id}`,
  
  // Ofertas genéricas aprobadas
  GENERICAS_APROBADAS: `${API_BASE}/genericas/aprobadas`,
  
  // Asignar oferta a cliente
  ASIGNAR_A_CLIENTE: `${API_BASE}/asignar-a-cliente`,
  
  // Asignar oferta a lead
  ASIGNAR_A_LEAD: `${API_BASE}/asignar-a-lead`,
}

/**
 * Construir URL completa del endpoint
 */
export function buildApiUrl(endpoint: string): string {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.suncarsrl.com'
  const apiUrl = backendUrl.endsWith('/api') ? backendUrl : `${backendUrl}/api`
  
  // Si el endpoint ya incluye /api, no duplicarlo
  if (endpoint.startsWith('/api/')) {
    return `${backendUrl.replace(/\/api$/, '')}${endpoint}`
  }
  
  return `${apiUrl}${endpoint}`
}

/**
 * Obtener token de autenticación
 */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  
  return (
    localStorage.getItem('auth_token') ||
    localStorage.getItem('access_token') ||
    localStorage.getItem('token')
  )
}

/**
 * Headers comunes para requests
 */
export function getCommonHeaders(): HeadersInit {
  const token = getAuthToken()
  
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}
