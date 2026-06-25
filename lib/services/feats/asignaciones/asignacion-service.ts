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
  AjustarCostoData,
  TransferirData,
  PlanDepreciacionFila,
  PlanDepreciacionTotales,
  PlanDepreciacionFiltros,
  MaterialCatalogo,
  MotivoMovimiento,
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
  descripcion: raw?.descripcion ?? null,
  costo: raw?.costo ?? null,
  cantidad: Number(raw?.cantidad ?? 1),
  numero_serie: raw?.numero_serie ?? null,
  fecha_asignacion: raw?.fecha_asignacion ?? null,
  fecha_inicio_depreciacion: raw?.fecha_inicio_depreciacion ?? null,
  fecha_fin_asignacion: raw?.fecha_fin_asignacion ?? null,
  asignado_por: raw?.asignado_por ?? null,
  asignado_por_nombre: raw?.asignado_por_nombre ?? null,
  activo: raw?.activo !== undefined ? Boolean(raw.activo) : true,
  fecha_actualizacion: raw?.fecha_actualizacion ?? null,
  historial: Array.isArray(raw?.historial) ? raw.historial : [],
  depreciacion_mensual: typeof raw?.depreciacion_mensual === 'number' ? raw.depreciacion_mensual : 0,
  valor_depreciado: typeof raw?.valor_depreciado === 'number' ? raw.valor_depreciado : 0,
  valor_residual: typeof raw?.valor_residual === 'number' ? raw.valor_residual : 0,
  meses_transcurridos: typeof raw?.meses_transcurridos === 'number' ? raw.meses_transcurridos : 0,
  ci: raw?.ci ? String(raw.ci) : undefined,
  instalacion_id: raw?.instalacion_id ? String(raw.instalacion_id) : undefined,
})

/**
 * Lanza un Error si la respuesta de `apiRequest` representa un fallo.
 *
 * `apiRequest` NO lanza para varios errores HTTP (400/401/404/500): cuando el
 * cuerpo trae `detail`/`error`/`success:false` devuelve el objeto en vez de
 * lanzar. Si los métodos hacen `return true`/`return res.data` sin revisarlo,
 * se muestran "éxitos" falsos aunque nada se haya persistido. Este helper
 * detecta esa forma de error y lanza con el mensaje real del backend.
 */
