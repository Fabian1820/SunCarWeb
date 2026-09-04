/**
 * Servicio para obtener terminos y condiciones.
 */

import { apiRequest } from "../../api-config"

export interface TerminosCondiciones {
  id: string
  /** Texto consolidado que el backend regenera solo; no se edita a mano. */
  texto: string
  titulo: string
  formas_pago: string
  reserva_equipos: string
  garantia: string
  validez_presupuesto: string
  servicio_atencion_cliente: string
  sobre_nosotros: string
  fecha_creacion: string
  fecha_actualizacion: string
  version: number
  activo: boolean
}

/** Secciones editables desde la UI. `texto` queda fuera: lo regenera el backend. */
export const SECCIONES_TERMINOS = [
  "titulo",
  "formas_pago",
  "reserva_equipos",
  "garantia",
  "validez_presupuesto",
  "servicio_atencion_cliente",
  "sobre_nosotros",
] as const

export type SeccionTerminosKey = (typeof SECCIONES_TERMINOS)[number]

export type TerminosCondicionesEditables = Record<SeccionTerminosKey, string>

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

/**
 * Obtiene los terminos activos completos (todas las secciones), no solo el texto.
 * Devuelve null si aun no hay ninguno configurado.
 */
export async function obtenerTerminosActivosCompletos(): Promise<TerminosCondiciones | null> {
  const result = await apiRequest<TerminosActivosResponse>(
    "/terminos-condiciones/activo",
    { method: "GET" },
  )

  if (result?.success === false) return null
  return result?.data ?? null
}

/**
 * Actualiza los terminos y condiciones activos.
 *
 * El backend exige las siete secciones con contenido (min_length=1) y regenera
 * el campo `texto` a partir de ellas, por eso no se envia.
 */
export async function actualizarTerminos(
  id: string,
  secciones: TerminosCondicionesEditables,
): Promise<TerminosCondiciones> {
  const result = await apiRequest<TerminosActivosResponse>(
    `/terminos-condiciones/${id}`,
    { method: "PUT", body: JSON.stringify(secciones) },
  )

  if (result?.success === false || !result?.data) {
    throw new Error(result?.message || "No se pudieron guardar los terminos y condiciones")
  }
  return result.data
}

/**
 * Crea la primera version de terminos cuando la base aun no tiene ninguna.
 * El backend desactiva las anteriores y asigna numero de version.
 */
export async function crearTerminos(
  secciones: TerminosCondicionesEditables,
): Promise<void> {
  const result = await apiRequest<{ success?: boolean; message?: string }>(
    "/terminos-condiciones/",
    { method: "POST", body: JSON.stringify(secciones) },
  )

  if (result?.success === false) {
    throw new Error(result?.message || "No se pudieron crear los terminos y condiciones")
  }
}
