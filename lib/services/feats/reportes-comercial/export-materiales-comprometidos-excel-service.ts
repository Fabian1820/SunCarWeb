import type {
  CoberturaOferta,
  FilaMaterialComprometido,
} from "@/lib/types/feats/reportes-comercial/materiales-comprometidos-types"
import { diasDesde, etiquetaSeccion } from "./materiales-comprometidos-calculo"
import { ETIQUETA_TIPO_CONTACTO } from "./materiales-ofertas-resumen"

export interface ContextoExportComprometidos {
  almacenes: string[]
  estados: string[]
  incluirSinPago: boolean
  tipoMaterial: string
  generadoEn: string
  nombreAlmacen: (id: string) => string
}

const FUENTE = "Arial"
const AZUL = "FF1F3864"
const ROJO = "FFC00000"
const VERDE = "FF548235"
const MONEDA = "$#,##0.00"
const CANTIDAD = "#,##0.##"
const FECHA = "dd/mm/yyyy"

function fechaExcel(iso: string | null | undefined): Date | null {
  if (!iso) return null
  const [anio, mes, dia] = iso.slice(0, 10).split("-").map(Number)
  return anio && mes && dia ? new Date(Date.UTC(anio, mes - 1, dia)) : null
}

export class ExportMaterialesComprometidosExcelService {
  static async exportar(
    filas: FilaMaterialComprometido[],
    cobertura: CoberturaOferta[],
    contexto: ContextoExportComprometidos,
  ): Promise<void> {
    const excelJSImport: any = await import("exceljs")
    const ExcelJS = excelJSImport.default ?? excelJSImport
    const workbook = new ExcelJS.Workbook()
    workbook.creator = "SunCar"
    workbook.created = new Date()

    const hayAlmacenes = contexto.almacenes.length > 0
    const subtitulo = [
      `Stock de: ${hayAlmacenes ? contexto.almacenes.join(", ") : "ningún almacén"}`,
      `Estados: ${contexto.estados.join(", ")}`,
      contexto.incluirSinPago ? "Incluye confirmadas sin pago" : "Solo ofertas con pago",
      `Material: ${contexto.tipoMaterial}`,
      `Calculado el ${new Date(contexto.generadoEn).toLocaleString("es-ES")}`,
    ].join(" · ")

    const nuevaHoja = (nombre: string, titulo: string, cabecera: string[], anchos: number[]) => {
      const hoja = workbook.addWorksheet(nombre, { views: [{ state: "frozen", ySplit: 4 }] })
      hoja.getCell("A1").value = titulo
      hoja.getCell("A1").font = { name: FUENTE, size: 14, bold: true }
      hoja.getCell("A2").value = subtitulo
      hoja.getCell("A2").font = { name: FUENTE, size: 9, italic: true, color: { argb: "FF595959" } }
      const fila = hoja.getRow(4)
      fila.values = cabecera
      fila.height = 32
      fila.eachCell((cell: any) => {
        cell.font = { name: FUENTE, size: 10, bold: true, color: { argb: "FFFFFFFF" } }
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: AZUL } }
        cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true }
      })
      anchos.forEach((ancho, i) => (hoja.getColumn(i + 1).width = ancho))
      hoja.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: cabecera.length } }
      return hoja
    }
    const formatear = (row: any, mapa: Record<number, string>) => {
      row.eachCell({ includeEmpty: true }, (cell: any) => (cell.font = { name: FUENTE, size: 10 }))
      Object.entries(mapa).forEach(([col, fmt]) => (row.getCell(Number(col)).numFmt = fmt))
    }

    // ----------------------------------------------------------- Por material
    const materiales = nuevaHoja(
      "Por material",
      "Materiales comprometidos",
      [
        "Código",
        "Material",
        "Sección",
        "Ofertas",
        "En las ofertas",
        "Ya salió del almacén",
        "Falta por sacar",
        "Stock disponible",
        "Reservado por otras ventas",
        "Sobra (+) / Falta (−)",
        "En compras en curso",
        "Falta aunque lleguen las compras",
        "Costo unitario",
        "Costo faltante",
        "Valor venta pendiente",
        "Primer pago",
        "Días esperando",
        "Dónde hay",
      ],
      [16, 36, 16, 9, 13, 11, 11, 11, 11, 12, 11, 12, 12, 13, 14, 12, 10, 50],
    )
    for (const f of filas) {
      const row = materiales.addRow([
        f.material.codigo,
        f.material.nombre || f.material.descripcion || "",
        etiquetaSeccion(f.material.seccion),
        f.ofertas.length,
        f.comprometido,
        f.salido,
        f.pendiente,
        hayAlmacenes ? f.stock : null,
        f.reservadoOtros || null,
        hayAlmacenes ? f.diferencia : null,
        f.enCamino || null,
        hayAlmacenes && f.diferencia < 0 ? f.faltanteNeto : null,
        f.material.costo_unitario,
        hayAlmacenes && f.diferencia < 0 ? f.costoFaltante : null,
        f.valorPendiente,
        fechaExcel(f.primerPago),
        diasDesde(f.primerPago),
        f.stockPorAlmacen.map((s) => `${contexto.nombreAlmacen(s.almacen_id)}: ${s.disponible}`).join(" · "),
      ])
      formatear(row, { 5: CANTIDAD, 6: CANTIDAD, 7: CANTIDAD, 8: CANTIDAD, 9: CANTIDAD, 10: CANTIDAD, 11: CANTIDAD, 12: CANTIDAD, 13: MONEDA, 14: MONEDA, 15: MONEDA, 16: FECHA })
      if (hayAlmacenes) {
        row.getCell(10).font = { name: FUENTE, size: 10, bold: true, color: { argb: f.diferencia < 0 ? ROJO : VERDE } }
      }
    }

    // ------------------------------------------------------------- Por oferta
    const ofertas = nuevaHoja(
      "Por oferta",
      "Cola de instalación por orden de pago",
      [
        "Turno",
        "Nº oferta",
        "Oferta",
        "Cliente",
        "Tipo",
        "Nº cliente",
        "Estado",
        "Almacén de la oferta",
        "Primer pago",
        "Días esperando",
        "Cobrado (USD)",
        "Precio final",
        "Con pago",
        "Materiales por sacar",
        "¿Hay todo?",
        "Qué falta",
      ],
      [7, 18, 30, 28, 10, 13, 22, 22, 12, 10, 13, 13, 9, 11, 12, 70],
    )
    for (const c of cobertura) {
      const o = c.oferta
      const hayTodo =
        c.estado === "nada_pendiente" ? "Ya salió todo" : !hayAlmacenes ? "" : c.estado === "completa" ? "Sí" : "No"
      const row = ofertas.addRow([
        c.turno,
        o.numero_oferta,
        o.nombre_oferta,
        o.contacto_nombre,
        o.contacto_tipo ? ETIQUETA_TIPO_CONTACTO[o.contacto_tipo] : "",
        o.cliente_numero,
        o.estado,
        o.almacen_id ? contexto.nombreAlmacen(o.almacen_id) : "",
        fechaExcel(o.fecha_primer_pago),
        diasDesde(o.fecha_primer_pago),
        o.cobrado_usd,
        o.precio_final,
        o.tiene_pago ? "Sí" : "No",
        c.lineasPendientes,
        hayTodo,
        c.faltan.map((f) => `${f.falta} × ${f.material.codigo} ${f.material.nombre || ""}`.trim()).join("; "),
      ])
      formatear(row, { 9: FECHA, 11: MONEDA, 12: MONEDA })
      if (hayTodo === "Sí" || hayTodo === "No") {
        row.getCell(15).font = { name: FUENTE, size: 10, bold: true, color: { argb: hayTodo === "Sí" ? VERDE : ROJO } }
      }
    }

    // ---------------------------------------------------------------- Detalle
    const detalle = nuevaHoja(
      "Detalle",
      "Líneas comprometidas",
      ["Código", "Material", "Nº oferta", "Cliente", "Estado", "Primer pago", "En la oferta", "Ya salió del almacén", "Falta por sacar", "Lo salido según"],
      [16, 36, 18, 28, 22, 12, 10, 10, 10, 14],
    )
    for (const f of filas) {
      for (const { oferta, cantidad, salido, pendiente, segunVales } of f.ofertas) {
        const row = detalle.addRow([
          f.material.codigo,
          f.material.nombre || f.material.descripcion || "",
          oferta.numero_oferta,
          oferta.contacto_nombre,
          oferta.estado,
          fechaExcel(oferta.fecha_primer_pago),
          cantidad,
          salido,
          pendiente,
          segunVales ? "Vales de salida" : salido > 0 ? "Oferta" : "",
        ])
        formatear(row, { 6: FECHA, 7: CANTIDAD, 8: CANTIDAD, 9: CANTIDAD })
      }
    }

    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `materiales_comprometidos_${new Date().toISOString().split("T")[0]}.xlsx`
    link.click()
    window.URL.revokeObjectURL(url)
  }
}
