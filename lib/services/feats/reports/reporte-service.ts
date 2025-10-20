import { apiRequest } from '../../../api-config'

export class ReporteService {
  static async getReportes(params: {
    tipo_reporte?: string
    cliente_numero?: string
    fecha_inicio?: string
    fecha_fin?: string
    lider_ci?: string
  } = {}) {
    const search = new URLSearchParams()
    if (params.tipo_reporte) search.append('tipo_reporte', params.tipo_reporte)
    if (params.cliente_numero) search.append('cliente_numero', params.cliente_numero)
    if (params.fecha_inicio) search.append('fecha_inicio', params.fecha_inicio)
    if (params.fecha_fin) search.append('fecha_fin', params.fecha_fin)
    if (params.lider_ci) search.append('lider_ci', params.lider_ci)
    const endpoint = `/reportes/${search.toString() ? `?${search.toString()}` : ''}`
    return apiRequest(endpoint)
  }

  static async getReportesPorCliente(
    numero: string,
    params: {
      tipo_reporte?: string
      fecha_inicio?: string
      fecha_fin?: string
      lider_ci?: string
    } = {}
  ) {
    const search = new URLSearchParams()
    if (params.tipo_reporte) search.append('tipo_reporte', params.tipo_reporte)
    if (params.fecha_inicio) search.append('fecha_inicio', params.fecha_inicio)
    if (params.fecha_fin) search.append('fecha_fin', params.fecha_fin)
    if (params.lider_ci) search.append('lider_ci', params.lider_ci)
    const endpoint = `/reportes/cliente/${numero}${search.toString() ? `?${search.toString()}` : ''}`
    return apiRequest(endpoint)
  }
}
