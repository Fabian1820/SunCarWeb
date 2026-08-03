"use client";

import { useEffect, useMemo, useState } from "react";
import { Package, Trash2 } from "lucide-react";

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
  MaterialSolicitudEnvio,
  SolicitudEnvio,
  SolicitudEnvioCreateData,
  SolicitudEnvioUpdateData,
  UrgenciaSolicitudEnvio,
} from "@/lib/types/feats/solicitudes-envio/solicitud-envio-types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Prellena las filas al abrir. Se puede editar cantidad y notas. */
  materialesIniciales: MaterialSolicitudEnvio[];
  /** Si viene, se edita una solicitud pendiente en vez de crear una nueva. */
  solicitudExistente?: SolicitudEnvio | null;
  onCreate: (data: SolicitudEnvioCreateData) => Promise<void>;
  onUpdate?: (id: string, data: SolicitudEnvioUpdateData) => Promise<void>;
}

type Fila = MaterialSolicitudEnvio;

export function CrearSolicitudEnvioDialog({
  open,
  onOpenChange,
  materialesIniciales,
  solicitudExistente,
  onCreate,
  onUpdate,
}: Props) {
  const editando = Boolean(solicitudExistente);
  const [almacenId, setAlmacenId] = useState<string>("");
  const [urgencia, setUrgencia] = useState<UrgenciaSolicitudEnvio>("normal");
  const [notas, setNotas] = useState("");
  const [filas, setFilas] = useState<Fila[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (solicitudExistente) {
      setAlmacenId(solicitudExistente.almacen_id ?? "");
      setUrgencia(solicitudExistente.urgencia);
      setNotas(solicitudExistente.notas ?? "");
      setFilas(solicitudExistente.materiales.map((m) => ({ ...m })));
    } else {
      setAlmacenId("");
      setUrgencia("normal");
      setNotas("");
      setFilas(materialesIniciales.map((m) => ({ ...m })));
    }
    setError(null);
  }, [open, materialesIniciales, solicitudExistente]);

  const removeFila = (materialId: string) =>
    setFilas((prev) => prev.filter((f) => f.material_id !== materialId));

  const updateFila = (materialId: string, patch: Partial<Fila>) =>
    setFilas((prev) =>
      prev.map((f) => (f.material_id === materialId ? { ...f, ...patch } : f)),
    );

  const totalMateriales = filas.length;
  const totalUnidades = useMemo(
    () => filas.reduce((acc, f) => acc + (Number(f.cantidad) || 0), 0),
    [filas],
  );

  const handleSubmit = async () => {
    setError(null);
    if (filas.length === 0) {
      setError("Agrega al menos un material.");
      return;
    }
    const invalida = filas.find((f) => !(Number(f.cantidad) > 0));
    if (invalida) {
      setError(
        `La cantidad de ${invalida.material_codigo} debe ser mayor a 0.`,
      );
      return;
    }

    const materiales: MaterialSolicitudEnvio[] = filas.map((f) => ({
      ...f,
      cantidad: Number(f.cantidad),
    }));

    setSubmitting(true);
    try {
      if (editando && solicitudExistente && onUpdate) {
        await onUpdate(solicitudExistente.id, {
          almacen_id: almacenId || null,
          urgencia,
          notas: notas || null,
          materiales,
        });
      } else {
        await onCreate({
          almacen_id: almacenId || null,
          urgencia,
          notas: notas || null,
          materiales,
        });
      }
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editando ? "Editar solicitud de envío" : "Nueva solicitud de envío"}
          </DialogTitle>
          <DialogDescription>
            {totalMateriales === 1 ? "1 material" : `${totalMateriales} materiales`}
            {" · "}
            {totalUnidades} unidades
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="urgencia">Urgencia</Label>
            <Select
              value={urgencia}
              onValueChange={(v) => setUrgencia(v as UrgenciaSolicitudEnvio)}
            >
              <SelectTrigger id="urgencia">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="alta">Alta (urgente)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="almacen">Almacén destino (opcional)</Label>
            <Input
              id="almacen"
              value={almacenId}
              onChange={(e) => setAlmacenId(e.target.value)}
              placeholder="Vacío = solicitud genérica"
            />
          </div>
          <div className="space-y-1.5 md:col-span-3">
            <Label htmlFor="notas">Notas</Label>
            <Textarea
              id="notas"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Contexto adicional para la compradora internacional"
              rows={2}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium text-slate-700">Materiales</div>
          <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-[45vh] overflow-y-auto">
            {filas.length === 0 ? (
              <div className="text-sm text-slate-500 p-4 text-center">
                No hay materiales en la solicitud.
              </div>
            ) : (
              filas.map((f) => (
                <div
                  key={f.material_id}
                  className="flex items-start gap-3 p-3"
                >
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-slate-50 border border-slate-200 shrink-0">
                    <MaterialImage
                      foto={f.material_foto}
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
                      {f.um ? ` · ${f.um}` : ""}
                    </div>
                    <Textarea
                      value={f.notas ?? ""}
                      onChange={(e) =>
                        updateFila(f.material_id, { notas: e.target.value })
                      }
                      placeholder="Notas por material (opcional)"
                      rows={1}
                      className="mt-1.5 text-xs"
                    />
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
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
                      className="w-28 text-right"
                    />
                    <button
                      type="button"
                      onClick={() => removeFila(f.material_id)}
                      className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1"
                    >
                      <Trash2 className="h-3 w-3" /> Quitar
                    </button>
                  </div>
                </div>
              ))
            )}
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
          <Button onClick={handleSubmit} disabled={submitting || filas.length === 0}>
            {submitting
              ? "Guardando…"
              : editando
                ? "Guardar cambios"
                : "Crear solicitud"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
