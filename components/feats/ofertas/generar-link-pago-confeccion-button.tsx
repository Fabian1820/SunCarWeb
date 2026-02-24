"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle,
  Copy,
  CreditCard,
  ExternalLink,
  FileText,
  Loader2,
} from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
import { useToast } from "@/hooks/use-toast";
import type { OfertaConfeccion } from "@/hooks/use-ofertas-confeccion";

interface GenerarLinkPagoConfeccionButtonProps {
  oferta: OfertaConfeccion;
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "default" | "lg" | "icon";
  showIcon?: boolean;
}

type ModoCalculo = "porcentaje" | "manual";
type ReferenciaManual = "antes_impuesto" | "despues_impuesto";
type MonedaLink = "USD" | "EUR";

interface ResumenGenerado {
  baseSinRecargo: number;
  recargoStripe: number;
  totalConRecargo: number;
  moneda: MonedaLink;
}

interface StripeLinkStatusSummary {
  paymentLinkId: string;
  paymentLinkUrl: string;
  isPaid: boolean;
  totalSessions: number;
  paidSessionsCount: number;
  latestPaidSessionId: string | null;
  latestPaidAt: string | null;
  amountPaid: number | null;
  currency: string | null;
  customerEmail: string | null;
  receiptUrl: string | null;
  invoiceUrl: string | null;
  invoicePdf: string | null;
  invoiceNumber: string | null;
}

const STRIPE_FEE_PERCENT = 0.05;

const redondearDosDecimales = (valor: number) =>
  Math.round((valor + Number.EPSILON) * 100) / 100;

const formatCurrency = (amount: number, currencyCode: MonedaLink) => {
  const symbol = currencyCode === "EUR" ? "€" : "$";
  return `${symbol}${redondearDosDecimales(amount).toFixed(2)} ${currencyCode}`;
};

const getMonedaInicial = (oferta: OfertaConfeccion): MonedaLink => {
  if (oferta.moneda_pago === "EUR") return "EUR";
  return "USD";
};

