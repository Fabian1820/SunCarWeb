import { apiRequest } from "@/lib/api-config"
import type {
  AveriaPendiente,
  EntradaReservaAveria,
  FaltanteStock,
  MaterialesDeAveria,
  Paginado,
  SacarMaterialesData,
  SalidaCreada,
  SalidaReservaAveria,
  StockReservaAveria,
} from "@/lib/types/feats/reservas-averias/reservas-averias-types"

const BASE = "/operaciones/almacen-reservas-averias"

/** Falta stock de uno o más materiales: `faltantes` dice cuáles y cuánto hay. */
export class StockInsuficienteError extends Error {
  faltantes: FaltanteStock[]

  constructor(message: string, faltantes: FaltanteStock[]) {
    super(message)
    this.name = "StockInsuficienteError"
    this.faltantes = faltantes
  }
}

function mensajeError(raw: any): string | null {
  if (!raw || raw.success !== false) return null
  if (typeof raw.detail === "string") return raw.detail
  if (typeof raw.error?.message === "string") return raw.error.message
  if (typeof raw.message === "string") return raw.message
  return "Error en la solicitud"
}

export const ReservasAveriasService = {
  async getAlmacen(): Promise<{ id: string; nombre: string; codigo?: string }> {
    const raw = await apiRequest<any>(`${BASE}/almacen`)
    const error = mensajeError(raw)
    if (error) throw new Error(error)
    return raw.data
  },

  async getStock(params: { q?: string; cliente_numero?: string } = {}): Promise<StockReservaAveria[]> {
    const search = new URLSearchParams()
    if (params.q?.trim()) search.set("q", params.q.trim())
    if (params.cliente_numero?.trim()) search.set("cliente_numero", params.cliente_numero.trim())
    const qs = search.toString()
    const raw = await apiRequest<any>(`${BASE}/stock${qs ? `?${qs}` : ""}`)
    const error = mensajeError(raw)
    if (error) throw new Error(error)
    return Array.isArray(raw?.data) ? raw.data : []
  },

  async getAveriasPendientes(clienteNumero: string): Promise<AveriaPendiente[]> {
    const raw = await apiRequest<any>(
      `${BASE}/clientes/${encodeURIComponent(clienteNumero)}/averias-pendientes`,
    )
    const error = mensajeError(raw)
    if (error) throw new Error(error)
    return Array.isArray(raw?.data) ? raw.data : []
  },

  /** Crea la solicitud y el vale de salida a la vez. Lanza StockInsuficienteError si algo no alcanza. */
  async sacarMateriales(data: SacarMaterialesData): Promise<SalidaCreada> {
    const raw = await apiRequest<any>(`${BASE}/salidas`, {
      method: "POST",
      body: JSON.stringify(data),
    })
    if (raw?.code === "stock_insuficiente" && Array.isArray(raw?.faltantes)) {
      throw new StockInsuficienteError(raw.detail || "Stock insuficiente", raw.faltantes)
    }
    const error = mensajeError(raw)
    if (error) throw new Error(error)
    return raw.data
  },

  async getSalidas(params: { skip?: number; limit?: number; q?: string; estado?: string } = {}): Promise<Paginado<SalidaReservaAveria>> {
    const search = new URLSearchParams()
    search.set("skip", String(params.skip ?? 0))
    search.set("limit", String(params.limit ?? 50))
    if (params.q?.trim()) search.set("q", params.q.trim())
    if (params.estado) search.set("estado", params.estado)
    const raw = await apiRequest<any>(`${BASE}/salidas?${search.toString()}`)
    const error = mensajeError(raw)
    if (error) throw new Error(error)
    return { data: Array.isArray(raw?.data) ? raw.data : [], total: Number(raw?.total ?? 0) }
  },

  async getEntradas(params: { skip?: number; limit?: number } = {}): Promise<Paginado<EntradaReservaAveria>> {
    const search = new URLSearchParams()
    search.set("skip", String(params.skip ?? 0))
    search.set("limit", String(params.limit ?? 50))
    const raw = await apiRequest<any>(`${BASE}/entradas?${search.toString()}`)
    const error = mensajeError(raw)
    if (error) throw new Error(error)
    return { data: Array.isArray(raw?.data) ? raw.data : [], total: Number(raw?.total ?? 0) }
  },

  /** Materiales que se llevaron para una avería (lo usa Trabajos diarios). */
  async getMaterialesDeAveria(averiaId: string): Promise<MaterialesDeAveria | null> {
    const raw = await apiRequest<any>(`${BASE}/averias/${encodeURIComponent(averiaId)}/materiales`)
    const error = mensajeError(raw)
    if (error) throw new Error(error)
    return raw?.data ?? null
  },
}
