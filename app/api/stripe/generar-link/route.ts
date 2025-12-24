import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const STRIPE_API_VERSION = '2024-12-18.acacia'

const STRIPE_FEE_PERCENT = 0.05

interface GenerarLinkRequest {
  precio: number
  descripcion: string
  oferta_id?: string
  cliente_id?: string
  lead_id?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerarLinkRequest = await request.json()
    const { precio, descripcion, oferta_id, cliente_id, lead_id } = body

    // Validaciones
    if (!precio || precio <= 0) {
      return NextResponse.json(
        { success: false, message: 'El precio debe ser mayor a 0' },
        { status: 400 }
      )
    }

    if (!descripcion) {
      return NextResponse.json(
        { success: false, message: 'La descripción es requerida' },
        { status: 400 }
      )
    }

    // Validar que la Secret Key esté configurada
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { success: false, message: 'Stripe no está configurado. Falta STRIPE_SECRET_KEY' },
        { status: 500 }
      )
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: STRIPE_API_VERSION,
    })

    const precioConRecargo = Math.round(precio * (1 + STRIPE_FEE_PERCENT) * 100) / 100

    // Crear Payment Link en Stripe
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Oferta Personalizada SunCar',
              description: descripcion,
            },
            unit_amount: Math.round(precioConRecargo * 100), // Convertir a centavos
          },
          quantity: 1,
        },
      ],
      metadata: {
        oferta_id: oferta_id || '',
        cliente_id: cliente_id || '',
        lead_id: lead_id || '',
        created_at: new Date().toISOString(),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Link de pago generado exitosamente',
      payment_link: paymentLink.url,
      precio_con_recargo: precioConRecargo,
    })
  } catch (error) {
    console.error('Error generando payment link:', error)

    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { success: false, message: `Error de Stripe: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    )
  }
}
