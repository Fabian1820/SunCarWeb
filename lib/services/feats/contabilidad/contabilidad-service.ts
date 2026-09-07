import { apiRequest } from '../../../api-config'
import type {
  MaterialContabilidadBackend,
  TicketContabilidadBackend,
  CrearTicketRequest,
  EntradaContabilidadRequest,
} from '../../../types/feats/contabilidad/contabilidad-types'

/**
 * Faltante concreto devuelto por el backend cuando la existencia no alcanza.
 */
export interface FaltanteContabilidad {
  material_id: string
  nombre: string
  codigo?: string | null
  codigo_contabilidad?: string | null
  solicitado: number
  disponible: number | null
  falta: number | null
}

export class StockInsuficienteError extends Error {
  readonly faltantes: FaltanteContabilidad[]
  constructor(message: string, faltantes: FaltanteContabilidad[]) {
    super(message)
    this.name = 'StockInsuficienteError'
    this.faltantes = faltantes
  }
}

/**
 * `apiRequest` NO lanza ante un 400: devuelve el error como valor
 * (`{success:false, detail, _httpStatus}`). Eso hizo que durante meses se
 * emitieran facturas sin descontar nada: el rechazo del backend se ignoraba y
 * el código seguía como si la rebaja hubiera funcionado.
 *
 * No se cambia ese contrato global — 232 puntos del código dependen de él —
 * así que cada llamada de contabilidad comprueba el resultado aquí.
 */
function lanzarSiFallo(respuesta: unknown, accionDescrita: string): void {
  const r = respuesta as Record<string, unknown> | null | undefined
  if (!r || typeof r !== 'object') return
  const httpStatus = r._httpStatus as number | undefined
  if (r.success !== false && !(typeof httpStatus === 'number' && httpStatus >= 400)) return

  const detail = r.detail as Record<string, unknown> | string | undefined
  if (detail && typeof detail === 'object' && detail.code === 'STOCK_INSUFICIENTE') {
    throw new StockInsuficienteError(
      String(detail.message || 'Existencia insuficiente en contabilidad'),
      (detail.faltantes as FaltanteContabilidad[]) || [],
    )
  }

  const error = r.error as { message?: string } | undefined
  const mensaje =
    (typeof detail === 'string' && detail) ||
    error?.message ||
    (r.message as string) ||
    `No se pudo ${accionDescrita}`
  throw new Error(mensaje)
}

export class ContabilidadService {
  /**
   * Obtiene todos los materiales con código de contabilidad
   */
  static async getMaterialesContabilidad(): Promise<MaterialContabilidadBackend[]> {
    const response = await apiRequest<{ data: MaterialContabilidadBackend[] }>(
      '/materiales/contabilidad/'
    )
    return response.data || []
  }

  /**
   * Registra entrada manual de cantidad a un material
   */
  static async registrarEntrada(
    materialId: string,
    cantidad: number
  ): Promise<{ cantidad_nueva: number }> {
    const body: EntradaContabilidadRequest = { cantidad }
    const response = await apiRequest<{ cantidad_nueva: number }>(
      `/materiales/${materialId}/contabilidad/entrada`,
      {
        method: 'PATCH',
        body: JSON.stringify(body),
      }
    )
    lanzarSiFallo(response, 'registrar la entrada')
    return response
  }

  /**
   * Crea un ticket de salida (rebaja inventario)
   */
  static async crearTicket(
    materiales: { material_id: string; cantidad: number }[]
  ): Promise<TicketContabilidadBackend> {
    const body: CrearTicketRequest = { materiales }
    const response = await apiRequest<{ ticket: TicketContabilidadBackend }>(
      '/tickets-contabilidad/',
      {
        method: 'POST',
        body: JSON.stringify(body),
      }
    )
    lanzarSiFallo(response, 'rebajar el inventario contable')
    return response.ticket
  }

  /**
   * Obtiene todos los tickets de contabilidad
   */
  static async getTickets(): Promise<TicketContabilidadBackend[]> {
    const response = await apiRequest<{ data: TicketContabilidadBackend[] }>(
      '/tickets-contabilidad/'
    )
    return response.data || []
  }
}
