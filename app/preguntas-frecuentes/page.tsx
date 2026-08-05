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
import { usePreguntasFrecuentes } from "@/hooks/use-preguntas-frecuentes";
import { PreguntaFrecuenteFormDialog } from "@/components/feats/preguntas-frecuentes/pregunta-frecuente-form-dialog";
import { useToast } from "@/hooks/use-toast";
import type { PreguntaFrecuente } from "@/lib/types/feats/preguntas-frecuentes/preguntas-frecuentes-types";

export default function PreguntasFrecuentesPage() {
  const {
    preguntas,
    loading,
    crearPregunta,
    actualizarPregunta,
    eliminarPregunta,
  } = usePreguntasFrecuentes();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [preguntaEditando, setPreguntaEditando] =
    useState<PreguntaFrecuente | null>(null);
  const [preguntaAEliminar, setPreguntaAEliminar] =
    useState<PreguntaFrecuente | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const abrirCrear = () => {
    setPreguntaEditando(null);
    setIsFormOpen(true);
  };

  const abrirEditar = (pregunta: PreguntaFrecuente) => {
    setPreguntaEditando(pregunta);
    setIsFormOpen(true);
  };

  const handleSubmit = async (data: {
    pregunta: string;
    respuesta: string;
    activa: boolean;
    orden: number;
  }) => {
    setIsSubmitting(true);
    try {
      const success = preguntaEditando
        ? await actualizarPregunta(preguntaEditando.id, data)
        : await crearPregunta(data);
      toast({
        title: success ? "Guardado" : "Error",
        description: success
          ? "La pregunta frecuente se guardó correctamente."
          : "No se pudo guardar la pregunta.",
        variant: success ? "default" : "destructive",
      });
      return success;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEliminar = async () => {
    if (!preguntaAEliminar) return;
    const success = await eliminarPregunta(preguntaAEliminar.id);
    toast({
      title: success ? "Eliminada" : "Error",
      description: success
        ? "La pregunta frecuente se eliminó."
        : "No se pudo eliminar la pregunta.",
      variant: success ? "default" : "destructive",
    });
    setPreguntaAEliminar(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <ModuleHeader
        title="Preguntas Frecuentes"
        subtitle="Preguntas y respuestas oficiales que usa el asistente de WhatsApp para responder consultas fuera del catálogo de ofertas."
        actions={
          <Button onClick={abrirCrear}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva pregunta
          </Button>
        }
      />

      <div className="content-with-fixed-header max-w-5xl mx-auto p-4 sm:p-6">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : preguntas.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            Todavía no hay preguntas frecuentes cargadas.
          </div>
        ) : (
          <div className="bg-white rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pregunta</TableHead>
                  <TableHead>Respuesta</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preguntas.map((pregunta) => (
                  <TableRow key={pregunta.id}>
                    <TableCell className="font-medium max-w-xs">
                      {pregunta.pregunta}
                    </TableCell>
                    <TableCell className="max-w-md">
                      <span className="line-clamp-2 text-sm text-gray-600">
                        {pregunta.respuesta}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={pregunta.activa ? "default" : "secondary"}
                      >
                        {pregunta.activa ? "Activa" : "Inactiva"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => abrirEditar(pregunta)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPreguntaAEliminar(pregunta)}
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

      <PreguntaFrecuenteFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        pregunta={preguntaEditando}
        isLoading={isSubmitting}
        onSubmit={handleSubmit}
      />

      <ConfirmDeleteDialog
        open={!!preguntaAEliminar}
        onOpenChange={(open) => !open && setPreguntaAEliminar(null)}
        title="Eliminar pregunta frecuente"
        message={`¿Seguro que quieres eliminar "${preguntaAEliminar?.pregunta}"? El asistente dejará de usarla.`}
        onConfirm={handleEliminar}
      />
    </div>
  );
}
