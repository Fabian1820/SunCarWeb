import jsPDF from "jspdf";
import type { OfertaVenta } from "../../../api-types";

// ─── paleta ───────────────────────────────────────────────────────────────────
// Paleta Ventas (marca Suncar 2026): Midnight Voltage (navy) + Solar Radiance (amarillo)
const C = {
  ink:     [10,  5,   45 ] as [number, number, number], // Midnight Voltage
  green:   [242, 195, 0  ] as [number, number, number], // Solar Radiance (acento)
  greenBg: [238, 239, 248] as [number, number, number], // navy muy suave
  white:   [255, 255, 255] as [number, number, number],
  gray50:  [250, 250, 250] as [number, number, number],
  gray100: [243, 244, 246] as [number, number, number],
  gray200: [229, 231, 235] as [number, number, number],
  gray400: [156, 163, 175] as [number, number, number],
  gray500: [107, 114, 128] as [number, number, number],
  red:     [210, 40,  40 ] as [number, number, number],
};

const ESTADO_LABEL: Record<string, string> = {
  enviada: "Enviada", confirmada: "Confirmada",
  cancelada: "Cancelada", pagada: "Pagada",
};

// ─── helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDate(v?: string) {
  if (!v) return "-";
  const d = new Date(v);
  return isNaN(d.getTime()) ? v : d.toLocaleDateString("es-ES");
}
function simbolo(moneda?: string) {
  return moneda === "EUR" ? "€" : moneda === "CUP" ? "CUP " : "$";
}
function imgFmt(b64: string): "PNG" | "JPEG" {
  return b64.startsWith("data:image/png") ? "PNG" : "JPEG";
}

async function toBase64(url: string): Promise<string | null> {
  try {
    const r = await fetch(url);
    const b = await r.blob();
    return await new Promise<string>((res, rej) => {
      const reader = new FileReader();
      reader.onloadend = () => res(reader.result as string);
      reader.onerror = rej;
      reader.readAsDataURL(b);
    });
  } catch { return null; }
}

/** Carga una imagen y devuelve base64 + dimensiones naturales (px) */
async function toBase64WithSize(
  url: string,
): Promise<{ b64: string; w: number; h: number } | null> {
  const b64 = await toBase64(url);
  if (!b64) return null;
  const dims = await new Promise<{ w: number; h: number }>((res) => {
    const img = new Image();
    img.onload  = () => res({ w: img.naturalWidth,  h: img.naturalHeight });
    img.onerror = () => res({ w: 1, h: 1 });
    img.src = b64;
  });
  return { b64, ...dims };
}

// ─── constantes de layout ─────────────────────────────────────────────────────
const PW   = 210;
const PH   = 297;
const ML   = 14;
const MR   = 196;
const CW   = MR - ML;

const X_CANT  = 148;
const X_PUNIT = 166;
const X_DTO   = 179;
const X_TOTAL = MR;
const FOTO_W  = 13;
const ROW_H   = 13;   // filas compactas

// ─── servicio ─────────────────────────────────────────────────────────────────
export class ExportOfertaVentaService {
  static async exportar(
    oferta: OfertaVenta,
    fotosMap?: Map<string, string>,
  ): Promise<void> {
    const doc    = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const codigo = oferta.codigo ?? `OV-${oferta.id.slice(-8).toUpperCase()}`;
    const moneda = oferta.moneda_pago || "USD";
    const sim    = simbolo(moneda);

    // ── 1. Pre-cargar imágenes ─────────────────────────────────────
    let logoData: { b64: string; w: number; h: number } | null = null;
    try { logoData = await toBase64WithSize("/brand/suncar-v2-horizontal.png"); } catch { /**/ }

    const fotosBase64 = new Map<string, string>();
    if (fotosMap && fotosMap.size > 0) {
      await Promise.all(
        oferta.materiales.map(async (mat) => {
          const url =
            fotosMap.get(mat.material_id) ??
            (mat.codigo ? fotosMap.get(mat.codigo) : undefined) ??
            mat.foto_url;
          if (!url) return;
          const b64 = await toBase64(url);
          if (b64) {
            fotosBase64.set(mat.material_id, b64);
            if (mat.codigo) fotosBase64.set(mat.codigo, b64);
          }
        }),
      );
    }

    // ── 2. Cabecera ───────────────────────────────────────────────
    let y = 13;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(26);
    doc.setTextColor(...C.ink);
    doc.text("OFERTA", ML, y);

    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...C.gray400);
    doc.text("Oferta de Equipos Fotovoltaicos", ML, y);

