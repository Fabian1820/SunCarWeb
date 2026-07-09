import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { API_BASE_URL } from '@/lib/api-config'

const CHATWOOT_MODULE_KEY = 'suncar-whatsapp'
const CHATWOOT_ADMIN_SUBPERMISO = 'suncar-whatsapp/admin'

// Cumple la regla de complejidad de Chatwoot (mayúscula, minúscula, número,
// carácter especial, 6+). Nunca se reutiliza: el login real es vía SSO link.
function randomPassword(): string {
  return `Aa1!${randomUUID().replace(/-/g, '')}`
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ success: false, message: 'No autenticado' }, { status: 401 })
    }

    const { ci, nombre, foto_perfil: fotoPerfil } = await request.json()
    if (!ci || !nombre) {
      return NextResponse.json(
        { success: false, message: 'Faltan datos del usuario' },
        { status: 400 }
      )
    }

    // Verifica el token reenviándolo al mismo endpoint que ya usa el cliente
    // para leer permisos — si el token no es válido para ese ci, esto falla.
    const permisosRes = await fetch(
      `${API_BASE_URL}/permisos/trabajador/${encodeURIComponent(ci)}/modulos-nombres`,
      { headers: { Authorization: authHeader } }
    )
    if (!permisosRes.ok) {
      return NextResponse.json({ success: false, message: 'Sesión inválida' }, { status: 401 })
    }
    const permisosData = await permisosRes.json()
    const modulosPermitidos: string[] = permisosData.data ?? []
    if (!modulosPermitidos.includes(CHATWOOT_MODULE_KEY)) {
      return NextResponse.json(
        { success: false, message: 'No tienes permiso para este módulo' },
        { status: 403 }
      )
    }
    // Rol en Chatwoot según el sub-permiso aditivo, igual que
    // "almacenes-suncar/admin": el permiso base entra como agente, el
    // sub-permiso aditivo entra como administrador.
    const chatwootRole = modulosPermitidos.includes(CHATWOOT_ADMIN_SUBPERMISO)
      ? 'administrator'
      : 'agent'

    const CHATWOOT_BASE_URL = process.env.CHATWOOT_BASE_URL
    const CHATWOOT_PLATFORM_API_TOKEN = process.env.CHATWOOT_PLATFORM_API_TOKEN
    const CHATWOOT_ACCOUNT_ID = process.env.CHATWOOT_ACCOUNT_ID
    const CHATWOOT_ADMIN_ACCESS_TOKEN = process.env.CHATWOOT_ADMIN_ACCESS_TOKEN
    if (
      !CHATWOOT_BASE_URL ||
      !CHATWOOT_PLATFORM_API_TOKEN ||
      !CHATWOOT_ACCOUNT_ID ||
      !CHATWOOT_ADMIN_ACCESS_TOKEN
    ) {
      return NextResponse.json(
        { success: false, message: 'Chatwoot no está configurado (faltan variables de entorno)' },
        { status: 500 }
      )
    }

    const chatwootHeaders = {
      api_access_token: CHATWOOT_PLATFORM_API_TOKEN,
      'Content-Type': 'application/json',
    }
    const email = `${ci}@suncar.internal`

    const userRes = await fetch(`${CHATWOOT_BASE_URL}/platform/api/v1/users`, {
      method: 'POST',
      headers: chatwootHeaders,
      body: JSON.stringify({
        name: nombre,
        email,
        password: randomPassword(),
        ...(fotoPerfil ? { avatar_url: fotoPerfil } : {}),
      }),
    })
    if (!userRes.ok) {
      console.error('Chatwoot platform user create failed:', await userRes.text())
      return NextResponse.json(
        { success: false, message: 'No se pudo crear el agente en Chatwoot' },
        { status: 502 }
      )
    }
    const chatwootUser = await userRes.json()

    const accountUserRes = await fetch(
      `${CHATWOOT_BASE_URL}/platform/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/account_users`,
      {
        method: 'POST',
        headers: chatwootHeaders,
        body: JSON.stringify({ user_id: chatwootUser.id, role: chatwootRole }),
      }
    )
    if (!accountUserRes.ok) {
      console.error('Chatwoot account_user create failed:', await accountUserRes.text())
      return NextResponse.json(
        { success: false, message: 'No se pudo dar acceso a la cuenta de Chatwoot' },
        { status: 502 }
      )
    }

    // Un agente (a diferencia de un administrador) solo ve conversaciones de
    // las inboxes a las que pertenece explícitamente. Como Suncar quiere que
    // cualquier agente vea y pueda tomar TODAS las conversaciones de WhatsApp
    // (sin darles permisos de administración de la cuenta), lo agregamos como
    // miembro de todas las inboxes existentes. Esto usa el token personal de
    // un administrador porque la Platform API no expone inbox_members.
    // `inbox_members#create` es aditivo: solo agrega, nunca quita a otros.
    if (chatwootRole === 'agent') {
      const adminHeaders = {
        api_access_token: CHATWOOT_ADMIN_ACCESS_TOKEN,
        'Content-Type': 'application/json',
      }
      const inboxesRes = await fetch(
        `${CHATWOOT_BASE_URL}/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/inboxes`,
        { headers: adminHeaders }
      )
      if (inboxesRes.ok) {
        const { payload: inboxes } = await inboxesRes.json()
        await Promise.all(
          (inboxes ?? []).map((inbox: { id: number }) =>
            fetch(`${CHATWOOT_BASE_URL}/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/inbox_members`, {
              method: 'POST',
              headers: adminHeaders,
              body: JSON.stringify({ inbox_id: inbox.id, user_ids: [chatwootUser.id] }),
            })
          )
        )
      } else {
        console.error('No se pudo listar inboxes de Chatwoot:', await inboxesRes.text())
      }
    }

    const loginRes = await fetch(
      `${CHATWOOT_BASE_URL}/platform/api/v1/users/${chatwootUser.id}/login`,
      { headers: chatwootHeaders }
    )
    if (!loginRes.ok) {
      console.error('Chatwoot login link failed:', await loginRes.text())
      return NextResponse.json(
        { success: false, message: 'No se pudo generar el acceso a Chatwoot' },
        { status: 502 }
      )
    }
    const { url } = await loginRes.json()

    return NextResponse.json({ success: true, url })
  } catch (error) {
    console.error('Error en SSO de Chatwoot:', error)
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    )
  }
}
