"use client";

import { Package } from "lucide-react";

import { Badge } from "@/components/shared/atom/badge";
import { MaterialImage } from "@/components/shared/molecule/material-image";
import type { SolicitudEnvio } from "@/lib/types/feats/solicitudes-envio/solicitud-envio-types";

import {
  EstadoSolicitudBadge,
  UrgenciaBadge,
} from "@/components/feats/solicitudes-envio/estado-badge";

interface Props {
  items: SolicitudEnvio[];
  loading: boolean;
  onRowClick: (s: SolicitudEnvio) => void;
  emptyText?: string;
  rowActions?: (s: SolicitudEnvio) => React.ReactNode;
}

function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso;
  }
}

function MaterialesThumbs({ s }: { s: SolicitudEnvio }) {
  if (s.materiales.length === 1) {
    const m = s.materiales[0];
    return (
      <div className="flex items-center gap-2 min-w-0">
        <div className="relative w-9 h-9 rounded-md overflow-hidden bg-slate-50 border border-slate-200 shrink-0">
          <MaterialImage
            foto={m.material_foto}
            fotoDisponible={true}
            alt={m.material_nombre}
            imgClassName="w-full h-full object-contain p-0.5"
            fallback={
              <div className="w-full h-full flex items-center justify-center bg-amber-50">
                <Package className="h-4 w-4 text-amber-700" />
              </div>
            }
          />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-mono text-slate-500 truncate">
            {m.material_codigo}
          </div>
          <div className="text-sm text-slate-900 truncate">
            {m.material_nombre}
          </div>
        </div>
      </div>
    );
  }
  const primeros = s.materiales.slice(0, 3);
  const extra = s.materiales.length - primeros.length;
  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        {primeros.map((m) => (
          <div
            key={m.material_id}
            className="relative w-8 h-8 rounded-md overflow-hidden bg-slate-50 border-2 border-white ring-1 ring-slate-200"
            title={`${m.material_codigo} — ${m.material_nombre}`}
          >
            <MaterialImage
              foto={m.material_foto}
              fotoDisponible={true}
              alt={m.material_nombre}
              imgClassName="w-full h-full object-contain p-0.5"
              fallback={
                <div className="w-full h-full flex items-center justify-center bg-amber-50">
                  <Package className="h-4 w-4 text-amber-700" />
                </div>
              }
            />
          </div>
        ))}
      </div>
      <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200">
        {s.materiales.length} materiales{extra > 0 ? "" : ""}
      </Badge>
    </div>
  );
}

export function SolicitudesEnvioTable({
  items,
  loading,
  onRowClick,
  emptyText,
  rowActions,
}: Props) {
  if (loading) {
    return (
      <div className="text-sm text-slate-500 text-center py-10">Cargando…</div>
    );
  }
  if (items.length === 0) {
    return (
      <div className="text-sm text-slate-500 text-center py-10">
        {emptyText ?? "No hay solicitudes que coincidan con los filtros."}
      </div>
    );
  }

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Código</th>
              <th className="text-left px-3 py-2 font-medium">Materiales</th>
              <th className="text-left px-3 py-2 font-medium">Estado</th>
              <th className="text-left px-3 py-2 font-medium">Fecha</th>
              <th className="text-left px-3 py-2 font-medium">Creada por</th>
              <th className="text-left px-3 py-2 font-medium">Almacén</th>
              <th className="text-right px-3 py-2 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((s) => (
              <tr
                key={s.id}
                className="hover:bg-slate-50 cursor-pointer"
                onClick={() => onRowClick(s)}
              >
                <td className="px-3 py-2 font-mono text-slate-700 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {s.codigo}
                    <UrgenciaBadge urgencia={s.urgencia} />
                  </div>
                </td>
                <td className="px-3 py-2 max-w-[260px]">
                  <MaterialesThumbs s={s} />
                </td>
                <td className="px-3 py-2">
                  <EstadoSolicitudBadge estado={s.estado} />
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-slate-600">
                  {fmtDate(s.creada_en)}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-slate-600">
                  {s.creada_por_ci ?? "—"}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-slate-600">
                  {s.almacen_id ? (
                    s.almacen_id
                  ) : (
                    <span className="text-slate-400 italic">Genérico</span>
                  )}
                </td>
                <td
                  className="px-3 py-2 text-right whitespace-nowrap"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-end gap-1">
                    {rowActions ? rowActions(s) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
