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

/**
 * Formatea un número para usar coma como separador decimal
 * Asegura que 8.0 se muestre como "8,0" y no como "80"
 */
function formatNumberWithComma(value: number, decimals: number = 2): string {
  return value.toFixed(decimals).replace('.', ',')
}

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
    atencion_de?: string
  }
  leadData?: {
    id?: string
    nombre?: string
    telefono?: string
    email?: string
    provincia?: string
    direccion?: string
    atencion_de?: string
  }
  leadSinAgregarData?: {
    nombre?: string
    atencion_de?: string
  }
  ofertaData?: {
    numero_oferta?: string
    nombre_oferta?: string
    tipo_oferta?: string
    fecha_creacion?: string
  }
  componentesPrincipales?: {
    inversor?: {
      codigo: string
      cantidad: number
      potencia: number
      marca?: string
    }
    bateria?: {
      codigo: string
      cantidad: number
      capacidad: number
    }
    panel?: {
      codigo: string
      cantidad: number
      potencia: number
    }
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
  const { title, subtitle, filename, columns, data, logoUrl, clienteData, leadData, leadSinAgregarData, ofertaData, componentesPrincipales, incluirFotos, fotosMap, sinPrecios, conPreciosCliente } = options

  // Crear documento PDF en orientación vertical
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  let yPosition = 2 // Reducido de 5 a 2 - muy cerca del borde

  // ========== ENCABEZADO ==========
  // Generar descripción del sistema basado en componentes principales
  let descripcionSistema = ''
  
  if (componentesPrincipales) {
    const partes: string[] = []
    
    // Inversor
    if (componentesPrincipales.inversor) {
      const totalKW = (componentesPrincipales.inversor.cantidad * componentesPrincipales.inversor.potencia).toFixed(2)
      partes.push(`${totalKW} KW DE INVERSOR`)
    }
    
    // Batería
    if (componentesPrincipales.bateria) {
      const totalKWH = (componentesPrincipales.bateria.cantidad * componentesPrincipales.bateria.capacidad).toFixed(2)
      partes.push(`${totalKWH} KWH DE BATERÍA`)
    }
    
    // Paneles
    if (componentesPrincipales.panel) {
      const totalKW = ((componentesPrincipales.panel.cantidad * componentesPrincipales.panel.potencia) / 1000).toFixed(2)
      partes.push(`${totalKW} KW EN PANELES`)
    }
    
    if (partes.length > 0) {
      descripcionSistema = `SISTEMA FOTOVOLTAICO COMPUESTO POR ${partes.join(', ')}.`
      
      // Agregar fabricante si está disponible
      if (componentesPrincipales.inversor?.marca) {
        descripcionSistema += ` FABRICANTE ${componentesPrincipales.inversor.marca.toUpperCase()}`
      }
    }
  }
  
  // Si no hay componentes principales, usar el subtitle como fallback
  if (!descripcionSistema && subtitle) {
    descripcionSistema = subtitle.toUpperCase()
  }
  
  // Calcular altura del encabezado basado en el contenido
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  const descripcionLines = doc.splitTextToSize(descripcionSistema, pageWidth - 40) // Aumentado de 50 a 40 para más ancho de texto
  const headerHeight = 18 + (descripcionLines.length * 4.5) // Reducido de 22
  
  // Fondo verde claro para el encabezado - Color exacto del ejemplo: RGB(189, 215, 176)
  doc.setFillColor(189, 215, 176)
  doc.rect(0, 0, pageWidth, headerHeight, 'F')

  // Logo en la esquina superior derecha (dentro del espacio verde)
  if (logoUrl) {
    try {
      const logoBase64 = await imageToBase64(logoUrl)
      if (logoBase64) {
        const logoSize = 28 // Tamaño del logo
        const logoY = 0.5 // Más arriba, reducido de 1 a 0.5
        doc.addImage(logoBase64, 'PNG', pageWidth - logoSize - 2, logoY, logoSize, logoSize)
      }
    } catch (error) {
      console.error('Error agregando logo al PDF:', error)
    }
  }

  // Título principal - OFERTA en mayúsculas y más robusto
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text('OFERTA', 5, 8)

  // Descripción del sistema
  if (descripcionSistema) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text(descripcionLines, 5, 16) // Bajado de 15 a 16 para más espacio hacia abajo
  }

  yPosition = headerHeight + 5

  // ========== DATOS DEL CLIENTE / LEAD ==========
  // Determinar el nombre para "A la atención de"
  let atencionDe = ''
  
  if (clienteData && clienteData.atencion_de) {
    atencionDe = clienteData.atencion_de
  } else if (leadData && leadData.atencion_de) {
    atencionDe = leadData.atencion_de
  } else if (leadSinAgregarData && leadSinAgregarData.atencion_de) {
    atencionDe = leadSinAgregarData.atencion_de
  }
  
  if (atencionDe) {
    doc.setFontSize(11) // Aumentado de 9 a 11 para que sea más grande
    doc.setFont('helvetica', 'bold') // Cambiado de 'normal' a 'bold' para más énfasis
    doc.setTextColor(0, 0, 0)
    doc.text(`A la atención de: ${atencionDe}`, 10, yPosition)
    yPosition += 8
  }

  // ========== PRESUPUESTO DE MATERIALES ==========
  // ENCABEZADOS DE COLUMNAS - UNA SOLA VEZ AL INICIO
  if (!options.sinPrecios && !conPreciosCliente) {
    // Encabezados completos con precios y márgenes
    doc.setFillColor(250, 250, 250)
    doc.rect(10, yPosition, pageWidth - 20, 6, 'F')
    
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(100, 100, 100)
    
    // Layout optimizado - P. Unit, Total y Margen centrados:
    // Foto: 12-34 (22mm)
    // Material: 38-95 (57mm) - MÁS ANCHO
    doc.text('Material', 38, yPosition + 4)
    // P.Unit: 97-113 (16mm) - CENTRADO en su columna
    doc.text('P. Unit', 105, yPosition + 4, { align: 'center' })
    // Cant: 115-125 (10mm) - CENTRADA (bien)
    doc.text('Cant', 120, yPosition + 4, { align: 'center' })
    // Total: 127-153 (26mm) - CENTRADO en el medio de la columna
    doc.text('Total', 140, yPosition + 4, { align: 'center' })
    // Margen: 155-175 (20mm) - CENTRADO en su columna (solo dinero, sin %)
    doc.text('Margen', 165, yPosition + 4, { align: 'center' })
    // Total Final: 177-198 (21mm) - PEGADO a Margen
    doc.text('Total Final', pageWidth - 12, yPosition + 4, { align: 'right' })
    
    yPosition += 8
  } else if (conPreciosCliente) {
    // Encabezados con precios para cliente (Material | Cant | Total)
    doc.setFillColor(250, 250, 250)
    doc.rect(10, yPosition, pageWidth - 20, 6, 'F')
    
    doc.setFontSize(9) // Aumentado de 7 a 9
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(100, 100, 100)
    // Foto: 12-34 (22mm)
    // Material: 38-150 (112mm) - mucho más espacio
    doc.text('Material', 38, yPosition + 4)
    // Cant: 152-170 (18mm)
    doc.text('Cant', 161, yPosition + 4, { align: 'right' })
    // Total: 172-198 (26mm)
    doc.text('Total', pageWidth - 12, yPosition + 4, { align: 'right' })
    
    yPosition += 8
  } else {
    // Encabezados simplificados sin precios (Material | Cant)
    doc.setFillColor(250, 250, 250)
    doc.rect(10, yPosition, pageWidth - 20, 6, 'F')
    
    doc.setFontSize(9) // Aumentado de 7 a 9
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
    // Verificar espacio para nueva sección (solo encabezado + al menos 1 material)
    const espacioNecesario = 8 + 15 + 7 // Encabezado + 1 material + subtotal
    if (yPosition + espacioNecesario > doc.internal.pageSize.getHeight() - 30) {
      doc.addPage()
      yPosition = 15
    }

    // Calcular subtotal de la sección
    const subtotalSeccion = rows.reduce((sum, row) => {
      if (conPreciosCliente) {
        // Para exportación con precios cliente, usar el campo "total" directamente
        const total = parseFloat(row.total) || 0
        return sum + total
      } else {
        // Para exportación completa, calcular precio * cantidad + margen
        const precio = parseFloat(row.precio_unitario) || 0
        const cantidad = parseFloat(row.cantidad) || 0
        const margen = parseFloat(row.margen) || 0
        return sum + (precio * cantidad) + margen
      }
    }, 0)

    // Encabezado de sección con fondo gris claro
    doc.setFillColor(245, 245, 245)
    doc.rect(10, yPosition, pageWidth - 20, 8, 'F')
    
    doc.setFontSize(11) // Aumentado de 10 a 11
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text(seccion, 12, yPosition + 5.5) // Quitado el número de sección
    
    yPosition += 10

    // Materiales de la sección
    for (const row of rows) {
      const rowHeight = 15 // Reducido de 25 a 15 para que quepan más componentes por página
      
      // Verificar espacio en la página (dejar margen para pie de página)
      if (yPosition + rowHeight > doc.internal.pageSize.getHeight() - 30) {
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

      // FOTO (si está disponible) - AUMENTADA
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
              
              const containerSize = 14 // Aumentado de 13 a 14 para mejor visibilidad
              const padding = 1
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

      // NOMBRE DEL MATERIAL - LETRA AUMENTADA
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 0, 0)
      const descripcion = row.descripcion || ''
      
      // Variable para determinar la posición Y de los demás campos
      let camposYPosition = yPosition + 9 // Posición por defecto (1 línea)
      
      if (!sinPrecios && !conPreciosCliente) {
        // Con precios completos: limitar ancho para que no se superponga con precio unitario
        const anchoDisponible = 57 // 57mm de ancho para el material - MÁS ANCHO
        const descripcionLines = doc.splitTextToSize(descripcion, anchoDisponible)
        // Mostrar hasta 2 líneas del nombre completo
        if (descripcionLines.length === 1) {
          doc.text(descripcionLines[0], 38, yPosition + 9)
          camposYPosition = yPosition + 9 // Centrado vertical
        } else {
          doc.text(descripcionLines[0], 38, yPosition + 7)
          doc.text(descripcionLines[1], 38, yPosition + 11)
          camposYPosition = yPosition + 9 // Centrado entre las 2 líneas
        }
      } else if (conPreciosCliente) {
        // Con precios cliente: limitar ancho para que no se superponga con cantidad
        const anchoDisponible = 112 // 112mm de ancho para el material
        const descripcionLines = doc.splitTextToSize(descripcion, anchoDisponible)
        doc.text(descripcionLines.slice(0, 1), 38, yPosition + 9)
        camposYPosition = yPosition + 9
      } else {
        // Sin precios: limitar ancho para que no se superponga con cantidad
        const anchoDisponible = pageWidth - 12 - 38 - 5
        const descripcionLines = doc.splitTextToSize(descripcion, anchoDisponible)
        doc.text(descripcionLines.slice(0, 1), 38, yPosition + 9)
        camposYPosition = yPosition + 9
      }

      if (!sinPrecios && !conPreciosCliente) {
        // EXPORTACIÓN COMPLETA CON TODOS LOS PRECIOS Y MÁRGENES
        // PRECIO UNITARIO - CENTRADO en su columna
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(0, 0, 0)
        const precioUnit = parseFloat(row.precio_unitario) || 0
        doc.text(`${formatNumberWithComma(precioUnit)} $`, 105, camposYPosition, { align: 'center' })

        // CANTIDAD - CENTRADA (bien)
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(0, 0, 0)
        const cantidad = row.cantidad || ''
        doc.text(cantidad.toString(), 120, camposYPosition, { align: 'center' })

        // TOTAL (sin margen) - CENTRADO en su columna
        const totalBase = precioUnit * (parseFloat(cantidad) || 0)
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(0, 0, 0)
        doc.text(`${formatNumberWithComma(totalBase)} $`, 140, camposYPosition, { align: 'center' })

        // MARGEN - CENTRADO en su columna (solo dinero, sin %)
        const margenStr = row.margen?.toString() || ''
        
        // Convertir de formato "8,5" a número (reemplazar coma por punto)
        const margen = margenStr ? parseFloat(margenStr.replace(',', '.')) : 0
        
        if (margen > 0) {
          doc.setFontSize(9)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(0, 0, 0)
          doc.text(`${formatNumberWithComma(margen)} $`, 165, camposYPosition, { align: 'center' })
        } else {
          // Mostrar guion si no hay margen
          doc.setFontSize(9)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(100, 100, 100)
          doc.text('-', 165, camposYPosition, { align: 'center' })
        }

        // TOTAL FINAL (total + margen) - PEGADO a Margen
        const totalFinal = totalBase + margen
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(0, 0, 0)
        doc.text(`${formatNumberWithComma(totalFinal)} $`, pageWidth - 12, camposYPosition, { align: 'right' })
      } else if (conPreciosCliente) {
        // EXPORTACIÓN CON PRECIOS PARA CLIENTE (Material | Cant | Total)
        // CANTIDAD
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(0, 0, 0)
        const cantidad = row.cantidad || ''
        doc.text(cantidad.toString(), 161, camposYPosition, { align: 'right' })
        
        // TOTAL (con margen incluido)
        const total = parseFloat(row.total) || 0
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(0, 0, 0)
        doc.text(`${total} $`, pageWidth - 12, camposYPosition, { align: 'right' })
      } else {
        // EXPORTACIÓN SIN PRECIOS (Material | Cant)
        // SOLO CANTIDAD
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(0, 0, 0)
        const cantidad = row.cantidad || ''
        doc.text(cantidad.toString(), pageWidth - 12, camposYPosition, { align: 'right' })
      }

      yPosition += rowHeight + 1
    }

    // Subtotal de la sección - NO mostrar si es exportación sin precios O si solo hay 1 material
    if (!sinPrecios && rows.length > 1) {
      doc.setFillColor(245, 245, 245)
      doc.rect(10, yPosition, pageWidth - 20, 7, 'F')
      
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 0, 0)
      // Alinear "Subtotal:" centrado en la columna Margen
      doc.text('Subtotal:', 165, yPosition + 5, { align: 'center' })
      doc.text(`${formatNumberWithComma(subtotalSeccion)} $`, pageWidth - 12, yPosition + 5, { align: 'right' })
      
      yPosition += 10
    } else {
      // Sin precios o solo 1 material: solo un pequeño espacio entre secciones
      yPosition += 5
    }
    
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
    
    // Verificar espacio para servicios y totales (dejar margen para pie de página)
    if (yPosition > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage()
      yPosition = 15
    }
    
    // Servicios
    servicios.forEach(servicio => {
      doc.setFontSize(10) // Aumentado de 9 a 10
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(0, 0, 0)
      doc.text(servicio.descripcion, 12, yPosition)
      doc.text(`${formatNumberWithComma(parseFloat(servicio.total || 0))} $`, pageWidth - 12, yPosition, { align: 'right' })
      yPosition += 6
    })

    // Transportación
    transportacion.forEach(trans => {
      doc.setFontSize(10) // Aumentado de 9 a 10
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(0, 0, 0)
      doc.text(trans.descripcion, 12, yPosition)
      doc.text(`${formatNumberWithComma(parseFloat(trans.total || 0))} $`, pageWidth - 12, yPosition, { align: 'right' })
      yPosition += 6
    })

    // Total final
    if (totales.length > 0) {
      yPosition += 3
      doc.setFillColor(189, 215, 176) // Mismo color verde del encabezado
      doc.rect(10, yPosition, pageWidth - 20, 10, 'F')
      
      doc.setFontSize(13) // Aumentado de 12 a 13
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 0, 0)
      doc.text('Precio Final', 12, yPosition + 7)
      doc.text(`${formatNumberWithComma(parseFloat(totales[0].total || 0))} $`, pageWidth - 12, yPosition + 7, { align: 'right' })
      yPosition += 12
    }
  }

  // ========== SECCIÓN DE PAGO ==========
  if (datosPago.length > 0) {
    yPosition += 10
    
    // Verificar espacio en la página (dejar margen para pie de página)
    if (yPosition > doc.internal.pageSize.getHeight() - 60) {
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

      // Verificar espacio (dejar margen para pie de página)
      if (yPosition > doc.internal.pageSize.getHeight() - 30) {
        doc.addPage()
        yPosition = 15
      }

      if (pago.tipo === 'Info') {
        if (pago.descripcion.startsWith('✓')) {
          // Items con checkbox
          doc.setFontSize(10) // Aumentado de 9 a 10
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
          doc.setFontSize(10) // Aumentado de 9 a 10
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
        doc.setFontSize(9) // Aumentado de 8 a 9
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(100, 100, 100)
        const datosLines = doc.splitTextToSize(pago.total || '', pageWidth - 32)
        doc.text(datosLines, 18, yPosition)
        yPosition += (datosLines.length * 4) + 4
      } else if (pago.tipo === 'Monto') {
        // Monto de contribución
        doc.setFontSize(10) // Aumentado de 9 a 10
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(60, 60, 60)
        doc.text(pago.descripcion, 18, yPosition)
        
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(0, 0, 0)
        doc.text(pago.total || '', pageWidth - 12, yPosition, { align: 'right' })
        yPosition += 8
      } else if (pago.tipo === 'Nota') {
        // Nota de redondeo
        doc.setFontSize(8) // Aumentado de 7 a 8
        doc.setFont('helvetica', 'italic')
        doc.setTextColor(120, 120, 120)
        doc.text(pago.descripcion, pageWidth - 12, yPosition, { align: 'right' })
        yPosition += 6
      } else if (pago.tipo === 'Tasa') {
        // Tasa de cambio
        doc.setFontSize(10) // Aumentado de 9 a 10
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(80, 80, 80)
        doc.text(pago.descripcion, 18, yPosition)
        yPosition += 6
      } else if (pago.tipo === 'Conversión') {
        // Precio convertido
        doc.setFontSize(11) // Aumentado de 10 a 11
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
