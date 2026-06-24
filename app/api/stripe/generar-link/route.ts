import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const STRIPE_API_VERSION = '2024-12-18.acacia'

const STRIPE_RATE = 0.0325
const STRIPE_FIXED = 0.30

interface GenerarLinkRequest {
  precio: number
  descripcion: string
  oferta_id?: string
  cliente_id?: string
  lead_id?: string
  solicitud_venta_id?: string
  moneda?: string
  sin_recargo?: boolean
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerarLinkRequest = await request.json()
    const { precio, descripcion, oferta_id, cliente_id, lead_id, solicitud_venta_id, moneda, sin_recargo } = body

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
        { 
          success: false, 
          message: 'Stripe no está configurado. Configura STRIPE_SECRET_KEY en tu archivo .env.local con tu clave de Stripe (sk_test_... para desarrollo o sk_live_... para producción). Obtén tu clave en: https://dashboard.stripe.com/apikeys' 
        },
        { status: 500 }
      )
    }

    // Stripe solo acepta USD y EUR, si es CUP lo convertimos a USD
    let currencyCode = (moneda || 'USD').toUpperCase()
    if (currencyCode === 'CUP') {
      console.warn('⚠️ Stripe no acepta CUP, convirtiendo a USD')
      currencyCode = 'USD'
    }
    
    if (currencyCode !== 'USD' && currencyCode !== 'EUR') {
      return NextResponse.json(
        { success: false, message: 'Moneda inválida. Stripe solo acepta USD o EUR.' },
        { status: 400 }
      )
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: STRIPE_API_VERSION,
    })

    const precioFinal = sin_recargo
      ? precio
      : Math.round(((precio + STRIPE_FIXED) / (1 - STRIPE_RATE)) * 100) / 100

    // Crear Payment Link en Stripe.
    // Se fuerza únicamente 'card', disponible y activado para USD y EUR. No se
    // incluyen link/klarna/billie porque, si no están activados en el dashboard,
    // Stripe rechaza la petición ("payment method type ... is invalid"); y dejar
    // que Stripe elija automáticamente falla con "No valid payment method types
    // for this payment link" cuando la cuenta no tiene métodos compatibles.
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price_data: {
            currency: currencyCode.toLowerCase(),
            product_data: {
              name: 'Oferta Personalizada SunCar',
              description: descripcion,
            },
            unit_amount: Math.round(precioFinal * 100), // Convertir a centavos
          },
          quantity: 1,
        },
      ],
      payment_method_types: ['card'],
      invoice_creation: {
        enabled: true,
      },
      customer_creation: 'always',
      metadata: {
        oferta_id: oferta_id || '',
        cliente_id: cliente_id || '',
        lead_id: lead_id || '',
        solicitud_venta_id: solicitud_venta_id || '',
        moneda: currencyCode,
        created_at: new Date().toISOString(),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Link de pago generado exitosamente',
      payment_link: paymentLink.url,
      payment_link_id: paymentLink.id,
      precio_con_recargo: precioFinal,
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
