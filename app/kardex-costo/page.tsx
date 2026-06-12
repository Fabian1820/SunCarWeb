"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Calculator,
  DollarSign,
  History,
  Info,
  Loader2,
  Package,
  RefreshCw,
  Search,
  Warehouse,
} from "lucide-react";

import { RouteGuard } from "@/components/auth/route-guard";
import { PageLoader } from "@/components/shared/atom/page-loader";
import { Button } from "@/components/shared/atom/button";
import { Input } from "@/components/shared/molecule/input";
import { Card, CardContent } from "@/components/shared/molecule/card";
import { ModuleHeader } from "@/components/shared/organism/module-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select";
import { Badge } from "@/components/shared/atom/badge";
import { Toaster } from "@/components/shared/molecule/toaster";
import { useMaterials } from "@/hooks/use-materials";
import { useKardexCosto } from "@/hooks/use-kardex-costo";
import { InventarioService } from "@/lib/api-services";
import type { Almacen } from "@/lib/types/feats/inventario/inventario-types";
import type { KardexCosto } from "@/lib/types/feats/kardex-costo/kardex-costo-types";

// ─── helpers ──────────────────────────────────────────────────────────────────

const formatDate = (value?: string) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

const fmt = (n: number, decimals = 2) =>
  n.toLocaleString("es-ES", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

const shortId = (id?: string): string => {
  if (!id) return "—";
  return id.length > 8 ? id.slice(-8) : id;
};

// ─── tipo badge ───────────────────────────────────────────────────────────────

function TipoBadge({ row }: { row: KardexCosto }) {
  if (row.pendiente_costeo) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-800 border border-amber-200"
        title="Entrada aprobada sin costo definido todavía. Pendiente de ponderación."
      >
        <AlertCircle className="h-2.5 w-2.5" />
        Sin costo
      </span>
    );
  }
  const tipo = row.tipo ?? "entrada";
  if (tipo === "ajuste_costo") {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-orange-100 text-orange-800 border border-orange-200"
        title="Ajuste de costo posterior a la ponderación. Las cantidades en almacén no cambian."
      >
        Ajuste
      </span>
    );
  }
  if (tipo === "regularizacion") {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-violet-100 text-violet-800 border border-violet-200"
        title="Ponderación: se aplicó el costo real de la ficha a una entrada que estaba sin costo."
      >
        Ponderación
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-600 border border-gray-200"
      title="Entrada normal de mercancía al almacén."
    >
      Entrada
    </span>
  );
}

// ─── fila de cantidad/costo (manejo de ajuste_costo con cant=0) ───────────────

function CantEntrada({ row }: { row: KardexCosto }) {
  if ((row.tipo ?? "entrada") === "ajuste_costo") {
    return <span className="text-gray-300">—</span>;
  }
  return (
    <span className={row.pendiente_costeo ? "text-amber-600" : "text-violet-700 font-semibold"}>
      +{fmt(row.cantidad_entrada)}
    </span>
  );
}

function CostoEntrada({ row }: { row: KardexCosto }) {
  if (row.pendiente_costeo) {
    return <span className="text-amber-500 italic text-[10px]">sin costo</span>;
  }
  if ((row.tipo ?? "entrada") === "ajuste_costo") {
    return <span className="text-orange-700">${fmt(row.costo_entrada)}</span>;
  }
  return <span className="text-violet-700">${fmt(row.costo_entrada)}</span>;
}

function CostoNuevo({ row }: { row: KardexCosto }) {
  if (row.pendiente_costeo) {
    return (
      <span className="text-amber-500 italic text-[10px]" title="El costo no cambió — esta entrada no tiene costo definido todavía.">
        sin cambio
      </span>
    );
  }
  return <span className="text-emerald-700 font-bold">${fmt(row.costo_nuevo)}</span>;
}

// ─── tendencia ────────────────────────────────────────────────────────────────

