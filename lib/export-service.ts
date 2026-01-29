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
  // Nuevas opciones para ofertas
  clienteData?: {
    nombre?: string
    carnet_identidad?: string
    telefono?: string
    provincia_montaje?: string
    direccion?: string
    numero?: string
  }
  ofertaData?: {
    numero_oferta?: string
    nombre_oferta?: string
    tipo_oferta?: string
    fecha_creacion?: string
  }
  incluirFotos?: boolean
  fotosMap?: Map<string, string> // Map de material_codigo -> url_foto
  sinPrecios?: boolean // Indica si es una exportación sin precios
  conPreciosCliente?: boolean // Indica si es exportación con precios para cliente (Material | Cant | Total)
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
 * Exporta datos a formato PDF con soporte para fotos y datos de cliente
 * Formato similar a la imagen de referencia con tabla de materiales por categoría
 */
export async function exportToPDF(options: ExportOptions): Promise<void> {
  const { title, subtitle, filename, columns, data, logoUrl, clienteData, ofertaData, incluirFotos, fotosMap, sinPrecios, conPreciosCliente } = options

  // Crear documento PDF en orientación vertical
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  let yPosition = 10

  // ========== ENCABEZADO ==========
  // Calcular altura del encabezado basado en el contenido
  const nombreOferta = ofertaData?.nombre_oferta || subtitle || ''
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  // Limitar el ancho del texto para que no se superponga con el logo (dejar espacio para logo de ~40mm)
  const nombreLines = doc.splitTextToSize(nombreOferta, pageWidth - 50)
  const headerHeight = 20 + (nombreLines.length * 5)
  
  // Fondo verde claro para el encabezado
  doc.setFillColor(200, 230, 201)
  doc.rect(0, 0, pageWidth, headerHeight, 'F')

  // Logo en la esquina superior derecha (dentro del espacio verde)
  if (logoUrl) {
    try {
      const logoBase64 = await imageToBase64(logoUrl)
      if (logoBase64) {
        const logoSize = Math.min(headerHeight - 4, 20) // Ajustar al espacio disponible
        doc.addImage(logoBase64, 'PNG', pageWidth - logoSize - 5, 2, logoSize, logoSize)
      }
    } catch (error) {
      console.error('Error agregando logo al PDF:', error)
    }
  }

  // Título principal
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text('INSTALACIÓN Y MONTAJE DE SISTEMA FOTOVOLTAICO', 10, 8)

  // Nombre de la oferta
  if (nombreOferta) {
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text(nombreLines, 10, 16)
  }

  yPosition = headerHeight + 5

  // ========== DATOS DEL CLIENTE ==========
  if (clienteData && clienteData.nombre) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)
    doc.text(`A la atención de: ${clienteData.nombre}`, 10, yPosition)
    yPosition += 8
  }

  // ========== PRESUPUESTO DE MATERIALES ==========
  // ENCABEZADOS DE COLUMNAS - UNA SOLA VEZ AL INICIO
  if (!options.sinPrecios && !conPreciosCliente) {
    // Encabezados completos con precios y márgenes
    doc.setFillColor(250, 250, 250)
    doc.rect(10, yPosition, pageWidth - 20, 6, 'F')
    
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(100, 100, 100)
    doc.text('Material', 12, yPosition + 4)
    doc.text('P. Unit', 85, yPosition + 4, { align: 'right' })
    doc.text('Cant', 105, yPosition + 4, { align: 'center' })
    doc.text('Total', 130, yPosition + 4, { align: 'right' })
    doc.text('Margen (%)', 160, yPosition + 4, { align: 'right' })
    doc.text('Total Final', pageWidth - 12, yPosition + 4, { align: 'right' })
    
    yPosition += 8
  } else if (conPreciosCliente) {
    // Encabezados con precios para cliente (Material | Cant | Total)
    doc.setFillColor(250, 250, 250)
    doc.rect(10, yPosition, pageWidth - 20, 6, 'F')
    
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(100, 100, 100)
    doc.text('Material', 12, yPosition + 4)
    doc.text('Cant', pageWidth - 50, yPosition + 4, { align: 'right' })
    doc.text('Total', pageWidth - 12, yPosition + 4, { align: 'right' })
    
    yPosition += 8
  } else {
    // Encabezados simplificados sin precios (Material | Cant)
    doc.setFillColor(250, 250, 250)
    doc.rect(10, yPosition, pageWidth - 20, 6, 'F')
    
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(100, 100, 100)
    doc.text('Material', 12, yPosition + 4)
    doc.text('Cant', pageWidth - 12, yPosition + 4, { align: 'right' })
    
    yPosition += 8
  }

  // Agrupar datos por sección/categoría
  const datosPorSeccion = new Map<string, any[]>()
  data.forEach(row => {
    // Filtrar filas vacías (separadores)
    if (!row.descripcion && !row.precio_unitario && !row.cantidad) {
      return
    }
    
    // Filtrar filas que no son materiales (servicios, totales, etc)
    if (row.tipo === 'Material' || !row.tipo) {
      const seccion = row.seccion || 'Sin categoría'
      if (!datosPorSeccion.has(seccion)) {
        datosPorSeccion.set(seccion, [])
      }
      datosPorSeccion.get(seccion)?.push(row)
    }
  })

  // Filtrar secciones vacías
  for (const [seccion, rows] of Array.from(datosPorSeccion.entries())) {
    if (rows.length === 0) {
      datosPorSeccion.delete(seccion)
    }
  }

  let seccionIndex = 1

  // Procesar cada sección
  for (const [seccion, rows] of datosPorSeccion) {
    // Verificar espacio para nueva sección
    if (yPosition > doc.internal.pageSize.getHeight() - 80) {
      doc.addPage()
      yPosition = 15
    }

    // Calcular subtotal de la sección
    const subtotalSeccion = rows.reduce((sum, row) => {
      const precio = parseFloat(row.precio_unitario) || 0
      const cantidad = parseFloat(row.cantidad) || 0
      const margen = parseFloat(row.margen) || 0
      return sum + (precio * cantidad) + margen
    }, 0)

    // Encabezado de sección con fondo gris claro
    doc.setFillColor(245, 245, 245)
    doc.rect(10, yPosition, pageWidth - 20, 8, 'F')
    
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text(`${String(seccionIndex).padStart(2, '0')} ${seccion}`, 12, yPosition + 5.5)
    
    yPosition += 10

    // Materiales de la sección
    for (const row of rows) {
      const rowHeight = 20
      
      // Verificar espacio en la página
      if (yPosition + rowHeight > doc.internal.pageSize.getHeight() - 25) {
        doc.addPage()
        yPosition = 15
      }

      // Fondo blanco alternado
      doc.setFillColor(255, 255, 255)
      doc.rect(10, yPosition, pageWidth - 20, rowHeight, 'F')

      // Borde sutil
      doc.setDrawColor(240, 240, 240)
      doc.setLineWidth(0.1)
      doc.rect(10, yPosition, pageWidth - 20, rowHeight)

      // FOTO (si está disponible)
      if (incluirFotos && fotosMap) {
        const materialCodigo = row.material_codigo || row.materialCodigo || row.codigo
        const fotoUrl = fotosMap.get(materialCodigo?.toString())
        
        if (fotoUrl) {
          try {
            const fotoBase64 = await imageToBase64(fotoUrl)
            if (fotoBase64) {
              // Cargar la imagen para obtener dimensiones reales
              const img = await new Promise<HTMLImageElement>((resolve, reject) => {
                const image = new Image()
                image.onload = () => resolve(image)
                image.onerror = reject
                image.src = fotoBase64
              })
              
              const containerSize = 16
              const padding = 2
              const maxSize = containerSize - (padding * 2)
              
              // Calcular dimensiones manteniendo aspect ratio real
              let imgWidth = img.width
              let imgHeight = img.height
              
              // Escalar para que quepa en el contenedor
              const scale = Math.min(maxSize / imgWidth, maxSize / imgHeight)
              imgWidth = imgWidth * scale
              imgHeight = imgHeight * scale
              
              // Centrar la imagen en el contenedor
              const fotoX = 12 + padding + (maxSize - imgWidth) / 2
              const fotoY = yPosition + (rowHeight - imgHeight) / 2
              
              doc.addImage(fotoBase64, 'JPEG', fotoX, fotoY, imgWidth, imgHeight)
            }
          } catch (error) {
            console.error('Error cargando foto:', error)
          }
        }
      }

      // NOMBRE DEL MATERIAL
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 0, 0)
      const descripcion = row.descripcion || ''
      
      if (!sinPrecios && !conPreciosCliente) {
        // Con precios completos: limitar ancho para que no se superponga
        const descripcionLines = doc.splitTextToSize(descripcion, 35)
        doc.text(descripcionLines.slice(0, 2), 30, yPosition + 8)
      } else {
        // Sin precios o con precios cliente: usar más espacio para la descripción
        const descripcionLines = doc.splitTextToSize(descripcion, pageWidth - 60)
        doc.text(descripcionLines.slice(0, 2), 30, yPosition + 10)
      }

      if (!sinPrecios && !conPreciosCliente) {
        // EXPORTACIÓN COMPLETA CON TODOS LOS PRECIOS Y MÁRGENES
        // PRECIO UNITARIO
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(0, 0, 0)
        const precioUnit = parseFloat(row.precio_unitario) || 0
        doc.text(`${precioUnit.toFixed(2)} $`, 85, yPosition + 10, { align: 'right' })

        // CANTIDAD
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(0, 0, 0)
        const cantidad = row.cantidad || ''
        doc.text(cantidad.toString(), 105, yPosition + 10, { align: 'center' })

        // TOTAL (sin margen)
        const totalBase = precioUnit * (parseFloat(cantidad) || 0)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(0, 0, 0)
        doc.text(`${totalBase.toFixed(2)} $`, 130, yPosition + 10, { align: 'right' })

        // MARGEN (% y dinero alineados)
        const porcentaje = parseFloat(row.porcentaje_margen) || 0
        const margen = parseFloat(row.margen) || 0
        
        if (porcentaje > 0 || margen > 0) {
          // Porcentaje arriba
          doc.setFontSize(8)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(0, 0, 0)
          doc.text(`${porcentaje.toFixed(2)}%`, 160, yPosition + 8, { align: 'right' })
          
          // Monto abajo, alineado con el porcentaje
          doc.setFontSize(7)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(100, 100, 100)
          doc.text(`${margen.toFixed(2)} $`, 160, yPosition + 13, { align: 'right' })
        }

        // TOTAL FINAL (total + margen)
        const totalFinal = totalBase + margen
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(0, 0, 0)
        doc.text(`${totalFinal.toFixed(2)} $`, pageWidth - 12, yPosition + 10, { align: 'right' })
      } else if (conPreciosCliente) {
        // EXPORTACIÓN CON PRECIOS PARA CLIENTE (Material | Cant | Total)
        // CANTIDAD
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(0, 0, 0)
        const cantidad = row.cantidad || ''
        doc.text(cantidad.toString(), pageWidth - 50, yPosition + 10, { align: 'right' })
        
        // TOTAL (con margen incluido)
        const total = parseFloat(row.total) || 0
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(0, 0, 0)
        doc.text(`${total} $`, pageWidth - 12, yPosition + 10, { align: 'right' })
      } else {
        // EXPORTACIÓN SIN PRECIOS (Material | Cant)
        // SOLO CANTIDAD
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(0, 0, 0)
        const cantidad = row.cantidad || ''
        doc.text(cantidad.toString(), pageWidth - 12, yPosition + 10, { align: 'right' })
      }

      yPosition += rowHeight + 1
    }

    // Subtotal de la sección
    doc.setFillColor(245, 245, 245)
    doc.rect(10, yPosition, pageWidth - 20, 7, 'F')
    
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text('Subtotal:', pageWidth - 60, yPosition + 5)
    doc.text(`${subtotalSeccion.toFixed(2)} $`, pageWidth - 12, yPosition + 5, { align: 'right' })
    
    yPosition += 10
    seccionIndex++
  }

  // ========== TOTALES Y SERVICIOS ==========
  // Buscar servicios, transportación y totales en los datos
  const servicios = data.filter(row => row.tipo === 'Servicio')
  const transportacion = data.filter(row => row.tipo === 'Transportación')
  const totales = data.filter(row => row.tipo === 'TOTAL')
  const datosPago = data.filter(row => row.seccion === 'PAGO')

  if (servicios.length > 0 || transportacion.length > 0 || totales.length > 0) {
    yPosition += 5
    
    // Servicios
    servicios.forEach(servicio => {
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(0, 0, 0)
      doc.text(servicio.descripcion, 12, yPosition)
      doc.text(`${parseFloat(servicio.total || 0).toFixed(2)} $`, pageWidth - 12, yPosition, { align: 'right' })
      yPosition += 6
    })

    // Transportación
    transportacion.forEach(trans => {
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(0, 0, 0)
      doc.text(trans.descripcion, 12, yPosition)
      doc.text(`${parseFloat(trans.total || 0).toFixed(2)} $`, pageWidth - 12, yPosition, { align: 'right' })
      yPosition += 6
    })

    // Total final
    if (totales.length > 0) {
      yPosition += 3
      doc.setFillColor(200, 230, 201)
      doc.rect(10, yPosition, pageWidth - 20, 10, 'F')
      
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 0, 0)
      doc.text('Precio Final', 12, yPosition + 7)
      doc.text(`${parseFloat(totales[0].total || 0).toFixed(2)} $`, pageWidth - 12, yPosition + 7, { align: 'right' })
      yPosition += 12
    }
  }

  // ========== SECCIÓN DE PAGO ==========
  if (datosPago.length > 0) {
    yPosition += 10
    
    // Verificar espacio en la página
    if (yPosition > doc.internal.pageSize.getHeight() - 80) {
      doc.addPage()
      yPosition = 15
    }

    // Línea separadora
    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(0.5)
    doc.line(10, yPosition, pageWidth - 10, yPosition)
    yPosition += 8

    datosPago.forEach(pago => {
      // Saltar el Precio Final duplicado en la sección PAGO
      if (pago.tipo === 'TOTAL') {
        return
      }

      // Verificar espacio
      if (yPosition > doc.internal.pageSize.getHeight() - 25) {
        doc.addPage()
        yPosition = 15
      }

      if (pago.tipo === 'Info') {
        if (pago.descripcion.startsWith('✓')) {
          // Items con checkbox
          doc.setFontSize(9)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(60, 60, 60)
          doc.text(pago.descripcion.replace('✓', '•'), 12, yPosition)
          
          if (pago.total) {
            doc.setTextColor(0, 0, 0)
            doc.text(pago.total, pageWidth - 12, yPosition, { align: 'right' })
          }
          yPosition += 6
        } else {
          // Info regular
          doc.setFontSize(9)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(80, 80, 80)
          doc.text(pago.descripcion, 12, yPosition)
          
          if (pago.total) {
            doc.setFont('helvetica', 'normal')
            doc.setTextColor(0, 0, 0)
            doc.text(pago.total, pageWidth - 12, yPosition, { align: 'right' })
          }
          yPosition += 6
        }
      } else if (pago.tipo === 'Datos') {
        // Datos de cuenta indentados
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(100, 100, 100)
        const datosLines = doc.splitTextToSize(pago.total || '', pageWidth - 32)
        doc.text(datosLines, 18, yPosition)
        yPosition += (datosLines.length * 4) + 4
      } else if (pago.tipo === 'Monto') {
        // Monto de contribución
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(60, 60, 60)
        doc.text(pago.descripcion, 18, yPosition)
        
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(0, 0, 0)
        doc.text(pago.total || '', pageWidth - 12, yPosition, { align: 'right' })
        yPosition += 8
      } else if (pago.tipo === 'Nota') {
        // Nota de redondeo
        doc.setFontSize(7)
        doc.setFont('helvetica', 'italic')
        doc.setTextColor(120, 120, 120)
        doc.text(pago.descripcion, pageWidth - 12, yPosition, { align: 'right' })
        yPosition += 6
      } else if (pago.tipo === 'Tasa') {
        // Tasa de cambio
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(80, 80, 80)
        doc.text(pago.descripcion, 18, yPosition)
        yPosition += 6
      } else if (pago.tipo === 'Conversión') {
        // Precio convertido
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(0, 0, 0)
        doc.text(pago.descripcion, 12, yPosition)
        doc.text(pago.total || '', pageWidth - 12, yPosition, { align: 'right' })
        yPosition += 8
      }
    })
  }

  // ========== PIE DE PÁGINA ==========
  const pageCount = (doc as any).internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    
    doc.setDrawColor(200, 200, 200)
    doc.line(10, doc.internal.pageSize.getHeight() - 12, pageWidth - 10, doc.internal.pageSize.getHeight() - 12)
    
    doc.setFontSize(7)
    doc.setTextColor(100, 100, 100)
    doc.text(
      `Página ${i} de ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'center' }
    )
    
    doc.text(
      'SUNCAR SRL - Soluciones en Energía Solar',
      10,
      doc.internal.pageSize.getHeight() - 8
    )
  }

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
