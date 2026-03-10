import { apiRequest, API_BASE_URL } from '../../../api-config'
import type { DashboardEmpresaPrincipal, MunicipioDetallado } from '../../../types/feats/resultados/resultados-types'

export class ResultadosService {
  static async getDashboardPrincipal(): Promise<DashboardEmpresaPrincipal> {
    const response = await apiRequest<DashboardEmpresaPrincipal>(
      '/admin/dashboard/empresa/principal'
    )
    return response
  }

  /** Endpoint público - no requiere JWT */
  static async getMunicipiosDetallados(): Promise<MunicipioDetallado[]> {
    const url = `${API_BASE_URL.replace(/\/+$/, '')}/clientes/estadisticas/kw-equipos-clientes-por-municipio-publico`
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) throw new Error(`Error ${res.status} al cargar municipios`)
    const json = await res.json()
    // Handle both { data: [...] } and direct array responses
    return Array.isArray(json) ? json : (json.data || json.municipios || [])
  }
}
