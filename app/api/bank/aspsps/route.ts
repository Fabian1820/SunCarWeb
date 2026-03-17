import { NextRequest, NextResponse } from 'next/server'
import { getAvailableASPSPs } from '@/lib/server/enable-banking'

export async function GET(request: NextRequest) {
  try {
    const country = request.nextUrl.searchParams.get('country') || 'ES'
    const aspsps = await getAvailableASPSPs(country)

    return NextResponse.json({
      success: true,
      aspsps,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Error al obtener bancos',
      },
      { status: 500 }
    )
  }
}
