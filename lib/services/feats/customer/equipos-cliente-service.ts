import { apiRequest } from "../../../api-config";
import type {
  CapacidadEquipos,
  CategoriaEquipo,
  EquipoCliente,
  MovimientoEquipoCliente,
} from "../../../api-types";
import type { MotivoCambioEquipo } from "../../../types/feats/customer/cliente-types";

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
 * "este cliente no tiene equipos", y un 400 de validación ("el motivo exige
 * una nota") en un guardado que parece correcto.
 */
function exigirExito<T>(res: Respuesta<T> | null | undefined, que: string): Respuesta<T> {
  if (!res || res.success === false || res.detail !== undefined) {
    const detalle =
      typeof res?.detail === "string"
        ? res.detail
        : Array.isArray(res?.detail)
          ? (res?.detail as Array<{ msg?: string }>).map((d) => d?.msg).filter(Boolean).join("; ")
          : res?.message || "respuesta vacía";
    throw new Error(`No se pudo ${que}: ${detalle}`);
  }
  return res;
}

/** Datos de un equipo que no está en el catálogo (lo más común: propio del cliente). */
export type EquipoLibre = {
  descripcion: string;
  categoria: CategoriaEquipo;
  marca?: string | null;
  potencia_kw?: number | null;
};

type Trazabilidad = {
  motivo: MotivoCambioEquipo;
  nota?: string | null;
  autorizado_por?: string | null;
  /** ISO. Cuándo pasó en la realidad; si falta, el backend usa ahora. */
  fecha_efectiva?: string | null;
};

const base = (numero: string) => `/clientes/${encodeURIComponent(numero)}/equipos`;
const deEquipo = (numero: string, key: string) => `${base(numero)}/${encodeURIComponent(key)}`;

const enviar = async (
  endpoint: string,
  method: "POST" | "PATCH",
  body: Record<string, unknown>,
  que: string,
) =>
  exigirExito(
    await apiRequest<Respuesta<unknown>>(endpoint, { method, body: JSON.stringify(body) }),
    que,
  );

export class EquiposClienteService {
  /** Estado actual, con lo entregado según almacén y la foto del catálogo. */
  static async getEquipos(
    numero: string,
    incluirRetirados = true,
  ): Promise<{ equipos: EquipoCliente[]; capacidad: Omit<CapacidadEquipos, "fuente"> | null }> {
    const res = exigirExito(
      await apiRequest<Respuesta<EquipoCliente[]>>(
        `${base(numero)}?incluir_retirados=${incluirRetirados}`,
      ),
      "obtener los equipos del cliente",
    );
    return { equipos: res.data ?? [], capacidad: res.capacidad_equipos ?? null };
  }

  /** Movimientos del más reciente al más antiguo. */
  static async getHistorial(numero: string): Promise<MovimientoEquipoCliente[]> {
    const res = exigirExito(
      await apiRequest<Respuesta<MovimientoEquipoCliente[]>>(`${base(numero)}/historial`),
      "obtener el historial de equipos",
    );
    return res.data ?? [];
  }

  /** Alta: del catálogo (`material_id`) o descrito a mano (`libre`). */
  static async agregar(
    numero: string,
    datos: Trazabilidad & {
      cantidad: number;
      material_id?: string | null;
      libre?: EquipoLibre | null;
      es_equipo_propio?: boolean;
      numero_serie?: string | null;
    },
  ) {
    const { libre, ...resto } = datos;
    await enviar(base(numero), "POST", { ...resto, ...(libre ?? {}) }, "agregar el equipo");
  }

  /** Deja la cantidad en `nueva_cantidad`; el delta lo calcula el backend. */
  static async ajustar(
    numero: string,
    equipoKey: string,
    datos: Trazabilidad & { nueva_cantidad: number },
  ) {
    await enviar(deEquipo(numero, equipoKey), "PATCH", datos, "ajustar la cantidad");
  }

  /** Retira el que sale y da de alta el que entra, enlazados. */
  static async sustituir(
    numero: string,
    equipoKey: string,
    datos: Trazabilidad & {
      nota: string;
      cantidad?: number | null;
      material_id?: string | null;
      libre?: EquipoLibre | null;
      numero_serie?: string | null;
    },
  ) {
    const { libre, ...resto } = datos;
    await enviar(
      `${deEquipo(numero, equipoKey)}/sustituir`,
      "POST",
      { ...resto, ...(libre ?? {}) },
      "sustituir el equipo",
    );
  }

  static async retirar(
    numero: string,
    equipoKey: string,
    datos: Trazabilidad & { cantidad?: number | null },
  ) {
    await enviar(`${deEquipo(numero, equipoKey)}/retirar`, "POST", datos, "retirar el equipo");
  }

  /** Corrige identidad o datos sin tocar cantidades. */
  static async corregir(
    numero: string,
    equipoKey: string,
    datos: {
      nota: string;
      material_id?: string | null;
      descripcion?: string | null;
      categoria?: CategoriaEquipo | null;
      marca?: string | null;
      potencia_kw?: number | null;
      numero_serie?: string | null;
    },
  ) {
    await enviar(`${deEquipo(numero, equipoKey)}/corregir`, "POST", datos, "corregir el equipo");
  }
}
