import { NextRequest, NextResponse } from 'next/server'
import {
  createStripeClient,
  listStripePaidSessions,
} from '@/lib/server/stripe-payment-links'

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const fechaDesde = searchParams.get('fecha_desde')?.trim() || ''
    const fechaHasta = searchParams.get('fecha_hasta')?.trim() || ''
    const limitRaw = searchParams.get('limit')?.trim() || ''

    if (fechaDesde && !DATE_PATTERN.test(fechaDesde)) {
      return NextResponse.json(
        {
          success: false,
          message: 'fecha_desde debe tener formato YYYY-MM-DD.',
        },
        { status: 400 }
      )
    }

    if (fechaHasta && !DATE_PATTERN.test(fechaHasta)) {
      return NextResponse.json(
        {
          success: false,
          message: 'fecha_hasta debe tener formato YYYY-MM-DD.',
        },
        { status: 400 }
      )
    }

    if (fechaDesde && fechaHasta && fechaDesde > fechaHasta) {
      return NextResponse.json(
        {
          success: false,
          message: 'fecha_desde no puede ser mayor que fecha_hasta.',
        },
        { status: 400 }
      )
    }

    const limitNumber = Number.parseInt(limitRaw || '200', 10)
    const limit = Number.isFinite(limitNumber)
      ? Math.max(1, Math.min(1000, limitNumber))
      : 200

    const stripe = createStripeClient()
    const pagos = await listStripePaidSessions(stripe, {
      fromDate: fechaDesde || undefined,
      toDate: fechaHasta || undefined,
      maxItems: limit,
    })

    const totalMonto = pagos.reduce((sum, pago) => sum + (pago.amountTotal || 0), 0)

    return NextResponse.json({
      success: true,
      message: `Se encontraron ${pagos.length} pagos.`,
      data: pagos,
      total: pagos.length,
      total_amount: Number(totalMonto.toFixed(2)),
      filters: {
        fecha_desde: fechaDesde || null,
        fecha_hasta: fechaHasta || null,
        limit,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Error al listar pagos de Stripe',
      },
      { status: 500 }
    )
  }
}
