import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { OrdenCompra } from '@/lib/types/feats/caja-types';

interface ReciboData {
  orden: OrdenCompra;
  nombreTienda?: string;
  direccionTienda?: string;
  telefonoTienda?: string;
  nitTienda?: string;
}

interface ReciboSalidaContabilidadData {
  nombreAlmacen?: string;
  fecha?: Date;
  items: {
    codigo_contabilidad?: string;
    descripcion: string;
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
  }[];
  total: number;
}

// Variable global para almacenar el directorio seleccionado
let directorioRecibos: FileSystemDirectoryHandle | null = null;

export class ReciboService {
  /**
   * Solicita al usuario seleccionar una carpeta para guardar recibos
   */
  static async seleccionarCarpetaRecibos(): Promise<FileSystemDirectoryHandle | null> {
    try {
      // Verificar si el navegador soporta File System Access API
      if (!('showDirectoryPicker' in window)) {
        throw new Error('Tu navegador no soporta la selección de carpetas. Usa Chrome, Edge o un navegador compatible.');
      }

      // @ts-ignore - showDirectoryPicker existe en navegadores modernos
      const directorio = await window.showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'downloads',
      });

      directorioRecibos = directorio;
      
      // Guardar en localStorage para recordar la preferencia
      localStorage.setItem('carpetaRecibosSeleccionada', 'true');
      
