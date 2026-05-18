import { apiRequest } from '../../../api-config'
import { InventarioService } from '../inventario/inventario-service'
import { SedeService } from '../sedes/sede-service'
import { RecursosHumanosService } from '../recursos-humanos/recursos-humanos-service'
import type {
  MedioBasico,
  MedioBasicoCreateData,
  MedioBasicoUpdateData,
  TrabajadorConAsignaciones,
  Asignacion,
  AsignacionTrabajadorFlat,
  AsignacionCreateData,
  AsignacionUpdateData,
  TipoInstalacion,
  Instalacion,
  InstalacionConAsignaciones,
  AsignacionInstalacion,
  AsignacionInstalacionFlat,
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

const normalizeAsignacionFlat = (raw: any): Asignacion & { ci?: string; instalacion_id?: string } => ({
  id: String(raw?.id ?? raw?._id ?? ''),
  item_tipo: raw?.item_tipo ?? 'medio_basico',
  item_id: String(raw?.item_id ?? raw?.medio_basico_id ?? ''),
  nombre: String(raw?.nombre ?? ''),
  precio: raw?.precio ?? null,
  cantidad: Number(raw?.cantidad ?? 1),
  numero_serie: raw?.numero_serie ?? null,
  asignado_por: raw?.asignado_por ?? null,
  ci: raw?.ci ? String(raw.ci) : undefined,
  instalacion_id: raw?.instalacion_id ? String(raw.instalacion_id) : undefined,
})

export class AsignacionService {
  // ── Medios Básicos ────────────────────────────────────────────────────────

  static async getMediosBasicos(): Promise<MedioBasico[]> {
    const res = await apiRequest<any>('/medios-basicos/')
    return extractArray<any>(res).map((m: any): MedioBasico => ({
      id: String(m?.id ?? m?._id ?? ''),
      codigo: m?.codigo ?? null,
      nombre: String(m?.nombre ?? ''),
      precio: m?.precio ?? null,
      foto: m?.foto ?? null,
    }))
  }

  /**
   * Sube una foto al bucket "medios-basicos" en MinIO y devuelve la URL pública.
   * Mismo patrón que MaterialService.
   */
  static async uploadFotoMedioBasico(file: File): Promise<string> {
    if (!file.type.startsWith('image/')) {
      throw new Error('El archivo debe ser una imagen')
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('La imagen no debe superar 5MB')
    }
    const formData = new FormData()
    formData.append('foto', file)
    const result = await apiRequest<{ success: boolean; message?: string; url?: string }>(
      '/medios-basicos/upload-foto',
      {
        method: 'POST',
        body: formData,
        headers: {},
      }
    )
    if (!result.success || !result.url) {
      throw new Error(result.message || 'Error al subir la foto')
    }
    return result.url
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

  /**
   * Fuente única de verdad: lista trabajadores desde /recursos-humanos/ (que
   * incluye cargo y estado activo) y mergea las asignaciones planas devueltas
   * por /asignaciones-trabajadores/. Cualquier trabajador activo aparece en
   * la tabla aunque no tenga asignaciones todavía.
   */
  static async getTrabajadoresConAsignaciones(): Promise<TrabajadorConAsignaciones[]> {
    const [rrhhResponse, asignacionesFlat] = await Promise.all([
      RecursosHumanosService.getRecursosHumanos(),
      this.getAsignacionesTrabajadoresPlanas(),
    ])

    const porCi = new Map<string, Asignacion[]>()
    for (const a of asignacionesFlat) {
      if (!a.ci) continue
      const arr = porCi.get(a.ci) ?? []
      arr.push(a)
      porCi.set(a.ci, arr)
    }

    return (rrhhResponse.trabajadores || [])
      .filter(t => t.activo !== false)
      .map(t => ({
        CI: t.CI,
        nombre: t.nombre,
        cargo: t.cargo ?? '',
        asignaciones: porCi.get(t.CI) ?? [],
      }))
  }

  static async getAsignacionesTrabajadoresPlanas(): Promise<AsignacionTrabajadorFlat[]> {
    const res = await apiRequest<any>('/asignaciones-trabajadores/')
    return extractArray<any>(res)
      .map(normalizeAsignacionFlat)
      .filter((a): a is AsignacionTrabajadorFlat => !!a.ci) as AsignacionTrabajadorFlat[]
  }

  static async getAsignacionesByCI(ci: string): Promise<Asignacion[]> {
    const res = await apiRequest<any>(`/asignaciones-trabajadores/${ci}`)
    return extractArray<any>(res).map(normalizeAsignacionFlat)
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

  /**
   * Lista entidades (almacenes/tiendas/sedes) desde sus servicios "core" y
   * mergea las asignaciones planas devueltas por
   * /asignaciones-instalaciones/{tipo}. Toda instalación aparece, aunque no
   * tenga asignaciones aún.
   */
  static async getAsignacionesInstalaciones(tipo: TipoInstalacion): Promise<InstalacionConAsignaciones[]> {
    const [entidades, asignacionesFlat] = await Promise.all([
      this.getEntidadesPorTipo(tipo),
      this.getAsignacionesInstalacionesPlanas(tipo),
    ])

    const porId = new Map<string, AsignacionInstalacion[]>()
    for (const a of asignacionesFlat) {
      if (!a.instalacion_id) continue
      const arr = porId.get(a.instalacion_id) ?? []
      arr.push(a)
      porId.set(a.instalacion_id, arr)
    }

    return entidades.map(e => ({
      id: e.id,
      nombre: e.nombre,
      codigo: e.codigo,
      asignaciones: porId.get(e.id) ?? [],
    }))
  }

  static async getAsignacionesInstalacionesPlanas(tipo: TipoInstalacion): Promise<AsignacionInstalacionFlat[]> {
    const res = await apiRequest<any>(`/asignaciones-instalaciones/${tipo}`)
    return extractArray<any>(res)
      .map(normalizeAsignacionFlat)
      .filter((a): a is AsignacionInstalacionFlat => !!a.instalacion_id) as AsignacionInstalacionFlat[]
  }

  static async getEntidadesPorTipo(tipo: TipoInstalacion): Promise<Instalacion[]> {
    if (tipo === 'almacen') return this.getAlmacenes()
    if (tipo === 'tienda') return this.getTiendas()
    return this.getSedes()
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
