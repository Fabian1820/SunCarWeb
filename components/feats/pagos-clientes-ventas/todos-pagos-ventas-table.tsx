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
  CalendarClock,
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
    return new Date(d).toLocaleDateString("es-ES", {
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
          p.solicitud_venta_id.toLowerCase().includes(term) ||
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
        key = p.solicitud_venta_id.slice(-6).toUpperCase();
      else if (agrupacion === "cliente")
        key = p.recibido_por || "Sin cliente";
      else if (agrupacion === "fecha")
        key = formatDate(p.fecha);
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

  const totalUSD = filtered.reduce((sum, p) => sum + (p.monto_usd ?? p.monto), 0);

  const PagoRow = ({ p }: { p: PagoVenta }) => (
    <TableRow className="hover:bg-gray-50">
      <TableCell className="font-mono text-xs">
        {p.solicitud_venta_id.slice(-6).toUpperCase()}
      </TableCell>
      <TableCell className="text-sm">{formatDate(p.fecha)}</TableCell>
      <TableCell className="text-right font-medium text-sm text-green-700">
        {formatCurrency(p.monto, p.moneda)}
      </TableCell>
      <TableCell>
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            MONEDA_COLORS[p.moneda] ?? "bg-gray-100 text-gray-700"
          }`}
        >
          {p.moneda}
        </span>
      </TableCell>
      <TableCell className="text-sm">
        {METODO_LABELS[p.metodo_pago] ?? p.metodo_pago}
      </TableCell>
      <TableCell className="text-sm">
        {p.descuento_porcentaje && p.descuento_porcentaje > 0 ? (
          <span className="text-orange-600">{p.descuento_porcentaje}%</span>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </TableCell>
      <TableCell>
        {p.es_a_plazos ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
            <CalendarClock className="h-3 w-3" />
            {p.pagos_programados?.length
              ? `${p.pagos_programados.length} plazo${p.pagos_programados.length !== 1 ? "s" : ""}`
              : "Sí"}
          </span>
        ) : (
          <span className="text-gray-400 text-xs">—</span>
        )}
      </TableCell>
      <TableCell className="text-sm">{p.recibido_por || "—"}</TableCell>
      <TableCell className="text-sm text-gray-500 max-w-[140px] truncate">
        {p.notas || "—"}
      </TableCell>
    </TableRow>
  );

  const TableHead_ = () => (
    <TableHeader>
      <TableRow className="bg-gray-50">
        <TableHead className="font-semibold">Solicitud</TableHead>
        <TableHead className="font-semibold">Fecha</TableHead>
        <TableHead className="font-semibold text-right">Monto</TableHead>
        <TableHead className="font-semibold">Moneda</TableHead>
        <TableHead className="font-semibold">Método</TableHead>
        <TableHead className="font-semibold">Descuento</TableHead>
        <TableHead className="font-semibold">Plazos</TableHead>
        <TableHead className="font-semibold">Recibido por</TableHead>
        <TableHead className="font-semibold">Notas</TableHead>
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
          <span className="text-xs text-gray-500 ml-auto">
            Total:{" "}
            <span className="font-semibold text-green-700">
              {formatCurrency(totalUSD)}
            </span>
          </span>
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
              {filtered.map((p) => (
                <PagoRow key={p.id} p={p} />
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
              (sum, p) => sum + (p.monto_usd ?? p.monto),
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
                        {items.map((p) => (
                          <PagoRow key={p.id} p={p} />
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
