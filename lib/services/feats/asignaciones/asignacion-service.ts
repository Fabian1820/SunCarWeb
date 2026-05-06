import { apiRequest } from '../../../api-config'
import type {
  MedioBasico,
  MedioBasicoCreateData,
  MedioBasicoUpdateData,
  TrabajadorConAsignaciones,
  Asignacion,
  AsignacionCreateData,
  AsignacionUpdateData,
  TipoInstalacion,
  Instalacion,
  InstalacionConAsignaciones,
  AsignacionInstalacion,
  AsignacionInstalacionCreateData,
  AsignacionInstalacionUpdateData,
  MaterialCatalogo,
  HerramientaCatalogo,
  HerramientaAsignada,
  HerramientaAsignarData,
  HerramientaUpdateData,
  HerramientaCatalogoCreateData,
  HerramientaCatalogoUpdateData,
} from '../../../types/feats/asignaciones/asignacion-types'

export class AsignacionService {
  // ── Medios Básicos ────────────────────────────────────────────────────────

  static async getMediosBasicos(): Promise<MedioBasico[]> {
    const res = await apiRequest<{ data: MedioBasico[] }>('/medios-basicos/')
    return res.data || []
  }

  static async createMedioBasico(data: MedioBasicoCreateData): Promise<MedioBasico> {
    const res = await apiRequest<{ data: MedioBasico }>('/medios-basicos/', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return res.data!
  }

  static async updateMedioBasico(id: string, data: MedioBasicoUpdateData): Promise<boolean> {
    await apiRequest(`/medios-basicos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    return true
  }

  static async deleteMedioBasico(id: string): Promise<boolean> {
    await apiRequest(`/medios-basicos/${id}`, { method: 'DELETE' })
    return true
  }

  // ── Asignaciones trabajadores ─────────────────────────────────────────────

  static async getTrabajadoresConAsignaciones(): Promise<TrabajadorConAsignaciones[]> {
    const res = await apiRequest<{ data: TrabajadorConAsignaciones[] }>('/asignaciones-trabajadores/')
    return res.data || []
  }

  static async getAsignacionesByCI(ci: string): Promise<Asignacion[]> {
    const res = await apiRequest<{ data: Asignacion[] }>(`/asignaciones-trabajadores/${ci}`)
    return res.data || []
  }

  static async addAsignacion(ci: string, data: AsignacionCreateData): Promise<Asignacion> {
    const res = await apiRequest<{ data: Asignacion }>(`/asignaciones-trabajadores/${ci}`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return res.data!
  }

  static async updateAsignacion(ci: string, asignacionId: string, data: AsignacionUpdateData): Promise<boolean> {
    await apiRequest(`/asignaciones-trabajadores/${ci}/${asignacionId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    return true
  }

  static async removeAsignacion(ci: string, asignacionId: string): Promise<boolean> {
    await apiRequest(`/asignaciones-trabajadores/${ci}/${asignacionId}`, { method: 'DELETE' })
    return true
  }

  // ── Entidades de instalación (para selectores) ────────────────────────────

  static async getAlmacenes(): Promise<Instalacion[]> {
    const res = await apiRequest<{ data: Instalacion[] } | Instalacion[]>('/almacenes/')
    return Array.isArray(res) ? res : (res.data || [])
  }

  static async getTiendas(): Promise<Instalacion[]> {
    const res = await apiRequest<{ data: Instalacion[] } | Instalacion[]>('/tiendas/')
    return Array.isArray(res) ? res : (res.data || [])
  }

  static async getSedes(): Promise<Instalacion[]> {
    const res = await apiRequest<{ data: Instalacion[] } | Instalacion[]>('/sedes/')
    return Array.isArray(res) ? res : (res.data || [])
  }

  // ── Asignaciones instalaciones ────────────────────────────────────────────

  static async getAsignacionesInstalaciones(tipo: TipoInstalacion): Promise<InstalacionConAsignaciones[]> {
    const res = await apiRequest<{ data: InstalacionConAsignaciones[] }>(`/asignaciones-instalaciones/${tipo}`)
    return res.data || []
  }

  static async getAsignacionInstalacion(tipo: TipoInstalacion, id: string): Promise<InstalacionConAsignaciones | null> {
    const res = await apiRequest<{ data: InstalacionConAsignaciones }>(`/asignaciones-instalaciones/${tipo}/${id}`)
    return res.data || null
  }

  static async addAsignacionInstalacion(
    tipo: TipoInstalacion,
    id: string,
    data: AsignacionInstalacionCreateData
  ): Promise<AsignacionInstalacion> {
    const res = await apiRequest<{ data: AsignacionInstalacion }>(`/asignaciones-instalaciones/${tipo}/${id}`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return res.data!
  }

  static async updateAsignacionInstalacion(
    tipo: TipoInstalacion,
    id: string,
    asignacionId: string,
    data: AsignacionInstalacionUpdateData
  ): Promise<boolean> {
    await apiRequest(`/asignaciones-instalaciones/${tipo}/${id}/${asignacionId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    return true
  }

  static async removeAsignacionInstalacion(
    tipo: TipoInstalacion,
    id: string,
    asignacionId: string
  ): Promise<boolean> {
    await apiRequest(`/asignaciones-instalaciones/${tipo}/${id}/${asignacionId}`, { method: 'DELETE' })
    return true
  }

  // ── Catálogo de materiales ────────────────────────────────────────────────

  static async getMaterialesCatalogo(q?: string, categoria?: string): Promise<MaterialCatalogo[]> {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (categoria) params.set('categoria', categoria)
    const query = params.toString()
    const res = await apiRequest<{ data: MaterialCatalogo[] } | MaterialCatalogo[]>(
      `/productos/admin/materiales${query ? `?${query}` : ''}`
    )
    return Array.isArray(res) ? res : (res.data || [])
  }

  // ── Herramientas (legacy) ─────────────────────────────────────────────────

  static async getCatalogoHerramientas(): Promise<HerramientaCatalogo[]> {
    const res = await apiRequest<{ data: HerramientaCatalogo[] }>('/asignaciones/herramientas/catalogo')
    return res.data || []
  }

  static async getHerramientasByCI(ci: string): Promise<HerramientaAsignada[]> {
    const res = await apiRequest<{ data: HerramientaAsignada[] }>(`/asignaciones/${ci}/herramientas`)
    return res.data || []
  }

  static async addHerramienta(ci: string, data: HerramientaAsignarData): Promise<HerramientaAsignada> {
    const res = await apiRequest<{ data: HerramientaAsignada }>(`/asignaciones/${ci}/herramientas`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return res.data!
  }

  static async updateHerramienta(ci: string, herramientaId: string, data: HerramientaUpdateData): Promise<boolean> {
    await apiRequest(`/asignaciones/${ci}/herramientas/${herramientaId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    return true
  }

  static async removeHerramienta(ci: string, herramientaId: string): Promise<boolean> {
    await apiRequest(`/asignaciones/${ci}/herramientas/${herramientaId}`, { method: 'DELETE' })
    return true
  }

  static async createHerramientaCatalogo(data: HerramientaCatalogoCreateData): Promise<HerramientaCatalogo> {
    const res = await apiRequest<{ data: HerramientaCatalogo }>('/asignaciones/herramientas/catalogo', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return res.data!
  }

  static async updateHerramientaCatalogo(materialId: string, data: HerramientaCatalogoUpdateData): Promise<boolean> {
    await apiRequest(`/asignaciones/herramientas/catalogo/${materialId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    return true
  }

  static async deleteHerramientaCatalogo(materialId: string): Promise<boolean> {
    await apiRequest(`/asignaciones/herramientas/catalogo/${materialId}`, { method: 'DELETE' })
    return true
  }
}
