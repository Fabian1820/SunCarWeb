import { NextRequest, NextResponse } from 'next/server'
import { getAuthToken, getAuthHeaders } from '../utils/auth'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.suncarsrl.com'
const API_URL = BACKEND_URL.endsWith('/api') ? BACKEND_URL : `${BACKEND_URL}/api`

// Esta es una ruta catch-all que maneja todos los endpoints que no tienen rutas específicas
export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, 'GET', params.path)
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, 'POST', params.path)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, 'PUT', params.path)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, 'DELETE', params.path)
}

async function handleRequest(
  request: NextRequest,
  method: string,
  path: string[]
) {
  try {
    const pathStr = path.join('/')
    const url = new URL(request.url)
    const queryString = url.search
    const fullPath = `/${pathStr}${queryString}`
    
    console.log(`🚀 Proxying ${method} request to: ${API_URL}${fullPath}`)
    
    const token = await getAuthToken()
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)
    
    const requestInit: RequestInit = {
      method,
      headers: getAuthHeaders(token),
      signal: controller.signal
    }
    
    // Solo agregar body si no es GET o DELETE
    if (method !== 'GET' && method !== 'DELETE') {
      try {
        const body = await request.text()
        if (body) {
          requestInit.body = body
        }
      } catch (error) {
        // Si no hay body, continuar sin él
      }
    }
    
    const response = await fetch(`${API_URL}${fullPath}`, requestInit)
    
    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ Backend error: ${response.status} ${response.statusText}`, errorText)
      return NextResponse.json({
        success: false,
        message: `Error del backend: ${response.status}`,
        details: errorText
      }, { status: response.status })
    }

    const data = await response.json()
    console.log(`✅ Backend response successful for ${pathStr}`)
    return NextResponse.json(data)

  } catch (error) {
    console.error('❌ Proxy error:', error)
    return NextResponse.json({
      success: false,
      message: `Error de conexión: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}