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
import { Label } from "@/components/shared/atom/label";
import { Loader2, UserRoundPlus } from "lucide-react";
import type {
  ClienteVenta,
  ClienteVentaCreateData,
  ClienteVentaUpdateData,
} from "@/lib/api-types";

interface UpsertClienteVentaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (
    data: ClienteVentaCreateData | ClienteVentaUpdateData,
  ) => Promise<void>;
  cliente?: ClienteVenta | null;
  isLoading?: boolean;
}

export function UpsertClienteVentaDialog({
  open,
  onOpenChange,
  onSubmit,
  cliente,
  isLoading = false,
}: UpsertClienteVentaDialogProps) {
  const [nombre, setNombre] = useState("");
  const [direccion, setDireccion] = useState("");
  const [telefono, setTelefono] = useState("");
  const [ci, setCi] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNombre(cliente?.nombre || "");
    setDireccion(cliente?.direccion || "");
    setTelefono(cliente?.telefono || "");
    setCi(cliente?.ci || "");
  }, [open, cliente]);

  const isEdit = Boolean(cliente?.id);

  const canSubmit = useMemo(() => {
    if (!nombre.trim()) return false;
    if (isLoading || submitting) return false;
    return true;
  }, [nombre, isLoading, submitting]);

  const handleSubmit = async () => {
    if (!canSubmit) return;

    const payload = {
      nombre: nombre.trim(),
      direccion: direccion.trim() || undefined,
      telefono: telefono.trim() || undefined,
      ci: ci.trim() || undefined,
    };

    setSubmitting(true);
    try {
      await onSubmit(payload);
      onOpenChange(false);
    } catch {
      // El padre muestra el mensaje de error y mantiene el dialogo abierto.
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserRoundPlus className="h-5 w-5 text-teal-600" />
            {isEdit ? "Editar cliente venta" : "Nuevo cliente venta"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="cliente-venta-nombre">
              Nombre <span className="text-red-500">*</span>
            </Label>
            <Input
              id="cliente-venta-nombre"
              value={nombre}
              onChange={(event) => setNombre(event.target.value)}
              placeholder="Nombre del cliente"
              maxLength={120}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cliente-venta-direccion">Direccion</Label>
            <Input
              id="cliente-venta-direccion"
              value={direccion}
              onChange={(event) => setDireccion(event.target.value)}
              placeholder="Direccion del cliente"
              maxLength={200}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cliente-venta-telefono">Telefono</Label>
              <Input
                id="cliente-venta-telefono"
                value={telefono}
                onChange={(event) => setTelefono(event.target.value)}
                placeholder="Ej: 5551234"
                maxLength={40}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cliente-venta-ci">CI</Label>
              <Input
                id="cliente-venta-ci"
                value={ci}
                onChange={(event) => setCi(event.target.value)}
                placeholder="Carnet de identidad"
                maxLength={40}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t mt-6">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : isEdit ? (
                "Guardar cambios"
              ) : (
                "Crear cliente"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
