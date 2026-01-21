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
    
    // Crear documento PDF en formato ticket (80mm de ancho)
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 297], // Ancho de ticket térmico estándar
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
    yPos += 6;

    // Información de la tienda
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    if (nitTienda) {
      doc.text(`NIT: ${nitTienda}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 4;
    }
    if (direccionTienda) {
      const direccionLines = doc.splitTextToSize(direccionTienda, contentWidth);
      doc.text(direccionLines, pageWidth / 2, yPos, { align: 'center' });
      yPos += direccionLines.length * 4;
    }
    if (telefonoTienda) {
      doc.text(`Tel: ${telefonoTienda}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 4;
    }

    // Línea separadora
    yPos += 2;
    doc.setLineWidth(0.3);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 4;

    // ============ INFORMACIÓN DE LA ORDEN ============
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('RECIBO DE VENTA', pageWidth / 2, yPos, { align: 'center' });
    yPos += 6;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    
    // Número de orden
    doc.setFont('helvetica', 'bold');
    doc.text('Orden:', margin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(`#${orden.numero_orden}`, margin + 15, yPos);
    yPos += 4;

    // ID de pago (si existe)
    if (orden.id) {
      doc.setFont('helvetica', 'bold');
      doc.text('ID Pago:', margin, yPos);
      doc.setFont('helvetica', 'normal');
      const idCorto = orden.id.substring(0, 8).toUpperCase();
      doc.text(idCorto, margin + 15, yPos);
      yPos += 4;
    }

    // Fecha y hora
    const fechaEmision = new Date(orden.fecha_pago || orden.fecha_creacion);
    doc.setFont('helvetica', 'bold');
    doc.text('Fecha:', margin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(fechaEmision.toLocaleDateString('es-ES'), margin + 15, yPos);
    yPos += 4;

    doc.setFont('helvetica', 'bold');
    doc.text('Hora:', margin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(fechaEmision.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }), margin + 15, yPos);
    yPos += 5;

    // ============ DATOS DEL CLIENTE ============
    if (orden.cliente_nombre || orden.cliente_id) {
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 4;

      doc.setFont('helvetica', 'bold');
      doc.text('CLIENTE', pageWidth / 2, yPos, { align: 'center' });
      yPos += 4;

      // Si es cliente de instaladora, mostrar "Cliente de Instaladora" primero
      if (orden.cliente_id) {
        doc.setFont('helvetica', 'bold');
        doc.text('Cliente de Instaladora', pageWidth / 2, yPos, { align: 'center' });
        yPos += 5;
      }

      doc.setFont('helvetica', 'normal');
      if (orden.cliente_nombre) {
        const nombreLines = doc.splitTextToSize(orden.cliente_nombre, contentWidth);
        doc.text(nombreLines, margin, yPos);
        yPos += nombreLines.length * 4;
      }

      if (orden.cliente_ci) {
        doc.text(`CI: ${orden.cliente_ci}`, margin, yPos);
        yPos += 4;
      }
      if (orden.cliente_telefono) {
        doc.text(`Tel: ${orden.cliente_telefono}`, margin, yPos);
        yPos += 4;
      }
      yPos += 1;
    }

    // Línea separadora
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 4;

    // ============ PRODUCTOS ============
    doc.setFont('helvetica', 'bold');
    doc.text('PRODUCTOS', pageWidth / 2, yPos, { align: 'center' });
    yPos += 5;

    // Tabla de productos
    const productosData = orden.items.map(item => {
      const descripcion = item.descripcion.length > 25 
        ? item.descripcion.substring(0, 25) + '...' 
        : item.descripcion;
      
      return [
        descripcion,
        item.cantidad.toString(),
        `$${item.precio_unitario.toFixed(2)}`,
        `$${item.subtotal.toFixed(2)}`
      ];
    });

    autoTable(doc, {
      startY: yPos,
      head: [['Producto', 'Cant', 'P.Unit', 'Total']],
      body: productosData,
      theme: 'plain',
      styles: {
        fontSize: 7,
        cellPadding: 1,
        overflow: 'linebreak',
      },
      headStyles: {
        fontStyle: 'bold',
        fillColor: [240, 240, 240],
        textColor: [0, 0, 0],
      },
      columnStyles: {
        0: { cellWidth: 35 }, // Producto
        1: { cellWidth: 10, halign: 'center' }, // Cantidad
        2: { cellWidth: 15, halign: 'right' }, // Precio unitario
        3: { cellWidth: 15, halign: 'right' }, // Total
      },
      margin: { left: margin, right: margin },
    });

    // @ts-ignore - autoTable agrega la propiedad lastAutoTable
    yPos = doc.lastAutoTable.finalY + 4;

    // Línea separadora
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 4;

    // ============ TOTALES ============
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');

    // Subtotal
    doc.text('Subtotal:', margin, yPos);
    doc.text(`$${orden.subtotal.toFixed(2)}`, pageWidth - margin, yPos, { align: 'right' });
    yPos += 4;

    // Descuento (si aplica)
    if (orden.descuento_monto > 0) {
      doc.text(`Descuento (${orden.descuento_porcentaje}%):`, margin, yPos);
      doc.text(`-$${orden.descuento_monto.toFixed(2)}`, pageWidth - margin, yPos, { align: 'right' });
      yPos += 4;
    }

    // Impuestos
    doc.text(`Impuestos (${orden.impuesto_porcentaje}%):`, margin, yPos);
    doc.text(`$${orden.impuesto_monto.toFixed(2)}`, pageWidth - margin, yPos, { align: 'right' });
    yPos += 5;

    // Total (destacado)
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL:', margin, yPos);
    doc.text(`$${orden.total.toFixed(2)}`, pageWidth - margin, yPos, { align: 'right' });
    yPos += 6;

    // Línea separadora
    doc.setLineWidth(0.5);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 4;

    // ============ MÉTODO DE PAGO ============
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('MÉTODO DE PAGO', pageWidth / 2, yPos, { align: 'center' });
    yPos += 4;

    doc.setFont('helvetica', 'normal');
    const metodoPago = orden.metodo_pago?.toUpperCase() || 'NO ESPECIFICADO';
    doc.text(metodoPago, pageWidth / 2, yPos, { align: 'center' });
    yPos += 5;

    // Detalles según método de pago
    if (orden.pagos && orden.pagos.length > 0) {
      const pago = orden.pagos[0];

      if (pago.metodo === 'efectivo' && pago.monto_recibido) {
        doc.text('Recibido:', margin, yPos);
        doc.text(`$${pago.monto_recibido.toFixed(2)}`, pageWidth - margin, yPos, { align: 'right' });
        yPos += 4;

        const cambio = pago.cambio || (pago.monto_recibido - orden.total);
        if (cambio > 0) {
          doc.setFont('helvetica', 'bold');
          doc.text('Cambio:', margin, yPos);
          doc.text(`$${cambio.toFixed(2)}`, pageWidth - margin, yPos, { align: 'right' });
          doc.setFont('helvetica', 'normal');
          yPos += 4;
        }
      } else if ((pago.metodo === 'tarjeta' || pago.metodo === 'transferencia') && pago.referencia) {
        doc.text('Referencia:', margin, yPos);
        const refLines = doc.splitTextToSize(pago.referencia, contentWidth - 20);
        doc.text(refLines, margin + 20, yPos);
        yPos += refLines.length * 4;
      }
    }

    yPos += 2;

    // Línea separadora
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 5;

    // ============ PIE DE PÁGINA ============
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('¡Gracias por su compra!', pageWidth / 2, yPos, { align: 'center' });
    yPos += 4;

    doc.setFontSize(6);
    doc.text('Este documento es un comprobante de pago', pageWidth / 2, yPos, { align: 'center' });
    yPos += 3;
    doc.text('Conserve este recibo', pageWidth / 2, yPos, { align: 'center' });

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
