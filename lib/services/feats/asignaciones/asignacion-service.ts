import { apiRequest } from '../../../api-config'
import type {
  MedioBasico,
  TrabajadorConAsignaciones,
  Asignacion,
  AsignacionCreateData,
  AsignacionUpdateData,
  MedioBasicoCreateData,
  MedioBasicoUpdateData,
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
    const res = await apiRequest<{ success: boolean }>(`/medios-basicos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    return res.success === true
  }

  static async deleteMedioBasico(id: string): Promise<boolean> {
    const res = await apiRequest<{ success: boolean }>(`/medios-basicos/${id}`, {
      method: 'DELETE',
    })
    return res.success === true
  }

  // ── Asignaciones ──────────────────────────────────────────────────────────

  static async getTrabajadoresConAsignaciones(): Promise<TrabajadorConAsignaciones[]> {
    const res = await apiRequest<{ data: TrabajadorConAsignaciones[] }>('/asignaciones/')
    return res.data || []
  }

  static async getAsignacionesByCI(ci: string): Promise<Asignacion[]> {
    const res = await apiRequest<{ data: Asignacion[] }>(`/asignaciones/${ci}`)
    return res.data || []
  }

  static async addAsignacion(ci: string, data: AsignacionCreateData): Promise<Asignacion> {
    const res = await apiRequest<{ data: Asignacion }>(`/asignaciones/${ci}`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return res.data!
  }

  static async updateAsignacion(ci: string, asignacionId: string, data: AsignacionUpdateData): Promise<boolean> {
    const res = await apiRequest<{ success: boolean }>(`/asignaciones/${ci}/${asignacionId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    return res.success === true
  }

  static async removeAsignacion(ci: string, asignacionId: string): Promise<boolean> {
    const res = await apiRequest<{ success: boolean }>(`/asignaciones/${ci}/${asignacionId}`, {
      method: 'DELETE',
    })
    return res.success === true
  }

  // ── Herramientas ──────────────────────────────────────────────────────────

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
    const res = await apiRequest<{ success: boolean }>(`/asignaciones/${ci}/herramientas/${herramientaId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    return res.success === true
  }

  static async removeHerramienta(ci: string, herramientaId: string): Promise<boolean> {
    const res = await apiRequest<{ success: boolean }>(`/asignaciones/${ci}/herramientas/${herramientaId}`, {
      method: 'DELETE',
    })
    return res.success === true
  }

  // ── Catálogo de herramientas ───────────────────────────────────────────────

  static async createHerramientaCatalogo(data: HerramientaCatalogoCreateData): Promise<HerramientaCatalogo> {
    const res = await apiRequest<{ data: HerramientaCatalogo }>('/asignaciones/herramientas/catalogo', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return res.data!
  }

  static async updateHerramientaCatalogo(materialId: string, data: HerramientaCatalogoUpdateData): Promise<boolean> {
    const res = await apiRequest<{ success: boolean }>(`/asignaciones/herramientas/catalogo/${materialId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    return res.success === true
  }

  static async deleteHerramientaCatalogo(materialId: string): Promise<boolean> {
    const res = await apiRequest<{ success: boolean }>(`/asignaciones/herramientas/catalogo/${materialId}`, {
      method: 'DELETE',
    })
    return res.success === true
  }
}
