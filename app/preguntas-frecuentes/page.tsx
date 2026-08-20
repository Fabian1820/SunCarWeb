"use client";

import { useState } from "react";
import { ModuleHeader } from "@/components/shared/organism/module-header";
import { Button } from "@/components/shared/atom/button";
import { Badge } from "@/components/shared/atom/badge";
import { Input } from "@/components/shared/atom/input";
import { Checkbox } from "@/components/shared/molecule/checkbox";
import { ConfirmDeleteDialog } from "@/components/shared/molecule/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shared/molecule/table";
import { Plus, Pencil, Trash2, Loader2, Search } from "lucide-react";
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
  const [busqueda, setBusqueda] = useState("");

  const termino = busqueda.trim().toLowerCase();
  const preguntasVisibles = termino
    ? preguntas.filter(
        (p) =>
          p.pregunta.toLowerCase().includes(termino) ||
          p.respuesta.toLowerCase().includes(termino)
      )
    : preguntas;

  const revisadas = preguntas.filter((p) => p.revisada).length;

  // El check se guarda al momento, sin abrir el formulario: la idea es poder
  // ir marcando mientras se repasa la lista.
  const marcarRevisada = async (
    pregunta: PreguntaFrecuente,
    revisada: boolean
  ) => {
    try {
      await actualizarPregunta(pregunta.id, { revisada });
    } catch {
      toast({
        title: "No se pudo guardar",
        description: "Vuelve a intentarlo en un momento.",
        variant: "destructive",
      });
    }
  };

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

      <main className="content-with-fixed-header px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar en preguntas y respuestas"
              className="pl-9"
            />
          </div>
          <span className="text-sm text-gray-500 whitespace-nowrap">
            {revisadas} de {preguntas.length} revisadas
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : preguntas.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            Todavía no hay preguntas frecuentes cargadas.
          </div>
        ) : preguntasVisibles.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            Ninguna pregunta coincide con «{busqueda}».
          </div>
        ) : (
          <div className="bg-white rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24 text-center">Revisada</TableHead>
                  <TableHead>Pregunta</TableHead>
                  <TableHead>Respuesta</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preguntasVisibles.map((pregunta) => (
                  <TableRow key={pregunta.id}>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={!!pregunta.revisada}
                        onCheckedChange={(valor) =>
                          marcarRevisada(pregunta, valor === true)
                        }
                        aria-label={`Marcar "${pregunta.pregunta}" como revisada`}
                      />
                    </TableCell>
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
      </main>

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
