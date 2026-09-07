"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

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
import { Textarea } from "@/components/shared/molecule/textarea";
import {
  ETIQUETA_CATEGORIA,
  type ActualizacionSistemaCreateData,
  type CategoriaActualizacion,
} from "@/lib/types/feats/actualizaciones-sistema/actualizaciones-sistema-types";

interface PublicarActualizacionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPublicar: (data: ActualizacionSistemaCreateData) => Promise<boolean>;
}

export function PublicarActualizacionDialog({
  open,
  onOpenChange,
  onPublicar,
}: PublicarActualizacionDialogProps) {
  const [titulo, setTitulo] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [categoria, setCategoria] = useState<CategoriaActualizacion>("otro");
  const [publicando, setPublicando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTitulo("");
      setMensaje("");
      setCategoria("otro");
      setError(null);
    }
  }, [open]);

  const handlePublicar = async () => {
    if (!titulo.trim() || !mensaje.trim()) {
      setError("Título y mensaje son obligatorios.");
      return;
    }
    setPublicando(true);
    setError(null);
    const ok = await onPublicar({
      titulo: titulo.trim(),
      mensaje: mensaje.trim(),
      categoria,
    });
    setPublicando(false);
    if (ok) onOpenChange(false);
    else setError("No se pudo publicar. Inténtalo de nuevo.");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Publicar actualización</DialogTitle>
          <DialogDescription>
            Se ve en Inicio (hoy y mañana la verán como "ayer") y puedes
            notificarla directo a quien quieras.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="update-titulo">Título</Label>
            <Input
              id="update-titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej: Nuevo módulo de citas"
              disabled={publicando}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="update-categoria">Categoría</Label>
            <Select
              value={categoria}
              onValueChange={(v) => setCategoria(v as CategoriaActualizacion)}
              disabled={publicando}
            >
              <SelectTrigger id="update-categoria">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ETIQUETA_CATEGORIA).map(([valor, etiqueta]) => (
                  <SelectItem key={valor} value={valor}>
                    {etiqueta}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="update-mensaje">Mensaje</Label>
            <Textarea
              id="update-mensaje"
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              placeholder="Qué se hizo, para qué sirve, y a quién afecta."
              rows={4}
              disabled={publicando}
            />
          </div>

          {error && (
            <p className="rounded-md bg-red-50 p-2 text-sm text-red-700">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={publicando}
          >
            Cancelar
          </Button>
          <Button onClick={handlePublicar} disabled={publicando}>
            {publicando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Publicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
