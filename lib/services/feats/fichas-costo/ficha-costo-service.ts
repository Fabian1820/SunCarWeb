import { apiRequest } from '../../../api-config'
import type { MaterialFichaResumen } from '../../../types/feats/fichas-costo/ficha-costo-types'

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
}
