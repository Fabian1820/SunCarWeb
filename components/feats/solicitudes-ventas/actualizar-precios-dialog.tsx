"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/shared/molecule/dialog";
import { Button } from "@/components/shared/atom/button";
import { Input } from "@/components/shared/molecule/input";
import { Label } from "@/components/shared/atom/label";
import { SolicitudVentaService } from "@/lib/services/feats/solicitudes-ventas/solicitud-venta-service";
import type { SolicitudVenta, SolicitudVentaSummary } from "@/lib/api-types";
import { DollarSign, Loader2 } from "lucide-react";

type SolicitudRow = SolicitudVenta | SolicitudVentaSummary;

interface MaterialRow {
  material_id: string;
  nombre: string;
  cantidad: number;
  precio: string;        // input libre
  descuento_porcentaje?: number;
}

interface ActualizarPreciosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  solicitud: SolicitudRow | null;
  onSuccess?: () => void;
}

const getClienteNombre = (s: SolicitudRow) =>
  (s as SolicitudVenta).cliente_venta?.nombre ??
  (s as SolicitudVentaSummary).cliente_venta_nombre ??
  "—";

export function ActualizarPreciosDialog({
  open,
  onOpenChange,
  solicitud,
  onSuccess,
}: ActualizarPreciosDialogProps) {
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [saving, setSaving]                 = useState(false);
  const [rows, setRows]                     = useState<MaterialRow[]>([]);
  const [error, setError]                   = useState<string | null>(null);

  // Cargar materiales con precios completos al abrir
  useEffect(() => {
    if (!open || !solicitud) return;
    setError(null);
    setRows([]);
    setLoadingDetalle(true);

    SolicitudVentaService.getSolicitudById(solicitud.id)
      .then((detalle) => {
        const mats = (detalle as SolicitudVenta)?.materiales ?? [];
        if (!mats.length) {
          setError("Esta solicitud no tiene materiales.");
          return;
        }
        setRows(
          mats.map((m) => ({
            material_id:         (m as Record<string, unknown>).material_id as string ?? (m as Record<string, unknown>).id as string ?? "",
            nombre:              (m as Record<string, unknown>).material_descripcion as string ??
                                 (m as Record<string, unknown>).descripcion as string ??
                                 (m as Record<string, unknown>).nombre as string ??
                                 String((m as Record<string, unknown>).material_id ?? "Material"),
            cantidad:            Number((m as Record<string, unknown>).cantidad ?? 1),
            precio:              (m as Record<string, unknown>).precio != null
                                   ? String((m as Record<string, unknown>).precio)
                                   : "",
            descuento_porcentaje: (m as Record<string, unknown>).descuento_porcentaje as number | undefined,
          })),
        );
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Error al cargar materiales"))
      .finally(() => setLoadingDetalle(false));
  }, [open, solicitud]);

  const handlePrecioChange = (idx: number, value: string) => {
    setRows((prev) => prev.map((r, i) => i === idx ? { ...r, precio: value } : r));
  };

  const handleSave = async () => {
    if (!solicitud) return;
    setError(null);

    for (const r of rows) {
      const p = Number(r.precio);
      if (r.precio.trim() === "") continue;
      if (isNaN(p) || p < 0) {
        setError(`Precio inválido en "${r.nombre}"`);
        return;
      }
    }

    setSaving(true);
    try {
      const materiales = rows.map((r) => ({
        material_id:          r.material_id,
        cantidad:             r.cantidad,
        // Precio manual libre — no enviar descuento_porcentaje para que el
        // backend no aplique restricciones de mínimo de descuento.
        ...(r.precio.trim() !== "" ? { precio: Number(r.precio) } : {}),
        descuento_porcentaje: 0,
      }));

      await SolicitudVentaService.patchSolicitud(solicitud.id, { materiales });
      onSuccess?.();
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  if (!solicitud) return null;

  const codigo  = (solicitud as SolicitudVenta).codigo ?? solicitud.id.slice(-8).toUpperCase();
  const cliente = getClienteNombre(solicitud);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-amber-600" />
            Actualizar precios
          </DialogTitle>
          <DialogDescription>
            <span className="font-medium text-gray-800">{codigo}</span> — {cliente}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          {loadingDetalle && (
            <div className="flex items-center gap-2 text-sm text-gray-500 py-4 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando materiales…
            </div>
          )}

          {!loadingDetalle && rows.length > 0 && (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {rows.map((r, idx) => (
                <div key={r.material_id + idx} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                  <Label className="text-xs text-gray-500 mb-1 block">
                    {r.nombre}
                    <span className="ml-2 text-gray-400">× {r.cantidad}</span>
                  </Label>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-sm">$</span>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={r.precio}
                      onChange={(e) => handlePrecioChange(idx, e.target.value)}
                      placeholder="0.00"
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </p>
          )}

          {!loadingDetalle && (
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
                onClick={handleSave}
                disabled={saving || rows.length === 0}
              >
                {saving ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" />Guardando…</>
                ) : (
                  "Guardar precios"
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
