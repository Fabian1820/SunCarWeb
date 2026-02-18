import jsPDF from 'jspdf'
import type { Pago } from './pago-service'

interface ComprobanteData {
  pago: Pago
  oferta: {
    numero_oferta: string
    nombre_completo: string
    precio_final: number
  }
  contacto: {
    nombre: string
    carnet?: string
    telefono?: string
    direccion?: string
  }
}

export class ExportComprobanteService {
  private static readonly EMPRESA = {
    nombre: 'Empresa Solar Carros',
    direccion: 'Calle 24 #109 e/ 1ra y 3ra, Playa La Habana, Cuba',
    telefono: '+53 5 282 6474',
    email: 'info@suncarsrl.com'
  }

  /**
   * Genera un PDF con dos comprobantes de pago (uno para cliente, uno para empresa)
   */
  static generarComprobantePDF(data: ComprobanteData): void {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter' // 215.9 x 279.4 mm
    })

    // Generar primer comprobante (parte superior)
    this.dibujarComprobante(doc, data, 10)

    // Línea de corte con tijeras
    this.dibujarLineaCorte(doc, 140)

    // Generar segundo comprobante (parte inferior)
    this.dibujarComprobante(doc, data, 150)

    // Descargar PDF
    const fecha = new Date(data.pago.fecha).toISOString().split('T')[0]
    const nombreArchivo = `Comprobante_Pago_${data.oferta.numero_oferta}_${fecha}.pdf`
    doc.save(nombreArchivo)
  }

  /**
   * Dibuja un comprobante en la posición Y especificada
   */
  private static dibujarComprobante(doc: jsPDF, data: ComprobanteData, startY: number): void {
    const { pago, oferta, contacto } = data
    const margenIzq = 20
    const margenDer = 190
    let y = startY

    // Título centrado
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('COMPROBANTE DE PAGO', 105, y, { align: 'center' })
    y += 8

    // Empresa (izquierda) y Logo (derecha)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text(this.EMPRESA.nombre, margenIzq, y)
    
    // Logo comentado - no se muestra pero se mantiene el espacio
    // try {
    //   doc.addImage('/logo Suncar.png', 'PNG', margenDer - 25, y - 10, 25, 25)
    // } catch (error) {
    //   console.log('No se pudo cargar el logo')
    // }
    
    y += 4
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text(this.EMPRESA.direccion, margenIzq, y)
    
    y += 5

    // Fecha (antes de la línea)
    const fecha = new Date(pago.fecha)
    const fechaFormateada = `${fecha.getDate().toString().padStart(2, '0')}/${(fecha.getMonth() + 1).toString().padStart(2, '0')}/${fecha.getFullYear()}`
    doc.text(`Fecha: ${fechaFormateada}`, margenIzq, y)
    y += 5

    // Línea separadora simple
    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(0.3)
    doc.line(margenIzq, y, margenDer, y)
    y += 6

    // Entregado por
    doc.setFont('helvetica', 'bold')
    doc.text('Entregado por:', margenIzq, y)
    doc.setFont('helvetica', 'normal')
    // Si pago_cliente es true, usar datos del contacto; si no, usar nombre_pagador
    const nombrePagador = pago.pago_cliente 
      ? (contacto.nombre || 'No especificado')
      : (pago.nombre_pagador || contacto.nombre || 'No especificado')
    doc.text(nombrePagador, margenIzq + 30, y)
    y += 5

    doc.setFont('helvetica', 'bold')
    doc.text('CI:', margenIzq, y)
    doc.setFont('helvetica', 'normal')
    
    // Determinar el CI a mostrar según quién realizó el pago
    let ci = 'No especificado'
    
    if (pago.pago_cliente) {
      // Pago realizado por el cliente/lead
      // Para clientes: contacto.carnet tendrá el carnet_identidad
      // Para leads: contacto.carnet será null
      if (contacto.carnet && String(contacto.carnet).trim() !== '') {
        ci = String(contacto.carnet).trim()
      }
    } else {
      // Pago realizado por un tercero (pago_cliente = false)
      // Prioridad: carnet_pagador > carnet del contacto
      if (pago.carnet_pagador && String(pago.carnet_pagador).trim() !== '') {
        ci = String(pago.carnet_pagador).trim()
      } else if (contacto.carnet && String(contacto.carnet).trim() !== '') {
        ci = String(contacto.carnet).trim()
      }
    }
    
    doc.text(ci, margenIzq + 30, y)
    y += 8

    // Concepto
    doc.setFont('helvetica', 'bold')
    doc.text('Concepto:', margenIzq, y)
    y += 4
    
    doc.setFont('helvetica', 'normal')
    const conceptoTexto = `Instalación y Montaje de ${oferta.nombre_completo} (${oferta.numero_oferta})`
    const lineasConcepto = doc.splitTextToSize(conceptoTexto, margenDer - margenIzq)
    doc.text(lineasConcepto, margenIzq, y)
    y += (lineasConcepto.length * 4) + 1

    // Sección de montos (estilo ticket) - línea más pegada
    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(0.3)
    doc.line(margenIzq, y, margenDer, y)
    y += 5

    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')

    // Monto Total
    doc.text('Monto Total:', margenIzq, y)
    doc.text(`${this.formatearMoneda(oferta.precio_final)} USD`, margenDer, y, { align: 'right' })
    y += 5

    // Monto Pagado
    doc.text('Monto Pagado:', margenIzq, y)
    doc.text(`${this.formatearMoneda(pago.monto)} ${pago.moneda}`, margenDer, y, { align: 'right' })
    y += 5

    // Moneda y Tasa (solo si no es USD)
    if (pago.moneda !== 'USD') {
      doc.text('Moneda:', margenIzq, y)
      doc.text(pago.moneda, margenDer, y, { align: 'right' })
      y += 5

      doc.text('Tasa de Cambio:', margenIzq, y)
      doc.text(`1 ${pago.moneda} = ${pago.tasa_cambio.toFixed(4)} USD`, margenDer, y, { align: 'right' })
      y += 5

      doc.text('Equivalente USD:', margenIzq, y)
      doc.text(`${this.formatearMoneda(pago.monto_usd)} USD`, margenDer, y, { align: 'right' })
      y += 5
    }

    // Desglose de billetes (si existe)
    if (pago.metodo_pago === 'efectivo' && pago.desglose_billetes && Object.keys(pago.desglose_billetes).length > 0) {
      doc.text('Desglose de Billetes:', margenIzq, y)
      y += 4
      
      Object.entries(pago.desglose_billetes)
        .sort(([a], [b]) => parseFloat(b) - parseFloat(a))
        .forEach(([denominacion, cantidad]) => {
          doc.text(`  ${cantidad} x ${denominacion} ${pago.moneda}`, margenIzq + 5, y)
          doc.text(`${this.formatearMoneda(parseFloat(denominacion) * cantidad)}`, margenDer, y, { align: 'right' })
          y += 4
        })
      y += 1
    }

    // Forma de pago
    doc.text('Forma de Pago:', margenIzq, y)
    doc.text(this.formatearMetodoPago(pago.metodo_pago), margenDer, y, { align: 'right' })
    y += 5

    // Recibido por (solo para efectivo)
    if (pago.metodo_pago === 'efectivo' && pago.recibido_por) {
      doc.text('Recibido por:', margenIzq, y)
      doc.text(pago.recibido_por, margenDer, y, { align: 'right' })
      y += 5
    }

    y += 1

    // Monto Pendiente (destacado)
    const montoPendiente = oferta.precio_final - pago.monto_usd
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text('Monto Pendiente:', margenIzq, y)
    doc.text(`${this.formatearMoneda(montoPendiente)} USD`, margenDer, y, { align: 'right' })
    y += 8

    // Pie de página
    doc.setFontSize(7)
    doc.setFont('helvetica', 'italic')
    doc.text('Comprobante emitido desde Oficina General de Solar Carros', 105, y, { align: 'center' })
    y += 15

    // Líneas de firma
    doc.setFont('helvetica', 'normal')
    doc.setLineWidth(0.3)
    doc.line(margenIzq, y, margenIzq + 60, y)
    doc.line(margenDer - 60, y, margenDer, y)
    
    doc.setFontSize(7)
    doc.text('Firma del Cliente', margenIzq + 30, y + 4, { align: 'center' })
    doc.text('Firma Autorizada Solar Carros', margenDer - 30, y + 4, { align: 'center' })
  }

  /**
   * Dibuja la línea de corte con tijeras
   */
  private static dibujarLineaCorte(doc: jsPDF, y: number): void {
    // Línea punteada manual
    doc.setLineWidth(0.2)
    for (let x = 15; x < 195; x += 4) {
      doc.line(x, y, x + 2, y)
    }

    // Símbolo de tijeras (✂)
    doc.setFontSize(12)
    doc.text('✂', 105, y + 1, { align: 'center' })
  }

  /**
   * Formatea el método de pago
   */
  private static formatearMetodoPago(metodo: string): string {
    const metodos: Record<string, string> = {
      efectivo: 'Efectivo',
      transferencia_bancaria: 'Transferencia Bancaria',
      stripe: 'Pago en Línea (Stripe)'
    }
    return metodos[metodo] || metodo
  }

  /**
   * Formatea moneda
   */
  private static formatearMoneda(valor: number): string {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(valor)
  }
}
