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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select";
import type { SolicitudVentaSummary } from "@/lib/api-types";
import type { PagoProgramado } from "@/lib/types/feats/pagos-clientes-ventas/pago-cliente-venta-types";
import { useAuth } from "@/contexts/auth-context";
import {
  DollarSign,
  CalendarClock,
  Plus,
  Trash2,
  Calendar,
  Link,
  Copy,
  Check,
  Loader2,
  FileText,
  ExternalLink,
} from "lucide-react";
import type { SolicitudVenta } from "@/lib/api-types";
import { FacturaClienteVentaService } from "@/lib/services/feats/pagos-clientes-ventas/pago-cliente-venta-service";

interface RegistrarPagoVentaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  solicitud: SolicitudVentaSummary | null;
  solicitudCompleta?: SolicitudVenta | null;
  facturaAsociadaNumero?: string | null;
  bloquearConfiguracionPago?: boolean;
  onVerStripe?: () => void;
  onSubmit: (data: {
    solicitud_venta_id: string;
    monto: number;
    moneda: "USD" | "CUP" | "EUR";
    tasa_cambio?: number;
    metodo_pago: "efectivo" | "transferencia_bancaria" | "stripe" | "financiacion";
    stripe_link?: string;
    desglose_billetes?: Record<string, number>;
    cambio?: number;
    monto_comision?: number;
    recibido_por: string;
    notas?: string;
    es_a_plazos?: boolean;
    plan_pagos?: PagoProgramado[];
    fecha: string;
    factura?: { numero: string; numero_factura: string; fecha_emision: string };
  }) => Promise<void>;
}

interface PagoProgramadoForm {
  id: number;
  fecha: string;
  monto: string;
  nota: string;
}

let nextId = 1;
const DENOMINACIONES_CUP = ["1000", "500", "200", "100", "50", "20", "10", "5", "1"];
const DENOMINACIONES_USD = ["100", "50", "20", "10", "5", "2", "1"];
const DENOMINACIONES_EUR = ["500", "200", "100", "50", "20", "10", "5"];

