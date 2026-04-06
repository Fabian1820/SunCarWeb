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
import {
  PagoService,
  type Pago,
} from "@/lib/services/feats/pagos/pago-service";

interface RegistrarDevolucionPagoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pago: Pago | null;
  codigoCliente: string | null;
  onSuccess?: () => void | Promise<void>;
}

export function RegistrarDevolucionPagoDialog({
  open,
  onOpenChange,
  pago,
  codigoCliente,
  onSuccess,
}: RegistrarDevolucionPagoDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [devolverTodo, setDevolverTodo] = useState(false);
  const [esTransferencia, setEsTransferencia] = useState(false);
  const [montoDevolucion, setMontoDevolucion] = useState("");
  const [fechaDevolucion, setFechaDevolucion] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [motivo, setMotivo] = useState("");
  const [numeroCuenta, setNumeroCuenta] = useState("");
  const [titularCuenta, setTitularCuenta] = useState("");
  const [desgloseBilletes, setDesgloseBilletes] = useState<
    Record<string, number>
  >({});
  const [error, setError] = useState<string | null>(null);

  const totalPago = useMemo(() => Number(pago?.monto || 0), [pago?.monto]);
  const monedaPago = pago?.moneda || "USD";
  const canUseTransferenciaDevolucion =
    pago?.metodo_pago === "transferencia_bancaria" ||
    pago?.metodo_pago === "stripe";
  const transferenciaActiva = canUseTransferenciaDevolucion && esTransferencia;

  useEffect(() => {
    if (!open) {
      setLoading(false);
      setDevolverTodo(false);
      setEsTransferencia(false);
      setMontoDevolucion("");
      setFechaDevolucion(new Date().toISOString().slice(0, 10));
      setMotivo("");
      setNumeroCuenta("");
      setTitularCuenta("");
      setDesgloseBilletes({});
      setError(null);
      return;
    }

    setLoading(false);
    setDevolverTodo(false);
    setEsTransferencia(false);
    setMontoDevolucion("");
    setFechaDevolucion(new Date().toISOString().slice(0, 10));
    setMotivo("");
    setNumeroCuenta("");
    setTitularCuenta("");
    setDesgloseBilletes({});
    setError(null);
  }, [open, pago?.id]);

  const formatCurrency = (value: number, currency: string = "USD") =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(value);

  const parseAmount = (value: string) => {
    const normalized = value.trim().replace(",", ".");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : NaN;
  };

  const getDenominaciones = (moneda: string): string[] => {
    const denominaciones = {
      USD: ["100", "50", "20", "10", "5", "1"],
      EUR: ["500", "200", "100", "50", "20", "10", "5"],
      CUP: ["1000", "500", "200", "100", "50", "20", "10", "5", "1"],
    };
    return denominaciones[moneda as keyof typeof denominaciones] || [];
  };

  const calcularTotalDesglose = (): number => {
    return Object.entries(desgloseBilletes).reduce(
      (total, [denominacion, cantidad]) =>
        total + parseFloat(denominacion) * cantidad,
      0,
    );
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

    setDesgloseBilletes({
      ...desgloseBilletes,
      [denominacion]: cantidadNormalizada,
    });
  };

  const handleToggleDevolverTodo = (checked: boolean) => {
    setDevolverTodo(checked);
    if (checked) {
      setMontoDevolucion(totalPago.toFixed(2));
      setError(null);
    }
  };

  const handleSubmit = async () => {
    if (!pago) return;

    const monto = devolverTodo ? totalPago : parseAmount(montoDevolucion);
    if (!Number.isFinite(monto) || monto <= 0) {
      setError("El monto a devolver debe ser mayor que 0.");
      return;
    }

    if (monto > totalPago) {
      setError(
        `El monto a devolver no puede superar el total del cobro (${formatCurrency(totalPago, monedaPago)}).`,
      );
      return;
    }

    if (motivo.trim().length < 3) {
      setError("Debe indicar un motivo de devolucion (minimo 3 caracteres).");
      return;
    }

    if (!fechaDevolucion) {
      setError("Debe seleccionar la fecha de devolucion.");
      return;
    }

    const fechaSeleccionada = new Date(`${fechaDevolucion}T12:00:00`);
    if (Number.isNaN(fechaSeleccionada.getTime())) {
      setError("La fecha de devolucion no es valida.");
      return;
    }

    const codigoClienteLimpio = String(codigoCliente || "").trim();
    if (!codigoClienteLimpio) {
      setError("No se encontro el codigo del cliente para esta devolucion.");
      return;
    }

    const ofertaId = String(pago.oferta_id || "").trim();
    if (!ofertaId) {
      setError("No se encontro el identificador de la oferta para este pago.");
      return;
    }

    if (transferenciaActiva && numeroCuenta.trim().length < 4) {
      setError("Debe indicar un numero de cuenta valido para transferencia.");
      return;
    }

    if (transferenciaActiva && titularCuenta.trim().length < 3) {
      setError(
        "Debe indicar el titular de la cuenta para la devolucion por transferencia.",
      );
      return;
    }

    if (!transferenciaActiva) {
      const hasNegativos = Object.values(desgloseBilletes).some(
        (cantidad) => Number(cantidad) < 0,
      );
      if (hasNegativos) {
        setError(
          "El desglose de billetes no permite cantidades negativas.",
        );
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      await PagoService.registrarDevolucionPago({
        pago_id: pago.id,
        codigo_cliente: codigoClienteLimpio,
        oferta_id: ofertaId,
        monto_devuelto: monto,
        fecha: fechaSeleccionada.toISOString(),
        registrado_por:
          String(user?.nombre || user?.ci || "sistema").trim() || "sistema",
        motivo_devolucion: motivo.trim(),
        devolucion_por_transferencia: transferenciaActiva,
        cuenta_transferencia: transferenciaActiva
          ? numeroCuenta.trim()
          : undefined,
        titular_transferencia: transferenciaActiva
          ? titularCuenta.trim()
          : undefined,
        desglose_billetes:
          !transferenciaActiva && Object.keys(desgloseBilletes).length > 0
            ? desgloseBilletes
            : undefined,
      });

      toast({
        title: "Devolucion registrada",
        description: "La devolucion del cobro se registro correctamente.",
      });

      if (onSuccess) {
        await onSuccess();
      }

      onOpenChange(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "No se pudo registrar la devolucion.";
      setError(message);
      toast({
        title: "Error al registrar devolucion",
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
            Registrar devolucion al cliente
          </DialogTitle>
          <DialogDescription>
            Registra una devolucion parcial o total del cobro seleccionado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
            <p className="text-sm text-amber-800">
              <span className="font-semibold">Total del cobro:</span>{" "}
              {formatCurrency(totalPago, monedaPago)} {monedaPago}
            </p>
            {monedaPago !== "USD" && (
              <p className="mt-1 text-xs text-amber-700">
                Equivalente: {formatCurrency(Number(pago?.monto_usd || 0))}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="devolver-todo"
                checked={devolverTodo}
                disabled={loading}
                onCheckedChange={(value) =>
                  handleToggleDevolverTodo(value === true)
                }
              />
              <Label htmlFor="devolver-todo" className="cursor-pointer">
                Devolver todo el monto del cobro
              </Label>
            </div>
          </div>

          {canUseTransferenciaDevolucion ? (
            <div className="space-y-2">
              <Label>Metodo de devolucion</Label>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="devolucion-transferencia"
                  checked={esTransferencia}
                  disabled={loading}
                  onCheckedChange={(value) =>
                    setEsTransferencia(value === true)
                  }
                />
                <Label
                  htmlFor="devolucion-transferencia"
                  className="cursor-pointer"
                >
                  Devolver por transferencia (si no, es efectivo)
                </Label>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Metodo de devolucion</Label>
              <p className="text-sm text-gray-600">
                Este cobro fue en efectivo. La devolucion se registrara en
                efectivo.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="monto-devolucion">
              Monto a devolver ({monedaPago}){" "}
              <span className="text-red-600">*</span>
            </Label>
            <Input
              id="monto-devolucion"
              type="number"
              min={0}
              max={totalPago}
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
              Maximo permitido: {formatCurrency(totalPago, monedaPago)}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fecha-devolucion">
              Fecha de devolucion <span className="text-red-600">*</span>
            </Label>
            <Input
              id="fecha-devolucion"
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
            <Label htmlFor="motivo-devolucion">
              Motivo de devolucion <span className="text-red-600">*</span>
            </Label>
            <Textarea
              id="motivo-devolucion"
              value={motivo}
              onChange={(event) => {
                setMotivo(event.target.value);
                setError(null);
              }}
              disabled={loading}
              maxLength={400}
              placeholder="Describa por que se realiza la devolucion..."
              className="min-h-[100px]"
            />
            <p className="text-xs text-gray-500">{motivo.trim().length}/400</p>
          </div>

          {transferenciaActiva && (
            <>
              <div className="space-y-2">
                <Label htmlFor="numero-cuenta-devolucion">
                  Numero de cuenta destino{" "}
                  <span className="text-red-600">*</span>
                </Label>
                <Input
                  id="numero-cuenta-devolucion"
                  value={numeroCuenta}
                  onChange={(event) => {
                    setNumeroCuenta(event.target.value);
                    setError(null);
                  }}
                  disabled={loading}
                  placeholder="Ej: 92100123456789012345"
                  maxLength={64}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="titular-cuenta-devolucion">
                  Titular de la cuenta{" "}
                  <span className="text-red-600">*</span>
                </Label>
                <Input
                  id="titular-cuenta-devolucion"
                  value={titularCuenta}
                  onChange={(event) => {
                    setTitularCuenta(event.target.value);
                    setError(null);
                  }}
                  disabled={loading}
                  placeholder="Nombre y apellidos del titular"
                  maxLength={120}
                />
              </div>
            </>
          )}

          {!transferenciaActiva && (
            <div className="space-y-3 rounded-md border border-gray-200 p-3">
              <Label className="text-sm font-medium">
                Desglose de billetes (opcional)
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {getDenominaciones(monedaPago).map((denominacion) => (
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
              <p className="text-xs text-gray-600">
                Total desglose: {calcularTotalDesglose().toFixed(2)}{" "}
                {monedaPago}
              </p>
            </div>
          )}

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
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
              "Registrar devolucion"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
