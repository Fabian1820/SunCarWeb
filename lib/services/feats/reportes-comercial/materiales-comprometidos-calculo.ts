import type {
  CoberturaOferta,
  CompraEnCurso,
  FiltrosComprometidos,
  FilaMaterialComprometido,
  LineaComprometida,
  MaterialComprometido,
  MaterialesComprometidosData,
  OfertaComprometida,
} from "@/lib/types/feats/reportes-comercial/materiales-comprometidos-types"

/** Lo que decide si una instalación se puede hacer; el resto se compra a granel. */
export const SECCIONES_PRINCIPALES = ["INVERSORES", "BATERIAS", "PANELES", "MPPT"]

export const ETIQUETA_SECCION: Record<string, string> = {
  INVERSORES: "Inversores",
  BATERIAS: "Baterías",
  PANELES: "Paneles",
  MPPT: "MPPT",
  ESTRUCTURAS: "Estructuras",
  CABLEADO_DC: "Cableado DC",
  CABLEADO_AC: "Cableado AC",
  CANALIZACION: "Canalización",
  PROTECCIONES_ELECTRICAS: "Protecciones eléctricas",
  TIERRA: "Tierra",
  MATERIAL_VARIO: "Material vario",
}

const EPSILON = 1e-6

function redondear(valor: number): number {
  return Math.round(valor * 100) / 100
}

export function etiquetaSeccion(seccion: string | null | undefined): string {
  if (!seccion) return "Sin sección"
  return ETIQUETA_SECCION[seccion] ?? seccion.replace(/_/g, " ").toLowerCase()
}

export function lineaEntraEnTipo(linea: Pick<LineaComprometida, "seccion">, tipo: string): boolean {
  if (tipo === "todos") return true
  if (tipo === "principales") return SECCIONES_PRINCIPALES.includes(linea.seccion ?? "")
  return (linea.seccion ?? "") === tipo
}

/** Ofertas que pasan los filtros, con solo las líneas del tipo de material elegido. */
export function filtrarOfertas(data: MaterialesComprometidosData, filtros: FiltrosComprometidos): OfertaComprometida[] {
  return data.ofertas
    .filter((o) => filtros.incluirSinPago || o.tiene_pago)
    .filter((o) => filtros.estados.length === 0 || filtros.estados.includes(o.estado))
    .map((o) => ({ ...o, lineas: o.lineas.filter((l) => lineaEntraEnTipo(l, filtros.tipoMaterial)) }))
    .filter((o) => o.lineas.length > 0)
}

/** Stock que puede salir para instalar en los almacenes elegidos, descontadas las reservas de otros. */
export function stockLibrePorMaterial(
  data: MaterialesComprometidosData,
  almacenes: string[],
): Map<string, { stock: number; reservadoOtros: number }> {
  const elegidos = new Set(almacenes)
  const salida = new Map<string, { stock: number; reservadoOtros: number }>()
  for (const fila of data.stock) {
    if (!elegidos.has(fila.almacen_id)) continue
    const actual = salida.get(fila.clave) ?? { stock: 0, reservadoOtros: 0 }
    actual.stock += fila.disponible
    actual.reservadoOtros += fila.reservado_otros
    salida.set(fila.clave, actual)
  }
  return salida
}

/** Fecha con la que una oferta entra en la cola: su primer pago, o la confirmación si no hay pagos. */
export function fechaDeTurno(oferta: OfertaComprometida): string {
  return oferta.fecha_primer_pago || oferta.fecha_confirmada || oferta.fecha_creacion || "9999"
}

export function ordenarPorTurno(ofertas: OfertaComprometida[]): OfertaComprometida[] {
  return [...ofertas].sort(
    (a, b) => fechaDeTurno(a).localeCompare(fechaDeTurno(b)) || (a.numero_oferta || "").localeCompare(b.numero_oferta || ""),
  )
}

