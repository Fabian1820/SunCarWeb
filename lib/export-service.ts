/**
 * Servicio centralizado de exportación a Excel y PDF
 * 
 * Este servicio proporciona funcionalidades genéricas para exportar tablas
 * a formato Excel y PDF con encabezados profesionales personalizables.
 * 
 * Uso:
 * - exportToExcel: Exporta datos a archivo Excel (.xlsx)
 * - exportToPDF: Exporta datos a archivo PDF con tabla formateada
 * 
 * Ambas funciones incluyen:
 * - Logo de la empresa
 * - Título y subtítulo personalizables
 * - Fecha de generación
 * - Formato profesional
 */

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

export interface ExportColumn {
  header: string
  key: string
  width?: number
}

export interface ExportOptions {
  title: string
  subtitle?: string
  filename: string
  columns: ExportColumn[]
  data: any[]
  logoUrl?: string
}

/**
 * Convierte una imagen a Base64
 */
async function imageToBase64(url: string): Promise<string> {
  try {
    const response = await fetch(url)
    const blob = await response.blob()
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    console.error('Error convirtiendo imagen a base64:', error)
    return ''
  }
}

/**
 * Exporta datos a formato Excel
 */
export async function exportToExcel(options: ExportOptions): Promise<void> {
  const { title, subtitle, filename, columns, data } = options

  // Crear un nuevo libro de trabajo
  const wb = XLSX.utils.book_new()

  // Preparar datos para el encabezado
  const headerData: any[][] = [
    ['SUNCAR SRL'],
    [title],
  ]

  if (subtitle) {
    headerData.push([subtitle])
  }

  headerData.push([`Fecha de generación: ${new Date().toLocaleString('es-ES')}`])
  headerData.push([]) // Línea vacía

  // Preparar encabezados de columnas
  const columnHeaders = columns.map(col => col.header)

  // Preparar datos de la tabla
  const tableData = data.map(row => {
    return columns.map(col => {
      const value = row[col.key]
      // Formatear números si es necesario
      if (typeof value === 'number') {
        return value
      }
      return value ?? ''
    })
  })

  // Combinar encabezado + headers + datos
  const sheetData = [
    ...headerData,
    columnHeaders,
    ...tableData
  ]

  // Crear hoja de cálculo
  const ws = XLSX.utils.aoa_to_sheet(sheetData)

  // Configurar anchos de columna
  const colWidths = columns.map(col => ({ wch: col.width || 15 }))
  ws['!cols'] = colWidths

  // Aplicar estilos al encabezado (primeras filas)
  const headerRows = headerData.length
  for (let i = 0; i < headerRows; i++) {
    const cellRef = XLSX.utils.encode_cell({ r: i, c: 0 })
    if (ws[cellRef]) {
      ws[cellRef].s = {
        font: { bold: true, sz: i === 0 ? 16 : 12 },
        alignment: { horizontal: 'center' }
      }
    }
  }

  // Agregar hoja al libro
  XLSX.utils.book_append_sheet(wb, ws, 'Reporte')

  // Descargar archivo
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

/**
 * Exporta datos a formato PDF
 */
export async function exportToPDF(options: ExportOptions): Promise<void> {
  const { title, subtitle, filename, columns, data, logoUrl } = options

  // Crear documento PDF
  const doc = new jsPDF({
    orientation: columns.length > 5 ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  let yPosition = 20

  // Agregar logo si está disponible
  if (logoUrl) {
    try {
      const logoBase64 = await imageToBase64(logoUrl)
      if (logoBase64) {
        doc.addImage(logoBase64, 'PNG', 15, yPosition, 20, 20)
      }
    } catch (error) {
      console.error('Error agregando logo al PDF:', error)
    }
  }

  // Agregar encabezado
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('SUNCAR SRL', logoUrl ? 45 : 15, yPosition + 10)

  yPosition += 20

  // Agregar título
  doc.setFontSize(14)
  doc.text(title, 15, yPosition)
  yPosition += 10

  // Agregar subtítulo si existe
  if (subtitle) {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.text(subtitle, 15, yPosition)
    yPosition += 8
  }

  // Agregar fecha
  doc.setFontSize(9)
  doc.setFont('helvetica', 'italic')
  doc.text(`Fecha de generación: ${new Date().toLocaleString('es-ES')}`, 15, yPosition)
  yPosition += 10

  // Preparar datos para la tabla
  const tableHeaders = columns.map(col => col.header)
  const tableData = data.map(row => {
    return columns.map(col => {
      const value = row[col.key]
      // Formatear valores
      if (typeof value === 'number') {
        // Si parece un monto, formatear como moneda
        if (col.key.toLowerCase().includes('salario') || 
            col.key.toLowerCase().includes('monto') ||
            col.key.toLowerCase().includes('alimentacion')) {
          return `$${value.toFixed(2)}`
        }
        return value.toFixed(2)
      }
      if (Array.isArray(value)) {
        return value.join(', ')
      }
      return value ?? ''
    })
  })

  // Agregar tabla usando autoTable
  autoTable(doc, {
    head: [tableHeaders],
    body: tableData,
    startY: yPosition,
    theme: 'grid',
    headStyles: {
      fillColor: [234, 88, 12], // Color naranja de SunCar
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center'
    },
    bodyStyles: {
      fontSize: 9
    },
    alternateRowStyles: {
      fillColor: [255, 247, 237] // Naranja muy claro
    },
    columnStyles: columns.reduce((acc, col, index) => {
      acc[index] = { 
        cellWidth: col.width ? col.width * 0.8 : 'auto',
        halign: 'center'
      }
      return acc
    }, {} as any),
    margin: { top: yPosition, left: 15, right: 15 }
  })

  // Agregar número de página
  const pageCount = (doc as any).internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.text(
      `Página ${i} de ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    )
  }

  // Descargar archivo
  doc.save(`${filename}.pdf`)
}

/**
 * Función helper para generar nombre de archivo con fecha
 */
export function generateFilename(baseName: string): string {
  const now = new Date()
  const dateStr = now.toISOString().split('T')[0].replace(/-/g, '')
  return `${baseName}_${dateStr}`
}
