import { useEffect } from 'react'
import { sincronizarFuentesConBD } from '@/lib/utils/fuentes-sync'

/**
 * Hook que sincroniza automáticamente las fuentes de leads y clientes con localStorage
 * Debe llamarse en las páginas principales donde se cargan leads y clientes
 */
export function useFuentesSync(
  leads: Array<{ fuente?: string }>,
  clientes: Array<{ fuente?: string }>,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled || (leads.length === 0 && clientes.length === 0)) {
      return
    }

    // Sincronizar fuentes cuando se cargan los datos
    const todasLasFuentes = sincronizarFuentesConBD(leads, clientes)
    
    console.log('✅ Fuentes sincronizadas:', {
      total: todasLasFuentes.length,
      personalizadas: todasLasFuentes.filter(f => 
        !['Página Web', 'Instagram', 'Facebook', 'Directo', 'Mensaje de Whatsapp', 'Visita'].includes(f)
      ).length
    })
  }, [leads, clientes, enabled])
}
