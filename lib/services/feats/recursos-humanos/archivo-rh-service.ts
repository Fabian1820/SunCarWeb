import { apiRequest } from '../../../api-config'
import type {
  ArchivoNominaRH,
  ArchivoNominaSimplificado,
  CrearArchivoNominaRequest,
  CrearArchivoNominaResponse,
} from '../../../types/feats/recursos-humanos/archivo-rh-types'

/**
 * Servicio para manejar el archivo histórico de nóminas de RRHH
 * Endpoints base: /api/archivo-rh
 */
export class ArchivoRHService {
  /**
   * Obtener historial completo de nóminas (simplificado - solo datos para listado)
   */
  static async getAllNominas(): Promise<ArchivoNominaSimplificado[]> {
    console.log('📋 Obteniendo historial simplificado de nóminas')
    const response = await apiRequest<ArchivoNominaSimplificado[]>('/archivo-rh/simplificado')
    console.log('✅ Nóminas obtenidas:', response?.length || 0)
    console.log('📊 Primera nómina (si existe):', response?.[0])
    return response || []
  }

  /**
   * Obtener historial completo de nóminas (versión completa - deprecated, usar getAllNominas)
   * @deprecated Usar getAllNominas() que retorna datos simplificados
   */
  static async getAllNominasCompleto(): Promise<ArchivoNominaRH[]> {
    console.log('📋 Obteniendo historial completo de nóminas')
    const response = await apiRequest<ArchivoNominaRH[]>('/archivo-rh')
    console.log('✅ Nóminas obtenidas:', response?.length || 0)
    console.log('📊 Primera nómina (si existe):', response?.[0])
    return response || []
  }

  /**
   * Obtener la última nómina guardada
   */
  static async getUltimaNomina(): Promise<ArchivoNominaRH | null> {
    try {
      console.log('📋 Obteniendo última nómina guardada')
      const response = await apiRequest<ArchivoNominaRH>('/archivo-rh/ultima')
      console.log('✅ Última nómina obtenida:', response.mes, '/', response.anio)
      return response
    } catch (error: any) {
      // Si no hay nóminas, retornar null
      if (error.message?.includes('404') || error.message?.includes('No se encontró')) {
        console.log('ℹ️ No hay nóminas previas')
        return null
      }
      throw error
    }
  }

  /**
   * Obtener nómina específica por mes y año (con todos los detalles incluyendo trabajadores)
   */
  static async getNominaPorPeriodo(mes: number, anio: number): Promise<ArchivoNominaRH | null> {
    console.log(`📋 Obteniendo nómina detallada de ${mes}/${anio}`)
    try {
      const response = await apiRequest<ArchivoNominaRH>(`/archivo-rh/${mes}/${anio}`)
      if (!response) {
        console.log('ℹ️ No se encontró nómina para ese período')
        return null
      }
      console.log('✅ Nómina obtenida:', response.id)
      return response
    } catch (error: any) {
      // Si el endpoint retorna null, no es un error
      if (error.message?.includes('404') || error.message?.includes('No se encontró')) {
        console.log('ℹ️ No se encontró nómina para ese período')
        return null
      }
      throw error
    }
  }

  /**
   * Obtener todas las nóminas de un año
   */
  static async getNominasPorAnio(anio: number): Promise<ArchivoNominaRH[]> {
    console.log(`📋 Obteniendo nóminas del año ${anio}`)
    const response = await apiRequest<ArchivoNominaRH[]>(`/archivo-rh/anio/${anio}`)
    console.log('✅ Nóminas obtenidas:', response?.length || 0)
    return response || []
  }

  /**
   * Verificar navegación disponible (anterior y siguiente)
   */
  static async verificarNavegacion(mes: number, anio: number): Promise<{ tiene_previo: boolean; tiene_siguiente: boolean }> {
    console.log(`🔍 Verificando navegación para ${mes}/${anio}`)
    const response = await apiRequest<{ tiene_previo: boolean; tiene_siguiente: boolean }>(`/archivo-rh/${mes}/${anio}/navegacion`)
    console.log('✅ Navegación:', response)
    return response
  }

  /**
   * Obtener nómina del periodo anterior
   */
  static async getNominaPrevio(mes: number, anio: number): Promise<ArchivoNominaRH | null> {
    console.log(`⬅️  Obteniendo nómina anterior a ${mes}/${anio}`)
    try {
      const response = await apiRequest<ArchivoNominaRH>(`/archivo-rh/${mes}/${anio}/previo`)
      if (!response) {
        console.log('ℹ️ No hay nómina anterior')
        return null
      }
      console.log('✅ Nómina anterior:', response.mes, '/', response.anio)
      return response
    } catch (error: any) {
      if (error.message?.includes('404') || error.message?.includes('No se encontró')) {
        console.log('ℹ️ No hay nómina anterior')
        return null
      }
      throw error
    }
  }

  /**
   * Obtener nómina del periodo siguiente
   */
  static async getNominaSiguiente(mes: number, anio: number): Promise<ArchivoNominaRH | null> {
    console.log(`➡️  Obteniendo nómina siguiente a ${mes}/${anio}`)
    try {
      const response = await apiRequest<ArchivoNominaRH>(`/archivo-rh/${mes}/${anio}/siguiente`)
      if (!response) {
        console.log('ℹ️ No hay nómina siguiente')
        return null
      }
      console.log('✅ Nómina siguiente:', response.mes, '/', response.anio)
      return response
    } catch (error: any) {
      if (error.message?.includes('404') || error.message?.includes('No se encontró')) {
        console.log('ℹ️ No hay nómina siguiente')
        return null
      }
      throw error
    }
  }

  /**
   * Crear nueva nómina (guardar snapshot del mes)
   * IMPORTANTE: Una vez guardada, la nómina es INMUTABLE
   */
  static async crearNomina(data: CrearArchivoNominaRequest): Promise<CrearArchivoNominaResponse> {
    console.log('💾 Guardando nueva nómina para ingreso:', data.ingreso_mensual_id)
    console.log('  - Total trabajadores:', data.trabajadores.length)
    console.log('  - Total salario calculado:', data.total_salario_calculado)
    console.log('  - Resetear trabajadores:', data.resetear_trabajadores ?? true)
    console.log('  - Crear siguiente ingreso:', data.crear_siguiente_ingreso ?? true)
    console.log('🔍 Request body completo:', JSON.stringify(data, null, 2))

    const response = await apiRequest<CrearArchivoNominaResponse>('/archivo-rh', {
      method: 'POST',
      body: JSON.stringify(data),
    })

    console.log('✅ Nómina guardada exitosamente:', response.id)
    return response
  }
}
