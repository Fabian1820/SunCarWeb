"use client";

import { useState, useCallback } from "react";
import ExcelJS from "exceljs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
import { Button } from "@/components/shared/atom/button";
import { Badge } from "@/components/shared/atom/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select";
import { Label } from "@/components/shared/atom/label";
import { Input } from "@/components/shared/atom/input";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  TrendingDown,
  Package,
  BarChart3,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Info,
  FileDown,
} from "lucide-react";
import { InventarioService } from "@/lib/services/feats/inventario/inventario-service";
import type {
  AnalisisStockMinimoResponse,
  ProductoAnalisisStock,
  EstadoStock,
  ResumenAnalisisStock,
} from "@/lib/types/feats/inventario/inventario-types";

// ── Helpers ──────────────────────────────────────────────────────────────────

function estadoConfig(estado: EstadoStock) {
  switch (estado) {
    case "critico":
      return {
        icon: <XCircle className="h-4 w-4 text-red-600" />,
        badge: "bg-red-100 text-red-800 border-red-200",
        label: "Crítico",
        rowBg: "bg-red-50",
      };
    case "alerta":
      return {
        icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,
        badge: "bg-amber-100 text-amber-800 border-amber-200",
        label: "Alerta",
        rowBg: "bg-amber-50",
      };
    default:
      return {
        icon: <CheckCircle2 className="h-4 w-4 text-green-600" />,
        badge: "bg-green-100 text-green-800 border-green-200",
        label: "OK",
        rowBg: "",
      };
  }
}

function diasLabel(dias: number | null | undefined): string {
  if (dias == null) return "—";
  if (dias <= 0) return "Agotado";
  if (dias < 1) return "Menos de 1 día";
  return `~${Math.floor(dias)} días`;
}

function nombreProducto(p: ProductoAnalisisStock): string {
  return p.nombre || p.descripcion || p.material_codigo;
}

// ── Tarjeta de resumen ────────────────────────────────────────────────────────

function ResumenCard({
  value,
  label,
  sublabel,
  color,
  icon,
}: {
  value: number;
  label: string;
  sublabel: string;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <div className={`rounded-xl border-2 p-4 flex flex-col gap-1 ${color}`}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-2xl font-bold">{value}</span>
      </div>
      <p className="font-semibold text-sm">{label}</p>
      <p className="text-xs opacity-70">{sublabel}</p>
    </div>
  );
}

// ── Explicación ───────────────────────────────────────────────────────────────

