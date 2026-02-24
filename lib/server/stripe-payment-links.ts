import Stripe from 'stripe'

export const STRIPE_API_VERSION: Stripe.LatestApiVersion = '2024-12-18.acacia'

const normalizeUrl = (value: string) => value.trim().replace(/\/$/, '')

export function createStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY

  if (!secretKey) {
    throw new Error(
      'Stripe no está configurado. Configura STRIPE_SECRET_KEY en tu archivo .env.local.'
    )
  }

  return new Stripe(secretKey, {
    apiVersion: STRIPE_API_VERSION,
  })
}

async function findPaymentLinkByUrl(stripe: Stripe, paymentLinkUrl: string) {
  const target = normalizeUrl(paymentLinkUrl)
  let startingAfter: string | undefined

  // Recorremos varias páginas para soportar links antiguos sin webhook.
  for (let page = 0; page < 30; page += 1) {
    const list = await stripe.paymentLinks.list({
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    })

    const match = list.data.find((link) => normalizeUrl(link.url) === target)
    if (match) {
      return match
    }

    if (!list.has_more || list.data.length === 0) {
      return null
    }

    startingAfter = list.data[list.data.length - 1].id
  }

  return null
}

export async function resolvePaymentLink(
  stripe: Stripe,
  paymentLinkInput: string
): Promise<Stripe.PaymentLink> {
  const input = paymentLinkInput.trim()

  if (!input) {
    throw new Error('Debes proporcionar un link de pago o un ID plink_.')
  }

  if (input.startsWith('plink_')) {
    return stripe.paymentLinks.retrieve(input)
  }

  const foundByUrl = await findPaymentLinkByUrl(stripe, input)
  if (foundByUrl) {
    return foundByUrl
  }

  throw new Error(
    'No se pudo identificar el Payment Link. Usa el ID (plink_...) o la URL exacta generada por Stripe.'
  )
}

const getExpandedPaymentIntent = (
  session: Stripe.Checkout.Session
): Stripe.PaymentIntent | null => {
  const paymentIntent = session.payment_intent
  if (!paymentIntent || typeof paymentIntent === 'string') return null
  return paymentIntent
}

const getExpandedInvoice = (
  session: Stripe.Checkout.Session
): Stripe.Invoice | null => {
  const invoice = session.invoice
  if (!invoice || typeof invoice === 'string') return null
  return invoice
}

const getReceiptUrl = (session: Stripe.Checkout.Session): string | null => {
  const paymentIntent = getExpandedPaymentIntent(session)
  const latestCharge = paymentIntent?.latest_charge

  if (!latestCharge || typeof latestCharge === 'string') return null

  return latestCharge.receipt_url || null
}

const getExpandedBalanceTransaction = (
  session: Stripe.Checkout.Session
): Stripe.BalanceTransaction | null => {
  const paymentIntent = getExpandedPaymentIntent(session)
  const latestCharge = paymentIntent?.latest_charge

  if (!latestCharge || typeof latestCharge === 'string') return null

  const balanceTransaction = latestCharge.balance_transaction
  if (!balanceTransaction || typeof balanceTransaction === 'string') return null

  return balanceTransaction
}

export interface PaymentLinkStatusSummary {
  paymentLinkId: string
  paymentLinkUrl: string
  isPaid: boolean
  totalSessions: number
  paidSessionsCount: number
  latestPaidSessionId: string | null
  latestPaidAt: string | null
  amountPaid: number | null
  currency: string | null
  customerEmail: string | null
  receiptUrl: string | null
  invoiceUrl: string | null
  invoicePdf: string | null
  invoiceNumber: string | null
}

export interface StripePaidSessionItem {
  sessionId: string
  createdAt: string
  amountTotal: number
  feeAmount: number | null
  netAmount: number | null
  currency: string
  customerName: string | null
  customerEmail: string | null
  customerPhone: string | null
  paymentStatus: string
  checkoutStatus: string | null
  paymentMethodTypes: string[]
  paymentLinkId: string | null
  paymentLinkUrl: string | null
  invoiceUrl: string | null
  invoicePdf: string | null
  invoiceNumber: string | null
  receiptUrl: string | null
}

interface ListStripePaidSessionsOptions {
  fromDate?: string
  toDate?: string
  maxItems?: number
}

const parseDateToUnix = (value: string, endOfDay: boolean): number | null => {
  const normalized = value.trim()
  if (!normalized) return null

  const date = new Date(
    endOfDay ? `${normalized}T23:59:59.999` : `${normalized}T00:00:00.000`
  )

  if (Number.isNaN(date.getTime())) return null
  return Math.floor(date.getTime() / 1000)
}

