"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shared/molecule/table";
import { Loader2, ShieldAlert, Smartphone, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AuditoriaEvento } from "@/lib/types/feats/auditoria/auditoria-types";
import {
  colorAccion,
  etiquetaAccion,
  formatearFecha,
} from "@/lib/types/feats/auditoria/auditoria-types";

interface Props {
  eventos: AuditoriaEvento[];
  loading: boolean;
  onVerDetalle: (evento: AuditoriaEvento) => void;
}

export function AuditoriaTabla({ eventos, loading, onVerDetalle }: Props) {
  if (loading && eventos.length === 0) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-gray-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        Cargando la bitácora...
      </div>
    );
  }

  if (eventos.length === 0) {
    return (
      <div className="py-16 text-center text-gray-500">
        <ShieldAlert className="mx-auto mb-3 h-10 w-10 text-gray-300" />
        No hay eventos con esos filtros.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-44">Fecha</TableHead>
            <TableHead className="w-48">Usuario</TableHead>
            <TableHead className="w-32">Acción</TableHead>
            <TableHead>Qué hizo</TableHead>
            <TableHead className="w-36">Módulo</TableHead>
            <TableHead className="w-24 text-right">Resultado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {eventos.map((evento) => (
            <TableRow
              key={evento.id}
              onClick={() => onVerDetalle(evento)}
              className={cn(
                "cursor-pointer",
                !evento.exito && "bg-rose-50/60 hover:bg-rose-50",
              )}
            >
              <TableCell className="whitespace-nowrap text-sm text-gray-600">
                {formatearFecha(evento.fecha)}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {evento.origen === "app" ? (
                    <Smartphone className="h-4 w-4 shrink-0 text-gray-400" />
                  ) : (
                    <Monitor className="h-4 w-4 shrink-0 text-gray-400" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-900">
                      {evento.usuario_nombre || evento.usuario_ci || "Anónimo"}
                    </p>
                    {evento.usuario_rol && (
                      <p className="truncate text-xs text-gray-500">{evento.usuario_rol}</p>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <span
                  className={cn(
                    "inline-block rounded px-2 py-1 text-xs font-medium",
                    colorAccion(evento.accion),
                  )}
                >
                  {etiquetaAccion(evento.accion)}
                </span>
              </TableCell>
              <TableCell>
                <p className="text-sm text-gray-900">{evento.descripcion}</p>
                <p className="truncate text-xs text-gray-500">
                  {evento.metodo} {evento.path}
                </p>
              </TableCell>
              <TableCell className="text-sm text-gray-600">{evento.recurso}</TableCell>
              <TableCell className="text-right">
                <span
                  className={cn(
                    "inline-block rounded px-2 py-1 text-xs font-medium",
                    evento.exito
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-rose-100 text-rose-700",
                  )}
                >
                  {evento.estado_http ?? "-"}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
