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

export class DisponibilidadWebService {
  /** Las 16 provincias con el estado del material en cada una. */
  static async getMatriz(materialId: string): Promise<ProvinciaDisponibilidad[]> {
    const res = await apiRequest<MatrizResponse>(
      `/api/disponibilidad-web/materiales/${materialId}`,
    );
    return res?.data ?? [];
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
    const res = await apiRequest<MatrizResponse>(
      `/api/disponibilidad-web/materiales/${materialId}${query}`,
      { method: "PUT", body: JSON.stringify(provincias) },
    );
    return res?.data ?? [];
  }

  /** Resumen por material para pintar el contador en las tarjetas. */
  static async getResumen(
    materialIds: string[],
  ): Promise<Record<string, ResumenDisponibilidad>> {
    if (materialIds.length === 0) return {};
    const res = await apiRequest<ResumenResponse>(
      `/api/disponibilidad-web/resumen`,
      { method: "POST", body: JSON.stringify({ material_ids: materialIds }) },
    );
    return res?.data ?? {};
  }
}
