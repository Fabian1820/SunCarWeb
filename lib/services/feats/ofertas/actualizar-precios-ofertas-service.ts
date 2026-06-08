import { apiRequest } from "@/lib/api-config";

export interface ResultadoActualizacionPrecios {
  actualizadas: number;
  sin_cambios: number;
  errores: string[];
}

/**
 * Obtiene todas las ofertas confección genéricas con estado "aprobada",
 * compara el precio de cada item con el precio actual del material
 * (precio_instaladora si existe y es > 0, sino precio) y actualiza
 * las que tengan diferencias.
 */
export async function actualizarPreciosOfertasGenericas(): Promise<ResultadoActualizacionPrecios> {
  const resultado: ResultadoActualizacionPrecios = {
    actualizadas: 0,
    sin_cambios: 0,
    errores: [],
  };

  // 1. Cargar ofertas genéricas aprobadas
  let ofertas: any[] = [];
  try {
    const resp = await apiRequest<any>("/ofertas/confeccion/genericas/aprobadas");
    ofertas = Array.isArray(resp)
      ? resp
      : (resp?.data ?? resp?.ofertas ?? resp?.results ?? []);
  } catch (e: any) {
    resultado.errores.push(`Error cargando ofertas: ${e?.message ?? e}`);
    return resultado;
  }

  if (ofertas.length === 0) return resultado;

  // 2. Cargar catálogo completo de materiales (con precio_instaladora)
  const precioMap = new Map<string, number>();
  try {
    const resp = await apiRequest<any>("/productos/");
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

  // 3. Comparar y actualizar por oferta
  for (const oferta of ofertas) {
    const ofertaId: string = oferta.id ?? oferta._id ?? "";
    if (!ofertaId) {
      resultado.errores.push("Oferta sin ID, ignorada");
      continue;
    }

    const items: any[] = Array.isArray(oferta.items) ? oferta.items : [];
    if (items.length === 0) {
      resultado.sin_cambios++;
      continue;
    }

    let hayCambios = false;
    const itemsActualizados = items.map((item: any) => {
      const nuevoPrecio = precioMap.get(String(item.material_codigo));
      if (
        nuevoPrecio !== undefined &&
        Math.abs(nuevoPrecio - Number(item.precio)) > 0.001
      ) {
        hayCambios = true;
        return {
          ...item,
          precio: nuevoPrecio,
          precio_original: nuevoPrecio,
          precio_editado: false,
        };
      }
      return item;
    });

    if (!hayCambios) {
      resultado.sin_cambios++;
      continue;
    }

    try {
      await apiRequest(`/ofertas/confeccion/${ofertaId}`, {
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
