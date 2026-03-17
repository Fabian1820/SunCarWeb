import { NextRequest, NextResponse } from 'next/server'
import { authorizeSession } from '@/lib/server/enable-banking'

export async function POST(request: NextRequest) {
  try {
    const { code } = (await request.json()) as { code: string }

    if (!code) {
      return NextResponse.json(
        { success: false, message: 'code es requerido' },
        { status: 400 }
      )
    }

    const session = await authorizeSession(code)

    return NextResponse.json({
      success: true,
      session_id: session.session_id,
      accounts: session.accounts,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Error al autorizar sesión',
      },
      { status: 500 }
    )
  }
}
