"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/shared/atom/badge";
import { Button } from "@/components/shared/atom/button";
import {
  COMPRA_ESTADO_LABELS,
  TIPO_COMPRA_LABELS,
  TIPO_CONTENEDOR_LABELS,
  type Compra,
  type EstadoCompra,
  type TipoCompra,
} from "@/lib/types/feats/compras/compra-types";
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
  PackagePlus,
  Paperclip,
  Pencil,
  Plane,
  Ship,
  Store,
  Trash2,
  Truck,
} from "lucide-react";

const ESTADOS_RECEPCION_PERMITIDOS = new Set(["borrador", "en_transito", "recibida_parcial"]);

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

function TipoIcon({ tipo }: { tipo?: TipoCompra }) {
  if (tipo === "maritimo") return <Ship className="h-4 w-4 text-cyan-600" />;
  if (tipo === "aereo")    return <Plane className="h-4 w-4 text-sky-600" />;
  if (tipo === "local")    return <Store className="h-4 w-4 text-emerald-600" />;
  if (tipo === "otro")     return <Truck className="h-4 w-4 text-gray-500" />;
  return <Package className="h-4 w-4 text-gray-400" />;
}

function EstadoBadge({ estado }: { estado: EstadoCompra }) {
  const styles: Record<EstadoCompra, string> = {
    borrador:           "bg-gray-50    text-gray-700    border-gray-200",
    en_transito:        "bg-blue-50    text-blue-700    border-blue-200",
    recibida_parcial:   "bg-amber-50   text-amber-700   border-amber-200",
    recibida_completa:  "bg-emerald-50 text-emerald-700 border-emerald-200",
    cerrada_con_ajuste: "bg-indigo-50  text-indigo-700  border-indigo-200",
  };
  return (
    <Badge variant="outline" className={`text-xs font-medium ${styles[estado]}`}>
      {COMPRA_ESTADO_LABELS[estado]}
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

interface ComprasTableProps {
  compras: Compra[];
  onDelete?: (id: string) => void;
  onEdit?:   (compra: Compra) => void;
  onDocs?:   (compra: Compra) => void;
  onSolicitarEntrada?: (compra: Compra) => void;
}

export function ComprasTable({
  compras,
  onDelete,
  onEdit,
  onDocs,
  onSolicitarEntrada,
}: ComprasTableProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggle = (id: string) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  if (compras.length === 0) {
    return (
      <div className="text-center py-16">
        <Ship className="h-12 w-12 text-gray-200 mx-auto mb-3" />
        <p className="text-base font-medium text-gray-500">No hay compras registradas</p>
        <p className="text-sm text-gray-400 mt-1">Crea la primera compra con el botón &quot;Nueva compra&quot;.</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm border-collapse table-fixed min-w-[1024px]">
        <thead>
          <tr className="bg-gray-50 border-y border-gray-200">
            <th className="text-left py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wide w-[22%]">
              Compra
            </th>
            <th className="text-center py-3 px-2 font-semibold text-gray-600 text-xs uppercase tracking-wide w-[10%]">
              Estado
            </th>
            <th className="text-center py-3 px-2 font-semibold text-gray-600 text-xs uppercase tracking-wide w-[8%]">
              Pago
            </th>
            <th className="text-center py-3 px-2 font-semibold text-gray-600 text-xs uppercase tracking-wide w-[10%]">
              F. Envío
            </th>
            <th className="text-center py-3 px-2 font-semibold text-gray-600 text-xs uppercase tracking-wide w-[10%]">
              Llegada
            </th>
            <th className="text-center py-3 px-2 font-semibold text-gray-600 text-xs uppercase tracking-wide w-[8%]">
              Mats.
            </th>
            <th className="text-center py-3 px-3 font-semibold text-gray-600 text-xs uppercase tracking-wide w-[32%]">
              Acciones
            </th>
          </tr>
        </thead>

        <tbody>
          {compras.map((compra, idx) => {
            const isExpanded = Boolean(expanded[compra.id]);
            const dm = compra.datos_maritimo ?? null;

            return (
              <Fragment key={compra.id}>
                <tr
                  className={`border-b border-gray-100 transition-colors align-middle ${
                    idx % 2 === 0 ? "bg-white hover:bg-gray-50" : "bg-gray-50 hover:bg-gray-100"
                  } ${isExpanded ? "border-b-0" : ""}`}
                >
                  <td className="py-3.5 px-4">
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5 shrink-0">
                        <TipoIcon tipo={compra.tipo} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 leading-tight truncate">
                          {compra.nombre}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          <span className="text-xs text-gray-400">
                            {TIPO_COMPRA_LABELS[compra.tipo]}
                          </span>
                          {dm?.tipo_contenedor && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-cyan-50 text-cyan-700 border border-cyan-200 font-mono font-semibold">
                              <Container className="h-3 w-3" />
                              {dm.tipo_contenedor}
                            </span>
                          )}
                          {dm?.bl && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-600 border border-gray-200 font-mono">
                              BL: {dm.bl}
                            </span>
                          )}
                        </div>
                        {(dm?.buque || dm?.puerto_origen || compra.proveedor) && (
                          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                            {dm?.buque && <><AnchorIcon className="h-3 w-3" />{dm.buque}</>}
                            {dm?.buque && dm?.puerto_origen && <span>·</span>}
                            {dm?.puerto_origen && <><MapPin className="h-3 w-3" />{dm.puerto_origen}{dm?.pais_origen ? `, ${dm.pais_origen}` : ""}</>}
                            {!dm?.buque && !dm?.puerto_origen && compra.proveedor && (
                              <><Building2 className="h-3 w-3" />{compra.proveedor}</>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-2 text-center">
                    <EstadoBadge estado={compra.estado} />
                  </td>

                  <td className="py-3.5 px-2 text-center">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border ${
                        compra.pagado
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${compra.pagado ? "bg-emerald-500" : "bg-amber-400"}`} />
                      {compra.pagado ? "Pagado" : "Pendiente"}
                    </span>
                  </td>

                  <td className="py-3.5 px-2 text-center">
                    <div className="flex flex-col items-center gap-0.5">
                      <div className="flex items-center gap-1 text-gray-700">
                        <CalendarDays className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                        <span className="text-xs font-medium">{formatDate(compra.fecha_envio)}</span>
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-2 text-center">
                    <div className="flex flex-col items-center gap-0.5">
                      <div className="flex items-center gap-1 text-gray-700">
                        <ArrowRight className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                        <span className="text-xs font-medium">{formatDate(compra.fecha_llegada_aproximada)}</span>
                      </div>
                      {(compra.estado === "borrador" || compra.estado === "en_transito") && (
                        <DaysLeftChip fecha={compra.fecha_llegada_aproximada} />
                      )}
                    </div>
                  </td>

                  <td className="py-3.5 px-2 text-center">
                    <button
                      type="button"
                      onClick={() => toggle(compra.id)}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border transition-colors ${
                        isExpanded
                          ? "bg-cyan-50 border-cyan-300 text-cyan-700"
                          : "bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      <Package className="h-3 w-3" />
                      {compra.materiales.length}
                      {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </button>
                  </td>

                  <td className="py-3.5 px-3">
                    <div className="flex items-center justify-center gap-1 flex-wrap">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 px-2 gap-1 text-xs border-cyan-200 text-cyan-700 hover:bg-cyan-50 hover:border-cyan-300"
                        onClick={() => router.push(`/compras/${compra.id}/ficha-costo`)}
                        title="Abrir ficha de costo"
                      >
                        <ClipboardList className="h-3.5 w-3.5" />
                        <span className="hidden 2xl:inline">Ficha</span>
                      </Button>

                      {onSolicitarEntrada && ESTADOS_RECEPCION_PERMITIDOS.has(compra.estado) && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 px-2 gap-1 text-xs border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300"
                          onClick={() => onSolicitarEntrada(compra)}
                          title="Solicitar entrada al almacén"
                        >
                          <PackagePlus className="h-3.5 w-3.5" />
                          <span className="hidden 2xl:inline">Recepción</span>
                        </Button>
                      )}

                      {onDocs && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 px-2 gap-1 text-xs border-orange-200 text-orange-700 hover:bg-orange-50 hover:border-orange-300 relative"
                          onClick={() => onDocs(compra)}
                          title="Documentos adjuntos"
                        >
                          <Paperclip className="h-3.5 w-3.5" />
                          <span className="hidden 2xl:inline">Docs</span>
                          {compra.archivos?.length > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-orange-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                              {compra.archivos.length > 9 ? "9+" : compra.archivos.length}
                            </span>
                          )}
                        </Button>
                      )}

                      {onEdit && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 px-2 gap-1 text-xs border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300"
                          onClick={() => onEdit(compra)}
                          title="Editar compra"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          <span className="hidden 2xl:inline">Editar</span>
                        </Button>
                      )}

                      {onDelete && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-gray-400 hover:text-red-600 hover:bg-red-50"
                          onClick={() => onDelete(compra.id)}
                          title="Eliminar compra"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>

                {isExpanded && (
                  <tr className={`border-b border-gray-200 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                    <td colSpan={7} className="px-4 pb-4 pt-0">
                      <div className="ml-9 space-y-3">

                        {(dm?.bl || dm?.sello || dm?.referencia_buque || dm?.buque ||
                          dm?.puerto_origen || dm?.puerto_destino || dm?.pais_origen ||
                          compra.proveedor || compra.cliente || dm?.transitaria) && (() => {
                          const dias = calcDiasNavegacion(compra.fecha_envio, compra.fecha_llegada_aproximada);
                          return (
                            <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
                              <div className="bg-gray-50 border-b border-gray-200 px-3 py-2 flex items-center gap-2">
                                <ClipboardList className="h-3.5 w-3.5 text-gray-400" />
                                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                  Datos de la compra
                                </span>
                                {dias !== null && compra.tipo === "maritimo" && (
                                  <span className="ml-auto inline-flex items-center gap-1 text-xs text-cyan-700 bg-cyan-50 border border-cyan-200 rounded-full px-2 py-0.5">
                                    <Ship className="h-3 w-3" />
                                    {dias} día{dias !== 1 ? "s" : ""} de navegación
                                  </span>
                                )}
                              </div>
                              <div className="p-3 grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2 text-xs">
                                {dm?.bl && (
                                  <div>
                                    <p className="text-gray-400 font-medium uppercase tracking-wide text-[10px]">BL</p>
                                    <p className="text-gray-800 font-mono font-semibold">{dm.bl}</p>
                                  </div>
                                )}
                                {dm?.referencia_buque && (
                                  <div>
                                    <p className="text-gray-400 font-medium uppercase tracking-wide text-[10px]">Referencia buque</p>
                                    <p className="text-gray-800">{dm.referencia_buque}</p>
                                  </div>
                                )}
                                {dm?.sello && (
                                  <div>
                                    <p className="text-gray-400 font-medium uppercase tracking-wide text-[10px]">Sello</p>
                                    <p className="text-gray-800 font-mono">{dm.sello}</p>
                                  </div>
                                )}
                                {dm?.buque && (
                                  <div>
                                    <p className="text-gray-400 font-medium uppercase tracking-wide text-[10px]">Buque</p>
                                    <p className="text-gray-800 flex items-center gap-1">
                                      <AnchorIcon className="h-3 w-3 text-gray-400" />{dm.buque}
                                    </p>
                                  </div>
                                )}
                                {dm?.tipo_contenedor && (
                                  <div>
                                    <p className="text-gray-400 font-medium uppercase tracking-wide text-[10px]">Contenedor</p>
                                    <p className="text-gray-800 flex items-center gap-1">
                                      <Container className="h-3 w-3 text-gray-400" />
                                      {dm.tipo_contenedor} — {TIPO_CONTENEDOR_LABELS[dm.tipo_contenedor]}
                                    </p>
                                  </div>
                                )}
                                {(dm?.puerto_origen || dm?.pais_origen) && (
                                  <div>
                                    <p className="text-gray-400 font-medium uppercase tracking-wide text-[10px]">Origen</p>
                                    <p className="text-gray-800">
                                      {[dm?.puerto_origen, dm?.pais_origen].filter(Boolean).join(", ")}
                                    </p>
                                  </div>
                                )}
                                {dm?.puerto_destino && (
                                  <div>
                                    <p className="text-gray-400 font-medium uppercase tracking-wide text-[10px]">Destino</p>
                                    <p className="text-gray-800 flex items-center gap-1">
                                      <MapPin className="h-3 w-3 text-gray-400" />{dm.puerto_destino}
                                    </p>
                                  </div>
                                )}
                                {compra.proveedor && (
                                  <div>
                                    <p className="text-gray-400 font-medium uppercase tracking-wide text-[10px]">Proveedor</p>
                                    <p className="text-gray-800 flex items-center gap-1">
                                      <Building2 className="h-3 w-3 text-gray-400" />{compra.proveedor}
                                    </p>
                                  </div>
                                )}
                                {compra.cliente && (
                                  <div>
                                    <p className="text-gray-400 font-medium uppercase tracking-wide text-[10px]">Cliente</p>
                                    <p className="text-gray-800">{compra.cliente}</p>
                                  </div>
                                )}
                                {dm?.transitaria && (
                                  <div>
                                    <p className="text-gray-400 font-medium uppercase tracking-wide text-[10px]">Transitaria</p>
                                    <p className="text-gray-800">{dm.transitaria}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })()}

                        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
                        <div className="bg-gray-50 border-b border-gray-200 px-3 py-2 flex items-center gap-2">
                          <Package className="h-3.5 w-3.5 text-gray-400" />
                          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                            Materiales — {compra.nombre}
                          </span>
                          <span className="ml-auto text-xs text-gray-400">
                            {compra.materiales.length} referencia{compra.materiales.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-100">
                              <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Código</th>
                              <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Material</th>
                              <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cant.</th>
                              <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Recibido</th>
                              <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">P. CIF</th>
                              <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">P. Venta final</th>
                              <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">P. Instaladora</th>
                            </tr>
                          </thead>
                          <tbody>
                            {compra.materiales.map((m, i) => {
                              const recibidoTotal = (m.cantidad_entrada_aprobada ?? 0) + (m.cantidad_ajuste_cierre ?? 0);
                              const recibidoCompleto = recibidoTotal >= m.cantidad;
                              return (
                                <tr
                                  key={`${compra.id}-${m.material_id}-${i}`}
                                  className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60"
                                >
                                  <td className="py-2 px-3 font-mono text-xs text-gray-400">{m.material_codigo || "—"}</td>
                                  <td className="py-2 px-3 text-gray-800 font-medium">{m.material_nombre}</td>
                                  <td className="py-2 px-3 text-center text-gray-700">{m.cantidad}</td>
                                  <td className="py-2 px-3 text-center">
                                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-mono ${
                                      recibidoCompleto
                                        ? "bg-emerald-50 text-emerald-700"
                                        : recibidoTotal > 0
                                          ? "bg-amber-50 text-amber-700"
                                          : "bg-gray-50 text-gray-400"
                                    }`}>
                                      {recibidoTotal}/{m.cantidad}
                                    </span>
                                  </td>
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
                              );
                            })}
                          </tbody>
                          <tfoot>
                            <tr className="border-t border-gray-200 bg-gray-50">
                              <td colSpan={2} className="py-2 px-3 text-xs text-gray-400">
                                Total unidades
                              </td>
                              <td className="py-2 px-3 text-center text-xs font-bold text-gray-700">
                                {compra.materiales.reduce((s, m) => s + m.cantidad, 0)}
                              </td>
                              <td className="py-2 px-3 text-center text-xs font-bold text-gray-700">
                                {compra.materiales.reduce((s, m) => s + (m.cantidad_entrada_aprobada ?? 0) + (m.cantidad_ajuste_cierre ?? 0), 0)}
                              </td>
                              <td className="py-2 px-3 text-right text-xs font-bold text-gray-700">
                                ${compra.materiales.reduce((s, m) => s + m.precio_unitario_cif * m.cantidad, 0).toFixed(2)}
                              </td>
                              <td className="py-2 px-3 text-right text-xs font-bold text-gray-700">
                                {compra.materiales.every((m) => m.precio_venta_final != null)
                                  ? `$${compra.materiales.reduce((s, m) => s + (m.precio_venta_final ?? 0) * m.cantidad, 0).toFixed(2)}`
                                  : "—"}
                              </td>
                              <td className="py-2 px-3 text-right text-xs font-bold text-gray-700">
                                {compra.materiales.every((m) => m.precio_instaladora_final != null)
                                  ? `$${compra.materiales.reduce((s, m) => s + (m.precio_instaladora_final ?? 0) * m.cantidad, 0).toFixed(2)}`
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
