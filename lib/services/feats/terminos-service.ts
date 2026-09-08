/**
 * Servicio para obtener terminos y condiciones.
 */

import { apiRequest } from "../../api-config"

/**
 * BTB y BTC tienen texto legal distinto: cada uno vive en su propio
 * documento "activo" e independiente (versionado por separado).
 */
export type TipoNegocioTerminos = "BTB" | "BTC"

export interface VarianteSeccionPersonalizada {
  identificador: string
  texto: string
}

export interface SeccionPersonalizada {
  id: string
  titulo: string
  /** Si está apagada no sale en ningún export hasta que se vuelva a prender aquí mismo. */
  activa: boolean
  variantes: VarianteSeccionPersonalizada[]
}

export interface TerminosCondiciones {
  id: string
  tipo_negocio?: TipoNegocioTerminos
  /** Texto consolidado que el backend regenera solo; no se edita a mano. */
  texto: string
  titulo: string
  formas_pago: string
  reserva_equipos: string
  garantia: string
  validez_presupuesto: string
  servicio_atencion_cliente: string
  sobre_nosotros: string
  /** Secciones extra agregadas a mano, además de las 7 fijas de arriba. */
  secciones_personalizadas: SeccionPersonalizada[]
  /**
   * Orden real de impresión (fijas + personalizadas mezcladas), ya resuelto
   * por el backend — nunca viene vacío en lo que devuelve la API, aunque el
   * campo pueda estar vacío en documentos legacy sin tocar.
   */
  orden_secciones: string[]
  /** Subconjunto de SECCIONES_FIJAS_KEYS que no sale en el export. */
  secciones_fijas_desactivadas: string[]
  /**
   * Variantes alternativas de las 6 secciones fijas, por clave. Sin entrada
   * para una clave, esa sección solo tiene el texto de siempre (el campo
   * escalar homónimo, ej. `garantia`). Con entrada, ese campo escalar
   * siempre refleja la primera variante de la lista.
   */
  variantes_secciones_fijas: Record<string, VarianteSeccionPersonalizada[]>
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

/**
 * Las 6 secciones fijas que se pueden reordenar/apagar (mismo orden y
 * exclusión de "titulo" que en el backend: es el encabezado del documento,
 * no una sección con su propio label).
 */
export const SECCIONES_FIJAS_KEYS = [
  "formas_pago",
  "reserva_equipos",
  "garantia",
  "validez_presupuesto",
  "servicio_atencion_cliente",
  "sobre_nosotros",
] as const

export type SeccionFijaKey = (typeof SECCIONES_FIJAS_KEYS)[number]

export const SECCIONES_FIJAS_LABELS: Record<SeccionFijaKey, string> = {
  formas_pago: "Formas de pago",
  reserva_equipos: "Reserva de equipos",
  garantia: "Garantía",
  validez_presupuesto: "Validez del presupuesto",
  servicio_atencion_cliente: "Servicio de atención al cliente",
  sobre_nosotros: "Sobre nosotros",
}

function esSeccionFija(clave: string): clave is SeccionFijaKey {
  return (SECCIONES_FIJAS_KEYS as readonly string[]).includes(clave)
}

/**
 * Etiqueta legible de cualquier clave del orden de secciones (fija o
 * personalizada), para listarlas en el selector de "insertar después de".
 */
export function etiquetaDeClaveSeccion(
  clave: string,
  terminos: Pick<TerminosCondiciones, "secciones_personalizadas">,
): string {
  if (esSeccionFija(clave)) return SECCIONES_FIJAS_LABELS[clave]
  return (
    terminos.secciones_personalizadas.find((s) => s.id === clave)?.titulo ?? clave
  )
}

interface TerminosActivosResponse {
  success?: boolean
  message?: string
  data?: TerminosCondiciones
}

/**
 * Obtiene los terminos y condiciones activos de un tipo_negocio (BTB/BTC).
 */
export async function obtenerTerminosActivos(
  tipoNegocio: TipoNegocioTerminos,
): Promise<string | null> {
  try {
    const result = await apiRequest<TerminosActivosResponse>(
      `/terminos-condiciones/activo?tipo_negocio=${tipoNegocio}`,
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
 * Obtiene los terminos activos completos (todas las secciones) de un
 * tipo_negocio (BTB/BTC), no solo el texto. Devuelve null si aun no hay
 * ninguno configurado para ese tipo.
 */
export async function obtenerTerminosActivosCompletos(
  tipoNegocio: TipoNegocioTerminos,
): Promise<TerminosCondiciones | null> {
  const result = await apiRequest<TerminosActivosResponse>(
    `/terminos-condiciones/activo?tipo_negocio=${tipoNegocio}`,
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
 * Crea la primera version de terminos para un tipo_negocio (BTB/BTC) cuando
 * ese tipo aun no tiene ninguna. El backend desactiva las versiones
 * anteriores DEL MISMO tipo_negocio y asigna numero de version (BTB y BTC
 * se versionan por separado).
 */
export async function crearTerminos(
  tipoNegocio: TipoNegocioTerminos,
  secciones: TerminosCondicionesEditables,
): Promise<void> {
  const result = await apiRequest<{ success?: boolean; message?: string }>(
    "/terminos-condiciones/",
    {
      method: "POST",
      body: JSON.stringify({ ...secciones, tipo_negocio: tipoNegocio }),
    },
  )

  if (result?.success === false) {
    throw new Error(result?.message || "No se pudieron crear los terminos y condiciones")
  }
}

function extraerTerminos(result: TerminosActivosResponse, mensajePorDefecto: string): TerminosCondiciones {
  if (result?.success === false || !result?.data) {
    throw new Error(result?.message || mensajePorDefecto)
  }
  return result.data
}

/**
 * Agrega una sección nueva con una única variante inicial ("Estándar").
 *
 * `insertarDespues` decide dónde queda en el orden de impresión: sin
 * pasarlo = al final, "" = al principio, o la clave de otra sección (fija o
 * personalizada) para quedar justo después de ella.
 */
export async function agregarSeccionPersonalizada(
  terminosId: string,
  titulo: string,
  texto: string,
  insertarDespues?: string,
): Promise<TerminosCondiciones> {
  const result = await apiRequest<TerminosActivosResponse>(
    `/terminos-condiciones/${terminosId}/secciones`,
    {
      method: "POST",
      body: JSON.stringify({
        titulo,
        texto,
        ...(insertarDespues !== undefined ? { insertar_despues: insertarDespues } : {}),
      }),
    },
  )
  return extraerTerminos(result, "No se pudo agregar la sección")
}

/** Reemplaza el orden completo de impresión (fijas + personalizadas). */
export async function reordenarSecciones(
  terminosId: string,
  orden: string[],
): Promise<TerminosCondiciones> {
  const result = await apiRequest<TerminosActivosResponse>(
    `/terminos-condiciones/${terminosId}/orden-secciones`,
    { method: "PUT", body: JSON.stringify({ orden }) },
  )
  return extraerTerminos(result, "No se pudo actualizar el orden")
}

/** Prende o apaga una de las 6 secciones fijas (formas_pago, garantia...). */
export async function alternarSeccionFija(
  terminosId: string,
  clave: SeccionFijaKey,
  activa: boolean,
): Promise<TerminosCondiciones> {
  const result = await apiRequest<TerminosActivosResponse>(
    `/terminos-condiciones/${terminosId}/secciones-fijas/${clave}`,
    { method: "PATCH", body: JSON.stringify({ activa }) },
  )
  return extraerTerminos(result, "No se pudo actualizar la sección")
}

/** Renombra el título de la sección y/o la prende o apaga para exportación. */
export async function editarSeccionPersonalizada(
  terminosId: string,
  seccionId: string,
  cambios: { titulo?: string; activa?: boolean },
): Promise<TerminosCondiciones> {
  const result = await apiRequest<TerminosActivosResponse>(
    `/terminos-condiciones/${terminosId}/secciones/${seccionId}`,
    { method: "PUT", body: JSON.stringify(cambios) },
  )
  return extraerTerminos(result, "No se pudo actualizar la sección")
}

export async function eliminarSeccionPersonalizada(
  terminosId: string,
  seccionId: string,
): Promise<TerminosCondiciones> {
  const result = await apiRequest<TerminosActivosResponse>(
    `/terminos-condiciones/${terminosId}/secciones/${seccionId}`,
    { method: "DELETE" },
  )
  return extraerTerminos(result, "No se pudo eliminar la sección")
}

/** El identificador debe ser único dentro de la sección (sin distinguir mayúsculas). */
export async function agregarVarianteSeccion(
  terminosId: string,
  seccionId: string,
  identificador: string,
  texto: string,
): Promise<TerminosCondiciones> {
  const result = await apiRequest<TerminosActivosResponse>(
    `/terminos-condiciones/${terminosId}/secciones/${seccionId}/variantes`,
    { method: "POST", body: JSON.stringify({ identificador, texto }) },
  )
  return extraerTerminos(result, "No se pudo agregar la variante")
}

export async function editarVarianteSeccion(
  terminosId: string,
  seccionId: string,
  identificadorActual: string,
  cambios: { identificador?: string; texto?: string },
): Promise<TerminosCondiciones> {
  const result = await apiRequest<TerminosActivosResponse>(
    `/terminos-condiciones/${terminosId}/secciones/${seccionId}/variantes/${encodeURIComponent(identificadorActual)}`,
    { method: "PUT", body: JSON.stringify(cambios) },
  )
  return extraerTerminos(result, "No se pudo actualizar la variante")
}

/** El backend rechaza dejar una sección sin ninguna variante. */
export async function eliminarVarianteSeccion(
  terminosId: string,
  seccionId: string,
  identificador: string,
): Promise<TerminosCondiciones> {
  const result = await apiRequest<TerminosActivosResponse>(
    `/terminos-condiciones/${terminosId}/secciones/${seccionId}/variantes/${encodeURIComponent(identificador)}`,
    { method: "DELETE" },
  )
  return extraerTerminos(result, "No se pudo eliminar la variante")
}

// ---- Variantes de las 6 secciones fijas -----------------------------------
// Mismo mecanismo que las variantes de secciones personalizadas, pero para
// formas_pago/reserva_equipos/garantia/validez_presupuesto/
// servicio_atencion_cliente/sobre_nosotros. La primera vez que se agrega una
// variante a una sección fija, el backend preserva su texto de siempre como
// la variante "Estándar".

export async function agregarVarianteSeccionFija(
  terminosId: string,
  clave: SeccionFijaKey,
  identificador: string,
  texto: string,
): Promise<TerminosCondiciones> {
  const result = await apiRequest<TerminosActivosResponse>(
    `/terminos-condiciones/${terminosId}/secciones-fijas/${clave}/variantes`,
    { method: "POST", body: JSON.stringify({ identificador, texto }) },
  )
  return extraerTerminos(result, "No se pudo agregar la variante")
}

export async function editarVarianteSeccionFija(
  terminosId: string,
  clave: SeccionFijaKey,
  identificadorActual: string,
  cambios: { identificador?: string; texto?: string },
): Promise<TerminosCondiciones> {
  const result = await apiRequest<TerminosActivosResponse>(
    `/terminos-condiciones/${terminosId}/secciones-fijas/${clave}/variantes/${encodeURIComponent(identificadorActual)}`,
    { method: "PUT", body: JSON.stringify(cambios) },
  )
  return extraerTerminos(result, "No se pudo actualizar la variante")
}

/** Al eliminar la última variante restante, la sección vuelve al modo de texto único de siempre. */
export async function eliminarVarianteSeccionFija(
  terminosId: string,
  clave: SeccionFijaKey,
  identificador: string,
): Promise<TerminosCondiciones> {
  const result = await apiRequest<TerminosActivosResponse>(
    `/terminos-condiciones/${terminosId}/secciones-fijas/${clave}/variantes/${encodeURIComponent(identificador)}`,
    { method: "DELETE" },
  )
  return extraerTerminos(result, "No se pudo eliminar la variante")
}
