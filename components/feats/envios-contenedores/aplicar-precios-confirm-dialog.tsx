"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
import { Button } from "@/components/shared/atom/button";
import { Input } from "@/components/shared/molecule/input";
import { AlertTriangle, ArrowRight, CheckCircle2, Loader2, Save } from "lucide-react";

export interface CambioMaterialPrecio {
  material_id: string;
  material_codigo: string;
  material_nombre: string;
  cantidad: number;
  // Valores actuales del catálogo (antes)
  costo_actual: number;
  precio_venta_actual: number;
  precio_instaladora_actual: number;
  porciento_rebajable_venta_actual: number;
  // Valores a aplicar (editables en el dialog)
  costo_nuevo: number;
  precio_venta_nuevo: number;
  precio_instaladora_nuevo: number;
  porciento_rebajable_venta_nuevo: number;
  // Otros campos necesarios para el payload
  precio_unitario_cif: number;
  porciento_recargo: number;
  precio_venta_sugerido: number;
  precio_instaladora_sugerido: number;
}

interface AplicarPreciosConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cambios: CambioMaterialPrecio[];
  onConfirm: (cambiosEditados: CambioMaterialPrecio[]) => Promise<void> | void;
  loading?: boolean;
}

const fmt = (n: number, decimals = 2) =>
  n.toLocaleString("es-ES", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

// Ocultar los spin buttons del input type="number" para que no tapen el valor digitado
const NO_SPIN =
  "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0 [&::-webkit-outer-spin-button]:m-0";

const hayCambio = (anterior: number, nuevo: number) => Math.abs(anterior - nuevo) > 0.0001;

export function AplicarPreciosConfirmDialog({
  open,
  onOpenChange,
  cambios,
  onConfirm,
  loading = false,
}: AplicarPreciosConfirmDialogProps) {
  const [editados, setEditados] = useState<CambioMaterialPrecio[]>([]);
  const [soloCambios, setSoloCambios] = useState(true);

  useEffect(() => {
    if (open) {
      setEditados(cambios.map((c) => ({ ...c })));
      setSoloCambios(true);
    }
  }, [open, cambios]);

  const updateValor = (
    material_id: string,
    campo: "costo_nuevo" | "precio_venta_nuevo" | "precio_instaladora_nuevo" | "porciento_rebajable_venta_nuevo",
    valor: number,
  ) => {
    setEditados((prev) =>
      prev.map((c) => (c.material_id === material_id ? { ...c, [campo]: valor } : c)),
    );
  };

  const filasMostradas = useMemo(() => {
    if (!soloCambios) return editados;
    return editados.filter((c) => {
      const cambio =
        hayCambio(c.costo_actual, c.costo_nuevo) ||
        hayCambio(c.precio_venta_actual, c.precio_venta_nuevo) ||
        hayCambio(c.precio_instaladora_actual, c.precio_instaladora_nuevo) ||
        hayCambio(c.porciento_rebajable_venta_actual, c.porciento_rebajable_venta_nuevo);
      return cambio;
    });
  }, [editados, soloCambios]);

  const totalCambios = useMemo(() => {
    return editados.filter((c) => {
      return (
        hayCambio(c.costo_actual, c.costo_nuevo) ||
        hayCambio(c.precio_venta_actual, c.precio_venta_nuevo) ||
        hayCambio(c.precio_instaladora_actual, c.precio_instaladora_nuevo) ||
        hayCambio(c.porciento_rebajable_venta_actual, c.porciento_rebajable_venta_nuevo)
      );
    }).length;
  }, [editados]);

  const handleConfirm = async () => {
    await onConfirm(editados);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[92vh] overflow-hidden p-0 gap-0 flex flex-col">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-gray-100 bg-amber-50 rounded-t-lg shrink-0">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-100 shrink-0">
              <AlertTriangle className="h-5 w-5 text-amber-700" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-base font-semibold text-gray-900">
                Confirmar aplicación de precios al catálogo
              </DialogTitle>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                Al confirmar, los siguientes valores se actualizarán en el catálogo de productos.
                Puedes ajustar los valores nuevos directamente desde aquí antes de guardar.
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Resumen + filtro */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-medium text-gray-700">
                {totalCambios} de {editados.length} material{editados.length !== 1 ? "es" : ""} con cambios
              </span>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={soloCambios}
              onChange={(e) => setSoloCambios(e.target.checked)}
              className="rounded border-gray-300"
            />
            Mostrar solo materiales con cambios
          </label>
        </div>

        {/* Tabla */}
        <div className="flex-1 overflow-auto px-6 py-4">
          {filasMostradas.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-sm">
                {soloCambios
                  ? "No hay cambios para aplicar al catálogo."
                  : "No hay materiales en este envío."}
              </p>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th rowSpan={2} className="text-left py-2.5 px-3 text-xs font-semibold text-gray-600 uppercase tracking-wide border-r border-gray-200 w-[24%]">
                      Material
                    </th>
                    <th colSpan={2} className="text-center py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide border-r border-gray-200 bg-slate-50">
                      Costo
                    </th>
                    <th colSpan={2} className="text-center py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide border-r border-gray-200 bg-cyan-50">
                      Precio venta
                    </th>
                    <th colSpan={2} className="text-center py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide border-r border-gray-200 bg-emerald-50">
                      Precio instaladora
                    </th>
                    <th colSpan={2} className="text-center py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-amber-50">
                      % Rebajable
                    </th>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <th className="text-center py-1.5 px-2 text-xs font-medium text-gray-400 bg-slate-50">Antes</th>
                    <th className="text-center py-1.5 px-2 text-xs font-medium text-gray-600 bg-slate-50 border-r border-gray-200">Nuevo</th>
                    <th className="text-center py-1.5 px-2 text-xs font-medium text-gray-400 bg-cyan-50">Antes</th>
                    <th className="text-center py-1.5 px-2 text-xs font-medium text-gray-600 bg-cyan-50 border-r border-gray-200">Nuevo</th>
                    <th className="text-center py-1.5 px-2 text-xs font-medium text-gray-400 bg-emerald-50">Antes</th>
                    <th className="text-center py-1.5 px-2 text-xs font-medium text-gray-600 bg-emerald-50 border-r border-gray-200">Nuevo</th>
                    <th className="text-center py-1.5 px-2 text-xs font-medium text-gray-400 bg-amber-50">Antes</th>
                    <th className="text-center py-1.5 px-2 text-xs font-medium text-gray-600 bg-amber-50">Nuevo</th>
                  </tr>
                </thead>
                <tbody>
                  {filasMostradas.map((c, idx) => {
                    const cambioCosto = hayCambio(c.costo_actual, c.costo_nuevo);
                    const cambioVenta = hayCambio(c.precio_venta_actual, c.precio_venta_nuevo);
                    const cambioInst = hayCambio(c.precio_instaladora_actual, c.precio_instaladora_nuevo);
                    const cambioReb = hayCambio(c.porciento_rebajable_venta_actual, c.porciento_rebajable_venta_nuevo);

                    return (
                      <tr
                        key={c.material_id}
                        className={`border-b border-gray-100 last:border-0 hover:bg-gray-50/60 ${
                          idx % 2 === 0 ? "bg-white" : "bg-gray-50/30"
                        }`}
                      >
                        {/* Material */}
                        <td className="py-3 px-3 border-r border-gray-100">
                          <p className="font-medium text-gray-900 leading-tight">{c.material_nombre}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="font-mono text-xs text-gray-400">{c.material_codigo}</span>
                            <span className="text-xs text-gray-400">· {c.cantidad} uds.</span>
                          </div>
                        </td>

                        {/* Costo Antes */}
                        <td className="py-2.5 px-2 text-center bg-slate-50/40">
                          {c.costo_actual > 0
                            ? <span className="text-xs text-gray-500">${fmt(c.costo_actual)}</span>
                            : <span className="text-xs text-gray-300">—</span>}
                        </td>
                        {/* Costo Nuevo (editable) */}
                        <td className="py-2.5 px-2 bg-slate-50/40 border-r border-gray-100">
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-xs text-gray-400">$</span>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              className={`h-7 text-xs text-right w-20 font-semibold ${
                                cambioCosto ? "border-amber-300 text-amber-700" : ""
                              }`}
                              value={parseFloat(c.costo_nuevo.toFixed(4)) || ""}
                              onChange={(e) => updateValor(c.material_id, "costo_nuevo", parseFloat(e.target.value) || 0)}
                            />
                          </div>
                          {cambioCosto && c.costo_actual > 0 && (
                            <p className={`text-xs font-medium mt-0.5 text-center ${c.costo_nuevo >= c.costo_actual ? "text-emerald-600" : "text-red-500"}`}>
                              {c.costo_nuevo >= c.costo_actual ? "+" : ""}{fmt(((c.costo_nuevo - c.costo_actual) / c.costo_actual) * 100, 1)}%
                            </p>
                          )}
                        </td>

                        {/* P. Venta Antes */}
                        <td className="py-2.5 px-2 text-center bg-cyan-50/40">
                          {c.precio_venta_actual > 0
                            ? <span className="text-xs text-gray-500">${fmt(c.precio_venta_actual)}</span>
                            : <span className="text-xs text-gray-300">—</span>}
                        </td>
                        {/* P. Venta Nuevo (editable) */}
                        <td className="py-2.5 px-2 bg-cyan-50/40 border-r border-gray-100">
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-xs text-gray-400">$</span>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              className={`h-7 text-xs text-right w-20 font-semibold ${
                                cambioVenta ? "border-cyan-300 text-cyan-700" : ""
                              }`}
                              value={parseFloat(c.precio_venta_nuevo.toFixed(4)) || ""}
                              onChange={(e) => updateValor(c.material_id, "precio_venta_nuevo", parseFloat(e.target.value) || 0)}
                            />
                          </div>
                          {cambioVenta && c.precio_venta_actual > 0 && (
                            <p className={`text-xs font-medium mt-0.5 text-center ${c.precio_venta_nuevo >= c.precio_venta_actual ? "text-emerald-600" : "text-red-500"}`}>
                              {c.precio_venta_nuevo >= c.precio_venta_actual ? "+" : ""}{fmt(((c.precio_venta_nuevo - c.precio_venta_actual) / c.precio_venta_actual) * 100, 1)}%
                            </p>
                          )}
                        </td>

                        {/* P. Instaladora Antes */}
                        <td className="py-2.5 px-2 text-center bg-emerald-50/40">
                          {c.precio_instaladora_actual > 0
                            ? <span className="text-xs text-gray-500">${fmt(c.precio_instaladora_actual)}</span>
                            : <span className="text-xs text-gray-300">—</span>}
                        </td>
                        {/* P. Instaladora Nuevo (editable) */}
                        <td className="py-2.5 px-2 bg-emerald-50/40 border-r border-gray-100">
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-xs text-gray-400">$</span>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              className={`h-7 text-xs text-right w-20 font-semibold ${
                                cambioInst ? "border-emerald-300 text-emerald-700" : ""
                              }`}
                              value={parseFloat(c.precio_instaladora_nuevo.toFixed(4)) || ""}
                              onChange={(e) => updateValor(c.material_id, "precio_instaladora_nuevo", parseFloat(e.target.value) || 0)}
                            />
                          </div>
                          {cambioInst && c.precio_instaladora_actual > 0 && (
                            <p className={`text-xs font-medium mt-0.5 text-center ${c.precio_instaladora_nuevo >= c.precio_instaladora_actual ? "text-emerald-600" : "text-red-500"}`}>
                              {c.precio_instaladora_nuevo >= c.precio_instaladora_actual ? "+" : ""}{fmt(((c.precio_instaladora_nuevo - c.precio_instaladora_actual) / c.precio_instaladora_actual) * 100, 1)}%
                            </p>
                          )}
                        </td>

                        {/* % Rebajable Antes */}
                        <td className="py-2.5 px-2 text-center bg-amber-50/40">
                          <span className="text-xs text-gray-500">{fmt(c.porciento_rebajable_venta_actual, 1)}%</span>
                        </td>
                        {/* % Rebajable Nuevo (editable) */}
                        <td className="py-2.5 px-2 bg-amber-50/40">
                          <div className="flex items-center justify-center gap-1">
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="0.5"
                              className={`h-7 text-xs text-right w-14 font-semibold ${
                                cambioReb ? "border-amber-400 text-amber-700" : ""
                              }`}
                              value={c.porciento_rebajable_venta_nuevo}
                              onChange={(e) => updateValor(c.material_id, "porciento_rebajable_venta_nuevo", parseFloat(e.target.value) || 0)}
                            />
                            <span className="text-xs text-gray-400">%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-lg flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <ArrowRight className="h-3 w-3" />
            Esta acción actualiza los precios en el catálogo global de productos.
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="px-5"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={loading || editados.length === 0}
              className="px-5 bg-cyan-600 hover:bg-cyan-700 text-white gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Confirmar y aplicar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
