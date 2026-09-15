import { ESTADOS_CLIENTE, normalizarEstadoCliente } from "@/lib/constants/estados-cliente"
import type {
  AgregadosLineas,
  EstadoSegun,
  GrupoPrecio,
  LineaMaterialOferta,
  MaterialReporteOfertas,
  ResumenMaterial,
  ResumenMaterialesOfertas,
} from "@/lib/types/feats/reportes-comercial/materiales-ofertas-types"

export const SIN_ESTADO = "Sin estado"

/** Los dos estados en los que todavía falta instalar. */
export const ESTADOS_PENDIENTES_INSTALAR = ["Pendiente de instalación", "Instalación en Proceso"]

const ORDEN_ESTADOS = [
  "Pendiente de instalación",
  "Instalación en Proceso",
  "Esperando equipo",
  "Equipo instalado con éxito",
  "Pendiente de visita",
  "Pendiente de visitarnos",
  "No interesado",
]

const CANONICO = new Map<string, string>(ESTADOS_CLIENTE.map((e) => [normalizarEstadoCliente(e), e]))

/** Une variantes de mayúsculas y tildes ("Equipo Instalado con Éxito") en un solo estado. */
export function estadoCanonico(estado?: string | null): string {
  const limpio = (estado || "").trim()
  if (!limpio) return SIN_ESTADO
  return CANONICO.get(normalizarEstadoCliente(limpio)) ?? limpio
}

export function estadoDeLinea(linea: LineaMaterialOferta, segun: EstadoSegun): string {
  return estadoCanonico(segun === "oferta" ? linea.estado_instalacion_oferta : linea.estado_contacto)
}

/** El estado del cliente y el guardado en la oferta no coinciden en si falta instalar. */
export function estadosNoCuadran(linea: LineaMaterialOferta): boolean {
  if (!linea.estado_instalacion_oferta) return false
  const pendienteCliente = ESTADOS_PENDIENTES_INSTALAR.includes(estadoCanonico(linea.estado_contacto))
  const pendienteOferta = ESTADOS_PENDIENTES_INSTALAR.includes(estadoCanonico(linea.estado_instalacion_oferta))
  return pendienteCliente !== pendienteOferta
}

function posicionEstado(estado: string): number {
  if (estado === SIN_ESTADO) return 1000
  const i = ORDEN_ESTADOS.indexOf(estado)
  return i === -1 ? 500 : i
}

export function ordenarEstados(estados: Iterable<string>): string[] {
  return Array.from(new Set(estados)).sort(
    (a, b) => posicionEstado(a) - posicionEstado(b) || a.localeCompare(b, "es"),
  )
}

function redondear(valor: number): number {
  return Math.round(valor * 100) / 100
}

function agregar(lineas: LineaMaterialOferta[], segun: EstadoSegun): AgregadosLineas {
  const ofertas = new Set<string>()
  const ofertasPorEstado: Record<string, Set<string>> = {}
  const unidadesPorEstado: Record<string, number> = {}
  const importePorEstado: Record<string, number> = {}
  let unidades = 0
  let importe = 0
  let primera: string | null = null
  let ultima: string | null = null
  let preciosEditados = 0

  for (const linea of lineas) {
    const estado = estadoDeLinea(linea, segun)
    unidades += linea.cantidad
    importe += linea.importe
    ofertas.add(linea.oferta_id)
    unidadesPorEstado[estado] = (unidadesPorEstado[estado] || 0) + linea.cantidad
    importePorEstado[estado] = redondear((importePorEstado[estado] || 0) + linea.importe)
    ;(ofertasPorEstado[estado] ??= new Set()).add(linea.oferta_id)
    const fecha = linea.fecha_creacion
    if (fecha) {
      if (!primera || fecha < primera) primera = fecha
      if (!ultima || fecha > ultima) ultima = fecha
    }
    if (linea.precio_editado) preciosEditados += 1
  }

  return {
    unidades,
    ofertas: ofertas.size,
    importe: redondear(importe),
    unidadesPorEstado,
    ofertasPorEstado: Object.fromEntries(Object.entries(ofertasPorEstado).map(([e, s]) => [e, s.size])),
    importePorEstado,
    primera,
    ultima,
    preciosEditados,
  }
}

/** Agrupa las líneas por material (en el orden de búsqueda) y, dentro, por precio unitario. */
export function construirResumen(
  lineas: LineaMaterialOferta[],
  materiales: MaterialReporteOfertas[],
  segun: EstadoSegun,
): ResumenMaterialesOfertas {
  const resumenMateriales: ResumenMaterial[] = []

  for (const material of materiales) {
    const delMaterial = lineas.filter((l) => l.codigo === material.codigo)
    if (delMaterial.length === 0) continue

    const porPrecio = new Map<number, LineaMaterialOferta[]>()
    for (const linea of delMaterial) {
      const grupo = porPrecio.get(linea.precio)
      if (grupo) grupo.push(linea)
      else porPrecio.set(linea.precio, [linea])
    }

    const grupos: GrupoPrecio[] = Array.from(porPrecio.entries())
      .sort(([a], [b]) => a - b)
      .map(([precio, delPrecio]) => ({
        codigo: material.codigo,
        precio,
        lineas: [...delPrecio].sort(
          (a, b) =>
            posicionEstado(estadoDeLinea(a, segun)) - posicionEstado(estadoDeLinea(b, segun)) ||
            (a.fecha_creacion || "").localeCompare(b.fecha_creacion || ""),
        ),
        ...agregar(delPrecio, segun),
      }))

    resumenMateriales.push({ material, grupos, ...agregar(delMaterial, segun) })
  }

  const todas = resumenMateriales.flatMap((m) => m.grupos.flatMap((g) => g.lineas))
  return {
    materiales: resumenMateriales,
    estados: ordenarEstados(todas.map((l) => estadoDeLinea(l, segun))),
    ...agregar(todas, segun),
  }
}

export function formatearMoneda(valor: number | null | undefined): string {
  if (valor === null || valor === undefined) return "—"
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor)
}

/** "2026-02-03T20:31:43" → "03/02/2026", sin pasar por la zona horaria del navegador. */
export function formatearFecha(iso: string | null | undefined): string {
  if (!iso) return "—"
  const [anio, mes, dia] = iso.slice(0, 10).split("-")
  return anio && mes && dia ? `${dia}/${mes}/${anio}` : iso
}

export const ETIQUETA_TIPO_CONTACTO: Record<string, string> = {
  cliente: "Cliente",
  lead: "Lead",
  lead_sin_agregar: "Lead sin agregar",
}
