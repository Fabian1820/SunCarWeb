/**
 * Servicio para obtener términos y condiciones
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export interface TerminosCondiciones {
  id: string
  texto: string
  fecha_creacion: string
  fecha_actualizacion: string
  version: number
  activo: boolean
}

/**
 * Obtiene los términos y condiciones activos
 */
export async function obtenerTerminosActivos(): Promise<string | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/terminos-condiciones/activo`)
    
    if (!response.ok) {
      console.error('Error obteniendo términos:', response.statusText)
      return null
    }
    
    const result = await response.json()
    
    if (result.success && result.data) {
      return result.data.texto
    }
    
    return null
  } catch (error) {
    console.error('Error obteniendo términos y condiciones:', error)
    return null
  }
}

/**
 * Convierte HTML de términos a texto plano para PDF
 */
export function htmlToPlainText(html: string): string {
  // Crear elemento temporal
  if (typeof document !== 'undefined') {
    const temp = document.createElement('div')
    temp.innerHTML = html
    return temp.textContent || temp.innerText || ''
  }
  
  // Fallback para SSR: remover tags HTML básicos
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim()
}

/**
 * Parsea el HTML de términos a estructura para PDF
 */
export interface SeccionTerminos {
  titulo: string
  contenido: string[]
}

export function parseTerminosHTML(html: string): SeccionTerminos[] {
  if (typeof document === 'undefined') {
    // Fallback simple para SSR
    return [{
      titulo: 'TÉRMINOS Y CONDICIONES',
      contenido: [htmlToPlainText(html)]
    }]
  }
  
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  
  const secciones: SeccionTerminos[] = []
  
  // Buscar secciones con clase específica
  const seccionesHTML = doc.querySelectorAll('.seccion-terminos')
  
  if (seccionesHTML.length > 0) {
    seccionesHTML.forEach(seccion => {
      const titulo = seccion.querySelector('h2')?.textContent?.trim() || ''
      const contenido: string[] = []
      
      // Obtener párrafos y listas
      seccion.querySelectorAll('p, li').forEach(elem => {
        const texto = elem.textContent?.trim()
        if (texto) {
          contenido.push(texto)
        }
      })
      
      if (titulo || contenido.length > 0) {
        secciones.push({ titulo, contenido })
      }
    })
  } else {
    // Si no hay estructura específica, usar todo el texto
    const textoPlano = htmlToPlainText(html)
    if (textoPlano) {
      secciones.push({
        titulo: 'TÉRMINOS Y CONDICIONES',
        contenido: textoPlano.split('\n\n').filter(p => p.trim())
      })
    }
  }
  
  return secciones
}