function TendenciaInfo({ historial, costoActual }: { historial: KardexCosto[]; costoActual: number | null }) {
  // Busca el penúltimo costo real (no pendiente)
  const reales = historial.filter((k) => !k.pendiente_costeo);
  if (reales.length < 2 || costoActual == null) return null;

  const anterior = reales[1].costo_nuevo;
  if (anterior <= 0) return null;

  const diff = costoActual - anterior;
  const pct = (diff / anterior) * 100;

  if (Math.abs(pct) < 0.01) {
    return <span className="text-xs text-gray-400">Sin cambio respecto a la entrada anterior</span>;
  }

  const up = diff > 0;
  return (
    <span className={`text-xs flex items-center gap-1 ${up ? "text-red-600" : "text-green-600"}`}>
      {up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
      {up ? "+" : ""}{pct.toFixed(1)}% vs entrada anterior (${fmt(anterior)})
    </span>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function KardexCostoPage() {
  return (
    <RouteGuard requiredModule="kardex-costo">
      <KardexCostoContent />
    </RouteGuard>
  );
}

function KardexCostoContent() {
  const { materials, loading: loadingMaterials } = useMaterials();
  const [almacenes, setAlmacenes] = useState<Almacen[]>([]);
  const [loadingAlmacenes, setLoadingAlmacenes] = useState(true);

  const [materialBusqueda, setMaterialBusqueda] = useState("");
  const [materialId, setMaterialId] = useState("");
  const [almacenId, setAlmacenId] = useState("");

  useEffect(() => {
    setLoadingAlmacenes(true);
    void InventarioService.getAlmacenes()
      .then((data) => setAlmacenes(data))
      .finally(() => setLoadingAlmacenes(false));
  }, []);

  const { historial, costoActual, loading, error, refresh } = useKardexCosto({
    materialId,
    almacenId,
    autoLoad: true,
  });

  const materialesFiltrados = useMemo(() => {
    const term = materialBusqueda.trim().toLowerCase();
    if (!term) return materials.slice(0, 30);
    return materials
      .filter((m) => {
        const cod = m.codigo?.toString().toLowerCase() ?? "";
        const nom = (m.nombre ?? "").toLowerCase();
        const desc = (m.descripcion ?? "").toLowerCase();
        return cod.includes(term) || nom.includes(term) || desc.includes(term);
      })
      .slice(0, 50);
  }, [materials, materialBusqueda]);

  const materialSeleccionado = useMemo(
    () => materials.find((m) => m.id === materialId) ?? null,
    [materials, materialId],
  );
  const almacenSeleccionado = useMemo(
    () => almacenes.find((a) => a.id === almacenId) ?? null,
    [almacenes, almacenId],
  );

  const pendientesCount = historial.filter((k) => k.pendiente_costeo).length;

  if (loadingMaterials || loadingAlmacenes) {
    return <PageLoader moduleName="Kardex de Costos" text="Cargando catálogo..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-violet-50">
      <ModuleHeader
        title="Kardex de Costos"
        subtitle="Historial del costo promedio ponderado por material y almacén"
        badge={{ text: "Economía", className: "bg-violet-100 text-violet-800" }}
        backHref="/compras-envios-costos"
        backLabel="Volver a Compras, Envíos y Costos"
        actions={
          <Button
            variant="ghost"
            size="icon"
            onClick={() => void refresh()}
            title="Recargar kardex"
            aria-label="Recargar"
            className="touch-manipulation"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        }
      />

      <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4">
        {error && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 border border-red-200">
            <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
            <p className="text-sm text-red-700 flex-1">{error}</p>
          </div>
        )}

        {/* ── Filtros ── */}
        <Card className="border border-gray-200 shadow-none">
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Material */}
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5" />
                  Material
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <Input
                    placeholder="Buscar por código o nombre..."
                    value={materialBusqueda}
                    onChange={(e) => setMaterialBusqueda(e.target.value)}
                    className="h-9 pl-9"
                  />
                </div>
                <Select value={materialId} onValueChange={setMaterialId}>
                  <SelectTrigger className="h-9 mt-2">
                    <SelectValue placeholder={`Selecciona material${materialBusqueda ? ` (${materialesFiltrados.length} resultados)` : ""}`} />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {materialesFiltrados.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-gray-400">Sin resultados para "{materialBusqueda}"</div>
                    ) : (
                      materialesFiltrados.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          <span className="font-mono text-xs text-gray-500">{m.codigo}</span>
                          {" — "}
                          <span>{m.nombre || m.descripcion}</span>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Almacén */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                  <Warehouse className="h-3.5 w-3.5" />
                  Almacén
                </label>
                <Select value={almacenId} onValueChange={setAlmacenId}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Selecciona almacén..." />
                  </SelectTrigger>
                  <SelectContent>
                    {almacenes.map((a) => (
                      <SelectItem key={a.id} value={a.id!}>{a.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {materialSeleccionado && almacenSeleccionado && (
              <div className="text-xs text-gray-500 flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs font-mono">
                  {materialSeleccionado.codigo}
                </Badge>
                <span className="text-gray-400">{materialSeleccionado.nombre || materialSeleccionado.descripcion}</span>
                <ArrowRight className="h-3 w-3 text-gray-300" />
                <Badge variant="outline" className="text-xs">{almacenSeleccionado.nombre}</Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Costo actual + tendencia ── */}
        {materialId && almacenId && (
          <Card className="border border-violet-200 bg-gradient-to-br from-violet-50 to-white shadow-none">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-violet-100 shrink-0">
                <Calculator className="h-6 w-6 text-violet-700" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs uppercase tracking-wide font-semibold text-violet-600 mb-0.5">
                  Costo promedio ponderado actual
                </p>
                {loading ? (
                  <div className="flex items-center gap-2 text-violet-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Calculando...</span>
                  </div>
                ) : costoActual?.costo_actual != null ? (
                  <div className="space-y-1">
                    <p className="text-3xl font-bold text-violet-900 flex items-baseline gap-1">
                      <DollarSign className="h-5 w-5 text-violet-500" />
                      {fmt(costoActual.costo_actual)}
                    </p>
                    <TendenciaInfo historial={historial} costoActual={costoActual.costo_actual} />
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Sin registros de kardex para esta combinación.</p>
                )}
              </div>
              {pendientesCount > 0 && (
                <div className="shrink-0 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-amber-800">
                      {pendientesCount} entrada{pendientesCount !== 1 ? "s" : ""} sin costo
                    </p>
                    <p className="text-[10px] text-amber-600">Pendiente{pendientesCount !== 1 ? "s" : ""} de ponderación</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Historial ── */}
        {materialId && almacenId && (
          <Card className="border border-gray-200 shadow-none">
            <CardContent className="p-0">
              {/* Header del historial */}
              <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                <History className="h-4 w-4 text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-700">Historial de movimientos de costo</h3>
                {!loading && historial.length > 0 && (
                  <span className="ml-auto text-xs text-gray-400">
                    {historial.length} movimiento{historial.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {/* Leyenda de tipos */}
              {!loading && historial.length > 0 && (
                <div className="px-4 py-2 border-b border-gray-100 bg-gray-50/60 flex items-center gap-3 flex-wrap">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Tipos:</span>
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-600 border border-gray-200">Entrada</span>
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-violet-100 text-violet-800 border border-violet-200">Ponderación</span>
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-orange-100 text-orange-800 border border-orange-200">Ajuste</span>
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-800 border border-amber-200">
                    <AlertCircle className="h-2.5 w-2.5" />Sin costo
                  </span>
                  <span className="ml-auto flex items-center gap-1 text-[10px] text-gray-400">
                    <Info className="h-3 w-3" />
                    Más reciente primero
                  </span>
                </div>
              )}

              {loading ? (
                <div className="p-12 flex flex-col items-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
                  <p className="text-xs text-gray-400">Cargando historial...</p>
                </div>
              ) : historial.length === 0 ? (
                <div className="p-12 text-center">
                  <History className="h-12 w-12 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm font-medium text-gray-500">Sin movimientos todavía</p>
                  <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
                    Los movimientos aparecen aquí cuando se aprueban solicitudes de entrada al almacén o se ponderan costos de compra.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      {/* Fila de grupos */}
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th colSpan={2} className="py-1.5 px-3 text-left" />
                        <th colSpan={2} className="py-1.5 px-3 text-center text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-x border-gray-200">
                          Stock antes
                        </th>
                        <th colSpan={2} className="py-1.5 px-3 text-center text-[10px] font-semibold text-violet-500 uppercase tracking-wider border-r border-gray-200">
                          Esta operación
                        </th>
                        <th colSpan={2} className="py-1.5 px-3 text-center text-[10px] font-semibold text-emerald-600 uppercase tracking-wider border-r border-gray-200">
                          Resultado
                        </th>
                        <th className="py-1.5 px-3" />
                      </tr>
                      {/* Fila de columnas */}
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Fecha</th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipo</th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wide border-l border-gray-200">Cant.</th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wide border-r border-gray-200">Costo</th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-violet-500 uppercase tracking-wide">Cant.</th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-violet-500 uppercase tracking-wide border-r border-gray-200">Costo</th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cant.</th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-emerald-600 uppercase tracking-wide border-r border-gray-200">Costo prom.</th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Origen / Nota</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historial.map((k, idx) => {
                        const isPendiente = !!k.pendiente_costeo;
                        const isAjuste = (k.tipo ?? "entrada") === "ajuste_costo";
                        const rowBg = isPendiente
                          ? "bg-amber-50/40"
                          : isAjuste
                          ? "bg-orange-50/30"
                          : "";
                        return (
                          <tr
                            key={k.id || `${k.fecha}-${idx}`}
                            className={`border-b border-gray-100 last:border-0 hover:bg-gray-50/60 transition-colors ${rowBg}`}
                          >
                            {/* Fecha */}
                            <td className="py-2.5 px-3 text-xs text-gray-600 whitespace-nowrap align-middle">
                              <div>{formatDate(k.fecha)}</div>
                              {k.registrado_por_ci && (
                                <div className="text-[10px] text-gray-400 mt-0.5">{k.registrado_por_ci}</div>
                              )}
                            </td>
                            {/* Tipo */}
                            <td className="py-2.5 px-3 align-middle">
                              <TipoBadge row={k} />
                            </td>
                            {/* Stock antes */}
                            <td className="py-2.5 px-3 text-right font-mono text-xs text-gray-500 border-l border-gray-100 align-middle">
                              {fmt(k.cantidad_anterior)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-xs text-gray-500 border-r border-gray-100 align-middle">
                              ${fmt(k.costo_anterior)}
                            </td>
                            {/* Esta operación */}
                            <td className="py-2.5 px-3 text-right font-mono text-xs align-middle bg-violet-50/20">
                              <CantEntrada row={k} />
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-xs border-r border-gray-100 align-middle bg-violet-50/20">
                              <CostoEntrada row={k} />
                            </td>
                            {/* Resultado */}
                            <td className="py-2.5 px-3 text-right font-mono text-xs text-gray-700 align-middle">
                              {fmt(k.cantidad_nueva)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-xs border-r border-gray-100 align-middle bg-emerald-50/20">
                              <CostoNuevo row={k} />
                            </td>
                            {/* Origen + nota */}
                            <td className="py-2.5 px-3 text-xs text-gray-500 align-middle">
                              <div className="flex flex-col gap-0.5">
                                {k.compra_id ? (
                                  <a
                                    href={`/compras/${k.compra_id}/ficha-costo`}
                                    className="inline-flex items-center gap-1 hover:underline text-violet-600"
                                    title={`Ver ficha de costo de la compra`}
                                  >
                                    <Badge variant="outline" className="text-[10px] border-violet-200 text-violet-700 hover:bg-violet-50 cursor-pointer">
                                      Compra #{shortId(k.compra_id)}
                                    </Badge>
                                  </a>
                                ) : k.solicitud_entrada_id ? (
                                  <Badge variant="outline" className="text-[10px] w-fit">
                                    Sol. #{shortId(k.solicitud_entrada_id)}
                                  </Badge>
                                ) : null}
                                {k.nota && (
                                  <span className="text-[10px] text-gray-400 max-w-[180px] truncate" title={k.nota}>
                                    {k.nota}
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Empty state inicial ── */}
        {(!materialId || !almacenId) && (
          <Card className="border border-dashed border-gray-200 shadow-none">
            <CardContent className="p-12 text-center">
              <Calculator className="h-12 w-12 text-gray-200 mx-auto mb-3" />
              <p className="text-base font-medium text-gray-500">
                {!materialId ? "Selecciona un material" : "Selecciona un almacén"}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                {!materialId
                  ? "Busca el material por código o nombre y selecciónalo para ver su historial de costos."
                  : "Elige el almacén para consultar el costo promedio ponderado en ese almacén."}
              </p>
            </CardContent>
          </Card>
        )}
      </main>

      <Toaster />
    </div>
  );
}