      return directorio;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        // Usuario canceló la selección
        return null;
      }
      throw error;
    }
  }

  /**
   * Obtiene el directorio de recibos actual
   */
  static getDirectorioRecibos(): FileSystemDirectoryHandle | null {
    return directorioRecibos;
  }

  /**
   * Verifica si hay una carpeta seleccionada
   */
  static tieneCarpetaSeleccionada(): boolean {
    return directorioRecibos !== null;
  }

  /**
   * Limpia la carpeta seleccionada
   */
  static limpiarCarpetaRecibos(): void {
    directorioRecibos = null;
    localStorage.removeItem('carpetaRecibosSeleccionada');
  }

  /**
   * Verifica si el navegador soporta File System Access API
   */
  static soportaSeleccionCarpeta(): boolean {
    return 'showDirectoryPicker' in window;
  }
  /**
   * Genera un recibo de pago en formato PDF
   */
  static generarRecibo(data: ReciboData): jsPDF {
    const { orden, nombreTienda, direccionTienda, telefonoTienda, nitTienda } = data;
    
    // Crear documento PDF en formato ticket térmico de 80mm
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [72, 297], // Ancho efectivo de impresión térmica
    });

    let yPos = 10;
    const pageWidth = doc.internal.pageSize.getWidth();
    const marginLeft = 2.6;
    const marginRight = 2.6;
    // Calibración para esta impresora: mover todo el contenido ligeramente a la izquierda.
    const horizontalNudgeMm = -0.5;
    const contentWidth = pageWidth - (marginLeft + marginRight);
    const contentLeftX = marginLeft + horizontalNudgeMm;
    const contentRightX = pageWidth - marginRight + horizontalNudgeMm;
    const centerX = (contentLeftX + contentRightX) / 2;
    const tableColWidths = {
      producto: 28,
      cantidad: 5.5,
      precioUnit: 15.5,
      total: 15.5,
    };
    const tableWidth =
      tableColWidths.producto +
      tableColWidths.cantidad +
      tableColWidths.precioUnit +
      tableColWidths.total;
    const tableLeftX = centerX - tableWidth / 2;
    const tableRightX = tableLeftX + tableWidth;
    // Alinear los totales generales exactamente con la columna "Total" de la tabla de productos.
    const productsTotalRightX = tableRightX;
    const amountRightX = productsTotalRightX - 0.5; // compensación por padding derecho de la celda
    const formatMoney = (value: number) => {
      const [entero, decimal] = value.toFixed(2).split('.');
      const enteroAgrupado = entero.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
      return `${enteroAgrupado},${decimal}`;
    };

    // ============ ENCABEZADO ============
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    const nombreEmpresa = nombreTienda || 'SUNCAR BOLIVIA';
    doc.text(nombreEmpresa, centerX, yPos, { align: 'center', maxWidth: contentWidth - 12 });
    yPos += 6;

    // Información de la tienda
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    if (nitTienda) {
      doc.text(`NIT: ${nitTienda}`, centerX, yPos, { align: 'center' });
      yPos += 4;
    }
    if (direccionTienda) {
      const direccionLines = doc.splitTextToSize(direccionTienda, contentWidth);
      doc.text(direccionLines, centerX, yPos, { align: 'center' });
      yPos += direccionLines.length * 4;
    }
    if (telefonoTienda) {
      doc.text(`Tel: ${telefonoTienda}`, centerX, yPos, { align: 'center' });
      yPos += 4;
    }

    // Línea separadora
    yPos += 2;
    doc.setLineWidth(0.3);
    doc.line(contentLeftX, yPos, contentRightX, yPos);
    yPos += 4;

    // ============ INFORMACIÓN DE LA ORDEN ============
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.text('RECIBO DE VENTA', centerX, yPos, { align: 'center' });
    yPos += 6;

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    
    // Número de orden
    doc.setFont('helvetica', 'bold');
    doc.text('Orden:', contentLeftX, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(`#${orden.numero_orden}`, contentLeftX + 15, yPos);
    yPos += 4;

    // ID de pago (si existe)
    if (orden.id) {
      doc.setFont('helvetica', 'bold');
      doc.text('ID Pago:', contentLeftX, yPos);
      doc.setFont('helvetica', 'normal');
      const idCorto = orden.id.substring(0, 8).toUpperCase();
      doc.text(idCorto, contentLeftX + 15, yPos);
      yPos += 4;
    }

    // Fecha y hora
    const fechaEmision = new Date(orden.fecha_pago || orden.fecha_creacion);
    doc.setFont('helvetica', 'bold');
    doc.text('Fecha:', contentLeftX, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(fechaEmision.toLocaleDateString('es-ES'), contentLeftX + 15, yPos);
    yPos += 4;

    doc.setFont('helvetica', 'bold');
    doc.text('Hora:', contentLeftX, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(fechaEmision.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }), contentLeftX + 15, yPos);
    yPos += 5;

    // ============ DATOS DEL CLIENTE ============
    if (orden.cliente_nombre || orden.cliente_id) {
      doc.line(contentLeftX, yPos, contentRightX, yPos);
      yPos += 4;

      doc.setFont('helvetica', 'bold');
      doc.text('CLIENTE', centerX, yPos, { align: 'center' });
      yPos += 4;

      // Si es cliente de instaladora, mostrar "Cliente de Instaladora" primero
      if (orden.cliente_id) {
        doc.setFont('helvetica', 'bold');
        doc.text('Cliente de Instaladora', centerX, yPos, { align: 'center' });
        yPos += 5;
      }

      doc.setFont('helvetica', 'normal');
      if (orden.cliente_nombre) {
        const nombreLines = doc.splitTextToSize(orden.cliente_nombre, contentWidth);
        doc.text(nombreLines, contentLeftX, yPos);
        yPos += nombreLines.length * 4;
      }

      if (orden.cliente_ci) {
        doc.text(`CI: ${orden.cliente_ci}`, contentLeftX, yPos);
        yPos += 4;
      }
      if (orden.cliente_telefono) {
        doc.text(`Tel: ${orden.cliente_telefono}`, contentLeftX, yPos);
        yPos += 4;
      }
      yPos += 1;
    }

    // Línea separadora
    doc.line(contentLeftX, yPos, contentRightX, yPos);
    yPos += 4;

    // ============ PRODUCTOS ============
    doc.setFont('helvetica', 'bold');
    doc.text('PRODUCTOS', centerX, yPos, { align: 'center' });
    yPos += 5;

    // Tabla de productos: no truncar descripción, permitir salto de línea
    const productosData = orden.items.map(item => [
      item.descripcion || '-',
      item.cantidad.toString(),
      formatMoney(item.precio_unitario),
      formatMoney(item.subtotal),
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Producto', 'Cant.', 'P.Unit', 'Total']],
      body: productosData,
      theme: 'plain',
      styles: {
        fontSize: 7.7,
        cellPadding: { top: 0.8, right: 0.9, bottom: 0.8, left: 0.9 },
        overflow: 'linebreak',
        valign: 'top',
      },
      headStyles: {
        fontSize: 7.9,
        fontStyle: 'bold',
        fillColor: [240, 240, 240],
        textColor: [0, 0, 0],
      },
      columnStyles: {
        0: { cellWidth: tableColWidths.producto, fontStyle: 'bold', fontSize: 8.2 }, // Producto (wrap)
        1: { cellWidth: tableColWidths.cantidad, halign: 'center', fontStyle: 'bold', fontSize: 8.4 }, // Cantidad
        2: { cellWidth: tableColWidths.precioUnit, halign: 'right', fontStyle: 'bold', fontSize: 8.4 }, // Precio unitario
        3: { cellWidth: tableColWidths.total, halign: 'right', fontStyle: 'bold', fontSize: 8.4 }, // Total
      },
      margin: { left: tableLeftX, right: pageWidth - tableRightX },
    });

    // @ts-ignore - autoTable agrega la propiedad lastAutoTable
    yPos = doc.lastAutoTable.finalY + 4;

    // Línea separadora
    doc.line(contentLeftX, yPos, contentRightX, yPos);
    yPos += 4;

    // ============ TOTALES ============
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    // Subtotal
    doc.setFont('helvetica', 'bold');
    doc.text('Subtotal:', tableLeftX, yPos);
    doc.text(formatMoney(orden.subtotal), amountRightX, yPos, { align: 'right' });
    yPos += 4;

    // Descuento (si aplica)
    if (orden.descuento_monto > 0) {
      doc.text(`Descuento (${orden.descuento_porcentaje}%):`, tableLeftX, yPos);
      doc.text(`-${formatMoney(orden.descuento_monto)}`, amountRightX, yPos, { align: 'right' });
      yPos += 4;
    }

    // Impuestos
    doc.text(`Impuestos (${orden.impuesto_porcentaje}%):`, tableLeftX, yPos);
    doc.text(formatMoney(orden.impuesto_monto), amountRightX, yPos, { align: 'right' });
    yPos += 5;

    // Total (destacado)
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL:', tableLeftX, yPos);
    doc.text(formatMoney(orden.total), amountRightX, yPos, { align: 'right' });
    yPos += 6;

    // Línea separadora
    doc.setLineWidth(0.5);
    doc.line(contentLeftX, yPos, contentRightX, yPos);
    yPos += 4;

    // ============ MÉTODO DE PAGO ============
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('MÉTODO DE PAGO', centerX, yPos, { align: 'center' });
    yPos += 4;

    doc.setFont('helvetica', 'normal');
    const metodoPago = orden.metodo_pago?.toUpperCase() || 'NO ESPECIFICADO';
    doc.text(metodoPago, centerX, yPos, { align: 'center' });
    yPos += 5;

    // Detalles según método de pago
    if (orden.pagos && orden.pagos.length > 0) {
      const pago = orden.pagos[0];

      if (pago.metodo === 'efectivo' && pago.monto_recibido) {
        doc.setFont('helvetica', 'bold');
        doc.text('Recibido:', tableLeftX, yPos);
        doc.text(formatMoney(pago.monto_recibido), amountRightX, yPos, { align: 'right' });
        yPos += 4;

        const cambio = pago.cambio || (pago.monto_recibido - orden.total);
        if (cambio > 0) {
          doc.setFont('helvetica', 'bold');
          doc.text('Cambio:', tableLeftX, yPos);
          doc.text(formatMoney(cambio), amountRightX, yPos, { align: 'right' });
          doc.setFont('helvetica', 'normal');
          yPos += 4;
        }
      } else if ((pago.metodo === 'tarjeta' || pago.metodo === 'transferencia') && pago.referencia) {
        doc.text('Referencia:', contentLeftX, yPos);
        const refLines = doc.splitTextToSize(pago.referencia, contentWidth - 20);
        doc.text(refLines, contentLeftX + 20, yPos);
        yPos += refLines.length * 4;
      }
    }

    yPos += 2;

    // Línea separadora
    doc.line(contentLeftX, yPos, contentRightX, yPos);
    yPos += 5;

    // ============ PIE DE PÁGINA ============
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('¡Gracias por su compra!', centerX, yPos, { align: 'center' });
    yPos += 4;

    doc.setFontSize(6);
    doc.text('Este documento es un comprobante de pago', centerX, yPos, { align: 'center' });
    yPos += 3;
    doc.text('Conserve este recibo', centerX, yPos, { align: 'center' });

    return doc;
  }

  /**
   * Guarda el recibo automáticamente en la carpeta seleccionada
   */
  static async guardarReciboAutomatico(data: ReciboData): Promise<void> {
    if (!directorioRecibos) {
      throw new Error('No hay carpeta seleccionada. Selecciona una carpeta primero.');
    }

    try {
      const doc = this.generarRecibo(data);
      const pdfBlob = doc.output('blob');
      
      // Generar nombre de archivo único
      const fecha = new Date();
      const fechaStr = fecha.toISOString().split('T')[0].replace(/-/g, '');
      const horaStr = fecha.toTimeString().split(' ')[0].replace(/:/g, '');
      const nombreArchivo = `recibo_${data.orden.numero_orden}_${fechaStr}_${horaStr}.pdf`;

      // Crear archivo en el directorio seleccionado
      const fileHandle = await directorioRecibos.getFileHandle(nombreArchivo, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(pdfBlob);
      await writable.close();

      console.log(`Recibo guardado: ${nombreArchivo}`);
    } catch (error: any) {
      if (error.name === 'NotAllowedError') {
        throw new Error('No tienes permisos para escribir en esta carpeta. Selecciona otra carpeta.');
      }
      throw error;
    }
  }

  /**
   * Descarga el recibo como PDF
   */
  static descargarRecibo(data: ReciboData): void {
    const doc = this.generarRecibo(data);
    const nombreArchivo = `recibo_${data.orden.numero_orden}_${Date.now()}.pdf`;
    doc.save(nombreArchivo);
  }

  /**
   * Genera y descarga ticket manual desde el Dashboard.
   * - nombreAlmacen es opcional: si no se provee, no se muestra "Emitido desde".
   * - Tabla de productos sin líneas: Nombre | Precio unit. | Total (sin código).
   */
  static descargarTicketManualDashboard(data: ReciboSalidaContabilidadData): void {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [72, 297],
    });

    const fecha = data.fecha || new Date();
    const formatMoney = (value: number) => {
      const [entero, decimal] = value.toFixed(2).split('.');
      const enteroAgrupado = entero.replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0');
      return `${enteroAgrupado}.${decimal}`;
    };

    const pageWidth = doc.internal.pageSize.getWidth();
    const marginLeft = 2.6;
    const marginRight = 2.6;
    const horizontalNudgeMm = -0.5;
    const contentLeftX = marginLeft + horizontalNudgeMm;
    const contentRightX = pageWidth - marginRight + horizontalNudgeMm;
    const centerX = (contentLeftX + contentRightX) / 2;
    const amountRightX = contentRightX - 0.5;
    let yPos = 10;

    // ===== ENCABEZADO =====
    doc.setFontSize(11.5);
    doc.setFont('helvetica', 'bold');
    doc.text('RECIBO DE VENTA', centerX, yPos, { align: 'center' });
    yPos += 6;

    doc.setFontSize(9.2);

    // Fecha
    doc.setFont('helvetica', 'bold');
    doc.text('Fecha:', contentLeftX, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(fecha.toLocaleDateString('es-ES'), contentLeftX + 15, yPos);
    yPos += 4;

    // Hora
    doc.setFont('helvetica', 'bold');
    doc.text('Hora:', contentLeftX, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(
      fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      contentLeftX + 15,
      yPos,
    );
    yPos += 4;

    // Lugar (solo si se proporcionó)
    if (data.nombreAlmacen && data.nombreAlmacen.trim()) {
      doc.setFont('helvetica', 'bold');
      doc.text('Lugar:', contentLeftX, yPos);
      const labelWidth = doc.getTextWidth('Lugar:');
      doc.setFont('helvetica', 'normal');
      doc.text(data.nombreAlmacen.trim(), contentLeftX + labelWidth + 1.8, yPos);
      yPos += 4;
    }

    yPos += 1;
    doc.setLineWidth(0.3);
    doc.line(contentLeftX, yPos, contentRightX, yPos);
    yPos += 4;

    // ===== PRODUCTOS (tabla sin líneas) =====
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('PRODUCTOS', centerX, yPos, { align: 'center' });
    yPos += 5;

    const colWidths = {
      nombre: 38,
      precioUnit: 14,
      cantidad: 12,
    };
    const tableWidth = colWidths.nombre + colWidths.precioUnit + colWidths.cantidad;
    const tableLeftX = centerX - tableWidth / 2;

    const productosData = data.items.map((item) => [
      (item.descripcion || '-').toUpperCase(),
      formatMoney(item.precio_unitario),
      String(item.cantidad),
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Nombre', 'P. Unit.', 'Cant.']],
      body: productosData,
      theme: 'plain',
      styles: {
        fontSize: 8.2,
        cellPadding: { top: 1.2, right: 1, bottom: 1.2, left: 1 },
        overflow: 'linebreak',
        valign: 'top',
        lineWidth: 0,
      },
      headStyles: {
        fontSize: 8,
        fontStyle: 'bold',
        fillColor: false as unknown as [number, number, number],
        textColor: [0, 0, 0],
        lineWidth: 0,
      },
      columnStyles: {
        0: { cellWidth: colWidths.nombre, fontStyle: 'bold' },
        1: { cellWidth: colWidths.precioUnit, halign: 'right', fontStyle: 'bold' },
        2: { cellWidth: colWidths.cantidad, halign: 'center', fontStyle: 'bold' },
      },
      margin: { left: tableLeftX, right: pageWidth - (tableLeftX + tableWidth) },
    });

    // @ts-ignore
    yPos = doc.lastAutoTable.finalY + 4;

    doc.setLineWidth(0.3);
    doc.line(contentLeftX, yPos, contentRightX, yPos);
    yPos += 5;

    // ===== TOTAL =====
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL:', contentLeftX, yPos);
    doc.text(formatMoney(data.total), amountRightX, yPos, { align: 'right' });
    yPos += 7;

    doc.setLineWidth(0.3);
    doc.line(contentLeftX, yPos, contentRightX, yPos);
    yPos += 6;

    // ===== PIE =====
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('¡Gracias por su compra!', centerX, yPos, { align: 'center' });
    yPos += 4;
    doc.setFontSize(6);
    doc.text('Este documento es un comprobante de pago', centerX, yPos, { align: 'center' });
    yPos += 3;
    doc.text('Conserve este recibo', centerX, yPos, { align: 'center' });

    const nombreArchivo = `ticket_manual_${Date.now()}.pdf`;
    doc.save(nombreArchivo);
  }

  /**
   * Genera y descarga recibo simplificado para salidas de Existencias-Contabilidad
   */
  static descargarReciboSalidaContabilidad(data: ReciboSalidaContabilidadData): void {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [72, 297],
    });

    const fecha = data.fecha || new Date();
    const formatMoney = (value: number) => {
      const [entero, decimal] = value.toFixed(2).split('.');
      const enteroAgrupado = entero.replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0');
      return `${enteroAgrupado}.${decimal}`;
    };
    const pageWidth = doc.internal.pageSize.getWidth();
    const marginLeft = 2.6;
    const marginRight = 2.6;
    const horizontalNudgeMm = -0.5;
    const contentLeftX = marginLeft + horizontalNudgeMm;
    const contentRightX = pageWidth - marginRight + horizontalNudgeMm;
    const centerX = (contentLeftX + contentRightX) / 2;
    const tableLeftX = contentLeftX;
    const tableRightX = contentRightX;
    const amountRightX = tableRightX - 0.5;
    let yPos = 10;

    doc.setFontSize(11.5);
    doc.setFont('helvetica', 'bold');
    doc.text('RECIBO DE VENTA', centerX, yPos, { align: 'center' });
    yPos += 6;

    doc.setFontSize(9.2);
    doc.setFont('helvetica', 'bold');
    doc.text('Fecha:', contentLeftX, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(fecha.toLocaleDateString('es-ES'), contentLeftX + 15, yPos);
    yPos += 4;

    doc.setFont('helvetica', 'bold');
    doc.text('Hora:', contentLeftX, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }), contentLeftX + 15, yPos);
    yPos += 4;

    doc.setFont('helvetica', 'bold');
    doc.text('Emitido desde:', contentLeftX, yPos);
    const emitidoDesdeLabelWidth = doc.getTextWidth('Emitido desde:');
    doc.setFont('helvetica', 'normal');
    doc.text(data.nombreAlmacen || 'Almacén Chull', contentLeftX + emitidoDesdeLabelWidth + 1.8, yPos);
    yPos += 5;

    doc.line(contentLeftX, yPos, contentRightX, yPos);
    yPos += 4;

    doc.setFont('helvetica', 'bold');
    doc.text('PRODUCTOS', centerX, yPos, { align: 'center' });
    yPos += 5;

    const detailsLeftX = tableLeftX + 1;
    const detailsWidth = tableRightX - tableLeftX - 2;
    const drawLabelValueLine = (label: string, value: string) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.1);
      doc.text(label, detailsLeftX, yPos);
      const labelWidth = doc.getTextWidth(label);
      doc.text(value, detailsLeftX + labelWidth + 0.6, yPos);
      yPos += 3.7;
    };

    data.items.forEach((item, index) => {
      const descripcion = item.descripcion || '-';
      const nombreConCodigo = `${index + 1}. ${descripcion}`;
      const codigoLinea = `Código: ${item.codigo_contabilidad || '-'}`;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.7);
      const nombreLines = doc.splitTextToSize(nombreConCodigo, detailsWidth);
      doc.text(nombreLines, detailsLeftX, yPos);
      yPos += nombreLines.length * 4;

      const codigoLines = doc.splitTextToSize(codigoLinea, detailsWidth);
      doc.text(codigoLines, detailsLeftX, yPos);
      yPos += codigoLines.length * 3.8;

      drawLabelValueLine('Precio unitario:', formatMoney(item.precio_unitario));
      drawLabelValueLine('Cantidad:', String(item.cantidad));
      drawLabelValueLine('Total producto:', formatMoney(item.subtotal));
      yPos += 1.8;
    });

    yPos += 1;
    doc.line(contentLeftX, yPos, contentRightX, yPos);
    yPos += 5;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL:', tableLeftX, yPos);
    doc.text(formatMoney(data.total), amountRightX, yPos, { align: 'right' });
    yPos += 7;

    doc.line(contentLeftX, yPos, contentRightX, yPos);
    yPos += 6;

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('¡Gracias por su compra!', centerX, yPos, { align: 'center' });
    yPos += 4;
    doc.setFontSize(6);
    doc.text('Este documento es un comprobante de pago', centerX, yPos, { align: 'center' });
    yPos += 3;
    doc.text('Conserve este recibo', centerX, yPos, { align: 'center' });

    const nombreArchivo = `recibo_salida_contabilidad_${Date.now()}.pdf`;
    doc.save(nombreArchivo);
  }

  /**
   * Abre el recibo en una nueva ventana para imprimir
   */
  static imprimirRecibo(data: ReciboData): void {
    const doc = this.generarRecibo(data);
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    
    // Abrir en nueva ventana
    const printWindow = window.open(pdfUrl, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  }

  /**
   * Obtiene el PDF como Blob para guardarlo en el backend
   */
  static obtenerReciboBlob(data: ReciboData): Blob {
    const doc = this.generarRecibo(data);
    return doc.output('blob');
  }

  /**
   * Obtiene el PDF como base64 para guardarlo en el backend
   */
  static obtenerReciboBase64(data: ReciboData): string {
    const doc = this.generarRecibo(data);
    return doc.output('dataurlstring');
  }

  /**
   * Genera un PDF del cierre de caja
   */
  static generarCierreCaja(sesion: any, efectivoCierre: number, nombreTienda?: string): jsPDF {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 297],
    });

    let yPos = 10;
    const pageWidth = 80;
    const margin = 5;
    const contentWidth = pageWidth - (margin * 2);

    // ============ ENCABEZADO ============
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    const nombreEmpresa = nombreTienda || 'SUNCAR BOLIVIA';
    doc.text(nombreEmpresa, pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;

    doc.setFontSize(12);
    doc.text('CIERRE DE CAJA', pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;

    // ============ INFORMACIÓN DE LA SESIÓN ============
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    
    doc.setFont('helvetica', 'bold');
    doc.text('Sesión:', margin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(sesion.numero_sesion, margin + 20, yPos);
    yPos += 4;

    const fechaCierre = new Date();
    doc.setFont('helvetica', 'bold');
    doc.text('Fecha:', margin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(fechaCierre.toLocaleDateString('es-ES'), margin + 20, yPos);
    yPos += 4;

    doc.setFont('helvetica', 'bold');
    doc.text('Hora:', margin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(fechaCierre.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }), margin + 20, yPos);
    yPos += 6;

    // Línea separadora
    doc.setLineWidth(0.3);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 5;

    // ============ RESUMEN DE VENTAS ============
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMEN DE VENTAS', pageWidth / 2, yPos, { align: 'center' });
    yPos += 5;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    
    const cantidadOrdenes = sesion.cantidad_ordenes || 0;
    doc.text(`Órdenes procesadas: ${cantidadOrdenes}`, margin, yPos);
    yPos += 4;
    doc.text(`Total ventas: ${sesion.total_ventas.toFixed(2)} $`, margin, yPos);
    yPos += 6;

    // Línea separadora
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 5;

    // ============ EFECTIVO ============
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('EFECTIVO', margin, yPos);
    yPos += 5;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    
    doc.text('Apertura:', margin + 2, yPos);
    doc.text(`${sesion.efectivo_apertura.toFixed(2)} $`, pageWidth - margin, yPos, { align: 'right' });
    yPos += 4;

    doc.text('Pagos en Efectivo:', margin + 2, yPos);
    doc.text(`${sesion.total_efectivo.toFixed(2)} $`, pageWidth - margin, yPos, { align: 'right' });
    yPos += 4;

    const totalMovimientos = (sesion.total_entradas || 0) - (sesion.total_salidas || 0);
    doc.text('Entradas/Salidas:', margin + 2, yPos);
    doc.text(`${totalMovimientos >= 0 ? '' : '- '}${Math.abs(totalMovimientos).toFixed(2)} $`, pageWidth - margin, yPos, { align: 'right' });
    yPos += 5;

    // Efectivo esperado
    const efectivoEsperado = sesion.efectivo_apertura + sesion.total_efectivo + (sesion.total_entradas || 0) - (sesion.total_salidas || 0);
    doc.setFont('helvetica', 'bold');
    doc.text('Esperado:', margin + 2, yPos);
    doc.text(`${efectivoEsperado.toFixed(2)} $`, pageWidth - margin, yPos, { align: 'right' });
    yPos += 4;

    doc.setFont('helvetica', 'normal');
    doc.text('Contado:', margin + 2, yPos);
    doc.text(`${efectivoCierre.toFixed(2)} $`, pageWidth - margin, yPos, { align: 'right' });
    yPos += 5;

    // Diferencia
    const diferencia = efectivoCierre - efectivoEsperado;
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 4;

    doc.setFont('helvetica', 'bold');
    doc.text('Diferencia:', margin + 2, yPos);
    doc.text(`${diferencia >= 0 ? '' : '- '}${Math.abs(diferencia).toFixed(2)} $`, pageWidth - margin, yPos, { align: 'right' });
    yPos += 6;

    // Línea separadora
    doc.setLineWidth(0.3);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 5;

    // ============ TARJETA ============
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('TARJETA', margin, yPos);
    yPos += 5;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Total:', margin + 2, yPos);
    doc.text(`${sesion.total_tarjeta.toFixed(2)} $`, pageWidth - margin, yPos, { align: 'right' });
    yPos += 6;

    // Línea separadora
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 5;

    // ============ TRANSFERENCIA ============
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('TRANSFERENCIA', margin, yPos);
    yPos += 5;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Total:', margin + 2, yPos);
    doc.text(`${sesion.total_transferencia.toFixed(2)} $`, pageWidth - margin, yPos, { align: 'right' });
    yPos += 6;

    // Línea separadora
    doc.setLineWidth(0.5);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 5;

    // ============ TOTAL GENERAL ============
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL GENERAL', margin, yPos);
    doc.text(`${sesion.total_ventas.toFixed(2)} $`, pageWidth - margin, yPos, { align: 'right' });
    yPos += 8;

    // Línea separadora
    doc.setLineWidth(0.3);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 5;

    // ============ NOTA DE CIERRE ============
    if (sesion.nota_cierre) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('NOTAS:', margin, yPos);
      yPos += 4;

      doc.setFont('helvetica', 'normal');
      const notaLines = doc.splitTextToSize(sesion.nota_cierre, contentWidth);
      doc.text(notaLines, margin, yPos);
      yPos += notaLines.length * 4 + 4;
    }

    // ============ PIE DE PÁGINA ============
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('Cierre de caja registradora', pageWidth / 2, yPos, { align: 'center' });
    yPos += 3;
    doc.text('Conserve este documento', pageWidth / 2, yPos, { align: 'center' });

    return doc;
  }

  /**
   * Guarda el cierre de caja automáticamente en la carpeta seleccionada
   */
  static async guardarCierreCajaAutomatico(sesion: any, efectivoCierre: number, nombreTienda?: string): Promise<void> {
    if (!directorioRecibos) {
      throw new Error('No hay carpeta seleccionada. Selecciona una carpeta primero.');
    }

    try {
      const doc = this.generarCierreCaja(sesion, efectivoCierre, nombreTienda);
      const pdfBlob = doc.output('blob');
      
      // Generar nombre de archivo único
      const fecha = new Date();
      const fechaStr = fecha.toISOString().split('T')[0].replace(/-/g, '');
      const horaStr = fecha.toTimeString().split(' ')[0].replace(/:/g, '');
      const nombreArchivo = `cierre_caja_${sesion.numero_sesion}_${fechaStr}_${horaStr}.pdf`;

      // Crear archivo en el directorio seleccionado
      const fileHandle = await directorioRecibos.getFileHandle(nombreArchivo, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(pdfBlob);
      await writable.close();

      console.log(`Cierre de caja guardado: ${nombreArchivo}`);
    } catch (error: any) {
      if (error.name === 'NotAllowedError') {
        throw new Error('No tienes permisos para escribir en esta carpeta. Selecciona otra carpeta.');
      }
      throw error;
    }
  }

  /**
   * Descarga el cierre de caja como PDF
   */
  static descargarCierreCaja(sesion: any, efectivoCierre: number, nombreTienda?: string): void {
    const doc = this.generarCierreCaja(sesion, efectivoCierre, nombreTienda);
    const nombreArchivo = `cierre_caja_${sesion.numero_sesion}_${Date.now()}.pdf`;
    doc.save(nombreArchivo);
  }

  /**
   * Imprime el cierre de caja
   */
  static imprimirCierreCaja(sesion: any, efectivoCierre: number, nombreTienda?: string): void {
    const doc = this.generarCierreCaja(sesion, efectivoCierre, nombreTienda);
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    
    const printWindow = window.open(pdfUrl, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  }
}