export function GenerarLinkPagoConfeccionButton({
  oferta,
  variant = "outline",
  size = "sm",
  showIcon = true,
}: GenerarLinkPagoConfeccionButtonProps) {
  const { toast } = useToast();
  const precioOferta = Number(oferta.precio_final || 0);
  const tienePrecioValido = Number.isFinite(precioOferta) && precioOferta > 0;
  const monedaInicial = getMonedaInicial(oferta);

  const [loading, setLoading] = useState(false);
  const [configureDialogOpen, setConfigureDialogOpen] = useState(false);
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [paymentLink, setPaymentLink] = useState<string>("");
  const [paymentLinkId, setPaymentLinkId] = useState<string>("");
  const [linkGestion, setLinkGestion] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [requestingInvoice, setRequestingInvoice] = useState(false);
  const [statusSummary, setStatusSummary] = useState<StripeLinkStatusSummary | null>(
    null,
  );

  const [modoCalculo, setModoCalculo] = useState<ModoCalculo>("porcentaje");
  const [porcentaje, setPorcentaje] = useState<string>("100");
  const [montoManual, setMontoManual] = useState<string>("");
  const [referenciaManual, setReferenciaManual] =
    useState<ReferenciaManual>("antes_impuesto");
  const [moneda, setMoneda] = useState<MonedaLink>(monedaInicial);
  const [resumenGenerado, setResumenGenerado] = useState<ResumenGenerado | null>(
    null,
  );

  useEffect(() => {
    setMoneda(monedaInicial);
    setModoCalculo("porcentaje");
    setPorcentaje("100");
    setMontoManual("");
    setReferenciaManual("antes_impuesto");
  }, [monedaInicial, oferta.id]);

  useEffect(() => {
    if (!resultDialogOpen) return;
    if (!linkGestion.trim()) {
      setLinkGestion((paymentLinkId || paymentLink).trim());
    }
  }, [linkGestion, paymentLink, paymentLinkId, resultDialogOpen]);

  const calculo = useMemo(() => {
    const porcentajeNumerico = parseFloat(porcentaje);
    const montoManualNumerico = parseFloat(montoManual);

    let baseSinRecargo = 0;
    let error: string | null = null;

    if (!tienePrecioValido) {
      return {
        valido: false,
        error: "La oferta no tiene precio válido.",
        baseSinRecargo: 0,
        recargoStripe: 0,
        totalConRecargo: 0,
        porcentajeEquivalente: 0,
      };
    }

    if (modoCalculo === "porcentaje") {
      if (
        !Number.isFinite(porcentajeNumerico) ||
        porcentajeNumerico <= 0 ||
        porcentajeNumerico > 100
      ) {
        error = "El porcentaje debe estar entre 0.01% y 100%.";
      } else {
        baseSinRecargo = precioOferta * (porcentajeNumerico / 100);
      }
    } else {
      if (!Number.isFinite(montoManualNumerico) || montoManualNumerico <= 0) {
        error = "Ingresa un monto manual mayor que 0.";
      } else if (referenciaManual === "antes_impuesto") {
        baseSinRecargo = montoManualNumerico;
      } else {
        baseSinRecargo = montoManualNumerico / (1 + STRIPE_FEE_PERCENT);
      }
    }

    const recargoStripe = baseSinRecargo * STRIPE_FEE_PERCENT;
    const totalConRecargo = baseSinRecargo + recargoStripe;
    const porcentajeEquivalente =
      precioOferta > 0 ? (baseSinRecargo / precioOferta) * 100 : 0;

    const totalCentavos = Math.round(totalConRecargo * 100);
    const valido = !error && totalCentavos > 0;

    return {
      valido: Boolean(valido),
      error:
        error ||
        (totalCentavos <= 0
          ? "El monto final es demasiado pequeño para Stripe."
          : null),
      baseSinRecargo,
      recargoStripe,
      totalConRecargo,
      porcentajeEquivalente,
    };
  }, [
    modoCalculo,
    montoManual,
    porcentaje,
    precioOferta,
    referenciaManual,
    tienePrecioValido,
  ]);

  const descripcionLink = useMemo(() => {
    const nombreOferta = oferta.nombre_completo || oferta.nombre || "Oferta";
    const formaCobro =
      modoCalculo === "porcentaje"
        ? `Pago parcial ${redondearDosDecimales(calculo.porcentajeEquivalente)}% de la oferta`
        : referenciaManual === "antes_impuesto"
          ? "Pago parcial por monto manual antes del recargo Stripe"
          : "Pago parcial por monto manual con total final fijo";

    return [
      nombreOferta,
      formaCobro,
      `Base sin recargo: ${formatCurrency(calculo.baseSinRecargo, moneda)}`,
      `Recargo Stripe (5%): ${formatCurrency(calculo.recargoStripe, moneda)}`,
      `Total a pagar: ${formatCurrency(calculo.totalConRecargo, moneda)}`,
    ].join("\n");
  }, [
    calculo.baseSinRecargo,
    calculo.porcentajeEquivalente,
    calculo.recargoStripe,
    calculo.totalConRecargo,
    moneda,
    modoCalculo,
    oferta.nombre,
    oferta.nombre_completo,
    referenciaManual,
  ]);

  const handleGenerate = async () => {
    if (!calculo.valido) {
      toast({
        title: "Revisa los datos",
        description: calculo.error || "No se pudo calcular el monto.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/stripe/generar-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          precio: Number(calculo.baseSinRecargo.toFixed(6)),
          descripcion: descripcionLink,
          oferta_id: oferta.id,
          cliente_id: oferta.cliente_id,
          lead_id: oferta.lead_id,
          moneda,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        if (response.status === 500 && data.message?.includes("no está configurado")) {
          throw new Error(
            "Stripe no está configurado. Debes definir STRIPE_SECRET_KEY en .env.local.",
          );
        }
        throw new Error(data.message || "Error al generar link de pago");
      }

      const totalConRecargo =
        typeof data.precio_con_recargo === "number"
          ? data.precio_con_recargo
          : calculo.totalConRecargo;

      setResumenGenerado({
        baseSinRecargo: calculo.baseSinRecargo,
        recargoStripe: totalConRecargo - calculo.baseSinRecargo,
        totalConRecargo,
        moneda,
      });
      setPaymentLink(data.payment_link);
      setPaymentLinkId(data.payment_link_id || "");
      setLinkGestion(data.payment_link || data.payment_link_id || "");
      setStatusSummary(null);
      setConfigureDialogOpen(false);
      setResultDialogOpen(true);

      toast({
        title: "Link de Pago Generado",
        description: "Listo para compartir con el cliente.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Error al generar link de pago",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getLinkObjetivo = () => linkGestion.trim() || paymentLinkId || paymentLink;

  const handleVerifyStatus = async () => {
    const linkObjetivo = getLinkObjetivo();
    if (!linkObjetivo) {
      toast({
        title: "Link requerido",
        description: "Pega un link de pago o un ID plink_ para comprobarlo.",
        variant: "destructive",
      });
      return;
    }

    setCheckingStatus(true);
    try {
      const response = await fetch("/api/stripe/verificar-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          payment_link: linkObjetivo,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "No se pudo comprobar el link.");
      }

      setStatusSummary(data.data as StripeLinkStatusSummary);
      toast({
        title: data.data?.isPaid ? "Pago detectado" : "Aún sin pago",
        description: data.message || "Comprobación completada.",
      });
    } catch (error) {
      toast({
        title: "Error al comprobar",
        description:
          error instanceof Error ? error.message : "No se pudo comprobar el link.",
        variant: "destructive",
      });
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleRequestInvoice = async () => {
    const linkObjetivo = getLinkObjetivo();
    if (!linkObjetivo) {
      toast({
        title: "Link requerido",
        description: "Pega un link de pago o un ID plink_ para solicitar factura.",
        variant: "destructive",
      });
      return;
    }

    setRequestingInvoice(true);
    try {
      const response = await fetch("/api/stripe/solicitar-factura", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          payment_link: linkObjetivo,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        const fallbackReceipt =
          data?.data?.receipt_url && typeof data.data.receipt_url === "string"
            ? ` Comprobante: ${data.data.receipt_url}`
            : "";
        throw new Error(`${data.message || "No se encontró factura."}${fallbackReceipt}`);
      }

      if (statusSummary) {
        setStatusSummary({
          ...statusSummary,
          invoiceUrl: data.data?.factura_url || statusSummary.invoiceUrl,
          invoicePdf: data.data?.factura_url || statusSummary.invoicePdf,
          invoiceNumber: data.data?.invoice_number || statusSummary.invoiceNumber,
          receiptUrl: data.data?.receipt_url || statusSummary.receiptUrl,
        });
      }

      if (data.data?.factura_url) {
        window.open(data.data.factura_url, "_blank", "noopener,noreferrer");
      }

      toast({
        title: "Factura lista",
        description: "Se encontró la factura del cobro.",
      });
    } catch (error) {
      toast({
        title: "No se pudo solicitar factura",
        description:
          error instanceof Error ? error.message : "Error al solicitar factura.",
        variant: "destructive",
      });
    } finally {
      setRequestingInvoice(false);
    }
  };

  const handleOpenGestionDialog = () => {
    setLinkGestion((paymentLinkId || paymentLink || "").trim());
    setResultDialogOpen(true);
  };

  const formatCurrencyByCode = (amount: number, currencyCode: string | null) => {
    const code = (currencyCode || "USD").toUpperCase();
    const symbol = code === "EUR" ? "€" : "$";
    return `${symbol}${redondearDosDecimales(amount).toFixed(2)} ${code}`;
  };

  const formatDateReadable = (isoDate: string | null) => {
    if (!isoDate) return "--";
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) return isoDate;
    return date.toLocaleString("es-ES", {
      dateStyle: "short",
      timeStyle: "short",
    });
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(paymentLink);
      setCopied(true);
      toast({
        title: "Copiado",
        description: "Link de pago copiado al portapapeles.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "Error",
        description: "No se pudo copiar el link.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setConfigureDialogOpen(true)}
        disabled={loading}
        className="bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 hover:border-emerald-700 shadow-sm"
        title="Generar o gestionar link de pago"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          showIcon && <CreditCard className="h-4 w-4" />
        )}
        {size !== "icon" && (
          <span className={showIcon ? "ml-2" : ""}>Generar Link de Pago</span>
        )}
      </Button>

      <Dialog open={configureDialogOpen} onOpenChange={setConfigureDialogOpen}>
        <DialogContent className="sm:max-w-[680px]">
          <DialogHeader>
            <DialogTitle>Generar Link de Pago</DialogTitle>
            <DialogDescription>
              Define cuánto vas a cobrar. El sistema aplica automáticamente el 5%
              de Stripe y te muestra el total final en tiempo real.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-1">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-sm text-slate-600">Precio de la oferta actual</p>
              <p className="text-lg font-semibold text-slate-900">
                {formatCurrency(precioOferta, moneda)}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Moneda del link</Label>
              <Select
                value={moneda}
                onValueChange={(value: MonedaLink) => setMoneda(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona moneda" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>¿Cómo deseas definir el cobro?</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={modoCalculo === "porcentaje" ? "default" : "outline"}
                  onClick={() => setModoCalculo("porcentaje")}
                  className="justify-start"
                >
                  Por porcentaje de la oferta
                </Button>
                <Button
                  type="button"
                  variant={modoCalculo === "manual" ? "default" : "outline"}
                  onClick={() => setModoCalculo("manual")}
                  className="justify-start"
                >
                  Por monto exacto manual
                </Button>
              </div>
            </div>

            {modoCalculo === "porcentaje" && (
              <div className="space-y-3 rounded-lg border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="porcentaje-cobro">Porcentaje a cobrar</Label>
                  <Input
                    id="porcentaje-cobro"
                    type="number"
                    min="0.01"
                    max="100"
                    step="0.01"
                    value={porcentaje}
                    onChange={(event) => setPorcentaje(event.target.value)}
                    className="w-28"
                  />
                </div>
                <input
                  type="range"
                  min="1"
                  max="100"
                  step="1"
                  value={Number.isFinite(parseFloat(porcentaje)) ? porcentaje : "1"}
                  onChange={(event) => setPorcentaje(event.target.value)}
                  className="w-full accent-orange-600"
                />
                <div className="flex flex-wrap gap-2">
                  {[25, 50, 75, 100].map((valor) => (
                    <Button
                      key={valor}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPorcentaje(String(valor))}
                    >
                      {valor}%
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {modoCalculo === "manual" && (
              <div className="space-y-3 rounded-lg border border-slate-200 p-4">
                <div className="space-y-2">
                  <Label htmlFor="monto-manual">Monto a usar</Label>
                  <Input
                    id="monto-manual"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={montoManual}
                    onChange={(event) => setMontoManual(event.target.value)}
                    placeholder="Ejemplo: 1200.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ese monto corresponde a</Label>
                  <Select
                    value={referenciaManual}
                    onValueChange={(value: ReferenciaManual) =>
                      setReferenciaManual(value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="antes_impuesto">
                        Monto antes del 5% de Stripe
                      </SelectItem>
                      <SelectItem value="despues_impuesto">
                        Monto final exacto (incluye el 5%)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-slate-500">
                  Si eliges &quot;Monto final exacto&quot;, el sistema calcula
                  internamente la base para que el cliente pague ese total.
                </p>
              </div>
            )}

            <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Base sin recargo</span>
                <span className="font-semibold text-slate-900">
                  {formatCurrency(calculo.baseSinRecargo, moneda)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Recargo Stripe (5%)</span>
                <span className="font-semibold text-slate-900">
                  {formatCurrency(calculo.recargoStripe, moneda)}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-orange-200 pt-2">
                <span className="font-semibold text-slate-800">Total a pagar</span>
                <span className="text-lg font-bold text-orange-700">
                  {formatCurrency(calculo.totalConRecargo, moneda)}
                </span>
              </div>
              <div className="text-xs text-slate-600">
                Equivale al{" "}
                <strong>
                  {redondearDosDecimales(calculo.porcentajeEquivalente)}%
                </strong>{" "}
                del valor de la oferta.
              </div>
              {calculo.error && (
                <div className="text-xs text-red-600 font-medium">
                  {calculo.error}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfigureDialogOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setConfigureDialogOpen(false);
                handleOpenGestionDialog();
              }}
              disabled={loading}
            >
              Comprobar link existente
            </Button>
            <Button type="button" onClick={handleGenerate} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generando...
                </>
              ) : (
                "Generar link"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resultDialogOpen} onOpenChange={setResultDialogOpen}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>Gestión de Cobro Stripe</DialogTitle>
            <DialogDescription>
              Compara estado de pago y solicita factura manualmente, sin webhook.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {paymentLink && (
              <div className="space-y-2">
                <Label>Último link generado</Label>
                <div className="flex gap-2">
                  <div className="flex-1 rounded-md border border-slate-200 bg-slate-50 p-3 overflow-x-auto">
                    <a
                      href={paymentLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-700 break-all"
                    >
                      {paymentLink}
                    </a>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyLink}
                    title="Copiar link"
                  >
                    {copied ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            )}

            <div className="rounded-lg border border-slate-200 p-4 space-y-3">
              <div className="space-y-2">
                <Label htmlFor="stripe-link-gestion">
                  Link de pago o ID `plink_`
                </Label>
                <Input
                  id="stripe-link-gestion"
                  value={linkGestion}
                  onChange={(event) => setLinkGestion(event.target.value)}
                  placeholder="https://buy.stripe.com/... o plink_..."
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleVerifyStatus}
                  disabled={checkingStatus || requestingInvoice}
                >
                  {checkingStatus ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Comprobando...
                    </>
                  ) : (
                    "Comprobar pago"
                  )}
                </Button>
                <Button
                  type="button"
                  onClick={handleRequestInvoice}
                  disabled={checkingStatus || requestingInvoice}
                >
                  {requestingInvoice ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Solicitando...
                    </>
                  ) : (
                    "Solicitar factura"
                  )}
                </Button>
              </div>
            </div>

            {resumenGenerado && (
              <div className="rounded-lg border border-slate-200 p-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Base sin recargo</span>
                  <span className="font-semibold text-slate-900">
                    {formatCurrency(
                      resumenGenerado.baseSinRecargo,
                      resumenGenerado.moneda,
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Recargo Stripe (5%)</span>
                  <span className="font-semibold text-slate-900">
                    {formatCurrency(
                      resumenGenerado.recargoStripe,
                      resumenGenerado.moneda,
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-200 pt-2">
                  <span className="font-semibold text-slate-800">
                    Total a pagar
                  </span>
                  <span className="text-lg font-bold text-orange-700">
                    {formatCurrency(
                      resumenGenerado.totalConRecargo,
                      resumenGenerado.moneda,
                    )}
                  </span>
                </div>
              </div>
            )}

            {statusSummary && (
              <div
                className={`rounded-lg border p-4 space-y-2 ${
                  statusSummary.isPaid
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-amber-200 bg-amber-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p
                    className={`text-sm font-semibold ${
                      statusSummary.isPaid ? "text-emerald-800" : "text-amber-800"
                    }`}
                  >
                    {statusSummary.isPaid
                      ? "Pago confirmado para este link"
                      : "Este link aún no tiene pagos confirmados"}
                  </p>
                  <span className="text-xs text-slate-600">
                    Sesiones pagadas: {statusSummary.paidSessionsCount}/
                    {statusSummary.totalSessions}
                  </span>
                </div>

                {statusSummary.isPaid && (
                  <>
                    <div className="text-sm text-slate-700">
                      Monto pagado:{" "}
                      <strong>
                        {formatCurrencyByCode(
                          statusSummary.amountPaid || 0,
                          statusSummary.currency,
                        )}
                      </strong>
                    </div>
                    <div className="text-sm text-slate-700">
                      Fecha de pago:{" "}
                      <strong>{formatDateReadable(statusSummary.latestPaidAt)}</strong>
                    </div>
                    {statusSummary.customerEmail && (
                      <div className="text-sm text-slate-700">
                        Cliente: <strong>{statusSummary.customerEmail}</strong>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {(statusSummary.invoiceUrl || statusSummary.invoicePdf) && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            window.open(
                              statusSummary.invoiceUrl || statusSummary.invoicePdf || "",
                              "_blank",
                              "noopener,noreferrer",
                            )
                          }
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Ver factura
                        </Button>
                      )}
                      {statusSummary.receiptUrl && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            window.open(
                              statusSummary.receiptUrl || "",
                              "_blank",
                              "noopener,noreferrer",
                            )
                          }
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Ver comprobante
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setResultDialogOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
