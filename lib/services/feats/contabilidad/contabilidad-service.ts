import { apiRequest } from '../../../api-config'
import type {
  MaterialContabilidadBackend,
  TicketContabilidadBackend,
  CrearTicketRequest,
  EntradaContabilidadRequest,
} from '../../../types/feats/contabilidad/contabilidad-types'

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
    return apiRequest<{ cantidad_nueva: number }>(
      `/materiales/${materialId}/contabilidad/entrada`,
      {
        method: 'PATCH',
        body: JSON.stringify(body),
      }
    )
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
