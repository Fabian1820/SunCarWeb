import jsPDF from "jspdf";
import type { NodoOrganigrama } from "@/lib/types/feats/organigramas/organigrama-types";
import {
  calcularLayoutOrganigrama,
  COLORES_ORGANIGRAMA as C,
  GROSOR_BORDE_CARGO,
  GROSOR_LINEA,
} from "./organigrama-layout";

export type FormatoPdfOrganigrama = "presentacion" | "carta";

/**
 * "presentacion" es el tamaño de los organigramas que ya hacía RRHH
 * (1440 × 810 pt, 16:9). "carta" es Carta horizontal, para imprimir.
 */
const PAGINAS: Record<
  FormatoPdfOrganigrama,
  { ancho: number; alto: number; margen: number; escalaMaxima: number }
> = {
  presentacion: { ancho: 1440, alto: 810, margen: 48, escalaMaxima: 2.4 },
  carta: { ancho: 792, alto: 612, margen: 30, escalaMaxima: 1.4 },
};

function nombreArchivo(nombre: string, formato: FormatoPdfOrganigrama): string {
  const limpio = nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  const sufijo = formato === "carta" ? "_carta" : "";
  return `Organigrama_${limpio || "sin_nombre"}${sufijo}.pdf`;
}

export function exportarOrganigramaPdf(
  organigrama: { nombre: string; raiz: NodoOrganigrama },
  formato: FormatoPdfOrganigrama = "presentacion",
): void {
  generarOrganigramaPdf(organigrama, formato).save(nombreArchivo(organigrama.nombre, formato));
}

export function generarOrganigramaPdf(
  organigrama: { nombre: string; raiz: NodoOrganigrama },
  formato: FormatoPdfOrganigrama = "presentacion",
): jsPDF {
  const pagina = PAGINAS[formato];
  const layout = calcularLayoutOrganigrama(organigrama.raiz);

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: [pagina.ancho, pagina.alto],
    compress: true,
  });
  doc.setProperties({ title: `Organigrama ${organigrama.nombre}` });

  const escala = Math.min(
    (pagina.ancho - pagina.margen * 2) / layout.ancho,
    (pagina.alto - pagina.margen * 2) / layout.alto,
    pagina.escalaMaxima,
  );
  const origenX = (pagina.ancho - layout.ancho * escala) / 2;
  const origenY = Math.max(pagina.margen, (pagina.alto - layout.alto * escala) / 2);
  const X = (v: number) => origenX + v * escala;
  const Y = (v: number) => origenY + v * escala;
  const S = (v: number) => v * escala;

  doc.setFont("helvetica", "bold");
  doc.setLineCap("square");

  for (const el of layout.elementos) {
    switch (el.tipo) {
      case "linea":
        doc.setDrawColor(C.linea);
        doc.setLineWidth(S(GROSOR_LINEA));
        doc.line(X(el.x1), Y(el.y1), X(el.x2), Y(el.y2));
        break;

      case "caja": {
        const esCargo = el.variante === "cargo";
        if (esCargo) {
          doc.setFillColor(C.cargoFondo);
          doc.setDrawColor(C.cargoBorde);
          doc.setLineWidth(S(GROSOR_BORDE_CARGO));
        } else {
          doc.setFillColor(el.variante === "raiz" ? C.raiz : C.area);
        }
        doc.roundedRect(
          X(el.x),
          Y(el.y),
          S(el.w),
          S(el.h),
          S(el.radio),
          S(el.radio),
          esCargo ? "FD" : "F",
        );
        doc.setFontSize(S(el.tamano));
        doc.setTextColor(
          esCargo ? (el.vacio ? C.vacio : C.cargoTexto) : el.vacio ? "#D9E6CF" : C.textoCaja,
        );
        doc.text(el.texto, X(el.x + el.w / 2), Y(el.y + el.h / 2), {
          align: "center",
          baseline: "middle",
        });
        break;
      }

      case "numero":
        doc.setFontSize(S(el.tamano));
        doc.setTextColor(C.numero);
        doc.text(el.texto, X(el.x), Y(el.y), { align: el.alinear, baseline: "middle" });
        break;

      case "insignia":
        doc.setFillColor(C.insignia);
        doc.roundedRect(X(el.x), Y(el.y), S(el.w), S(el.h), S(el.h / 2), S(el.h / 2), "F");
        doc.setFontSize(S(el.tamano));
        doc.setTextColor(C.textoCaja);
        doc.text(el.texto, X(el.x + el.w / 2), Y(el.y + el.h / 2), {
          align: "center",
          baseline: "middle",
        });
        break;
    }
  }

  return doc;
}
