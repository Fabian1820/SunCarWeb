/**
 * Servicio para obtener terminos y condiciones.
 */

import { apiRequest } from "../../api-config"

export interface TerminosCondiciones {
  id: string
  texto: string
  fecha_creacion: string
  fecha_actualizacion: string
  version: number
  activo: boolean
}

interface TerminosActivosResponse {
  success?: boolean
  message?: string
  data?: TerminosCondiciones
}

/**
 * Obtiene los terminos y condiciones activos.
 */
export async function obtenerTerminosActivos(): Promise<string | null> {
  try {
    const result = await apiRequest<TerminosActivosResponse>(
      "/terminos-condiciones/activo",
      { method: "GET" },
    )

    if (result?.success === false) {
      console.error(
        "Error obteniendo terminos:",
        result.message || "Respuesta no exitosa",
      )
      return null
    }

    return result?.data?.texto || null
  } catch (error) {
    console.error("Error obteniendo terminos y condiciones:", error)
    return null
  }
}

/**
 * Convierte HTML de terminos a texto plano para PDF.
 */
export function htmlToPlainText(html: string): string {
  if (typeof document !== "undefined") {
    const temp = document.createElement("div")
    temp.innerHTML = html
    return temp.textContent || temp.innerText || ""
  }

  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .trim()
}

/**
 * Parsea el HTML de terminos a estructura para PDF.
 */
export interface SeccionTerminos {
  titulo: string
  contenido: string[]
}

export function parseTerminosHTML(html: string): SeccionTerminos[] {
  if (typeof document === "undefined") {
    return [
      {
        titulo: "TERMINOS Y CONDICIONES",
        contenido: [htmlToPlainText(html)],
      },
    ]
  }

  const parser = new DOMParser()
  const doc = parser.parseFromString(html, "text/html")

  const secciones: SeccionTerminos[] = []
  const seccionesHTML = doc.querySelectorAll(".seccion-terminos")

  if (seccionesHTML.length > 0) {
    seccionesHTML.forEach((seccion) => {
      const titulo = seccion.querySelector("h2")?.textContent?.trim() || ""
      const contenido: string[] = []

      seccion.querySelectorAll("p, li").forEach((elem) => {
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
    const textoPlano = htmlToPlainText(html)
    if (textoPlano) {
      secciones.push({
        titulo: "TERMINOS Y CONDICIONES",
        contenido: textoPlano.split("\n\n").filter((p) => p.trim()),
      })
    }
  }

  return secciones
}
