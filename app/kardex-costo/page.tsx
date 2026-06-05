"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Calculator,
  DollarSign,
  History,
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

  if (loadingMaterials || loadingAlmacenes) {
    return <PageLoader moduleName="Kardex de Costos" text="Cargando catálogo..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-violet-50">
      <ModuleHeader
        title="Kardex de Costos"
        subtitle="Costo promedio ponderado por material y almacén — histórico de entradas"
        badge={{ text: "Economía", className: "bg-violet-100 text-violet-800" }}
        backHref="/compras-envios-costos"
        backLabel="Volver a Compras, Envíos y Costos"
        actions={
          <Button
            variant="ghost"
            size="icon"
            onClick={() => void refresh()}
            title="Recargar"
            aria-label="Recargar"
            className="touch-manipulation"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        }
      />

      <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4">
        {error && (
          <div className="mb-4 flex items-center gap-3 p-3 rounded-lg bg-red-50 border border-red-200">
            <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
            <p className="text-sm text-red-700 flex-1">{error}</p>
          </div>
        )}

        {/* Filtros */}
        <Card className="border border-gray-200 shadow-none">
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                      <div className="px-3 py-2 text-xs text-gray-400">Sin resultados</div>
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
              <div className="text-xs text-gray-500 flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {materialSeleccionado.codigo} · {materialSeleccionado.nombre || materialSeleccionado.descripcion}
                </Badge>
                <span>en</span>
                <Badge variant="outline" className="text-xs">{almacenSeleccionado.nombre}</Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Costo actual */}
        {materialId && almacenId && (
          <Card className="border border-violet-200 bg-gradient-to-br from-violet-50 to-white shadow-none">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-violet-100">
                <Calculator className="h-6 w-6 text-violet-700" />
              </div>
              <div className="flex-1">
                <p className="text-xs uppercase tracking-wide font-semibold text-violet-700 mb-0.5">
                  Costo promedio ponderado actual
                </p>
                {loading ? (
                  <div className="flex items-center gap-2 text-violet-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Calculando...</span>
                  </div>
                ) : costoActual?.costo_actual != null ? (
                  <p className="text-3xl font-bold text-violet-900 flex items-baseline gap-1">
                    <DollarSign className="h-5 w-5 text-violet-600" />
                    {fmt(costoActual.costo_actual)}
                  </p>
                ) : (
                  <p className="text-sm text-gray-500">Sin registros de kardex todavía para esta combinación.</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Historial */}
        {materialId && almacenId && (
          <Card className="border border-gray-200 shadow-none">
            <CardContent className="p-0">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                <History className="h-4 w-4 text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-700">Historial de entradas</h3>
                <span className="ml-auto text-xs text-gray-400">
                  {historial.length} entrada{historial.length !== 1 ? "s" : ""}
                </span>
              </div>

              {loading ? (
                <div className="p-12 flex justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
                </div>
              ) : historial.length === 0 ? (
                <div className="p-12 text-center">
                  <History className="h-12 w-12 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm font-medium text-gray-500">No hay historial</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Las entradas aparecen aquí al aprobar solicitudes de entrada al almacén.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Fecha</th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cant. anterior</th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Costo anterior</th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-violet-50">Cant. entrada</th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-violet-50">Costo entrada</th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cant. nueva</th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-emerald-700 uppercase tracking-wide bg-emerald-50">Costo nuevo</th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Origen</th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nota</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historial.map((k, idx) => (
                        <tr key={k.id || `${k.fecha}-${idx}`} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/40">
                          <td className="py-2 px-3 text-xs text-gray-700 whitespace-nowrap">
                            {formatDate(k.fecha)}
                          </td>
                          <td className="py-2 px-3 text-right text-gray-600 font-mono text-xs">{fmt(k.cantidad_anterior)}</td>
                          <td className="py-2 px-3 text-right text-gray-600 font-mono text-xs">${fmt(k.costo_anterior)}</td>
                          <td className="py-2 px-3 text-right text-violet-700 font-mono text-xs bg-violet-50/40 font-semibold">
                            +{fmt(k.cantidad_entrada)}
                          </td>
                          <td className="py-2 px-3 text-right text-violet-700 font-mono text-xs bg-violet-50/40">${fmt(k.costo_entrada)}</td>
                          <td className="py-2 px-3 text-right text-gray-700 font-mono text-xs">{fmt(k.cantidad_nueva)}</td>
                          <td className="py-2 px-3 text-right text-emerald-700 font-mono text-xs bg-emerald-50/40 font-bold">
                            ${fmt(k.costo_nuevo)}
                          </td>
                          <td className="py-2 px-3 text-xs text-gray-500">
                            {k.compra_id ? (
                              <span className="inline-flex items-center gap-1">
                                <Badge variant="outline" className="text-[10px]">Compra #{shortId(k.compra_id)}</Badge>
                              </span>
                            ) : k.solicitud_entrada_id ? (
                              <Badge variant="outline" className="text-[10px]">Sol. #{shortId(k.solicitud_entrada_id)}</Badge>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-xs text-gray-600 max-w-[200px] truncate" title={k.nota}>
                            {k.nota || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {(!materialId || !almacenId) && (
          <Card className="border border-dashed border-gray-200 shadow-none">
            <CardContent className="p-12 text-center">
              <Calculator className="h-12 w-12 text-gray-200 mx-auto mb-3" />
              <p className="text-base font-medium text-gray-500">Selecciona material y almacén</p>
              <p className="text-sm text-gray-400 mt-1">
                Necesitas ambos para consultar el kardex de costos.
              </p>
            </CardContent>
          </Card>
        )}
      </main>

      <Toaster />
    </div>
  );
}