function assertOk(res: any, fallbackMsg: string): void {
  if (res && typeof res === 'object') {
    const httpStatus = (res as any)._httpStatus
    const isHttpError = typeof httpStatus === 'number' && httpStatus >= 400
    const isErrorShape =
      (res as any).success === false || Boolean((res as any).error) || isHttpError
    if (isErrorShape) {
      const errObj = (res as any).error
      const msg =
        (typeof (res as any).detail === 'string' && (res as any).detail) ||
        (errObj && typeof errObj === 'object' && typeof errObj.message === 'string' && errObj.message) ||
        (typeof (res as any).message === 'string' && (res as any).message) ||
        fallbackMsg
      throw new Error(msg)
    }
  }
}

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
    assertOk(res, 'No se pudo crear el medio básico')
    return res?.data ?? res
  }

  static async updateMedioBasico(id: string, data: MedioBasicoUpdateData): Promise<boolean> {
    const res = await apiRequest<any>(`/medios-basicos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    assertOk(res, 'No se pudo actualizar el medio básico')
    return true
  }

  static async deleteMedioBasico(id: string): Promise<boolean> {
    const res = await apiRequest<any>(`/medios-basicos/${id}`, { method: 'DELETE' })
    assertOk(res, 'No se pudo eliminar el medio básico')
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
    assertOk(res, 'No se pudo agregar la asignación')
    return res?.data ?? res
  }

  static async updateAsignacion(ci: string, asignacionId: string, data: AsignacionUpdateData): Promise<boolean> {
    const res = await apiRequest<any>(`/asignaciones-trabajadores/${ci}/${asignacionId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    assertOk(res, 'No se pudo actualizar la asignación')
    return true
  }

  /**
   * Soft-delete: el backend ya no expone DELETE. Para "eliminar" hay que
   * hacer PUT con cantidad=0 + motivo. La asignación queda marcada como
   * inactiva pero se conserva en el historial.
   */
  static async removeAsignacion(
    ci: string, asignacionId: string,
    motivo: MotivoMovimiento, nota?: string,
  ): Promise<boolean> {
    const res = await apiRequest<any>(`/asignaciones-trabajadores/${ci}/${asignacionId}`, {
      method: 'PUT',
      body: JSON.stringify({ cantidad: 0, motivo, ...(nota ? { nota } : {}) }),
    })
    assertOk(res, 'No se pudo eliminar la asignación')
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
    assertOk(res, 'No se pudo agregar la asignación')
    return res?.data ?? res
  }

  static async updateAsignacionInstalacion(
    tipo: TipoInstalacion,
    id: string,
    asignacionId: string,
    data: AsignacionInstalacionUpdateData
  ): Promise<boolean> {
    const res = await apiRequest<any>(`/asignaciones-instalaciones/${tipo}/${id}/${asignacionId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    assertOk(res, 'No se pudo actualizar la asignación')
    return true
  }

  static async removeAsignacionInstalacion(
    tipo: TipoInstalacion,
    id: string,
    asignacionId: string,
    motivo: MotivoMovimiento,
    nota?: string,
  ): Promise<boolean> {
    const res = await apiRequest<any>(`/asignaciones-instalaciones/${tipo}/${id}/${asignacionId}`, {
      method: 'PUT',
      body: JSON.stringify({ cantidad: 0, motivo, ...(nota ? { nota } : {}) }),
    })
    assertOk(res, 'No se pudo eliminar la asignación')
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
    assertOk(res, 'No se pudo agregar la herramienta')
    return res?.data ?? res
  }

  static async updateHerramienta(ci: string, herramientaId: string, data: HerramientaUpdateData): Promise<boolean> {
    const res = await apiRequest<any>(`/asignaciones/${ci}/herramientas/${herramientaId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    assertOk(res, 'No se pudo actualizar la herramienta')
    return true
  }

  static async removeHerramienta(
    ci: string, herramientaId: string,
    motivo: MotivoMovimiento, nota?: string,
  ): Promise<boolean> {
    const res = await apiRequest<any>(`/asignaciones-trabajadores/${ci}/herramientas/${herramientaId}`, {
      method: 'PUT',
      body: JSON.stringify({ cantidad: 0, motivo, ...(nota ? { nota } : {}) }),
    })
    assertOk(res, 'No se pudo eliminar la herramienta')
    return true
  }

  static async createHerramientaCatalogo(data: HerramientaCatalogoCreateData): Promise<HerramientaCatalogo> {
    const res = await apiRequest<any>('/asignaciones/herramientas/catalogo', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    assertOk(res, 'No se pudo crear la herramienta del catálogo')
    return res?.data ?? res
  }

  static async updateHerramientaCatalogo(materialId: string, data: HerramientaCatalogoUpdateData): Promise<boolean> {
    const res = await apiRequest<any>(`/asignaciones/herramientas/catalogo/${materialId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    assertOk(res, 'No se pudo actualizar la herramienta del catálogo')
    return true
  }

  static async deleteHerramientaCatalogo(materialId: string): Promise<boolean> {
    const res = await apiRequest<any>(`/asignaciones/herramientas/catalogo/${materialId}`, { method: 'DELETE' })
    assertOk(res, 'No se pudo eliminar la herramienta del catálogo')
    return true
  }

  // ── Ajuste de costo, transferencia y reportes ─────────────────────────────

  /** Ajusta el costo unitario de una asignación de trabajador. */
  static async ajustarCostoAsignacionTrabajador(
    ci: string, asignacionId: string, data: AjustarCostoData,
  ): Promise<boolean> {
    const res = await apiRequest<any>(`/asignaciones-trabajadores/${ci}/${asignacionId}/costo`, {
      method: 'PUT', body: JSON.stringify(data),
    })
    assertOk(res, 'No se pudo ajustar el costo')
    return true
  }

  /** Ajusta el costo unitario de una asignación de instalación. */
  static async ajustarCostoAsignacionInstalacion(
    tipo: TipoInstalacion, instalacionId: string, asignacionId: string, data: AjustarCostoData,
  ): Promise<boolean> {
    const res = await apiRequest<any>(`/asignaciones-instalaciones/${tipo}/${instalacionId}/${asignacionId}/costo`, {
      method: 'PUT', body: JSON.stringify(data),
    })
    assertOk(res, 'No se pudo ajustar el costo')
    return true
  }

  /** Transfiere una asignación de trabajador a otra entidad. */
  static async transferirAsignacionTrabajador(
    ci: string, asignacionId: string, data: TransferirData,
  ): Promise<boolean> {
    const res = await apiRequest<any>(`/asignaciones-trabajadores/${ci}/${asignacionId}/transferir`, {
      method: 'POST', body: JSON.stringify(data),
    })
    assertOk(res, 'No se pudo transferir la asignación')
    return true
  }

  /** Transfiere una asignación de instalación a otra entidad. */
  static async transferirAsignacionInstalacion(
    tipo: TipoInstalacion, instalacionId: string, asignacionId: string, data: TransferirData,
  ): Promise<boolean> {
    const res = await apiRequest<any>(`/asignaciones-instalaciones/${tipo}/${instalacionId}/${asignacionId}/transferir`, {
      method: 'POST', body: JSON.stringify(data),
    })
    assertOk(res, 'No se pudo transferir la asignación')
    return true
  }

  /** Plan de depreciación global con filtros. */
  static async getPlanDepreciacion(
    filtros: PlanDepreciacionFiltros = {},
  ): Promise<{ data: PlanDepreciacionFila[]; totales: PlanDepreciacionTotales }> {
    const qs = new URLSearchParams()
    if (filtros.entidad_tipo) qs.set('entidad_tipo', filtros.entidad_tipo)
    if (filtros.item_tipo) qs.set('item_tipo', filtros.item_tipo)
    if (filtros.desde) qs.set('desde', filtros.desde)
    if (filtros.hasta) qs.set('hasta', filtros.hasta)
    if (filtros.solo_depreciados) qs.set('solo_depreciados', 'true')
    if (filtros.solo_vigentes) qs.set('solo_vigentes', 'true')
    if (filtros.incluir_inactivas) qs.set('incluir_inactivas', 'true')
    const res = await apiRequest<any>(`/asignaciones-reportes/plan-depreciacion?${qs.toString()}`)
    return {
      data: Array.isArray(res?.data) ? res.data : [],
      totales: res?.totales ?? {
        costo_total: 0, depreciacion_mensual: 0,
        valor_depreciado: 0, valor_residual: 0, cantidad_filas: 0,
      },
    }
  }
}
