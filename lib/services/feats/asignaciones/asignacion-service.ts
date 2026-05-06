import { apiRequest } from '../../../api-config'
import { InventarioService } from '../inventario/inventario-service'
import { SedeService } from '../sedes/sede-service'
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

const extractArray = <T>(response: any): T[] => {
  if (Array.isArray(response)) return response
  if (response?.data && Array.isArray(response.data)) return response.data
  return []
}

const normalizeInstalacion = (raw: any): InstalacionConAsignaciones => ({
  id: String(raw?.id ?? raw?._id ?? ''),
  nombre: String(raw?.nombre ?? ''),
  codigo: raw?.codigo ?? undefined,
  asignaciones: Array.isArray(raw?.asignaciones)
    ? raw.asignaciones.map(normalizeAsignacionInstalacion)
    : [],
})

const normalizeAsignacionInstalacion = (raw: any): AsignacionInstalacion => ({
  id: String(raw?.id ?? raw?._id ?? ''),
  item_tipo: raw?.item_tipo ?? 'medio_basico',
  item_id: String(raw?.item_id ?? ''),
  nombre: String(raw?.nombre ?? ''),
  precio: raw?.precio ?? null,
  cantidad: Number(raw?.cantidad ?? 1),
  numero_serie: raw?.numero_serie ?? null,
  asignado_por: raw?.asignado_por ?? null,
})

const normalizeTrabajador = (raw: any): TrabajadorConAsignaciones => ({
  CI: String(raw?.CI ?? raw?.ci ?? ''),
  nombre: String(raw?.nombre ?? ''),
  cargo: String(raw?.cargo ?? ''),
  asignaciones: Array.isArray(raw?.asignaciones)
    ? raw.asignaciones.map((a: any): Asignacion => ({
        id: String(a?.id ?? a?._id ?? ''),
        item_tipo: a?.item_tipo ?? 'medio_basico',
        item_id: String(a?.item_id ?? a?.medio_basico_id ?? ''),
        nombre: String(a?.nombre ?? ''),
        precio: a?.precio ?? null,
        cantidad: Number(a?.cantidad ?? 1),
        numero_serie: a?.numero_serie ?? null,
        asignado_por: a?.asignado_por ?? null,
      }))
    : [],
})

export class AsignacionService {
  // ── Medios Básicos ────────────────────────────────────────────────────────

  static async getMediosBasicos(): Promise<MedioBasico[]> {
    const res = await apiRequest<any>('/medios-basicos/')
    return extractArray<MedioBasico>(res)
  }

  static async createMedioBasico(data: MedioBasicoCreateData): Promise<MedioBasico> {
    const res = await apiRequest<any>('/medios-basicos/', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return res?.data ?? res
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
    const res = await apiRequest<any>('/asignaciones-trabajadores/')
    return extractArray<any>(res).map(normalizeTrabajador)
  }

  static async getAsignacionesByCI(ci: string): Promise<Asignacion[]> {
    const res = await apiRequest<any>(`/asignaciones-trabajadores/${ci}`)
    const raw = extractArray<any>(res)
    return raw.map((a: any): Asignacion => ({
      id: String(a?.id ?? a?._id ?? ''),
      item_tipo: a?.item_tipo ?? 'medio_basico',
      item_id: String(a?.item_id ?? a?.medio_basico_id ?? ''),
      nombre: String(a?.nombre ?? ''),
      precio: a?.precio ?? null,
      cantidad: Number(a?.cantidad ?? 1),
      numero_serie: a?.numero_serie ?? null,
      asignado_por: a?.asignado_por ?? null,
    }))
  }

  static async addAsignacion(ci: string, data: AsignacionCreateData): Promise<Asignacion> {
    const res = await apiRequest<any>(`/asignaciones-trabajadores/${ci}`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return res?.data ?? res
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

  // ── Entidades de instalación (reutiliza servicios existentes normalizados) ─

  static async getAlmacenes(): Promise<Instalacion[]> {
    const data = await InventarioService.getAlmacenes()
    return data.map(a => ({
      id: String((a as any).id ?? (a as any)._id ?? ''),
      nombre: a.nombre,
      codigo: (a as any).codigo ?? undefined,
    }))
  }

  static async getTiendas(): Promise<Instalacion[]> {
    const data = await InventarioService.getTiendas()
    return data.map(t => ({
      id: String((t as any).id ?? (t as any)._id ?? ''),
      nombre: t.nombre,
      codigo: (t as any).codigo ?? undefined,
    }))
  }

  static async getSedes(): Promise<Instalacion[]> {
    const data = await SedeService.getSedes()
    return data.map(s => ({
      id: String(s.id ?? ''),
      nombre: s.nombre,
    }))
  }

  // ── Asignaciones instalaciones ────────────────────────────────────────────

  static async getAsignacionesInstalaciones(tipo: TipoInstalacion): Promise<InstalacionConAsignaciones[]> {
    const res = await apiRequest<any>(`/asignaciones-instalaciones/${tipo}`)
    return extractArray<any>(res).map(normalizeInstalacion)
  }

  static async getAsignacionInstalacion(tipo: TipoInstalacion, id: string): Promise<InstalacionConAsignaciones | null> {
    const res = await apiRequest<any>(`/asignaciones-instalaciones/${tipo}/${id}`)
    const raw = res?.data ?? res
    if (!raw) return null
    return normalizeInstalacion(raw)
  }

  static async addAsignacionInstalacion(
    tipo: TipoInstalacion,
    id: string,
    data: AsignacionInstalacionCreateData
  ): Promise<AsignacionInstalacion> {
    const res = await apiRequest<any>(`/asignaciones-instalaciones/${tipo}/${id}`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return res?.data ?? res
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

  // ── Catálogo de materiales (usa /productos/admin/materiales) ──────────────

  static async getMaterialesCatalogo(q?: string, categoria?: string): Promise<MaterialCatalogo[]> {
    const qs = new URLSearchParams()
    if (q) qs.set('q', q)
    if (categoria) qs.set('categoria', categoria)
    if (!q && !categoria) qs.set('limit', '50')
    const res = await apiRequest<any>(`/productos/admin/materiales?${qs.toString()}`)
    const items: any[] = Array.isArray(res) ? res : (res?.data ?? [])
    return items.map((item: any): MaterialCatalogo => ({
      material_id: String(item.material_id ?? item.codigo ?? ''),
      nombre: String(item.nombre ?? item.descripcion ?? ''),
      categoria: String(item.categoria ?? ''),
      precio: typeof item.precio === 'number' ? item.precio : null,
    }))
  }

  // ── Herramientas (legacy) ─────────────────────────────────────────────────

  static async getCatalogoHerramientas(): Promise<HerramientaCatalogo[]> {
    const res = await apiRequest<any>('/asignaciones/herramientas/catalogo')
    return extractArray<HerramientaCatalogo>(res)
  }

  static async getHerramientasByCI(ci: string): Promise<HerramientaAsignada[]> {
    const res = await apiRequest<any>(`/asignaciones/${ci}/herramientas`)
    return extractArray<HerramientaAsignada>(res)
  }

  static async addHerramienta(ci: string, data: HerramientaAsignarData): Promise<HerramientaAsignada> {
    const res = await apiRequest<any>(`/asignaciones/${ci}/herramientas`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return res?.data ?? res
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
    const res = await apiRequest<any>('/asignaciones/herramientas/catalogo', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return res?.data ?? res
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
