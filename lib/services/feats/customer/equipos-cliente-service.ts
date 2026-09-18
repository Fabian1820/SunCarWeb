import { apiRequest } from "../../../api-config";
import type {
  CapacidadEquipos,
  EquipoCliente,
  MovimientoEquipoCliente,
} from "../../../api-types";

type Respuesta<T> = {
  success?: boolean;
  message?: string;
  detail?: unknown;
  data?: T;
  capacidad_equipos?: Omit<CapacidadEquipos, "fuente">;
};

/**
 * `apiRequest` no lanza ante un 404 o 400 de FastAPI: devuelve el cuerpo con
 * `detail`. Leer `.data` directamente convertiría "el endpoint no existe" en
 * "este cliente no tiene equipos", que es justo lo que no se puede confundir
 * mientras el backend nuevo no esté desplegado.
 */
function exigirExito<T>(res: Respuesta<T> | null | undefined, que: string): Respuesta<T> {
  if (!res || res.success === false || res.detail !== undefined) {
    const detalle =
      typeof res?.detail === "string"
        ? res.detail
        : res?.message || "respuesta vacía";
    throw new Error(`No se pudo obtener ${que}: ${detalle}`);
  }
  return res;
}

export class EquiposClienteService {
  /** Estado actual de los equipos, con la discrepancia calculada. */
  static async getEquipos(
    numero: string,
    incluirRetirados = true,
  ): Promise<{ equipos: EquipoCliente[]; capacidad: Omit<CapacidadEquipos, "fuente"> | null }> {
    const res = exigirExito(
      await apiRequest<Respuesta<EquipoCliente[]>>(
        `/clientes/${encodeURIComponent(numero)}/equipos?incluir_retirados=${incluirRetirados}`,
      ),
      "los equipos del cliente",
    );
    return { equipos: res.data ?? [], capacidad: res.capacidad_equipos ?? null };
  }

  /** Movimientos del más reciente al más antiguo. */
  static async getHistorial(numero: string): Promise<MovimientoEquipoCliente[]> {
    const res = exigirExito(
      await apiRequest<Respuesta<MovimientoEquipoCliente[]>>(
        `/clientes/${encodeURIComponent(numero)}/equipos/historial`,
      ),
      "el historial de equipos",
    );
    return res.data ?? [];
  }
}
