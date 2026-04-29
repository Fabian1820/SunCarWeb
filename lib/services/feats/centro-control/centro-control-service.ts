import { apiRequest } from "@/lib/api-config"

export interface CentroControlKpis {
  total_clientes: number
  total_municipios: number
  total_kw_paneles: number
  total_kw_inversores: number
  total_kwh_baterias: number
}

export interface CentroControlOperaciones {
  pendientes_instalacion: number
  en_proceso: number
  averias_pendientes: number
  visitas_pendientes: number
}

export interface CentroControlSemana {
  instalaciones_terminadas: number
  instalaciones_comenzadas: number
  nuevos_leads: number
  nuevos_clientes: number
  averias_solucionadas: number
  visitas_realizadas: number
}

export interface CentroControlComercial {
  total_leads: number
  leads_por_estado: Array<{ estado: string; count: number }>
  ofertas_confirmadas: number
  ofertas_canceladas: number
  ofertas_reservadas: number
}

export interface CentroControlClienteSlim {
  id?: string
  numero?: string
  nombre?: string
  telefono?: string
  direccion?: string
  municipio?: string
  provincia_montaje?: string
  estado?: string
  comercial?: string
  fecha_contacto?: string
  fecha_instalacion?: string
  fecha_montaje?: string
  falta_instalacion?: string
  fecha_creacion?: string
  created_at?: string
  averias?: Array<{ tipo?: string; descripcion?: string; fecha?: string; estado?: string }>
}

export interface CentroControlLeadSlim {
  id?: string
  nombre?: string
  telefono?: string
  direccion?: string
  municipio?: string
  provincia_montaje?: string
  estado?: string
  comercial?: string
  fecha_contacto?: string
}

export interface CentroControlOfertaSlim {
  cliente_numero?: string
  lead_id?: string
  estado?: string
  fecha_creacion?: string
  /** Solo presente en respuestas on-demand (equipos-batch / ofertas-items) */
  items?: Array<{ material_codigo?: string; descripcion?: string; cantidad?: number; categoria?: string }>
  elementos_personalizados?: Array<{ descripcion?: string; cantidad?: number; categoria?: string }>
}

export interface CentroControlTrabajoDiarioSlim {
  fecha_trabajo?: string
  tipo_trabajo?: string
  instalacion_terminada?: boolean
  cierre_diario_confirmado?: boolean
  cliente_numero?: string
  cliente_nombre?: string
  cliente_telefono?: string
  cliente_direccion?: string
  fin_comentario?: string
}

export interface CentroControlClienteVentaSlim {
  id?: string
  numero?: string
  nombre?: string
  direccion?: string
  provincia?: string
  municipio?: string
  telefono?: string
  ci?: string
}

export interface CentroControlSolicitudVentaSlim {
  id?: string
  estado?: string
  materiales?: Array<{
    material_id?: string
    material_codigo?: string
    material_descripcion?: string
    descripcion?: string
    cantidad?: number
  }>
}

export interface CentroControlDashboard {
  kpis: CentroControlKpis
  operaciones: CentroControlOperaciones
  semana: CentroControlSemana
  comercial: CentroControlComercial
  clientes: CentroControlClienteSlim[]
  leads: CentroControlLeadSlim[]
  brigadas: Record<string, unknown>[]
  ofertas_confeccion: CentroControlOfertaSlim[]
  municipios_detallados: Record<string, unknown>[]
  trabajos_diarios: CentroControlTrabajoDiarioSlim[]
  clientes_venta: CentroControlClienteVentaSlim[]
  solicitudes_venta: CentroControlSolicitudVentaSlim[]
}

export class CentroControlService {
  static async getDashboard(fechaDesde: string, fechaHasta: string, forceRefresh = false): Promise<CentroControlDashboard> {
    const params = new URLSearchParams({ fecha_desde: fechaDesde, fecha_hasta: fechaHasta })
    if (forceRefresh) params.set("force_refresh", "true")
    return apiRequest<CentroControlDashboard>(`/centro-control/dashboard?${params}`)
  }

  /** Carga los items de equipos para un lote de clientes (on-demand al abrir un card de detalle) */
  static async getEquiposBatch(numerosCliente: string[]): Promise<CentroControlOfertaSlim[]> {
    if (!numerosCliente.length) return []
    const numeros = numerosCliente.join(",")
    return apiRequest<CentroControlOfertaSlim[]>(`/centro-control/equipos-batch?numeros=${encodeURIComponent(numeros)}`)
  }

  /** Carga todas las ofertas con items — para el panel de Análisis Regional (on-demand) */
  static async getOfertasItems(): Promise<CentroControlOfertaSlim[]> {
    return apiRequest<CentroControlOfertaSlim[]>(`/centro-control/ofertas-items`)
  }
}
