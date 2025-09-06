import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { usuario, contrasena } = body

    // Validar credenciales básicas (según documentación)
    if (usuario === 'admin' && contrasena === 'admin123') {
      return NextResponse.json({
        success: true,
        message: 'Login exitoso',
        token: 'suncar-token-2025'
      })
    }

    return NextResponse.json({
      success: false,
      message: 'Credenciales incorrectas',
      token: null
    }, { status: 401 })

  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Error en el servidor',
      token: null
    }, { status: 500 })
  }
}