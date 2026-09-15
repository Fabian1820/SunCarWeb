"use client";

import { useState } from "react";
import { History } from "lucide-react";
import { Button } from "@/components/shared/atom/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
import { HistorialClientePanel } from "@/components/feats/historial/historial-cliente-panel";

/**
 * "Ver historial" de un cliente: todo lo comercial y de operaciones, en orden.
 *
 * Va aparte de la tabla de clientes para que ponerlo allí sea una sola línea.
 */
export function BotonHistorialCliente({ numero, nombre }: { numero: string; nombre?: string }) {
  const [abierto, setAbierto] = useState(false);
  if (!numero) return null;
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setAbierto(true)}
        className="h-7 w-7 p-0 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700"
        title="Ver historial"
        aria-label={`Ver el historial de ${nombre || numero}`}
      >
        <History className="h-3 w-3" />
      </Button>
      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent className="max-h-[92vh] max-w-4xl gap-0 overflow-y-auto bg-gray-50 p-0">
          <DialogHeader className="sticky top-0 z-20 border-b border-gray-200 bg-white px-6 py-4 text-left">
            <DialogTitle>Historial de {nombre || numero}</DialogTitle>
            <DialogDescription>Todo lo comercial y de operaciones, en el orden en que pasó.</DialogDescription>
          </DialogHeader>
          <div className="px-4 pb-8 pt-4 sm:px-6">
            {abierto && (
              <HistorialClientePanel
                numero={numero}
                vista="comercial"
                enDialogo
                onVolver={() => setAbierto(false)}
                volverTexto="Cerrar"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
