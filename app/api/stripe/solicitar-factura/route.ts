import { NextRequest, NextResponse } from 'next/server'
import {
  createStripeClient,
  getPaymentLinkStatusSummary,
  resolvePaymentLink,
} from '@/lib/server/stripe-payment-links'

interface SolicitarFacturaRequest {
  payment_link: string
}

export async function POST(request: NextRequest) {
  try {
    const body: SolicitarFacturaRequest = await request.json()
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

    if (!summary.isPaid) {
      return NextResponse.json(
        {
          success: false,
          message: 'Este link todavía no tiene pagos completados.',
        },
        { status: 400 }
      )
    }

    const facturaUrl = summary.invoiceUrl || summary.invoicePdf

    if (!facturaUrl) {
      return NextResponse.json(
        {
          success: false,
          message:
            'El pago está completado, pero Stripe no devolvió factura para este cobro. Revisa el comprobante (receipt) o habilita factura en links nuevos.',
          data: {
            receipt_url: summary.receiptUrl,
          },
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Factura encontrada.',
      data: {
        factura_url: facturaUrl,
        invoice_number: summary.invoiceNumber,
        receipt_url: summary.receiptUrl,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Error al solicitar factura',
      },
      { status: 500 }
    )
  }
}
