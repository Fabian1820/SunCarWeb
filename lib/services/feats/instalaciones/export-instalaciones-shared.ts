import { apiRequest } from "@/lib/api-config";
import { MaterialService } from "@/lib/api-services";
import {
  normalizeOfertaConfeccion,
  seleccionarOfertaConfirmada,
} from "@/hooks/use-ofertas-confeccion";

/**
 * Helpers compartidos por los exports de Instalaciones (En Proceso / Nuevas).
 *
 * Los `ofertas` embebidos en el cliente/lead NO traen los items, por eso hay que
 * pedir la oferta al backend. La respuesta SÍ trae `entregas[]` por item, que es
 * lo que permite cruzar el estado de entrega de cada material sin llamadas extra.
 */

export interface MaterialInstalacion {
  codigo: string;
  descripcion: string;
  cantidad: number;
  /** Suma de `item.entregas[].cantidad`. */
  totalEntregado: number;
}

export const normCodigo = (value?: string | null): string =>
  String(value || "")
    .trim()
    .toLowerCase();

/**
 * Catálogo código(normalizado) -> nombre del material. El item de la oferta solo
 * guarda `descripcion`, no el nombre; para mostrar el NOMBRE real se enriquece
 * desde el catálogo (igual que el export de vales de salida).
 */
export const cargarNombresPorCodigo = async (): Promise<Map<string, string>> => {
  const map = new Map<string, string>();
  try {
    const materiales = await MaterialService.getAllMaterials();
    for (const m of materiales) {
      const codigo = normCodigo((m as { codigo?: string }).codigo);
      if (!codigo) continue;
      const nombre = String(
        (m as { nombre?: string }).nombre ||
          (m as { descripcion?: string }).descripcion ||
          "",
      ).trim();
      if (nombre) map.set(codigo, nombre);
    }
  } catch {
    // Si falla el catálogo, se cae al `descripcion` del item de la oferta.
  }
  return map;
};

/** Nombre a mostrar: catálogo por código; si no está, cae al `descripcion`. */
export const nombreMaterial = (
  m: MaterialInstalacion,
  nombresPorCodigo: Map<string, string>,
): string => nombresPorCodigo.get(normCodigo(m.codigo)) || m.descripcion || m.codigo;

/** Ejecuta las promesas en lotes para no saturar el backend. */
export async function enLotes<T, R>(
  items: T[],
  size: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    const lote = items.slice(i, i + size);
    const res = await Promise.all(lote.map(fn));
    out.push(...res);
  }
  return out;
}

/**
 * Estado de entrega de un material para el Excel.
 * `No` (nada entregado) · `Sí` (entregado completo) · `Parcial (cant entregada: N)`.
 */
export function formatEntregado(
  cantidad: number,
  totalEntregado: number,
): string {
  const entregado = Math.max(0, Number(totalEntregado) || 0);
  const requerida = Math.max(0, Number(cantidad) || 0);
  if (entregado <= 0) return "No";
  if (entregado >= requerida) return "Sí";
  return `Parcial (cant entregada: ${entregado})`;
}

/** Extrae los materiales de la oferta confirmada más reciente de una respuesta cruda. */
export function materialesDeRespuestaOfertas(
  response: any,
): MaterialInstalacion[] {
  const payload = response?.data ?? response;
  const ofertasRaw: any[] = Array.isArray(payload?.ofertas)
    ? payload.ofertas
    : Array.isArray(response?.ofertas)
      ? response.ofertas
      : Array.isArray(payload)
        ? payload
        : payload?.oferta
          ? [payload.oferta]
          : payload && (payload.items || payload.materiales || payload.numero_oferta)
            ? [payload]
            : [];

  if (ofertasRaw.length === 0) return [];

  const ofertas = ofertasRaw.map(normalizeOfertaConfeccion);
  const mejor = seleccionarOfertaConfirmada(ofertas);
  const items = mejor?.items ?? [];

  return items.map((item) => {
    const entregas = Array.isArray(item.entregas) ? item.entregas : [];
    const totalEntregado = entregas.reduce(
      (sum, entrega) => sum + (Number(entrega?.cantidad) || 0),
      0,
    );
    return {
      codigo: String(item.material_codigo || ""),
      descripcion: String(item.descripcion || ""),
      cantidad: Number(item.cantidad) || 0,
      totalEntregado,
    };
  });
}

/** Materiales de la oferta confirmada de un CLIENTE (por número). */
export async function fetchMaterialesDeCliente(
  numero: string,
): Promise<MaterialInstalacion[]> {
  const candidato = String(numero || "").trim();
  if (!candidato) return [];
  try {
    const response = await apiRequest<any>(
      `/ofertas/confeccion/cliente/${encodeURIComponent(candidato)}`,
      { method: "GET" },
    );
    return materialesDeRespuestaOfertas(response);
  } catch {
    return [];
  }
}

/** Materiales de la oferta confirmada de un LEAD (por id). */
export async function fetchMaterialesDeLead(
  leadId: string,
): Promise<MaterialInstalacion[]> {
  const id = String(leadId || "").trim();
  if (!id) return [];
  try {
    const response = await apiRequest<any>(
      `/ofertas/confeccion/lead/${encodeURIComponent(id)}`,
      { method: "GET" },
    );
    return materialesDeRespuestaOfertas(response);
  } catch {
    return [];
  }
}
