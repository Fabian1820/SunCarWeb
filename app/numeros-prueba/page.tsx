"use client";

import { useState } from "react";
import { ModuleHeader } from "@/components/shared/organism/module-header";
import { Button } from "@/components/shared/atom/button";
import { Badge } from "@/components/shared/atom/badge";
import { ConfirmDeleteDialog } from "@/components/shared/molecule/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shared/molecule/table";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { useNumerosPrueba } from "@/hooks/use-numeros-prueba";
import { NumeroPruebaFormDialog } from "@/components/feats/numeros-prueba/numero-prueba-form-dialog";
import { useToast } from "@/hooks/use-toast";
import type { NumeroPrueba } from "@/lib/types/feats/numeros-prueba/numeros-prueba-types";

export default function NumerosPruebaPage() {
  const {
    numeros,
    loading,
    crearNumero,
    actualizarNumero,
    eliminarNumero,
  } = useNumerosPrueba();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [numeroEditando, setNumeroEditando] = useState<NumeroPrueba | null>(
    null,
  );
  const [numeroAEliminar, setNumeroAEliminar] = useState<NumeroPrueba | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const abrirCrear = () => {
    setNumeroEditando(null);
    setIsFormOpen(true);
  };

  const abrirEditar = (numero: NumeroPrueba) => {
    setNumeroEditando(numero);
    setIsFormOpen(true);
  };

  const handleSubmit = async (data: {
    numero: string;
    nota?: string | null;
    activo: boolean;
    orden: number;
  }) => {
    setIsSubmitting(true);
    try {
      const success = numeroEditando
        ? await actualizarNumero(numeroEditando.id, data)
        : await crearNumero(data);
      toast({
        title: success ? "Guardado" : "Error",
        description: success
          ? "El numero se guardó correctamente."
          : "No se pudo guardar el numero.",
        variant: success ? "default" : "destructive",
      });
      return success;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEliminar = async () => {
    if (!numeroAEliminar) return;
    const success = await eliminarNumero(numeroAEliminar.id);
    toast({
      title: success ? "Eliminado" : "Error",
      description: success
        ? "El numero se eliminó."
        : "No se pudo eliminar el numero.",
      variant: success ? "default" : "destructive",
    });
    setNumeroAEliminar(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f4f9f6] via-white to-[#e8f4ee]">
      <ModuleHeader
        title="Números de Prueba"
        subtitle="Números de teléfono a los que el asistente de WhatsApp siempre responde, sin importar el historial. Los cambios tardan hasta 15 segundos en aplicar."
        actions={
          <Button onClick={abrirCrear}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo número
          </Button>
        }
      />

      <div className="content-with-fixed-header max-w-3xl mx-auto p-4 sm:p-6">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : numeros.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            Todavía no hay números de prueba cargados.
          </div>
        ) : (
          <div className="bg-white rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Nota</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {numeros.map((numeroPrueba) => (
                  <TableRow key={numeroPrueba.id}>
                    <TableCell className="font-medium">
                      {numeroPrueba.numero}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {numeroPrueba.nota || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={numeroPrueba.activo ? "default" : "secondary"}
                      >
                        {numeroPrueba.activo ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => abrirEditar(numeroPrueba)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setNumeroAEliminar(numeroPrueba)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <NumeroPruebaFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        numeroPrueba={numeroEditando}
        isLoading={isSubmitting}
        onSubmit={handleSubmit}
      />

      <ConfirmDeleteDialog
        open={!!numeroAEliminar}
        onOpenChange={(open) => !open && setNumeroAEliminar(null)}
        title="Eliminar número de prueba"
        message={`¿Seguro que quieres eliminar "${numeroAEliminar?.numero}"? Dejará de recibir respuestas automáticas de prueba.`}
        onConfirm={handleEliminar}
      />
    </div>
  );
}
