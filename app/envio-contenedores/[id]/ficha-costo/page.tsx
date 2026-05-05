"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Info, Loader2, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/shared/atom/button";
import { Input } from "@/components/shared/molecule/input";
import { Label } from "@/components/shared/atom/label";
import { Badge } from "@/components/shared/atom/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/molecule/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select";
import { Toaster } from "@/components/shared/molecule/toaster";
import { useToast } from "@/hooks/use-toast";
import { PageLoader } from "@/components/shared/atom/page-loader";
import { RouteGuard } from "@/components/auth/route-guard";

import { EnvioContenedorService } from "@/lib/api-services";
import type {
  AplicarPreciosMaterialPayload,
  CostoImportacion,
  EnvioContenedor,
  MonedaCosto,
  StockMaterialEnvio,
} from "@/lib/types/feats/envios-contenedores/envio-contenedor-types";
import {
  COSTOS_SUGERIDOS,
  MONEDAS_COSTO,
  TIPO_ENVIO_LABELS,
} from "@/lib/types/feats/envios-contenedores/envio-contenedor-types";

// ─── helpers ────────────────────────────────────────────────────────────────

const fmt = (n: number, decimals = 2) =>
  n.toLocaleString("es-ES", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

const fmtPct = (n: number) => `${n >= 0 ? "+" : ""}${fmt(n)}%`;

// ─── tipos internos ──────────────────────────────────────────────────────────

interface FilaMaterial {
  material_id: string;
  material_codigo: string;
  material_nombre: string;
  cantidad: number;
  // Precios existentes en catálogo (referencia, read-only)
  precio_catalogo: number;
  precio_instaladora_catalogo: number;
  porciento_rebajable_venta_actual: number;
  // Stock para prorrateo
  stock_actual: number;
  // Campos editables de la ficha
  precio_unitario_cif: number;
  porciento_extra: number;
  porciento_rebajable_venta: number;
  // Calculados
  precio_venta_nuevo: number;
  precio_instaladora_nuevo: number;
  // Error de validación por fila
  errorValidacion: string | null;
}

// ─── componente principal ────────────────────────────────────────────────────

export default function FichaCostoPage() {
  return (
    <RouteGuard requiredModule="envio-contenedores">
      <FichaCostoContent />
    </RouteGuard>
  );
}

function FichaCostoContent() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const envioId = String(params.id ?? "");

  // ── estado global ──
  const [envio, setEnvio] = useState<EnvioContenedor | null>(null);
  const [loadingEnvio, setLoadingEnvio] = useState(true);
  const [stockMap, setStockMap] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  // ── costos de importación ──
  const [costos, setCostos] = useState<CostoImportacion[]>([]);
  const [tasaEurUsd, setTasaEurUsd] = useState<number>(1.08);
  const [nuevoCostoDesc, setNuevoCostoDesc] = useState("");
  const [nuevoCostoMonto, setNuevoCostoMonto] = useState("");
  const [nuevoCostoMoneda, setNuevoCostoMoneda] = useState<MonedaCosto>("USD");

  // ── porcentajes globales ──
  const [porcientoInstaladora, setPorcientoInstaladora] = useState(0);
  const [porcientoVentas, setPorcientoVentas] = useState(0);

  // ── filas de materiales ──
  const [filas, setFilas] = useState<FilaMaterial[]>([]);

  // ─── carga inicial ───────────────────────────────────────────────────────

  const cargarDatos = useCallback(async () => {
    setLoadingEnvio(true);
    try {
      const [envioData, stockData] = await Promise.all([
        EnvioContenedorService.getEnvioById(envioId),
        EnvioContenedorService.getStockMateriales(envioId),
      ]);

      if (!envioData) {
        toast({ title: "Error", description: "Envío no encontrado.", variant: "destructive" });
        router.push("/envio-contenedores");
        return;
      }

      setEnvio(envioData);
      setCostos(envioData.costos ?? []);
      setPorcientoInstaladora(envioData.porciento_instaladora ?? 0);
      setPorcientoVentas(envioData.porciento_ventas ?? 0);

      // Mapa de stock
      const sm: Record<string, number> = {};
      for (const s of stockData) sm[s.material_id] = s.cantidad_stock_actual;
      setStockMap(sm);

      // Inicializar filas a partir de los datos guardados en el envío
      const filasInit: FilaMaterial[] = envioData.materiales.map((m) => ({
        material_id: m.material_id,
        material_codigo: m.material_codigo,
        material_nombre: m.material_nombre,
        cantidad: m.cantidad,
        precio_catalogo: 0, // se obtiene del backend en el catálogo; aquí lo inicializamos en 0
        precio_instaladora_catalogo: 0,
        porciento_rebajable_venta_actual: m.porciento_rebajable_venta ?? 0,
        stock_actual: sm[m.material_id] ?? 0,
        precio_unitario_cif: m.precio_unitario_cif ?? 0,
        porciento_extra: m.porciento_extra ?? 0,
        porciento_rebajable_venta: m.porciento_rebajable_venta ?? 0,
        precio_venta_nuevo: m.precio_venta_calc ?? 0,
        precio_instaladora_nuevo: m.precio_instaladora_calc ?? 0,
        errorValidacion: null,
      }));
      setFilas(filasInit);
    } finally {
      setLoadingEnvio(false);
    }
  }, [envioId, router, toast]);

  useEffect(() => {
    void cargarDatos();
  }, [cargarDatos]);

  // ─── cálculos derivados ───────────────────────────────────────────────────

  const totalCostosUsd = useMemo(() => {
    return costos.reduce((acc, c) => {
      if (c.moneda === "USD") return acc + c.monto;
      if (c.moneda === "EUR") return acc + c.monto * tasaEurUsd;
      // MLC y CUP se muestran informativos; no se convierten automáticamente
      return acc;
    }, 0);
  }, [costos, tasaEurUsd]);

  const totalValorMercancias = useMemo(
    () => filas.reduce((acc, f) => acc + f.precio_unitario_cif * f.cantidad, 0),
    [filas],
  );

  const porcientoEnvioSugerido = useMemo(
    () => (totalValorMercancias > 0 ? (totalCostosUsd / totalValorMercancias) * 100 : 0),
    [totalCostosUsd, totalValorMercancias],
  );

  // Calcular precios para todas las filas
  const calcularPrecios = useCallback(
    (filasActuales: FilaMaterial[], pctEnvio: number, pctVentas: number, pctInstaladora: number): FilaMaterial[] => {
      return filasActuales.map((f) => {
        const pctVentaTotal = pctEnvio + pctVentas + f.porciento_extra;
        const pctInstaladoraTotal = pctEnvio + pctInstaladora + f.porciento_extra;
        const pvNuevo = f.precio_unitario_cif * (1 + pctVentaTotal / 100);
        const piNuevo = f.precio_unitario_cif * (1 + pctInstaladoraTotal / 100);

        // Validación: precio_venta * (1 - rebajable/100) > precio_instaladora
        let errorValidacion: string | null = null;
        if (f.porciento_rebajable_venta > 0 && pvNuevo > 0 && piNuevo > 0) {
          const precioVentaMinimo = pvNuevo * (1 - f.porciento_rebajable_venta / 100);
          if (precioVentaMinimo <= piNuevo) {
            errorValidacion = `Con ${f.porciento_rebajable_venta}% de descuento el precio venta ($${fmt(precioVentaMinimo)}) quedaría ≤ precio instaladora ($${fmt(piNuevo)})`;
          }
        }

        return { ...f, precio_venta_nuevo: pvNuevo, precio_instaladora_nuevo: piNuevo, errorValidacion };
      });
    },
    [],
  );

  // Indicador global: promedio ponderado de porciento_extra por valor de mercancía
  const deltaGlobal = useMemo(() => {
    const totalPeso = filas.reduce((acc, f) => acc + f.precio_unitario_cif * f.cantidad, 0);
    if (totalPeso === 0) return 0;
    const sumaPonderada = filas.reduce(
      (acc, f) => acc + f.porciento_extra * f.precio_unitario_cif * f.cantidad,
      0,
    );
    return sumaPonderada / totalPeso;
  }, [filas]);

  const hayErroresValidacion = useMemo(() => filas.some((f) => f.errorValidacion !== null), [filas]);

  // ─── handlers costos ─────────────────────────────────────────────────────

  const agregarCosto = () => {
    const monto = parseFloat(nuevoCostoMonto.replace(",", "."));
    if (!nuevoCostoDesc.trim() || isNaN(monto) || monto < 0) {
      toast({ title: "Error", description: "Completa descripción y monto válido.", variant: "destructive" });
      return;
    }
    setCostos((prev) => [...prev, { descripcion: nuevoCostoDesc.trim(), monto, moneda: nuevoCostoMoneda }]);
    setNuevoCostoDesc("");
    setNuevoCostoMonto("");
  };

  const eliminarCosto = (idx: number) => {
    setCostos((prev) => prev.filter((_, i) => i !== idx));
  };

  const sugerirCostos = () => {
    if (!envio?.tipo_envio) {
      toast({ title: "Aviso", description: "El envío no tiene tipo definido. Edítalo primero." });
      return;
    }
    const sugeridos = COSTOS_SUGERIDOS[envio.tipo_envio];
    const nuevos: CostoImportacion[] = sugeridos
      .filter((s) => !costos.some((c) => c.descripcion === s.descripcion))
      .map((s) => ({ ...s, monto: 0 }));
    if (nuevos.length === 0) {
      toast({ title: "Aviso", description: "Todos los costos sugeridos ya están agregados." });
      return;
    }
    setCostos((prev) => [...prev, ...nuevos]);
    toast({ title: `${nuevos.length} costos sugeridos agregados`, description: "Rellena los montos." });
  };

  // ─── handlers filas ───────────────────────────────────────────────────────

  const actualizarFila = (material_id: string, campo: keyof FilaMaterial, valor: number) => {
    setFilas((prev) => {
      const updated = prev.map((f) => (f.material_id === material_id ? { ...f, [campo]: valor } : f));
      return calcularPrecios(updated, porcientoEnvioSugerido, porcientoVentas, porcientoInstaladora);
    });
  };

  // Ajuste de precio_venta_nuevo directo → deriva porciento_extra
  const actualizarPrecioVentaDirecto = (material_id: string, precioVenta: number) => {
    setFilas((prev) => {
      const updated = prev.map((f) => {
        if (f.material_id !== material_id) return f;
        if (f.precio_unitario_cif <= 0) return f;
        const pctTotal = (precioVenta / f.precio_unitario_cif - 1) * 100;
        const pctBase = porcientoEnvioSugerido + porcientoVentas;
        const nuevoExtra = pctTotal - pctBase;
        return { ...f, porciento_extra: nuevoExtra };
      });
      return calcularPrecios(updated, porcientoEnvioSugerido, porcientoVentas, porcientoInstaladora);
    });
  };

  const recalcularTodo = useCallback(() => {
    setFilas((prev) =>
      calcularPrecios(prev, porcientoEnvioSugerido, porcientoVentas, porcientoInstaladora),
    );
  }, [calcularPrecios, porcientoEnvioSugerido, porcientoVentas, porcientoInstaladora]);

  const aplicarSugerencia = () => {
    setFilas((prev) =>
      calcularPrecios(
        prev.map((f) => ({ ...f, porciento_extra: 0 })),
        porcientoEnvioSugerido,
        porcientoVentas,
        porcientoInstaladora,
      ),
    );
    toast({ title: "Porcentaje sugerido aplicado", description: "Todos los productos tienen Δ = 0." });
  };

  const prorratearProducto = (material_id: string) => {
    setFilas((prev) => {
      const updated = prev.map((f) => {
        if (f.material_id !== material_id) return f;
        const totalStock = f.stock_actual + f.cantidad;
        if (totalStock <= 0 || f.precio_unitario_cif <= 0) return f;
        // Precio promedio ponderado
        const precioPromedio =
          (f.precio_catalogo * f.stock_actual + f.precio_unitario_cif * f.cantidad) / totalStock;
        // Derivar porciento_extra para que precio_venta_nuevo = precioPromedio
        const pctBase = porcientoEnvioSugerido + porcientoVentas;
        const pctTotalNecesario = (precioPromedio / f.precio_unitario_cif - 1) * 100;
        const nuevoExtra = pctTotalNecesario - pctBase;
        return { ...f, porciento_extra: nuevoExtra };
      });
      return calcularPrecios(updated, porcientoEnvioSugerido, porcientoVentas, porcientoInstaladora);
    });
  };

  // Recalcular cuando cambian los porcentajes globales
  const prevPctRef = useRef({ porcientoEnvioSugerido, porcientoVentas, porcientoInstaladora });
  useEffect(() => {
    const prev = prevPctRef.current;
    if (
      prev.porcientoEnvioSugerido !== porcientoEnvioSugerido ||
      prev.porcientoVentas !== porcientoVentas ||
      prev.porcientoInstaladora !== porcientoInstaladora
    ) {
      prevPctRef.current = { porcientoEnvioSugerido, porcientoVentas, porcientoInstaladora };
      recalcularTodo();
    }
  }, [porcientoEnvioSugerido, porcientoVentas, porcientoInstaladora, recalcularTodo]);

  // ─── guardar ficha ────────────────────────────────────────────────────────

  const guardarFicha = async () => {
    if (hayErroresValidacion) {
      toast({
        title: "Errores de validación",
        description: "Corrige los errores en los precios antes de guardar.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      // 1. Actualizar porcentajes y costos del envío
      await EnvioContenedorService.updateEnvio(envioId, {
        costos,
        porciento_instaladora: porcientoInstaladora,
        porciento_ventas: porcientoVentas,
      });

      // 2. Aplicar precios al catálogo y guardar en el envío
      const payload: AplicarPreciosMaterialPayload[] = filas.map((f) => ({
        material_id: f.material_id,
        precio_unitario_cif: f.precio_unitario_cif,
        porciento_extra: f.porciento_extra,
        precio_venta_calc: f.precio_venta_nuevo > 0 ? f.precio_venta_nuevo : undefined,
        precio_instaladora_calc: f.precio_instaladora_nuevo > 0 ? f.precio_instaladora_nuevo : undefined,
        porciento_rebajable_venta: f.porciento_rebajable_venta,
      }));

      const envioActualizado = await EnvioContenedorService.aplicarPrecios(envioId, payload);
      setEnvio(envioActualizado);

      toast({ title: "Ficha guardada", description: "Precios aplicados al catálogo de productos." });
    } catch (err) {
      toast({
        title: "Error al guardar",
        description: err instanceof Error ? err.message : "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // ─── render ───────────────────────────────────────────────────────────────

  if (loadingEnvio) return <PageLoader moduleName="Ficha de Costo" text="Cargando ficha de costo..." />;
  if (!envio) return null;

  const costosTotalesMLC = costos.filter((c) => c.moneda === "MLC").reduce((a, c) => a + c.monto, 0);
  const costosTotalesCUP = costos.filter((c) => c.moneda === "CUP").reduce((a, c) => a + c.monto, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      {/* Header */}
      <header className="fixed-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <Link href="/envio-contenedores">
                <Button variant="ghost" size="sm" className="gap-1">
                  <ArrowLeft className="h-4 w-4" />
                  Volver
                </Button>
              </Link>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Ficha de Costo</h1>
                <p className="text-sm text-gray-500 truncate max-w-xs">{envio.nombre}</p>
              </div>
              {envio.tipo_envio && (
                <Badge variant="outline" className="bg-cyan-50 text-cyan-700 border-cyan-200">
                  {TIPO_ENVIO_LABELS[envio.tipo_envio]}
                </Badge>
              )}
              <Badge
                variant="outline"
                className={envio.pagado ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"}
              >
                {envio.pagado ? "Pagado" : "Pendiente de pago"}
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={aplicarSugerencia} className="gap-1.5">
                <RefreshCw className="h-4 w-4" />
                Aplicar sugerencia
              </Button>
              <Button
                size="sm"
                onClick={guardarFicha}
                disabled={saving || hayErroresValidacion}
                className="gap-1.5 bg-cyan-600 hover:bg-cyan-700"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Guardar y aplicar precios
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Indicador global */}
        <Card className={`border-l-4 ${Math.abs(deltaGlobal) < 0.01 ? "border-l-green-500" : deltaGlobal > 0 ? "border-l-blue-500" : "border-l-red-500"}`}>
          <CardContent className="p-4 flex flex-wrap items-center gap-6">
            <div className="flex-1 min-w-[200px]">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Desviación respecto al punto exacto</p>
              <p className={`text-2xl font-bold ${Math.abs(deltaGlobal) < 0.01 ? "text-green-600" : deltaGlobal > 0 ? "text-blue-600" : "text-red-600"}`}>
                {fmtPct(deltaGlobal)}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {Math.abs(deltaGlobal) < 0.01 ? "En punto exacto — los precios cubren exactamente los costos." : deltaGlobal > 0 ? "Por encima del porcentaje sugerido" : "Por debajo del porcentaje sugerido"}
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Total costos (USD)</p>
                <p className="font-semibold">${fmt(totalCostosUsd)}</p>
                {costosTotalesMLC > 0 && <p className="text-xs text-gray-400">+ {fmt(costosTotalesMLC)} MLC</p>}
                {costosTotalesCUP > 0 && <p className="text-xs text-gray-400">+ {fmt(costosTotalesCUP)} CUP</p>}
              </div>
              <div>
                <p className="text-gray-500">Valor mercancías</p>
                <p className="font-semibold">${fmt(totalValorMercancias)}</p>
              </div>
              <div>
                <p className="text-gray-500">% envío sugerido</p>
                <p className="font-semibold text-cyan-700">{fmt(porcientoEnvioSugerido)}%</p>
              </div>
              <div>
                <p className="text-gray-500">% ventas / instaladora</p>
                <p className="font-semibold">{porcientoVentas}% / {porcientoInstaladora}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Costos de importación ── */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Costos de importación</CardTitle>
                  {envio.tipo_envio && (
                    <Button variant="outline" size="sm" onClick={sugerirCostos} className="text-xs gap-1">
                      <Plus className="h-3 w-3" />
                      Sugerir
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Tasa EUR/USD */}
                <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-md">
                  <Info className="h-4 w-4 text-amber-600 shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-amber-800 font-medium">Tasa EUR → USD</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-xs text-amber-700">1 EUR =</span>
                      <Input
                        type="number"
                        className="h-6 w-20 text-xs px-1"
                        value={tasaEurUsd}
                        onChange={(e) => setTasaEurUsd(parseFloat(e.target.value) || 1)}
                        step="0.01"
                        min="0.01"
                      />
                      <span className="text-xs text-amber-700">USD</span>
                    </div>
                  </div>
                </div>

                {/* Lista costos */}
                <div className="space-y-1.5">
                  {costos.map((c, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-600 truncate">{c.descripcion}</p>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            className="h-6 text-xs px-1 w-24"
                            value={c.monto}
                            onChange={(e) =>
                              setCostos((prev) =>
                                prev.map((item, i) =>
                                  i === idx ? { ...item, monto: parseFloat(e.target.value) || 0 } : item,
                                )
                              )
                            }
                            min="0"
                            step="0.01"
                          />
                          <Select
                            value={c.moneda}
                            onValueChange={(val) =>
                              setCostos((prev) =>
                                prev.map((item, i) => (i === idx ? { ...item, moneda: val as MonedaCosto } : item))
                              )
                            }
                          >
                            <SelectTrigger className="h-6 text-xs w-16">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {MONEDAS_COSTO.map((m) => (
                                <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-red-400 hover:text-red-600 shrink-0"
                        onClick={() => eliminarCosto(idx)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Agregar costo */}
                <div className="border-t pt-3 space-y-2">
                  <Input
                    placeholder="Descripción del costo"
                    className="h-7 text-xs"
                    value={nuevoCostoDesc}
                    onChange={(e) => setNuevoCostoDesc(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && agregarCosto()}
                  />
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Monto"
                      className="h-7 text-xs flex-1"
                      value={nuevoCostoMonto}
                      onChange={(e) => setNuevoCostoMonto(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && agregarCosto()}
                      min="0"
                    />
                    <Select
                      value={nuevoCostoMoneda}
                      onValueChange={(val) => setNuevoCostoMoneda(val as MonedaCosto)}
                    >
                      <SelectTrigger className="h-7 text-xs w-16">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MONEDAS_COSTO.map((m) => (
                          <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" size="sm" className="h-7 px-2" onClick={agregarCosto}>
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Porcentajes globales */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Porcentajes de margen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">% Margen Ventas</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      className="h-8"
                      value={porcientoVentas}
                      onChange={(e) => setPorcientoVentas(parseFloat(e.target.value) || 0)}
                    />
                    <span className="text-sm text-gray-500">%</span>
                  </div>
                  <p className="text-xs text-gray-400">
                    P. final ventas = CIF × (1 + ({fmt(porcientoEnvioSugerido, 1)} + {porcientoVentas} + Δ) / 100)
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">% Margen Instaladora</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      className="h-8"
                      value={porcientoInstaladora}
                      onChange={(e) => setPorcientoInstaladora(parseFloat(e.target.value) || 0)}
                    />
                    <span className="text-sm text-gray-500">%</span>
                  </div>
                  <p className="text-xs text-gray-400">
                    P. final instaladora = CIF × (1 + ({fmt(porcientoEnvioSugerido, 1)} + {porcientoInstaladora} + Δ) / 100)
                  </p>
                </div>
                <div className="p-2 bg-cyan-50 border border-cyan-200 rounded text-xs text-cyan-800">
                  <p className="font-medium">% envío sugerido: {fmt(porcientoEnvioSugerido)}%</p>
                  <p className="text-cyan-600 mt-0.5">Calculado automáticamente de los costos USD / valor mercancías</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Tabla de materiales ── */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Productos del envío</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="text-left py-2.5 px-3 font-semibold text-gray-700 text-xs whitespace-nowrap">Material</th>
                        <th className="text-center py-2.5 px-3 font-semibold text-gray-700 text-xs">Cant.</th>
                        <th className="text-right py-2.5 px-3 font-semibold text-gray-700 text-xs whitespace-nowrap">P. CIF (USD)</th>
                        <th className="text-right py-2.5 px-3 font-semibold text-gray-700 text-xs whitespace-nowrap">Δ% extra</th>
                        <th className="text-right py-2.5 px-3 font-semibold text-gray-700 text-xs whitespace-nowrap">P. venta nuevo</th>
                        <th className="text-right py-2.5 px-3 font-semibold text-gray-700 text-xs whitespace-nowrap">P. install. nuevo</th>
                        <th className="text-right py-2.5 px-3 font-semibold text-gray-700 text-xs whitespace-nowrap">% rebajable</th>
                        <th className="text-center py-2.5 px-3 font-semibold text-gray-700 text-xs">Stock</th>
                        <th className="text-center py-2.5 px-3 font-semibold text-gray-700 text-xs">Acc.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filas.map((f) => {
                        const pctVentaTotal = porcientoEnvioSugerido + porcientoVentas + f.porciento_extra;
                        const pctInstTotal = porcientoEnvioSugerido + porcientoInstaladora + f.porciento_extra;

                        return (
                          <Fragment key={f.material_id}>
                            <tr className={`border-b border-gray-100 hover:bg-gray-50 align-top ${f.errorValidacion ? "bg-red-50" : ""}`}>
                              {/* Nombre */}
                              <td className="py-3 px-3">
                                <p className="font-medium text-gray-900 text-xs">{f.material_nombre}</p>
                                <p className="text-gray-400 text-xs">{f.material_codigo}</p>
                              </td>
                              {/* Cantidad */}
                              <td className="py-3 px-3 text-center text-xs text-gray-700">{f.cantidad}</td>
                              {/* Precio CIF */}
                              <td className="py-3 px-3">
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  className="h-7 text-xs text-right w-28"
                                  value={f.precio_unitario_cif || ""}
                                  placeholder="0.00"
                                  onChange={(e) =>
                                    actualizarFila(f.material_id, "precio_unitario_cif", parseFloat(e.target.value) || 0)
                                  }
                                />
                              </td>
                              {/* Δ% extra — edición en % O en precio directo */}
                              <td className="py-3 px-3">
                                <div className="flex flex-col gap-1 items-end">
                                  <div className="flex items-center gap-1">
                                    <Input
                                      type="number"
                                      step="0.1"
                                      className="h-7 text-xs text-right w-20"
                                      value={parseFloat(f.porciento_extra.toFixed(2))}
                                      onChange={(e) =>
                                        actualizarFila(f.material_id, "porciento_extra", parseFloat(e.target.value) || 0)
                                      }
                                    />
                                    <span className="text-xs text-gray-400">%</span>
                                  </div>
                                  <p className="text-xs text-gray-400">
                                    Total: {fmt(pctVentaTotal, 1)}%V / {fmt(pctInstTotal, 1)}%I
                                  </p>
                                </div>
                              </td>
                              {/* Precio venta nuevo */}
                              <td className="py-3 px-3">
                                <div className="flex flex-col items-end gap-1">
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    className="h-7 text-xs text-right w-28"
                                    value={parseFloat(f.precio_venta_nuevo.toFixed(4)) || ""}
                                    placeholder="0.00"
                                    onChange={(e) =>
                                      actualizarPrecioVentaDirecto(f.material_id, parseFloat(e.target.value) || 0)
                                    }
                                  />
                                  {f.precio_catalogo > 0 && (
                                    <p className="text-xs text-gray-400">
                                      Actual: ${fmt(f.precio_catalogo)}
                                      <span className={`ml-1 ${f.precio_venta_nuevo > f.precio_catalogo ? "text-green-600" : "text-red-500"}`}>
                                        ({f.precio_catalogo > 0 ? fmtPct(((f.precio_venta_nuevo - f.precio_catalogo) / f.precio_catalogo) * 100) : "—"})
                                      </span>
                                    </p>
                                  )}
                                </div>
                              </td>
                              {/* Precio instaladora nuevo */}
                              <td className="py-3 px-3">
                                <div className="flex flex-col items-end gap-1">
                                  <p className="text-xs font-medium text-gray-900">${fmt(f.precio_instaladora_nuevo)}</p>
                                  {f.precio_instaladora_catalogo > 0 && (
                                    <p className="text-xs text-gray-400">
                                      Actual: ${fmt(f.precio_instaladora_catalogo)}
                                    </p>
                                  )}
                                </div>
                              </td>
                              {/* % rebajable venta */}
                              <td className="py-3 px-3">
                                <div className="flex flex-col items-end gap-1">
                                  <div className="flex items-center gap-1">
                                    <Input
                                      type="number"
                                      min="0"
                                      max="100"
                                      step="0.5"
                                      className={`h-7 text-xs text-right w-16 ${f.errorValidacion ? "border-red-400 focus:border-red-500" : ""}`}
                                      value={f.porciento_rebajable_venta}
                                      onChange={(e) =>
                                        actualizarFila(f.material_id, "porciento_rebajable_venta", parseFloat(e.target.value) || 0)
                                      }
                                    />
                                    <span className="text-xs text-gray-400">%</span>
                                  </div>
                                  {f.precio_venta_nuevo > 0 && f.porciento_rebajable_venta > 0 && (
                                    <p className="text-xs text-gray-400">
                                      Min: ${fmt(f.precio_venta_nuevo * (1 - f.porciento_rebajable_venta / 100))}
                                    </p>
                                  )}
                                </div>
                              </td>
                              {/* Stock */}
                              <td className="py-3 px-3 text-center">
                                <p className="text-xs text-gray-700">{fmt(f.stock_actual, 0)}</p>
                                <p className="text-xs text-gray-400">en almacenes</p>
                              </td>
                              {/* Acciones */}
                              <td className="py-3 px-3 text-center">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-7 px-2 text-xs"
                                  disabled={f.precio_unitario_cif <= 0 || f.precio_catalogo <= 0}
                                  title="Calcular precio promedio ponderado con stock actual"
                                  onClick={() => prorratearProducto(f.material_id)}
                                >
                                  <RefreshCw className="h-3 w-3 mr-1" />
                                  Prorratear
                                </Button>
                              </td>
                            </tr>
                            {f.errorValidacion && (
                              <tr className="bg-red-50 border-b border-red-100">
                                <td colSpan={9} className="px-3 py-1.5">
                                  <p className="text-xs text-red-600 flex items-center gap-1">
                                    <span className="font-semibold">⚠</span> {f.errorValidacion}
                                  </p>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {filas.length === 0 && (
                  <div className="text-center py-10 text-gray-400 text-sm">No hay materiales en este envío.</div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Resumen final */}
        {filas.length > 0 && (
          <Card className="border-l-4 border-l-cyan-600">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Valor total mercancías</p>
                  <p className="font-bold">${fmt(totalValorMercancias)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Total costos importación (USD+EUR)</p>
                  <p className="font-bold">${fmt(totalCostosUsd)}</p>
                </div>
                <div>
                  <p className="text-gray-500">% envío sugerido</p>
                  <p className="font-bold text-cyan-700">{fmt(porcientoEnvioSugerido)}%</p>
                </div>
                <div>
                  <p className="text-gray-500">Desviación actual</p>
                  <p className={`font-bold ${Math.abs(deltaGlobal) < 0.01 ? "text-green-600" : deltaGlobal > 0 ? "text-blue-600" : "text-red-600"}`}>
                    {fmtPct(deltaGlobal)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      <Toaster />
    </div>
  );
}

