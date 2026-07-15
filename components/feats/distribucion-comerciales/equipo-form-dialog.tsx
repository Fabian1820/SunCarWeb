"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/shared/molecule/dialog";
import { Button } from "@/components/shared/atom/button";
import { Input } from "@/components/shared/molecule/input";
import { Label } from "@/components/shared/atom/label";
import { Checkbox } from "@/components/shared/molecule/checkbox";
import { Loader2 } from "lucide-react";
import type {
  ComercialDistribucion,
  EquipoComercial,
} from "@/lib/types/feats/distribucion-comerciales/distribucion-types";

interface EquipoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipo: EquipoComercial | null; // null = crear, con valor = editar
  comerciales: ComercialDistribucion[];
  isLoading?: boolean;
  onSubmit: (nombre: string, integrantes: string[]) => Promise<boolean>;
}

export function EquipoFormDialog({
  open,
  onOpenChange,
  equipo,
  comerciales,
  isLoading,
  onSubmit,
}: EquipoFormDialogProps) {
  const [nombre, setNombre] = useState("");
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      setNombre(equipo?.nombre || "");
      setSeleccionados(
        new Set((equipo?.integrantes || []).map((i) => i.CI)),
      );
    }
  }, [open, equipo]);

  const esElegible = (c: ComercialDistribucion) =>
    c.cargo === "Comercial Instaladora" || c.es_apoyo_instaladora;

  const perteneceAOtroEquipo = (c: ComercialDistribucion) =>
    !!c.equipo_id && c.equipo_id !== equipo?.id;

  const toggleComercial = (ci: string) => {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(ci)) {
        next.delete(ci);
      } else {
        next.add(ci);
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!nombre.trim() || seleccionados.size === 0) return;
    const ok = await onSubmit(nombre.trim(), Array.from(seleccionados));
    if (ok) onOpenChange(false);
  };

  const puedeGuardar = nombre.trim() !== "" && seleccionados.size > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{equipo ? "Editar equipo" : "Crear equipo"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="nombre-equipo">Nombre del equipo</Label>
            <Input
              id="nombre-equipo"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Equipo Habana"
            />
          </div>

          <div>
            <Label>Comerciales</Label>
            <p className="text-xs text-gray-500 mb-2">
              Instaladora siempre disponibles. Ventas solo si están marcadas
              como apoyo a instaladora. Un comercial ya asignado a otro
              equipo se moverá a este si lo seleccionas.
            </p>
            <div className="max-h-64 overflow-y-auto space-y-1 border rounded-md p-2">
              {comerciales.map((c) => {
                const elegible = esElegible(c);
                return (
                  <label
                    key={c.CI}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded ${
                      elegible
                        ? "cursor-pointer hover:bg-gray-50"
                        : "opacity-40 cursor-not-allowed"
                    }`}
                  >
                    <Checkbox
                      checked={seleccionados.has(c.CI)}
                      disabled={!elegible}
                      onCheckedChange={() => toggleComercial(c.CI)}
                    />
                    <span className="text-sm text-gray-900">{c.nombre}</span>
                    <span className="text-xs text-gray-500">
                      ({c.cargo === "Comercial Instaladora" ? "Instaladora" : "Ventas · apoyo"})
                    </span>
                    {perteneceAOtroEquipo(c) && (
                      <span className="text-xs text-amber-600 ml-auto">
                        en {c.equipo_nombre}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!puedeGuardar || isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : equipo ? (
              "Guardar cambios"
            ) : (
              "Crear equipo"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
