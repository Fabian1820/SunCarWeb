"use client";

import { Badge } from "@/components/shared/atom/badge";
import { Button } from "@/components/shared/atom/button";
import {
  CalendarDays,
  Eye,
  Package,
  PackagePlus,
  Warehouse,
} from "lucide-react";
import {
  SOLICITUD_ENTRADA_ESTADO_LABELS,
  SOLICITUD_ENTRADA_ORIGEN_LABELS,
  type EstadoSolicitudEntrada,
  type OrigenSolicitudEntrada,
  type SolicitudEntradaAlmacen,
} from "@/lib/types/feats/solicitudes-entrada-almacen/solicitud-entrada-almacen-types";

const formatDate = (value?: string) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
};

const shortId = (id: string): string => {
  if (!id) return "—";
  return id.length > 8 ? id.slice(-8) : id;
};

function EstadoBadge({ estado }: { estado: EstadoSolicitudEntrada }) {
  const styles: Record<EstadoSolicitudEntrada, string> = {
    pendiente: "bg-amber-50 text-amber-700 border-amber-200",
    aprobada: "bg-emerald-50 text-emerald-700 border-emerald-200",
    denegada: "bg-red-50 text-red-700 border-red-200",
  };
  return (
    <Badge variant="outline" className={`text-xs font-medium ${styles[estado]}`}>
      {SOLICITUD_ENTRADA_ESTADO_LABELS[estado]}
    </Badge>
  );
}

function OrigenBadge({ origen }: { origen: OrigenSolicitudEntrada }) {
  const styles: Record<OrigenSolicitudEntrada, string> = {
    compra: "bg-blue-50 text-blue-700 border-blue-200",
    consignacion: "bg-purple-50 text-purple-700 border-purple-200",
  };
  return (
    <Badge variant="outline" className={`text-xs font-medium ${styles[origen]}`}>
      {SOLICITUD_ENTRADA_ORIGEN_LABELS[origen]}
    </Badge>
  );
}

interface SolicitudesEntradaTableProps {
  solicitudes: SolicitudEntradaAlmacen[];
  compraNameById: Record<string, string>;
  almacenNameById: Record<string, string>;
  onView: (solicitud: SolicitudEntradaAlmacen) => void;
}

export function SolicitudesEntradaTable({
  solicitudes,
  compraNameById,
  almacenNameById,
  onView,
}: SolicitudesEntradaTableProps) {
  if (solicitudes.length === 0) {
    return (
      <div className="text-center py-16">
        <PackagePlus className="h-12 w-12 text-gray-200 mx-auto mb-3" />
        <p className="text-base font-medium text-gray-500">No hay solicitudes</p>
        <p className="text-sm text-gray-400 mt-1">Crea la primera desde una compra con stock pendiente.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-50 border-y border-gray-200">
            <th className="text-left py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wide">
              Solicitud
            </th>
            <th className="text-left py-3 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">
              Origen
            </th>
            <th className="text-left py-3 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">
              Almacén
            </th>
            <th className="text-center py-3 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wide w-32">
              Materiales
            </th>
            <th className="text-center py-3 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wide w-28">
              Estado
            </th>
            <th className="text-center py-3 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wide w-28">
              F. creación
            </th>
            <th className="text-center py-3 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wide w-20">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody>
          {solicitudes.map((sol, idx) => {
            const totalUnidades = sol.materiales.reduce((s, m) => s + m.cantidad_total, 0);
            const compraName = compraNameById[sol.compra_id] ?? null;
            const almacenName = almacenNameById[sol.almacen_id] ?? null;
            return (
              <tr
                key={sol.id}
                className={`border-b border-gray-100 transition-colors ${
                  idx % 2 === 0 ? "bg-white hover:bg-gray-50" : "bg-gray-50 hover:bg-gray-100"
                }`}
              >
                <td className="py-3 px-4 font-mono text-xs text-gray-500">
                  #{shortId(sol.id)}
                </td>
                <td className="py-3 px-3">
                  <div className="flex flex-col gap-1">
                    <OrigenBadge origen={sol.origen} />
                    {sol.origen === "compra" ? (
                      compraName ? (
                        <p className="font-medium text-gray-700 text-xs truncate max-w-xs">
                          {compraName}
                        </p>
                      ) : (
                        <p className="text-xs text-gray-400 font-mono">
                          #{shortId(sol.compra_id)}
                        </p>
                      )
                    ) : (
                      <p className="text-xs text-gray-500 font-mono">
                        Cons. #{shortId(sol.consignacion_id ?? "")}
                      </p>
                    )}
                  </div>
                </td>
                <td className="py-3 px-3">
                  <div className="flex items-center gap-1.5 text-gray-700">
                    <Warehouse className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                    <span className="truncate text-sm">{almacenName ?? shortId(sol.almacen_id)}</span>
                  </div>
                </td>
                <td className="py-3 px-3 text-center">
                  <div className="inline-flex items-center gap-1.5 text-xs text-gray-600">
                    <Package className="h-3 w-3 text-gray-400" />
                    {sol.materiales.length} ref · <span className="font-medium">{totalUnidades}</span> uds
                  </div>
                </td>
                <td className="py-3 px-3 text-center">
                  <EstadoBadge estado={sol.estado} />
                </td>
                <td className="py-3 px-3 text-center">
                  <div className="inline-flex items-center gap-1 text-xs text-gray-600">
                    <CalendarDays className="h-3 w-3 text-gray-400" />
                    {formatDate(sol.fecha_creacion)}
                  </div>
                </td>
                <td className="py-3 px-3 text-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 px-2.5 gap-1.5 text-xs"
                    onClick={() => onView(sol)}
                    title="Ver detalle"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span className="hidden xl:inline">Ver</span>
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
