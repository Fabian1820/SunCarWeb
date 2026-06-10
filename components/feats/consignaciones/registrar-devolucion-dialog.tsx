"use client";

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
import { Button } from "@/components/shared/atom/button";
import { Input } from "@/components/shared/molecule/input";
import { Label } from "@/components/shared/atom/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shared/molecule/table";
import { Loader2, AlertCircle } from "lucide-react";
import { SolicitudEntradaAlmacenService } from "@/lib/services/feats/solicitudes-entrada-almacen/solicitud-entrada-almacen-service";
import type { Consignacion } from "@/lib/types/feats/consignaciones/consignacion-types";

interface RegistrarDevolucionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  consignacion: Consignacion | null;
  /** Callback opcional para refrescar la consignación tras crear la solicitud de entrada. */
  onAfterCreated?: (consignacionId: string) => Promise<void> | void;
}

const formatMoney = (n: number, moneda: string) =>
  new Intl.NumberFormat("es-CU", {
    style: "currency",
    currency: moneda || "USD",
    minimumFractionDigits: 2,
  }).format(n || 0);

export function RegistrarDevolucionDialog({
  open,
  onOpenChange,
  consignacion,
  onAfterCreated,
}: RegistrarDevolucionDialogProps) {
  const [cantidades, setCantidades] = useState<Record<string, string>>({});
  const [notas, setNotas] = useState("");
  const [pool, setPool] = useState<"indistinto" | "instaladora" | "ventas">(
    "ventas",
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const moneda = consignacion?.moneda || "USD";

  const pendientes = useMemo(() => {
    if (!consignacion) return [];
    return consignacion.materiales_entregados.map((m) => {
      const devueltoAcum = consignacion.devoluciones
        .flatMap((d) => d.materiales)
        .filter((md) => md.material_id === m.material_id)
        .reduce((acc, md) => acc + md.cantidad, 0);
      return {
        ...m,
        pendiente: Math.max(m.cantidad - devueltoAcum, 0),
      };
    });
  }, [consignacion]);

  const valorTotalPreview = useMemo(() => {
    return pendientes.reduce((acc, p) => {
      const v = parseFloat(cantidades[p.material_id] || "0");
      if (!isFinite(v) || v <= 0) return acc;
      return acc + v * p.precio_unitario_consignado;
    }, 0);
  }, [pendientes, cantidades]);

  const handleClose = (next: boolean) => {
    if (!next) {
      setCantidades({});
      setNotas("");
      setPool("ventas");
      setError(null);
    }
    onOpenChange(next);
  };

  const handleSubmit = async () => {
    if (!consignacion) return;
    if (!consignacion.almacen_id) {
      setError(
        "La consignación no tiene almacén asociado. No se puede registrar entrada al stock.",
      );
      return;
    }

    const lineas = pendientes
      .map((p) => ({
        material: p,
        cantidad_total: parseFloat(cantidades[p.material_id] || "0"),
      }))
      .filter((l) => isFinite(l.cantidad_total) && l.cantidad_total > 0);

    if (lineas.length === 0) {
      setError("Debes indicar al menos una cantidad a devolver");
      return;
    }
    for (const l of lineas) {
      if (l.cantidad_total - l.material.pendiente > 1e-6) {
        setError(
          `No puedes devolver ${l.cantidad_total} de ${l.material.material_codigo || l.material.material_id}: pendiente ${l.material.pendiente}`,
        );
        return;
      }
    }

    setSubmitting(true);
    setError(null);
    try {
      // Crear la SolicitudEntradaAlmacen con origen=consignacion.
      // El backend setea costo_unitario al precio congelado de la consignación.
      // Al aprobarla (flujo de almacén) se generan movimientos + kardex y
      // se registra automáticamente la devolución en la consignación.
      const materiales = lineas.map((l) => ({
        material_id: l.material.material_id,
        material_codigo: l.material.material_codigo || l.material.material_id,
        material_nombre:
          l.material.material_descripcion ||
          l.material.material_codigo ||
          l.material.material_id,
        cantidad_total: l.cantidad_total,
        split: {
          indistinto: pool === "indistinto" ? l.cantidad_total : 0,
          instaladora: pool === "instaladora" ? l.cantidad_total : 0,
          ventas: pool === "ventas" ? l.cantidad_total : 0,
        },
      }));

      await SolicitudEntradaAlmacenService.createSolicitud({
        origen: "consignacion",
        consignacion_id: consignacion.id,
        almacen_id: consignacion.almacen_id,
        materiales,
      } as any);

      if (onAfterCreated) await onAfterCreated(consignacion.id);
      handleClose(false);
    } catch (e: any) {
      setError(e?.message || "No se pudo registrar la devolución");
    } finally {
      setSubmitting(false);
    }
  };

  if (!consignacion) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar devolución</DialogTitle>
          <DialogDescription>
            Se creará una <b>solicitud de entrada al almacén</b> con los
            materiales que devuelve el cliente. Cuando se apruebe desde el
            módulo de almacén se actualiza el stock y la devolución se aplica
            a la consignación (al precio congelado).
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material</TableHead>
                <TableHead className="text-right">Entregado</TableHead>
                <TableHead className="text-right">Pendiente</TableHead>
                <TableHead className="text-right">Precio cong.</TableHead>
                <TableHead className="w-32 text-right">A devolver</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendientes.map((p) => (
                <TableRow key={p.material_id}>
                  <TableCell>
                    <div className="text-sm font-medium">
                      {p.material_descripcion ?? p.material_id}
                    </div>
                    <div className="text-xs text-gray-500">
                      {p.material_codigo}
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {p.cantidad}
                  </TableCell>
                  <TableCell className="text-right text-sm font-semibold">
                    {p.pendiente}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {formatMoney(p.precio_unitario_consignado, moneda)}
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      max={p.pendiente}
                      step="0.01"
                      value={cantidades[p.material_id] ?? ""}
                      onChange={(e) =>
                        setCantidades((prev) => ({
                          ...prev,
                          [p.material_id]: e.target.value,
                        }))
                      }
                      disabled={submitting || p.pendiente <= 0}
                      placeholder="0"
                      className="text-right"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Pool de destino (almacén)</Label>
            <div className="mt-1 flex gap-2">
              {(["ventas", "instaladora", "indistinto"] as const).map((k) => (
                <button
                  type="button"
                  key={k}
                  onClick={() => setPool(k)}
                  disabled={submitting}
                  className={`flex-1 rounded-md border px-3 py-1.5 text-xs font-medium capitalize transition ${
                    pool === k
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label htmlFor="notas-dev">Notas (opcional)</Label>
            <Input
              id="notas-dev"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Motivo, condición de la mercancía…"
              disabled={submitting}
            />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border bg-purple-50 p-3">
          <span className="text-sm text-purple-700">
            Valor estimado de la devolución
          </span>
          <span className="text-lg font-semibold text-purple-800">
            {formatMoney(valorTotalPreview, moneda)}
          </span>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Crear solicitud de entrada
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
