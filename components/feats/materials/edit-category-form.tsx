"use client";

import type React from "react";
import { useState } from "react";
import { Button } from "@/components/shared/atom/button";
import { Input } from "@/components/shared/molecule/input";
import { Label } from "@/components/shared/atom/label";
import {
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Package,
} from "lucide-react";
import type { BackendCatalogoProductos } from "@/lib/material-types";
import { useToast } from "@/hooks/use-toast";

interface EditCategoryFormProps {
  category: BackendCatalogoProductos;
  onSubmit?: (data: { categoria: string }) => void;
  onCancel: () => void;
  onClose?: () => void;
}

export function EditCategoryForm({
  category,
  onSubmit,
  onCancel,
  onClose,
}: EditCategoryFormProps) {
  const { toast } = useToast();
  const [categoria, setCategoria] = useState(category.categoria);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(null);
    setError(null);

    if (!categoria.trim()) {
      setError("El nombre de la categoría es requerido");
      return;
    }

    setIsSubmitting(true);
    try {
      if (onSubmit) {
        await onSubmit({ categoria: categoria.trim() });
        if (onClose) onClose();
      }
    } catch (err: any) {
      const errorMessage = err.message || "Error al actualizar la categoría";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label
            htmlFor="category-name"
            className="text-sm font-medium text-gray-700 mb-2 block"
          >
            Nombre de la Categoría *
          </Label>
          <Input
            id="category-name"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            placeholder="Ej: Lubricantes, Repuestos, etc."
            className={error && !categoria ? "border-red-300" : ""}
          />
        </div>

        <div className="p-4 bg-gray-50 rounded-lg border">
          <div className="flex items-center space-x-2 mb-2">
            <Package className="h-5 w-5 text-gray-600" />
            <h3 className="text-sm font-semibold text-gray-900">
              Información de la Categoría
            </h3>
          </div>
          <p className="text-sm text-gray-600">
            Esta categoría contiene{" "}
            <strong>{category.materiales?.length || 0} materiales</strong>
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center text-red-600 mt-2">
          <AlertCircle className="h-4 w-4 mr-2" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-center text-green-600 mt-2">
          <CheckCircle2 className="h-4 w-4 mr-2" />
          <span>{success}</span>
        </div>
      )}
      <div className="flex justify-end space-x-3">
        <Button
          type="button"
          variant="outline"
          onClick={onClose || onCancel}
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Actualizar Categoría
        </Button>
      </div>
    </form>
  );
}
