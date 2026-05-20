"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/shared/atom/badge";
import { Button } from "@/components/shared/atom/button";
import {
  ENVIO_CONTENEDOR_ESTADO_LABELS,
  TIPO_CONTENEDOR_LABELS,
  TIPO_ENVIO_LABELS,
  type EnvioContenedor,
  type EstadoEnvioContenedor,
} from "@/lib/types/feats/envios-contenedores/envio-contenedor-types";
import {
  AnchorIcon,
  ArrowRight,
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Container,
  MapPin,
  Package,
  Paperclip,
  Pencil,
  Plane,
  Ship,
  Trash2,
  Truck,
} from "lucide-react";

// ─── helpers ─────────────────────────────────────────────────────────────────

const formatDate = (value?: string) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
};

const getDaysLeft = (value?: string): number | null => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86_400_000);
};

const calcDiasNavegacion = (fechaEnvio?: string, fechaLlegada?: string): number | null => {
  if (!fechaEnvio || !fechaLlegada) return null;
  const diff = new Date(fechaLlegada).getTime() - new Date(fechaEnvio).getTime();
  if (isNaN(diff) || diff < 0) return null;
  return Math.round(diff / 86_400_000);
};

// ─── sub-components ───────────────────────────────────────────────────────────

function TipoIcon({ tipo }: { tipo?: string }) {
  if (tipo === "maritimo") return <Ship className="h-4 w-4 text-cyan-600" />;
  if (tipo === "aereo")    return <Plane className="h-4 w-4 text-sky-600" />;
  if (tipo === "otro")     return <Truck className="h-4 w-4 text-gray-500" />;
  return <Package className="h-4 w-4 text-gray-400" />;
}

function EstadoBadge({ estado }: { estado: EstadoEnvioContenedor }) {
  const styles: Record<EstadoEnvioContenedor, string> = {
    solicitado: "bg-amber-50   text-amber-700   border-amber-200",
    enviado:    "bg-blue-50    text-blue-700    border-blue-200",
    arribado:   "bg-indigo-50  text-indigo-700  border-indigo-200",
    recibido:   "bg-emerald-50 text-emerald-700 border-emerald-200",
    cancelado:  "bg-red-50     text-red-700     border-red-200",
  };
  return (
    <Badge variant="outline" className={`text-xs font-medium ${styles[estado]}`}>
      {ENVIO_CONTENEDOR_ESTADO_LABELS[estado]}
    </Badge>
  );
}

function DaysLeftChip({ fecha }: { fecha?: string }) {
  const days = getDaysLeft(fecha);
  if (days === null) return null;
  if (days < 0)  return <span className="text-xs text-red-500 font-medium">Vencido</span>;
  if (days === 0) return <span className="text-xs text-amber-500 font-medium">Hoy</span>;
  if (days <= 7)  return <span className="text-xs text-amber-500 font-medium">en {days}d</span>;
  return <span className="text-xs text-gray-400">en {days}d</span>;
}

// ─── props ────────────────────────────────────────────────────────────────────

interface EnviosContenedoresTableProps {
  envios: EnvioContenedor[];
  onDelete?: (id: string) => void;
  onEdit?:   (envio: EnvioContenedor) => void;
  onDocs?:   (envio: EnvioContenedor) => void;
}

// ─── component ───────────────────────────────────────────────────────────────

