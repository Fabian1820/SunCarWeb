/* eslint-disable @typescript-eslint/no-explicit-any */

import { apiRequest } from "../../../api-config"
import type {
  SolicitudMaterial,
  SolicitudMaterialCreateData,
  SolicitudMaterialUpdateData,
  SolicitudMaterialListResponse,
  MaterialesSugeridosResponse,
  MaterialSugerido,
} from "../../../api-types"

const BASE_ENDPOINT = "/operaciones/solicitudes-materiales"
const buildDetailEndpoint = (id: string) =>
  `${BASE_ENDPOINT}/${encodeURIComponent(id)}`

export class SolicitudMaterialService {
  /**
   * List solicitudes with optional filters
   * GET /api/operaciones/solicitudes-materiales/
   */
  static async getSolicitudes(
    params: {
      cliente_id?: string
      almacen_id?: string
      trabajador_id?: string
      codigo?: string
      skip?: number
      limit?: number
    } = {},
  ): Promise<SolicitudMaterial[]> {
    const search = new URLSearchParams()
    if (params.cliente_id) search.append("cliente_id", params.cliente_id)
    if (params.almacen_id) search.append("almacen_id", params.almacen_id)
    if (params.trabajador_id) search.append("trabajador_id", params.trabajador_id)
    if (params.codigo) search.append("codigo", params.codigo)
    if (params.skip != null) search.append("skip", String(params.skip))
    if (params.limit != null) search.append("limit", String(params.limit))

    const endpoint = search.toString()
      ? `${BASE_ENDPOINT}/?${search.toString()}`
      : `${BASE_ENDPOINT}/`

    const response = await apiRequest<SolicitudMaterialListResponse | SolicitudMaterial[]>(endpoint)

    if (Array.isArray(response)) return response
    return response.solicitudes || response.data || []
  }

  /**
   * Get a single solicitud by ID
   * GET /api/operaciones/solicitudes-materiales/{solicitud_id}
   */
  static async getSolicitudById(id: string): Promise<SolicitudMaterial | null> {
    const response = await apiRequest<SolicitudMaterial>(buildDetailEndpoint(id))
    return response || null
  }

  /**
   * Create a new solicitud
   * POST /api/operaciones/solicitudes-materiales/
   * trabajador_id is taken from the session token
   */
  static async createSolicitud(
    data: SolicitudMaterialCreateData,
  ): Promise<SolicitudMaterial> {
    return apiRequest<SolicitudMaterial>(`${BASE_ENDPOINT}/`, {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  /**
   * Update a solicitud
   * PATCH /api/operaciones/solicitudes-materiales/{solicitud_id}
   */
  static async updateSolicitud(
    id: string,
    data: SolicitudMaterialUpdateData,
  ): Promise<SolicitudMaterial> {
    return apiRequest<SolicitudMaterial>(buildDetailEndpoint(id), {
      method: "PATCH",
      body: JSON.stringify(data),
    })
  }

  /**
   * Delete a solicitud
   * DELETE /api/operaciones/solicitudes-materiales/{solicitud_id}
   */
  static async deleteSolicitud(
    id: string,
  ): Promise<{ success?: boolean; message?: string }> {
    return apiRequest<{ success?: boolean; message?: string }>(
      buildDetailEndpoint(id),
      { method: "DELETE" },
    )
  }

  /**
   * Get suggested materials for a client
   * GET /api/operaciones/solicitudes-materiales/materiales-sugeridos/{cliente_id}
   */
  static async getMaterialesSugeridos(
    clienteId: string,
  ): Promise<{ materiales: MaterialSugerido[]; materiales_sin_vinculo: string[] }> {
    const response = await apiRequest<MaterialesSugeridosResponse | MaterialSugerido[]>(
      `${BASE_ENDPOINT}/materiales-sugeridos/${encodeURIComponent(clienteId)}`,
    )

    if (Array.isArray(response)) {
      return { materiales: response, materiales_sin_vinculo: [] }
    }
    return {
      materiales: response.materiales || [],
      materiales_sin_vinculo: response.materiales_sin_vinculo || [],
    }
  }
}
