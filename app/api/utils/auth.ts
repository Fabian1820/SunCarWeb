const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.suncarsrl.com'
const API_URL = BACKEND_URL.endsWith('/api') ? BACKEND_URL : `${BACKEND_URL}/api`

// Cache del token para evitar múltiples requests
let cachedToken: string | null = null
let tokenExpiry: number = 0

export async function getAuthToken(): Promise<string> {
  // Si tenemos un token cacheado y no ha expirado (5 minutos), usarlo
  if (cachedToken && Date.now() < tokenExpiry) {
    console.log('🔄 Using cached auth token')
    return cachedToken
  }

  try {
    console.log('🔐 Requesting new auth token from backend...')
    
    // Crear AbortController para timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 segundos timeout
    
    const response = await fetch(`${API_URL}/auth/login-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        usuario: 'admin',
        contrasena: 'admin123'
      }),
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)

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
    
    console.log('✅ New auth token obtained:', data.token.substring(0, 10) + '...')
    return data.token

  } catch (error) {
    console.error('❌ Failed to get auth token:', error)
    throw error
  }
}

export function getAuthHeaders(token: string): Record<string, string> {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }
  
  console.log('🔧 Auth headers being sent:', {
    'Content-Type': headers['Content-Type'],
    'Authorization': headers['Authorization'].substring(0, 20) + '...'
  })
  
  return headers
}