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
import type { SolicitudVenta } from "@/lib/api-types";
import type { PagoProgramado } from "@/lib/types/feats/pagos-clientes-ventas/pago-cliente-venta-types";
import { FacturaClienteVentaService } from "@/lib/services/feats/pagos-clientes-ventas/pago-cliente-venta-service";
import { useAuth } from "@/contexts/auth-context";
import {
  DollarSign,
  Percent,
  CalendarClock,
  Plus,
  Trash2,
  Calendar,
  FileText,
} from "lucide-react";

interface RegistrarPagoVentaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  solicitud: SolicitudVenta | null;
  onSubmit: (data: {
    solicitud_venta_id: string;
    monto: number;
    moneda: "USD" | "CUP" | "EUR";
    tasa_cambio?: number;
    descuento_porcentaje: number;
    metodo_pago: "efectivo" | "transferencia_bancaria";
    recibido_por: string;
    notas?: string;
    es_a_plazos: boolean;
    pagos_programados?: PagoProgramado[];
    fecha: string;
    factura?: { numero_factura: string; fecha_emision: string };
  }) => Promise<void>;
}

interface PagoProgramadoForm {
  id: number;
  fecha: string;
  monto: string;
  nota: string;
}

let nextId = 1;

export function RegistrarPagoVentaDialog({
  open,
  onOpenChange,
  solicitud,
  onSubmit,
}: RegistrarPagoVentaDialogProps) {
  const { user } = useAuth();
  const today = new Date().toISOString().split("T")[0];

  const [monto, setMonto] = useState("");
  const [moneda, setMoneda] = useState<"USD" | "CUP" | "EUR">("USD");
  const [tasaCambio, setTasaCambio] = useState("");
  const [descuento, setDescuento] = useState("0");
  const [metodoPago, setMetodoPago] = useState<
    "efectivo" | "transferencia_bancaria"
  >("efectivo");
  const [notas, setNotas] = useState("");
  const [fecha, setFecha] = useState(today);
  const [esAPlazos, setEsAPlazos] = useState(false);
  const [pagosProgramados, setPagosProgramados] = useState<PagoProgramadoForm[]>([]);
  const [generarFactura, setGenerarFactura] = useState(false);
  const [numeroFactura, setNumeroFactura] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generar número sugerido cuando se activa el check de factura
  useEffect(() => {
    if (!generarFactura || numeroFactura) return;
    const dateStr = today.replace(/-/g, ""); // YYYYMMDD
    FacturaClienteVentaService.getFacturas()
      .then((facturas) => {
        // Buscar el mayor consecutivo del día actual
        const hoyPrefix = `SV-${dateStr}-`;
        let maxConsec = 0;
        for (const f of facturas) {
          if (f.numero_factura.startsWith(hoyPrefix)) {
            const parts = f.numero_factura.split("-");
            const consec = parseInt(parts[parts.length - 1], 10);
            if (!isNaN(consec) && consec > maxConsec) maxConsec = consec;
          }
        }
        // Si no hay del día de hoy, buscar el mayor global para el consecutivo
        if (maxConsec === 0 && facturas.length > 0) {
          for (const f of facturas) {
            const parts = f.numero_factura.split("-");
            const consec = parseInt(parts[parts.length - 1], 10);
            if (!isNaN(consec) && consec > maxConsec) maxConsec = consec;
          }
        }
        const siguiente = String(maxConsec + 1).padStart(4, "0");
        setNumeroFactura(`SV-${dateStr}-${siguiente}`);
      })
      .catch(() => {
        const siguiente = "0001";
        setNumeroFactura(`SV-${dateStr}-${siguiente}`);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generarFactura]);

  if (!solicitud) return null;

  const getPrecioMateriales = () => {
    if (solicitud.precio_total != null) return Number(solicitud.precio_total);
    return (solicitud.materiales ?? []).reduce((sum, m) => {
      if (m.subtotal != null) return sum + Number(m.subtotal);
      const precio = m.precio ?? m.material?.precio ?? 0;
      return sum + precio * m.cantidad;
    }, 0);
  };

  const precioMateriales = getPrecioMateriales();
  const descuentoNum = Math.min(10, Math.max(0, Number(descuento) || 0));
  const precioConDescuento = precioMateriales * (1 - descuentoNum / 100);
  const totalPagado = Number(solicitud.total_pagado ?? 0);
  const pendienteConDescuento = Math.max(0, precioConDescuento - totalPagado);
  const montoCubreTodo = Number(monto) >= pendienteConDescuento && pendienteConDescuento > 0;

  const totalProgramado = pagosProgramados.reduce(
    (sum, p) => sum + (Number(p.monto) || 0),
    0,
  );

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
    setDescuento("0");
    setMetodoPago("efectivo");
    setNotas("");
    setFecha(today);
    setEsAPlazos(false);
    setPagosProgramados([]);
    setGenerarFactura(false);
    setNumeroFactura("");
    setError(null);
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
    if (!fecha) {
      setError("Debe indicar la fecha del pago");
      return;
    }
    if (esAPlazos) {
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
    }
    if (generarFactura && !numeroFactura.trim()) {
      setError("Indica el número de factura");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await onSubmit({
        solicitud_venta_id: solicitud.id,
        monto: montoNum,
        moneda,
        tasa_cambio: tasaCambio ? Number(tasaCambio) : undefined,
        descuento_porcentaje: descuentoNum,
        metodo_pago: metodoPago,
        recibido_por: user?.nombre ?? "",
        notas: notas || undefined,
        es_a_plazos: esAPlazos && !montoCubreTodo,
        pagos_programados: esAPlazos && !montoCubreTodo
          ? pagosProgramados.map((p) => ({
              fecha: p.fecha,
              monto: Number(p.monto),
              nota: p.nota || undefined,
            }))
          : undefined,
        fecha,
        factura: generarFactura
          ? { numero_factura: numeroFactura.trim(), fecha_emision: fecha }
          : undefined,
      });
      handleClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al registrar el pago");
    } finally {
      setLoading(false);
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
          <DialogDescription>
            Solicitud{" "}
            <span className="font-medium text-gray-800">
              {solicitud.codigo || solicitud.id.slice(-6).toUpperCase()}
            </span>{" "}
            — {solicitud.cliente_venta?.nombre || "Sin nombre"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Resumen de precios */}
          <div className="rounded-lg bg-gray-50 border p-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-600">Precio materiales:</span>
              <span className="font-medium">{formatCurrency(precioMateriales)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Descuento ({descuentoNum}%):</span>
              <span className="font-medium text-orange-600">
                -{formatCurrency(precioMateriales * (descuentoNum / 100))}
              </span>
            </div>
            <div className="flex justify-between border-t pt-1 font-semibold">
              <span>Total con descuento:</span>
              <span className="text-blue-700">{formatCurrency(precioConDescuento)}</span>
            </div>
            <div className="flex justify-between text-green-700">
              <span>Ya pagado:</span>
              <span>{formatCurrency(totalPagado)}</span>
            </div>
            <div className="flex justify-between text-red-600 font-semibold">
              <span>Saldo pendiente:</span>
              <span>{formatCurrency(pendienteConDescuento)}</span>
            </div>
          </div>

          {/* Descuento */}
          <div className="space-y-1">
            <Label className="flex items-center gap-1">
              <Percent className="h-3.5 w-3.5" />
              Descuento (máx. 10%)
            </Label>
            <div className="relative">
              <Input
                type="number"
                min="0"
                max="10"
                step="0.5"
                value={descuento}
                onChange={(e) =>
                  setDescuento(
                    String(Math.min(10, Math.max(0, Number(e.target.value)))),
                  )
                }
                className="pr-8"
                placeholder="0"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                %
              </span>
            </div>
          </div>

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
                onChange={(e) => setMonto(e.target.value)}
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
          </div>

          {moneda !== "USD" && (
            <div className="space-y-1">
              <Label>Tasa de cambio (a USD)</Label>
              <Input
                type="number"
                min="0"
                step="0.0001"
                value={tasaCambio}
                onChange={(e) => setTasaCambio(e.target.value)}
                placeholder="Ej: 0.0042"
              />
            </div>
          )}

          {/* Método de pago */}
          <div className="space-y-1">
            <Label>
              Método de pago <span className="text-red-500">*</span>
            </Label>
            <Select
              value={metodoPago}
              onValueChange={(v: string) =>
                setMetodoPago(v as "efectivo" | "transferencia_bancaria")
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="efectivo">Efectivo</SelectItem>
                <SelectItem value="transferencia_bancaria">Transferencia bancaria</SelectItem>
              </SelectContent>
            </Select>
          </div>

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
          {!montoCubreTodo && <div
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

          {/* Generar factura */}
          <div
            className={`rounded-lg border p-3 transition-colors ${
              generarFactura ? "border-indigo-300 bg-indigo-50" : "border-gray-200 bg-gray-50"
            }`}
          >
            <button
              type="button"
              onClick={() => {
                setGenerarFactura((v) => !v);
                if (generarFactura) setNumeroFactura("");
              }}
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
                  Generar factura
                </span>
              </div>
            </button>

            {generarFactura && (
              <div className="mt-3 space-y-1">
                <Label className="text-xs">
                  Número de factura <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={numeroFactura}
                  onChange={(e) => setNumeroFactura(e.target.value)}
                  placeholder="SV-YYYYMMDD-0001"
                  className="font-mono text-sm"
                />
                <p className="text-xs text-gray-500">
                  Sugerido a partir de la última factura creada. Puedes editarlo.
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
