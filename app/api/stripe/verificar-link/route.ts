import { NextRequest, NextResponse } from 'next/server'
import { exigirSesion } from '@/lib/server/exigir-sesion'
import {
  createStripeClient,
  getPaymentLinkStatusSummary,
  resolvePaymentLink,
} from '@/lib/server/stripe-payment-links'

interface VerificarLinkRequest {
  payment_link: string
}

export async function POST(request: NextRequest) {
  // Usa la clave secreta de Stripe: nunca sin una sesión del panel.
  const denegado = await exigirSesion(request)
  if (denegado) return denegado

  try {
    const body: VerificarLinkRequest = await request.json()
    const paymentLinkInput = body?.payment_link || ''

    if (!paymentLinkInput.trim()) {
      return NextResponse.json(
        { success: false, message: 'Debes proporcionar un link de pago.' },
        { status: 400 }
      )
    }

    const stripe = createStripeClient()
    const paymentLink = await resolvePaymentLink(stripe, paymentLinkInput)
    const summary = await getPaymentLinkStatusSummary(stripe, paymentLink)

    return NextResponse.json({
      success: true,
      message: summary.isPaid
        ? 'El link tiene al menos un pago completado.'
        : 'El link aún no tiene pagos completados.',
      data: summary,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Error al verificar el link de pago',
      },
      { status: 500 }
    )
  }
}
