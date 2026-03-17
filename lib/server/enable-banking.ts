import crypto from 'crypto'

const ENABLE_BANKING_BASE_URL = 'https://api.enablebanking.com'

function createJWT(): string {
  const appId = process.env.ENABLE_BANKING_APP_ID
  const rawKey = process.env.ENABLE_BANKING_PRIVATE_KEY

  if (!appId || !rawKey) {
    throw new Error('ENABLE_BANKING_APP_ID y ENABLE_BANKING_PRIVATE_KEY son requeridos')
  }

  // Soporta clave con \n literales (como se guarda en .env)
  let privateKeyPem = rawKey.replace(/\\n/g, '\n')

  // Asegurar que la clave tenga el formato correcto con saltos de línea
  if (!privateKeyPem.includes('\n')) {
    // Si no tiene saltos de línea, intentar formatearla
    privateKeyPem = privateKeyPem
      .replace('-----BEGIN PRIVATE KEY-----', '-----BEGIN PRIVATE KEY-----\n')
      .replace('-----END PRIVATE KEY-----', '\n-----END PRIVATE KEY-----')
      .replace('-----BEGIN RSA PRIVATE KEY-----', '-----BEGIN RSA PRIVATE KEY-----\n')
      .replace('-----END RSA PRIVATE KEY-----', '\n-----END RSA PRIVATE KEY-----')
  }

  const header = Buffer.from(JSON.stringify({ 
    typ: 'JWT',
    alg: 'RS256', 
    kid: appId 
  })).toString('base64url')
  
  const now = Math.floor(Date.now() / 1000)
  const payload = Buffer.from(
    JSON.stringify({ 
      iss: 'enablebanking.com',
      aud: 'api.enablebanking.com',
      iat: now, 
      exp: now + 3600 
    })
  ).toString('base64url')

  const signingInput = `${header}.${payload}`
  const sign = crypto.createSign('RSA-SHA256')
  sign.update(signingInput)
  const signature = sign.sign(privateKeyPem, 'base64url')

  return `${signingInput}.${signature}`
}

async function ebRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = createJWT()
  const response = await fetch(`${ENABLE_BANKING_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Enable Banking ${response.status}: ${text}`)
  }

  return response.json() as Promise<T>
}

// ────────────────────────────────────────────────────────────
// Tipos
// ────────────────────────────────────────────────────────────

export interface EBSession {
  session_id: string
  url: string
}

export interface EBSessionDetail {
  session_id: string
  status: string
  accounts: string[]
}

export interface EBBalance {
  name: string
  balance_amount: { amount: string; currency: string }
}

export interface EBTransaction {
  transaction_id?: string
  booking_date?: string
  value_date?: string
  transaction_amount: { amount: string; currency: string }
  remittance_information_unstructured?: string
  creditor_name?: string
  debtor_name?: string
}

// ────────────────────────────────────────────────────────────
// Funciones públicas
// ────────────────────────────────────────────────────────────

export async function createBankSession(
  redirectUrl: string,
  bankName: string,
  country: string
): Promise<EBSession> {
  const validUntil = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
  return ebRequest<EBSession>('/sessions', {
    method: 'POST',
    body: JSON.stringify({
      access: { valid_until: validUntil },
      aspsp: { name: bankName, country },
      redirect_url: redirectUrl,
      psu_type: 'personal',
    }),
  })
}

export async function getSessionDetail(sessionId: string): Promise<EBSessionDetail> {
  return ebRequest<EBSessionDetail>(`/sessions/${sessionId}`)
}

export async function getAccountBalances(accountId: string): Promise<EBBalance[]> {
  const data = await ebRequest<{ balances: EBBalance[] }>(`/accounts/${accountId}/balances`)
  return data.balances ?? []
}

export async function getAccountTransactions(
  accountId: string,
  dateFrom?: string
): Promise<EBTransaction[]> {
  const query = dateFrom ? `?date_from=${dateFrom}` : ''
  const data = await ebRequest<{ transactions: EBTransaction[] }>(
    `/accounts/${accountId}/transactions${query}`
  )
  return data.transactions ?? []
}
