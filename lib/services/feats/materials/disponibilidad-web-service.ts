import { apiRequest } from "../../../api-config";

/** Una provincia dentro de la matriz de disponibilidad de un material. */
export interface ProvinciaDisponibilidad {
  provincia_codigo: string;
  provincia_nombre: string | null;
  activo: boolean;
  /** null = hereda el precio base del material. */
  precio: number | null;
  actualizado_en?: string | null;
  actualizado_por?: string | null;
}

/** Lo que se manda al guardar: solo las provincias encendidas. */
export interface ProvinciaDisponibilidadInput {
  provincia_codigo: string;
  activo: boolean;
  precio: number | null;
}

export interface ResumenDisponibilidad {
  total_provincias: number;
  provincias_activas: string[];
  tiene_precio_diferenciado: boolean;
}

interface MatrizResponse {
  success: boolean;
  message: string;
  material_id: string;
  data: ProvinciaDisponibilidad[];
}

interface ResumenResponse {
  success: boolean;
  message: string;
  data: Record<string, ResumenDisponibilidad>;
}

/**
 * `apiRequest` devuelve el cuerpo del error en vez de lanzar cuando el backend
 * responde `{detail: ...}` (cualquier 404/400 de FastAPI). Si no se comprueba,
 * un endpoint mal escrito se ve como "no hay datos" en vez de como un fallo:
 * fue exactamente el sintoma de las provincias que no cargaban.
 */
function exigirExito<T extends { success?: boolean; message?: string }>(
  res: T | undefined,
  quePedia: string,
): T {
  const detalle = (res as unknown as Record<string, unknown>) ?? {};
  if (!res || res.success === false || detalle.detail) {
    const motivo =
      res?.message ||
      (typeof detalle.detail === "string" ? detalle.detail : null) ||
      "respuesta inesperada del servidor";
    throw new Error(`${quePedia}: ${motivo}`);
  }
  return res;
}

export class DisponibilidadWebService {
  /** Las 16 provincias con el estado del material en cada una. */
  static async getMatriz(materialId: string): Promise<ProvinciaDisponibilidad[]> {
    const res = exigirExito(
      await apiRequest<MatrizResponse>(
        `/disponibilidad-web/materiales/${materialId}`,
      ),
      "No se pudo cargar la disponibilidad por provincia",
    );
    return res.data ?? [];
  }

  /**
   * Guarda el estado completo del material en UNA llamada.
   * El backend borra las provincias que no vengan, así que mandar solo las
   * encendidas es suficiente para apagar el resto.
   */
  static async guardarMatriz(
    materialId: string,
    provincias: ProvinciaDisponibilidadInput[],
    usuario?: string,
  ): Promise<ProvinciaDisponibilidad[]> {
    const query = usuario ? `?usuario=${encodeURIComponent(usuario)}` : "";
    const res = exigirExito(
      await apiRequest<MatrizResponse>(
        `/disponibilidad-web/materiales/${materialId}${query}`,
        { method: "PUT", body: JSON.stringify(provincias) },
      ),
      "No se pudo guardar la disponibilidad",
    );
    return res.data ?? [];
  }

  /** Resumen por material para pintar el contador en las tarjetas. */
  static async getResumen(
    materialIds: string[],
  ): Promise<Record<string, ResumenDisponibilidad>> {
    if (materialIds.length === 0) return {};
    const res = exigirExito(
      await apiRequest<ResumenResponse>(`/disponibilidad-web/resumen`, {
        method: "POST",
        body: JSON.stringify({ material_ids: materialIds }),
      }),
      "No se pudo cargar el resumen de provincias",
    );
    return res.data ?? {};
  }
}
