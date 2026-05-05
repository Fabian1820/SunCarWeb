"use client";

import { useState } from "react";
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
import type { FacturaClienteVenta } from "@/lib/types/feats/pagos-clientes-ventas/pago-cliente-venta-types";
import { Search, RefreshCw, AlertCircle, Trash2 } from "lucide-react";

interface FacturasVentasTableProps {
  facturas: FacturaClienteVenta[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onEliminar?: (factura: FacturaClienteVenta) => void;
  /** "embedded": sin borde propio, controles con padding lateral, tabla a todo el ancho */
  variant?: "default" | "embedded";
}

export function FacturasVentasTable({
  facturas,
  loading,
  error,
  onRefresh,
  onEliminar,
  variant = "default",
}: FacturasVentasTableProps) {
  const [search, setSearch] = useState("");

  const formatDate = (d: string) => {
    if (!d) return "—";
    const date = new Date(d);
    return date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const filtered = facturas.filter((f) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      f.numero_factura.toLowerCase().includes(term) ||
      (f.cliente_nombre || "").toLowerCase().includes(term) ||
      (f.cliente_numero || "").toLowerCase().includes(term) ||
      (f.emitida_por || "").toLowerCase().includes(term) ||
      f.solicitud_venta_id.toLowerCase().includes(term)
    );
  });

  const em = variant === "embedded";

  return (
    <div className={em ? "" : "space-y-4"}>
      <div className={`flex items-center gap-3 ${em ? "px-6 py-4" : ""}`}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            className="pl-9"
            placeholder="Buscar por número, cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" size="icon" onClick={onRefresh} title="Recargar">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
        <Badge variant="secondary" className="text-xs">
          {filtered.length} facturas
        </Badge>
      </div>

      {error && (
        <div className={`flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2 ${em ? "mx-6" : ""}`}>
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {loading && facturas.length === 0 ? (
        <div className={`text-center py-12 text-gray-500 text-sm ${em ? "px-6 pb-6" : ""}`}>
          Cargando facturas...
        </div>
      ) : filtered.length === 0 ? (
        <div className={`text-center py-12 text-gray-400 text-sm ${em ? "px-6 pb-6" : ""}`}>
          {search
            ? "No se encontraron facturas con ese criterio"
            : "No hay facturas emitidas"}
        </div>
      ) : (
        <div className={em ? "border-t overflow-x-auto" : "rounded-lg border overflow-x-auto"}>
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="font-semibold">Nº Factura</TableHead>
                <TableHead className="font-semibold">Solicitud</TableHead>
                <TableHead className="font-semibold">Cliente</TableHead>
                <TableHead className="font-semibold">Fecha emisión</TableHead>
                <TableHead className="font-semibold">Emitida por</TableHead>
                <TableHead className="font-semibold">Creada en</TableHead>
                {onEliminar && <TableHead />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((f) => (
                <TableRow key={f.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium text-blue-700 text-sm">
                    {f.numero_factura}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-gray-600">
                    {f.solicitud_venta_id.slice(-6).toUpperCase()}
                  </TableCell>
                  <TableCell className="text-sm">
                    <div>{f.cliente_nombre || "—"}</div>
                    {f.cliente_numero && (
                      <div className="text-xs text-gray-500">
                        #{f.cliente_numero}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatDate(f.fecha_emision)}
                  </TableCell>
                  <TableCell className="text-sm">{f.emitida_por}</TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {formatDate(f.fecha_creacion)}
                  </TableCell>
                  {onEliminar && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => onEliminar(f)}
                        title="Eliminar factura"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
