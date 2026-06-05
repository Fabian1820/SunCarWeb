import { apiRequest } from '../../../api-config'
import type {
  EditarPreciosCostoPayload,
  MaterialFichaResumen,
} from '../../../types/feats/fichas-costo/ficha-costo-types'

/**
 * Servicio de Fichas de Costo (modelo simplificado).
 *
 * La "ficha de costo" es la vista contable del propio material (costo, precio,
 * % rebajable, márgenes). No hay entidad versionada: los datos contables viven
 * en el documento `Material` y se leen/editan desde aquí.
 */
export class FichaCostoService {
  // Lista todos los materiales del catálogo con sus campos contables.
  static async getTodosMaterialesConFichas(): Promise<MaterialFichaResumen[]> {
    try {
      const materialesResponse = await apiRequest<{ data: any[] }>('/productos/')
      const todosMateriales = materialesResponse.data.flatMap((cat: any) =>
        (cat.materiales || [])
          .filter((m: any) => {
            // Solo incluir materiales con _id válido (ObjectId de MongoDB = 24 caracteres)
            const materialId = m._id || m.id || m.material_id
            const esValido = materialId && String(materialId).length === 24
            if (!esValido) {
              console.warn('[FichaCostoService] Material sin ObjectId válido, omitiendo:', {
                codigo: m.codigo,
                nombre: m.nombre || m.descripcion,
                _id: m._id,
                id: m.id,
                material_id: m.material_id,
              })
            }
            return esValido
          })
          .map((m: any) => {
            const materialId = m._id || m.id || m.material_id
            return {
              material_id: materialId,
              producto_id: cat.id || cat._id || cat.producto_id || '',
              codigo: m.codigo,
              nombre: m.nombre || m.descripcion || '',
              descripcion: m.descripcion || m.nombre || '',
              categoria: cat.categoria || '',
              marca: m.marca || '',
              um: typeof m.um === 'string' ? m.um : '',
              precio: typeof m.precio === 'number' ? m.precio : undefined,
              precio_instaladora: typeof m.precio_instaladora === 'number' ? m.precio_instaladora : undefined,
              porciento_rebajable_venta: typeof m.porciento_rebajable_venta === 'number' ? m.porciento_rebajable_venta : undefined,
              costo: typeof m.costo === 'number' ? m.costo : undefined,
              numero_serie: typeof m.numero_serie === 'string' ? m.numero_serie : null,
              stockaje_minimo: typeof m.stockaje_minimo === 'number' ? m.stockaje_minimo : null,
              foto: m.foto || m.imagen || (Array.isArray(m.fotos) ? m.fotos[0] : undefined),
              potenciaKW: m.potenciaKW,
            }
          })
      )

      // Modelo simplificado: sin entidad de ficha versionada.
      return todosMateriales.map((material: any) => ({
        ...material,
        ficha_activa: null,
      }))
    } catch (error) {
      console.error('[FichaCostoService] Error al obtener materiales:', error)
      throw error
    }
  }

  // Edición rápida de precios + costo de un material.
  // PUT /productos/{producto_id}/materiales/{material_codigo} con exclude_unset:
  // solo se modifican los campos enviados.
  static async editPreciosCosto(
    productoId: string,
    materialCodigo: string | number,
    payload: EditarPreciosCostoPayload
  ): Promise<boolean> {
    if (!productoId) throw new Error('producto_id requerido')
    if (materialCodigo == null || materialCodigo === '') throw new Error('codigo de material requerido')

    const body: Record<string, number | string | null> = {}
    if (typeof payload.precio === 'number') body.precio = payload.precio
    if (typeof payload.precio_instaladora === 'number') body.precio_instaladora = payload.precio_instaladora
    if (typeof payload.porciento_rebajable_venta === 'number') body.porciento_rebajable_venta = payload.porciento_rebajable_venta
    if (typeof payload.costo === 'number') body.costo = payload.costo
    if (payload.numero_serie !== undefined) body.numero_serie = payload.numero_serie
    if (payload.stockaje_minimo !== undefined) body.stockaje_minimo = payload.stockaje_minimo

    if (Object.keys(body).length === 0) return true

    const result = await apiRequest<any>(
      `/productos/${encodeURIComponent(productoId)}/materiales/${encodeURIComponent(String(materialCodigo))}`,
      {
        method: 'PUT',
        body: JSON.stringify(body),
      }
    )

    if (result && typeof result === 'object' && result.success === false) {
      throw new Error(result.message || result.error || 'Error al actualizar material')
    }
    if (result && typeof result === 'object' && result.error) {
      throw new Error(result.error)
    }
    return true
  }
}
