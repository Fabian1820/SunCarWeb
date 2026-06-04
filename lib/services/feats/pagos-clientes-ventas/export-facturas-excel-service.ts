import * as XLSX from "xlsx";
import type { FacturaClienteVenta } from "@/lib/types/feats/pagos-clientes-ventas/pago-cliente-venta-types";

const METODO_LABELS: Record<string, string> = {
  efectivo: "Efectivo",
  transferencia_bancaria: "Transferencia",
  stripe: "Stripe",
  zelle: "Zelle",
  financiacion: "Financiación",
};

const toNumber = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

type MaterialFactura =
  | {
      material_id?: string;
      material_codigo?: string;
      material_descripcion?: string;
      descripcion?: string;
      nombre?: string;
      cantidad?: number;
      precio?: number;
      subtotal?: number;
    }
  | string;

const getMaterialesList = (f: FacturaClienteVenta): MaterialFactura[] => {
  if (Array.isArray(f.materiales)) return f.materiales;
  if (typeof f.materiales === "string" && f.materiales.trim()) {
    return [f.materiales];
  }
  return [];
};

const getCantidadMateriales = (f: FacturaClienteVenta): number => {
  return getMaterialesList(f).length;
};

const formatMaterialNombre = (m: MaterialFactura): string => {
  if (typeof m === "string") return m.trim();
  const nombre =
    m.material_descripcion ||
    m.descripcion ||
    m.nombre ||
    m.material_codigo ||
    m.material_id ||
    "";
  const codigo =
    m.material_codigo && m.material_codigo !== nombre
      ? ` [${m.material_codigo}]`
      : "";
  return `${nombre}${codigo}`.trim();
};

const getMaterialCantidad = (m: MaterialFactura): number | "" => {
  if (typeof m === "string") return "";
  return Number(m.cantidad) || 0;
};

const getTotalSinDescuento = (f: FacturaClienteVenta): number => {
  if (typeof f.total_sin_descuento === "number") return f.total_sin_descuento;
  return toNumber(f.total_a_pagar) + toNumber(f.descuento);
};

const getMetodoPagoLabel = (f: FacturaClienteVenta): string => {
  const pagos = Array.isArray(f.pagos) ? f.pagos : [];
  if (pagos.length === 0) return "—";
  const labels = pagos
    .map((p) => p.metodo_pago || "")
    .filter(Boolean)
    .map((m) => METODO_LABELS[m] ?? m);
  const unique = Array.from(new Set(labels));
  return unique.length > 0 ? unique.join(", ") : "—";
};

const formatDateFile = (d?: string): string => {
  if (!d) return "";
  return d.slice(0, 10);
};

interface ExportRangeOptions {
  fechaDesde?: string;
  fechaHasta?: string;
}

const dateInRange = (
  fechaEmision: string | undefined,
  desde?: string,
  hasta?: string,
): boolean => {
  if (!desde && !hasta) return true;
  if (!fechaEmision) return false;
  const fecha = fechaEmision.slice(0, 10);
  if (desde && fecha < desde) return false;
  if (hasta && fecha > hasta) return false;
  return true;
};

