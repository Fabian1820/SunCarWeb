import { NextRequest, NextResponse } from 'next/server'
import { startAuthorization } from '@/lib/server/enable-banking'

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

    const authResponse = await startAuthorization(redirectUrl, bankName, country)

    return NextResponse.json({
      success: true,
      url: authResponse.url,
      authorization_id: authResponse.authorization_id,
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
