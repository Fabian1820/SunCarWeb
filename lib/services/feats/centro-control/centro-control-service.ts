import { apiRequest } from "@/lib/api-config"

// ── Tipos base ───────────────────────────────────────────────────────────────

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

// ── Municipios por modo (heatmap) ────────────────────────────────────────────

export interface MunicipioModoCount {
  municipio: string
  provincia: string
  count: number
}

export interface MunicipiosPorModo {
  pendientes_instalacion: MunicipioModoCount[]
  en_proceso: MunicipioModoCount[]
  averias: MunicipioModoCount[]
  visitas: MunicipioModoCount[]
  ventas: MunicipioModoCount[]
}

// ── Ventas resumen ───────────────────────────────────────────────────────────

export interface MaterialVendido {
  nombre: string
  cantidad: number
}

export interface VentasResumen {
  total_clientes_venta: number
  total_solicitudes_despachadas: number
  materiales_vendidos: MaterialVendido[]
}

// ── Dashboard principal ──────────────────────────────────────────────────────

export interface CentroControlDashboard {
  kpis: CentroControlKpis
  operaciones: CentroControlOperaciones
  semana: CentroControlSemana
  comercial: CentroControlComercial
  municipios_detallados: Record<string, unknown>[]
  municipios_por_modo: MunicipiosPorModo
  ventas_resumen: VentasResumen
  brigadas_count: number
}

// ── Periodo stats (on-demand) ────────────────────────────────────────────────

export interface PeriodoStats {
  instalaciones_terminadas: number
  instalaciones_comenzadas: number
  nuevos_leads: number
  nuevos_clientes: number
  averias_solucionadas: number
  visitas_realizadas: number
  trabajos_diarios: number
  clientes_trabajados: number
  ofertas_creadas: number
  ofertas_confirmadas: number
  ofertas_canceladas: number
  reservas: number
  nuevos_clientes_ventas: number
  solicitudes_despachadas: number
  materiales_vendidos_unidades: number
}

// ── Análisis regional (on-demand) ────────────────────────────────────────────

export interface AnalisisRegionalClienteSlim {
  id?: string
  nombre?: string
  numero?: string
  estado?: string
  provincia_montaje?: string
  municipio?: string
  tiene_averia_pendiente: boolean
}

export interface AnalisisRegionalLeadSlim {
  id?: string
  nombre?: string
  estado?: string
  provincia_montaje?: string
  municipio?: string
}

export interface AnalisisRegionalData {
  clientes: AnalisisRegionalClienteSlim[]
  leads: AnalisisRegionalLeadSlim[]
}

// ── Clientes por mes (on-demand) ─────────────────────────────────────────────

export interface ClientesPorMesItem {
  year: number
  month: number
  count: number
}

// ── Detalle on-demand (click municipio) ──────────────────────────────────────

export interface AveriaSlim {
  tipo?: string
  descripcion?: string
  fecha?: string
  estado?: string
}

export interface ClienteSlim {
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
  averias?: AveriaSlim[]
}

export interface LeadSlim {
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

export interface ClienteVentaSlim {
  id?: string
  numero?: string
  nombre?: string
  direccion?: string
  provincia?: string
  municipio?: string
  telefono?: string
  ci?: string
}

export interface SolicitudVentaSlim {
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

export interface MunicipioClientesResponse {
  clientes: ClienteSlim[]
  leads: LeadSlim[]
  clientes_venta: ClienteVentaSlim[]
  solicitudes_usadas: SolicitudVentaSlim[]
}

export type ModoMunicipio =
  | "pendientes_instalacion"
  | "en_proceso"
  | "averias"
  | "visitas"
  | "ventas"

// ── Equipos batch ────────────────────────────────────────────────────────────

export interface CentroControlOfertaSlim {
  cliente_numero?: string
  lead_id?: string
  estado?: string
  fecha_creacion?: string
  items?: Array<{ material_codigo?: string; descripcion?: string; cantidad?: number; categoria?: string }>
  elementos_personalizados?: Array<{ descripcion?: string; cantidad?: number; categoria?: string }>
}

// ── Servicio ─────────────────────────────────────────────────────────────────

export class CentroControlService {
  /** Dashboard principal — solo stats y conteos agregados */
  static async getDashboard(
    fechaDesde: string,
    fechaHasta: string,
    forceRefresh = false,
  ): Promise<CentroControlDashboard> {
    const params = new URLSearchParams({ fecha_desde: fechaDesde, fecha_hasta: fechaHasta })
    if (forceRefresh) params.set("force_refresh", "true")
    return apiRequest<CentroControlDashboard>(`/centro-control/dashboard?${params}`)
  }

  /** On-demand: clientes/leads de un municipio al hacer click en el mapa */
  static async getMunicipioClientes(
    mode: ModoMunicipio,
    municipio: string,
  ): Promise<MunicipioClientesResponse> {
    const params = new URLSearchParams({ mode, municipio })
    return apiRequest<MunicipioClientesResponse>(`/centro-control/municipio-clientes?${params}`)
  }

  /** On-demand: brigadas cuando el usuario abre el panel */
  static async getBrigadas(): Promise<{ brigadas: Record<string, unknown>[] }> {
    return apiRequest<{ brigadas: Record<string, unknown>[] }>(`/centro-control/brigadas`)
  }

  /** On-demand: equipos al abrir un card de detalle */
  static async getEquiposBatch(numerosCliente: string[]): Promise<CentroControlOfertaSlim[]> {
    if (!numerosCliente.length) return []
    const numeros = numerosCliente.join(",")
    return apiRequest<CentroControlOfertaSlim[]>(
      `/centro-control/equipos-batch?numeros=${encodeURIComponent(numeros)}`,
    )
  }

  /** On-demand: todas las ofertas con items para el panel de Análisis Regional */
  static async getOfertasItems(): Promise<CentroControlOfertaSlim[]> {
    return apiRequest<CentroControlOfertaSlim[]>(`/centro-control/ofertas-items`)
  }

  /** On-demand: estadísticas agregadas para un rango de fechas arbitrario */
  static async getPeriodoStats(fechaDesde: string, fechaHasta: string): Promise<PeriodoStats> {
    const params = new URLSearchParams({ fecha_desde: fechaDesde, fecha_hasta: fechaHasta })
    return apiRequest<PeriodoStats>(`/centro-control/periodo-stats?${params}`)
  }

  /** On-demand: clientes y leads slim para el panel de Análisis Regional */
  static async getAnalisisRegional(): Promise<AnalisisRegionalData> {
    return apiRequest<AnalisisRegionalData>(`/centro-control/analisis-regional`)
  }

  /** On-demand: conteo de clientes agrupado por año/mes para ClientesStatsPanel */
  static async getClientesPorMes(): Promise<ClientesPorMesItem[]> {
    return apiRequest<ClientesPorMesItem[]>(`/centro-control/clientes-por-mes`)
  }
}
