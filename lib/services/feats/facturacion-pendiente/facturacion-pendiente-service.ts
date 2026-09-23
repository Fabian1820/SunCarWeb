import { apiRequest } from "@/lib/api-config"

/**
 * Módulo Facturación → Por facturar.
 *
 * Desde el 23-sep-2026 la factura ya no se genera sola al pasar el cliente a
 * "Equipo instalado con éxito": se acepta aquí, oferta por oferta.
 */

export type EstadoFacturacion = "pendiente" | "facturada" | "no_facturar"

export interface OfertaPorFacturar {
  oferta_id: string
  numero_oferta: string | null
  nombre: string | null
  precio_final: number
  monto_pendiente: number
  fecha_confirmada: string | null
  estado_instalacion: string | null
  estado_facturacion: EstadoFacturacion
  numero_factura: string | null
  fecha_facturacion: string | null
  facturada_por: string | null
  facturada_en: string | null
  no_facturar: { motivo: string | null; por: string | null; fecha: string | null } | null
}

export interface ClientePorFacturar {
  cliente_numero: string
  cliente_nombre: string | null
  comercial: string | null
  estado_cliente: string | null
  telefono: string | null
  fecha_equipo_instalado: string | null
  es_trabajador_suncar: boolean
  equipo_propio: boolean
  ofertas: OfertaPorFacturar[]
  pendientes: number
  /** La factura automática le pidió a Economía elegir oferta (2+ sin facturar) y sigue pendiente. */
  pendiente_decision_economia: boolean
}

/**
 * "nuevos": desde que la factura dejó de ser automática (23-sep-2026).
 * "historico": lo pendiente de antes, salvo clientes de antes del sistema sin vales ni facturas.
 * "todos": sin filtro (buscador de la comparativa).
 */
export type VistaPorFacturar = "nuevos" | "historico" | "todos"

export interface ListaPorFacturar {
  data: ClientePorFacturar[]
  total: number
  skip: number
  limit: number
  /** Día en que empieza la lista de nuevos. */
  inicio: string
}

export interface ValePendiente {
  vale_id: string
  codigo: string | null
  fecha: string | null
  materiales: { codigo: string | null; nombre: string | null; cantidad: number | null }[]
}

export interface DetalleClientePorFacturar {
  cliente_numero: string
  cliente_nombre: string | null
  estado_cliente: string | null
  fecha_equipo_instalado: string | null
  ofertas: OfertaPorFacturar[]
  vales_pendientes: ValePendiente[]
  facturas_vales: {
    id: string
    numero_factura: string | null
    fecha: string | null
    anulada: boolean
    vales: number
    total: number
    oferta_id: string | null
  }[]
  servicios: {
    id: string
    descripcion: string | null
    precio_total: number
    estado: string | null
    facturado: boolean
    numero_factura: string | null
  }[]
}

export type EstadoComparacion = "ok" | "falta" | "exceso" | "no_ofertado"

export interface MaterialComparado {
  material_id: string | null
  codigo: string
  nombre: string | null
  um: string | null
  ofertado: number
  /** Salido en vales. */
  salido: number
  devuelto: number
  /** Salido antes del sistema de vales: la mayor de las dos huellas siguientes. */
  antes_de_vales: number
  entregado_sin_vale: number
  facturado_sin_vale: number
  /** Vales + antes de los vales − devuelto. */
  neto: number
  diferencia: number
  estado: EstadoComparacion
  precio_oferta: number | null
  precio_catalogo: number | null
  valor_ofertado: number
  valor_salido: number
  por_oferta: { numero_oferta: string | null; cantidad: number }[]
  por_vale: { vale_id: string; codigo_vale: string | null; fecha: string | null; cantidad: number; facturado: boolean }[]
  previo: {
    origen: "entregado_sin_vale" | "facturado_sin_vale"
    /** Descripción de entonces (el código pudo reutilizarse después). */
    descripcion: string | null
    referencia: string | null
    fecha: string | null
    cantidad: number
  }[]
}

