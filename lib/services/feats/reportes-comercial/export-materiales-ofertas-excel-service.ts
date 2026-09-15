import type {
  EstadoSegun,
  LineaMaterialOferta,
  MaterialReporteOfertas,
} from "@/lib/types/feats/reportes-comercial/materiales-ofertas-types"
import {
  ETIQUETA_TIPO_CONTACTO,
  construirResumen,
  estadoCanonico,
  estadoDeLinea,
  estadosNoCuadran,
} from "./materiales-ofertas-resumen"
import { ESTADOS_OFERTA_REPORTE } from "./materiales-ofertas-service"

export interface FiltrosExportMateriales {
  estadosOferta: string[]
  estadoSegun: EstadoSegun
  /** Vacío = todos los estados */
  estadosContacto: string[]
  busqueda: string
}

const FUENTE = "Arial"
const AZUL = "FF1F3864"
const BANDA_MATERIAL = "FFB4C6E7"
const BANDA_PRECIO = "FFDEE6F3"
const GRIS = "FFF2F2F2"
const TOTAL = "FFD9E1F2"
const MONEDA = "$#,##0.00"
const FECHA = "dd/mm/yyyy"

const COLOR_ESTADO: Record<string, string> = {
  "Pendiente de instalación": "FFFFF2CC",
  "Instalación en Proceso": "FFE2EFDA",
  "Esperando equipo": "FFFCE4D6",
  "Equipo instalado con éxito": "FFDDEBF7",
}

function relleno(argb: string) {
  return { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb } }
}

function fechaExcel(iso: string | null | undefined): Date | null {
  if (!iso) return null
  const [anio, mes, dia] = iso.slice(0, 10).split("-").map(Number)
  return anio && mes && dia ? new Date(Date.UTC(anio, mes - 1, dia)) : null
}