export function construirFilasMateriales(
  data: MaterialesComprometidosData,
  ofertas: OfertaComprometida[],
  almacenes: string[],
): FilaMaterialComprometido[] {
  const materiales = new Map(data.materiales.map((m) => [m.clave, m]))
  const libre = stockLibrePorMaterial(data, almacenes)

  const comprasPorClave = new Map<string, CompraEnCurso[]>()
  for (const compra of data.compras_en_curso) {
    const lista = comprasPorClave.get(compra.clave)
    if (lista) lista.push(compra)
    else comprasPorClave.set(compra.clave, [compra])
  }

  const stockPorAlmacen = new Map<string, { almacen_id: string; disponible: number }[]>()
  for (const fila of data.stock) {
    if (fila.disponible <= EPSILON) continue
    const lista = stockPorAlmacen.get(fila.clave) ?? []
    lista.push({ almacen_id: fila.almacen_id, disponible: fila.disponible })
    stockPorAlmacen.set(fila.clave, lista)
  }

  const filas = new Map<string, FilaMaterialComprometido>()
  for (const oferta of ofertas) {
    for (const linea of oferta.lineas) {
      const material = materiales.get(linea.clave)
      if (!material) continue
      let fila = filas.get(linea.clave)
      if (!fila) {
        fila = {
          material,
          ofertas: [],
          comprometido: 0,
          salido: 0,
          pendiente: 0,
          stock: 0,
          reservadoOtros: 0,
          diferencia: 0,
          enCamino: 0,
          compras: comprasPorClave.get(linea.clave) ?? [],
          faltanteNeto: 0,
          costoFaltante: null,
          valorPendiente: 0,
          primerPago: null,
          stockPorAlmacen: (stockPorAlmacen.get(linea.clave) ?? []).sort((a, b) => b.disponible - a.disponible),
        }
        filas.set(linea.clave, fila)
      }
      fila.comprometido += linea.cantidad
      fila.salido += linea.salido
      fila.pendiente += linea.pendiente
      fila.valorPendiente += linea.pendiente * linea.precio
      const previa = fila.ofertas.find((o) => o.oferta.oferta_id === oferta.oferta_id)
      if (previa) {
        previa.cantidad += linea.cantidad
        previa.salido += linea.salido
        previa.pendiente += linea.pendiente
        previa.segunVales ||= linea.salido_segun_vales
      } else {
        fila.ofertas.push({
          oferta,
          cantidad: linea.cantidad,
          salido: linea.salido,
          pendiente: linea.pendiente,
          segunVales: linea.salido_segun_vales,
        })
      }
      const turno = oferta.tiene_pago ? oferta.fecha_primer_pago : null
      if (turno && (!fila.primerPago || turno < fila.primerPago)) fila.primerPago = turno
    }
  }

  for (const fila of filas.values()) {
    const stock = libre.get(fila.material.clave)
    fila.stock = redondear(stock?.stock ?? 0)
    fila.reservadoOtros = redondear(stock?.reservadoOtros ?? 0)
    fila.comprometido = redondear(fila.comprometido)
    fila.salido = redondear(fila.salido)
    fila.pendiente = redondear(fila.pendiente)
    fila.valorPendiente = redondear(fila.valorPendiente)
    fila.diferencia = redondear(fila.stock - fila.reservadoOtros - fila.pendiente)
    fila.enCamino = redondear(fila.compras.reduce((s, c) => s + c.cantidad, 0))
    fila.faltanteNeto = redondear(Math.max(-(fila.diferencia + fila.enCamino), 0))
    const faltaHoy = Math.max(-fila.diferencia, 0)
    fila.costoFaltante =
      fila.material.costo_unitario && faltaHoy > 0 ? redondear(faltaHoy * fila.material.costo_unitario) : faltaHoy > 0 ? null : 0
    fila.ofertas.sort((a, b) => fechaDeTurno(a.oferta).localeCompare(fechaDeTurno(b.oferta)))
  }

  return Array.from(filas.values()).sort(
    (a, b) => a.diferencia - b.diferencia || b.pendiente - a.pendiente || a.material.codigo.localeCompare(b.material.codigo),
  )
}

/**
 * Qué ofertas se pueden completar con el stock de hoy, por orden de pago.
 *
 * Se aparta material a una oferta solo si alcanza para todo lo que le falta
 * por salir: una oferta que no se puede instalar no bloquea el stock de las
 * siguientes. Así el número de "completas" es el de instalaciones que se
 * pueden hacer ya respetando quién pagó antes.
 */
export function calcularCobertura(
  data: MaterialesComprometidosData,
  ofertas: OfertaComprometida[],
  almacenes: string[],
): CoberturaOferta[] {
  const materiales = new Map(data.materiales.map((m) => [m.clave, m]))
  const restante = new Map<string, number>()
  for (const [clave, s] of stockLibrePorMaterial(data, almacenes)) {
    restante.set(clave, Math.max(s.stock - s.reservadoOtros, 0))
  }

  return ordenarPorTurno(ofertas).map((oferta, i) => {
    const necesita = new Map<string, number>()
    for (const linea of oferta.lineas) {
      if (linea.pendiente > EPSILON) necesita.set(linea.clave, (necesita.get(linea.clave) ?? 0) + linea.pendiente)
    }
    if (necesita.size === 0) {
      return { oferta, turno: i + 1, estado: "nada_pendiente", lineasPendientes: 0, faltan: [] }
    }

    const faltan: CoberturaOferta["faltan"] = []
    for (const [clave, pendiente] of necesita) {
      const hay = restante.get(clave) ?? 0
      if (hay + EPSILON < pendiente) {
        const material = materiales.get(clave)
        if (material) faltan.push({ material, pendiente: redondear(pendiente), falta: redondear(pendiente - hay) })
      }
    }
    if (faltan.length === 0) {
      for (const [clave, pendiente] of necesita) restante.set(clave, (restante.get(clave) ?? 0) - pendiente)
    }
    faltan.sort((a, b) => ordenSeccion(a.material) - ordenSeccion(b.material) || b.falta - a.falta)
    return {
      oferta,
      turno: i + 1,
      estado: faltan.length === 0 ? "completa" : "incompleta",
      lineasPendientes: necesita.size,
      faltan,
    }
  })
}

function ordenSeccion(material: MaterialComprometido): number {
  const i = SECCIONES_PRINCIPALES.indexOf(material.seccion ?? "")
  return i === -1 ? SECCIONES_PRINCIPALES.length : i
}

export function diasDesde(iso: string | null | undefined, hoy = new Date()): number | null {
  if (!iso) return null
  const [anio, mes, dia] = iso.slice(0, 10).split("-").map(Number)
  if (!anio || !mes || !dia) return null
  const inicio = Date.UTC(anio, mes - 1, dia)
  const fin = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
  return Math.max(Math.round((fin - inicio) / 86_400_000), 0)
}

export function formatearCantidad(valor: number): string {
  return valor.toLocaleString("es-ES", { maximumFractionDigits: 2 })
}

/** Almacenes de los que salen las ofertas elegidas, para preseleccionarlos. */
export function almacenesDeLasOfertas(data: MaterialesComprometidosData): string[] {
  const existentes = new Set(data.almacenes.map((a) => a.id))
  return Array.from(new Set(data.ofertas.filter((o) => o.tiene_pago).map((o) => o.almacen_id))).filter(
    (id): id is string => !!id && existentes.has(id),
  )
}
