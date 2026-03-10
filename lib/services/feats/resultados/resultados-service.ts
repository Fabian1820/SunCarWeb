import { apiRequest } from '../../../api-config'
import type { DashboardEmpresaPrincipal } from '../../../types/feats/resultados/resultados-types'

export class ResultadosService {
  static async getDashboardPrincipal(): Promise<DashboardEmpresaPrincipal> {
    const response = await apiRequest<DashboardEmpresaPrincipal>(
      '/admin/dashboard/empresa/principal'
    )
    return response
  }
}
