"use client";

import { useState, useCallback } from "react";
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
} from "lucide-react";
import { InventarioService } from "@/lib/services/feats/inventario/inventario-service";
import type {
  AnalisisStockMinimoResponse,
  ProductoAnalisisStock,
  EstadoStock,
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

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await InventarioService.getAnalisisStockMinimo({
        almacen_id: almacenId,
        lead_time_dias: Number(leadTime),
        nivel_servicio: nivelServicio,
      });
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
              <BarChart3 className="h-5 w-5 text-orange-500" />
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
              className="h-8 bg-orange-500 hover:bg-orange-600 text-white"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-1" />
              )}
              {hasCargado ? "Recalcular" : "Calcular"}
            </Button>
          </div>
        </div>

        <div className="px-6 py-4 space-y-5">
          {/* Estado de carga */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-500">
              <RefreshCw className="h-8 w-8 animate-spin text-orange-400" />
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
