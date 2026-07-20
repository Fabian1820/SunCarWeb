"use client";

import { useEffect, useMemo, useState } from "react";
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
import { Textarea } from "@/components/shared/molecule/textarea";
import { Checkbox } from "@/components/shared/molecule/checkbox";
import { Loader2, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { PagoVentaService } from "@/lib/services/feats/pagos-clientes-ventas/pago-cliente-venta-service";
import type { PagoVenta } from "@/lib/types/feats/pagos-clientes-ventas/pago-cliente-venta-types";

interface RegistrarDevolucionPagoVentaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pago: PagoVenta | null;
  onSuccess?: () => void | Promise<void>;
}

const DENOMINACIONES: Record<string, string[]> = {
  USD: ["100", "50", "20", "10", "5", "1"],
  EUR: ["500", "200", "100", "50", "20", "10", "5"],
  CUP: ["1000", "500", "200", "100", "50", "20", "10", "5", "1"],
};

export function RegistrarDevolucionPagoVentaDialog({
  open,
  onOpenChange,
  pago,
  onSuccess,
}: RegistrarDevolucionPagoVentaDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [devolverTodo, setDevolverTodo] = useState(false);
  const [montoDevolucion, setMontoDevolucion] = useState("");
  const [fechaDevolucion, setFechaDevolucion] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [motivo, setMotivo] = useState("");
  const [desgloseBilletes, setDesgloseBilletes] = useState<
    Record<string, number>
  >({});
  const [error, setError] = useState<string | null>(null);

  const totalPago = useMemo(() => Number(pago?.monto || 0), [pago?.monto]);
  const monedaPago = pago?.moneda || "USD";
  const esEfectivo = pago?.metodo_pago === "efectivo";
  const montoYaDevueltoUsd = Math.max(0, Number(pago?.monto_devuelto_usd) || 0);
  const montoYaDevueltoOriginal = useMemo(() => {
    if (montoYaDevueltoUsd <= 0) return 0;
    if (monedaPago === "USD") return montoYaDevueltoUsd;
    const tasa = Number(pago?.tasa_cambio);
    return tasa > 0 ? montoYaDevueltoUsd / tasa : montoYaDevueltoUsd;
  }, [montoYaDevueltoUsd, monedaPago, pago?.tasa_cambio]);
  const disponibleParaDevolver = useMemo(
    () => Math.max(0, Math.round((totalPago - montoYaDevueltoOriginal) * 100) / 100),
    [totalPago, montoYaDevueltoOriginal],
  );

  useEffect(() => {
    setLoading(false);
    setDevolverTodo(false);
    setMontoDevolucion("");
    setFechaDevolucion(new Date().toISOString().slice(0, 10));
    setMotivo("");
    setDesgloseBilletes({});
    setError(null);
  }, [open, pago?.id]);

  const formatCurrency = (value: number, currency: string = "USD") =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency === "EUR" ? "EUR" : "USD",
      minimumFractionDigits: 2,
    }).format(value);

  const parseAmount = (value: string) => {
    const normalized = value.trim().replace(",", ".");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : NaN;
  };

  const actualizarDenominacion = (denominacion: string, cantidad: string) => {
    const cantidadNum = Number.parseInt(cantidad, 10);
    const cantidadNormalizada = Number.isFinite(cantidadNum) ? cantidadNum : 0;
    if (cantidadNormalizada <= 0) {
      const next = { ...desgloseBilletes };
      delete next[denominacion];
      setDesgloseBilletes(next);
      return;
    }
    setDesgloseBilletes({ ...desgloseBilletes, [denominacion]: cantidadNormalizada });
  };

  const handleToggleDevolverTodo = (checked: boolean) => {
    setDevolverTodo(checked);
    if (checked) {
      setMontoDevolucion(disponibleParaDevolver.toFixed(2));
      setError(null);
    }
  };

  const handleSubmit = async () => {
    if (!pago?.id) return;

    if (disponibleParaDevolver <= 0) {
      setError("Este pago ya fue devuelto en su totalidad.");
      return;
    }

    const monto = devolverTodo ? disponibleParaDevolver : parseAmount(montoDevolucion);
    if (!Number.isFinite(monto) || monto <= 0) {
      setError("El monto a devolver debe ser mayor que 0.");
      return;
    }
    if (monto > disponibleParaDevolver) {
      setError(
        `El monto a devolver no puede superar lo disponible para este pago (${formatCurrency(disponibleParaDevolver, monedaPago)}).`,
      );
      return;
    }
    if (motivo.trim().length < 3) {
      setError("Debe indicar un motivo de devolución (mínimo 3 caracteres).");
      return;
    }
    if (!fechaDevolucion) {
      setError("Debe seleccionar la fecha de devolución.");
      return;
    }
    const fechaSeleccionada = new Date(`${fechaDevolucion}T12:00:00`);
    if (Number.isNaN(fechaSeleccionada.getTime())) {
      setError("La fecha de devolución no es válida.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await PagoVentaService.registrarDevolucion({
        pago_venta_id: pago.id,
        monto_devuelto: monto,
        fecha: fechaSeleccionada.toISOString(),
        registrado_por:
          String(user?.nombre || user?.ci || "sistema").trim() || "sistema",
        motivo_devolucion: motivo.trim(),
        desglose_billetes:
          esEfectivo && Object.keys(desgloseBilletes).length > 0
            ? desgloseBilletes
            : undefined,
      });

      toast({
        title: "Devolución registrada",
        description:
          "La devolución del pago se registró correctamente. Si correspondía, la solicitud, la oferta y/o la factura vinculadas se actualizaron.",
      });

      if (onSuccess) await onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "No se pudo registrar la devolución.";
      setError(message);
      toast({
        title: "Error al registrar devolución",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-700">
            <RotateCcw className="h-5 w-5" />
            Registrar devolución al cliente
          </DialogTitle>
          <DialogDescription>
            Registra una devolución parcial o total del pago seleccionado. Si el
            pago pertenece a una solicitud u oferta vinculada, o a una factura,
            esos registros se actualizan automáticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
            <p className="text-sm text-amber-800">
              <span className="font-semibold">Total del pago:</span>{" "}
              {formatCurrency(totalPago, monedaPago)} {monedaPago}
            </p>
            {montoYaDevueltoUsd > 0 && (
              <p className="mt-1 text-xs text-amber-700">
                Ya devuelto: {formatCurrency(montoYaDevueltoOriginal, monedaPago)} {monedaPago} — disponible: {formatCurrency(disponibleParaDevolver, monedaPago)} {monedaPago}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="devolver-todo-venta"
              checked={devolverTodo}
              disabled={loading}
              onCheckedChange={(value) => handleToggleDevolverTodo(value === true)}
            />
            <Label htmlFor="devolver-todo-venta" className="cursor-pointer">
              Devolver todo el monto del pago
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="monto-devolucion-venta">
              Monto a devolver ({monedaPago}) <span className="text-red-600">*</span>
            </Label>
            <Input
              id="monto-devolucion-venta"
              type="number"
              min={0}
              max={disponibleParaDevolver}
              step="0.01"
              value={montoDevolucion}
              disabled={loading || devolverTodo}
              onChange={(event) => {
                setMontoDevolucion(event.target.value);
                setError(null);
              }}
              placeholder="0.00"
            />
            <p className="text-xs text-gray-500">
              Máximo permitido: {formatCurrency(disponibleParaDevolver, monedaPago)}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fecha-devolucion-venta">
              Fecha de devolución <span className="text-red-600">*</span>
            </Label>
            <Input
              id="fecha-devolucion-venta"
              type="date"
              value={fechaDevolucion}
              disabled={loading}
              onChange={(event) => {
                setFechaDevolucion(event.target.value);
                setError(null);
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="motivo-devolucion-venta">
              Motivo de devolución <span className="text-red-600">*</span>
            </Label>
            <Textarea
              id="motivo-devolucion-venta"
              value={motivo}
              onChange={(event) => {
                setMotivo(event.target.value);
                setError(null);
              }}
              disabled={loading}
              maxLength={400}
              placeholder="Describa por qué se realiza la devolución..."
              className="min-h-[100px]"
            />
            <p className="text-xs text-gray-500">{motivo.trim().length}/400</p>
          </div>

          {esEfectivo && (
            <div className="space-y-3 rounded-md border border-gray-200 p-3">
              <Label className="text-sm font-medium">
                Desglose de billetes (opcional)
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {(DENOMINACIONES[monedaPago] || []).map((denominacion) => (
                  <div key={denominacion} className="space-y-1">
                    <Label className="text-xs text-gray-600">
                      {denominacion} {monedaPago}
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      value={desgloseBilletes[denominacion] || ""}
                      onChange={(event) =>
                        actualizarDenominacion(denominacion, event.target.value)
                      }
                      placeholder="0"
                      disabled={loading}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Registrando...
              </>
            ) : (
              "Registrar devolución"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
