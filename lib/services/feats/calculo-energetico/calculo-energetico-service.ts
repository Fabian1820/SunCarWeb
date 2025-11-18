import { apiRequest } from '../../../api-config'
import type {
  CalculoEnergeticoCategoria,
  CategoriasListResponse,
  CategoriaGetResponse,
  EquipoCreateRequest,
  EquipoCreateResponse,
  EquipoUpdateRequest,
  EquipoUpdateResponse,
  EquipoDeleteResponse,
} from '../../../types/calculo-energetico-types'

export class CalculoEnergeticoService {
  static async getCategorias(): Promise<CalculoEnergeticoCategoria[]> {
    const response = await apiRequest<CategoriasListResponse>('/calculo-energetico/')
    return response.data || []
  }

  static async getCategoriaById(categoriaId: string): Promise<CalculoEnergeticoCategoria | null> {
    const response = await apiRequest<CategoriaGetResponse>(`/calculo-energetico/${categoriaId}`)
    return response.data || null
  }

  static async createEquipo(payload: EquipoCreateRequest): Promise<EquipoCreateResponse> {
    return apiRequest<EquipoCreateResponse>('/calculo-energetico/equipo', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  }

  static async updateEquipo(
    categoriaId: string,
    equipoNombre: string,
    payload: EquipoUpdateRequest
  ): Promise<EquipoUpdateResponse> {
    const encodedNombre = encodeURIComponent(equipoNombre)
    return apiRequest<EquipoUpdateResponse>(`/calculo-energetico/${categoriaId}/equipo/${encodedNombre}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  }

  static async deleteEquipo(categoriaId: string, equipoNombre: string): Promise<EquipoDeleteResponse> {
    const encodedNombre = encodeURIComponent(equipoNombre)
    return apiRequest<EquipoDeleteResponse>(`/calculo-energetico/${categoriaId}/equipo/${encodedNombre}`, {
      method: 'DELETE',
    })
  }
}