export class ExportFacturasExcelService {
  /**
   * Exporta a Excel las facturas indicadas (ya filtradas por la UI) acotadas
   * por rango de fecha de emisión. Si no se pasa rango, exporta todas las
   * recibidas.
   *
   * Cada factura se expande verticalmente: una fila por cada material, con
   * todas las demás columnas repetidas. Si una factura no tiene materiales, se
   * emite una sola fila con las columnas `Material` y `Cantidad` vacías.
   */
  static exportar(
    facturas: FacturaClienteVenta[],
    options: ExportRangeOptions = {},
  ): void {
    const { fechaDesde, fechaHasta } = options;
    const filtradas = facturas.filter((f) =>
      dateInRange(f.fecha_emision, fechaDesde, fechaHasta),
    );

    const buildBase = (f: FacturaClienteVenta) => ({
      "Nº Factura": f.numero_factura || "",
      "Cliente": f.cliente || f.cliente_nombre || "",
      "Fecha": formatDateFile(f.fecha_emision),
      "Cantidad materiales": getCantidadMateriales(f),
      "Total sin descuento (USD)": Number(getTotalSinDescuento(f).toFixed(2)),
      "Descuento (USD)": Number(toNumber(f.descuento).toFixed(2)),
      "Aumento (USD)": Number(toNumber(f.aumento_monto).toFixed(2)),
      "Total (USD)": Number(toNumber(f.total_a_pagar).toFixed(2)),
      "Pagado (USD)": Number(toNumber(f.total_pagado).toFixed(2)),
      "Pendiente (USD)": Number(toNumber(f.monto_pendiente).toFixed(2)),
      "Método de pago": getMetodoPagoLabel(f),
    });

    const rows: Array<Record<string, unknown>> = [];
    for (const f of filtradas) {
      const base = buildBase(f);
      const lista = getMaterialesList(f);
      if (lista.length === 0) {
        rows.push({
          "Nº Factura": base["Nº Factura"],
          "Cliente": base["Cliente"],
          "Fecha": base["Fecha"],
          "Cantidad materiales": base["Cantidad materiales"],
          "Material": "",
          "Cantidad": "",
          "Total sin descuento (USD)": base["Total sin descuento (USD)"],
          "Descuento (USD)": base["Descuento (USD)"],
          "Aumento (USD)": base["Aumento (USD)"],
          "Total (USD)": base["Total (USD)"],
          "Pagado (USD)": base["Pagado (USD)"],
          "Pendiente (USD)": base["Pendiente (USD)"],
          "Método de pago": base["Método de pago"],
        });
      } else {
        for (const m of lista) {
          rows.push({
            "Nº Factura": base["Nº Factura"],
            "Cliente": base["Cliente"],
            "Fecha": base["Fecha"],
            "Cantidad materiales": base["Cantidad materiales"],
            "Material": formatMaterialNombre(m),
            "Cantidad": getMaterialCantidad(m),
            "Total sin descuento (USD)": base["Total sin descuento (USD)"],
            "Descuento (USD)": base["Descuento (USD)"],
            "Aumento (USD)": base["Aumento (USD)"],
            "Total (USD)": base["Total (USD)"],
            "Pagado (USD)": base["Pagado (USD)"],
            "Pendiente (USD)": base["Pendiente (USD)"],
            "Método de pago": base["Método de pago"],
          });
        }
      }
    }

    const headerOrder: string[] = [
      "Nº Factura",
      "Cliente",
      "Fecha",
      "Cantidad materiales",
      "Material",
      "Cantidad",
      "Total sin descuento (USD)",
      "Descuento (USD)",
      "Aumento (USD)",
      "Total (USD)",
      "Pagado (USD)",
      "Pendiente (USD)",
      "Método de pago",
    ];

    const ws =
      rows.length > 0
        ? XLSX.utils.json_to_sheet(rows, { header: headerOrder })
        : XLSX.utils.aoa_to_sheet([headerOrder]);

    ws["!cols"] = [
      { wch: 18 }, // Nº Factura
      { wch: 32 }, // Cliente
      { wch: 12 }, // Fecha
      { wch: 12 }, // Cantidad materiales
      { wch: 36 }, // Material
      { wch: 10 }, // Cantidad
      { wch: 22 }, // Total sin descuento
      { wch: 16 }, // Descuento
      { wch: 16 }, // Aumento
      { wch: 16 }, // Total
      { wch: 16 }, // Pagado
      { wch: 18 }, // Pendiente
      { wch: 30 }, // Método de pago
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Facturas");

    const suffix = (() => {
      if (fechaDesde && fechaHasta) return `_${fechaDesde}_${fechaHasta}`;
      if (fechaDesde) return `_desde_${fechaDesde}`;
      if (fechaHasta) return `_hasta_${fechaHasta}`;
      const today = new Date().toISOString().slice(0, 10);
      return `_${today}`;
    })();

    XLSX.writeFile(wb, `Facturas${suffix}.xlsx`);
  }
}
