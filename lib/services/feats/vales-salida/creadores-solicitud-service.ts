import { apiRequest } from "@/lib/api-config";
import { ValeSalidaService } from "@/lib/api-services";

const DEDICATED_ENDPOINT =
  "/operaciones/vales-salida/creadores-solicitud-distinct";

/**
 * Devuelve la lista única, ordenada y sin vacíos de nombres de trabajadores que
 * han creado solicitudes asociadas a vales de salida del almacén indicado.
 *
 * Estrategia:
 *  1. Intentar el endpoint dedicado del backend (rápido, server-side).
 *  2. Si no existe, hacer fallback derivando los nombres únicos desde
 *     `getValesSummary` con un `limit` alto (lento pero funcional).
 */
export class CreadoresSolicitudService {
  static async listar(almacenId?: string): Promise<string[]> {
    const search = new URLSearchParams();
    if (almacenId) search.append("almacen_id", almacenId);
    const endpoint = search.toString()
      ? `${DEDICATED_ENDPOINT}?${search.toString()}`
      : DEDICATED_ENDPOINT;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = await apiRequest<any>(endpoint);
      if (raw?.success === false) throw new Error(raw?.message || "fallback");
      const payload = raw?.data ?? raw;
      if (Array.isArray(payload)) {
        return Array.from(
          new Set(
            payload
              .map((v) => (typeof v === "string" ? v : v?.nombre || ""))
              .filter((s): s is string => Boolean(s)),
          ),
        ).sort((a, b) =>
          a.localeCompare(b, "es", { sensitivity: "base" }),
        );
      }
    } catch {
      // continúa al fallback
    }

    // Fallback: derivar de summary con limit alto
    try {
      const { data } = await ValeSalidaService.getValesSummary({
        almacen_id: almacenId,
        skip: 0,
        limit: 10000,
      });
      const nombres = data
        .map((v) => (v.solicitud_creador_nombre || "").trim())
        .filter(Boolean);
      return Array.from(new Set(nombres)).sort((a, b) =>
        a.localeCompare(b, "es", { sensitivity: "base" }),
      );
    } catch {
      return [];
    }
  }
}
