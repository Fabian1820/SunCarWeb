"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Info,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";
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
} from "@/lib/types/feats/envios-contenedores/envio-contenedor-types";
import {
  COSTOS_SUGERIDOS,
  MONEDAS_COSTO,
  TIPO_ENVIO_LABELS,
} from "@/lib/types/feats/envios-contenedores/envio-contenedor-types";

// ─── helpers ────────────────────────────────────────────────────────────────

const fmt = (n: number, decimals = 2) =>
  n.toLocaleString("es-ES", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

const fmtPct = (n: number) => `${n >= 0 ? "+" : ""}${fmt(n)}%`;

// ─── tipos internos ──────────────────────────────────────────────────────────

interface FilaMaterial {
  material_id: string;
  material_codigo: string;
  material_nombre: string;
  cantidad: number;
  // Precios actuales del catálogo (referencia no editable)
  precio_catalogo: number;
  precio_instaladora_catalogo: number;
  costo_actual: number;
  porciento_rebajable_venta_actual: number;
  stock_actual: number;
  // Campos editables de la ficha
  precio_unitario_cif: number;
  porciento_extra: number;
  porciento_rebajable_venta: number;
  // Calculados (nuevo costo es editable; precios son derivados)
  costo_nuevo: number;
  precio_venta_nuevo: number;
  precio_instaladora_nuevo: number;
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
  const [costosCollapsed, setCostosCollapsed] = useState(false);

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
      const envioData = await EnvioContenedorService.getEnvioById(envioId);

      if (!envioData) {
        toast({ title: "Error", description: "Envío no encontrado.", variant: "destructive" });
        router.push("/envio-contenedores");
        return;
      }

      setEnvio(envioData);
      setCostos(envioData.costos ?? []);
      setPorcientoInstaladora(envioData.porciento_instaladora ?? 0);
      setPorcientoVentas(envioData.porciento_ventas ?? 0);

      // Obtener stock + precios actuales del catálogo en una sola llamada optimizada
      const materialIds = envioData.materiales.map((m) => m.material_id).filter(Boolean);
      const datosBulk = await EnvioContenedorService.getMaterialesDatosBulk(materialIds);

      const sm: Record<string, number> = {};
      for (const [mid, datos] of Object.entries(datosBulk)) {
        sm[mid] = datos.stock_total;
      }
      setStockMap(sm);

      const filasInit: FilaMaterial[] = envioData.materiales.map((m) => {
        const datos = datosBulk[m.material_id] ?? { precio: 0, precio_instaladora: 0, costo: 0, stock_total: 0 };
        const cifUnit = m.precio_unitario_cif ?? 0;
        const pctExtra = m.porciento_extra ?? 0;
        // costo_nuevo inicial: CIF × (1 + Δ/100); el % de envío se recalculará vía recalcularTodo
        const costoNuevoInicial = m.costo_calc ?? (cifUnit > 0 ? cifUnit * (1 + pctExtra / 100) : 0);
        return {
          material_id: m.material_id,
          material_codigo: m.material_codigo,
          material_nombre: m.material_nombre,
          cantidad: m.cantidad,
          precio_catalogo: datos.precio,
          precio_instaladora_catalogo: datos.precio_instaladora,
          costo_actual: datos.costo,
          porciento_rebajable_venta_actual: m.porciento_rebajable_venta ?? 0,
          stock_actual: datos.stock_total,
          precio_unitario_cif: cifUnit,
          porciento_extra: pctExtra,
          porciento_rebajable_venta: m.porciento_rebajable_venta ?? 0,
          costo_nuevo: costoNuevoInicial,
          precio_venta_nuevo: m.precio_venta_calc ?? 0,
          precio_instaladora_nuevo: m.precio_instaladora_calc ?? 0,
          errorValidacion: null,
        };
      });
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
      return acc;
    }, 0);
  }, [costos, tasaEurUsd]);

  const costosTotalesMLC = useMemo(
    () => costos.filter((c) => c.moneda === "MLC").reduce((a, c) => a + c.monto, 0),
    [costos],
  );
  const costosTotalesCUP = useMemo(
    () => costos.filter((c) => c.moneda === "CUP").reduce((a, c) => a + c.monto, 0),
    [costos],
  );

  const totalValorMercancias = useMemo(
    () => filas.reduce((acc, f) => acc + f.precio_unitario_cif * f.cantidad, 0),
    [filas],
  );

  const porcientoEnvioSugerido = useMemo(
    () => (totalValorMercancias > 0 ? (totalCostosUsd / totalValorMercancias) * 100 : 0),
    [totalCostosUsd, totalValorMercancias],
  );

  const calcularPrecios = useCallback(
    (
      filasActuales: FilaMaterial[],
      pctEnvio: number,
      pctVentas: number,
      pctInstaladora: number,
    ): FilaMaterial[] => {
      return filasActuales.map((f) => {
        // Nuevo costo = CIF × (1 + (%Envío + Δ) / 100)
        const costoNuevo = f.precio_unitario_cif * (1 + (pctEnvio + f.porciento_extra) / 100);
        // Precios derivados del costo
        const pvNuevo = costoNuevo * (1 + pctVentas / 100);
        const piNuevo = costoNuevo * (1 + pctInstaladora / 100);

        let errorValidacion: string | null = null;
        if (f.porciento_rebajable_venta > 0 && pvNuevo > 0 && piNuevo > 0) {
          const precioVentaMinimo = pvNuevo * (1 - f.porciento_rebajable_venta / 100);
          if (precioVentaMinimo <= piNuevo) {
            errorValidacion = `Con ${f.porciento_rebajable_venta}% de descuento el precio venta mínimo ($${fmt(precioVentaMinimo)}) quedaría ≤ precio instaladora ($${fmt(piNuevo)})`;
          }
        }

        return { ...f, costo_nuevo: costoNuevo, precio_venta_nuevo: pvNuevo, precio_instaladora_nuevo: piNuevo, errorValidacion };
      });
    },
    [],
  );

  const deltaGlobal = useMemo(() => {
    const totalPeso = filas.reduce((acc, f) => acc + f.precio_unitario_cif * f.cantidad, 0);
    if (totalPeso === 0) return 0;
    return (
      filas.reduce((acc, f) => acc + f.porciento_extra * f.precio_unitario_cif * f.cantidad, 0) /
      totalPeso
    );
  }, [filas]);

  const hayErroresValidacion = useMemo(() => filas.some((f) => f.errorValidacion !== null), [filas]);

  // ─── handlers costos ─────────────────────────────────────────────────────

  const agregarCosto = () => {
    const monto = parseFloat(nuevoCostoMonto.replace(",", "."));
    if (!nuevoCostoDesc.trim() || isNaN(monto) || monto < 0) {
      toast({
        title: "Error",
        description: "Completa descripción y monto válido.",
        variant: "destructive",
      });
      return;
    }
    setCostos((prev) => [
      ...prev,
      { descripcion: nuevoCostoDesc.trim(), monto, moneda: nuevoCostoMoneda },
    ]);
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
      const updated = prev.map((f) =>
        f.material_id === material_id ? { ...f, [campo]: valor } : f,
      );
      return calcularPrecios(updated, porcientoEnvioSugerido, porcientoVentas, porcientoInstaladora);
    });
  };

  const actualizarCostoNuevoDirecto = (material_id: string, costoNuevo: number) => {
    setFilas((prev) => {
      const updated = prev.map((f) => {
        if (f.material_id !== material_id) return f;
        if (f.precio_unitario_cif <= 0) return f;
        const pctTotal = (costoNuevo / f.precio_unitario_cif - 1) * 100;
        return { ...f, porciento_extra: pctTotal - porcientoEnvioSugerido };
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
        if (totalStock <= 0 || f.precio_unitario_cif <= 0 || f.costo_nuevo <= 0) return f;
        // Promedio ponderado del costo actual en catálogo y el nuevo costo de este envío
        const costoNuevoPromedio =
          (f.costo_actual * f.stock_actual + f.costo_nuevo * f.cantidad) / totalStock;
        const pctTotal = (costoNuevoPromedio / f.precio_unitario_cif - 1) * 100;
        return { ...f, porciento_extra: pctTotal - porcientoEnvioSugerido };
      });
      return calcularPrecios(updated, porcientoEnvioSugerido, porcientoVentas, porcientoInstaladora);
    });
  };

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
      await EnvioContenedorService.updateEnvio(envioId, {
        costos,
        porciento_instaladora: porcientoInstaladora,
        porciento_ventas: porcientoVentas,
      });

      const payload: AplicarPreciosMaterialPayload[] = filas.map((f) => ({
        material_id: f.material_id,
        precio_unitario_cif: f.precio_unitario_cif,
        porciento_extra: f.porciento_extra,
        costo_calc: f.costo_nuevo > 0 ? f.costo_nuevo : undefined,
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

  const deltaColor =
    Math.abs(deltaGlobal) < 0.01
      ? "text-emerald-600"
      : deltaGlobal > 0
        ? "text-blue-600"
        : "text-red-600";

  const deltaBorder =
    Math.abs(deltaGlobal) < 0.01
      ? "border-emerald-400"
      : deltaGlobal > 0
        ? "border-blue-400"
        : "border-red-400";

  const deltaBg =
    Math.abs(deltaGlobal) < 0.01
      ? "bg-emerald-50"
      : deltaGlobal > 0
        ? "bg-blue-50"
        : "bg-red-50";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ══════════════════════════════════════════════════════
          HEADER FIJO
      ══════════════════════════════════════════════════════ */}
      <header className="fixed top-0 inset-x-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Izquierda: navegación + título */}
            <div className="flex items-center gap-3 min-w-0">
              <Link href="/envio-contenedores">
                <Button variant="ghost" size="sm" className="gap-1.5 shrink-0 text-gray-600 hover:text-gray-900">
                  <ArrowLeft className="h-4 w-4" />
                  Volver
                </Button>
              </Link>
              <div className="h-5 w-px bg-gray-200 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-gray-400 leading-none mb-0.5">Ficha de Costo</p>
                <h1 className="text-sm font-semibold text-gray-900 truncate max-w-xs lg:max-w-md">
                  {envio.nombre}
                </h1>
              </div>
              <div className="hidden sm:flex items-center gap-2 shrink-0">
                {envio.tipo_envio && (
                  <Badge className="bg-cyan-100 text-cyan-800 border-cyan-200 border text-xs font-medium">
                    {TIPO_ENVIO_LABELS[envio.tipo_envio]}
                  </Badge>
                )}
                <Badge
                  className={
                    envio.pagado
                      ? "bg-emerald-100 text-emerald-800 border-emerald-200 border text-xs font-medium"
                      : "bg-amber-100 text-amber-800 border-amber-200 border text-xs font-medium"
                  }
                >
                  {envio.pagado ? "Pagado" : "Pendiente"}
                </Badge>
                {hayErroresValidacion && (
                  <Badge className="bg-red-100 text-red-700 border-red-200 border text-xs font-medium gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {filas.filter((f) => f.errorValidacion).length} errores
                  </Badge>
                )}
              </div>
            </div>

            {/* Derecha: acciones */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={aplicarSugerencia}
                className="gap-1.5 text-gray-700 hidden md:flex"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Aplicar sugerencia
              </Button>
              <Button
                size="sm"
                onClick={guardarFicha}
                disabled={saving || hayErroresValidacion}
                className="gap-1.5 bg-cyan-600 hover:bg-cyan-700 text-white"
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">Guardar y aplicar precios</span>
                <span className="sm:hidden">Guardar</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════
          CONTENIDO PRINCIPAL
      ══════════════════════════════════════════════════════ */}
      <main className="pt-14 max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── KPI Strip ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 py-4">
          {/* Desviación global */}
          <div className={`rounded-lg border-l-4 ${deltaBorder} ${deltaBg} px-4 py-3`}>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Desviación global (Δ)</p>
            <p className={`text-2xl font-bold ${deltaColor}`}>{fmtPct(deltaGlobal)}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {Math.abs(deltaGlobal) < 0.01
                ? "En punto exacto"
                : deltaGlobal > 0
                  ? "Por encima del sugerido"
                  : "Por debajo del sugerido"}
            </p>
          </div>

          {/* Total costos */}
          <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Total costos</p>
            <p className="text-xl font-bold text-gray-900">${fmt(totalCostosUsd)}</p>
            <div className="flex gap-2 mt-0.5">
              {costosTotalesMLC > 0 && (
                <span className="text-xs text-amber-600">{fmt(costosTotalesMLC)} MLC</span>
              )}
              {costosTotalesCUP > 0 && (
                <span className="text-xs text-amber-600">{fmt(costosTotalesCUP)} CUP</span>
              )}
              {costosTotalesMLC === 0 && costosTotalesCUP === 0 && (
                <span className="text-xs text-gray-400">Solo USD/EUR</span>
              )}
            </div>
          </div>

          {/* Valor mercancías */}
          <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Valor mercancías</p>
            <p className="text-xl font-bold text-gray-900">${fmt(totalValorMercancias)}</p>
            <p className="text-xs text-gray-400 mt-0.5">{filas.length} producto{filas.length !== 1 ? "s" : ""}</p>
          </div>

          {/* % Envío sugerido */}
          <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">% Envío sugerido</p>
            <p className="text-xl font-bold text-cyan-700">{fmt(porcientoEnvioSugerido)}%</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Ventas {porcientoVentas}% · Instaladora {porcientoInstaladora}%
            </p>
          </div>
        </div>

        {/* ── Paneles de configuración ───────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">

          {/* Panel costos de importación */}
          <Card className="border border-gray-200 shadow-none">
            <CardHeader className="pb-0 pt-4 px-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm font-semibold text-gray-800">
                    Costos de importación
                  </CardTitle>
                  <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                    {costos.length} ítem{costos.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {envio.tipo_envio && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={sugerirCostos}
                      className="h-7 text-xs gap-1 text-cyan-700 border-cyan-200 hover:bg-cyan-50"
                    >
                      <Plus className="h-3 w-3" />
                      Sugerir
                    </Button>
                  )}
                  <button
                    onClick={() => setCostosCollapsed((v) => !v)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {costosCollapsed ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronUp className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </CardHeader>

            {!costosCollapsed && (
              <CardContent className="px-4 pt-3 pb-4 space-y-3">
                {/* Tasa EUR/USD */}
                <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-md">
                  <Info className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  <span className="text-xs text-amber-700 font-medium">Tasa EUR → USD:</span>
                  <span className="text-xs text-amber-600">1 EUR =</span>
                  <Input
                    type="number"
                    className="h-6 w-20 text-xs px-1.5 border-amber-300 bg-white"
                    value={tasaEurUsd}
                    onChange={(e) => setTasaEurUsd(parseFloat(e.target.value) || 1)}
                    step="0.01"
                    min="0.01"
                  />
                  <span className="text-xs text-amber-600">USD</span>
                </div>

                {/* Lista de costos */}
                {costos.length > 0 && (
                  <div className="border border-gray-100 rounded-md overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          <th className="text-left py-2 px-3 font-medium text-gray-500">Descripción</th>
                          <th className="text-right py-2 px-3 font-medium text-gray-500 w-28">Monto</th>
                          <th className="text-center py-2 px-3 font-medium text-gray-500 w-16">Mon.</th>
                          <th className="w-8" />
                        </tr>
                      </thead>
                      <tbody>
                        {costos.map((c, idx) => (
                          <tr key={idx} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                            <td className="py-1.5 px-3 text-gray-700">{c.descripcion}</td>
                            <td className="py-1.5 px-3">
                              <Input
                                type="number"
                                className="h-6 text-xs text-right w-full px-1.5"
                                value={c.monto}
                                onChange={(e) =>
                                  setCostos((prev) =>
                                    prev.map((item, i) =>
                                      i === idx
                                        ? { ...item, monto: parseFloat(e.target.value) || 0 }
                                        : item,
                                    ),
                                  )
                                }
                                min="0"
                                step="0.01"
                              />
                            </td>
                            <td className="py-1.5 px-3">
                              <Select
                                value={c.moneda}
                                onValueChange={(val) =>
                                  setCostos((prev) =>
                                    prev.map((item, i) =>
                                      i === idx ? { ...item, moneda: val as MonedaCosto } : item,
                                    ),
                                  )
                                }
                              >
                                <SelectTrigger className="h-6 text-xs w-16 px-1.5">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {MONEDAS_COSTO.map((m) => (
                                    <SelectItem key={m} value={m} className="text-xs">
                                      {m}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="py-1.5 px-2">
                              <button
                                onClick={() => eliminarCosto(idx)}
                                className="text-gray-300 hover:text-red-500 transition-colors"
                                title="Eliminar costo"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Agregar costo */}
                <div className="flex gap-2 items-center">
                  <Input
                    placeholder="Descripción del costo"
                    className="h-8 text-xs flex-1"
                    value={nuevoCostoDesc}
                    onChange={(e) => setNuevoCostoDesc(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && agregarCosto()}
                  />
                  <Input
                    type="number"
                    placeholder="Monto"
                    className="h-8 text-xs w-28"
                    value={nuevoCostoMonto}
                    onChange={(e) => setNuevoCostoMonto(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && agregarCosto()}
                    min="0"
                  />
                  <Select
                    value={nuevoCostoMoneda}
                    onValueChange={(val) => setNuevoCostoMoneda(val as MonedaCosto)}
                  >
                    <SelectTrigger className="h-8 text-xs w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONEDAS_COSTO.map((m) => (
                        <SelectItem key={m} value={m} className="text-xs">
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 px-3 bg-cyan-600 hover:bg-cyan-700 text-white shrink-0"
                    onClick={agregarCosto}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Panel porcentajes de margen */}
          <Card className="border border-gray-200 shadow-none">
            <CardHeader className="pb-0 pt-4 px-4">
              <CardTitle className="text-sm font-semibold text-gray-800">
                Porcentajes de margen
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pt-3 pb-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* % Ventas */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-600">% Margen Ventas</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      className="h-9 flex-1"
                      value={porcientoVentas}
                      onChange={(e) => setPorcientoVentas(parseFloat(e.target.value) || 0)}
                    />
                    <span className="text-sm font-medium text-gray-500 w-4">%</span>
                  </div>
                  <p className="text-xs text-gray-400 leading-tight">
                    Costo = CIF × (1 + (
                    <span className="text-cyan-600 font-medium">{fmt(porcientoEnvioSugerido, 1)}</span>
                    {" + Δ) / 100)"}
                    <br />
                    P. ventas = Costo × (1 + <span className="font-medium">{porcientoVentas}</span>%)
                  </p>
                </div>

                {/* % Instaladora */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-600">% Margen Instaladora</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      className="h-9 flex-1"
                      value={porcientoInstaladora}
                      onChange={(e) => setPorcientoInstaladora(parseFloat(e.target.value) || 0)}
                    />
                    <span className="text-sm font-medium text-gray-500 w-4">%</span>
                  </div>
                  <p className="text-xs text-gray-400 leading-tight">
                    Costo = CIF × (1 + (
                    <span className="text-cyan-600 font-medium">{fmt(porcientoEnvioSugerido, 1)}</span>
                    {" + Δ) / 100)"}
                    <br />
                    P. install. = Costo × (1 + <span className="font-medium">{porcientoInstaladora}</span>%)
                  </p>
                </div>
              </div>

              {/* Resumen de porcentajes */}
              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="text-center p-2 rounded-md bg-cyan-50 border border-cyan-100">
                  <p className="text-xs text-cyan-600 font-medium">% Envío</p>
                  <p className="text-sm font-bold text-cyan-700">{fmt(porcientoEnvioSugerido)}%</p>
                  <p className="text-xs text-cyan-500">automático</p>
                </div>
                <div className="text-center p-2 rounded-md bg-gray-50 border border-gray-100">
                  <p className="text-xs text-gray-500 font-medium">% Ventas</p>
                  <p className="text-sm font-bold text-gray-700">{porcientoVentas}%</p>
                  <p className="text-xs text-gray-400">manual</p>
                </div>
                <div className="text-center p-2 rounded-md bg-gray-50 border border-gray-100">
                  <p className="text-xs text-gray-500 font-medium">% Install.</p>
                  <p className="text-sm font-bold text-gray-700">{porcientoInstaladora}%</p>
                  <p className="text-xs text-gray-400">manual</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ══════════════════════════════════════════════════════
            TABLA DE PRODUCTOS — ANCHO COMPLETO
        ══════════════════════════════════════════════════════ */}
        <Card className="border border-gray-200 shadow-none mb-6">
          <CardHeader className="pb-0 pt-4 px-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CardTitle className="text-sm font-semibold text-gray-800">
                  Productos del envío
                </CardTitle>
                <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                  {filas.length} producto{filas.length !== 1 ? "s" : ""}
                </span>
                {hayErroresValidacion && (
                  <span className="text-xs text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Hay errores de validación
                  </span>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={aplicarSugerencia}
                className="md:hidden h-7 gap-1.5 text-xs"
              >
                <RefreshCw className="h-3 w-3" />
                Sugerencia
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-0 mt-3">
            {filas.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <p className="text-sm">No hay materiales en este envío.</p>
              </div>
            ) : (
              <div className="w-full overflow-x-auto">
                <table className="w-full text-sm border-collapse" style={{ minWidth: "1260px" }}>
                  {/* ── Cabecera doble con grupos ─────────────────────────────── */}
                  <thead>
                    {/* Fila 1: grupos */}
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th rowSpan={2} className="text-left py-2 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wide border-b border-gray-200 w-[16%]">
                        Material
                      </th>
                      <th rowSpan={2} className="text-center py-2 px-2 font-semibold text-gray-600 text-xs uppercase tracking-wide border-b border-gray-200 w-[4%]">
                        Cant.
                      </th>
                      <th rowSpan={2} className="text-center py-2 px-2 font-semibold text-gray-600 text-xs uppercase tracking-wide border-b border-gray-200 w-[8%]">
                        CIF (USD)
                      </th>
                      <th rowSpan={2} className="text-center py-2 px-2 font-semibold text-gray-600 text-xs uppercase tracking-wide border-b border-gray-200 w-[7%]">
                        Δ% Extra
                      </th>
                      {/* Grupo actuales */}
                      <th colSpan={4} className="text-center py-2 px-2 font-semibold text-gray-500 text-xs uppercase tracking-wide bg-slate-50 border-l border-r border-slate-200">
                        Actuales (catálogo)
                      </th>
                      {/* Grupo nuevos */}
                      <th colSpan={3} className="text-center py-2 px-2 font-semibold text-cyan-700 text-xs uppercase tracking-wide bg-cyan-50 border-l border-r border-cyan-200">
                        Nuevos
                      </th>
                      <th rowSpan={2} className="text-center py-2 px-2 font-semibold text-gray-600 text-xs uppercase tracking-wide border-b border-gray-200 w-[7%]">
                        % Reb.
                      </th>
                      <th rowSpan={2} className="text-center py-2 px-2 font-semibold text-gray-600 text-xs uppercase tracking-wide border-b border-gray-200 w-[8%]">
                        Acción
                      </th>
                    </tr>
                    {/* Fila 2: sub-columnas de los grupos */}
                    <tr className="border-b border-gray-200">
                      {/* Sub-cols actuales */}
                      <th className="text-center py-1.5 px-2 font-medium text-gray-500 text-xs bg-slate-50 border-l border-slate-200 w-[7%]">
                        Stock
                      </th>
                      <th className="text-center py-1.5 px-2 font-medium text-gray-500 text-xs bg-slate-50 w-[8%]">
                        P. Venta
                      </th>
                      <th className="text-center py-1.5 px-2 font-medium text-gray-500 text-xs bg-slate-50 w-[8%]">
                        P. Inst.
                      </th>
                      <th className="text-center py-1.5 px-2 font-medium text-gray-500 text-xs bg-slate-50 border-r border-slate-200 w-[7%]">
                        Costo
                      </th>
                      {/* Sub-cols nuevos */}
                      <th className="text-center py-1.5 px-2 font-medium text-amber-600 text-xs bg-cyan-50 border-l border-cyan-200 w-[9%]">
                        Costo
                      </th>
                      <th className="text-center py-1.5 px-2 font-medium text-cyan-600 text-xs bg-cyan-50 w-[9%]">
                        P. Venta
                      </th>
                      <th className="text-center py-1.5 px-2 font-medium text-cyan-600 text-xs bg-cyan-50 border-r border-cyan-200 w-[8%]">
                        P. Inst.
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filas.map((f, idx) => {
                      const pctVentaTotal = porcientoEnvioSugerido + porcientoVentas + f.porciento_extra;
                      const pctInstTotal = porcientoEnvioSugerido + porcientoInstaladora + f.porciento_extra;
                      const hasError = !!f.errorValidacion;

                      const pctCambioVenta =
                        f.precio_catalogo > 0
                          ? ((f.precio_venta_nuevo - f.precio_catalogo) / f.precio_catalogo) * 100
                          : null;
                      const pctCambioInst =
                        f.precio_instaladora_catalogo > 0
                          ? ((f.precio_instaladora_nuevo - f.precio_instaladora_catalogo) / f.precio_instaladora_catalogo) * 100
                          : null;

                      return (
                        <Fragment key={f.material_id}>
                          <tr
                            className={`border-b border-gray-100 transition-colors ${
                              hasError
                                ? "bg-red-50 hover:bg-red-50"
                                : idx % 2 === 0
                                  ? "bg-white hover:bg-gray-50"
                                  : "bg-gray-50/40 hover:bg-gray-50"
                            }`}
                          >
                            {/* Material */}
                            <td className="py-2.5 px-4">
                              <p className="font-semibold text-gray-900 text-sm leading-tight">
                                {f.material_nombre}
                              </p>
                              <p className="text-xs text-gray-400 mt-0.5 font-mono">{f.material_codigo}</p>
                            </td>

                            {/* Cantidad */}
                            <td className="py-2.5 px-2 text-center">
                              <span className="text-sm font-medium text-gray-700">{f.cantidad}</span>
                            </td>

                            {/* Precio CIF */}
                            <td className="py-2.5 px-2">
                              <div className="flex items-center justify-center gap-1">
                                <span className="text-xs text-gray-400">$</span>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  className="h-7 text-xs text-right w-full font-medium"
                                  value={f.precio_unitario_cif || ""}
                                  placeholder="0.00"
                                  onChange={(e) =>
                                    actualizarFila(f.material_id, "precio_unitario_cif", parseFloat(e.target.value) || 0)
                                  }
                                />
                              </div>
                            </td>

                            {/* Δ% extra */}
                            <td className="py-2.5 px-2">
                              <div className="flex flex-col items-center gap-0.5">
                                <div className="flex items-center gap-1">
                                  <Input
                                    type="number"
                                    step="0.1"
                                    className={`h-7 text-xs text-right w-16 font-medium ${
                                      f.porciento_extra > 0
                                        ? "text-blue-700 border-blue-200"
                                        : f.porciento_extra < 0
                                          ? "text-red-600 border-red-200"
                                          : ""
                                    }`}
                                    value={parseFloat(f.porciento_extra.toFixed(2))}
                                    onChange={(e) =>
                                      actualizarFila(f.material_id, "porciento_extra", parseFloat(e.target.value) || 0)
                                    }
                                  />
                                  <span className="text-xs text-gray-400">%</span>
                                </div>
                                <p className="text-xs text-gray-400 whitespace-nowrap">
                                  {fmt(pctVentaTotal, 1)}%V · {fmt(pctInstTotal, 1)}%I
                                </p>
                              </div>
                            </td>

                            {/* ── Actuales (catálogo) ─────────────────────── */}
                            {/* Stock actual */}
                            <td className="py-2.5 px-2 text-center bg-slate-50/60 border-l border-slate-100">
                              <p className="text-sm font-semibold text-gray-700">{fmt(f.stock_actual, 0)}</p>
                              <p className="text-xs text-gray-400">uds.</p>
                            </td>

                            {/* Precio venta actual */}
                            <td className="py-2.5 px-2 text-center bg-slate-50/60">
                              {f.precio_catalogo > 0 ? (
                                <p className="text-sm font-semibold text-gray-700">${fmt(f.precio_catalogo)}</p>
                              ) : (
                                <p className="text-xs text-gray-300">—</p>
                              )}
                            </td>

                            {/* Precio instaladora actual */}
                            <td className="py-2.5 px-2 text-center bg-slate-50/60">
                              {f.precio_instaladora_catalogo > 0 ? (
                                <p className="text-sm font-semibold text-gray-700">${fmt(f.precio_instaladora_catalogo)}</p>
                              ) : (
                                <p className="text-xs text-gray-300">—</p>
                              )}
                            </td>

                            {/* Costo actual */}
                            <td className="py-2.5 px-2 text-center bg-slate-50/60 border-r border-slate-100">
                              {f.costo_actual > 0 ? (
                                <p className="text-sm font-semibold text-amber-700">${fmt(f.costo_actual)}</p>
                              ) : (
                                <p className="text-xs text-gray-300">—</p>
                              )}
                            </td>

                            {/* ── Nuevos ─────────────────────────────────── */}
                            {/* Nuevo Costo (editable) */}
                            <td className="py-2.5 px-2 bg-cyan-50/40 border-l border-cyan-100">
                              <div className="flex flex-col items-center gap-0.5">
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-gray-400">$</span>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    className="h-7 text-xs text-right w-20 font-semibold text-amber-700 border-amber-200"
                                    value={parseFloat(f.costo_nuevo.toFixed(4)) || ""}
                                    placeholder="0.00"
                                    onChange={(e) =>
                                      actualizarCostoNuevoDirecto(f.material_id, parseFloat(e.target.value) || 0)
                                    }
                                  />
                                </div>
                                {f.costo_actual > 0 && f.costo_nuevo > 0 && (
                                  <span
                                    className={`text-xs font-medium ${
                                      f.costo_nuevo >= f.costo_actual ? "text-emerald-600" : "text-red-500"
                                    }`}
                                  >
                                    {fmtPct(((f.costo_nuevo - f.costo_actual) / f.costo_actual) * 100)}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Precio venta nuevo (solo lectura) */}
                            <td className="py-2.5 px-2 text-center bg-cyan-50/40">
                              {f.precio_venta_nuevo > 0 ? (
                                <>
                                  <p className={`text-sm font-semibold ${hasError ? "text-red-700" : "text-cyan-900"}`}>
                                    ${fmt(f.precio_venta_nuevo)}
                                  </p>
                                  {pctCambioVenta !== null && (
                                    <span
                                      className={`text-xs font-medium ${
                                        pctCambioVenta >= 0 ? "text-emerald-600" : "text-red-500"
                                      }`}
                                    >
                                      {fmtPct(pctCambioVenta)}
                                    </span>
                                  )}
                                </>
                              ) : (
                                <p className="text-xs text-gray-300">—</p>
                              )}
                            </td>

                            {/* Precio instaladora nuevo (solo lectura) */}
                            <td className="py-2.5 px-2 text-center bg-cyan-50/40 border-r border-cyan-100">
                              {f.precio_instaladora_nuevo > 0 ? (
                                <>
                                  <p className="text-sm font-semibold text-cyan-900">
                                    ${fmt(f.precio_instaladora_nuevo)}
                                  </p>
                                  {pctCambioInst !== null && (
                                    <span
                                      className={`text-xs font-medium ${
                                        pctCambioInst >= 0 ? "text-emerald-600" : "text-red-500"
                                      }`}
                                    >
                                      {fmtPct(pctCambioInst)}
                                    </span>
                                  )}
                                </>
                              ) : (
                                <p className="text-xs text-gray-300">—</p>
                              )}
                            </td>

                            {/* % Rebajable */}
                            <td className="py-2.5 px-2">
                              <div className="flex flex-col items-center gap-0.5">
                                <div className="flex items-center gap-1">
                                  <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.5"
                                    className={`h-7 text-xs text-right w-14 ${hasError ? "border-red-400" : ""}`}
                                    value={f.porciento_rebajable_venta}
                                    onChange={(e) =>
                                      actualizarFila(f.material_id, "porciento_rebajable_venta", parseFloat(e.target.value) || 0)
                                    }
                                  />
                                  <span className="text-xs text-gray-400">%</span>
                                </div>
                                {f.precio_venta_nuevo > 0 && f.porciento_rebajable_venta > 0 && (
                                  <p className="text-xs text-gray-400 whitespace-nowrap">
                                    Mín: ${fmt(f.precio_venta_nuevo * (1 - f.porciento_rebajable_venta / 100))}
                                  </p>
                                )}
                              </div>
                            </td>

                            {/* Acción */}
                            <td className="py-2.5 px-2 text-center">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 px-2 text-xs gap-1 text-gray-600 hover:text-cyan-700 hover:border-cyan-300"
                                disabled={f.precio_unitario_cif <= 0 || f.costo_actual <= 0 || f.costo_nuevo <= 0}
                                title="Calcular costo promedio ponderado con stock actual"
                                onClick={() => prorratearProducto(f.material_id)}
                              >
                                <RefreshCw className="h-3 w-3" />
                                Prorratear
                              </Button>
                            </td>
                          </tr>

                          {/* Fila de error */}
                          {hasError && (
                            <tr className="bg-red-50 border-b border-red-100">
                              <td colSpan={13} className="px-4 py-2">
                                <div className="flex items-start gap-2">
                                  <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
                                  <p className="text-xs text-red-600">{f.errorValidacion}</p>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>

                  {/* Totales */}
                  <tfoot>
                    <tr className="bg-gray-50 border-t-2 border-gray-200">
                      <td className="py-3 px-4">
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Totales</p>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className="text-sm font-bold text-gray-700">
                          {filas.reduce((s, f) => s + f.cantidad, 0)}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className="text-sm font-bold text-gray-700">${fmt(totalValorMercancias)}</span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className={`text-sm font-bold ${deltaColor}`}>{fmtPct(deltaGlobal)}</span>
                      </td>
                      {/* actuales: stock + 3 precios */}
                      <td className="py-3 px-2 text-center bg-slate-50/60 border-l border-slate-100">
                        <span className="text-sm font-bold text-gray-600">
                          {fmt(filas.reduce((s, f) => s + f.stock_actual, 0), 0)}
                        </span>
                      </td>
                      <td className="py-3 px-2 bg-slate-50/60" />
                      <td className="py-3 px-2 bg-slate-50/60" />
                      <td className="py-3 px-2 bg-slate-50/60 border-r border-slate-100" />
                      {/* nuevos: costo, p.venta, p.instaladora */}
                      <td className="py-3 px-2 text-center bg-cyan-50/40 border-l border-cyan-100">
                        <span className="text-sm font-bold text-amber-700">
                          ${fmt(filas.reduce((s, f) => s + f.costo_nuevo * f.cantidad, 0))}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center bg-cyan-50/40">
                        <span className="text-sm font-bold text-cyan-800">
                          ${fmt(filas.reduce((s, f) => s + f.precio_venta_nuevo * f.cantidad, 0))}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center bg-cyan-50/40 border-r border-cyan-100">
                        <span className="text-sm font-bold text-cyan-800">
                          ${fmt(filas.reduce((s, f) => s + f.precio_instaladora_nuevo * f.cantidad, 0))}
                        </span>
                      </td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Toaster />
    </div>
  );
}
