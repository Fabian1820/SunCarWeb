"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
import { Button } from "@/components/shared/atom/button";
import { History } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AuditoriaEvento } from "@/lib/types/feats/auditoria/auditoria-types";
import {
  colorAccion,
  etiquetaAccion,
  formatearFecha,
} from "@/lib/types/feats/auditoria/auditoria-types";

interface Props {
  evento: AuditoriaEvento | null;
  abierto: boolean;
  onCerrar: () => void;
  /** Filtra la tabla por la entidad de este evento (toda su historia). */
  onVerHistorial?: (entidadId: string) => void;
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor?: string | number | null }) {
  if (valor === null || valor === undefined || valor === "") return null;
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-gray-500">{etiqueta}</p>
      <p className="break-all text-sm text-gray-900">{valor}</p>
    </div>
  );
}

function Bloque({ titulo, contenido }: { titulo: string; contenido: unknown }) {
  if (contenido === null || contenido === undefined) return null;
  if (typeof contenido === "object" && Object.keys(contenido as object).length === 0) {
    return null;
  }
  return (
    <div>
      <p className="mb-1 text-xs uppercase tracking-wide text-gray-500">{titulo}</p>
      <pre className="max-h-72 overflow-auto rounded-md bg-gray-900 p-3 text-xs leading-relaxed text-gray-100">
        {JSON.stringify(contenido, null, 2)}
      </pre>
    </div>
  );
}

/**
 * Detalle de un evento. Aquí es donde se responde a "¿qué monto puso?": el
 * bloque "Datos enviados" es el cuerpo tal cual llegó al backend, sin
 * contraseñas ni fotos.
 */
export function AuditoriaDetalleDialog({
  evento,
  abierto,
  onCerrar,
  onVerHistorial,
}: Props) {
  if (!evento) return null;

  return (
    <Dialog open={abierto} onOpenChange={(v) => !v && onCerrar()}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded px-2 py-1 text-xs font-medium",
                colorAccion(evento.accion),
              )}
            >
              {etiquetaAccion(evento.accion)}
            </span>
            <span>{evento.descripcion}</span>
          </DialogTitle>
          <DialogDescription>{formatearFecha(evento.fecha)}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-3">
          <Dato etiqueta="Usuario" valor={evento.usuario_nombre || evento.usuario_ci} />
          <Dato etiqueta="CI" valor={evento.usuario_ci} />
          <Dato etiqueta="Rol" valor={evento.usuario_rol} />
          <Dato etiqueta="Origen" valor={evento.origen} />
          <Dato etiqueta="Módulo" valor={evento.recurso} />
          <Dato etiqueta="Entidad" valor={evento.entidad_id} />
          <Dato etiqueta="Petición" valor={`${evento.metodo ?? ""} ${evento.path ?? ""}`} />
          <Dato etiqueta="Endpoint" valor={evento.operacion} />
          <Dato etiqueta="Resultado" valor={evento.estado_http} />
          <Dato etiqueta="Duración" valor={evento.duracion_ms ? `${evento.duracion_ms} ms` : null} />
          <Dato etiqueta="IP" valor={evento.ip} />
          <Dato etiqueta="Referencia" valor={evento.request_id} />
        </div>

        {evento.entidad_id && onVerHistorial && (
          <div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onVerHistorial(evento.entidad_id as string)}
            >
              <History className="mr-2 h-4 w-4" />
              Ver todo lo que se le hizo a {evento.entidad_id}
            </Button>
          </div>
        )}

        {evento.error && (
          <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            {evento.error}
          </div>
        )}

        <div className="space-y-4">
          <Bloque titulo="Datos enviados" contenido={evento.cuerpo} />
          <Bloque titulo="Parámetros de la ruta" contenido={evento.path_params} />
          <Bloque titulo="Parámetros de búsqueda" contenido={evento.query_params} />
          <Bloque titulo="Respuesta" contenido={evento.respuesta} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
