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

    const { ci: ciDelCuerpo, nombre, foto_perfil: fotoPerfil } = await request.json()
    if (!ciDelCuerpo || !nombre) {
      return NextResponse.json(
        { success: false, message: 'Faltan datos del usuario' },
        { status: 400 }
      )
    }

    // La identidad se saca del token, no del cuerpo: el ci que manda el
    // navegador es dato del cliente y se puede cambiar a mano. `/auth/validate`
    // la devuelve tal y como viaja firmada dentro del JWT.
    const validateRes = await fetch(`${API_BASE_URL}/auth/validate`, {
      headers: { Authorization: authHeader },
    })
    if (!validateRes.ok) {
      return NextResponse.json({ success: false, message: 'Sesión inválida' }, { status: 401 })
    }
    const identidad = (await validateRes.json())?.data ?? {}
    // Si el backend aún no devuelve `data` (despliegue anterior a este cambio),
    // se cae al ci del cuerpo para no dejar fuera a quien ya entraba.
    const ci: string = identidad.ci ?? ciDelCuerpo
    const esSuperAdmin = identidad.is_superAdmin === true

    const permisosRes = await fetch(
      `${API_BASE_URL}/permisos/trabajador/${encodeURIComponent(ci)}/modulos-nombres`,
      { headers: { Authorization: authHeader } }
    )
    if (!permisosRes.ok) {
      return NextResponse.json({ success: false, message: 'Sesión inválida' }, { status: 401 })
    }
    const permisosData = await permisosRes.json()
    const modulosPermitidos: string[] = permisosData.data ?? []
    // El superAdmin entra siempre. El panel ya le pinta la tarjeta del módulo
    // (`hasPermission` en auth-context le da por bueno todo menos "permisos"),
    // así que exigirle aquí el permiso explícito dejaba la tarjeta a la vista
    // pero la puerta cerrada.
    if (!esSuperAdmin && !modulosPermitidos.includes(CHATWOOT_MODULE_KEY)) {
      return NextResponse.json(
        { success: false, message: 'No tienes permiso para este módulo' },
        { status: 403 }
      )
    }
    // Rol en Chatwoot según el sub-permiso aditivo, igual que
    // "almacenes-suncar/admin": el permiso base entra como agente, el
    // sub-permiso aditivo entra como administrador.
    const chatwootRole =
      esSuperAdmin || modulosPermitidos.includes(CHATWOOT_ADMIN_SUBPERMISO)
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
    const adminHeaders = {
      api_access_token: CHATWOOT_ADMIN_ACCESS_TOKEN,
      'Content-Type': 'application/json',
    }
    const email = `${ci}@suncar.internal`
    const needsInboxSetup = chatwootRole === 'agent'

    // `POST users` is idempotent (Chatwoot finds-or-creates by email), so
    // this is safe to run on every login. The inbox list doesn't depend on
    // the user, so kick it off in parallel instead of waiting on user
    // creation first — cuts one full round-trip off the critical path.
    const [userRes, inboxesRes] = await Promise.all([
      fetch(`${CHATWOOT_BASE_URL}/platform/api/v1/users`, {
        method: 'POST',
        headers: chatwootHeaders,
        body: JSON.stringify({
          name: nombre,
          email,
          password: randomPassword(),
          ...(fotoPerfil ? { avatar_url: fotoPerfil } : {}),
        }),
      }),
      needsInboxSetup
        ? fetch(`${CHATWOOT_BASE_URL}/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/inboxes`, {
            headers: adminHeaders,
          })
        : Promise.resolve(null),
    ])
    if (!userRes.ok) {
      console.error('Chatwoot platform user create failed:', await userRes.text())
      return NextResponse.json(
        { success: false, message: 'No se pudo crear el agente en Chatwoot' },
        { status: 502 }
      )
    }
    const chatwootUser = await userRes.json()

    // Un agente (a diferencia de un administrador) solo ve conversaciones de
    // las inboxes a las que pertenece explícitamente. Como Suncar quiere que
    // cualquier agente vea y pueda tomar TODAS las conversaciones de WhatsApp
    // (sin darles permisos de administración de la cuenta), lo agregamos como
    // miembro de todas las inboxes existentes. Esto usa el token personal de
    // un administrador porque la Platform API no expone inbox_members.
    // `inbox_members#create` es aditivo: solo agrega, nunca quita a otros.
    const setupAccountAccess = async () => {
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
        return { success: false, message: 'No se pudo dar acceso a la cuenta de Chatwoot' } as const
      }

      if (needsInboxSetup && inboxesRes) {
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
      return { success: true } as const
    }

    // The login link doesn't depend on account/inbox membership being set up
    // (it's a user-level SSO token), so generate it in parallel with the
    // account access setup instead of waiting for that to finish first.
    const [accessResult, loginRes] = await Promise.all([
      setupAccountAccess(),
      fetch(`${CHATWOOT_BASE_URL}/platform/api/v1/users/${chatwootUser.id}/login`, {
        headers: chatwootHeaders,
      }),
    ])
    if (!accessResult.success) {
      return NextResponse.json(
        { success: false, message: accessResult.message },
        { status: 502 }
      )
    }
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
