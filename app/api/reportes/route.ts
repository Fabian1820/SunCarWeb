import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.suncarsrl.com'
const API_URL = BACKEND_URL.endsWith('/api') ? BACKEND_URL : `${BACKEND_URL}/api`

function getAuthHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer suncar-token-2025'
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log(`🚀 Proxying GET request to: ${API_URL}/reportes`)
    
    const response = await fetch(`${API_URL}/reportes`, {
      method: 'GET',
      headers: getAuthHeaders()
    })

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
    console.log(`✅ Backend response successful`)
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log(`🚀 Proxying POST request to: ${API_URL}/reportes`, body)
    
    const response = await fetch(`${API_URL}/reportes`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(body)
    })

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
    console.log(`✅ Backend response successful`)
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