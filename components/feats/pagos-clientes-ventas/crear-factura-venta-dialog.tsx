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
import type { SolicitudVentaSummary } from "@/lib/api-types";
import type { FacturaClienteVentaCreateData } from "@/lib/types/feats/pagos-clientes-ventas/pago-cliente-venta-types";
import { FacturaClienteVentaService } from "@/lib/services/feats/pagos-clientes-ventas/pago-cliente-venta-service";
import { FileText } from "lucide-react";

interface CrearFacturaVentaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  solicitud: SolicitudVentaSummary | null;
  onSubmit: (data: FacturaClienteVentaCreateData) => Promise<void>;
}

export function CrearFacturaVentaDialog({
  open,
  onOpenChange,
  solicitud,
  onSubmit,
}: CrearFacturaVentaDialogProps) {
  const today = new Date().toISOString().split("T")[0];
  const [numeroFactura, setNumeroFactura] = useState("");
  const [fechaEmision, setFechaEmision] = useState(today);
  const [emitidaPor, setEmitidaPor] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-fetch del número sugerido al abrir el dialog
  useEffect(() => {
    if (!open) return;
    FacturaClienteVentaService.getSiguienteNumero()
      .then((n) => { if (n) setNumeroFactura(n); })
      .catch(() => {});
  }, [open]);

  if (!solicitud) return null;

  const handleClose = () => {
    setNumeroFactura("");
    setFechaEmision(today);
    setEmitidaPor("");
    setError(null);
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!numeroFactura.trim()) {
      setError("El número de factura es obligatorio");
      return;
    }
    if (!fechaEmision) {
      setError("La fecha de emisión es obligatoria");
      return;
    }
    if (!emitidaPor.trim()) {
      setError("El campo 'Emitida por' es obligatorio");
      return;
    }
    if (!solicitud.cliente_venta_id) {
      setError("La solicitud no tiene cliente_venta_id.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await onSubmit({
        numero: numeroFactura.trim(),
        fecha: fechaEmision,
        cliente_venta_id: solicitud.cliente_venta_id,
        solicitudes: [{ solicitud_venta_id: solicitud.id }],
        numero_factura: numeroFactura.trim(),
        solicitud_venta_id: solicitud.id,
        fecha_emision: fechaEmision,
        emitida_por: emitidaPor.trim(),
      });
      handleClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al crear la factura");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Emitir Factura
          </DialogTitle>
          <DialogDescription>
            Solicitud{" "}
            <span className="font-medium text-gray-800">
              {solicitud.codigo || solicitud.id.slice(-6).toUpperCase()}
            </span>{" "}
            — {solicitud.cliente_venta_nombre || "Sin nombre"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-1">
            <Label>
              Número de factura <span className="text-red-500">*</span>
            </Label>
            <Input
              value={numeroFactura}
              onChange={(e) => setNumeroFactura(e.target.value)}
              placeholder="Ej: FAC-2025-001"
            />
          </div>

          <div className="space-y-1">
            <Label>
              Fecha de emisión <span className="text-red-500">*</span>
            </Label>
            <Input
              type="date"
              value={fechaEmision}
              onChange={(e) => setFechaEmision(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label>
              Emitida por <span className="text-red-500">*</span>
            </Label>
            <Input
              value={emitidaPor}
              onChange={(e) => setEmitidaPor(e.target.value)}
              placeholder="Nombre de quien emite"
            />
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
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? "Creando..." : "Emitir Factura"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
