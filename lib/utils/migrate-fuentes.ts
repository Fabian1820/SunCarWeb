/**
 * Script de migración para sincronizar todas las fuentes existentes en la BD
 * Este script se puede ejecutar una vez para poblar localStorage con todas las fuentes
 */

import { LeadService, ClienteService } from '@/lib/api-services'
import { sincronizarFuentesConBD } from './fuentes-sync'

/**
 * Ejecuta la migración de fuentes desde la base de datos
 * Carga todos los leads y clientes y sincroniza sus fuentes con localStorage
 */
export async function migrarFuentesDesdeDB(): Promise<{
  success: boolean
  totalFuentes: number
  fuentesPersonalizadas: number
  error?: string
}> {
  try {
    console.log('🔄 Iniciando migración de fuentes...')

    // Cargar todos los leads
    console.log('📥 Cargando leads...')
    const leads = await LeadService.getLeads()
    console.log(`✅ ${leads.length} leads cargados`)

    // Cargar todos los clientes
    console.log('📥 Cargando clientes...')
    const clientes = await ClienteService.getClientes()
    console.log(`✅ ${clientes.length} clientes cargados`)

    // Sincronizar fuentes
    console.log('🔄 Sincronizando fuentes...')
    const todasLasFuentes = sincronizarFuentesConBD(leads, clientes)
    
    const fuentesBase = ['Página Web', 'Instagram', 'Facebook', 'Directo', 'Mensaje de Whatsapp', 'Visita']
    const fuentesPersonalizadas = todasLasFuentes.filter(f => !fuentesBase.includes(f))

    console.log('✅ Migración completada')
    console.log(`📊 Total de fuentes: ${todasLasFuentes.length}`)
    console.log(`📊 Fuentes personalizadas: ${fuentesPersonalizadas.length}`)
    console.log(`📋 Fuentes personalizadas encontradas:`, fuentesPersonalizadas)

    return {
      success: true,
      totalFuentes: todasLasFuentes.length,
      fuentesPersonalizadas: fuentesPersonalizadas.length
    }
  } catch (error) {
    console.error('❌ Error en la migración:', error)
    return {
      success: false,
      totalFuentes: 0,
      fuentesPersonalizadas: 0,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }
  }
}

/**
 * Hook para ejecutar la migración desde un componente React
 */
export function useMigrarFuentes() {
  const ejecutarMigracion = async () => {
    return await migrarFuentesDesdeDB()
  }

  return { ejecutarMigracion }
}