    // Logo — escalar manteniendo proporción original
    if (logoData) {
      try {
        const MAX_W = 28;
        const MAX_H = 22;
        const ratio = logoData.w / logoData.h;
        let lw = MAX_W;
        let lh = lw / ratio;
        if (lh > MAX_H) { lh = MAX_H; lw = lh * ratio; }
        doc.addImage(logoData.b64, "PNG", MR - lw, 3, lw, lh);
      } catch { /**/ }
    }

    // ── 3. Datos de la oferta ─────────────────────────────────────
    y += 8;
    doc.setDrawColor(...C.gray200);
    doc.setLineWidth(0.35);
    doc.line(ML, y, MR, y);
    y += 7;

    const detalles: [string, string][] = [
      ["Código",      codigo],
      ["Fecha",       fmtDate(oferta.fecha_creacion)],
      ["Estado",      ESTADO_LABEL[oferta.estado] ?? oferta.estado],
    ];
    if (oferta.metodo_pago) detalles.push(["Método pago", oferta.metodo_pago]);
    if (oferta.moneda_pago) detalles.push(["Moneda",      oferta.moneda_pago]);

    for (const [lbl, val] of detalles) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...C.gray500);
      doc.text(lbl, ML, y);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...C.ink);
      doc.text(val, ML + 32, y);
      y += 5;
    }

    // ── 4. Bloque cliente ─────────────────────────────────────────
    y += 4;
    doc.setDrawColor(...C.gray200);
    doc.setLineWidth(0.35);
    doc.line(ML, y, MR, y);
    y += 5;

    // Fondo verde muy suave para el bloque del cliente
    const clienteNombre = oferta.cliente_nombre && oferta.cliente_nombre !== "-"
      ? oferta.cliente_nombre
      : "";
    const clienteBlockH = clienteNombre ? 15 : 10;
    doc.setFillColor(...C.greenBg);
    doc.roundedRect(ML, y - 1, CW, clienteBlockH, 2, 2, "F");

    // Acento verde izquierdo
    doc.setFillColor(...C.green);
    doc.roundedRect(ML, y - 1, 3, clienteBlockH, 1, 1, "F");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...C.gray500);
    doc.text("A la atención de:", ML + 5, y + 4);

    if (clienteNombre) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...C.ink);
      doc.text(clienteNombre, ML + 5, y + 11);
    }

    y += clienteBlockH + 6;

    // ── 5. Tabla de materiales ─────────────────────────────────────
    doc.setDrawColor(...C.gray200);
    doc.setLineWidth(0.35);
    doc.line(ML, y, MR, y);
    y += 5;

    // Cabecera de columnas
    doc.setFillColor(...C.gray100);
    doc.rect(ML, y, CW, 6.5, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(...C.gray500);
    doc.text("MATERIAL",          ML + FOTO_W + 2, y + 4.2);
    doc.text("CANT.",             X_CANT,  y + 4.2, { align: "right" });
    doc.text("P.UNIT",            X_PUNIT, y + 4.2, { align: "right" });
    doc.text("AJUSTE",            X_DTO,   y + 4.2, { align: "right" });
    doc.text(`TOTAL (${moneda})`, X_TOTAL, y + 4.2, { align: "right" });
    y += 7.5;

    const checkPage = (needed = ROW_H) => {
      if (y + needed > PH - 25) {
        doc.addPage();
        y = 15;
      }
    };

    let rowIdx = 0;
    for (const mat of oferta.materiales) {
      checkPage();

      if (rowIdx % 2 !== 0) {
        doc.setFillColor(...C.gray50);
        doc.rect(ML, y, CW, ROW_H, "F");
      }
      // Borde inferior fino
      doc.setDrawColor(...C.gray200);
      doc.setLineWidth(0.1);
      doc.line(ML, y + ROW_H, MR, y + ROW_H);

      // Foto
      const b64 =
        fotosBase64.get(mat.material_id) ??
        (mat.codigo ? fotosBase64.get(mat.codigo) : undefined);
      const FOTO_PAD = 1.5;
      const FOTO_S   = ROW_H - FOTO_PAD * 2;

      if (b64) {
        try {
          doc.addImage(b64, imgFmt(b64), ML + FOTO_PAD, y + FOTO_PAD, FOTO_S, FOTO_S);
        } catch { /**/ }
      } else {
        doc.setFillColor(...C.gray100);
        doc.roundedRect(ML + FOTO_PAD, y + FOTO_PAD, FOTO_S, FOTO_S, 1, 1, "F");
      }

      const midY = y + ROW_H / 2 + 1.5;

      // Nombre
      const nombre = mat.descripcion || mat.codigo || mat.material_id;
      const lines  = doc.splitTextToSize(nombre, 78);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(...C.ink);

      if (lines.length === 1) {
        doc.text(lines[0], ML + FOTO_W + 2, midY);
        if (mat.codigo && mat.codigo !== nombre) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(6);
          doc.setTextColor(...C.gray400);
          doc.text(mat.codigo, ML + FOTO_W + 2, midY + 3.8);
        }
      } else {
        doc.text(lines[0], ML + FOTO_W + 2, y + ROW_H / 2 - 0.5);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.5);
        doc.setTextColor(...C.gray500);
        doc.text(lines[1], ML + FOTO_W + 2, y + ROW_H / 2 + 3);
      }

      // Cant
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...C.ink);
      doc.text(String(mat.cantidad), X_CANT, midY, { align: "right" });

      // P.Unit
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...C.gray500);
      doc.text(`${sim}${fmt(mat.precio)}`, X_PUNIT, midY, { align: "right" });

      // Ajuste: descuento y/o aumento
      const dto = mat.descuento_porcentaje ?? 0;
      const aum = mat.aumento_porcentaje ?? 0;
      if (dto > 0 || aum > 0) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        if (dto > 0 && aum > 0) {
          doc.setTextColor(...C.red);
          doc.text(`-${dto}%`, X_DTO, midY - 2, { align: "right" });
          doc.setTextColor(30, 80, 180);
          doc.text(`+${aum}%`, X_DTO, midY + 2.5, { align: "right" });
        } else if (dto > 0) {
          doc.setTextColor(...C.red);
          doc.text(`-${dto}%`, X_DTO, midY, { align: "right" });
        } else {
          doc.setTextColor(30, 80, 180);
          doc.text(`+${aum}%`, X_DTO, midY, { align: "right" });
        }
      } else {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(...C.gray400);
        doc.text("—", X_DTO, midY, { align: "right" });
      }

      // Total
      const subtotal = mat.subtotal ?? mat.precio * mat.cantidad * (1 - dto / 100) * (1 + aum / 100);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...C.ink);
      doc.text(`${sim}${fmt(subtotal)}`, X_TOTAL, midY, { align: "right" });

      y += ROW_H;
      rowIdx++;
    }

    // ── 6. Total ──────────────────────────────────────────────────
    y += 4;
    checkPage(14);

    doc.setFillColor(...C.green);
    doc.roundedRect(MR - 78, y, 78, 13, 2, 2, "F");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(10, 5, 45);
    doc.text("TOTAL", MR - 76, y + 9);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(10, 5, 45);
    doc.text(`${sim}${fmt(oferta.precio_total)}`, MR - 2, y + 9.5, { align: "right" });

    // ── 7. Observaciones ─────────────────────────────────────────
    if (oferta.observaciones?.trim()) {
      y += 18;
      checkPage(20);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(...C.gray500);
      doc.text("Observaciones:", ML, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...C.ink);
      const obs = doc.splitTextToSize(oferta.observaciones.trim(), CW);
      doc.text(obs, ML, y + 5);
    }

    // ── 8. Pie ────────────────────────────────────────────────────
    doc.setFillColor(...C.gray100);
    doc.rect(0, PH - 8, PW, 8, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...C.gray400);
    doc.text(
      `Sun Car S.R.L.  ·  info@suncarsrl.com  ·  +53 5 282 6474  ·  Generado el ${fmtDate(new Date().toISOString())}`,
      PW / 2, PH - 3, { align: "center" },
    );

    // ── Guardar ───────────────────────────────────────────────────
    const filename = `Oferta_${codigo}_${(oferta.cliente_nombre ?? "cliente")
      .replace(/[<>:"/\\|?*\s]/g, "_").slice(0, 40)}.pdf`;
    doc.save(filename);
  }
}
