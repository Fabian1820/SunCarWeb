"use client";

import { useMemo, useState } from "react";
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
import {
  Search,
  RefreshCw,
  AlertCircle,
  Eye,
  CreditCard,
  PackageOpen,
} from "lucide-react";
import type {
  Consignacion,
  ConsignacionEstado,
} from "@/lib/types/feats/consignaciones/consignacion-types";
import {
  CONSIGNACION_ESTADO_BADGE_CLASSES,
  CONSIGNACION_ESTADO_LABELS,
} from "@/lib/types/feats/consignaciones/consignacion-types";

interface ConsignacionesTableProps {
  consignaciones: Consignacion[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onVer?: (c: Consignacion) => void;
  onRegistrarPago?: (c: Consignacion) => void;
  onRegistrarDevolucion?: (c: Consignacion) => void;
  estadoFiltro?: ConsignacionEstado | "todos";
  onEstadoFiltroChange?: (estado: ConsignacionEstado | "todos") => void;
}

const formatMoney = (n: number, moneda: string) =>
  new Intl.NumberFormat("es-CU", {
    style: "currency",
    currency: moneda || "USD",
    minimumFractionDigits: 2,
  }).format(n || 0);

const formatDate = (iso: string) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("es-CU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
};

const isAbierta = (estado: string) =>
  estado === "activa" ||
  estado === "pagada_parcial" ||
  estado === "devuelta_parcial" ||
  estado === "mixta_parcial";

export function ConsignacionesTable({
  consignaciones,
  loading,
  error,
  onRefresh,
  onVer,
  onRegistrarPago,
  onRegistrarDevolucion,
  estadoFiltro = "todos",
  onEstadoFiltroChange,
}: ConsignacionesTableProps) {
  const [search, setSearch] = useState("");

  const filtradas = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return consignaciones;
    return consignaciones.filter((c) => {
      const target = [
        c.id,
        c.solicitud_venta_id,
        c.cliente_venta_id,
        c.notas,
        c.estado,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return target.includes(q);
    });
  }, [consignaciones, search]);

  return (
    <div className="rounded-lg border bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-3">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Buscar por id, solicitud, cliente…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          {onEstadoFiltroChange && (
            <Select
              value={estadoFiltro}
              onValueChange={(v) =>
                onEstadoFiltroChange(v as ConsignacionEstado | "todos")
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas</SelectItem>
                {Object.entries(CONSIGNACION_ESTADO_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={loading}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
          />
          Refrescar
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 border-b bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Solicitud</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Pagado</TableHead>
              <TableHead className="text-right">Devuelto</TableHead>
              <TableHead className="text-right">Pendiente</TableHead>
              <TableHead>Últ. movimiento</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtradas.length === 0 && !loading ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="py-8 text-center text-sm text-gray-500"
                >
                  Sin consignaciones para mostrar.
                </TableCell>
              </TableRow>
            ) : (
              filtradas.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-xs">
                    {c.solicitud_venta_id?.slice(-8) ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {c.cliente_venta_id?.slice(-8) ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        CONSIGNACION_ESTADO_BADGE_CLASSES[c.estado] ??
                        "bg-gray-100 text-gray-700"
                      }
                    >
                      {CONSIGNACION_ESTADO_LABELS[c.estado] ?? c.estado}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {formatMoney(c.monto_total, c.moneda)}
                  </TableCell>
                  <TableCell className="text-right text-sm text-emerald-700">
                    {formatMoney(c.monto_pagado_efectivo, c.moneda)}
                  </TableCell>
                  <TableCell className="text-right text-sm text-purple-700">
                    {formatMoney(c.valor_devuelto, c.moneda)}
                  </TableCell>
                  <TableCell className="text-right text-sm font-semibold text-amber-700">
                    {formatMoney(c.monto_pendiente, c.moneda)}
                  </TableCell>
                  <TableCell className="text-xs text-gray-600">
                    {formatDate(c.fecha_ultimo_movimiento)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {onVer && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onVer(c)}
                          title="Ver detalle"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      {onRegistrarPago && isAbierta(c.estado) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRegistrarPago(c)}
                          title="Vincular pago"
                        >
                          <CreditCard className="h-4 w-4 text-emerald-600" />
                        </Button>
                      )}
                      {onRegistrarDevolucion && isAbierta(c.estado) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRegistrarDevolucion(c)}
                          title="Registrar devolución"
                        >
                          <PackageOpen className="h-4 w-4 text-purple-600" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
