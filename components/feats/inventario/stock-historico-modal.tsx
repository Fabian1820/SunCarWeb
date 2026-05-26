"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/shared/atom/button";
import { Input } from "@/components/shared/molecule/input";
import { Label } from "@/components/shared/atom/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/shared/molecule/dialog";
import { Loader2, History, Search, Download, PackageSearch } from "lucide-react";
import { InventarioService } from "@/lib/services/feats/inventario/inventario-service";
import type { StockHistoricoItem } from "@/lib/services/feats/inventario/inventario-service";
import * as XLSX from "xlsx";

interface StockHistoricoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  almacenId: string;
  almacenNombre?: string;
}

const svc = new InventarioService();

const fmtNum = (n: number) =>
  Number.isFinite(n)
    ? n.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 4 })
    : "0";

export function StockHistoricoModal({
  open,
  onOpenChange,
  almacenId,
  almacenNombre,
}: StockHistoricoModalProps) {
  const today = new Date().toISOString().slice(0, 10);
  const [fecha, setFecha] = useState(today);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<StockHistoricoItem[] | null>(null);
  const [fechaConsultada, setFechaConsultada] = useState<string | null>(null);

  const handleConsultar = useCallback(async () => {
    if (!fecha) return;
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const resp = await svc.getStockHistorico({
        fecha,
        almacen_id: almacenId,
        q: q.trim() || undefined,
      });
      setData(resp.data);
      setFechaConsultada(fecha);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al consultar el stock histórico");
    } finally {
      setLoading(false);
    }
  }, [fecha, q, almacenId]);

  const handleExportExcel = useCallback(() => {
    if (!data || !fechaConsultada) return;
    const rows = data.map((item) => ({
      Código: item.material_codigo,
      Nombre: item.material_nombre,
      Categoría: item.categoria ?? "",
      Marca: item.marca ?? "",
      Cantidad: item.cantidad,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Stock");
    XLSX.writeFile(wb, `Stock_${almacenNombre ?? almacenId}_${fechaConsultada}.xlsx`);
  }, [data, fechaConsultada, almacenId, almacenNombre]);

  const displayedData = data
    ? q.trim()
      ? data.filter(
          (item) =>
            item.material_nombre.toLowerCase().includes(q.trim().toLowerCase()) ||
            item.material_codigo.toLowerCase().includes(q.trim().toLowerCase()),
        )
      : data
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-full max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-orange-600" />
            Stock histórico
            {almacenNombre && (
              <span className="text-sm font-normal text-gray-500">— {almacenNombre}</span>
            )}
          </DialogTitle>
          <DialogDescription>
            Consulta la cantidad estimada de materiales en este almacén en una fecha pasada.
            El algoritmo reconstruye el stock revirtiendo los movimientos posteriores a la fecha solicitada.
          </DialogDescription>
        </DialogHeader>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <div className="flex-1">
            <Label className="text-sm font-medium text-gray-700 mb-1 block">Fecha</Label>
            <Input
              type="date"
              value={fecha}
              max={today}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="flex-[2]">
            <Label className="text-sm font-medium text-gray-700 mb-1 block">Buscar material</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Código o nombre..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-10"
                onKeyDown={(e) => e.key === "Enter" && void handleConsultar()}
              />
            </div>
          </div>
          <div className="flex items-end">
            <Button
              onClick={() => void handleConsultar()}
              disabled={loading || !fecha}
              className="bg-orange-600 hover:bg-orange-700 text-white gap-2 whitespace-nowrap"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Consultar
            </Button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Resultados */}
        {displayedData !== null && (
          <div className="flex flex-col min-h-0 flex-1 overflow-hidden">
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <p className="text-sm text-gray-600">
                Stock al <strong>{fechaConsultada}</strong> ·{" "}
                <strong>{displayedData.length}</strong> materiales
                {displayedData.some((d) => d.cantidad === 0) && (
                  <span className="ml-2 text-xs text-gray-400">(incluye materiales con cantidad 0)</span>
                )}
              </p>
              {displayedData.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportExcel}
                  className="gap-1.5 border-green-300 text-green-700 hover:bg-green-50"
                >
                  <Download className="h-4 w-4" />
                  Excel
                </Button>
              )}
            </div>

            {displayedData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
                <PackageSearch className="h-10 w-10 text-gray-300" />
                <p className="text-gray-500 text-sm">
                  No se encontraron materiales con los filtros aplicados.
                </p>
              </div>
            ) : (
              <div className="overflow-y-auto flex-1">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white z-10">
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3 font-semibold text-gray-700">Código</th>
                      <th className="text-left py-2 px-3 font-semibold text-gray-700">Nombre</th>
                      <th className="text-left py-2 px-3 font-semibold text-gray-700 hidden sm:table-cell">Categoría</th>
                      <th className="text-right py-2 px-3 font-semibold text-gray-700">Cantidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedData.map((item, idx) => (
                      <tr
                        key={`${item.almacen_id}-${item.material_id}-${idx}`}
                        className={`border-b border-gray-50 ${item.cantidad === 0 ? "opacity-50" : "hover:bg-orange-50/30"}`}
                      >
                        <td className="py-2 px-3 font-mono text-xs text-gray-600">{item.material_codigo}</td>
                        <td className="py-2 px-3 text-gray-900">{item.material_nombre || "—"}</td>
                        <td className="py-2 px-3 text-gray-500 hidden sm:table-cell text-xs">
                          {item.categoria || "—"}
                        </td>
                        <td className={`py-2 px-3 text-right font-semibold tabular-nums ${item.cantidad > 0 ? "text-gray-900" : "text-gray-400"}`}>
                          {fmtNum(item.cantidad)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Estado inicial (sin consulta) */}
        {displayedData === null && !loading && !error && (
          <div className="flex flex-col items-center justify-center py-10 text-center gap-3 text-gray-400">
            <History className="h-10 w-10" />
            <p className="text-sm">Selecciona una fecha y pulsa <strong>Consultar</strong> para ver el stock histórico.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
