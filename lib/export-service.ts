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
  terminosCondiciones?: string // HTML de términos y condiciones
  seccionesPersonalizadas?: Array<{
    id: string
    label: string
    tipo: 'extra'
    tipo_extra: 'escritura' | 'costo'
    contenido_escritura?: string
    costos_extras?: Array<{
      id: string
      descripcion: string
      cantidad: number
      precio_unitario: number
    }>
  }>
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

  // Debug: verificar si los términos llegaron
  console.log('📄 exportToPDF - Términos y condiciones:', options.terminosCondiciones ? 'SÍ (' + options.terminosCondiciones.length + ' caracteres)' : 'NO')

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
    
    // Batería - Siempre calcular multiplicando cantidad * capacidad
    if (componentesPrincipales.bateria) {
      const potenciaBateria = (componentesPrincipales.bateria.cantidad * componentesPrincipales.bateria.capacidad).toFixed(2)
      partes.push(`${potenciaBateria} KWH DE BATERÍA`)
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
    doc.setFont('helvetica', 'normal') // Cambiado de 'bold' a 'normal' para que no esté en negrita
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
      // Sin precios o solo 1 material: NO agregar espacio extra
      // yPosition += 5  // QUITADO: No agregar espacio entre secciones cuando no hay subtotal
    }
    
    seccionIndex++
  }

  // ========== SECCIONES PERSONALIZADAS DE TIPO COSTO ==========
  let totalCostosExtras = 0
  
  if (options.seccionesPersonalizadas && options.seccionesPersonalizadas.length > 0) {
    // Procesar secciones de tipo COSTO
    const seccionesCosto = options.seccionesPersonalizadas.filter(s => s.tipo_extra === 'costo')
    
    for (const seccion of seccionesCosto) {
      if (!seccion.costos_extras || seccion.costos_extras.length === 0) continue
      
      // Verificar espacio para nueva sección
      const espacioNecesario = 15 + 20
      if (yPosition + espacioNecesario > doc.internal.pageSize.getHeight() - 30) {
        doc.addPage()
        yPosition = 15
      }

      // Encabezado de sección personalizada con fondo gris claro
      doc.setFillColor(245, 245, 245)
      doc.rect(10, yPosition, pageWidth - 20, 8, 'F')
      
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 0, 0)
      doc.text(seccion.label, 12, yPosition + 5.5)
      
      yPosition += 10

      // Procesar cada costo extra como si fuera un material
      for (const costo of seccion.costos_extras) {
        const rowHeight = 15
        
        // Verificar espacio en la página
        if (yPosition + rowHeight > doc.internal.pageSize.getHeight() - 30) {
          doc.addPage()
          yPosition = 15
        }

        // Fondo blanco
        doc.setFillColor(255, 255, 255)
        doc.rect(10, yPosition, pageWidth - 20, rowHeight, 'F')

        // Borde sutil
        doc.setDrawColor(240, 240, 240)
        doc.setLineWidth(0.1)
        doc.rect(10, yPosition, pageWidth - 20, rowHeight)

        // NOMBRE DEL COSTO (donde iría la foto y el nombre del material)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(0, 0, 0)
        const descripcion = costo.descripcion || ''
        
        let camposYPosition = yPosition + 9

        if (!sinPrecios && !conPreciosCliente) {
          // Con precios completos
          const anchoDisponible = 57
          const descripcionLines = doc.splitTextToSize(descripcion, anchoDisponible)
          if (descripcionLines.length === 1) {
            doc.text(descripcionLines[0], 38, yPosition + 9)
          } else {
            doc.text(descripcionLines[0], 38, yPosition + 7)
            doc.text(descripcionLines[1], 38, yPosition + 11)
          }

          // PRECIO UNITARIO
          doc.setFontSize(9)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(0, 0, 0)
          const precioUnit = parseFloat(costo.precio_unitario.toString()) || 0
          doc.text(`${formatNumberWithComma(precioUnit)} $`, 105, camposYPosition, { align: 'center' })

          // CANTIDAD
          doc.setFontSize(10)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(0, 0, 0)
          doc.text(costo.cantidad.toString(), 120, camposYPosition, { align: 'center' })

          // TOTAL BASE
          const totalBase = precioUnit * costo.cantidad
          totalCostosExtras += totalBase
          doc.setFontSize(10)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(0, 0, 0)
          doc.text(`${formatNumberWithComma(totalBase)} $`, 140, camposYPosition, { align: 'center' })

          // MARGEN (vacío para costos extras)
          doc.setFontSize(9)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(100, 100, 100)
          doc.text('-', 165, camposYPosition, { align: 'center' })

          // TOTAL FINAL (igual al total base)
          doc.setFontSize(10)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(0, 0, 0)
          doc.text(`${formatNumberWithComma(totalBase)} $`, pageWidth - 12, camposYPosition, { align: 'right' })

        } else if (conPreciosCliente) {
          // Con precios cliente
          const anchoDisponible = 112
          const descripcionLines = doc.splitTextToSize(descripcion, anchoDisponible)
          doc.text(descripcionLines.slice(0, 1), 38, yPosition + 9)

          // CANTIDAD
          doc.setFontSize(10)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(0, 0, 0)
          doc.text(costo.cantidad.toString(), 161, camposYPosition, { align: 'right' })

          // TOTAL
          const precioUnit = parseFloat(costo.precio_unitario.toString()) || 0
          const total = precioUnit * costo.cantidad
          totalCostosExtras += total
          doc.setFontSize(10)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(0, 0, 0)
          doc.text(`${total} $`, pageWidth - 12, camposYPosition, { align: 'right' })

        } else {
          // Sin precios
          const anchoDisponible = pageWidth - 12 - 38 - 5
          const descripcionLines = doc.splitTextToSize(descripcion, anchoDisponible)
          doc.text(descripcionLines.slice(0, 1), 38, yPosition + 9)

          // CANTIDAD
          doc.setFontSize(10)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(0, 0, 0)
          doc.text(costo.cantidad.toString(), pageWidth - 12, camposYPosition, { align: 'right' })
        }

        yPosition += rowHeight + 1
      }

      yPosition += 5
    }
  }

  // ========== TOTALES Y SERVICIOS ==========
  // Buscar servicios, transportación, contribución, descuentos y totales en los datos
  const subtotales = data.filter(row => row.tipo === 'Subtotal')
  const servicios = data.filter(row => row.tipo === 'Servicio')
  const transportacion = data.filter(row => row.tipo === 'Transportación')
  const contribuciones = data.filter(row => row.tipo === 'Contribucion')
  const descuentos = data.filter(row => row.tipo === 'Descuento')
  const totales = data.filter(row => row.tipo === 'TOTAL')
  const datosPago = data.filter(row => row.seccion === 'PAGO')

  console.log('🔍 DEBUG PDF - Descuentos encontrados:', descuentos.length, descuentos)

  if (subtotales.length > 0 || servicios.length > 0 || transportacion.length > 0 || contribuciones.length > 0 || descuentos.length > 0 || totales.length > 0) {
    yPosition += 5
    
    // Verificar espacio para servicios y totales (dejar margen para pie de página)
    if (yPosition > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage()
      yPosition = 15
    }
    
    // Subtotales (como Total de materiales) - NO MOSTRAR en exportación sin precios
    if (!sinPrecios) {
      subtotales.forEach(subtotal => {
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal') // Cambiado de 'bold' a 'normal'
        doc.setTextColor(0, 0, 0)
        doc.text(subtotal.descripcion, 12, yPosition)
        doc.text(`${formatNumberWithComma(parseFloat(subtotal.total || 0))} $`, pageWidth - 12, yPosition, { align: 'right' })
        yPosition += 5 // Reducido de 8 a 5
      })
    }
    
    // AGREGAR TOTAL DE COSTOS EXTRAS (si hay costos extras y no es sin precios)
    if (totalCostosExtras > 0 && !sinPrecios) {
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal') // Cambiado de 'bold' a 'normal'
      doc.setTextColor(0, 0, 0)
      doc.text('Total costos extras', 12, yPosition)
      doc.text(`${formatNumberWithComma(totalCostosExtras)} $`, pageWidth - 12, yPosition, { align: 'right' })
      yPosition += 5 // Reducido de 8 a 5
    }
    
    // Servicios (Costo de instalación) - NO MOSTRAR en exportación sin precios
    if (!sinPrecios) {
      servicios.forEach(servicio => {
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(0, 0, 0)
        doc.text(servicio.descripcion, 12, yPosition)
        doc.text(`${formatNumberWithComma(parseFloat(servicio.total || 0))} $`, pageWidth - 12, yPosition, { align: 'right' })
        yPosition += 5 // Reducido de 6 a 5
      })
    }

    // Transportación - MOSTRAR EN TODOS LOS TIPOS DE EXPORTACIÓN (incluyendo sin precios)
    transportacion.forEach(trans => {
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(0, 0, 0)
      doc.text(trans.descripcion, 12, yPosition)
      
      // Mostrar precio siempre (incluso en sin precios)
      doc.text(`${formatNumberWithComma(parseFloat(trans.total || 0))} $`, pageWidth - 12, yPosition, { align: 'right' })
      yPosition += 5 // Unificado a 5 para todos
    })

    // Contribución - MOSTRAR EN TODOS LOS TIPOS DE EXPORTACIÓN (incluyendo sin precios)
    contribuciones.forEach(contrib => {
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(0, 0, 0)
      doc.text(contrib.descripcion, 12, yPosition)
      doc.text(`${formatNumberWithComma(parseFloat(contrib.total || 0))} $`, pageWidth - 12, yPosition, { align: 'right' })
      yPosition += 5 // Unificado a 5 para todos
    })

    // Descuentos - MOSTRAR EN TODOS LOS TIPOS DE EXPORTACIÓN (incluyendo sin precios)
    descuentos.forEach(desc => {
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal') // Cambiado de 'bold' a 'normal'
      doc.setTextColor(220, 38, 38)
      doc.text(desc.descripcion, 12, yPosition)
      doc.text(desc.total || '', pageWidth - 12, yPosition, { align: 'right' })
      yPosition += 5 // Unificado a 5 para todos
    })

    // Total final - MOSTRAR EN TODOS LOS TIPOS DE EXPORTACIÓN (incluyendo sin precios)
    if (totales.length > 0) {
      yPosition += 2 // Reducido espacio antes del total
      doc.setFillColor(189, 215, 176)
      doc.rect(10, yPosition, pageWidth - 20, 10, 'F')
      
      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 0, 0)
      doc.text('Precio Final', 12, yPosition + 7)
      doc.text(`${formatNumberWithComma(parseFloat(totales[0].total || 0))} $`, pageWidth - 12, yPosition + 7, { align: 'right' })
      yPosition += 12
    }
  }

  // ========== SECCIONES PERSONALIZADAS DE TIPO TEXTO (ANTES DE DETALLES DE PAGO) ==========
  if (options.seccionesPersonalizadas && options.seccionesPersonalizadas.length > 0) {
    const seccionesTexto = options.seccionesPersonalizadas.filter(s => s.tipo_extra === 'escritura')
    
    for (const seccion of seccionesTexto) {
      if (!seccion.contenido_escritura) continue
      
      // Reducir espacio antes de la sección (de 8 a 5)
      yPosition += 5

      // Verificar espacio para título + línea + al menos 1 línea de texto (mínimo 30)
      const espacioNecesario = 30 // Título (16) + línea (1) + espacio (10) + al menos 1 línea de texto (5) = ~32
      
      if (yPosition > doc.internal.pageSize.getHeight() - espacioNecesario) {
        // Si no hay espacio suficiente para título + al menos 1 línea, crear nueva página
        doc.addPage()
        yPosition = 20
      }

      // Márgenes (iguales a términos y condiciones)
      const margenIzq = 15
      const margenDer = 15
      const anchoTexto = pageWidth - margenIzq - margenDer

      // Título principal (igual que términos y condiciones)
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 0, 0)
      doc.text(seccion.label.toUpperCase(), pageWidth / 2, yPosition, { align: 'center' })
      yPosition += 5 // Reducido de 8 a 5 para estar más pegado

      // Línea separadora decorativa (igual que términos y condiciones)
      doc.setDrawColor(189, 215, 176) // Color verde de SunCar
      doc.setLineWidth(1)
      doc.line(margenIzq, yPosition, pageWidth - margenDer, yPosition)
      yPosition += 10

      // SECCIÓN DE TEXTO - Respetar saltos de línea
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(50, 50, 50)

      // Dividir el texto por saltos de línea (NO filtrar líneas vacías)
      const lineas = seccion.contenido_escritura.split('\n')
      
      for (const linea of lineas) {
        // Verificar espacio en la página
        if (yPosition > doc.internal.pageSize.getHeight() - 25) {
          doc.addPage()
          yPosition = 20
        }

        // Si la línea está vacía, agregar espacio
        if (linea.trim() === '') {
          yPosition += 5
          continue
        }
        
        // Dividir líneas largas
        const lines = doc.splitTextToSize(linea, anchoTexto)
        
        for (const line of lines) {
          if (yPosition > doc.internal.pageSize.getHeight() - 25) {
            doc.addPage()
            yPosition = 20
          }
          
          doc.text(line, margenIzq, yPosition)
          yPosition += 5
        }
        
        yPosition += 2 // Reducido de 3 a 2 para menos espacio entre párrafos
      }
    }
  }

  // ========== SECCIÓN DE PAGO - MOSTRAR EN TODOS LOS TIPOS DE EXPORTACIÓN ==========
  if (datosPago.length > 0) {
    // Reducir espacio antes de la sección (de 10 a 5)
    yPosition += 5
    
    // Verificar espacio para título + línea + al menos 1 línea de texto (mínimo 30)
    const espacioNecesario = 30 // Título (16) + línea (1) + espacio (10) + al menos 1 línea de texto (5) = ~32
    if (yPosition > doc.internal.pageSize.getHeight() - espacioNecesario) {
      doc.addPage()
      yPosition = 20
    }

    // Márgenes (iguales a términos y condiciones)
    const margenIzq = 15
    const margenDer = 15
    const anchoTexto = pageWidth - margenIzq - margenDer

    // Título principal (igual que términos y condiciones)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text('DETALLES DEL PAGO', pageWidth / 2, yPosition, { align: 'center' })
    yPosition += 5 // Reducido de 8 a 5 para estar más pegado

    // Línea separadora decorativa (igual que términos y condiciones)
    doc.setDrawColor(189, 215, 176) // Color verde de SunCar
    doc.setLineWidth(1)
    doc.line(margenIzq, yPosition, pageWidth - margenDer, yPosition)
    yPosition += 10

    // Procesar datos de pago
    let tienePagoTransferencia = false
    let datosCuentaTexto = ''
    let tieneContribucion = false
    let montoContribucion = ''
    let tieneConversion = false
    let monedaPago = ''
    let tasaCambio = ''
    let precioConvertido = ''

    // Recopilar información
    datosPago.forEach(pago => {
      if (pago.tipo === 'Info' && pago.descripcion.includes('transferencia')) {
        tienePagoTransferencia = true
      }
      if (pago.tipo === 'Datos') {
        // Limpiar caracteres de control EXCEPTO saltos de línea (\n = \u000A) y tabulaciones (\t = \u0009)
        datosCuentaTexto = (pago.total || '').replace(/[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/g, '')
      }
      if (pago.tipo === 'Info' && pago.descripcion.includes('Contribución')) {
        tieneContribucion = true
      }
      if (pago.tipo === 'Monto') {
        montoContribucion = pago.total || ''
      }
      if (pago.tipo === 'Info' && pago.descripcion.includes('Moneda')) {
        monedaPago = pago.total || ''
      }
      if (pago.tipo === 'Tasa') {
        tasaCambio = pago.descripcion || ''
      }
      if (pago.tipo === 'Conversión') {
        tieneConversion = true
        precioConvertido = pago.total || ''
      }
    })

    // Configuración de texto
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(50, 50, 50)

    // 1. PAGO POR TRANSFERENCIA
    if (tienePagoTransferencia) {
      // Verificar espacio
      if (yPosition > doc.internal.pageSize.getHeight() - 25) {
        doc.addPage()
        yPosition = 20
      }

      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 0, 0)
      doc.text('Pago por transferencia', margenIzq, yPosition)
      yPosition += 6

      if (datosCuentaTexto) {
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(50, 50, 50)
        
        // Dividir por saltos de línea para respetar los enters del usuario
        // Soportar tanto \n como <br> o <br/>
        let lineas = datosCuentaTexto
          .replace(/<br\s*\/?>/gi, '\n') // Convertir <br> a \n
          .split('\n')
        
        lineas.forEach((linea: string) => {
          // Verificar espacio en la página
          if (yPosition > doc.internal.pageSize.getHeight() - 25) {
            doc.addPage()
            yPosition = 20
          }
          
          if (!linea.trim()) {
            // Línea vacía, agregar espacio pequeño
            yPosition += 3
          } else {
            // Escribir la línea tal cual, sin justificación
            doc.text(linea.trim(), margenIzq, yPosition)
            yPosition += 5
          }
        })
        
        yPosition += 5
      }
    }

    // 2. CONTRIBUCIÓN - ELIMINADA (ahora aparece antes del precio final)
    if (false && tieneContribucion && montoContribucion) {
      // Verificar espacio
      if (yPosition > doc.internal.pageSize.getHeight() - 25) {
        doc.addPage()
        yPosition = 20
      }

      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 0, 0)
      doc.text('Contribución', margenIzq, yPosition)
      
      doc.setFont('helvetica', 'normal')
      doc.text(`$${montoContribucion}`, pageWidth - margenDer, yPosition, { align: 'right' })
      yPosition += 8
    }

    // 3. CONVERSIÓN DE MONEDA
    if (tieneConversion && monedaPago) {
      // Verificar espacio
      if (yPosition > doc.internal.pageSize.getHeight() - 25) {
        doc.addPage()
        yPosition = 20
      }

      // Moneda
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 0, 0)
      doc.text('Moneda', margenIzq, yPosition)
      
      doc.setFont('helvetica', 'normal')
      doc.text(monedaPago, pageWidth - margenDer, yPosition, { align: 'right' })
      yPosition += 6

      // Tasa de cambio
      if (tasaCambio) {
        doc.setFont('helvetica', 'italic')
        doc.setFontSize(9)
        doc.setTextColor(100, 100, 100)
        doc.text(tasaCambio, margenIzq, yPosition)
        yPosition += 6
        doc.setFontSize(10)
      }

      // Total en moneda convertida
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 0, 0)
      doc.text('Total', margenIzq, yPosition)
      
      doc.text(precioConvertido, pageWidth - margenDer, yPosition, { align: 'right' })
      yPosition += 8
    }
  }

  // ========== TÉRMINOS Y CONDICIONES ==========
  if (options.terminosCondiciones) {
    // Reducir espacio antes de la sección (de 15 a 5)
    yPosition += 5
    
    // Verificar espacio para título + línea + al menos 1 línea de texto (mínimo 30)
    const espacioNecesario = 30 // Título (16) + línea (1) + espacio (10) + al menos 1 línea de texto (5) = ~32
    
    if (yPosition > doc.internal.pageSize.getHeight() - espacioNecesario) {
      // Si no hay espacio suficiente para título + al menos 1 línea, crear nueva página
      doc.addPage()
      yPosition = 20
    }
    
    // Márgenes
    const margenIzq = 15
    const margenDer = 15
    const anchoTexto = pageWidth - margenIzq - margenDer
    // NO reiniciar yPosition aquí, continuar desde donde estaba

    // Título principal
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text('TÉRMINOS Y CONDICIONES', pageWidth / 2, yPosition, { align: 'center' })
    yPosition += 5 // Reducido de 8 a 5 para estar más pegado

    // Línea separadora decorativa
    doc.setDrawColor(189, 215, 176) // Color verde de SunCar
    doc.setLineWidth(1)
    doc.line(margenIzq, yPosition, pageWidth - margenDer, yPosition)
    yPosition += 10

    // Convertir HTML a texto plano
    const textoPlano = htmlToPlainText(options.terminosCondiciones)
    
    // Debug: ver las primeras líneas
    console.log('📄 Primeras líneas de términos:', textoPlano.split('\n').slice(0, 10))
    
    // Dividir en líneas
    const lineas = textoPlano.split('\n').filter(l => l.trim())
    
    // Configuración de texto normal
    doc.setFontSize(10) // Aumentado de 9 a 10 para coincidir con el resto del documento
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(50, 50, 50)

    lineas.forEach((linea, index) => {
      const lineaTrim = linea.trim()
      if (!lineaTrim) return
      
      // Verificar espacio en la página (dejar margen para pie de página)
      if (yPosition > doc.internal.pageSize.getHeight() - 25) {
        doc.addPage()
        yPosition = 20
      }
      
      // Detectar si la línea contiene texto en negrita
      const tieneNegrita = lineaTrim.includes('[B]') && lineaTrim.includes('[/B]')
      
      // Limpiar marcadores de negrita para análisis
      const lineaLimpia = lineaTrim.replace(/\[B\]|\[\/B\]/g, '')
      
      // Detectar tipo de contenido
      const esTituloPrincipal = lineaLimpia.length < 60 && lineaLimpia === lineaLimpia.toUpperCase() && !lineaLimpia.startsWith('•')
      const esSubtitulo = lineaLimpia.endsWith(':') && lineaLimpia.length < 40 && !lineaLimpia.startsWith('•') && lineaLimpia.split(' ').length <= 5
      const esLista = lineaLimpia.startsWith('•') || /^\d+[\.\)]/.test(lineaLimpia)
      
      if (esTituloPrincipal) {
        // TÍTULO PRINCIPAL (mayúsculas)
        if (index > 0) {
          yPosition += 5
        }
        
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(12) // Aumentado de 11 a 12
        doc.setTextColor(0, 0, 0)
        
        const tituloLines = doc.splitTextToSize(lineaLimpia, anchoTexto)
        tituloLines.forEach((line: string) => {
          if (yPosition > doc.internal.pageSize.getHeight() - 25) {
            doc.addPage()
            yPosition = 20
          }
          doc.text(line, margenIzq, yPosition)
          yPosition += 6 // Aumentado de 5.5 a 6
        })
        
        yPosition += 2
        
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(10) // Aumentado de 9 a 10
        doc.setTextColor(50, 50, 50)
        
      } else if (esSubtitulo || tieneNegrita) {
        // SUBTÍTULO o TEXTO EN NEGRITA
        if (index > 0 && esSubtitulo) {
          yPosition += 3
        }
        
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(11) // Aumentado de 10 a 11 (igual que "A la atención de")
        doc.setTextColor(0, 0, 0)
        
        const subtituloLines = doc.splitTextToSize(lineaLimpia, anchoTexto)
        subtituloLines.forEach((line: string) => {
          if (yPosition > doc.internal.pageSize.getHeight() - 25) {
            doc.addPage()
            yPosition = 20
          }
          doc.text(line, margenIzq, yPosition)
          yPosition += 5.5 // Aumentado de 5 a 5.5
        })
        
        yPosition += 1
        
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(10) // Aumentado de 9 a 10
        doc.setTextColor(50, 50, 50)
        
      } else if (esLista) {
        // ITEM DE LISTA con indentación
        const indentacion = 20
        const anchoLista = anchoTexto - (indentacion - margenIzq)
        
        // Separar el bullet/número del texto
        let textoLista = lineaLimpia
        if (lineaLimpia.startsWith('•')) {
          textoLista = lineaLimpia.substring(1).trim()
        }
        
        const lines = doc.splitTextToSize(textoLista, anchoLista)
        
        lines.forEach((line: string, i: number) => {
          if (yPosition > doc.internal.pageSize.getHeight() - 25) {
            doc.addPage()
            yPosition = 20
          }
          
          if (i === 0) {
            // Primera línea con bullet
            doc.text('•', margenIzq + 2, yPosition)
            doc.text(line, indentacion, yPosition, { 
              align: 'left',
              maxWidth: anchoLista 
            })
          } else {
            // Líneas siguientes indentadas
            doc.text(line, indentacion, yPosition, { 
              align: 'left',
              maxWidth: anchoLista 
            })
          }
          yPosition += 5 // Aumentado de 4.5 a 5
        })
        
        yPosition += 1
        
      } else {
        // TEXTO NORMAL - JUSTIFICADO
        const lines = doc.splitTextToSize(lineaLimpia, anchoTexto)
        
        lines.forEach((line: string, i: number) => {
          if (yPosition > doc.internal.pageSize.getHeight() - 25) {
            doc.addPage()
            yPosition = 20
          }
          
          // Justificar todas las líneas excepto la última de cada párrafo
          if (i < lines.length - 1) {
            // Línea justificada
            const palabras = line.split(' ')
            if (palabras.length > 1) {
              const anchoLinea = doc.getTextWidth(line)
              const espacioExtra = (anchoTexto - anchoLinea) / (palabras.length - 1)
              
              let xPos = margenIzq
              palabras.forEach((palabra, idx) => {
                doc.text(palabra, xPos, yPosition)
                if (idx < palabras.length - 1) {
                  xPos += doc.getTextWidth(palabra + ' ') + espacioExtra
                }
              })
            } else {
              doc.text(line, margenIzq, yPosition)
            }
          } else {
            // Última línea alineada a la izquierda
            doc.text(line, margenIzq, yPosition)
          }
          
          yPosition += 5 // Aumentado de 4.5 a 5
        })
        
        yPosition += 3 // Aumentado de 2.5 a 3
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
 * Convierte HTML a texto plano para PDF
 * Maneja correctamente la estructura HTML y preserva el formato
 * Marca el texto en negrita con [B]...[/B] para procesarlo después
 */
function htmlToPlainText(html: string): string {
  if (!html) return ''
  
  // Si estamos en el navegador, usar el DOM
  if (typeof document !== 'undefined') {
    const temp = document.createElement('div')
    temp.innerHTML = html
    
    // Función recursiva para procesar nodos
    const processNode = (node: Node): string => {
      let result = ''
      
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent || ''
      }
      
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement
        const tagName = element.tagName.toLowerCase()
        
        // Agregar saltos de línea antes de ciertos elementos
        if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'div'].includes(tagName)) {
          result += '\n'
        }
        
        // Marcar texto en negrita
        if (['strong', 'b'].includes(tagName)) {
          result += '[B]'
        }
        
        // Procesar hijos
        element.childNodes.forEach(child => {
          result += processNode(child)
        })
        
        // Cerrar marca de negrita
        if (['strong', 'b'].includes(tagName)) {
          result += '[/B]'
        }
        
        // Agregar saltos de línea después de ciertos elementos
        if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
          result += '\n'
        } else if (tagName === 'p') {
          result += '\n'
        } else if (tagName === 'br') {
          result += '\n'
        } else if (tagName === 'li') {
          result += '\n'
        }
      }
      
      return result
    }
    
    let text = processNode(temp)
    
    // Limpiar espacios múltiples y líneas vacías excesivas
    return text
      .replace(/\n\s*\n\s*\n/g, '\n\n') // Máximo 2 saltos de línea consecutivos
      .replace(/[ \t]+/g, ' ') // Espacios múltiples a uno solo
      .replace(/^\s+|\s+$/g, '') // Trim
      .replace(/🔹/g, '•') // Reemplazar emoji por bullet
  }
  
  // Fallback para SSR: procesamiento manual de HTML
  return html
    .replace(/<strong[^>]*>|<b[^>]*>/gi, '[B]')
    .replace(/<\/strong>|<\/b>/gi, '[/B]')
    .replace(/<h[1-6][^>]*>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<p[^>]*>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n• ')
    .replace(/<\/li>/gi, '')
    .replace(/<ul[^>]*>|<\/ul>/gi, '\n')
    .replace(/<ol[^>]*>|<\/ol>/gi, '\n')
    .replace(/<div[^>]*>/gi, '\n')
    .replace(/<\/div>/gi, '')
    .replace(/<em[^>]*>|<\/em>/gi, '')
    .replace(/<i[^>]*>|<\/i>/gi, '')
    .replace(/<[^>]+>/g, '') // Remover cualquier otra etiqueta
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/🔹/g, '•')
    .replace(/\n\s*\n\s*\n/g, '\n\n') // Máximo 2 saltos de línea
    .replace(/[ \t]+/g, ' ') // Espacios múltiples a uno solo
    .trim()
}

/**
 * Función helper para generar nombre de archivo con fecha
 */
export function generateFilename(baseName: string): string {
  const now = new Date()
  const dateStr = now.toISOString().split('T')[0].replace(/-/g, '')
  return `${baseName}_${dateStr}`
}
