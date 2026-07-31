"use client";

import { useEffect, useMemo, useState } from "react";
import { Package } from "lucide-react";

import { Button } from "@/components/shared/atom/button";
import { Input } from "@/components/shared/atom/input";
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
import { MaterialImage } from "@/components/shared/molecule/material-image";
import { Textarea } from "@/components/shared/molecule/textarea";
import type {
  CompletarSolicitudData,
  SolicitudEnvio,
} from "@/lib/types/feats/solicitudes-envio/solicitud-envio-types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  solicitud: SolicitudEnvio | null;
  onConfirm: (payload: CompletarSolicitudData) => Promise<{ compra_id: string }>;
}

interface FilaFinal {
  material_id: string;
  material_codigo: string;
  material_nombre: string;
  cantidad_solicitada: number;
  cantidad: number;
  precio_unitario_cif: number;
}

function today(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function plus(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function CompletarSolicitudDialog({
  open,
  onOpenChange,
  solicitud,
  onConfirm,
}: Props) {
  const [nombre, setNombre] = useState("");
  const [proveedor, setProveedor] = useState("");
  const [tipo, setTipo] = useState<"maritimo" | "aereo" | "local" | "otro">(
    "maritimo",
  );
  const [fechaEnvio, setFechaEnvio] = useState(today());
  const [fechaLlegada, setFechaLlegada] = useState(plus(30));
  const [notas, setNotas] = useState("");
  const [filas, setFilas] = useState<FilaFinal[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !solicitud) return;
    setNombre(solicitud.codigo);
    setProveedor("");
    setTipo("maritimo");
    setFechaEnvio(today());
    setFechaLlegada(plus(30));
    setNotas("");
    setError(null);
    setFilas(
      solicitud.materiales.map((m) => ({
        material_id: m.material_id,
        material_codigo: m.material_codigo,
        material_nombre: m.material_nombre,
        cantidad_solicitada: m.cantidad,
        cantidad: m.cantidad,
        precio_unitario_cif: 0,
      })),
    );
  }, [open, solicitud]);

  const parcialesDetectadas = useMemo(
    () => filas.some((f) => f.cantidad < f.cantidad_solicitada),
    [filas],
  );

  const updateFila = (id: string, patch: Partial<FilaFinal>) =>
    setFilas((prev) => prev.map((f) => (f.material_id === id ? { ...f, ...patch } : f)));

  const handleSubmit = async () => {
    setError(null);
    if (!fechaEnvio || !fechaLlegada) {
      setError("Debes indicar fechas de envío y llegada.");
      return;
    }
    if (fechaLlegada < fechaEnvio) {
      setError("La fecha de llegada no puede ser anterior a la de envío.");
      return;
    }
    const invalida = filas.find((f) => !(f.cantidad > 0));
    if (invalida) {
      setError(`La cantidad de ${invalida.material_codigo} debe ser > 0.`);
      return;
    }

    const payload: CompletarSolicitudData = {
      nombre: nombre.trim() || undefined,
      proveedor: proveedor.trim() || undefined,
      tipo,
      fecha_envio: fechaEnvio,
      fecha_llegada_aproximada: fechaLlegada,
      notas_internacional: notas.trim() || undefined,
      materiales_finales: filas.map((f) => ({
        material_id: f.material_id,
        cantidad: Number(f.cantidad),
        precio_unitario_cif: Number(f.precio_unitario_cif) || 0,
      })),
    };
    setSubmitting(true);
    try {
      await onConfirm(payload);
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo completar");
    } finally {
      setSubmitting(false);
    }
  };

  if (!solicitud) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Completar solicitud — crear compra</DialogTitle>
          <DialogDescription>
            {solicitud.codigo} — se creará una <strong>Compra</strong> en estado
            &quot;solicitado&quot; con los materiales y cantidades finales. Si compras
            menos, la solicitud se cierra con lo comprado (no se abren remanentes).
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="nombre">Nombre de la compra</Label>
            <Input
              id="nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder={solicitud.codigo}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tipo">Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as typeof tipo)}>
              <SelectTrigger id="tipo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="maritimo">Marítimo</SelectItem>
                <SelectItem value="aereo">Aéreo</SelectItem>
                <SelectItem value="local">Local</SelectItem>
                <SelectItem value="otro">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="proveedor">Proveedor</Label>
            <Input
              id="proveedor"
              value={proveedor}
              onChange={(e) => setProveedor(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fenvio">Fecha envío</Label>
            <Input
              id="fenvio"
              type="date"
              value={fechaEnvio}
              onChange={(e) => setFechaEnvio(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fllegada">Fecha llegada aprox.</Label>
            <Input
              id="fllegada"
              type="date"
              value={fechaLlegada}
              onChange={(e) => setFechaLlegada(e.target.value)}
            />
          </div>
          <div className="space-y-1.5 md:col-span-3">
            <Label htmlFor="notas-int">Notas para la solicitud (opcional)</Label>
            <Textarea
              id="notas-int"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-slate-700">
              Materiales finales
            </div>
            {parcialesDetectadas && (
              <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                Compra parcial: la solicitud se cerrará con las cantidades
                ingresadas.
              </div>
            )}
          </div>
          <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-[45vh] overflow-y-auto">
            {filas.map((f) => (
              <div key={f.material_id} className="flex items-start gap-3 p-3">
                <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-slate-50 border border-slate-200 shrink-0">
                  <MaterialImage
                    foto={
                      solicitud.materiales.find((m) => m.material_id === f.material_id)
                        ?.material_foto ?? null
                    }
                    fotoDisponible={true}
                    alt={f.material_nombre}
                    imgClassName="w-full h-full object-contain p-1"
                    fallback={
                      <div className="w-full h-full flex items-center justify-center bg-amber-50">
                        <Package className="h-5 w-5 text-amber-700" />
                      </div>
                    }
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-900 truncate">
                    {f.material_nombre}
                  </div>
                  <div className="text-xs text-slate-500 font-mono">
                    {f.material_codigo}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Solicitado: {f.cantidad_solicitada}
                  </div>
                </div>
                <div className="flex items-end gap-2 shrink-0">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 mb-0.5">
                      Cantidad
                    </span>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={f.cantidad}
                      onChange={(e) =>
                        updateFila(f.material_id, {
                          cantidad: Number(e.target.value),
                        })
                      }
                      className="w-24 text-right"
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 mb-0.5">
                      CIF unitario
                    </span>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={f.precio_unitario_cif}
                      onChange={(e) =>
                        updateFila(f.material_id, {
                          precio_unitario_cif: Number(e.target.value),
                        })
                      }
                      className="w-28 text-right"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
            {error}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Creando compra…" : "Crear compra y cerrar solicitud"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
