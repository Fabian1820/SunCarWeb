"use client";

import { useEffect, useState } from "react";
import { ArrowRightLeft, DollarSign, Layers, Loader2, Package } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
import { Button } from "@/components/shared/atom/button";
import { Input } from "@/components/shared/molecule/input";
import { Label } from "@/components/shared/atom/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select";
import type {
  PoolStockKey,
  StockPools,
} from "@/lib/types/feats/inventario/inventario-types";
import { POOLS_STOCK, POOL_STOCK_LABELS } from "@/lib/types/feats/inventario/inventario-types";
import { InventarioService, KardexCostoService } from "@/lib/api-services";
import { useToast } from "@/hooks/use-toast";

interface PoolsDistributionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Nombre o código del material (para el subtítulo) */
  titulo: string;
  /** Almacén o contexto secundario (ej: "Almacén Mariel") */
  contexto?: string;
  pools: StockPools | undefined;
  /**
   * Cantidad total real (StockItem.cantidad). Útil cuando pools no viene del
   * backend o vienen en 0 pero el material tiene stock — para no mostrar 0
   * como total cuando en realidad hay stock sin distribuir.
   */
  cantidadTotal?: number;
  /** Unidad de medida opcional para mostrar al lado de cada cantidad */
  um?: string;
  /** Mostrar "reservada" además de "cantidad" */
  mostrarReserva?: boolean;
  /**
   * Si están definidos los tres (material_id, almacen_id, onTraspasoCompleto),
   * se habilita el botón "Transferir entre pools" que envía POST
   * /api/inventario/movimientos con tipo=traspaso_sector.
   */
  material_id?: string;
  almacen_id?: string;
  onTraspasoCompleto?: () => void | Promise<void>;
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
  cantidadTotal,
  um,
  mostrarReserva = false,
  material_id,
  almacen_id,
  onTraspasoCompleto,
}: PoolsDistributionDialogProps) {
  const { toast } = useToast();
  const habilitarTraspaso = Boolean(material_id && almacen_id && onTraspasoCompleto);

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

  // ── Sub-form de traspaso ────────────────────────────────────────────────
  const [mostrarForm, setMostrarForm] = useState(false);
  const [poolOrigen, setPoolOrigen] = useState<PoolStockKey>("indistinto");
  const [poolDestino, setPoolDestino] = useState<PoolStockKey>("instaladora");
  const [cantidad, setCantidad] = useState<string>("");
  const [motivo, setMotivo] = useState<string>("");
  const [enviando, setEnviando] = useState(false);

  // ── Costo por almacén (kardex) ──────────────────────────────────────────
  // Una llamada por apertura: GET /api/kardex-costo/costo-actual?material_id=&almacen_id=
  // Devuelve el costo específico de este (material, almacén). Distinto al
  // del catálogo, que es promedio global entre todos los almacenes.
  const [costoAlmacen, setCostoAlmacen] = useState<number | null | undefined>(undefined);
  const [costoLoading, setCostoLoading] = useState(false);

  // Reset al abrir/cerrar el dialog principal
  useEffect(() => {
    if (!open) {
      setMostrarForm(false);
      setCantidad("");
      setMotivo("");
      setCostoAlmacen(undefined);
      setCostoLoading(false);
      return;
    }
    // Default: origen = primer pool con cantidad > 0; destino = el siguiente
    if (pools) {
      const primero = POOLS_STOCK.find((p) => pools[p].cantidad > 0) ?? "indistinto";
      const otro = POOLS_STOCK.find((p) => p !== primero) ?? "instaladora";
      setPoolOrigen(primero);
      setPoolDestino(otro);
    }
    // Fetch del costo por almacén si tenemos los ids
    if (material_id && almacen_id) {
      setCostoLoading(true);
      KardexCostoService.getCostoActual(material_id, almacen_id)
        .then((r) => setCostoAlmacen(r?.costo_actual ?? null))
        .catch(() => setCostoAlmacen(null))
        .finally(() => setCostoLoading(false));
    } else {
      setCostoAlmacen(undefined);
    }
  }, [open, pools, material_id, almacen_id]);

  // Cuando cambia origen, asegurarse que destino sea distinto
  useEffect(() => {
    if (poolDestino === poolOrigen) {
      const otro = POOLS_STOCK.find((p) => p !== poolOrigen) ?? "instaladora";
      setPoolDestino(otro);
    }
  }, [poolOrigen, poolDestino]);

  const disponibleOrigen = pools ? pools[poolOrigen].cantidad : 0;
  const cantidadNum = Number(cantidad);
  const cantidadInvalida =
    !Number.isFinite(cantidadNum) ||
    cantidadNum <= 0 ||
    cantidadNum > disponibleOrigen;

  const handleTraspasar = async () => {
    if (!material_id || !almacen_id || !onTraspasoCompleto) return;
    if (cantidadInvalida || poolOrigen === poolDestino) return;
    setEnviando(true);
    try {
      await InventarioService.createMovimiento({
        tipo: "traspaso_sector",
        material_id,
        almacen_origen_id: almacen_id,
        cantidad: cantidadNum,
        pool_origen: poolOrigen,
        pool_destino: poolDestino,
        motivo: motivo.trim() || undefined,
      });
      toast({
        title: "Traspaso aplicado",
        description: `${cantidadNum}${um ? ` ${um}` : ""} movidos de ${POOL_STOCK_LABELS[poolOrigen]} a ${POOL_STOCK_LABELS[poolDestino]}.`,
      });
      setMostrarForm(false);
      setCantidad("");
      setMotivo("");
      await onTraspasoCompleto();
    } catch (e) {
      toast({
        title: "Error al traspasar",
        description: e instanceof Error ? e.message : "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && enviando) return; onOpenChange(o); }}>
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
          {/* Costo por almacén (kardex). Solo si tenemos los ids; el dialog
              "modo info" sin material_id/almacen_id no lo muestra. */}
          {material_id && almacen_id && (
            <div className="rounded-lg border border-violet-200 bg-violet-50/40 px-4 py-3 flex items-center gap-3">
              <div className="p-1.5 rounded-md bg-violet-100 shrink-0">
                <DollarSign className="h-3.5 w-3.5 text-violet-700" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-wide font-semibold text-violet-700">
                  Costo en este almacén
                </p>
                {costoLoading ? (
                  <div className="flex items-center gap-1.5 text-xs text-violet-500">
                    <Loader2 className="h-3 w-3 animate-spin" /> Cargando...
                  </div>
                ) : costoAlmacen != null ? (
                  <p className="text-lg font-bold text-violet-900 leading-tight">
                    ${costoAlmacen.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                ) : (
                  <p className="text-xs text-gray-400">
                    Sin kardex en este almacén todavía
                  </p>
                )}
              </div>
              <p className="text-[10px] text-gray-400 text-right max-w-[140px] leading-tight shrink-0">
                Promedio ponderado de entradas en este almacén
              </p>
            </div>
          )}

          {sinPools ? (
            <div className="rounded-lg border border-dashed border-gray-200 py-6 px-4 text-center space-y-2">
              <Package className="h-8 w-8 text-gray-300 mx-auto" />
              <p className="text-sm text-gray-500">Sin distribución por pool todavía.</p>
              {((cantidadTotal ?? totales.cantidad) > 0) && (
                <p className="text-xs text-gray-400">
                  Stock total: <strong className="text-gray-700">{cantidadTotal ?? totales.cantidad}{um ? ` ${um}` : ""}</strong>
                </p>
              )}
              <p className="text-[11px] text-gray-400">
                Los pools se llenan al aprobar solicitudes de entrada al almacén con el split correspondiente. Mientras tanto este stock se considera Indistinto.
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

              {/* Botón "Transferir" condicional */}
              {habilitarTraspaso && !mostrarForm && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setMostrarForm(true)}
                  className="w-full gap-2 border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                >
                  <ArrowRightLeft className="h-4 w-4" />
                  Transferir entre pools
                </Button>
              )}

              {/* Sub-form de traspaso */}
              {habilitarTraspaso && mostrarForm && (
                <div className="rounded-lg border border-indigo-200 bg-indigo-50/40 p-4 space-y-3">
                  <p className="text-xs font-semibold text-indigo-800 uppercase tracking-wide">
                    Transferir entre pools
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[11px] text-gray-600">Pool origen</Label>
                      <Select value={poolOrigen} onValueChange={(v) => setPoolOrigen(v as PoolStockKey)} disabled={enviando}>
                        <SelectTrigger className="h-9 bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {POOLS_STOCK.map((p) => (
                            <SelectItem key={p} value={p}>
                              {POOL_STOCK_LABELS[p]} ({pools![p].cantidad})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-gray-600">Pool destino</Label>
                      <Select value={poolDestino} onValueChange={(v) => setPoolDestino(v as PoolStockKey)} disabled={enviando}>
                        <SelectTrigger className="h-9 bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {POOLS_STOCK.filter((p) => p !== poolOrigen).map((p) => (
                            <SelectItem key={p} value={p}>
                              {POOL_STOCK_LABELS[p]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] text-gray-600">
                      Cantidad
                      <span className="text-gray-400 font-normal ml-1">
                        (máx {disponibleOrigen}{um ? ` ${um}` : ""})
                      </span>
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      max={disponibleOrigen}
                      step="any"
                      value={cantidad}
                      onChange={(e) => setCantidad(e.target.value)}
                      placeholder="0"
                      disabled={enviando}
                      className="h-9 bg-white"
                    />
                    {cantidad && cantidadInvalida && cantidadNum > disponibleOrigen && (
                      <p className="text-[10px] text-red-600">
                        No podés transferir más que lo disponible en {POOL_STOCK_LABELS[poolOrigen]} ({disponibleOrigen}).
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] text-gray-600">
                      Motivo <span className="text-gray-400 font-normal">(opcional)</span>
                    </Label>
                    <Input
                      type="text"
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                      placeholder="Ej: reasignar reserva..."
                      disabled={enviando}
                      className="h-9 bg-white"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setMostrarForm(false)}
                      disabled={enviando}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleTraspasar}
                      disabled={enviando || cantidadInvalida || poolOrigen === poolDestino}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                    >
                      {enviando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRightLeft className="h-3.5 w-3.5" />}
                      Aplicar traspaso
                    </Button>
                  </div>
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
