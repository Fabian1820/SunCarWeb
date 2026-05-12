"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/shared/atom/button";
import { Input } from "@/components/shared/molecule/input";
import { Badge } from "@/components/shared/atom/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shared/molecule/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select";
import type { PagoVenta } from "@/lib/types/feats/pagos-clientes-ventas/pago-cliente-venta-types";
import {
  Search,
  RefreshCw,
  AlertCircle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

interface TodosPagosVentasTableProps {
  pagos: PagoVenta[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

type AgrupacionId = "ninguna" | "solicitud" | "cliente" | "fecha";

const METODO_LABELS: Record<string, string> = {
  efectivo: "Efectivo",
  transferencia_bancaria: "Transferencia",
  stripe: "Stripe",
};

const MONEDA_COLORS: Record<string, string> = {
  USD: "bg-green-100 text-green-800",
  CUP: "bg-blue-100 text-blue-800",
  EUR: "bg-purple-100 text-purple-800",
};

export function TodosPagosVentasTable({
  pagos,
  loading,
  error,
  onRefresh,
}: TodosPagosVentasTableProps) {
  const [search, setSearch] = useState("");
  const [planesAbiertos, setPlanesAbiertos] = useState<Set<string>>(new Set());
  const getPagoKey = (p: PagoVenta, index: number): string =>
    [
      p.id || "no-id",
      p.solicitud_venta_id || "no-sol",
      p.fecha || "no-fecha",
      String(p.monto ?? "no-monto"),
      p.moneda || "no-moneda",
      String(index),
    ].join("|");
  const getSolicitudId = (p: PagoVenta): string =>
    typeof p.solicitud_venta_id === "string" ? p.solicitud_venta_id : "";
  const getSolicitudCode = (p: PagoVenta): string => {
    if (p.solicitud_codigo) return String(p.solicitud_codigo);
    const id = getSolicitudId(p);
    return id ? id.slice(-6).toUpperCase() : "—";
  };
  const getMonto = (p: PagoVenta): number => {
    const n = Number(p.monto);
    return Number.isFinite(n) ? n : 0;
  };
  const getMoneda = (p: PagoVenta): string =>
    typeof p.moneda === "string" && p.moneda.trim() ? p.moneda : "USD";
  const getPendiente = (p: PagoVenta): number | null => {
    const n = Number(p.monto_pendiente_despues_pago);
    return Number.isFinite(n) ? n : null;
  };
  const getPlanPagos = (p: PagoVenta): PagoVenta["plan_pagos"] =>
    p.plan_pagos ?? p.pagos_programados ?? null;
  const getMaterialesTexto = (p: PagoVenta): string => {
    if (Array.isArray(p.materiales)) {
      return p.materiales
        .map((m) => {
          if (typeof m === "string") return m;
          if (m && typeof m === "object") {
            const row = m as {
              nombre?: string;
              descripcion?: string;
              material_descripcion?: string;
              cantidad?: number;
            };
            const nombre =
              row.nombre || row.descripcion || row.material_descripcion || "";
            const cantidad =
              typeof row.cantidad === "number" && row.cantidad > 0
                ? `${row.cantidad}x `
                : "";
            return `${cantidad}${nombre}`.trim();
          }
          return "";
        })
        .filter(Boolean)
        .join(", ");
    }
    if (typeof p.materiales === "string") return p.materiales;
    return "—";
  };
  const getMetodoPago = (p: PagoVenta): string => {
    const metodoPlano = typeof p.metodo_pago === "string" ? p.metodo_pago : "";
    const metodoEnPago =
      (p as unknown as { pago?: { metodo_pago?: string } })?.pago?.metodo_pago ||
      "";
    const raw = metodoPlano || metodoEnPago;
    return METODO_LABELS[raw] ?? raw ?? "—";
  };
  const getDesgloseBilletes = (p: PagoVenta): Record<string, number> | null => {
    const value =
      (p as unknown as { desglose_billetes?: Record<string, number> })
        ?.desglose_billetes ??
      (p as unknown as { pago?: { desglose_billetes?: Record<string, number> } })
        ?.pago?.desglose_billetes;
    if (!value || typeof value !== "object") return null;
    const entries = Object.entries(value).filter(
      ([, cantidad]) => Number(cantidad) > 0,
    );
    if (entries.length === 0) return null;
    const normalized: Record<string, number> = {};
    for (const [k, v] of entries) normalized[k] = Number(v);
    return normalized;
  };
  const [agrupacion, setAgrupacion] = useState<AgrupacionId>("ninguna");
  const [gruposAbiertos, setGruposAbiertos] = useState<Set<string>>(
    new Set(),
  );

  const formatCurrency = (v: number, moneda = "USD") =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: moneda === "EUR" ? "EUR" : "USD",
      minimumFractionDigits: 2,
    }).format(v);

  const formatDate = (d: string) => {
    if (!d) return "—";
    const [y, m, day] = d.slice(0, 10).split("-").map(Number);
    if (!y || !m || !day) return d;
    const date = new Date(y, m - 1, day);
    return date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const filtered = useMemo(
    () =>
      pagos.filter((p) => {
        if (!search.trim()) return true;
        const term = search.toLowerCase();
        return (
          getSolicitudId(p).toLowerCase().includes(term) ||
          (p.solicitud_codigo || "").toLowerCase().includes(term) ||
          (p.factura_numero || "").toLowerCase().includes(term) ||
          (p.cliente_nombre || "").toLowerCase().includes(term) ||
          (p.comercial || "").toLowerCase().includes(term) ||
          (p.recibido_por || "").toLowerCase().includes(term) ||
          (p.notas || "").toLowerCase().includes(term)
        );
      }),
    [pagos, search],
  );

  const grouped = useMemo(() => {
    if (agrupacion === "ninguna") return null;

    const map = new Map<string, PagoVenta[]>();
    for (const p of filtered) {
      let key = "";
      if (agrupacion === "solicitud")
        key = getSolicitudCode(p);
      else if (agrupacion === "cliente")
        key = p.cliente_nombre || "Sin cliente";
      else if (agrupacion === "fecha")
        key = formatDate(p.fecha || "");
      const list = map.get(key) ?? [];
      list.push(p);
      map.set(key, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered, agrupacion]);

  const toggleGrupo = (key: string) => {
    setGruposAbiertos((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const togglePlan = (key: string) => {
    setPlanesAbiertos((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const totalesPorMoneda = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of filtered) {
      const moneda = getMoneda(p);
      map[moneda] = (map[moneda] || 0) + getMonto(p);
    }
    return map;
  }, [filtered]);

  const totalPendienteUSD = useMemo(() => {
    return filtered.reduce((sum, p) => {
      const pend = getPendiente(p);
      if (pend != null) {
        const moneda = getMoneda(p);
        if (moneda === "USD") return sum + pend;
        const tasa = Number(p.tasa_cambio);
        if (tasa > 0) return sum + pend / tasa;
        return sum + pend;
      }
      return sum;
    }, 0);
  }, [filtered]);

  const PagoRow = ({ p, rowKey }: { p: PagoVenta; rowKey: string }) => {
    const moneda = getMoneda(p);
    const pendiente = getPendiente(p);
    const plan = getPlanPagos(p);
    const tienePlazos = Boolean(p.es_a_plazos);
    const planAbierto = planesAbiertos.has(rowKey);

    return (
      <TableRow className="hover:bg-gray-50">
        <TableCell className="text-sm whitespace-nowrap">{formatDate(p.fecha || "")}</TableCell>
        <TableCell className="font-mono text-xs">{getSolicitudCode(p)}</TableCell>
        <TableCell className="text-sm">{p.factura_numero || "—"}</TableCell>
        <TableCell className="text-sm">
          <div>{p.cliente_nombre || "—"}</div>
          {p.comercial && (
            <div className="text-xs text-gray-500 italic">
              Comercial: {p.comercial}
            </div>
          )}
        </TableCell>
        <TableCell className="text-xs text-gray-600 min-w-[220px]">{getMaterialesTexto(p)}</TableCell>
        <TableCell className="text-sm min-w-[220px]">
          <div className="font-medium text-gray-900">{getMetodoPago(p)}</div>
          {p.descuento_porcentaje && p.descuento_porcentaje > 0 && (
            <div className="text-xs text-orange-600">
              Descuento: {p.descuento_porcentaje}%
            </div>
          )}
          {(() => {
            const desglose = getDesgloseBilletes(p);
            if (!desglose) return null;
            return (
              <div className="text-xs text-gray-600">
                Billetes:{" "}
                {Object.entries(desglose)
                  .map(([den, cant]) => `${cant}x${den}`)
                  .join(", ")}
              </div>
            );
          })()}
          {p.notas && <div className="text-xs text-gray-500">Nota: {p.notas}</div>}
        </TableCell>
        <TableCell className="text-sm min-w-[170px]">
          <div className="font-semibold text-green-700">
            {getMonto(p).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {moneda}
          </div>
          {moneda !== "USD" && Number(p.tasa_cambio) > 0 && (
            <div className="text-xs text-gray-500">Tasa: {Number(p.tasa_cambio).toFixed(2)}</div>
          )}
          <div className="text-xs text-red-600">
            Pend: {pendiente != null ? formatCurrency(
              moneda === "USD" ? pendiente : (Number(p.tasa_cambio) > 0 ? pendiente / Number(p.tasa_cambio) : pendiente),
              "USD"
            ) : "—"}
          </div>
        </TableCell>
        <TableCell className="text-sm min-w-[210px]">
          {!tienePlazos ? (
            <span className="text-gray-400 text-xs">No</span>
          ) : (
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => togglePlan(rowKey)}
                className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700"
              >
                {planAbierto ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                Sí
              </button>
              {planAbierto && Array.isArray(plan) && plan.length > 0 && (
                <div className="rounded border bg-blue-50 p-2 space-y-1">
                  {plan.map((pp, idx) => (
                    <div key={`${rowKey}-plan-${idx}`} className="text-xs text-blue-900">
                      {idx + 1}. {formatDate(pp.fecha)} - {formatCurrency(Number(pp.monto) || 0, moneda)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </TableCell>
        <TableCell className="text-sm">{p.recibido_por || "—"}</TableCell>
      </TableRow>
    );
  };

  const TableHead_ = () => (
    <TableHeader>
      <TableRow className="bg-gray-50">
        <TableHead className="font-semibold">Fecha</TableHead>
        <TableHead className="font-semibold">Código solicitud</TableHead>
        <TableHead className="font-semibold">Nº factura</TableHead>
        <TableHead className="font-semibold">Cliente</TableHead>
        <TableHead className="font-semibold">Materiales</TableHead>
        <TableHead className="font-semibold">Pago (detalle)</TableHead>
        <TableHead className="font-semibold">Monto / Pendiente (USD)</TableHead>
        <TableHead className="font-semibold">Pagos a plazos</TableHead>
        <TableHead className="font-semibold">Recibido por</TableHead>
      </TableRow>
    </TableHeader>
  );

  return (
    <div className="space-y-4">
      {/* Barra de controles */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            className="pl-9"
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Select
          value={agrupacion}
          onValueChange={(v: string) => {
            setAgrupacion(v as AgrupacionId);
            setGruposAbiertos(new Set());
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Agrupar por..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ninguna">Sin agrupación</SelectItem>
            <SelectItem value="solicitud">Por solicitud</SelectItem>
            <SelectItem value="cliente">Por cliente</SelectItem>
            <SelectItem value="fecha">Por fecha</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" size="icon" onClick={onRefresh} title="Recargar">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>

        <Badge variant="secondary" className="text-xs">
          {filtered.length} pagos
        </Badge>

        {filtered.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 ml-auto">
            {Object.entries(totalesPorMoneda).sort(([a], [b]) => a.localeCompare(b)).map(([moneda, total]) => (
              <span key={moneda}>
                Total {moneda}:{" "}
                <span className={`font-semibold ${moneda === "USD" ? "text-green-700" : moneda === "EUR" ? "text-purple-700" : "text-blue-700"}`}>
                  {total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {moneda}
                </span>
              </span>
            ))}
            <span>
              Pend. USD:{" "}
              <span className="font-semibold text-red-600">
                {formatCurrency(totalPendienteUSD)}
              </span>
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {loading && pagos.length === 0 ? (
        <div className="text-center py-12 text-gray-500 text-sm">
          Cargando pagos...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          {search
            ? "No se encontraron pagos con ese criterio"
            : "No hay pagos registrados"}
        </div>
      ) : agrupacion === "ninguna" || !grouped ? (
        /* ── Sin agrupación ── */
        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHead_ />
            <TableBody>
              {filtered.map((p, index) => (
                <PagoRow key={getPagoKey(p, index)} p={p} rowKey={getPagoKey(p, index)} />
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        /* ── Con agrupación ── */
        <div className="space-y-3">
          {grouped.map(([key, items]) => {
            const abierto = gruposAbiertos.has(key);
            const subtotal = items.reduce(
              (sum, p) => sum + (p.monto_usd ?? p.monto ?? 0),
              0,
            );
            return (
              <div key={key} className="rounded-lg border overflow-hidden">
                {/* Cabecera del grupo */}
                <button
                  type="button"
                  onClick={() => toggleGrupo(key)}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                >
                  {abierto ? (
                    <ChevronDown className="h-4 w-4 text-gray-500 shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-500 shrink-0" />
                  )}
                  <span className="font-semibold text-sm text-gray-800 flex-1">
                    {key}
                  </span>
                  <span className="text-xs text-gray-500">
                    {items.length} pago{items.length !== 1 ? "s" : ""}
                  </span>
                  <span className="text-sm font-semibold text-green-700 ml-4">
                    {formatCurrency(subtotal)}
                  </span>
                </button>

                {/* Filas del grupo */}
                {abierto && (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHead_ />
                      <TableBody>
                        {items.map((p, index) => (
                          <PagoRow key={getPagoKey(p, index)} p={p} rowKey={getPagoKey(p, index)} />
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