export async function listStripePaidSessions(
  stripe: Stripe,
  options: ListStripePaidSessionsOptions = {}
): Promise<StripePaidSessionItem[]> {
  const { fromDate, toDate, maxItems = 1000 } = options

  const createdRange: Stripe.RangeQueryParam = {}
  const fromUnix = fromDate ? parseDateToUnix(fromDate, false) : null
  const toUnix = toDate ? parseDateToUnix(toDate, true) : null

  if (typeof fromUnix === 'number') createdRange.gte = fromUnix
  if (typeof toUnix === 'number') createdRange.lte = toUnix

  const hasRange = Object.keys(createdRange).length > 0
  const sessions: Stripe.Checkout.Session[] = []
  let startingAfter: string | undefined

  // Recorremos varias páginas para emular el listado completo estilo Stripe.
  for (let page = 0; page < 30 && sessions.length < maxItems; page += 1) {
    const response = await stripe.checkout.sessions.list({
      limit: 100,
      ...(hasRange ? { created: createdRange } : {}),
      ...(startingAfter ? { starting_after: startingAfter } : {}),
      expand: [
        'data.payment_link',
        'data.payment_intent.latest_charge',
        'data.payment_intent.latest_charge.balance_transaction',
        'data.invoice',
      ],
    })

    if (response.data.length === 0) break
    sessions.push(...response.data)

    if (!response.has_more) break
    startingAfter = response.data[response.data.length - 1].id
  }

  const paidSessions = sessions
    .filter((session) => session.payment_status === 'paid')
    .sort((a, b) => b.created - a.created)
    .slice(0, maxItems)

  return paidSessions.map((session) => {
    const invoice = getExpandedInvoice(session)
    const balanceTransaction = getExpandedBalanceTransaction(session)
    const paymentLink = session.payment_link
    const paymentLinkId =
      typeof paymentLink === 'string'
        ? paymentLink
        : paymentLink && typeof paymentLink.id === 'string'
          ? paymentLink.id
          : null
    const paymentLinkUrl =
      paymentLink &&
      typeof paymentLink !== 'string' &&
      typeof paymentLink.url === 'string'
        ? paymentLink.url
        : null

    return {
      sessionId: session.id,
      createdAt: new Date(session.created * 1000).toISOString(),
      amountTotal:
        typeof session.amount_total === 'number' ? session.amount_total / 100 : 0,
      feeAmount:
        balanceTransaction && typeof balanceTransaction.fee === 'number'
          ? balanceTransaction.fee / 100
          : null,
      netAmount:
        balanceTransaction && typeof balanceTransaction.net === 'number'
          ? balanceTransaction.net / 100
          : null,
      currency: session.currency?.toUpperCase() || 'USD',
      customerName: session.customer_details?.name || null,
      customerEmail: session.customer_details?.email || null,
      customerPhone: session.customer_details?.phone || null,
      paymentStatus: session.payment_status || 'unpaid',
      checkoutStatus: session.status || null,
      paymentMethodTypes: Array.isArray(session.payment_method_types)
        ? session.payment_method_types
        : [],
      paymentLinkId,
      paymentLinkUrl,
      invoiceUrl: invoice?.hosted_invoice_url || null,
      invoicePdf: invoice?.invoice_pdf || null,
      invoiceNumber: invoice?.number || null,
      receiptUrl: getReceiptUrl(session),
    }
  })
}

export async function getPaymentLinkStatusSummary(
  stripe: Stripe,
  paymentLink: Stripe.PaymentLink
): Promise<PaymentLinkStatusSummary> {
  const sessions: Stripe.Checkout.Session[] = []
  let startingAfter: string | undefined

  // Recorremos varias páginas para no depender de solo los 100 más recientes.
  for (let page = 0; page < 30; page += 1) {
    const response = await stripe.checkout.sessions.list({
      payment_link: paymentLink.id,
      limit: 100,
      expand: ['data.payment_intent.latest_charge', 'data.invoice'],
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    })

    if (response.data.length === 0) break
    sessions.push(...response.data)

    if (!response.has_more) break
    startingAfter = response.data[response.data.length - 1].id
  }

  const orderedSessions = [...sessions].sort((a, b) => b.created - a.created)
  const paidSessions = orderedSessions.filter((session) => session.payment_status === 'paid')
  const latestPaid = paidSessions[0] || null

  const invoice = latestPaid ? getExpandedInvoice(latestPaid) : null

  return {
    paymentLinkId: paymentLink.id,
    paymentLinkUrl: paymentLink.url,
    isPaid: paidSessions.length > 0,
    totalSessions: orderedSessions.length,
    paidSessionsCount: paidSessions.length,
    latestPaidSessionId: latestPaid?.id || null,
    latestPaidAt: latestPaid
      ? new Date(latestPaid.created * 1000).toISOString()
      : null,
    amountPaid:
      latestPaid && typeof latestPaid.amount_total === 'number'
        ? latestPaid.amount_total / 100
        : null,
    currency: latestPaid?.currency?.toUpperCase() || null,
    customerEmail: latestPaid?.customer_details?.email || null,
    receiptUrl: latestPaid ? getReceiptUrl(latestPaid) : null,
    invoiceUrl: invoice?.hosted_invoice_url || null,
    invoicePdf: invoice?.invoice_pdf || null,
    invoiceNumber: invoice?.number || null,
  }
}
