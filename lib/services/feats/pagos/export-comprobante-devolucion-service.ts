import jsPDF from "jspdf";
import type {
  DevolucionPago,
  OfertaConPagos,
} from "@/lib/services/feats/pagos/pago-service";

interface ComprobanteDevolucionData {
  oferta: OfertaConPagos;
  devolucion: DevolucionPago;
}

export class ExportComprobanteDevolucionService {
  private static readonly EMPRESA = {
    nombre: "Empresa Solar Carros",
    direccion: "Calle 24 #109 e/ 1ra y 3ra, Playa La Habana, Cuba",
    telefono: "+53 5 282 6474",
    email: "info@suncarsrl.com",
  };

  static generarComprobantePDF(data: ComprobanteDevolucionData): void {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "letter",
    });

    this.dibujarComprobante(doc, data, 10);
    this.dibujarLineaCorte(doc, 140);
    this.dibujarComprobante(doc, data, 150);

    const fecha = new Date(data.devolucion.fecha).toISOString().split("T")[0];
    const nombreArchivo = `Comprobante_Devolucion_Cobro_${data.oferta.numero_oferta}_${fecha}.pdf`;
    doc.save(nombreArchivo);
  }

  private static dibujarComprobante(
    doc: jsPDF,
    data: ComprobanteDevolucionData,
    startY: number,
  ): void {
    const { oferta, devolucion } = data;
    const margenIzq = 20;
    const margenDer = 190;
    let y = startY;

    const totalPagado = Number(oferta.total_pagado || 0);
    const totalDevueltoOferta = this.obtenerTotalDevuelto(oferta);
    const montoPendientePorDevolver = Math.max(0, totalPagado - totalDevueltoOferta);

    const fecha = new Date(devolucion.fecha);
    const fechaFormateada = `${fecha.getDate().toString().padStart(2, "0")}/${(fecha.getMonth() + 1).toString().padStart(2, "0")}/${fecha.getFullYear()}`;

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("COMPROBANTE DE DEVOLUCIÓN DE COBRO", 105, y, {
      align: "center",
    });
    y += 8;

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(this.EMPRESA.nombre, margenIzq, y);
    y += 4;

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(this.EMPRESA.direccion, margenIzq, y);
    y += 5;
    doc.text(`Fecha: ${fechaFormateada}`, margenIzq, y);
    y += 5;

    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(margenIzq, y, margenDer, y);
    y += 6;

    doc.setFont("helvetica", "bold");
    doc.text("Recibido por cliente:", margenIzq, y);
    doc.setFont("helvetica", "normal");
    doc.text(oferta.contacto?.nombre || "No especificado", margenIzq + 30, y);
    y += 5;

    doc.setFont("helvetica", "bold");
    doc.text("CI:", margenIzq, y);
    doc.setFont("helvetica", "normal");
    doc.text(oferta.contacto?.carnet || "No especificado", margenIzq + 30, y);
    y += 5;

    doc.setFont("helvetica", "bold");
    doc.text("Entregado por:", margenIzq, y);
    doc.setFont("helvetica", "normal");
    doc.text(this.resolverEntregadoPor(devolucion), margenIzq + 30, y);
    y += 8;

    doc.setFont("helvetica", "bold");
    doc.text("Concepto:", margenIzq, y);
    y += 4;

    doc.setFont("helvetica", "normal");
    const conceptoTexto =
      `Devolución de monto cobrado asociado a la ${oferta.nombre_completo || oferta.numero_oferta}. ` +
      "Operación de ajuste contable por reversión parcial o total de ingreso previamente registrado.";
    const lineasConcepto = doc.splitTextToSize(
      conceptoTexto,
      margenDer - margenIzq,
    );
    doc.text(lineasConcepto, margenIzq, y);
    y += lineasConcepto.length * 4 + 1;

    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(margenIzq, y, margenDer, y);
    y += 5;

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");

    doc.text("Monto Total Oferta:", margenIzq, y);
    doc.text(
      `${this.formatearMoneda(Number(oferta.precio_final || 0))} USD`,
      margenDer,
      y,
      { align: "right" },
    );
    y += 5;

    doc.text("Monto Pagado:", margenIzq, y);
    doc.text(`${this.formatearMoneda(totalPagado)} USD`, margenDer, y, {
      align: "right",
    });
    y += 5;

    doc.text("Monto Devuelto:", margenIzq, y);
    doc.text(
      `${this.formatearMoneda(Number(devolucion.monto_devuelto || 0))} USD`,
      margenDer,
      y,
      { align: "right" },
    );
    y += 5;

    doc.text("Forma de Devolución:", margenIzq, y);
    doc.text(
      devolucion.devolucion_por_transferencia ? "Transferencia" : "Efectivo",
      margenDer,
      y,
      { align: "right" },
    );
    y += 5;

    if (devolucion.devolucion_por_transferencia) {
      doc.text("Cuenta Transferencia:", margenIzq, y);
      doc.text(devolucion.cuenta_transferencia || "-", margenDer, y, {
        align: "right",
      });
      y += 5;

      doc.text("Titular Transferencia:", margenIzq, y);
      doc.text(devolucion.titular_transferencia || "-", margenDer, y, {
        align: "right",
      });
      y += 5;
    }

    if (
      devolucion.desglose_billetes &&
      Object.keys(devolucion.desglose_billetes).length > 0
    ) {
      doc.text("Desglose de Billetes:", margenIzq, y);
      y += 4;
      Object.entries(devolucion.desglose_billetes)
        .sort(([a], [b]) => parseFloat(b) - parseFloat(a))
        .forEach(([denominacion, cantidad]) => {
          doc.text(`  ${cantidad} x ${denominacion}`, margenIzq + 5, y);
          doc.text(
            `${this.formatearMoneda(parseFloat(denominacion) * cantidad)}`,
            margenDer,
            y,
            { align: "right" },
          );
          y += 4;
        });
      y += 1;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Monto Pendiente por Devolver:", margenIzq, y);
    doc.text(
      `${this.formatearMoneda(montoPendientePorDevolver)} USD`,
      margenDer,
      y,
      {
        align: "right",
      },
    );
    y += 8;

    doc.setFontSize(7);
    doc.setFont("helvetica", "italic");
    doc.text(
      "Comprobante emitido desde Oficina General de Solar Carros",
      105,
      y,
      { align: "center" },
    );
    y += 15;

    doc.setFont("helvetica", "normal");
    doc.setLineWidth(0.3);
    doc.line(margenIzq, y, margenIzq + 60, y);
    doc.line(margenDer - 60, y, margenDer, y);

    doc.setFontSize(7);
    doc.text("Firma del Cliente", margenIzq + 30, y + 4, { align: "center" });
    doc.text("Firma Autorizada Solar Carros", margenDer - 30, y + 4, {
      align: "center",
    });
  }

  private static dibujarLineaCorte(doc: jsPDF, y: number): void {
    doc.setLineWidth(0.2);
    for (let x = 15; x < 195; x += 4) {
      doc.line(x, y, x + 2, y);
    }
    doc.setFontSize(12);
    doc.text("✂", 105, y + 1, { align: "center" });
  }

  private static obtenerTotalDevuelto(oferta: OfertaConPagos): number {
    if (typeof oferta.total_devuelto === "number") return oferta.total_devuelto;
    if (Array.isArray(oferta.devoluciones)) {
      return oferta.devoluciones.reduce(
        (sum, item) => sum + Number(item.monto_devuelto || 0),
        0,
      );
    }
    return 0;
  }

  private static formatearMoneda(valor: number): string {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(valor || 0));
  }

  private static resolverEntregadoPor(devolucion: DevolucionPago): string {
    const asRecord = devolucion as unknown as Record<string, unknown>;
    const candidateFromBackend =
      this.cleanString(asRecord.registrado_por_nombre) ||
      this.cleanString(asRecord.nombre_registrado_por) ||
      this.cleanString(asRecord.usuario_nombre) ||
      this.cleanString(asRecord.creado_por_nombre) ||
      this.cleanString(asRecord.registrado_por);

    if (candidateFromBackend && !this.looksLikeCi(candidateFromBackend)) {
      return candidateFromBackend;
    }

    // Fallback al usuario autenticado en frontend.
    if (typeof window !== "undefined") {
      try {
        const userRaw = localStorage.getItem("user_data");
        if (userRaw) {
          const parsed = JSON.parse(userRaw) as { nombre?: string };
          const nombre = this.cleanString(parsed?.nombre);
          if (nombre) return nombre;
        }
      } catch {
        // Ignorar fallback parse errors.
      }
    }

    return candidateFromBackend || "Sistema";
  }

  private static cleanString(value: unknown): string {
    return typeof value === "string" ? value.trim() : "";
  }

  private static looksLikeCi(value: string): boolean {
    return /^[0-9]{6,}$/.test(value.trim());
  }
}
