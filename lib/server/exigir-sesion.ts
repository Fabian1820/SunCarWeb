import { NextRequest, NextResponse } from 'next/server'
import { API_BASE_URL } from '@/lib/api-config'

/**
 * Exige una sesión válida de la web (cualquier trabajador logueado) antes de
 * usar credenciales del servidor (Enable Banking, Stripe). El token se valida
 * contra el backend (`/auth/validate`), igual que en el SSO de Chatwoot.
 *
 * Devuelve la respuesta de error, o null si puede seguir.
 *
 * No se usa en /api/bank/authorize: a esa la llama /bank-callback sin cabecera
 * Authorization y exigirla ahí rompería la vuelta desde el banco.
 */
export async function exigirSesion(request: NextRequest): Promise<NextResponse | null> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) {
    return NextResponse.json({ success: false, message: 'No autenticado' }, { status: 401 })
  }
  try {
    const validateRes = await fetch(`${API_BASE_URL}/auth/validate`, {
      headers: { Authorization: authHeader },
      cache: 'no-store',
    })
    if (!validateRes.ok) {
      return NextResponse.json({ success: false, message: 'Sesión inválida' }, { status: 401 })
    }
  } catch {
    return NextResponse.json(
      { success: false, message: 'No se pudo validar la sesión' },
      { status: 502 }
    )
  }
  return null
}