function ExplicacionBox({ leadTime, nivelServicio }: { leadTime: number; nivelServicio: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50">
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-blue-800 text-sm font-medium"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="flex items-center gap-2">
          <Info className="h-4 w-4" />
          ¿Cómo se calculan estos números?
        </span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-2 text-sm text-blue-900">
          <p>
            El sistema revisa <strong>cuántas unidades salieron</strong> de este almacén en los últimos
            meses y calcula:
          </p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>
              <strong>Demanda diaria promedio</strong>: cuántas unidades salen en un día típico.
            </li>
            <li>
              <strong>Stock mínimo recomendado</strong>: lo que necesitas tener para cubrir{" "}
              <strong>{leadTime} días</strong> mientras esperas una reposición, más un colchón de
              seguridad para los días de mayor demanda.
            </li>
            <li>
              <strong>Días restantes</strong>: con el stock actual, cuántos días más puedes atender
              pedidos sin quedarte sin existencias.
            </li>
          </ul>
          <p className="mt-2 font-medium">
            Nivel de servicio {nivelServicio}%: significa que en {nivelServicio} de cada 100 semanas
            no te quedarás sin stock.
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded bg-red-100 p-2">
              <p className="font-bold text-red-700">🔴 Crítico</p>
              <p className="text-xs text-red-700">Stock por debajo del mínimo o menos de 7 días</p>
            </div>
            <div className="rounded bg-amber-100 p-2">
              <p className="font-bold text-amber-700">🟡 Alerta</p>
              <p className="text-xs text-amber-700">Entre 7 y 14 días restantes</p>
            </div>
            <div className="rounded bg-green-100 p-2">
              <p className="font-bold text-green-700">🟢 OK</p>
              <p className="text-xs text-green-700">Más de 14 días de cobertura</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tabla de productos ────────────────────────────────────────────────────────

function ProductosTable({ productos, filtroEstado }: { productos: ProductoAnalisisStock[]; filtroEstado: string }) {
  const filtrados =
    filtroEstado === "todos"
      ? productos
      : productos.filter((p) => p.estado === filtroEstado);

  if (filtrados.length === 0) {
    return (
      <p className="text-center py-8 text-gray-500 text-sm">
        No hay productos en esta categoría.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
            <th className="px-3 py-2">Estado</th>
            <th className="px-3 py-2">Producto</th>
            <th className="px-3 py-2 text-right">Stock actual</th>
            <th className="px-3 py-2 text-right">Mínimo recomendado</th>
            <th className="px-3 py-2 text-right">Días restantes</th>
            <th className="px-3 py-2 text-right">Sale/día (prom.)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {filtrados.map((p) => {
            const cfg = estadoConfig(p.estado);
            const deficit = p.stock_minimo_recomendado - p.cantidad_actual;
            return (
              <tr key={p.material_codigo} className={`${cfg.rowBg} hover:opacity-90`}>
                <td className="px-3 py-2">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.badge}`}
                  >
                    {cfg.icon}
                    {cfg.label}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <p className="font-medium text-gray-900 leading-tight">{nombreProducto(p)}</p>
                  <p className="text-xs text-gray-400">{p.material_codigo}</p>
                  {p.categoria && (
                    <p className="text-xs text-gray-400">{p.categoria}</p>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  <span
                    className={`font-bold ${
                      p.cantidad_actual <= 0
                        ? "text-red-700"
                        : p.estado === "critico"
                        ? "text-red-600"
                        : "text-gray-800"
                    }`}
                  >
                    {p.cantidad_actual.toLocaleString()}
                  </span>
                  {p.um && <span className="text-xs text-gray-400 ml-1">{p.um}</span>}
                </td>
                <td className="px-3 py-2 text-right">
                  <p className="font-medium text-gray-800">
                    {p.stock_minimo_recomendado.toLocaleString()}
                  </p>
                  {deficit > 0 && (
                    <p className="text-xs text-red-600 flex items-center justify-end gap-0.5">
                      <TrendingDown className="h-3 w-3" />
                      Faltan {Math.ceil(deficit).toLocaleString()}
                    </p>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  <span
                    className={`font-medium ${
                      !p.dias_restantes_estimados || p.dias_restantes_estimados < 7
                        ? "text-red-600"
                        : p.dias_restantes_estimados < 14
                        ? "text-amber-600"
                        : "text-green-600"
                    }`}
                  >
                    {diasLabel(p.dias_restantes_estimados)}
                  </span>
                </td>
                <td className="px-3 py-2 text-right text-gray-600">
                  {p.demanda_diaria_promedio > 0
                    ? p.demanda_diaria_promedio.toFixed(1)
                    : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Exportación Excel ─────────────────────────────────────────────────────────

const COLORES = {
  critico:    { fila: "FFFFF0F0", badge: "FFDC2626", texto: "FF991B1B" },
  alerta:     { fila: "FFFFFBEB", badge: "FFD97706", texto: "FF92400E" },
  ok:         { fila: "FFF0FDF4", badge: "FF16A34A", texto: "FF14532D" },
  encabezado: "FFEA580C",
  titulo:     "FF1E293B",
  subtitulo:  "FF64748B",
  borde:      "FFD1D5DB",
};

async function exportarAnalisisExcel(
  data: AnalisisStockMinimoResponse,
  almacenNombre: string | undefined,
  leadTime: string,
  nivelServicio: string,
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "SunCar Admin";
  wb.created = new Date();

  const { resumen, productos } = data;
  const fechaHora = new Date().toLocaleString("es-ES", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  // ── Hoja 1: Resumen ──────────────────────────────────────────────────────
  const wsRes = wb.addWorksheet("Resumen");
  wsRes.getColumn(1).width = 3;
  wsRes.getColumn(2).width = 32;
  wsRes.getColumn(3).width = 22;

  let r = 1;

  const setTitulo = (row: number, texto: string) => {
    const c = wsRes.getCell(`B${row}`);
    c.value = texto;
    c.font = { bold: true, size: 15, color: { argb: COLORES.titulo } };
  };
  const setSubtitulo = (row: number, texto: string) => {
    const c = wsRes.getCell(`B${row}`);
    c.value = texto;
    c.font = { size: 11, color: { argb: COLORES.subtitulo } };
  };
  const setValor = (row: number, label: string, valor: string | number) => {
    const l = wsRes.getCell(`B${row}`);
    l.value = label;
    l.font = { bold: true, size: 11 };
    const v = wsRes.getCell(`C${row}`);
    v.value = valor;
    v.font = { size: 11 };
    wsRes.getRow(row).height = 20;
  };

  setTitulo(r++, "SunCar SRL — Análisis de Stock Mínimo");
  setSubtitulo(r++, almacenNombre ? `Almacén: ${almacenNombre}` : "Todos los almacenes");
  setSubtitulo(r++, `Generado: ${fechaHora}`);
  r++;

  // Parámetros
  wsRes.getCell(`B${r}`).value = "Parámetros del análisis";
  wsRes.getCell(`B${r}`).font = { bold: true, size: 12, color: { argb: COLORES.encabezado } };
  wsRes.getRow(r++).height = 22;
  setValor(r++, "Días para reponer stock (lead time)", `${leadTime} días`);
  setValor(r++, "Nivel de seguridad", `${nivelServicio}%`);
  setValor(r++, "Días de historial analizados", `${resumen.dias_dataset} días`);
  r++;

  // Tarjetas resumen
  wsRes.getCell(`B${r}`).value = "Resultado del análisis";
  wsRes.getCell(`B${r}`).font = { bold: true, size: 12, color: { argb: COLORES.encabezado } };
  wsRes.getRow(r++).height = 22;

  const addResumenFila = (row: number, label: string, valor: number, argbFondo: string, argbTexto: string) => {
    const cl = wsRes.getCell(`B${row}`);
    cl.value = label;
    cl.font = { bold: true, size: 11, color: { argb: argbTexto } };
    cl.fill = { type: "pattern", pattern: "solid", fgColor: { argb: argbFondo } };
    cl.border = { top: { style: "thin", color: { argb: COLORES.borde } }, bottom: { style: "thin", color: { argb: COLORES.borde } }, left: { style: "thin", color: { argb: COLORES.borde } }, right: { style: "thin", color: { argb: COLORES.borde } } };
    const cv = wsRes.getCell(`C${row}`);
    cv.value = valor;
    cv.font = { bold: true, size: 14, color: { argb: argbTexto } };
    cv.fill = { type: "pattern", pattern: "solid", fgColor: { argb: argbFondo } };
    cv.alignment = { horizontal: "center" };
    cv.border = cl.border;
    wsRes.getRow(row).height = 24;
  };

  addResumenFila(r++, "🔴  Críticos — necesitan reposición urgente", resumen.criticos, COLORES.critico.fila, COLORES.critico.texto);
  addResumenFila(r++, "🟡  En alerta — pedir pronto", resumen.alertas, COLORES.alerta.fila, COLORES.alerta.texto);
  addResumenFila(r++, "🟢  OK — stock suficiente", resumen.ok, COLORES.ok.fila, COLORES.ok.texto);
  r++;
  addResumenFila(r++, "📦  Total productos analizados", resumen.total_productos, "FFF8FAFC", "FF1E293B");

  // ── Hoja 2: Detalle ───────────────────────────────────────────────────────
  const wsDet = wb.addWorksheet("Detalle por Producto");
  wsDet.getColumn(1).width = 3;

  const columnas = [
    { header: "Estado",                 key: "estado",      width: 14 },
    { header: "Código",                 key: "codigo",      width: 16 },
    { header: "Producto",               key: "producto",    width: 36 },
    { header: "Categoría",              key: "categoria",   width: 20 },
    { header: "UM",                     key: "um",          width: 8  },
    { header: "Stock actual",           key: "actual",      width: 14 },
    { header: "Mínimo recomendado",     key: "minimo",      width: 20 },
    { header: "Faltan",                 key: "faltan",      width: 12 },
    { header: "Días restantes",         key: "dias",        width: 16 },
    { header: "Demanda diaria (prom.)", key: "demanda",     width: 22 },
    { header: "Stock de seguridad",     key: "seguridad",   width: 20 },
  ];

  columnas.forEach((col, i) => {
    wsDet.getColumn(i + 2).width = col.width;
  });

  // Filas meta en hoja detalle
  let rd = 1;
  const setDetMeta = (row: number, texto: string, bold = false) => {
    const c = wsDet.getCell(`B${row}`);
    c.value = texto;
    c.font = { bold, size: bold ? 13 : 10, color: { argb: bold ? COLORES.titulo : COLORES.subtitulo } };
    wsDet.mergeCells(`B${row}:L${row}`);
  };
  setDetMeta(rd++, "SunCar SRL — Análisis de Stock Mínimo — Detalle por Producto", true);
  setDetMeta(rd++, (almacenNombre ? `Almacén: ${almacenNombre}   ·   ` : "") + `Lead time: ${leadTime} días   ·   Nivel de servicio: ${nivelServicio}%   ·   Generado: ${fechaHora}`);
  rd++;

  // Encabezados
  const headerRow = wsDet.getRow(rd);
  columnas.forEach((col, i) => {
    const c = headerRow.getCell(i + 2);
    c.value = col.header;
    c.font = { bold: true, size: 10, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORES.encabezado } };
    c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    c.border = { top: { style: "thin" }, bottom: { style: "medium" }, left: { style: "thin" }, right: { style: "thin" } };
  });
  headerRow.height = 28;
  rd++;

  // Ordenar: críticos → alertas → ok
  const ordenEstado: Record<EstadoStock, number> = { critico: 0, alerta: 1, ok: 2 };
  const ordenados = [...productos].sort((a, b) => ordenEstado[a.estado] - ordenEstado[b.estado]);

  ordenados.forEach((p) => {
    const cfg = p.estado === "critico" ? COLORES.critico : p.estado === "alerta" ? COLORES.alerta : COLORES.ok;
    const deficit = Math.max(0, p.stock_minimo_recomendado - p.cantidad_actual);

    const estadoLabel = p.estado === "critico" ? "🔴 Crítico" : p.estado === "alerta" ? "🟡 Alerta" : "🟢 OK";
    const diasLabel = p.dias_restantes_estimados == null
      ? "—"
      : p.dias_restantes_estimados <= 0
      ? "Agotado"
      : `~${Math.floor(p.dias_restantes_estimados)} días`;

    const valores = [
      estadoLabel,
      p.material_codigo,
      p.nombre || p.descripcion || p.material_codigo,
      p.categoria || "—",
      p.um || "—",
      p.cantidad_actual,
      p.stock_minimo_recomendado,
      deficit > 0 ? deficit : "—",
      diasLabel,
      p.demanda_diaria_promedio > 0 ? Number(p.demanda_diaria_promedio.toFixed(2)) : "—",
      p.stock_seguridad_recomendado,
    ];

    const fila = wsDet.getRow(rd);
    valores.forEach((val, i) => {
      const c = fila.getCell(i + 2);
      c.value = val as ExcelJS.CellValue;
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: cfg.fila } };
      c.font = { size: 10, color: { argb: i === 0 ? cfg.texto : COLORES.titulo } };
      if (i === 0) c.font = { ...c.font, bold: true };
      c.alignment = { horizontal: i >= 5 ? "center" : "left", vertical: "middle", wrapText: i === 2 };
      c.border = {
        top: { style: "thin", color: { argb: COLORES.borde } },
        bottom: { style: "thin", color: { argb: COLORES.borde } },
        left: { style: "thin", color: { argb: COLORES.borde } },
        right: { style: "thin", color: { argb: COLORES.borde } },
      };
      // Columna "Faltan" en rojo si hay déficit
      if (i === 7 && typeof val === "number") {
        c.font = { ...c.font, bold: true, color: { argb: COLORES.critico.texto } };
      }
    });
    fila.height = 20;
    rd++;
  });

  // Fila totales
  const filaTotal = wsDet.getRow(rd);
  const cTotalLabel = filaTotal.getCell(2);
  cTotalLabel.value = "TOTALES";
  cTotalLabel.font = { bold: true, size: 10, color: { argb: "FFFFFFFF" } };
  cTotalLabel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORES.encabezado } };
  wsDet.mergeCells(`B${rd}:E${rd}`);
  [6, 7, 8].forEach((col, idx) => {
    const keys: (keyof ProductoAnalisisStock)[] = ["cantidad_actual", "stock_minimo_recomendado"];
    const c = filaTotal.getCell(col);
    if (idx < 2) {
      c.value = { formula: `SUM(${String.fromCharCode(65 + col)}4:${String.fromCharCode(65 + col)}${rd - 1})` } as ExcelJS.CellValue;
    } else {
      c.value = ""; // Faltan: no sumar
    }
    c.font = { bold: true, size: 10, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORES.encabezado } };
    c.alignment = { horizontal: "center" };
  });
  filaTotal.height = 22;

  // Descargar
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const nombreArchivo = almacenNombre
    ? `analisis-stock-${almacenNombre.replace(/\s+/g, "-").toLowerCase()}`
    : "analisis-stock-todos";
  a.download = `${nombreArchivo}-${new Date().toISOString().split("T")[0]}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Modal principal ───────────────────────────────────────────────────────────

interface StockMinimoAnalisisModalProps {
  almacenId?: string;
  almacenNombre?: string;
  open: boolean;
  onClose: () => void;
}

export function StockMinimoAnalisisModal({
  almacenId,
  almacenNombre,
  open,
  onClose,
}: StockMinimoAnalisisModalProps) {
  const [data, setData] = useState<AnalisisStockMinimoResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leadTime, setLeadTime] = useState("7");
  const [nivelServicio, setNivelServicio] = useState("95");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [hasCargado, setHasCargado] = useState(false);
  const [exportando, setExportando] = useState(false);

  const handleExportarExcel = useCallback(async () => {
    if (!data) return;
    setExportando(true);
    try {
      await exportarAnalisisExcel(data, almacenNombre, leadTime, nivelServicio);
    } finally {
      setExportando(false);
    }
  }, [data, almacenNombre, leadTime, nivelServicio]);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await InventarioService.getAnalisisStockMinimo({
        almacen_id: almacenId,
        lead_time_dias: Number(leadTime),
        nivel_servicio: nivelServicio,
      });
      // Validar que la respuesta tenga la estructura esperada
      if (!result || !result.resumen || !Array.isArray(result.productos)) {
        const detail = (result as any)?.detail || (result as any)?.message || "";
        setError(`Error del servidor${detail ? ": " + detail : ". Intenta de nuevo."}`);
        return;
      }
      setData(result);
      setHasCargado(true);
    } catch (e) {
      setError("No se pudo cargar el análisis. Revisa la conexión al servidor.");
    } finally {
      setLoading(false);
    }
  }, [almacenId, leadTime, nivelServicio]);

  // Cargar al abrir por primera vez
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && !hasCargado) cargar();
    if (!isOpen) onClose();
  };

  const resumen = data?.resumen;
  const productos = data?.productos ?? [];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-5xl w-full max-h-[90vh] overflow-y-auto p-0">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b px-6 py-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <BarChart3 className="h-5 w-5 text-emerald-500" />
              Análisis de Stock Mínimo
              {almacenNombre && (
                <span className="text-gray-500 font-normal text-base">— {almacenNombre}</span>
              )}
            </DialogTitle>
          </DialogHeader>

          {/* Configuración */}
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div>
              <Label className="text-xs text-gray-600 mb-1 block">
                Días para reponer stock
              </Label>
              <Input
                type="number"
                min={1}
                max={90}
                value={leadTime}
                onChange={(e) => setLeadTime(e.target.value)}
                className="w-24 h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-600 mb-1 block">
                Nivel de seguridad
              </Label>
              <Select value={nivelServicio} onValueChange={setNivelServicio}>
                <SelectTrigger className="w-36 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="90">90% (básico)</SelectItem>
                  <SelectItem value="95">95% (recomendado)</SelectItem>
                  <SelectItem value="98">98% (seguro)</SelectItem>
                  <SelectItem value="99">99% (máximo)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              size="sm"
              onClick={cargar}
              disabled={loading}
              className="h-8 bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-1" />
              )}
              {hasCargado ? "Recalcular" : "Calcular"}
            </Button>

            {data && (
              <Button
                size="sm"
                onClick={handleExportarExcel}
                disabled={exportando || loading}
                className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {exportando ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <FileDown className="h-4 w-4 mr-1" />
                )}
                Exportar Excel
              </Button>
            )}
          </div>
        </div>

        <div className="px-6 py-4 space-y-5">
          {/* Estado de carga */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-500">
              <RefreshCw className="h-8 w-8 animate-spin text-emerald-400" />
              <p className="text-sm">Analizando movimientos históricos…</p>
            </div>
          )}

          {error && !loading && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 text-sm">
              {error}
            </div>
          )}

          {!loading && !error && !hasCargado && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
              <Package className="h-12 w-12 opacity-30" />
              <p className="text-sm">Configura los parámetros y pulsa <strong>Calcular</strong>.</p>
            </div>
          )}

          {!loading && data && (
            <>
              {/* Resumen en tarjetas */}
              <div className="grid grid-cols-3 gap-3">
                <ResumenCard
                  value={resumen!.criticos}
                  label="Necesitan reposición urgente"
                  sublabel="Stock por debajo del mínimo recomendado"
                  color="border-red-300 bg-red-50 text-red-800"
                  icon={<XCircle className="h-5 w-5 text-red-600" />}
                />
                <ResumenCard
                  value={resumen!.alertas}
                  label="Stock bajo — pide pronto"
                  sublabel="Quedan menos de 14 días de existencias"
                  color="border-amber-300 bg-amber-50 text-amber-800"
                  icon={<AlertTriangle className="h-5 w-5 text-amber-500" />}
                />
                <ResumenCard
                  value={resumen!.ok}
                  label="Stock suficiente"
                  sublabel="Más de 14 días de cobertura"
                  color="border-green-300 bg-green-50 text-green-800"
                  icon={<CheckCircle2 className="h-5 w-5 text-green-600" />}
                />
              </div>

              {/* Info del análisis */}
              <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                <span className="bg-gray-100 rounded px-2 py-1">
                  📅 Basado en {resumen!.dias_dataset} días de historial
                </span>
                <span className="bg-gray-100 rounded px-2 py-1">
                  🚚 Lead time: {resumen!.lead_time_dias} días
                </span>
                <span className="bg-gray-100 rounded px-2 py-1">
                  🎯 Nivel de servicio: {resumen!.nivel_servicio_pct}%
                </span>
                <span className="bg-gray-100 rounded px-2 py-1">
                  📦 {resumen!.total_productos} productos analizados
                </span>
              </div>

              {/* Explicación colapsable */}
              <ExplicacionBox
                leadTime={resumen!.lead_time_dias}
                nivelServicio={resumen!.nivel_servicio_pct}
              />

              {/* Filtro por estado */}
              <div className="flex gap-2 flex-wrap">
                {[
                  { key: "todos", label: `Todos (${productos.length})`, color: "bg-gray-100 text-gray-700" },
                  { key: "critico", label: `🔴 Críticos (${resumen!.criticos})`, color: "bg-red-100 text-red-700" },
                  { key: "alerta", label: `🟡 Alertas (${resumen!.alertas})`, color: "bg-amber-100 text-amber-700" },
                  { key: "ok", label: `🟢 OK (${resumen!.ok})`, color: "bg-green-100 text-green-700" },
                ].map(({ key, label, color }) => (
                  <button
                    key={key}
                    onClick={() => setFiltroEstado(key)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      filtroEstado === key
                        ? `${color} ring-2 ring-offset-1 ring-current`
                        : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Tabla */}
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <ProductosTable productos={productos} filtroEstado={filtroEstado} />
              </div>

              {/* Nota al pie */}
              <p className="text-xs text-gray-400 text-center pb-2">
                Los cálculos se basan en el historial real de salidas y ventas registradas en el
                sistema. Ajusta el "lead time" según cuántos días tarda tu proveedor en reponer.
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
