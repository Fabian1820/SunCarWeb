import { apiRequest } from "@/lib/api-config";

export type EstadoServicioCliente = "pendiente" | "en_proceso" | "terminado";

export interface LineaServicioCliente {
  concepto: string;
  monto: number;
}

export interface ServicioCliente {
  id: string;
  cliente_numero: string;
  cliente_nombre?: string | null;
  descripcion: string;
  lineas: LineaServicioCliente[];
  precio_total: number;
  estado: EstadoServicioCliente;
  monto_pendiente: number;
  pagos: string[];
  creado_por_ci?: string | null;
  creado_por_nombre?: string | null;
  facturado: boolean;
  numero_factura?: string | null;
  fecha_facturacion?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

interface Respuesta<T> {
  success: boolean;
  message: string;
  data?: T;
  detail?: unknown;
}

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

const BASE = "/servicios-cliente";

export const ServiciosClienteService = {
  async listarPorCliente(clienteNumero: string): Promise<ServicioCliente[]> {
    const res = exigirExito(
      await apiRequest<Respuesta<ServicioCliente[]>>(
        `${BASE}/cliente/${encodeURIComponent(clienteNumero)}`,
      ),
      "obtener los servicios del cliente",
    );
    return res.data ?? [];
  },

  async listarTodos(filtros?: { estado?: EstadoServicioCliente; facturado?: boolean }): Promise<ServicioCliente[]> {
    const params = new URLSearchParams();
    if (filtros?.estado) params.set("estado", filtros.estado);
    if (filtros?.facturado != null) params.set("facturado", String(filtros.facturado));
    const qs = params.toString();
    const res = exigirExito(
      await apiRequest<Respuesta<ServicioCliente[]>>(`${BASE}/${qs ? `?${qs}` : ""}`),
      "listar los servicios de cliente",
    );
    return res.data ?? [];
  },

  async crear(datos: {
    cliente_numero: string;
    descripcion: string;
    lineas: LineaServicioCliente[];
    estado?: EstadoServicioCliente;
  }): Promise<string> {
    const res = exigirExito(
      await apiRequest<Respuesta<unknown> & { servicio_id?: string }>(`${BASE}/`, {
        method: "POST",
        body: JSON.stringify(datos),
      }),
      "crear el servicio",
    );
    return (res as { servicio_id?: string }).servicio_id ?? "";
  },

  async actualizarLineas(
    servicioId: string,
    datos: { descripcion?: string; lineas: LineaServicioCliente[] },
  ): Promise<ServicioCliente> {
    const res = exigirExito(
      await apiRequest<Respuesta<ServicioCliente>>(`${BASE}/${encodeURIComponent(servicioId)}/lineas`, {
        method: "PUT",
        body: JSON.stringify(datos),
      }),
      "actualizar las líneas del servicio",
    );
    return res.data as ServicioCliente;
  },

  async actualizarEstado(servicioId: string, estado: EstadoServicioCliente): Promise<ServicioCliente> {
    const res = exigirExito(
      await apiRequest<Respuesta<ServicioCliente>>(`${BASE}/${encodeURIComponent(servicioId)}/estado`, {
        method: "PATCH",
        body: JSON.stringify({ estado }),
      }),
      "actualizar el estado del servicio",
    );
    return res.data as ServicioCliente;
  },

  async facturar(servicioId: string): Promise<ServicioCliente> {
    const res = exigirExito(
      await apiRequest<Respuesta<ServicioCliente>>(`${BASE}/${encodeURIComponent(servicioId)}/facturar`, {
        method: "POST",
      }),
      "facturar el servicio",
    );
    return res.data as ServicioCliente;
  },

  async eliminar(servicioId: string): Promise<void> {
    exigirExito(
      await apiRequest<Respuesta<unknown>>(`${BASE}/${encodeURIComponent(servicioId)}`, {
        method: "DELETE",
      }),
      "eliminar el servicio",
    );
  },
};
