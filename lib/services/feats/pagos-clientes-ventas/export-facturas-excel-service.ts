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
   * Los materiales se exportan como pares de columnas dinámicas
   * `Material N` / `Cant. N`, con `N` desde 1 hasta el máximo de materiales
   * que tenga cualquier factura del set.
   */
  static exportar(
    facturas: FacturaClienteVenta[],
    options: ExportRangeOptions = {},
  ): void {
    const { fechaDesde, fechaHasta } = options;
    const filtradas = facturas.filter((f) =>
      dateInRange(f.fecha_emision, fechaDesde, fechaHasta),
    );

    const maxMateriales = filtradas.reduce(
      (max, f) => Math.max(max, getMaterialesList(f).length),
      0,
    );

    const buildRow = (f: FacturaClienteVenta): Record<string, unknown> => {
      const lista = getMaterialesList(f);
      const row: Record<string, unknown> = {
        "Nº Factura": f.numero_factura || "",
        "Cliente": f.cliente || f.cliente_nombre || "",
        "Fecha": formatDateFile(f.fecha_emision),
        "Cantidad materiales": getCantidadMateriales(f),
      };
      for (let i = 0; i < maxMateriales; i++) {
        const m = lista[i];
        row[`Material ${i + 1}`] = m ? formatMaterialNombre(m) : "";
        row[`Cant. ${i + 1}`] = m ? getMaterialCantidad(m) : "";
      }
      row["Total sin descuento (USD)"] = Number(getTotalSinDescuento(f).toFixed(2));
      row["Descuento (USD)"] = Number(toNumber(f.descuento).toFixed(2));
      row["Aumento (USD)"] = Number(toNumber(f.aumento_monto).toFixed(2));
      row["Total (USD)"] = Number(toNumber(f.total_a_pagar).toFixed(2));
      row["Pagado (USD)"] = Number(toNumber(f.total_pagado).toFixed(2));
      row["Pendiente (USD)"] = Number(toNumber(f.monto_pendiente).toFixed(2));
      row["Método de pago"] = getMetodoPagoLabel(f);
      return row;
    };

    const rows = filtradas.map(buildRow);

    const headerOrder: string[] = [
      "Nº Factura",
      "Cliente",
      "Fecha",
      "Cantidad materiales",
    ];
    for (let i = 0; i < maxMateriales; i++) {
      headerOrder.push(`Material ${i + 1}`);
      headerOrder.push(`Cant. ${i + 1}`);
    }
    headerOrder.push(
      "Total sin descuento (USD)",
      "Descuento (USD)",
      "Aumento (USD)",
      "Total (USD)",
      "Pagado (USD)",
      "Pendiente (USD)",
      "Método de pago",
    );

    const ws =
      rows.length > 0
        ? XLSX.utils.json_to_sheet(rows, { header: headerOrder })
        : XLSX.utils.aoa_to_sheet([headerOrder]);

    const cols: { wch: number }[] = [
      { wch: 18 }, // Nº Factura
      { wch: 32 }, // Cliente
      { wch: 12 }, // Fecha
      { wch: 12 }, // Cantidad materiales
    ];
    for (let i = 0; i < maxMateriales; i++) {
      cols.push({ wch: 30 }); // Material N
      cols.push({ wch: 10 }); // Cant. N
    }
    cols.push(
      { wch: 22 }, // Total sin descuento
      { wch: 16 }, // Descuento
      { wch: 16 }, // Aumento
      { wch: 16 }, // Total
      { wch: 16 }, // Pagado
      { wch: 18 }, // Pendiente
      { wch: 30 }, // Método de pago
    );
    ws["!cols"] = cols;

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
