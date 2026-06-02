"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Calculator,
  CheckCircle2,
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

import { CompraService } from "@/lib/api-services";
import type {
  AplicarPreciosMaterialPayload,
  CostoImportacion,
  Compra,
  CompraCreateData,
  FichaPatchMaterial,
  MonedaCosto,
} from "@/lib/types/feats/compras/compra-types";
import {
  COSTOS_SUGERIDOS,
  MONEDAS_COSTO,
  TIPO_COMPRA_LABELS,
} from "@/lib/types/feats/compras/compra-types";
import {
  AplicarPreciosConfirmDialog,
  type CambioMaterialPrecio,
} from "@/components/feats/compras/aplicar-precios-confirm-dialog";

// ─── helpers ────────────────────────────────────────────────────────────────

const fmt = (n: number, decimals = 2) =>
  n.toLocaleString("es-ES", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

// Ocultar las flechas (spin buttons) del input type="number" para que no tapen el valor
const NO_SPIN =
  "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0 [&::-webkit-outer-spin-button]:m-0";

// ─── tipos internos ──────────────────────────────────────────────────────────

interface FilaMaterial {
  material_id: string;
  material_codigo: string;
  material_nombre: string;
  cantidad: number;
  // Precios actuales del catálogo (referencia, solo lectura)
  precio_catalogo: number;
  precio_instaladora_catalogo: number;
  costo_actual: number;
  stock_actual: number;
  porciento_rebajable_actual: number;
  // Campo editable
  precio_unitario_cif: number;
  porciento_rebajable_venta: number;
  // Recargo (por fila, defaulteado al global, editable)
  porciento_recargo: number;
  porciento_recargo_override: boolean;
  // Costo calculado: cif * (1 + recargo/100)
  costo_nuevo: number;
  // Sugeridos (calculados) y finales (editables)
  precio_venta_sugerido: number;
  precio_instaladora_sugerido: number;
  precio_venta_final: number;
  precio_instaladora_final: number;
  precio_venta_override: boolean;
  precio_instaladora_override: boolean;
  // Validación
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
  const [envio, setEnvio] = useState<Compra | null>(null);
  const [loadingEnvio, setLoadingEnvio] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingBorrador, setSavingBorrador] = useState(false);
  const [ponderando, setPonderando] = useState(false);
  const [costosCollapsed, setCostosCollapsed] = useState(false);

  // ── costos de importación ──
  const [costos, setCostos] = useState<CostoImportacion[]>([]);
  // Tasas de cambio a USD para cada moneda no-USD. Las tres se persisten en
  // backend: tasa_conversion_eur_usd / mlc_usd / cup_usd.
  const [tasaEurUsd, setTasaEurUsd] = useState<number>(1.08);
  const [tasaMlcUsd, setTasaMlcUsd] = useState<number>(1);
  const [tasaCupUsd, setTasaCupUsd] = useState<number>(1);
  const [nuevoCostoDesc, setNuevoCostoDesc] = useState("");
  const [nuevoCostoMonto, setNuevoCostoMonto] = useState("");
  const [nuevoCostoMoneda, setNuevoCostoMoneda] = useState<MonedaCosto>("USD");

  // ── porcentajes globales ──
  const [porcientoInstaladora, setPorcientoInstaladora] = useState(0);
  const [porcientoVentas, setPorcientoVentas] = useState(0);
  const [porcientoImpuestos, setPorcientoImpuestos] = useState(0);

  // ── filas de materiales ──
  const [filas, setFilas] = useState<FilaMaterial[]>([]);

  // ── confirmación ──
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cambiosPendientes, setCambiosPendientes] = useState<CambioMaterialPrecio[]>([]);

  // ─── carga inicial ───────────────────────────────────────────────────────

  const cargarDatos = useCallback(async () => {
    setLoadingEnvio(true);
    try {
      const envioData = await CompraService.getCompraById(envioId);

      if (!envioData) {
        toast({ title: "Error", description: "Envío no encontrado.", variant: "destructive" });
        router.push("/compras");
        return;
      }

      setEnvio(envioData);
      setCostos(envioData.costos ?? []);
      setPorcientoInstaladora(envioData.porciento_instaladora ?? 0);
      setPorcientoVentas(envioData.porciento_ventas ?? 0);
      setPorcientoImpuestos(envioData.porciento_cargo_envio_impuestos ?? 0);
      if (envioData.tasa_conversion_eur_usd != null && envioData.tasa_conversion_eur_usd > 0) {
        setTasaEurUsd(envioData.tasa_conversion_eur_usd);
      }
      if (envioData.tasa_conversion_mlc_usd != null && envioData.tasa_conversion_mlc_usd > 0) {
        setTasaMlcUsd(envioData.tasa_conversion_mlc_usd);
      }
      if (envioData.tasa_conversion_cup_usd != null && envioData.tasa_conversion_cup_usd > 0) {
        setTasaCupUsd(envioData.tasa_conversion_cup_usd);
      }

      const materialIds = envioData.materiales.map((m) => m.material_id).filter(Boolean);
      const datosBulk = await CompraService.getMaterialesDatosBulk(materialIds);

      const impuestosGuardados = envioData.porciento_cargo_envio_impuestos ?? 0;

      // Calcular el recargo sugerido a partir de lo que está guardado
      // (costos + tasas + valor mercancía) — sirve para decidir si el
      // porciento_recargo persistido fue una edición manual del usuario
      // (override) o simplemente el sugerido del momento del guardado.
      const tasaEurGuardada = envioData.tasa_conversion_eur_usd ?? 0;
      const tasaMlcGuardada = envioData.tasa_conversion_mlc_usd ?? 0;
      const tasaCupGuardada = envioData.tasa_conversion_cup_usd ?? 0;
      const totalCostosUsdGuardado = (envioData.costos ?? []).reduce((acc, c) => {
        if (c.moneda === "USD") return acc + c.monto;
        if (c.moneda === "EUR" && tasaEurGuardada > 0) return acc + c.monto * tasaEurGuardada;
        if (c.moneda === "MLC" && tasaMlcGuardada > 0) return acc + c.monto * tasaMlcGuardada;
        if (c.moneda === "CUP" && tasaCupGuardada > 0) return acc + c.monto * tasaCupGuardada;
        return acc;
      }, 0);
      const valorMercanciasGuardado = envioData.materiales.reduce(
        (acc, m) => acc + (m.precio_unitario_cif ?? 0) * (m.cantidad ?? 0),
        0,
      );
      const recargoSugeridoGuardado = valorMercanciasGuardado > 0
        ? (totalCostosUsdGuardado / valorMercanciasGuardado) * 100
        : 0;

      const filasInit: FilaMaterial[] = envioData.materiales.map((m) => {
        const datos = datosBulk[m.material_id] ?? { precio: 0, precio_instaladora: 0, costo: 0, stock_total: 0 };
        const cifUnit = m.precio_unitario_cif ?? 0;
        const recargoTotalGuardado = m.porciento_recargo ?? 0;
        // El recargo guardado en backend es el TOTAL (recargo + impuestos).
        // Lo descomponemos para mostrarlo separado del % impuestos global.
        const recargoFila = Math.max(0, recargoTotalGuardado - impuestosGuardados);
        // override = true solo si el recargo persistido difiere del sugerido
        // que producen los costos guardados (es decir: fue edición manual).
        // Antes se ponía true siempre que recargoTotalGuardado > 0, lo cual
        // hacía que al agregar costos nuevos la tabla no actualizara el
        // recargo/costo/precios sugeridos.
        const recargoOverride = Math.abs(recargoFila - recargoSugeridoGuardado) > 0.01;
        const costoGuardado = m.costo ?? 0;
        const pvSugerido = m.precio_venta_sugerido ?? 0;
        const piSugerido = m.precio_instaladora_sugerido ?? 0;
        // Si la compra aún no tiene precios finales (null, undefined o 0 — el
        // backend devuelve 0 en compras nuevas, NO null), precargar desde el
        // catálogo de productos cuando el material ya tiene precios definidos
        // (caso típico: estamos reabasteciendo un producto ya conocido).
        const tienePvFinalGuardado = (m.precio_venta_final ?? 0) > 0;
        const tienePiFinalGuardado = (m.precio_instaladora_final ?? 0) > 0;
        const pvFinal = tienePvFinalGuardado
          ? m.precio_venta_final!
          : (pvSugerido > 0 ? pvSugerido : datos.precio);
        const piFinal = tienePiFinalGuardado
          ? m.precio_instaladora_final!
          : (piSugerido > 0 ? piSugerido : datos.precio_instaladora);
        // % rebajable: si la compra no lo tiene seteado pero el catálogo sí,
        // usar el del catálogo como punto de partida.
        const porcRebajable = m.porciento_rebajable_venta && m.porciento_rebajable_venta > 0
          ? m.porciento_rebajable_venta
          : (datos.porciento_rebajable_venta ?? 0);
        return {
          material_id: m.material_id,
          material_codigo: m.material_codigo,
          material_nombre: m.material_nombre,
          cantidad: m.cantidad,
          precio_catalogo: datos.precio,
          precio_instaladora_catalogo: datos.precio_instaladora,
          costo_actual: datos.costo,
          stock_actual: datos.stock_total,
          porciento_rebajable_actual: datos.porciento_rebajable_venta ?? m.porciento_rebajable_venta ?? 0,
          precio_unitario_cif: cifUnit,
          porciento_rebajable_venta: porcRebajable,
          porciento_recargo: recargoFila,
          porciento_recargo_override: recargoOverride,
          costo_nuevo: costoGuardado || cifUnit * (1 + recargoTotalGuardado / 100),
          precio_venta_sugerido: pvSugerido,
          precio_instaladora_sugerido: piSugerido,
          precio_venta_final: pvFinal,
          precio_instaladora_final: piFinal,
          // override = true solo si la compra tenía un final guardado distinto
          // del sugerido. Si el final fue precargado desde el catálogo (sin
          // valor guardado), NO es override — sigue al sugerido si cambian
          // costos/recargo.
          precio_venta_override: tienePvFinalGuardado && pvSugerido > 0 && Math.abs(pvFinal - pvSugerido) > 0.0001,
          precio_instaladora_override: tienePiFinalGuardado && piSugerido > 0 && Math.abs(piFinal - piSugerido) > 0.0001,
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
      if (c.moneda === "MLC") return acc + c.monto * tasaMlcUsd;
      if (c.moneda === "CUP") return acc + c.monto * tasaCupUsd;
      return acc;
    }, 0);
  }, [costos, tasaEurUsd, tasaMlcUsd, tasaCupUsd]);

  const hayCostosEnEur = useMemo(() => costos.some((c) => c.moneda === "EUR"), [costos]);
  const hayCostosEnMlc = useMemo(() => costos.some((c) => c.moneda === "MLC"), [costos]);
  const hayCostosEnCup = useMemo(() => costos.some((c) => c.moneda === "CUP"), [costos]);

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

  // % Recargo sugerido = % envío calculado por costos / valor mercancías
  const recargoSugerido = porcientoEnvioSugerido;

  // Calcula los precios de una fila respetando overrides.
  // El % recargo de la fila NO incluye impuestos: se le SUMAN para los cálculos.
  const calcularFila = useCallback(
    (
      fila: FilaMaterial,
      recargoSug: number,
      pctImpuestos: number,
      pctVentas: number,
      pctInstaladora: number,
    ): FilaMaterial => {
      const recargo = fila.porciento_recargo_override ? fila.porciento_recargo : recargoSug;
      const recargoEfectivo = recargo + pctImpuestos;
      const costoNuevo = fila.precio_unitario_cif * (1 + recargoEfectivo / 100);
      const pvSugerido = costoNuevo * (1 + pctVentas / 100);
      const piSugerido = costoNuevo * (1 + pctInstaladora / 100);

      const pvFinal = fila.precio_venta_override ? fila.precio_venta_final : pvSugerido;
      const piFinal = fila.precio_instaladora_override ? fila.precio_instaladora_final : piSugerido;

      let errorValidacion: string | null = null;
      if (fila.porciento_rebajable_venta > 0 && pvFinal > 0 && piFinal > 0) {
        const precioVentaMinimo = pvFinal * (1 - fila.porciento_rebajable_venta / 100);
        if (precioVentaMinimo <= piFinal) {
          errorValidacion = `Con ${fila.porciento_rebajable_venta}% de descuento el precio venta mínimo ($${fmt(precioVentaMinimo)}) quedaría ≤ precio instaladora ($${fmt(piFinal)})`;
        }
      }

      return {
        ...fila,
        porciento_recargo: recargo,
        costo_nuevo: costoNuevo,
        precio_venta_sugerido: pvSugerido,
        precio_instaladora_sugerido: piSugerido,
        precio_venta_final: pvFinal,
        precio_instaladora_final: piFinal,
        errorValidacion,
      };
    },
    [],
  );

  const recalcularTodo = useCallback(() => {
    setFilas((prev) => prev.map((f) => calcularFila(f, recargoSugerido, porcientoImpuestos, porcientoVentas, porcientoInstaladora)));
  }, [calcularFila, recargoSugerido, porcientoImpuestos, porcientoVentas, porcientoInstaladora]);

  const hayErroresValidacion = useMemo(() => filas.some((f) => f.errorValidacion !== null), [filas]);

  // Recalcular cuando cambian los porcentajes globales
  const prevPctRef = useRef({ recargoSugerido, porcientoImpuestos, porcientoVentas, porcientoInstaladora });
  useEffect(() => {
    const prev = prevPctRef.current;
    if (
      prev.recargoSugerido !== recargoSugerido ||
      prev.porcientoImpuestos !== porcientoImpuestos ||
      prev.porcientoVentas !== porcientoVentas ||
      prev.porcientoInstaladora !== porcientoInstaladora
    ) {
      prevPctRef.current = { recargoSugerido, porcientoImpuestos, porcientoVentas, porcientoInstaladora };
      recalcularTodo();
    }
  }, [recargoSugerido, porcientoImpuestos, porcientoVentas, porcientoInstaladora, recalcularTodo]);

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
    if (!envio?.tipo) {
      toast({ title: "Aviso", description: "El envío no tiene tipo definido. Edítalo primero." });
      return;
    }
    const sugeridos = COSTOS_SUGERIDOS[envio.tipo];
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

  const actualizarCif = (material_id: string, valor: number) => {
    setFilas((prev) => {
      const updated = prev.map((f) => f.material_id === material_id ? { ...f, precio_unitario_cif: valor } : f);
      return updated.map((f) => calcularFila(f, recargoSugerido, porcientoImpuestos, porcientoVentas, porcientoInstaladora));
    });
  };

  const actualizarRebajable = (material_id: string, valor: number) => {
    setFilas((prev) => {
      const updated = prev.map((f) => f.material_id === material_id ? { ...f, porciento_rebajable_venta: valor } : f);
      return updated.map((f) => calcularFila(f, recargoSugerido, porcientoImpuestos, porcientoVentas, porcientoInstaladora));
    });
  };

  const actualizarRecargo = (material_id: string, valor: number) => {
    setFilas((prev) => {
      const updated = prev.map((f) =>
        f.material_id === material_id
          ? { ...f, porciento_recargo: valor, porciento_recargo_override: true }
          : f,
      );
      return updated.map((f) => calcularFila(f, recargoSugerido, porcientoImpuestos, porcientoVentas, porcientoInstaladora));
    });
  };

  const resetRecargo = (material_id: string) => {
    setFilas((prev) => {
      const updated = prev.map((f) =>
        f.material_id === material_id ? { ...f, porciento_recargo_override: false } : f,
      );
      return updated.map((f) => calcularFila(f, recargoSugerido, porcientoImpuestos, porcientoVentas, porcientoInstaladora));
    });
  };

  const setPrecioVentaFinal = (material_id: string, valor: number) => {
    setFilas((prev) =>
      prev.map((f) => {
        if (f.material_id !== material_id) return f;
        const piFinal = f.precio_instaladora_final;
        let errorValidacion: string | null = null;
        if (f.porciento_rebajable_venta > 0 && valor > 0 && piFinal > 0) {
          const minimo = valor * (1 - f.porciento_rebajable_venta / 100);
          if (minimo <= piFinal) {
            errorValidacion = `Con ${f.porciento_rebajable_venta}% de descuento el precio venta mínimo ($${fmt(minimo)}) quedaría ≤ precio instaladora ($${fmt(piFinal)})`;
          }
        }
        return { ...f, precio_venta_final: valor, precio_venta_override: true, errorValidacion };
      }),
    );
  };

  const resetPrecioVenta = (material_id: string) => {
    setFilas((prev) => {
      const updated = prev.map((f) =>
        f.material_id === material_id ? { ...f, precio_venta_override: false } : f,
      );
      return updated.map((f) => calcularFila(f, recargoSugerido, porcientoImpuestos, porcientoVentas, porcientoInstaladora));
    });
  };

  const setPrecioInstaladoraFinal = (material_id: string, valor: number) => {
    setFilas((prev) =>
      prev.map((f) => {
        if (f.material_id !== material_id) return f;
        const pvFinal = f.precio_venta_final;
        let errorValidacion: string | null = null;
        if (f.porciento_rebajable_venta > 0 && pvFinal > 0 && valor > 0) {
          const minimo = pvFinal * (1 - f.porciento_rebajable_venta / 100);
          if (minimo <= valor) {
            errorValidacion = `Con ${f.porciento_rebajable_venta}% de descuento el precio venta mínimo ($${fmt(minimo)}) quedaría ≤ precio instaladora ($${fmt(valor)})`;
          }
        }
        return { ...f, precio_instaladora_final: valor, precio_instaladora_override: true, errorValidacion };
      }),
    );
  };

  const resetPrecioInstaladora = (material_id: string) => {
    setFilas((prev) => {
      const updated = prev.map((f) =>
        f.material_id === material_id ? { ...f, precio_instaladora_override: false } : f,
      );
      return updated.map((f) => calcularFila(f, recargoSugerido, porcientoImpuestos, porcientoVentas, porcientoInstaladora));
    });
  };

  // ─── flujo de guardado ────────────────────────────────────────────────────

  const abrirConfirmacion = () => {
    if (hayErroresValidacion) {
      toast({ title: "Errores de validación", description: "Corrige los errores antes de guardar.", variant: "destructive" });
      return;
    }
    if (filas.length === 0) {
      toast({ title: "Sin materiales", description: "No hay materiales en este envío.", variant: "destructive" });
      return;
    }
    const sinCif = filas.filter((f) => f.precio_unitario_cif <= 0);
    if (sinCif.length > 0) {
      toast({
        title: "CIF sin completar",
        description: `${sinCif.length} material${sinCif.length !== 1 ? "es" : ""} sin precio CIF. El costo no se actualizará en esos casos.`,
      });
    }
    const cambios: CambioMaterialPrecio[] = filas.map((f) => ({
      material_id: f.material_id,
      material_codigo: f.material_codigo,
      material_nombre: f.material_nombre,
      cantidad: f.cantidad,
      costo_actual: f.costo_actual,
      precio_venta_actual: f.precio_catalogo,
      precio_instaladora_actual: f.precio_instaladora_catalogo,
      porciento_rebajable_venta_actual: f.porciento_rebajable_actual,
      costo_nuevo: f.costo_nuevo,
      precio_venta_nuevo: f.precio_venta_final,
      precio_instaladora_nuevo: f.precio_instaladora_final,
      porciento_rebajable_venta_nuevo: f.porciento_rebajable_venta,
      precio_unitario_cif: f.precio_unitario_cif,
      porciento_recargo: f.porciento_recargo,
      precio_venta_sugerido: f.precio_venta_sugerido,
      precio_instaladora_sugerido: f.precio_instaladora_sugerido,
    }));
    setCambiosPendientes(cambios);
    setConfirmOpen(true);
  };

  const ejecutarAplicarPrecios = async (cambiosEditados: CambioMaterialPrecio[]) => {
    setSaving(true);
    try {
      // 1. PATCH del contenedor con totales y porcentajes
      const updatePayload: Partial<CompraCreateData> = {
        costos,
        porciento_instaladora: porcientoInstaladora,
        porciento_ventas: porcientoVentas,
        porciento_cargo_envio_sugerido: porcientoEnvioSugerido,
        porciento_cargo_envio_impuestos: porcientoImpuestos,
        total_costos: totalCostosUsd,
        valor_mercancia: totalValorMercancias,
        tasa_conversion_eur_usd: hayCostosEnEur ? tasaEurUsd : null,
        tasa_conversion_mlc_usd: hayCostosEnMlc ? tasaMlcUsd : null,
        tasa_conversion_cup_usd: hayCostosEnCup ? tasaCupUsd : null,
      };
      await CompraService.updateCompra(envioId, updatePayload);

      // 2. POST aplicar-precios con valores (posiblemente editados desde el dialog).
      // El backend espera `porciento_recargo` como TOTAL (recargo de la fila + impuestos globales).
      const payload: AplicarPreciosMaterialPayload[] = cambiosEditados.map((c) => ({
        material_id: c.material_id,
        precio_unitario_cif: c.precio_unitario_cif,
        porciento_recargo: c.porciento_recargo + porcientoImpuestos,
        costo: c.costo_nuevo,
        precio_venta_sugerido: c.precio_venta_sugerido > 0 ? c.precio_venta_sugerido : null,
        precio_instaladora_sugerido: c.precio_instaladora_sugerido > 0 ? c.precio_instaladora_sugerido : null,
        precio_venta_final: c.precio_venta_nuevo > 0 ? c.precio_venta_nuevo : null,
        precio_instaladora_final: c.precio_instaladora_nuevo > 0 ? c.precio_instaladora_nuevo : null,
        porciento_rebajable_venta: c.porciento_rebajable_venta_nuevo,
      }));

      const envioActualizado = await CompraService.aplicarPrecios(envioId, payload);
      setEnvio(envioActualizado);
      setConfirmOpen(false);
      toast({
        title: "Precios aplicados",
        description: "Los cambios se han propagado al catálogo de productos.",
      });
      // Refrescar valores del catálogo silenciosamente (sin loader completo)
      const materialIds = envioActualizado.materiales.map((m) => m.material_id).filter(Boolean);
      const datosBulk = await CompraService.getMaterialesDatosBulk(materialIds);
      setFilas((prev) =>
        prev.map((f) => {
          const datos = datosBulk[f.material_id];
          if (!datos) return f;
          return {
            ...f,
            precio_catalogo: datos.precio,
            precio_instaladora_catalogo: datos.precio_instaladora,
            costo_actual: datos.costo,
            stock_actual: datos.stock_total,
            porciento_rebajable_actual: datos.porciento_rebajable_venta ?? f.porciento_rebajable_actual,
          };
        }),
      );
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

  /**
   * Guardado parcial de la ficha: persiste los CIF/recargo/costo/precios finales
   * SIN aplicar precios al catálogo de productos. El flag `precios_aplicados`
   * queda en false. Permite trabajar la ficha en varias sesiones.
   */
  const handleGuardarBorrador = async () => {
    if (filas.length === 0) {
      toast({ title: "Sin materiales", description: "No hay materiales en esta compra.", variant: "destructive" });
      return;
    }
    setSavingBorrador(true);
    try {
      // 1. PATCH del contenedor con totales y porcentajes
      const updatePayload: Partial<CompraCreateData> = {
        costos,
        porciento_instaladora: porcientoInstaladora,
        porciento_ventas: porcientoVentas,
        porciento_cargo_envio_sugerido: porcientoEnvioSugerido,
        porciento_cargo_envio_impuestos: porcientoImpuestos,
        total_costos: totalCostosUsd,
        valor_mercancia: totalValorMercancias,
        tasa_conversion_eur_usd: hayCostosEnEur ? tasaEurUsd : null,
        tasa_conversion_mlc_usd: hayCostosEnMlc ? tasaMlcUsd : null,
        tasa_conversion_cup_usd: hayCostosEnCup ? tasaCupUsd : null,
      };
      await CompraService.updateCompra(envioId, updatePayload);

      // 2. PATCH /ficha con los materiales tal como están (sin aplicar al catálogo)
      const materiales: FichaPatchMaterial[] = filas.map((f) => ({
        material_id: f.material_id,
        precio_unitario_cif: f.precio_unitario_cif,
        porciento_recargo: f.porciento_recargo + porcientoImpuestos,
        costo: f.costo_nuevo,
        precio_venta_sugerido: f.precio_venta_sugerido > 0 ? f.precio_venta_sugerido : null,
        precio_instaladora_sugerido: f.precio_instaladora_sugerido > 0 ? f.precio_instaladora_sugerido : null,
        precio_venta_final: f.precio_venta_final > 0 ? f.precio_venta_final : null,
        precio_instaladora_final: f.precio_instaladora_final > 0 ? f.precio_instaladora_final : null,
        porciento_rebajable_venta: f.porciento_rebajable_venta,
      }));
      const compraActualizada = await CompraService.guardarFicha(envioId, { materiales });
      setEnvio(compraActualizada);
      toast({
        title: "Ficha guardada",
        description: "El progreso quedó guardado. Los precios todavía no se aplicaron al catálogo.",
      });
    } catch (err) {
      toast({
        title: "Error al guardar ficha",
        description: err instanceof Error ? err.message : "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setSavingBorrador(false);
    }
  };

  /**
   * Ponderar costo: el backend recorre el kardex de esta compra, busca entradas
   * con costo 0 (recepciones hechas antes de tener la ficha) y aplica el costo
   * de la ficha + recalcula promedios. Útil cuando se dio entrada antes de
   * confeccionar la ficha.
   */
  const handlePonderarCosto = async () => {
    if (!confirm(
      "Esto recorre el kardex de esta compra y aplica los costos de la ficha a las entradas que quedaron en 0. ¿Continuar?",
    )) return;
    setPonderando(true);
    try {
      const r = await CompraService.ponderarCosto(envioId);
      toast({
        title: "Costos ponderados",
        description: r.actualizados > 0
          ? `${r.actualizados} entrada${r.actualizados !== 1 ? "s" : ""} actualizada${r.actualizados !== 1 ? "s" : ""} en el kardex.`
          : "No había entradas pendientes de costear.",
      });
    } catch (err) {
      toast({
        title: "Error al ponderar costo",
        description: err instanceof Error ? err.message : "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setPonderando(false);
    }
  };

  // ─── render ───────────────────────────────────────────────────────────────

  if (loadingEnvio) return <PageLoader moduleName="Ficha de Costo" text="Cargando ficha de costo..." />;
  if (!envio) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ══════════════════════════════════════════════════════
          HEADER FIJO
      ══════════════════════════════════════════════════════ */}
      <header className="fixed top-0 inset-x-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3 min-w-0">
              <Link href="/compras">
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
                {envio.tipo && (
                  <Badge className="bg-cyan-100 text-cyan-800 border-cyan-200 border text-xs font-medium">
                    {TIPO_COMPRA_LABELS[envio.tipo]}
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

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                onClick={handlePonderarCosto}
                disabled={ponderando || savingBorrador || saving}
                className="gap-1.5 border-violet-300 text-violet-700 hover:bg-violet-50"
                title="Aplicar el costo de esta ficha a entradas anteriores con costo 0"
              >
                {ponderando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Calculator className="h-3.5 w-3.5" />}
                <span className="hidden lg:inline">Ponderar costo</span>
                <span className="lg:hidden">Ponderar</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleGuardarBorrador}
                disabled={savingBorrador || saving}
                className="gap-1.5 border-gray-300 text-gray-700 hover:bg-gray-50"
                title="Guardar el progreso de la ficha sin aplicar al catálogo"
              >
                {savingBorrador ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                <span className="hidden lg:inline">Guardar ficha</span>
                <span className="lg:hidden">Guardar</span>
              </Button>
              <Button
                size="sm"
                onClick={abrirConfirmacion}
                disabled={saving || hayErroresValidacion}
                className="gap-1.5 bg-cyan-600 hover:bg-cyan-700 text-white"
                title="Aplicar precios al catálogo de productos"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">Aplicar precios</span>
                <span className="sm:hidden">Aplicar</span>
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
        <div className="grid grid-cols-3 gap-3 py-4">
          <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Total costos</p>
            <p className="text-xl font-bold text-gray-900">${fmt(totalCostosUsd)}</p>
            <div className="flex gap-2 mt-0.5">
              {costosTotalesMLC > 0 && <span className="text-xs text-amber-600">{fmt(costosTotalesMLC)} MLC</span>}
              {costosTotalesCUP > 0 && <span className="text-xs text-amber-600">{fmt(costosTotalesCUP)} CUP</span>}
              {costosTotalesMLC === 0 && costosTotalesCUP === 0 && <span className="text-xs text-gray-400">Solo USD/EUR</span>}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Valor mercancías</p>
            <p className="text-xl font-bold text-gray-900">${fmt(totalValorMercancias)}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {filas.length} producto{filas.length !== 1 ? "s" : ""} · CIF
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">% Recargo sugerido</p>
            <p className="text-xl font-bold text-cyan-700">{fmt(recargoSugerido, 2)}%</p>
            <p className="text-xs text-gray-400 mt-0.5">
              + Imp. {fmt(porcientoImpuestos, 1)}% = {fmt(recargoSugerido + porcientoImpuestos, 2)}% total
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
                  <CardTitle className="text-sm font-semibold text-gray-800">Costos de importación</CardTitle>
                  <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                    {costos.length} ítem{costos.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {envio.tipo && (
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
                    {costosCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </CardHeader>

            {!costosCollapsed && (
              <CardContent className="px-4 pt-3 pb-4 space-y-3">
                {/* Tasas de cambio por moneda no-USD. Aparecen solo si hay
                    costos en esa moneda, así el operador setea la conversión
                    y los costos no-USD entran al cálculo del % recargo. */}
                {(hayCostosEnEur || hayCostosEnMlc || hayCostosEnCup) && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <Info className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      <span className="text-xs text-amber-700 font-medium">
                        Tasas de cambio a USD
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pl-5">
                      {hayCostosEnEur && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-amber-700 font-medium">1 EUR =</span>
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
                      )}
                      {hayCostosEnMlc && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-amber-700 font-medium">1 MLC =</span>
                          <Input
                            type="number"
                            className="h-6 w-20 text-xs px-1.5 border-amber-300 bg-white"
                            value={tasaMlcUsd}
                            onChange={(e) => setTasaMlcUsd(parseFloat(e.target.value) || 0)}
                            step="0.0001"
                            min="0"
                          />
                          <span className="text-xs text-amber-600">USD</span>
                        </div>
                      )}
                      {hayCostosEnCup && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-amber-700 font-medium">1 CUP =</span>
                          <Input
                            type="number"
                            className="h-6 w-20 text-xs px-1.5 border-amber-300 bg-white"
                            value={tasaCupUsd}
                            onChange={(e) => setTasaCupUsd(parseFloat(e.target.value) || 0)}
                            step="0.0001"
                            min="0"
                          />
                          <span className="text-xs text-amber-600">USD</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

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
                                      i === idx ? { ...item, monto: parseFloat(e.target.value) || 0 } : item,
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
                                    <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="py-1.5 px-2">
                              <button
                                onClick={() => eliminarCosto(idx)}
                                className="text-gray-300 hover:text-red-500 transition-colors"
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
                  <Select value={nuevoCostoMoneda} onValueChange={(val) => setNuevoCostoMoneda(val as MonedaCosto)}>
                    <SelectTrigger className="h-8 text-xs w-20"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MONEDAS_COSTO.map((m) => (
                        <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>
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
              <CardTitle className="text-sm font-semibold text-gray-800">Porcentajes globales</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pt-3 pb-4">
              {/* Impuesto nacional */}
              <div className="mb-4 p-3 rounded-lg bg-orange-50 border border-orange-200">
                <div className="flex items-start gap-3">
                  <div className="flex-1 space-y-1.5">
                    <Label className="text-xs font-semibold text-orange-700">% Impuestos (fijo)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.1"
                        className="h-9 flex-1 border-orange-300 focus-visible:ring-orange-400"
                        value={porcientoImpuestos}
                        onChange={(e) => setPorcientoImpuestos(parseFloat(e.target.value) || 0)}
                      />
                      <span className="text-sm font-medium text-orange-600 w-4">%</span>
                    </div>
                    <p className="text-xs text-orange-600 leading-tight">
                      Se suma al % envío sugerido para formar el recargo total aplicado al CIF.
                    </p>
                  </div>
                  {porcientoImpuestos !== 0 && (
                    <button
                      onClick={() => setPorcientoImpuestos(0)}
                      className="mt-5 text-orange-400 hover:text-orange-600 transition-colors text-xs underline shrink-0"
                    >
                      Resetear
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    P. venta sugerido = Costo × (1 + <span className="font-medium">{porcientoVentas}</span>%)
                  </p>
                </div>

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
                    P. install. sugerido = Costo × (1 + <span className="font-medium">{porcientoInstaladora}</span>%)
                  </p>
                </div>
              </div>

              {/* Resumen */}
              <div className="mt-4 grid gap-2 grid-cols-4">
                <div className="text-center p-2 rounded-md bg-cyan-50 border border-cyan-100">
                  <p className="text-xs text-cyan-600 font-medium">% Envío</p>
                  <p className="text-sm font-bold text-cyan-700">{fmt(porcientoEnvioSugerido, 1)}%</p>
                  <p className="text-xs text-cyan-500">auto</p>
                </div>
                <div className="text-center p-2 rounded-md bg-orange-50 border border-orange-100">
                  <p className="text-xs text-orange-600 font-medium">% Impuestos</p>
                  <p className="text-sm font-bold text-orange-700">{fmt(porcientoImpuestos, 1)}%</p>
                  <p className="text-xs text-orange-500">manual</p>
                </div>
                <div className="text-center p-2 rounded-md bg-gray-50 border border-gray-100">
                  <p className="text-xs text-gray-500 font-medium">% Ventas</p>
                  <p className="text-sm font-bold text-gray-700">{fmt(porcientoVentas, 1)}%</p>
                  <p className="text-xs text-gray-400">manual</p>
                </div>
                <div className="text-center p-2 rounded-md bg-gray-50 border border-gray-100">
                  <p className="text-xs text-gray-500 font-medium">% Install.</p>
                  <p className="text-sm font-bold text-gray-700">{fmt(porcientoInstaladora, 1)}%</p>
                  <p className="text-xs text-gray-400">manual</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ══════════════════════════════════════════════════════
            TABLA DE PRODUCTOS
        ══════════════════════════════════════════════════════ */}
        <Card className="border border-gray-200 shadow-none mb-6">
          <CardHeader className="pb-0 pt-4 px-5">
            <div className="flex items-center gap-3 flex-wrap">
              <CardTitle className="text-sm font-semibold text-gray-800">Productos del envío</CardTitle>
              <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                {filas.length} producto{filas.length !== 1 ? "s" : ""}
              </span>
              {hayErroresValidacion && (
                <span className="text-xs text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Hay errores de validación
                </span>
              )}
              {filas.some((f) => f.precio_venta_override || f.precio_instaladora_override) && (
                <span className="text-xs text-purple-600 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded">
                  Precios finales editados
                </span>
              )}
              {filas.some((f) => f.porciento_recargo_override) && (
                <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                  % Recargo personalizado
                </span>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-0 mt-3">
            {filas.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <p className="text-sm">No hay materiales en este envío.</p>
              </div>
            ) : (
              <div className="w-full overflow-x-auto">
                <table className="w-full text-sm border-collapse" style={{ minWidth: "1300px" }}>
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
                      <th rowSpan={2} className="text-center py-2 px-2 font-semibold text-amber-700 text-xs uppercase tracking-wide bg-amber-50 border-l border-r border-amber-200 w-[7%]">
                        % Recargo
                      </th>
                      <th rowSpan={2} className="text-center py-2 px-2 font-semibold text-amber-700 text-xs uppercase tracking-wide bg-amber-50 border-r border-amber-200 w-[8%]">
                        Costo
                      </th>
                      {/* Grupo actuales */}
                      <th colSpan={4} className="text-center py-2 px-2 font-semibold text-gray-500 text-xs uppercase tracking-wide bg-slate-50 border-l border-r border-slate-200">
                        Actuales (catálogo)
                      </th>
                      {/* Grupo nuevos */}
                      <th colSpan={2} className="text-center py-2 px-2 font-semibold text-cyan-700 text-xs uppercase tracking-wide bg-cyan-50 border-l border-r border-cyan-200">
                        Sugeridos
                      </th>
                      <th colSpan={3} className="text-center py-2 px-2 font-semibold text-purple-700 text-xs uppercase tracking-wide bg-purple-50 border-l border-r border-purple-200">
                        Finales (a aplicar al catálogo)
                      </th>
                    </tr>
                    {/* Fila 2: sub-columnas */}
                    <tr className="border-b border-gray-200">
                      <th className="text-center py-1.5 px-2 font-medium text-gray-500 text-xs bg-slate-50 border-l border-slate-200 w-[5%]">Stock</th>
                      <th className="text-center py-1.5 px-2 font-medium text-gray-500 text-xs bg-slate-50 w-[7%]">P. Venta</th>
                      <th className="text-center py-1.5 px-2 font-medium text-gray-500 text-xs bg-slate-50 w-[7%]">P. Inst.</th>
                      <th className="text-center py-1.5 px-2 font-medium text-gray-500 text-xs bg-slate-50 border-r border-slate-200 w-[6%]">Costo</th>
                      <th className="text-center py-1.5 px-2 font-medium text-cyan-600 text-xs bg-cyan-50 border-l border-cyan-200 w-[7%]">P. Venta</th>
                      <th className="text-center py-1.5 px-2 font-medium text-cyan-600 text-xs bg-cyan-50 border-r border-cyan-200 w-[7%]">P. Inst.</th>
                      <th className="text-center py-1.5 px-2 font-medium text-purple-600 text-xs bg-purple-50 border-l border-purple-200 w-[8%]">P. Venta</th>
                      <th className="text-center py-1.5 px-2 font-medium text-purple-600 text-xs bg-purple-50 w-[8%]">P. Inst.</th>
                      <th className="text-center py-1.5 px-2 font-medium text-purple-600 text-xs bg-purple-50 border-r border-purple-200 w-[7%]">% Reb/ventas</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filas.map((f, idx) => {
                      const hasError = !!f.errorValidacion;

                      const pctCambioVenta =
                        f.precio_catalogo > 0
                          ? ((f.precio_venta_final - f.precio_catalogo) / f.precio_catalogo) * 100
                          : null;
                      const pctCambioInst =
                        f.precio_instaladora_catalogo > 0
                          ? ((f.precio_instaladora_final - f.precio_instaladora_catalogo) / f.precio_instaladora_catalogo) * 100
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
                              <p className="font-semibold text-gray-900 text-sm leading-tight">{f.material_nombre}</p>
                              <p className="text-xs text-gray-400 mt-0.5 font-mono">{f.material_codigo}</p>
                              {envio?.materiales.find((m) => m.material_id === f.material_id)?.precios_aplicados && (
                                <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 className="h-2.5 w-2.5" />
                                  Precios aplicados
                                </span>
                              )}
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
                                  className={`h-7 text-xs text-right w-full font-medium ${NO_SPIN}`}
                                  value={f.precio_unitario_cif || ""}
                                  placeholder="0.00"
                                  onChange={(e) => actualizarCif(f.material_id, parseFloat(e.target.value) || 0)}
                                />
                              </div>
                            </td>

                            {/* % Recargo (editable, por fila — NO incluye impuestos) */}
                            <td className="py-2.5 px-2 bg-amber-50/40 border-l border-amber-100">
                              <div className="flex items-center justify-center gap-1">
                                <Input
                                  type="number"
                                  step="0.1"
                                  className={`h-7 text-xs text-right w-20 font-medium ${NO_SPIN} ${
                                    f.porciento_recargo_override
                                      ? "border-amber-400 text-amber-700"
                                      : "text-amber-800"
                                  }`}
                                  value={parseFloat(f.porciento_recargo.toFixed(4))}
                                  onChange={(e) => actualizarRecargo(f.material_id, parseFloat(e.target.value) || 0)}
                                />
                                <span className="text-xs text-gray-400">%</span>
                                {f.porciento_recargo_override && (
                                  <button
                                    onClick={() => resetRecargo(f.material_id)}
                                    className="text-amber-400 hover:text-amber-600 transition-colors"
                                    title="Volver al recargo sugerido"
                                  >
                                    <RefreshCw className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                              {porcientoImpuestos !== 0 && (
                                <p className="text-xs text-orange-500 text-center mt-0.5 font-medium whitespace-nowrap">
                                  +{fmt(porcientoImpuestos, 1)}% imp.
                                </p>
                              )}
                            </td>

                            {/* Costo (calculado, read-only) */}
                            <td className="py-2.5 px-2 text-center bg-amber-50/40 border-r border-amber-100">
                              {f.costo_nuevo > 0 ? (
                                <>
                                  <p className="text-sm font-semibold text-amber-700">${fmt(f.costo_nuevo)}</p>
                                  {f.costo_actual > 0 && (
                                    <span className={`text-xs font-medium ${f.costo_nuevo >= f.costo_actual ? "text-emerald-600" : "text-red-500"}`}>
                                      {f.costo_nuevo >= f.costo_actual ? "+" : ""}{fmt(((f.costo_nuevo - f.costo_actual) / f.costo_actual) * 100, 1)}%
                                    </span>
                                  )}
                                </>
                              ) : (
                                <p className="text-xs text-gray-300">—</p>
                              )}
                            </td>

                            {/* ── Actuales (catálogo) ─────────────────────── */}
                            <td className="py-2.5 px-2 text-center bg-slate-50/60 border-l border-slate-100">
                              <p className="text-sm font-semibold text-gray-700">{fmt(f.stock_actual, 0)}</p>
                              <p className="text-xs text-gray-400">uds.</p>
                            </td>
                            <td className="py-2.5 px-2 text-center bg-slate-50/60">
                              {f.precio_catalogo > 0
                                ? <p className="text-sm font-semibold text-gray-700">${fmt(f.precio_catalogo)}</p>
                                : <p className="text-xs text-gray-300">—</p>}
                            </td>
                            <td className="py-2.5 px-2 text-center bg-slate-50/60">
                              {f.precio_instaladora_catalogo > 0
                                ? <p className="text-sm font-semibold text-gray-700">${fmt(f.precio_instaladora_catalogo)}</p>
                                : <p className="text-xs text-gray-300">—</p>}
                            </td>
                            <td className="py-2.5 px-2 text-center bg-slate-50/60 border-r border-slate-100">
                              {f.costo_actual > 0
                                ? <p className="text-sm font-semibold text-gray-700">${fmt(f.costo_actual)}</p>
                                : <p className="text-xs text-gray-300">—</p>}
                            </td>

                            {/* ── Sugeridos (calculados, read-only) ─────── */}
                            <td className="py-2.5 px-2 text-center bg-cyan-50/40 border-l border-cyan-100">
                              {f.precio_venta_sugerido > 0
                                ? <p className="text-sm font-semibold text-cyan-700">${fmt(f.precio_venta_sugerido)}</p>
                                : <p className="text-xs text-gray-300">—</p>}
                            </td>
                            <td className="py-2.5 px-2 text-center bg-cyan-50/40 border-r border-cyan-100">
                              {f.precio_instaladora_sugerido > 0
                                ? <p className="text-sm font-semibold text-cyan-700">${fmt(f.precio_instaladora_sugerido)}</p>
                                : <p className="text-xs text-gray-300">—</p>}
                            </td>

                            {/* ── Finales (editables) ──────────────────── */}
                            <td className="py-2.5 px-2 bg-purple-50/40 border-l border-purple-100">
                              <div className="flex flex-col items-center gap-0.5">
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-gray-400">$</span>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    className={`h-7 text-xs text-right w-24 font-semibold ${NO_SPIN} ${
                                      hasError
                                        ? "border-red-400 text-red-700"
                                        : f.precio_venta_override
                                          ? "border-purple-400 text-purple-700"
                                          : "text-purple-900"
                                    }`}
                                    value={parseFloat(f.precio_venta_final.toFixed(4)) || ""}
                                    placeholder="0.00"
                                    onChange={(e) => setPrecioVentaFinal(f.material_id, parseFloat(e.target.value) || 0)}
                                  />
                                  {f.precio_venta_override && (
                                    <button
                                      onClick={() => resetPrecioVenta(f.material_id)}
                                      className="text-purple-400 hover:text-purple-600 transition-colors"
                                      title="Volver al sugerido"
                                    >
                                      <RefreshCw className="h-3 w-3" />
                                    </button>
                                  )}
                                </div>
                                {pctCambioVenta !== null && (
                                  <span className={`text-xs font-medium ${pctCambioVenta >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                                    {pctCambioVenta >= 0 ? "+" : ""}{fmt(pctCambioVenta, 1)}%
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-2 bg-purple-50/40">
                              <div className="flex flex-col items-center gap-0.5">
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-gray-400">$</span>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    className={`h-7 text-xs text-right w-24 font-semibold ${NO_SPIN} ${
                                      f.precio_instaladora_override
                                        ? "border-purple-400 text-purple-700"
                                        : "text-purple-900"
                                    }`}
                                    value={parseFloat(f.precio_instaladora_final.toFixed(4)) || ""}
                                    placeholder="0.00"
                                    onChange={(e) => setPrecioInstaladoraFinal(f.material_id, parseFloat(e.target.value) || 0)}
                                  />
                                  {f.precio_instaladora_override && (
                                    <button
                                      onClick={() => resetPrecioInstaladora(f.material_id)}
                                      className="text-purple-400 hover:text-purple-600 transition-colors"
                                      title="Volver al sugerido"
                                    >
                                      <RefreshCw className="h-3 w-3" />
                                    </button>
                                  )}
                                </div>
                                {pctCambioInst !== null && (
                                  <span className={`text-xs font-medium ${pctCambioInst >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                                    {pctCambioInst >= 0 ? "+" : ""}{fmt(pctCambioInst, 1)}%
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* % Rebajable / Ventas (dentro de Finales) */}
                            <td className="py-2.5 px-2 bg-purple-50/40 border-r border-purple-100">
                              <div className="flex flex-col items-center gap-0.5">
                                <div className="flex items-center gap-1">
                                  <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.5"
                                    className={`h-7 text-xs text-right w-16 ${NO_SPIN} ${hasError ? "border-red-400" : ""}`}
                                    value={f.porciento_rebajable_venta}
                                    onChange={(e) => actualizarRebajable(f.material_id, parseFloat(e.target.value) || 0)}
                                  />
                                  <span className="text-xs text-gray-400">%</span>
                                </div>
                                {f.precio_venta_final > 0 && f.porciento_rebajable_venta > 0 && (
                                  <p className="text-xs text-gray-400 whitespace-nowrap">
                                    Mín: ${fmt(f.precio_venta_final * (1 - f.porciento_rebajable_venta / 100))}
                                  </p>
                                )}
                              </div>
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
                        <span className="text-sm font-bold text-gray-700">{filas.reduce((s, f) => s + f.cantidad, 0)}</span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className="text-sm font-bold text-gray-700">${fmt(totalValorMercancias)}</span>
                      </td>
                      <td className="py-3 px-2 bg-amber-50/40 border-l border-amber-100" />
                      <td className="py-3 px-2 text-center bg-amber-50/40 border-r border-amber-100">
                        <span className="text-sm font-bold text-amber-700">
                          ${fmt(filas.reduce((s, f) => s + f.costo_nuevo * f.cantidad, 0))}
                        </span>
                      </td>
                      <td className="py-3 px-2 bg-slate-50/60 border-l border-slate-100 text-center">
                        <span className="text-sm font-bold text-gray-600">{fmt(filas.reduce((s, f) => s + f.stock_actual, 0), 0)}</span>
                      </td>
                      <td className="py-3 px-2 bg-slate-50/60" />
                      <td className="py-3 px-2 bg-slate-50/60 border-r border-slate-100" />
                      <td className="py-3 px-2 text-center bg-cyan-50/40 border-l border-cyan-100">
                        <span className="text-sm font-bold text-cyan-800">
                          ${fmt(filas.reduce((s, f) => s + f.precio_venta_sugerido * f.cantidad, 0))}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center bg-cyan-50/40 border-r border-cyan-100">
                        <span className="text-sm font-bold text-cyan-800">
                          ${fmt(filas.reduce((s, f) => s + f.precio_instaladora_sugerido * f.cantidad, 0))}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center bg-purple-50/40 border-l border-purple-100">
                        <span className="text-sm font-bold text-purple-800">
                          ${fmt(filas.reduce((s, f) => s + f.precio_venta_final * f.cantidad, 0))}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center bg-purple-50/40">
                        <span className="text-sm font-bold text-purple-800">
                          ${fmt(filas.reduce((s, f) => s + f.precio_instaladora_final * f.cantidad, 0))}
                        </span>
                      </td>
                      <td className="py-3 px-2 bg-purple-50/40 border-r border-purple-100" />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Confirmación al aplicar precios */}
      <AplicarPreciosConfirmDialog
        open={confirmOpen}
        onOpenChange={(o) => {
          if (!saving) setConfirmOpen(o);
        }}
        cambios={cambiosPendientes}
        onConfirm={ejecutarAplicarPrecios}
        loading={saving}
      />

      <Toaster />
    </div>
  );
}
