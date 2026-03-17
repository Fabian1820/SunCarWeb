import { NextRequest, NextResponse } from 'next/server'
import { createBankSession } from '@/lib/server/enable-banking'

export async function POST(request: NextRequest) {
  try {
    const { bankName, country, redirectUrl } = (await request.json()) as {
      bankName: string
      country: string
      redirectUrl: string
    }

    if (!bankName || !country || !redirectUrl) {
      return NextResponse.json(
        { success: false, message: 'bankName, country y redirectUrl son requeridos' },
        { status: 400 }
      )
    }

    const session = await createBankSession(redirectUrl, bankName, country)

    return NextResponse.json({
      success: true,
      url: session.url,
      session_id: session.session_id,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Error al conectar con banco',
      },
      { status: 500 }
    )
  }
}
