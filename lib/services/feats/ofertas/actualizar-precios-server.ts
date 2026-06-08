/**
 * Versión server-side de la actualización de precios.
 * Usa fetch directo con CRON_BACKEND_TOKEN — no depende de localStorage.
 * Usada tanto por instrumentation.ts (cron interno) como por la API route.
 */

function getBackendBase(): string {
  const raw = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";
  return raw.trim().replace(/\/+$/, "");
}

async function backendFetch(endpoint: string, options: RequestInit = {}): Promise<any> {
  const token = process.env.CRON_BACKEND_TOKEN ?? "";
  const url = `${getBackendBase()}/api${endpoint}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

  // 1. Ofertas genéricas aprobadas
  let ofertas: any[] = [];
  try {
    const resp = await backendFetch("/ofertas/confeccion/genericas/aprobadas");
    ofertas = Array.isArray(resp) ? resp : (resp?.data ?? resp?.ofertas ?? resp?.results ?? []);
  } catch (e: any) {
    resultado.errores.push(`Error cargando ofertas: ${e?.message ?? e}`);
    return resultado;
  }

  if (ofertas.length === 0) return resultado;

  // 2. Catálogo completo con precio_instaladora
  const precioMap = new Map<string, number>();
  try {
    const resp = await backendFetch("/productos/");
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
      await backendFetch(`/ofertas/confeccion/${ofertaId}`, {
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
