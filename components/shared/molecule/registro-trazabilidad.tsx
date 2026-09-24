"use client";

import { useEffect, useState } from "react";
import { FilePen, FilePlus2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { apiRequest } from "@/lib/api-config";
import { cn } from "@/lib/utils";
import type {
  RecursoTrazabilidad,
  SelloTrazabilidad,
  Trazabilidad,
} from "@/lib/types/trazabilidad-types";

const FORMATO_FECHA = new Intl.DateTimeFormat("es-ES", {
  timeZone: "America/Havana",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function formatearFecha(iso?: string | null): string | null {
  if (!iso) return null;
  const fecha = new Date(iso);
  return Number.isNaN(fecha.getTime()) ? null : FORMATO_FECHA.format(fecha);
}

function conAutor(sello?: SelloTrazabilidad | null): SelloTrazabilidad | null {
  return sello && (sello.nombre || sello.ci) ? sello : null;
}

function Linea({
  icono: Icono,
  verbo,
  sello,
}: {
  icono: LucideIcon;
  verbo: string;
  sello: SelloTrazabilidad;
}) {
  const fecha = formatearFecha(sello.fecha);
  const detalle = [sello.ci && `CI ${sello.ci}`, sello.origen]
    .filter(Boolean)
    .join(" · ");
  return (
    <div className="flex items-center gap-1.5" title={detalle || undefined}>
      <Icono className="h-3.5 w-3.5 shrink-0 text-gray-400" />
      <span>
        {verbo}{" "}
        <span className="font-medium text-gray-700">
          {sello.nombre || sello.ci}
        </span>
        {fecha && <> · {fecha}</>}
      </span>
    </div>
  );
}

/**
 * "Creado por … · Modificado por …" al pie de una ficha.
 *
 * La pide al backend al abrirse (`GET /trazabilidad/{recurso}/{id}`), porque casi
 * ninguna ruta de lectura la incluye en su respuesta. No pinta nada mientras
 * carga, si falla o si el registro no la tiene (todo lo anterior al 24-sep-2026).
 * Si se creó y nadie lo ha tocado después, solo "Creado por".
 */
export function RegistroTrazabilidad({
  recurso,
  id,
  className,
}: {
  recurso: RecursoTrazabilidad;
  /** El `id` del registro o el identificador que use el panel (número, código, CI). */
  id?: string | null;
  className?: string;
}) {
  const [trazabilidad, setTrazabilidad] = useState<Trazabilidad | null>(null);

  useEffect(() => {
    setTrazabilidad(null);
    const valor = (id ?? "").trim();
    if (!valor) return;
    let vigente = true;
    apiRequest<{ success?: boolean; data?: Trazabilidad | null }>(
      `/trazabilidad/${recurso}/${encodeURIComponent(valor)}`,
    )
      .then((respuesta) => {
        if (vigente) setTrazabilidad(respuesta?.data ?? null);
      })
      .catch(() => {
        // Sin pie: la ficha se ve igual que antes.
      });
    return () => {
      vigente = false;
    };
  }, [recurso, id]);

  const creado = conAutor(trazabilidad?.creado);
  let modificado = conAutor(trazabilidad?.modificado);
  if (
    creado &&
    modificado &&
    creado.request_id &&
    creado.request_id === modificado.request_id
  ) {
    modificado = null;
  }
  if (!creado && !modificado) return null;

  return (
    <div
      className={cn(
        "flex flex-col gap-1 border-t border-gray-100 pt-3 text-xs text-gray-500 sm:flex-row sm:flex-wrap sm:gap-x-6",
        className,
      )}
    >
      {creado && <Linea icono={FilePlus2} verbo="Creado por" sello={creado} />}
      {modificado && (
        <Linea icono={FilePen} verbo="Modificado por" sello={modificado} />
      )}
    </div>
  );
}