export function RegistrarPagoVentaDialog({
  open,
  onOpenChange,
  solicitud,
  solicitudCompleta = null,
  facturaAsociadaNumero = null,
  bloquearConfiguracionPago = false,
  onVerStripe,
  onSubmit,
}: RegistrarPagoVentaDialogProps) {
  const { user } = useAuth();
  const today = new Date().toISOString().split("T")[0];

  const [monto, setMonto] = useState("");
  const [moneda, setMoneda] = useState<"USD" | "CUP" | "EUR">("USD");
  const [tasaCambio, setTasaCambio] = useState("");
  const [metodoPago, setMetodoPago] = useState<
    "efectivo" | "transferencia_bancaria" | "stripe" | "financiacion"
  >("efectivo");
  const [desgloseBilletes, setDesgloseBilletes] = useState<Record<string, string>>({});
  const [notas, setNotas] = useState("");
  const [fecha, setFecha] = useState(today);
  const [esAPlazos, setEsAPlazos] = useState(false);
  const [pagosProgramados, setPagosProgramados] = useState<PagoProgramadoForm[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stripeMontoLink, setStripeMontoLink] = useState("");
  const [stripeLink, setStripeLink] = useState<string | null>(null);
  const [stripeGenerando, setStripeGenerando] = useState(false);
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [generarFactura, setGenerarFactura] = useState(true);
  const [numeroFactura, setNumeroFactura] = useState("");
  const [montoComision, setMontoComision] = useState("");

  // Pre-rellenar monto con el pendiente al abrir
  useEffect(() => {
    if (!open || !solicitud) return;
    const pendienteInicial = solicitud.monto_pendiente != null
      ? Number(solicitud.monto_pendiente)
      : solicitud.precio_total != null
      ? Math.max(0, Number(solicitud.precio_total) - Number(solicitud.total_pagado ?? 0))
      : null;
    if (pendienteInicial != null && pendienteInicial > 0) {
      setMonto(pendienteInicial.toFixed(2));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // CUP → tasa por defecto 550 CUP = 1 USD; otros → limpiar campo
  useEffect(() => {
    if (moneda === "CUP") setTasaCambio("550");
    else setTasaCambio("");
  }, [moneda]);

  // Sugerir número de factura cuando se activa el toggle
  useEffect(() => {
    if (!generarFactura) return;
    FacturaClienteVentaService.getSiguienteNumero()
      .then((n) => { if (n) setNumeroFactura(n); })
      .catch(() => {});
  }, [generarFactura]);

  if (!solicitud) return null;

  // precio_total ya incluye los descuentos por material aplicados en el backend
  const precioTotal = solicitud.precio_total != null ? Number(solicitud.precio_total) : null;
  // Total ya pagado acumulado (de la solicitud)
  const totalPagado = solicitud.total_pagado != null ? Number(solicitud.total_pagado) : null;
  // Pendiente: viene del backend o se calcula
  const pendiente = solicitud.monto_pendiente != null
    ? Number(solicitud.monto_pendiente)
    : precioTotal != null && totalPagado != null
    ? Math.max(0, precioTotal - totalPagado)
    : precioTotal ?? null;

  const totalProgramado = pagosProgramados.reduce(
    (sum, p) => sum + (Number(p.monto) || 0),
    0,
  );
  const montoNum = Number(monto);
  const tasaCambioNum = Number(tasaCambio) || 0;
  // usuario ingresa "moneda por 1 USD"; se invierte al enviar → backend calcula monto*tasa = monto_usd
  const montoEnUSD =
    moneda !== "USD" && tasaCambioNum > 0 ? montoNum / tasaCambioNum : montoNum;

  const montoCubreTodo = pendiente != null && montoEnUSD > 0 && montoEnUSD >= pendiente;

  const excedePendiente =
    pendiente != null &&
    Number.isFinite(montoNum) &&
    montoNum > 0 &&
    montoEnUSD > pendiente;

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(v);

  const handleAddPago = () => {
    setPagosProgramados((prev) => [
      ...prev,
      { id: nextId++, fecha: "", monto: "", nota: "" },
    ]);
  };

  const handleRemovePago = (id: number) => {
    setPagosProgramados((prev) => prev.filter((p) => p.id !== id));
  };

  const handlePagoChange = (
    id: number,
    field: keyof Omit<PagoProgramadoForm, "id">,
    value: string,
  ) => {
    setPagosProgramados((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
    );
  };

  const handleReset = () => {
    setMonto("");
    setMoneda("USD");
    setTasaCambio("");
    setMetodoPago("efectivo");
    setDesgloseBilletes({});
    setNotas("");
    setFecha(today);
    setEsAPlazos(false);
    setPagosProgramados([]);
    setError(null);
    setStripeMontoLink("");
    setStripeLink(null);
    setStripeGenerando(false);
    setStripeError(null);
    setCopiado(false);
    setGenerarFactura(false);
    setNumeroFactura("");
    setMontoComision("");
  };

  const denominaciones =
    moneda === "USD"
      ? DENOMINACIONES_USD
      : moneda === "EUR"
        ? DENOMINACIONES_EUR
        : DENOMINACIONES_CUP;

  const setCantidadDenominacion = (denominacion: string, value: string) => {
    setDesgloseBilletes((prev) => ({
      ...prev,
      [denominacion]: value,
    }));
  };

  const buildDesgloseBilletes = (): Record<string, number> | undefined => {
    const result: Record<string, number> = {};
    for (const d of denominaciones) {
      const raw = desgloseBilletes[d];
      if (!raw || raw.trim() === "") continue;
      const cantidad = Number(raw);
      if (Number.isFinite(cantidad) && cantidad > 0) {
        result[d] = Math.floor(cantidad);
      }
    }
    return Object.keys(result).length > 0 ? result : undefined;
  };

  const handleClose = () => {
    handleReset();
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    const montoNum = Number(monto);
    if (!montoNum || montoNum <= 0) {
      setError("El monto debe ser mayor a 0");
      return;
    }
    const tasaNum = Number(tasaCambio) || 0;
    const montoUSD =
      moneda !== "USD" && tasaNum > 0 ? montoNum / tasaNum : montoNum;
    if (pendiente != null && montoUSD > pendiente + 0.01) {
      setError(`El monto no puede superar el saldo pendiente (${formatCurrency(pendiente)})`);
      return;
    }
    if (!fecha) {
      setError("Debe indicar la fecha del pago");
      return;
    }
    if (!bloquearConfiguracionPago && esAPlazos) {
      if (pagosProgramados.length === 0) {
        setError("Agrega al menos un pago programado o desmarca la opción de plazos");
        return;
      }
      for (const p of pagosProgramados) {
        if (!p.fecha) {
          setError("Todos los pagos programados deben tener fecha");
          return;
        }
        if (!Number(p.monto) || Number(p.monto) <= 0) {
          setError("Todos los pagos programados deben tener un monto válido");
          return;
        }
      }
      // Validar que pago inicial + plazos no excedan el total a pagar
      if (pendiente != null) {
        const totalPlazo = pagosProgramados.reduce((sum, p) => sum + (Number(p.monto) || 0), 0);
        if (montoUSD + totalPlazo > pendiente + 0.01) {
          setError(
            `La suma del pago inicial más los plazos no puede superar el pendiente (${formatCurrency(pendiente)})`,
          );
          return;
        }
      }
    }
    if (metodoPago === "efectivo") {
      const desglose = buildDesgloseBilletes();
      if (desglose && Object.keys(desglose).length > 0) {
        const totalBilletes = Object.entries(desglose).reduce(
          (sum, [den, cant]) => sum + Number(den) * cant,
          0,
        );
        if (totalBilletes < montoNum - 0.01) {
          setError(
            `La suma de billetes (${totalBilletes.toFixed(2)}) es menor que el monto a pagar (${montoNum.toFixed(2)})`,
          );
          return;
        }
      }
    }
    setError(null);
    setLoading(true);
    try {
      await onSubmit({
        solicitud_venta_id: solicitud.id,
        monto: montoNum,
        moneda,
        // Convertir de "moneda por 1 USD" (UI) a "USD por moneda" (backend)
        tasa_cambio: tasaCambio && Number(tasaCambio) > 0 && moneda !== "USD"
          ? 1 / Number(tasaCambio)
          : tasaCambio ? Number(tasaCambio) : undefined,
        metodo_pago: metodoPago,
        desglose_billetes:
          metodoPago === "efectivo" ? buildDesgloseBilletes() : undefined,
        cambio: (() => {
          if (metodoPago !== "efectivo") return undefined;
          const desglose = buildDesgloseBilletes();
          if (!desglose || Object.keys(desglose).length === 0) return undefined;
          const totalBilletes = Object.entries(desglose).reduce(
            (sum, [den, cant]) => sum + Number(den) * cant, 0,
          );
          const diferencia = Math.round((totalBilletes - montoNum) * 100) / 100;
          return diferencia > 0 ? diferencia : undefined;
        })(),
        stripe_link: stripeLink || undefined,
        monto_comision: (metodoPago === "stripe" || metodoPago === "transferencia_bancaria") && montoComision
          ? Number(montoComision)
          : undefined,
        recibido_por: user?.nombre ?? "",
        notas: notas || undefined,
        es_a_plazos: bloquearConfiguracionPago
          ? solicitudCompleta?.es_a_plazos || undefined
          : esAPlazos && !montoCubreTodo ? true : undefined,
        plan_pagos: bloquearConfiguracionPago
          ? solicitudCompleta?.plan_pagos || undefined
          : esAPlazos && !montoCubreTodo
          ? pagosProgramados.map((p) => ({
              fecha: p.fecha,
              monto: Number(p.monto),
              nota: p.nota || undefined,
            }))
          : undefined,
        fecha,
        factura:
          generarFactura && numeroFactura.trim()
            ? { numero: numeroFactura.trim(), numero_factura: numeroFactura.trim(), fecha_emision: fecha }
            : undefined,
      });
      handleClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al registrar el pago");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerarStripeLink = async () => {
    const montoStripe = Number(stripeMontoLink);
    if (!montoStripe || montoStripe <= 0) {
      setStripeError("Indica un monto válido para el link");
      return;
    }
    setStripeGenerando(true);
    setStripeError(null);
    setStripeLink(null);
    try {
      const res = await fetch("/api/stripe/generar-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          precio: montoStripe,
          descripcion: `Pago solicitud ${solicitud.codigo || solicitud.id.slice(-6).toUpperCase()} — ${solicitud.cliente_venta_nombre || "Cliente"}`,
          moneda: moneda === "CUP" ? "USD" : moneda,
          sin_recargo: true,
        }),
      });
      const data = await res.json();
      const url = data.url || data.payment_link;
      if (!data.success || !url) throw new Error(data.message || "No se pudo generar el link");
      setStripeLink(url);
    } catch (e) {
      setStripeError(e instanceof Error ? e.message : "Error al generar el link");
    } finally {
      setStripeGenerando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Registrar Pago
          </DialogTitle>
          <div className="flex items-center justify-between gap-2">
            <DialogDescription>
              Solicitud{" "}
              <span className="font-medium text-gray-800">
                {solicitud.codigo || solicitud.id.slice(-6).toUpperCase()}
              </span>{" "}
              — {solicitud.cliente_venta_nombre || "Sin nombre"}
            </DialogDescription>
            {onVerStripe && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="shrink-0 gap-1.5 border-indigo-200 text-indigo-700 hover:bg-indigo-50 text-xs"
                onClick={onVerStripe}
              >
                <ExternalLink className="h-3 w-3" />
                Ver Stripe
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Resumen de precios */}
          {precioTotal != null && (
            <div className="rounded-lg bg-gray-50 border p-3 text-sm space-y-1">
              <div className="flex justify-between border-b pb-1 font-semibold">
                <span>Total a pagar:</span>
                <span className="text-blue-700">{formatCurrency(precioTotal)}</span>
              </div>
              {totalPagado != null && totalPagado > 0 && (
                <div className="flex justify-between text-green-700">
                  <span>Ya pagado:</span>
                  <span className="font-medium">{formatCurrency(totalPagado)}</span>
                </div>
              )}
              {pendiente != null && (
                <div className="flex justify-between text-red-600 font-semibold">
                  <span>Pendiente:</span>
                  <span>{formatCurrency(pendiente)}</span>
                </div>
              )}
            </div>
          )}

          {/* Monto */}
          <div className="space-y-1">
            <Label>
              Monto del pago <span className="text-red-500">*</span>
            </Label>
            <div className="flex gap-2">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={monto}
                onChange={(e) => {
                  setMonto(e.target.value);
                  // Sincronizar con el campo del link solo si aún no se generó
                  if (metodoPago === "stripe" && !stripeLink) {
                    setStripeMontoLink(e.target.value);
                  }
                }}
                placeholder="0.00"
                className="flex-1"
              />
              <Select
                value={moneda}
                onValueChange={(v: string) => setMoneda(v as "USD" | "CUP" | "EUR")}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="CUP">CUP</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {excedePendiente && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
                El monto no puede superar el saldo pendiente ({formatCurrency(pendiente)}).
              </p>
            )}
          </div>

          {moneda !== "USD" && (
            <div className="space-y-1">
              <Label>Tasa de cambio ({moneda} por 1 USD)</Label>
              <Input
                type="number"
                min="0"
                step="1"
                value={tasaCambio}
                onChange={(e) => setTasaCambio(e.target.value)}
                placeholder={moneda === "EUR" ? "Ej: 0.87" : "Ej: 550"}
              />
              {tasaCambioNum > 0 && montoNum > 0 && (
                <p className="text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded px-2 py-1">
                  {montoNum.toLocaleString("es-CU")} {moneda} ={" "}
                  <span className="font-semibold">{formatCurrency(montoEnUSD)}</span>
                </p>
              )}
            </div>
          )}

          {/* Método de pago */}
          <div className="space-y-1">
            <Label>
              Método de pago <span className="text-red-500">*</span>
            </Label>
            <Select
              value={metodoPago}
              onValueChange={(v: string) => {
                const m = v as "efectivo" | "transferencia_bancaria" | "stripe" | "financiacion";
                setMetodoPago(m);
                if (m !== "stripe" && m !== "transferencia_bancaria") setMontoComision("");
                if (m === "stripe") {
                  const montoActual = Number(monto);
                  setStripeMontoLink(montoActual > 0 ? montoActual.toFixed(2) : pendiente != null ? pendiente.toFixed(2) : "");
                  setStripeLink(null);
                  setStripeError(null);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="efectivo">Efectivo</SelectItem>
                <SelectItem value="transferencia_bancaria">Transferencia bancaria</SelectItem>
                <SelectItem value="stripe">Stripe</SelectItem>
                <SelectItem value="financiacion">Financiación</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(metodoPago === "stripe" || metodoPago === "transferencia_bancaria") && (
            <div className="space-y-1">
              <Label>Monto de comisión</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={montoComision}
                onChange={(e) => setMontoComision(e.target.value)}
                placeholder="0.00"
              />
              <p className="text-xs text-gray-500">Comisión cobrada por el medio de pago (opcional).</p>
            </div>
          )}

          {metodoPago === "stripe" && (
            <div className="space-y-3 rounded-lg border border-violet-200 bg-violet-50 p-3">
              <Label className="flex items-center gap-1.5 text-violet-800 font-semibold">
                <Link className="h-3.5 w-3.5" />
                Link de pago Stripe
              </Label>

              {/* Monto + botón generar */}
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={stripeMontoLink}
                  onChange={(e) => {
                    setStripeMontoLink(e.target.value);
                    // Solo limpiar el link si el usuario cambió el monto manualmente
                    setStripeLink(null);
                    setCopiado(false);
                  }}
                  placeholder="0.00"
                  className="flex-1 bg-white"
                />
                <Button
                  type="button"
                  size="sm"
                  className="bg-violet-600 hover:bg-violet-700 text-white gap-1.5 shrink-0"
                  onClick={handleGenerarStripeLink}
                  disabled={stripeGenerando}
                >
                  {stripeGenerando
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Link className="h-3.5 w-3.5" />}
                  {stripeGenerando ? "Generando..." : stripeLink ? "Regenerar" : "Generar link"}
                </Button>
              </div>

              <p className="text-xs text-violet-600">
                Monto para el link de cobro. Editable si no va a pagar todo de una vez.
              </p>

              {stripeError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
                  {stripeError}
                </p>
              )}

              {/* Link generado */}
              {stripeLink && (
                <div className="space-y-2 pt-1">
                  <p className="text-xs font-semibold text-green-700">✓ Link generado</p>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={stripeLink}
                      className="flex-1 bg-white text-xs"
                      onFocus={(e) => e.target.select()}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="shrink-0 gap-1 border-violet-300 text-violet-700 hover:bg-violet-50"
                      onClick={() => {
                        navigator.clipboard.writeText(stripeLink);
                        setCopiado(true);
                        setTimeout(() => setCopiado(false), 2500);
                      }}
                    >
                      {copiado ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                      {copiado ? "Copiado" : "Copiar"}
                    </Button>
                    <a href={stripeLink} target="_blank" rel="noopener noreferrer">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="shrink-0 border-violet-300 text-violet-700 hover:bg-violet-50"
                      >
                        <Link className="h-3.5 w-3.5" />
                      </Button>
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          {metodoPago === "efectivo" && (() => {
            const totalBilletes = denominaciones.reduce((sum, d) => {
              const cant = Number(desgloseBilletes[d] ?? 0);
              return sum + Number(d) * cant;
            }, 0);
            const montoNum2 = Number(monto);
            const hayDesglose = denominaciones.some(d => Number(desgloseBilletes[d] ?? 0) > 0);
            const cambio = totalBilletes - montoNum2;
            const valido = !hayDesglose || cambio >= -0.01;
            return (
              <div className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <Label className="text-sm font-medium">
                  Desglose de billetes ({moneda}) (opcional)
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {denominaciones.map((d) => (
                    <div key={d} className="space-y-1">
                      <Label className="text-xs text-gray-700">{d}</Label>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        value={desgloseBilletes[d] ?? ""}
                        onChange={(e) => setCantidadDenominacion(d, e.target.value)}
                        placeholder="0"
                        className="h-8 text-sm"
                      />
                    </div>
                  ))}
                </div>
                {hayDesglose && (
                  <div className={`flex items-center justify-between text-xs px-1 pt-1 font-medium ${valido ? (cambio > 0.01 ? "text-amber-600" : "text-emerald-700") : "text-red-600"}`}>
                    <span>Total billetes: {totalBilletes.toFixed(2)}</span>
                    <span>
                      {!valido
                        ? `✗ Faltan: ${Math.abs(cambio).toFixed(2)}`
                        : cambio > 0.01
                        ? `↩ Cambio: ${cambio.toFixed(2)}`
                        : "✓ Exacto"}
                    </span>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Fecha */}
          <div className="space-y-1">
            <Label>
              Fecha <span className="text-red-500">*</span>
            </Label>
            <Input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </div>

          {/* Recibido por */}
          <div className="space-y-1">
            <Label>Recibido por</Label>
            <Input
              value={user?.nombre ?? ""}
              readOnly
              className="bg-gray-50 text-gray-600 cursor-not-allowed"
            />
          </div>

          {/* Notas */}
          <div className="space-y-1">
            <Label>Notas</Label>
            <Input
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Observaciones adicionales"
            />
          </div>

          {/* Toggle pago a plazos — se oculta si el monto cubre el total pendiente */}
          {!bloquearConfiguracionPago && !montoCubreTodo && <div
            className={`rounded-lg border p-3 transition-colors ${
              esAPlazos ? "border-blue-300 bg-blue-50" : "border-gray-200 bg-gray-50"
            }`}
          >
            <button
              type="button"
              onClick={() => setEsAPlazos((v) => !v)}
              className="flex items-center gap-3 w-full text-left"
            >
              <div
                className={`relative w-10 h-5 rounded-full transition-colors ${
                  esAPlazos ? "bg-blue-500" : "bg-gray-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    esAPlazos ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </div>
              <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-sm text-gray-800">
                  Pago a plazos
                </span>
              </div>
              {esAPlazos && pagosProgramados.length > 0 && (
                <span className="ml-auto text-xs text-blue-700 font-medium">
                  {pagosProgramados.length} plazo{pagosProgramados.length !== 1 ? "s" : ""} —{" "}
                  {formatCurrency(totalProgramado)}
                </span>
              )}
            </button>

            {esAPlazos && (
              <div className="mt-3 space-y-3">
                <p className="text-xs text-gray-500">
                  Define los pagos programados. El monto del pago inicial puede ser 0 si es solo a plazos.
                </p>

                {pagosProgramados.map((p, index) => (
                  <div
                    key={p.id}
                    className="rounded-md border border-blue-200 bg-white p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-blue-700 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Plazo {index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemovePago(p.id)}
                        className="text-red-400 hover:text-red-600 transition-colors"
                        title="Eliminar plazo"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">
                          Fecha <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          type="date"
                          value={p.fecha}
                          onChange={(e) =>
                            handlePagoChange(p.id, "fecha", e.target.value)
                          }
                          className="text-sm h-8"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">
                          Monto <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={p.monto}
                          onChange={(e) =>
                            handlePagoChange(p.id, "monto", e.target.value)
                          }
                          placeholder="0.00"
                          className="text-sm h-8"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Nota</Label>
                      <Input
                        value={p.nota}
                        onChange={(e) =>
                          handlePagoChange(p.id, "nota", e.target.value)
                        }
                        placeholder="Ej: Segunda cuota"
                        className="text-sm h-8"
                      />
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full border-blue-300 text-blue-700 hover:bg-blue-50 gap-1"
                  onClick={handleAddPago}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Agregar plazo
                </Button>
              </div>
            )}
          </div>}

          {/* Factura */}
          {facturaAsociadaNumero && (
            <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-sm flex items-center gap-2">
              <FileText className="h-4 w-4 text-indigo-600 shrink-0" />
              <span>
                Este pago se agregará a la factura{" "}
                <span className="font-semibold">{facturaAsociadaNumero}</span>.
              </span>
            </div>
          )}

          <div
            className={`rounded-lg border p-3 transition-colors ${
              generarFactura ? "border-indigo-300 bg-indigo-50" : "border-gray-200 bg-gray-50"
            }`}
          >
            <button
              type="button"
              onClick={() => setGenerarFactura((v) => !v)}
              className="flex items-center gap-3 w-full text-left"
            >
              <div
                className={`relative w-10 h-5 rounded-full transition-colors ${
                  generarFactura ? "bg-indigo-500" : "bg-gray-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    generarFactura ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </div>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-indigo-600" />
                <span className="font-medium text-sm text-gray-800">
                  Generar factura con este pago
                </span>
              </div>
            </button>

            {generarFactura && (
              <div className="mt-3 space-y-1">
                <Label className="text-xs text-indigo-800">Número de factura</Label>
                <Input
                  value={numeroFactura}
                  onChange={(e) => setNumeroFactura(e.target.value)}
                  placeholder="FV-2026-000001"
                  className="bg-white"
                />
                <p className="text-xs text-indigo-600">
                  Se creará una factura asociada a esta solicitud con este número.
                </p>
              </div>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? "Registrando..." : "Registrar Pago"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
