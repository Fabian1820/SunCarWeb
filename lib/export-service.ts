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
import ExcelJS from 'exceljs'

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
 * Exporta datos a formato Excel usando ExcelJS
 */
export async function exportToExcel(options: ExportOptions): Promise<void> {
  const { title, subtitle, filename, columns, data } = options

  // Crear un nuevo libro de trabajo
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Reporte')

  // Columna A vacía para margen izquierdo
  worksheet.getColumn(1).width = 3

  // Agregar encabezado (empezando en columna B)
  let currentRow = 1
  
  // Fila 1: Título (ya incluye Suncar SRL) - en columna B
  worksheet.getCell(`B${currentRow}`).value = title
  worksheet.getCell(`B${currentRow}`).font = { bold: true, size: 14 }
  currentRow++

  // Fila 2: Subtítulo (si existe) - en columna B
  if (subtitle) {
    worksheet.getCell(`B${currentRow}`).value = subtitle
    worksheet.getCell(`B${currentRow}`).font = { size: 11 }
    currentRow++
  }

  // Fila vacía
  currentRow++

  // Fila de encabezados de columnas (empezando en columna B, índice 2)
  const headerRow = worksheet.getRow(currentRow)
  columns.forEach((col, index) => {
    const cell = headerRow.getCell(index + 2) // +2 porque columna A está vacía
    cell.value = col.header
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFEA580C' } // Color naranja de SunCar
    }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' }
    }
  })
  headerRow.height = 25
  currentRow++

  // Agregar datos
  data.forEach((rowData) => {
    const row = worksheet.getRow(currentRow)
    let maxLines = 1
    
    columns.forEach((col, index) => {
      const cell = row.getCell(index + 2) // +2 porque columna A está vacía
      const value = rowData[col.key] ?? ''
      cell.value = value
      
      // Calcular líneas considerando el wrap por ancho de columna
      if (typeof value === 'string' && value.length > 0) {
        const colWidth = col.width || 15
        // Ser más conservador: menos caracteres por línea para asegurar espacio
        const charsPerLine = Math.max(1, Math.floor(colWidth * 0.75))
        
        // Calcular líneas basándose en la longitud total del texto
        const estimatedLines = Math.ceil(value.length / charsPerLine)
        
        maxLines = Math.max(maxLines, estimatedLines)
      }
      
      // Arial 11
      cell.font = { name: 'Arial', size: 11 }
      cell.alignment = { 
        horizontal: 'left', 
        vertical: 'top', 
        wrapText: true 
      }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
      }
    })
    
    // Altura de fila: 16pt por línea para Arial 11, con margen extra para asegurar visibilidad
    row.height = Math.max(18, (16 * maxLines) + 5)
    currentRow++
  })

  // Configurar anchos de columna (empezando en columna B)
  columns.forEach((col, index) => {
    worksheet.getColumn(index + 2).width = col.width || 15
  })

  // Generar el archivo y descargarlo
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.xlsx`
  link.click()
  window.URL.revokeObjectURL(url)
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
