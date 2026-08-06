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
import { useDatosAAveriguar } from "@/hooks/use-datos-a-averiguar";
import { DatoAAveriguarFormDialog } from "@/components/feats/datos-a-averiguar/dato-a-averiguar-form-dialog";
import { useToast } from "@/hooks/use-toast";
import type {
  DatoAAveriguar,
  MomentoDato,
} from "@/lib/types/feats/datos-a-averiguar/datos-a-averiguar-types";

const MOMENTO_LABEL: Record<MomentoDato, string> = {
  antes_de_ofertas: "Antes de ofertas",
  despues: "Después",
};

export default function DatosAAveriguarPage() {
  const { datos, loading, crearDato, actualizarDato, eliminarDato } =
    useDatosAAveriguar();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [datoEditando, setDatoEditando] = useState<DatoAAveriguar | null>(null);
  const [datoAEliminar, setDatoAEliminar] = useState<DatoAAveriguar | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const abrirCrear = () => {
    setDatoEditando(null);
    setIsFormOpen(true);
  };

  const abrirEditar = (dato: DatoAAveriguar) => {
    setDatoEditando(dato);
    setIsFormOpen(true);
  };

  const handleSubmit = async (data: {
    dato: string;
    motivo?: string | null;
    momento: MomentoDato;
    activo: boolean;
    orden: number;
  }) => {
    setIsSubmitting(true);
    try {
      const success = datoEditando
        ? await actualizarDato(datoEditando.id, data)
        : await crearDato(data);
      toast({
        title: success ? "Guardado" : "Error",
        description: success
          ? "El dato se guardó correctamente."
          : "No se pudo guardar el dato.",
        variant: success ? "default" : "destructive",
      });
      return success;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEliminar = async () => {
    if (!datoAEliminar) return;
    const success = await eliminarDato(datoAEliminar.id);
    toast({
      title: success ? "Eliminado" : "Error",
      description: success
        ? "El dato se eliminó."
        : "No se pudo eliminar el dato.",
      variant: success ? "default" : "destructive",
    });
    setDatoAEliminar(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <ModuleHeader
        title="Datos a averiguar"
        subtitle="Lo que el asistente de WhatsApp debe averiguarle al cliente durante la conversación, para recomendar mejor y adelantarle trabajo al comercial."
        actions={
          <Button onClick={abrirCrear}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo dato
          </Button>
        }
      />

      <div className="content-with-fixed-header max-w-5xl mx-auto p-4 sm:p-6">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : datos.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            Todavía no hay datos configurados.
          </div>
        ) : (
          <div className="bg-white rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dato</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Momento</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {datos.map((dato) => (
                  <TableRow key={dato.id}>
                    <TableCell className="font-medium max-w-xs">
                      {dato.dato}
                    </TableCell>
                    <TableCell className="max-w-md">
                      <span className="line-clamp-2 text-sm text-gray-600">
                        {dato.motivo || "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {MOMENTO_LABEL[dato.momento]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={dato.activo ? "default" : "secondary"}>
                        {dato.activo ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => abrirEditar(dato)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDatoAEliminar(dato)}
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

      <DatoAAveriguarFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        dato={datoEditando}
        isLoading={isSubmitting}
        onSubmit={handleSubmit}
      />

      <ConfirmDeleteDialog
        open={!!datoAEliminar}
        onOpenChange={(open) => !open && setDatoAEliminar(null)}
        title="Eliminar dato"
        message={`¿Seguro que quieres eliminar "${datoAEliminar?.dato}"? El asistente dejará de preguntarlo.`}
        onConfirm={handleEliminar}
      />
    </div>
  );
}