export function EnviosContenedoresTable({
  envios,
  onDelete,
  onEdit,
  onDocs,
}: EnviosContenedoresTableProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggle = (id: string) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  if (envios.length === 0) {
    return (
      <div className="text-center py-16">
        <Ship className="h-12 w-12 text-gray-200 mx-auto mb-3" />
        <p className="text-base font-medium text-gray-500">No hay envíos registrados</p>
        <p className="text-sm text-gray-400 mt-1">Crea el primer envío con el botón "Nuevo envío".</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <table className="w-full text-sm border-collapse">
        {/* ── Head ── */}
        <thead>
          <tr className="bg-gray-50 border-y border-gray-200">
            <th className="text-left py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wide w-[26%]">
              Envío
            </th>
            <th className="text-center py-3 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wide w-[10%]">
              Estado
            </th>
            <th className="text-center py-3 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wide w-[10%]">
              Pago
            </th>
            <th className="text-center py-3 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wide w-[13%]">
              F. Envío
            </th>
            <th className="text-center py-3 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wide w-[13%]">
              Llegada
            </th>
            <th className="text-center py-3 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wide w-[8%]">
              Mats.
            </th>
            <th className="text-center py-3 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wide w-[20%]">
              Acciones
            </th>
          </tr>
        </thead>

        {/* ── Body ── */}
        <tbody>
          {envios.map((envio, idx) => {
            const isExpanded = Boolean(expanded[envio.id]);

            return (
              <Fragment key={envio.id}>
                {/* Fila principal */}
                <tr
                  className={`border-b border-gray-100 transition-colors align-middle ${
                    idx % 2 === 0 ? "bg-white hover:bg-gray-50" : "bg-gray-50 hover:bg-gray-100"
                  } ${isExpanded ? "border-b-0" : ""}`}
                >
                  {/* Nombre + tipo + BL + contenedor */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5 shrink-0">
                        <TipoIcon tipo={envio.tipo_envio} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 leading-tight truncate">
                          {envio.nombre}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          {envio.tipo_envio && (
                            <span className="text-xs text-gray-400">
                              {TIPO_ENVIO_LABELS[envio.tipo_envio]}
                            </span>
                          )}
                          {envio.tipo_contenedor && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-cyan-50 text-cyan-700 border border-cyan-200 font-mono font-semibold">
                              <Container className="h-3 w-3" />
                              {envio.tipo_contenedor}
                            </span>
                          )}
                          {envio.bl && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-600 border border-gray-200 font-mono">
                              BL: {envio.bl}
                            </span>
                          )}
                        </div>
                        {(envio.buque || envio.puerto_origen) && (
                          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                            {envio.buque && <><AnchorIcon className="h-3 w-3" />{envio.buque}</>}
                            {envio.buque && envio.puerto_origen && <span>·</span>}
                            {envio.puerto_origen && <><MapPin className="h-3 w-3" />{envio.puerto_origen}{envio.pais_origen ? `, ${envio.pais_origen}` : ""}</>}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Estado */}
                  <td className="py-3.5 px-3 text-center">
                    <EstadoBadge estado={envio.estado} />
                  </td>

                  {/* Pago */}
                  <td className="py-3.5 px-3 text-center">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                        envio.pagado
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${envio.pagado ? "bg-emerald-500" : "bg-amber-400"}`} />
                      {envio.pagado ? "Pagado" : "Pendiente"}
                    </span>
                  </td>

                  {/* Fecha envío */}
                  <td className="py-3.5 px-3 text-center">
                    <div className="flex flex-col items-center gap-0.5">
                      <div className="flex items-center gap-1 text-gray-700">
                        <CalendarDays className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                        <span className="text-xs font-medium">{formatDate(envio.fecha_envio)}</span>
                      </div>
                    </div>
                  </td>

                  {/* Llegada */}
                  <td className="py-3.5 px-3 text-center">
                    <div className="flex flex-col items-center gap-0.5">
                      <div className="flex items-center gap-1 text-gray-700">
                        <ArrowRight className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                        <span className="text-xs font-medium">{formatDate(envio.fecha_llegada_aproximada)}</span>
                      </div>
                      {(envio.estado === "solicitado" || envio.estado === "enviado") && (
                        <DaysLeftChip fecha={envio.fecha_llegada_aproximada} />
                      )}
                    </div>
                  </td>

                  {/* Materiales toggle */}
                  <td className="py-3.5 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => toggle(envio.id)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                        isExpanded
                          ? "bg-cyan-50 border-cyan-300 text-cyan-700"
                          : "bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      <Package className="h-3 w-3" />
                      {envio.materiales.length}
                      {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </button>
                  </td>

                  {/* Acciones */}
                  <td className="py-3.5 px-3">
                    <div className="flex items-center justify-center gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 px-2.5 gap-1.5 text-xs border-cyan-200 text-cyan-700 hover:bg-cyan-50 hover:border-cyan-300"
                        onClick={() => router.push(`/envio-contenedores/${envio.id}/ficha-costo`)}
                        title="Abrir ficha de costo"
                      >
                        <ClipboardList className="h-3.5 w-3.5" />
                        <span className="hidden xl:inline">Ficha</span>
                      </Button>

                      {onDocs && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 px-2.5 gap-1.5 text-xs border-orange-200 text-orange-700 hover:bg-orange-50 hover:border-orange-300 relative"
                          onClick={() => onDocs(envio)}
                          title="Documentos adjuntos"
                        >
                          <Paperclip className="h-3.5 w-3.5" />
                          <span className="hidden xl:inline">Docs</span>
                          {envio.archivos?.length > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-orange-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                              {envio.archivos.length > 9 ? "9+" : envio.archivos.length}
                            </span>
                          )}
                        </Button>
                      )}

                      {onEdit && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 px-2.5 gap-1.5 text-xs border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300"
                          onClick={() => onEdit(envio)}
                          title="Editar envío"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          <span className="hidden xl:inline">Editar</span>
                        </Button>
                      )}

                      {onDelete && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-gray-400 hover:text-red-600 hover:bg-red-50"
                          onClick={() => onDelete(envio.id)}
                          title="Eliminar envío"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>

                {/* Fila expandida: datos + materiales */}
                {isExpanded && (
                  <tr className={`border-b border-gray-200 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                    <td colSpan={7} className="px-4 pb-4 pt-0">
                      <div className="ml-9 space-y-3">

                        {/* ── Panel de datos del envío ── */}
                        {(envio.bl || envio.sello || envio.referencia_buque || envio.buque ||
                          envio.puerto_origen || envio.puerto_destino || envio.pais_origen ||
                          envio.proveedor || envio.cliente || envio.transitaria) && (() => {
                          const dias = calcDiasNavegacion(envio.fecha_envio, envio.fecha_llegada_aproximada);
                          return (
                            <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
                              <div className="bg-gray-50 border-b border-gray-200 px-3 py-2 flex items-center gap-2">
                                <ClipboardList className="h-3.5 w-3.5 text-gray-400" />
                                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                  Datos del envío
                                </span>
                                {dias !== null && (
                                  <span className="ml-auto inline-flex items-center gap-1 text-xs text-cyan-700 bg-cyan-50 border border-cyan-200 rounded-full px-2 py-0.5">
                                    <Ship className="h-3 w-3" />
                                    {dias} día{dias !== 1 ? "s" : ""} de navegación
                                  </span>
                                )}
                              </div>
                              <div className="p-3 grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2 text-xs">
                                {envio.bl && (
                                  <div>
                                    <p className="text-gray-400 font-medium uppercase tracking-wide text-[10px]">BL</p>
                                    <p className="text-gray-800 font-mono font-semibold">{envio.bl}</p>
                                  </div>
                                )}
                                {envio.referencia_buque && (
                                  <div>
                                    <p className="text-gray-400 font-medium uppercase tracking-wide text-[10px]">Referencia buque</p>
                                    <p className="text-gray-800">{envio.referencia_buque}</p>
                                  </div>
                                )}
                                {envio.sello && (
                                  <div>
                                    <p className="text-gray-400 font-medium uppercase tracking-wide text-[10px]">Sello</p>
                                    <p className="text-gray-800 font-mono">{envio.sello}</p>
                                  </div>
                                )}
                                {envio.buque && (
                                  <div>
                                    <p className="text-gray-400 font-medium uppercase tracking-wide text-[10px]">Buque</p>
                                    <p className="text-gray-800 flex items-center gap-1">
                                      <AnchorIcon className="h-3 w-3 text-gray-400" />{envio.buque}
                                    </p>
                                  </div>
                                )}
                                {envio.tipo_contenedor && (
                                  <div>
                                    <p className="text-gray-400 font-medium uppercase tracking-wide text-[10px]">Contenedor</p>
                                    <p className="text-gray-800 flex items-center gap-1">
                                      <Container className="h-3 w-3 text-gray-400" />
                                      {envio.tipo_contenedor} — {TIPO_CONTENEDOR_LABELS[envio.tipo_contenedor]}
                                    </p>
                                  </div>
                                )}
                                {(envio.puerto_origen || envio.pais_origen) && (
                                  <div>
                                    <p className="text-gray-400 font-medium uppercase tracking-wide text-[10px]">Origen</p>
                                    <p className="text-gray-800">
                                      {[envio.puerto_origen, envio.pais_origen].filter(Boolean).join(", ")}
                                    </p>
                                  </div>
                                )}
                                {envio.puerto_destino && (
                                  <div>
                                    <p className="text-gray-400 font-medium uppercase tracking-wide text-[10px]">Destino</p>
                                    <p className="text-gray-800 flex items-center gap-1">
                                      <MapPin className="h-3 w-3 text-gray-400" />{envio.puerto_destino}
                                    </p>
                                  </div>
                                )}
                                {envio.proveedor && (
                                  <div>
                                    <p className="text-gray-400 font-medium uppercase tracking-wide text-[10px]">Proveedor</p>
                                    <p className="text-gray-800 flex items-center gap-1">
                                      <Building2 className="h-3 w-3 text-gray-400" />{envio.proveedor}
                                    </p>
                                  </div>
                                )}
                                {envio.cliente && (
                                  <div>
                                    <p className="text-gray-400 font-medium uppercase tracking-wide text-[10px]">Cliente</p>
                                    <p className="text-gray-800">{envio.cliente}</p>
                                  </div>
                                )}
                                {envio.transitaria && (
                                  <div>
                                    <p className="text-gray-400 font-medium uppercase tracking-wide text-[10px]">Transitaria</p>
                                    <p className="text-gray-800">{envio.transitaria}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })()}

                        {/* ── Materiales ── */}
                        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
                        <div className="bg-gray-50 border-b border-gray-200 px-3 py-2 flex items-center gap-2">
                          <Package className="h-3.5 w-3.5 text-gray-400" />
                          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                            Materiales — {envio.nombre}
                          </span>
                          <span className="ml-auto text-xs text-gray-400">
                            {envio.materiales.length} referencia{envio.materiales.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-100">
                              <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Código</th>
                              <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Material</th>
                              <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cant.</th>
                              <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">P. CIF</th>
                              <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">P. Venta final</th>
                              <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">P. Instaladora</th>
                            </tr>
                          </thead>
                          <tbody>
                            {envio.materiales.map((m, i) => (
                              <tr
                                key={`${envio.id}-${m.material_id}-${i}`}
                                className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60"
                              >
                                <td className="py-2 px-3 font-mono text-xs text-gray-400">{m.material_codigo || "—"}</td>
                                <td className="py-2 px-3 text-gray-800 font-medium">{m.material_nombre}</td>
                                <td className="py-2 px-3 text-center text-gray-700">{m.cantidad}</td>
                                <td className="py-2 px-3 text-right text-gray-700">
                                  {m.precio_unitario_cif > 0 ? `$${m.precio_unitario_cif.toFixed(2)}` : "—"}
                                </td>
                                <td className="py-2 px-3 text-right">
                                  {m.precio_venta_final != null
                                    ? <span className="font-semibold text-gray-800">${m.precio_venta_final.toFixed(2)}</span>
                                    : <span className="text-gray-400">—</span>}
                                </td>
                                <td className="py-2 px-3 text-right">
                                  {m.precio_instaladora_final != null
                                    ? <span className="font-semibold text-gray-800">${m.precio_instaladora_final.toFixed(2)}</span>
                                    : <span className="text-gray-400">—</span>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="border-t border-gray-200 bg-gray-50">
                              <td colSpan={2} className="py-2 px-3 text-xs text-gray-400">
                                Total unidades
                              </td>
                              <td className="py-2 px-3 text-center text-xs font-bold text-gray-700">
                                {envio.materiales.reduce((s, m) => s + m.cantidad, 0)}
                              </td>
                              <td className="py-2 px-3 text-right text-xs font-bold text-gray-700">
                                ${envio.materiales.reduce((s, m) => s + m.precio_unitario_cif * m.cantidad, 0).toFixed(2)}
                              </td>
                              <td className="py-2 px-3 text-right text-xs font-bold text-gray-700">
                                {envio.materiales.every((m) => m.precio_venta_final != null)
                                  ? `$${envio.materiales.reduce((s, m) => s + (m.precio_venta_final ?? 0) * m.cantidad, 0).toFixed(2)}`
                                  : "—"}
                              </td>
                              <td className="py-2 px-3 text-right text-xs font-bold text-gray-700">
                                {envio.materiales.every((m) => m.precio_instaladora_final != null)
                                  ? `$${envio.materiales.reduce((s, m) => s + (m.precio_instaladora_final ?? 0) * m.cantidad, 0).toFixed(2)}`
                                  : "—"}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