export interface ComparativaCliente {
  cliente_numero: string
  cliente_nombre: string | null
  ofertas: { oferta_id: string; numero_oferta: string | null; estado_facturacion: EstadoFacturacion; comparada: boolean }[]
  vales: number
  materiales: MaterialComparado[]
  resumen: Record<EstadoComparacion, number>
  total_ofertado: number
  total_salido: number
  servicios: {
    id: string
    descripcion: string | null
    lineas: { concepto: string; monto: number }[]
    precio_total: number
    estado: string | null
    facturado: boolean
  }[]
}

export interface ResultadoFacturar {
  oferta_id: string
  numero_factura: string
  fecha_facturacion: string | null
  factura_vales: { factura_id: string; numero_factura: string; vales_incluidos: number } | null
  aviso: string | null
}

const BASE = "/facturacion-pendiente"

type Respuesta = { success?: boolean; detail?: unknown; error?: { message?: string } } & Record<string, unknown>

/**
 * `apiRequest` no lanza ante un 400/403/409 de FastAPI: devuelve
 * `{ detail, success: false }`. Aquí se convierte en excepción para que un
 * rechazo nunca se pinte como éxito.
 */
function desenvolver<T>(resp: Respuesta): T {
  if (resp?.success === false) {
    const detail = resp.detail
    const mensaje =
      (typeof detail === "string" && detail) || resp.error?.message || "La operación no se pudo completar"
    throw new Error(mensaje)
  }
  return resp as unknown as T
}

export const FacturacionPendienteService = {
  async listar(
    params: { q?: string; vista?: VistaPorFacturar; solo_pendientes?: boolean; skip?: number; limit?: number },
    signal?: AbortSignal,
  ): Promise<ListaPorFacturar> {
    const qs = new URLSearchParams()
    if (params.q?.trim()) qs.set("q", params.q.trim())
    qs.set("vista", params.vista ?? "nuevos")
    if (params.solo_pendientes === false) qs.set("solo_pendientes", "false")
    qs.set("skip", String(params.skip ?? 0))
    qs.set("limit", String(params.limit ?? 50))
    const resp = await apiRequest<Respuesta>(`${BASE}/clientes?${qs}`, { method: "GET", signal })
    return desenvolver<ListaPorFacturar>(resp)
  },

  async detalle(clienteNumero: string, signal?: AbortSignal): Promise<DetalleClientePorFacturar> {
    const resp = await apiRequest<Respuesta>(`${BASE}/clientes/${encodeURIComponent(clienteNumero)}`, {
      method: "GET",
      signal,
    })
    return desenvolver<{ data: DetalleClientePorFacturar }>(resp).data
  },

  async comparativa(clienteNumero: string, ofertaIds?: string[], signal?: AbortSignal): Promise<ComparativaCliente> {
    const qs = new URLSearchParams()
    for (const id of ofertaIds ?? []) qs.append("oferta_id", id)
    const sufijo = qs.toString() ? `?${qs}` : ""
    const resp = await apiRequest<Respuesta>(
      `${BASE}/clientes/${encodeURIComponent(clienteNumero)}/comparativa${sufijo}`,
      { method: "GET", signal },
    )
    return desenvolver<{ data: ComparativaCliente }>(resp).data
  },

  async facturar(ofertaId: string): Promise<ResultadoFacturar> {
    const resp = await apiRequest<Respuesta>(`${BASE}/ofertas/${encodeURIComponent(ofertaId)}/facturar`, {
      method: "POST",
    })
    return desenvolver<ResultadoFacturar>(resp)
  },

  async noFacturar(ofertaId: string, motivo: string): Promise<void> {
    const resp = await apiRequest<Respuesta>(`${BASE}/ofertas/${encodeURIComponent(ofertaId)}/no-facturar`, {
      method: "POST",
      body: JSON.stringify({ motivo }),
    })
    desenvolver(resp)
  },

  async quitarNoFacturar(ofertaId: string): Promise<void> {
    const resp = await apiRequest<Respuesta>(`${BASE}/ofertas/${encodeURIComponent(ofertaId)}/no-facturar`, {
      method: "DELETE",
    })
    desenvolver(resp)
  },
}
