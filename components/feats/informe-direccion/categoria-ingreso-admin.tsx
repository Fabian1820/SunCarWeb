"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Pencil, Plus, Save, Tag, X } from "lucide-react";
import { Button } from "@/components/shared/atom/button";
import { Input } from "@/components/shared/molecule/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/shared/molecule/card";
import { useToast } from "@/hooks/use-toast";
import { CategoriaIngresoService } from "@/lib/api-services";
import type { CategoriaIngreso } from "@/lib/api-types";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function CategoriaIngresoAdmin() {
  const [categorias, setCategorias] = useState<CategoriaIngreso[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [nuevaLabel, setNuevaLabel] = useState("");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editandoLabel, setEditandoLabel] = useState("");
  const { toast } = useToast();

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await CategoriaIngresoService.getAll();
      setCategorias(data);
    } catch (error: unknown) {
      toast({
        title: "Error al cargar categorías",
        description: getErrorMessage(error, "No se pudieron cargar las categorías."),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const crear = async () => {
    if (!nuevaLabel.trim() || submitting) return;
    setSubmitting(true);
    try {
      await CategoriaIngresoService.create(nuevaLabel.trim());
      toast({ title: "Categoría creada", description: `"${nuevaLabel.trim()}" ya está disponible.` });
      setNuevaLabel("");
      await cargar();
    } catch (error: unknown) {
      toast({
        title: "Error al crear la categoría",
        description: getErrorMessage(error, "No se pudo crear la categoría."),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const iniciarEdicion = (c: CategoriaIngreso) => {
    setEditandoId(c.id);
    setEditandoLabel(c.label);
  };

  const guardarEdicion = async () => {
    if (!editandoId || !editandoLabel.trim() || submitting) return;
    setSubmitting(true);
    try {
      await CategoriaIngresoService.update(editandoId, { label: editandoLabel.trim() });
      toast({ title: "Categoría actualizada" });
      setEditandoId(null);
      await cargar();
    } catch (error: unknown) {
      toast({
        title: "Error al actualizar la categoría",
        description: getErrorMessage(error, "No se pudo actualizar la categoría."),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="border-l-4 border-l-teal-600">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag className="h-5 w-5 text-teal-700" />
          Categorías de ingresos ({categorias.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Input
              placeholder="Nombre de la nueva categoría"
              value={nuevaLabel}
              onChange={(e) => setNuevaLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && crear()}
              disabled={submitting}
            />
          </div>
          <Button onClick={crear} disabled={submitting || !nuevaLabel.trim()}>
            <Plus className="h-4 w-4 mr-2" />
            Crear
          </Button>
        </div>
        <p className="text-sm text-gray-500">
          Las categorías se pueden crear y editar el nombre, pero no se pueden eliminar.
        </p>

        {loading ? (
          <div className="py-8 text-center">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-teal-600" />
          </div>
        ) : (
          <div className="divide-y divide-gray-100 border rounded-lg">
            {categorias.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                {editandoId === c.id ? (
                  <>
                    <Input
                      value={editandoLabel}
                      onChange={(e) => setEditandoLabel(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && guardarEdicion()}
                      disabled={submitting}
                      className="flex-1"
                      autoFocus
                    />
                    <Button size="icon" variant="ghost" onClick={guardarEdicion} disabled={submitting || !editandoLabel.trim()}>
                      <Save className="h-4 w-4 text-emerald-600" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setEditandoId(null)} disabled={submitting}>
                      <X className="h-4 w-4 text-gray-400" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="text-base text-gray-800">{c.label}</span>
                    <Button size="icon" variant="ghost" onClick={() => iniciarEdicion(c)}>
                      <Pencil className="h-4 w-4 text-gray-500" />
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
