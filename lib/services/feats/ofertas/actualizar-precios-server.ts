/**
 * Versión server-side de la actualización de precios.
 * Se autentica contra el FastAPI usando CRON_CI + CRON_ADMIN_PASS,
 * igual que hace el login normal de la app. No depende de localStorage.
 */

function getBackendBase(): string {
  const raw = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";
  return raw.trim().replace(/\/+$/, "");
}

async function loginCron(): Promise<string> {
  const ci = process.env.CRON_CI;
  const adminPass = process.env.CRON_ADMIN_PASS;

  if (!ci || !adminPass) {
    throw new Error("Faltan variables de entorno CRON_CI o CRON_ADMIN_PASS");
  }

  const url = `${getBackendBase()}/api/auth/login-admin`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ci, adminPass }),
  });

  if (!resp.ok) throw new Error(`Login cron fallido: HTTP ${resp.status}`);

  const data = await resp.json();
  const token = data?.token ?? data?.access_token ?? "";
  if (!token) throw new Error("Login cron: respuesta sin token");
  return token;
}

async function backendFetch(token: string, endpoint: string, options: RequestInit = {}): Promise<any> {
  const url = `${getBackendBase()}/api${endpoint}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    ...(options.headers as Record<string, string> | undefined ?? {}),
  };
  const resp = await fetch(url, { ...options, headers });
  if (!resp.ok) throw new Error(`${endpoint} → HTTP ${resp.status} ${resp.statusText}`);
  return resp.json();
}

export interface ResultadoActualizacionServer {
  actualizadas: number;
  sin_cambios: number;
  errores: string[];
}

export async function actualizarPreciosOfertasGenericasServer(): Promise<ResultadoActualizacionServer> {
  const resultado: ResultadoActualizacionServer = { actualizadas: 0, sin_cambios: 0, errores: [] };

  // Obtener token fresco via login
  let token: string;
  try {
    token = await loginCron();
  } catch (e: any) {
    resultado.errores.push(`Error de autenticación: ${e?.message ?? e}`);
    return resultado;
  }

  // 1. Ofertas genéricas aprobadas
  let ofertas: any[] = [];
  try {
    const resp = await backendFetch(token, "/ofertas/confeccion/genericas/aprobadas");
    ofertas = Array.isArray(resp) ? resp : (resp?.data ?? resp?.ofertas ?? resp?.results ?? []);
  } catch (e: any) {
    resultado.errores.push(`Error cargando ofertas: ${e?.message ?? e}`);
    return resultado;
  }

  if (ofertas.length === 0) return resultado;

  // 2. Catálogo completo con precio_instaladora
  const precioMap = new Map<string, number>();
  try {
    const resp = await backendFetch(token, "/productos/");
    const catalogs: any[] = Array.isArray(resp) ? resp : (resp?.data ?? []);
    for (const cat of catalogs) {
      for (const m of cat.materiales ?? []) {
        const precio =
          m.precio_instaladora && m.precio_instaladora > 0
            ? m.precio_instaladora
            : m.precio || 0;
        precioMap.set(String(m.codigo), precio);
      }
    }
  } catch (e: any) {
    resultado.errores.push(`Error cargando materiales: ${e?.message ?? e}`);
    return resultado;
  }

  // 3. Comparar y actualizar
  for (const oferta of ofertas) {
    const ofertaId: string = oferta.id ?? oferta._id ?? "";
    if (!ofertaId) { resultado.errores.push("Oferta sin ID, ignorada"); continue; }

    const items: any[] = Array.isArray(oferta.items) ? oferta.items : [];
    if (items.length === 0) { resultado.sin_cambios++; continue; }

    let hayCambios = false;
    const itemsActualizados = items.map((item: any) => {
      const nuevoPrecio = precioMap.get(String(item.material_codigo));
      if (nuevoPrecio !== undefined && Math.abs(nuevoPrecio - Number(item.precio)) > 0.001) {
        hayCambios = true;
        return { ...item, precio: nuevoPrecio, precio_original: nuevoPrecio, precio_editado: false };
      }
      return item;
    });

    if (!hayCambios) { resultado.sin_cambios++; continue; }

    try {
      await backendFetch(token, `/ofertas/confeccion/${ofertaId}`, {
        method: "PATCH",
        body: JSON.stringify({ items: itemsActualizados }),
      });
      resultado.actualizadas++;
    } catch (e: any) {
      resultado.errores.push(`Oferta ${ofertaId}: ${e?.message ?? e}`);
    }
  }

  return resultado;
}