function usd(valor: number): string {
  return `$${valor.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export class ExportMaterialesOfertasExcelService {
  static async exportar(
    lineas: LineaMaterialOferta[],
    materiales: MaterialReporteOfertas[],
    filtros: FiltrosExportMateriales,
  ): Promise<void> {
    const excelJSImport: any = await import("exceljs")
    const ExcelJS = excelJSImport.default ?? excelJSImport
    const resumen = construirResumen(lineas, materiales, filtros.estadoSegun)
    const varios = resumen.materiales.length > 1

    const workbook = new ExcelJS.Workbook()
    workbook.creator = "SunCar"
    workbook.created = new Date()

    const codigos = resumen.materiales.map((m) => m.material.codigo).join(", ")
    const segunTexto = filtros.estadoSegun === "cliente" ? "estado del cliente" : "estado de instalación de la oferta"
    const estadosOfertaTexto = filtros.estadosOferta
      .map((v) => ESTADOS_OFERTA_REPORTE.find((e) => e.value === v)?.label ?? v)
      .join(", ")
    const subtitulo = [
      `Ofertas: ${estadosOfertaTexto}`,
      filtros.estadosContacto.length > 0
        ? `Solo ${filtros.estadosContacto.join(" y ")} (${segunTexto})`
        : `Todos los estados (${segunTexto})`,
      filtros.busqueda ? `Búsqueda: «${filtros.busqueda}»` : null,
      `Generado el ${new Date().toLocaleDateString("es-ES")}`,
    ]
      .filter(Boolean)
      .join(" · ")

    const estiloCabecera = (row: any, alto = 32) => {
      row.height = alto
      row.eachCell((cell: any) => {
        cell.font = { name: FUENTE, size: 10, bold: true, color: { argb: "FFFFFFFF" } }
        cell.fill = relleno(AZUL)
        cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true }
      })
    }
    const pintarFila = (row: any, columnas: number, fill?: string, negrita = false, blanca = false) => {
      for (let c = 1; c <= columnas; c++) {
        const cell = row.getCell(c)
        cell.font = { name: FUENTE, size: 10, bold: negrita, color: blanca ? { argb: "FFFFFFFF" } : undefined }
        if (fill) cell.fill = relleno(fill)
      }
    }
    const formatos = (row: any, mapa: Record<number, string>) => {
      Object.entries(mapa).forEach(([col, fmt]) => {
        row.getCell(Number(col)).numFmt = fmt
      })
    }

    // ------------------------------------------------------------ Resumen
    const hoja = workbook.addWorksheet("Resumen", { views: [{ state: "frozen", ySplit: 4 }] })
    hoja.getCell("A1").value = `Materiales en ofertas: ${codigos}`
    hoja.getCell("A1").font = { name: FUENTE, size: 14, bold: true }
    hoja.getCell("A2").value = subtitulo
    hoja.getCell("A2").font = { name: FUENTE, size: 9, italic: true, color: { argb: "FF595959" } }

    const estados = resumen.estados
    const cabecera = [
      "Material",
      "Precio unitario (USD)",
      ...estados.map((e) => `${e} (u.)`),
      "Total unidades",
      "Ofertas",
      "Importe (USD)",
      "Primera oferta",
      "Última oferta",
    ]
    const nCols = cabecera.length
    hoja.getRow(4).values = cabecera
    estiloCabecera(hoja.getRow(4))
    ;[22, 14, ...estados.map(() => 14), 11, 9, 15, 13, 13].forEach((ancho, i) => {
      hoja.getColumn(i + 1).width = ancho
    })
    const cUnidades = 3 + estados.length
    const fmtResumen: Record<number, string> = {
      2: MONEDA,
      [cUnidades + 2]: MONEDA,
      [cUnidades + 3]: FECHA,
      [cUnidades + 4]: FECHA,
    }

    const filaResumen = (etiqueta: string, precio: number | null, datos: any, fill?: string, negrita = false, blanca = false) => {
      const row = hoja.addRow([
        etiqueta,
        precio,
        ...estados.map((e) => datos.unidadesPorEstado[e] ?? 0),
        datos.unidades,
        datos.ofertas,
        datos.importe,
        fechaExcel(datos.primera),
        fechaExcel(datos.ultima),
      ])
      pintarFila(row, nCols, fill, negrita, blanca)
      formatos(row, fmtResumen)
      return row
    }

    for (const rm of resumen.materiales) {
      for (const grupo of rm.grupos) filaResumen(rm.material.codigo, grupo.precio, grupo)
      filaResumen(`Total ${rm.material.codigo}`, null, rm, TOTAL, true)
    }
    if (varios) filaResumen("Total de todos los materiales", null, resumen, AZUL, true, true)

    hoja.addRow([])
    const tituloEstado = hoja.addRow(["Por estado"])
    tituloEstado.getCell(1).font = { name: FUENTE, size: 11, bold: true }
    const cabEstado = hoja.addRow(["Estado", "Material", "Unidades", "Ofertas", "Importe (USD)"])
    estiloCabecera(cabEstado, 20)
    for (const estado of estados) {
      for (const rm of resumen.materiales) {
        if (!rm.unidadesPorEstado[estado]) continue
        const row = hoja.addRow([
          estado,
          rm.material.codigo,
          rm.unidadesPorEstado[estado],
          rm.ofertasPorEstado[estado],
          rm.importePorEstado[estado],
        ])
        pintarFila(row, 5)
        if (COLOR_ESTADO[estado]) row.getCell(1).fill = relleno(COLOR_ESTADO[estado])
        row.getCell(5).numFmt = MONEDA
      }
      if (varios) {
        const row = hoja.addRow([
          estado,
          "Todos",
          resumen.unidadesPorEstado[estado],
          resumen.ofertasPorEstado[estado],
          resumen.importePorEstado[estado],
        ])
        pintarFila(row, 5, GRIS, true)
        row.getCell(5).numFmt = MONEDA
      }
    }
    const totalEstado = hoja.addRow(["Total", "", resumen.unidades, resumen.ofertas, resumen.importe])
    pintarFila(totalEstado, 5, TOTAL, true)
    totalEstado.getCell(5).numFmt = MONEDA

    const noCuadran = new Set(lineas.filter(estadosNoCuadran).map((l) => l.oferta_id)).size
    const notas: [string, string][] = [
      [
        "Materiales",
        resumen.materiales
          .map(({ material: m }) => {
            const nombre = m.nombre || m.descripcion || "sin nombre"
            return m.en_catalogo
              ? `${m.codigo}: ${nombre} (catálogo hoy: ${m.precio_catalogo !== null ? usd(m.precio_catalogo) : "sin precio"})`
              : `${m.codigo}: no está en el catálogo actual`
          })
          .join(" · "),
      ],
      [
        "Precio",
        "Precio unitario de la línea de la oferta, antes de repartir el margen comercial. No es lo que paga el cliente por el material.",
      ],
      [
        "Estado",
        filtros.estadoSegun === "cliente"
          ? "Se usa el estado del cliente; si la oferta es de un lead, el estado del lead."
          : "Se usa el estado de instalación guardado en cada oferta, que no siempre coincide con el del cliente.",
      ],
      [
        "Estados que no cuadran",
        noCuadran > 0
          ? `En ${noCuadran} ofertas el estado del cliente y el guardado en la oferta no coinciden en si falta instalar. El detalle muestra los dos.`
          : "En estas ofertas el estado del cliente y el de la oferta coinciden en si falta instalar.",
      ],
      [
        "Fechas",
        "«Primera oferta» y «Última oferta» usan la fecha de creación de la oferta.",
      ],
      [
        "No incluye",
        "Elementos personalizados ni materiales entregados como adicionales fuera de los productos de la oferta.",
      ],
    ]
    if (resumen.preciosEditados > 0) {
      notas.splice(2, 0, [
        "Precios editados",
        resumen.preciosEditados === 1
          ? "1 línea tiene el precio cambiado a mano en la oferta; en el detalle se indica el precio de catálogo que tenía."
          : `${resumen.preciosEditados} líneas tienen el precio cambiado a mano en la oferta; en el detalle se indica el precio de catálogo que tenían.`,
      ])
    }
    hoja.addRow([])
    const tituloNotas = hoja.addRow(["Cómo se ha contado"])
    tituloNotas.getCell(1).font = { name: FUENTE, size: 11, bold: true }
    for (const [etiqueta, texto] of notas) {
      const row = hoja.addRow([etiqueta, texto])
      hoja.mergeCells(row.number, 2, row.number, nCols)
      row.getCell(1).font = { name: FUENTE, size: 10, bold: true }
      row.getCell(1).alignment = { vertical: "top" }
      row.getCell(2).font = { name: FUENTE, size: 10 }
      row.getCell(2).alignment = { wrapText: true, vertical: "top" }
      row.height = 15 * Math.max(1, Math.ceil(texto.length / 100))
    }

    // ------------------------------------------------------------ Detalle
    const det = workbook.addWorksheet("Ofertas por precio", {
      views: [{ state: "frozen", ySplit: 4, xSplit: 4 }],
      properties: { outlineProperties: { summaryBelow: true } },
    })
    det.getCell("A1").value = `Ofertas con ${codigos}, agrupadas por ${varios ? "material y " : ""}precio`
    det.getCell("A1").font = { name: FUENTE, size: 14, bold: true }
    det.getCell("A2").value = subtitulo
    det.getCell("A2").font = { name: FUENTE, size: 9, italic: true, color: { argb: "FF595959" } }

    const estadoUsado = filtros.estadoSegun === "cliente" ? "Estado del cliente" : "Estado en la oferta"
    const estadoOtro = filtros.estadoSegun === "cliente" ? "Estado de instalación en la oferta" : "Estado del cliente"
    const cabDetalle = [
      "Material",
      "Precio unitario (USD)",
      estadoUsado,
      "Nº oferta",
      "Cliente",
      "Tipo",
      "Nº cliente",
      "Nombre de la oferta",
      "Fecha creación",
      "Fecha confirmación",
      "Cantidad",
      "Importe (USD)",
      "Precio final oferta (USD)",
      "Estado de pago",
      estadoOtro,
    ]
    const nDet = cabDetalle.length
    det.getRow(4).values = cabDetalle
    estiloCabecera(det.getRow(4))
    ;[14, 13, 24, 17, 32, 11, 13, 32, 12, 12, 9, 14, 14, 12, 26].forEach((ancho, i) => {
      det.getColumn(i + 1).width = ancho
    })

    const filaBanda = (texto: string, fill: string, tamano = 10) => {
      const row = det.addRow(["", "", "", texto])
      pintarFila(row, nDet, fill, true)
      row.getCell(4).font = { name: FUENTE, size: tamano, bold: true, color: { argb: AZUL } }
      return row
    }
    const filaTotal = (texto: string, datos: { ofertas: number; unidades: number; importe: number }, fill: string, blanca = false) => {
      const valores: any[] = new Array(nDet).fill("")
      valores[3] = texto
      valores[4] = `${datos.ofertas} ${datos.ofertas === 1 ? "oferta" : "ofertas"}`
      valores[10] = datos.unidades
      valores[11] = datos.importe
      const row = det.addRow(valores)
      pintarFila(row, nDet, fill, true, blanca)
      row.getCell(12).numFmt = MONEDA
      return row
    }

    for (const rm of resumen.materiales) {
      if (varios) {
        filaBanda(`${rm.material.codigo} · ${rm.material.nombre || rm.material.descripcion || ""}`, BANDA_MATERIAL, 11)
      }
      for (const grupo of rm.grupos) {
        filaBanda(`Precio unitario ${usd(grupo.precio)}`, BANDA_PRECIO)
        for (const linea of grupo.lineas) {
          const estado = estadoDeLinea(linea, filtros.estadoSegun)
          const otro =
            filtros.estadoSegun === "cliente"
              ? linea.estado_instalacion_oferta || ""
              : estadoCanonico(linea.estado_contacto)
          const row = det.addRow([
            linea.codigo,
            linea.precio,
            estado,
            linea.numero_oferta || "",
            linea.contacto_nombre || "(sin nombre)",
            linea.contacto_tipo ? ETIQUETA_TIPO_CONTACTO[linea.contacto_tipo] : "",
            linea.cliente_numero || "",
            linea.nombre_oferta || "",
            fechaExcel(linea.fecha_creacion),
            fechaExcel(linea.fecha_confirmada),
            linea.cantidad,
            linea.importe,
            linea.precio_final_oferta,
            linea.estado_pago || "",
            otro,
          ])
          pintarFila(row, nDet)
          formatos(row, { 2: MONEDA, 9: FECHA, 10: FECHA, 12: MONEDA, 13: MONEDA })
          if (COLOR_ESTADO[estado]) row.getCell(3).fill = relleno(COLOR_ESTADO[estado])
          if (estadosNoCuadran(linea)) {
            row.getCell(15).font = { name: FUENTE, size: 10, color: { argb: "FFC00000" } }
          }
          if (linea.precio_editado) {
            row.getCell(2).note =
              linea.precio_original !== null
                ? `Precio cambiado a mano. Catálogo al hacer la oferta: ${usd(linea.precio_original)}`
                : "Precio cambiado a mano en la oferta"
          }
          row.outlineLevel = 1
        }
        filaTotal(`Subtotal ${usd(grupo.precio)}`, grupo, GRIS)
      }
      if (varios) filaTotal(`Total ${rm.material.codigo}`, rm, TOTAL)
      det.addRow([])
    }
    filaTotal("Total general", resumen, AZUL, true)

    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    const sufijo = resumen.materiales
      .map((m) => m.material.codigo.replace(/[^A-Za-z0-9]+/g, ""))
      .join("_")
      .slice(0, 60)
    link.href = url
    link.download = `materiales_en_ofertas_${sufijo}_${new Date().toISOString().split("T")[0]}.xlsx`
    link.click()
    window.URL.revokeObjectURL(url)
  }
}
