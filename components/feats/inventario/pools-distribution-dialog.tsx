"use client";

import { Layers, Package } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
import type { StockPools } from "@/lib/types/feats/inventario/inventario-types";
import { POOLS_STOCK, POOL_STOCK_LABELS } from "@/lib/types/feats/inventario/inventario-types";

interface PoolsDistributionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Nombre o código del material (para el subtítulo) */
  titulo: string;
  /** Almacén o contexto secundario (ej: "Almacén Mariel") */
  contexto?: string;
  pools: StockPools | undefined;
  /** Unidad de medida opcional para mostrar al lado de cada cantidad */
  um?: string;
  /** Mostrar "reservada" además de "cantidad" */
  mostrarReserva?: boolean;
}

const COLORS: Record<keyof StockPools, { bar: string; bg: string; text: string; ring: string }> = {
  indistinto:  { bar: "bg-emerald-500", bg: "bg-emerald-50",  text: "text-emerald-700", ring: "ring-emerald-200" },
  instaladora: { bar: "bg-blue-500",    bg: "bg-blue-50",     text: "text-blue-700",    ring: "ring-blue-200" },
  ventas:      { bar: "bg-amber-500",   bg: "bg-amber-50",    text: "text-amber-700",   ring: "ring-amber-200" },
};

export function PoolsDistributionDialog({
  open,
  onOpenChange,
  titulo,
  contexto,
  pools,
  um,
  mostrarReserva = false,
}: PoolsDistributionDialogProps) {
  const sinPools = !pools || POOLS_STOCK.every((p) => pools[p].cantidad === 0);

  const totales = pools
    ? POOLS_STOCK.reduce(
        (acc, p) => {
          acc.cantidad += pools[p].cantidad;
          acc.reservada += pools[p].cantidad_reservada;
          return acc;
        },
        { cantidad: 0, reservada: 0 },
      )
    : { cantidad: 0, reservada: 0 };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0">
        <DialogHeader className="px-5 py-4 border-b border-gray-100 bg-gray-50 rounded-t-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-100 shrink-0">
              <Layers className="h-4 w-4 text-indigo-700" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-sm font-semibold text-gray-900 truncate">
                Distribución por pool
              </DialogTitle>
              <p className="text-xs text-gray-500 mt-0.5 truncate">
                <span className="font-medium text-gray-700">{titulo}</span>
                {contexto && <> · {contexto}</>}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="px-5 py-5 space-y-4">
          {sinPools ? (
            <div className="rounded-lg border border-dashed border-gray-200 py-8 text-center">
              <Package className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Sin distribución por pool todavía.</p>
              <p className="text-xs text-gray-400 mt-1">
                Los pools se llenan al aprobar solicitudes de entrada al almacén.
              </p>
            </div>
          ) : (
            <>
              {/* Resumen total */}
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 flex items-baseline justify-between">
                <span className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Total</span>
                <span className="text-2xl font-bold text-gray-900">
                  {totales.cantidad}
                  {um && <span className="text-sm font-medium text-gray-500 ml-1">{um}</span>}
                </span>
              </div>

              {/* Barra de distribución */}
              <div className="space-y-1">
                <div className="flex h-2 rounded-full overflow-hidden bg-gray-100">
                  {POOLS_STOCK.map((p) => {
                    const c = pools![p].cantidad;
                    if (c === 0) return null;
                    const pct = totales.cantidad > 0 ? (c / totales.cantidad) * 100 : 0;
                    return (
                      <div
                        key={p}
                        className={COLORS[p].bar}
                        style={{ width: `${pct}%` }}
                        title={`${POOL_STOCK_LABELS[p]}: ${c}`}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Cards por pool */}
              <div className="grid grid-cols-1 gap-2">
                {POOLS_STOCK.map((p) => {
                  const info = pools![p];
                  const pct = totales.cantidad > 0 ? Math.round((info.cantidad / totales.cantidad) * 100) : 0;
                  const c = COLORS[p];
                  return (
                    <div
                      key={p}
                      className={`rounded-lg border border-gray-200 px-4 py-3 flex items-center justify-between ${c.bg}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`h-2 w-2 rounded-full ${c.bar}`} />
                        <div className="min-w-0">
                          <p className={`text-sm font-semibold ${c.text}`}>{POOL_STOCK_LABELS[p]}</p>
                          <p className="text-[10px] text-gray-500">{pct}% del total</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-bold ${c.text}`}>
                          {info.cantidad}
                          {um && <span className="text-xs font-medium text-gray-500 ml-1">{um}</span>}
                        </p>
                        {mostrarReserva && info.cantidad_reservada > 0 && (
                          <p className="text-[10px] text-amber-700">
                            {info.cantidad_reservada} reservada{info.cantidad_reservada !== 1 ? "s" : ""}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {mostrarReserva && totales.reservada > 0 && (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 flex items-center justify-between">
                  <span>Total reservado en todos los pools</span>
                  <span className="font-semibold">{totales.reservada}{um ? ` ${um}` : ""}</span>
                </div>
              )}

              <p className="text-[11px] text-gray-400 leading-relaxed border-t border-gray-100 pt-3">
                <strong className="text-gray-500">Indistinto</strong> disponible para cualquier sector.
                <strong className="text-gray-500"> Instaladora</strong> reservado para vales de instalación.
                <strong className="text-gray-500"> Ventas</strong> reservado para tiendas.
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
