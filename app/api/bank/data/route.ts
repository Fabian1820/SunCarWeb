import { NextRequest, NextResponse } from 'next/server'
import {
  getSessionDetail,
  getAccountBalances,
  getAccountTransactions,
} from '@/lib/server/enable-banking'

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('session_id')

    if (!sessionId) {
      return NextResponse.json(
        { success: false, message: 'session_id es requerido' },
        { status: 400 }
      )
    }

    // 1. Obtener cuentas de la sesión
    const session = await getSessionDetail(sessionId)

    if (session.status !== 'AUTHORIZED' || !session.accounts?.length) {
      return NextResponse.json(
        {
          success: false,
          message: `Sesión no autorizada o sin cuentas. Estado: ${session.status}`,
        },
        { status: 400 }
      )
    }

    // 2. Usar la primera cuenta
    const accountId = session.accounts[0]

    // 3. Balances y transacciones en paralelo
    const [balances, transactions] = await Promise.all([
      getAccountBalances(accountId),
      getAccountTransactions(accountId),
    ])

    // 4. Seleccionar el balance más relevante
    const balance =
      balances.find((b) => b.name === 'interimAvailable') ??
      balances.find((b) => b.name === 'closingBooked') ??
      balances[0] ??
      null

    return NextResponse.json({
      success: true,
      account_id: accountId,
      balance: balance
        ? {
            amount: balance.balance_amount.amount,
            currency: balance.balance_amount.currency,
          }
        : null,
      transactions: transactions.slice(0, 50).map((tx) => ({
        id: tx.transaction_id ?? `${tx.booking_date}-${tx.transaction_amount.amount}`,
        date: tx.booking_date ?? tx.value_date ?? '',
        amount: tx.transaction_amount.amount,
        currency: tx.transaction_amount.currency,
        description:
          tx.remittance_information_unstructured ??
          tx.creditor_name ??
          tx.debtor_name ??
          'Sin descripción',
        isCredit: parseFloat(tx.transaction_amount.amount) > 0,
      })),
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Error al obtener datos bancarios',
      },
      { status: 500 }
    )
  }
}
