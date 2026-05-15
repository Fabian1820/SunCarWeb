"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
import { Card, CardContent } from "@/components/shared/molecule/card";
import { Badge } from "@/components/shared/atom/badge";
import { Button } from "@/components/shared/atom/button";
import {
  ArrowLeft,
  Download,
  Edit,
  Eye,
  Loader2,
  Package,
  Plus,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { ConfirmDeleteDialog } from "@/components/shared/molecule/dialog";
import { AgregarOfertaDialog } from "./agregar-oferta-dialog";
import { OfertaVentaService } from "@/lib/api-services";
import { ExportOfertaVentaService } from "@/lib/services/feats/ofertas-venta/export-oferta-venta-service";
import type { ClienteVenta, OfertaVenta, EstadoOfertaVenta } from "@/lib/api-types";
import { useMaterials } from "@/hooks/use-materials";
import { useToast } from "@/hooks/use-toast";

// ─── helpers ─────────────────────────────────────────────────────────────────

const ESTADO_CONFIG: Record<EstadoOfertaVenta, { label: string; className: string }> = {
  enviada: { label: "Enviada", className: "bg-blue-100 text-blue-800" },
  confirmada: { label: "Confirmada", className: "bg-green-100 text-green-800" },
  cancelada: { label: "Cancelada", className: "bg-slate-200 text-slate-700" },
  pagada: { label: "Pagada", className: "bg-emerald-100 text-emerald-800" },
};

function getEstadoBadge(estado: string) {
  return ESTADO_CONFIG[estado as EstadoOfertaVenta] ?? { label: estado, className: "bg-gray-100 text-gray-700" };
}

function fmt(n: number) {
  return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(value?: string) {
  if (!value) return "--";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// ─── props ───────────────────────────────────────────────────────────────────

interface GestionarOfertasVentaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cliente: ClienteVenta;
  /** Lista inicial de ofertas (para evitar un fetch extra si ya se obtuvieron antes) */
  ofertasIniciales?: OfertaVenta[];
  onChanged?: () => void;
}

// ─── componente ──────────────────────────────────────────────────────────────

type Modo = "listado" | "detalle";

export function GestionarOfertasVentaDialog({
  open,
  onOpenChange,
  cliente,
  ofertasIniciales,
  onChanged,
}: GestionarOfertasVentaDialogProps) {
  const { toast } = useToast();
  const { materials } = useMaterials({ lite: true });

  // Mapa código → { foto, nombre } para enriquecer el detalle de materiales
  const materialesMap = useMemo(() => {
    const map = new Map<string, { foto?: string; nombre?: string }>();
    materials.forEach((m) => {
      const codigo = m.codigo?.toString();
      if (codigo) map.set(codigo, { foto: m.foto, nombre: m.nombre });
      if (m.id) map.set(m.id, { foto: m.foto, nombre: m.nombre });
    });
    return map;
  }, [materials]);

  const [ofertas, setOfertas] = useState<OfertaVenta[]>(ofertasIniciales ?? []);
  const [loading, setLoading] = useState(false);
  const [modo, setModo] = useState<Modo>("listado");
  const [ofertaSeleccionada, setOfertaSeleccionada] = useState<OfertaVenta | null>(null);

  // Sub-dialogs
  const [showCrear, setShowCrear] = useState(false);
  const [ofertaEditar, setOfertaEditar] = useState<OfertaVenta | null>(null);
  const [ofertaEliminar, setOfertaEliminar] = useState<OfertaVenta | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);

  // ── cargar ofertas del cliente ────────────────────────────────
  const cargarOfertas = async () => {
    setLoading(true);
    try {
      const data = await OfertaVentaService.getOfertasByCliente(cliente.id);
      setOfertas(data);
    } catch {
      toast({ title: "Error", description: "No se pudieron cargar las ofertas", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) {
      setModo("listado");
      setOfertaSeleccionada(null);
      return;
    }
    // Si no se pasaron ofertas iniciales, fetchear
    if (!ofertasIniciales || ofertasIniciales.length === 0) {
      cargarOfertas();
    } else {
      setOfertas(ofertasIniciales);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ── handlers ──────────────────────────────────────────────────
  const handleVerDetalle = (oferta: OfertaVenta) => {
    setOfertaSeleccionada(oferta);
    setModo("detalle");
  };

  const handleEditar = (oferta: OfertaVenta) => {
    setOfertaEditar(oferta);
  };

  const handleConfirmDelete = async () => {
    if (!ofertaEliminar) return;
    setDeletingId(ofertaEliminar.id);
    try {
      await OfertaVentaService.deleteOferta(ofertaEliminar.id);
      toast({ title: "Oferta eliminada", description: "La oferta fue eliminada correctamente" });
      setOfertaEliminar(null);
      if (modo === "detalle") setModo("listado");
      await cargarOfertas();
      onChanged?.();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "No se pudo eliminar la oferta",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleOfertaCreatedOrEdited = async () => {
    await cargarOfertas();
    onChanged?.();
  };

  const handleExportar = async (oferta: OfertaVenta) => {
    setExportingId(oferta.id);
    try {
      // Enriquecer materiales con nombres y fotos del catálogo local
      // (el snapshot del backend puede no tener descripcion/foto_url)
      const enrichedOfertas: OfertaVenta = {
        ...oferta,
        // Si el backend no devuelve cliente_nombre, usar el del prop
        cliente_nombre: oferta.cliente_nombre || cliente.nombre,
        materiales: oferta.materiales.map((mat) => {
          const entry =
            materialesMap.get(mat.material_id) ??
            (mat.codigo ? materialesMap.get(mat.codigo) : undefined);
          return {
            ...mat,
            descripcion: mat.descripcion || entry?.nombre || mat.codigo || mat.material_id,
            foto_url:    mat.foto_url    || entry?.foto   || undefined,
          };
        }),
      };

      // Construir fotosMap desde los materiales ya enriquecidos
      const fotosMap = new Map<string, string>();
      enrichedOfertas.materiales.forEach((mat) => {
        if (mat.foto_url) {
          fotosMap.set(mat.material_id, mat.foto_url);
          if (mat.codigo) fotosMap.set(mat.codigo, mat.foto_url);
        }
      });

      await ExportOfertaVentaService.exportar(
        enrichedOfertas,
        fotosMap.size > 0 ? fotosMap : undefined,
      );
    } catch {
      toast({ title: "Error", description: "No se pudo exportar la oferta", variant: "destructive" });
    } finally {
      setExportingId(null);
    }
  };

  const handleClose = () => {
    if (modo === "detalle") {
      setModo("listado");
      return;
    }
    onOpenChange(false);
  };

  // ─────────────────────────────────────────────────────────────
  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="shrink-0">
            <div className="flex items-center justify-between gap-3">
              <DialogTitle className="flex items-center gap-2 text-lg">
                {modo === "detalle" && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 mr-1"
                    onClick={() => setModo("listado")}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                )}
                <ShoppingCart className="h-5 w-5 text-orange-600" />
                {modo === "listado" ? (
                  <>
                    Ofertas de{" "}
                    <span className="text-orange-600">{cliente.nombre}</span>
                    <span className="text-sm font-normal text-gray-500 ml-1">
                      ({ofertas.length})
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-orange-600">{ofertaSeleccionada?.codigo ?? "Detalle"}</span>
                  </>
                )}
              </DialogTitle>

              {/* Botón Nueva Oferta — solo en modo listado */}
              {modo === "listado" && (
                <Button
                  size="sm"
                  className="bg-orange-600 hover:bg-orange-700 text-white shrink-0"
                  onClick={() => setShowCrear(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Nueva oferta
                </Button>
              )}

              {/* Acciones en modo detalle */}
              {modo === "detalle" && ofertaSeleccionada && (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 text-orange-600 hover:text-orange-700 hover:bg-orange-50 border-orange-200"
                    title="Exportar PDF"
                    onClick={() => handleExportar(ofertaSeleccionada)}
                    disabled={exportingId === ofertaSeleccionada.id}
                  >
                    {exportingId === ofertaSeleccionada.id
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Download className="h-4 w-4" />
                    }
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    title="Editar oferta"
                    onClick={() => handleEditar(ofertaSeleccionada)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    title="Eliminar oferta"
                    onClick={() => setOfertaEliminar(ofertaSeleccionada)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>

          {/* ── MODO LISTADO ─────────────────────────────────────── */}
          {modo === "listado" && (
            <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-3 pt-1">
              {loading ? (
                <div className="flex items-center justify-center py-12 text-gray-500">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Cargando ofertas...
                </div>
              ) : ofertas.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <ShoppingCart className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                  <p className="font-medium text-gray-700">Sin ofertas aún</p>
                  <p className="text-sm mt-1">Crea la primera oferta para este cliente.</p>
                </div>
              ) : (
                ofertas.map((oferta) => {
                  const badge = getEstadoBadge(oferta.estado);
                  return (
                    <Card
                      key={oferta.id}
                      className="border border-gray-200 hover:border-orange-300 transition-colors"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="text-sm font-semibold text-gray-900 font-mono">
                                {oferta.codigo ?? oferta.id.slice(-8).toUpperCase()}
                              </span>
                              <Badge className={badge.className}>{badge.label}</Badge>
                              {oferta.moneda_pago && (
                                <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                  {oferta.moneda_pago}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 space-x-3">
                              <span>
                                Total:{" "}
                                <span className="font-semibold text-gray-800">
                                  ${fmt(oferta.precio_total)}
                                </span>
                              </span>
                              <span>{oferta.materiales.length} material{oferta.materiales.length !== 1 ? "es" : ""}</span>
                              <span>{formatDate(oferta.fecha_creacion)}</span>
                            </div>
                            {oferta.descuento_free && (
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="text-xs font-semibold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">
                                  Descuento Free
                                </span>
                                {oferta.motivo_descuento_free && (
                                  <span className="text-xs text-orange-700 truncate max-w-[200px]">
                                    {oferta.motivo_descuento_free}
                                  </span>
                                )}
                              </div>
                            )}
                            {oferta.metodo_pago && (
                              <p className="text-xs text-gray-400 mt-0.5">{oferta.metodo_pago}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0 text-orange-500 hover:text-orange-700 hover:bg-orange-50 border-orange-200"
                              title="Exportar PDF"
                              onClick={() => handleExportar(oferta)}
                              disabled={exportingId === oferta.id}
                            >
                              {exportingId === oferta.id
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : <Download className="h-3.5 w-3.5" />
                              }
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0"
                              title="Editar oferta"
                              onClick={() => handleEditar(oferta)}
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                              title="Eliminar oferta"
                              onClick={() => setOfertaEliminar(oferta)}
                              disabled={deletingId === oferta.id}
                            >
                              {deletingId === oferta.id
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : <Trash2 className="h-3.5 w-3.5" />
                              }
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              className="bg-orange-600 hover:bg-orange-700 text-white h-8 px-3"
                              onClick={() => handleVerDetalle(oferta)}
                            >
                              <Eye className="h-3.5 w-3.5 mr-1" />
                              Ver
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          )}

          {/* ── MODO DETALLE ─────────────────────────────────────── */}
          {modo === "detalle" && ofertaSeleccionada && (
            <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-4 pt-1">
              {/* Resumen */}
              <Card className="border-gray-200">
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Estado</span>
                      <Badge className={getEstadoBadge(ofertaSeleccionada.estado).className}>
                        {getEstadoBadge(ofertaSeleccionada.estado).label}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Fecha</span>
                      <span className="font-medium">{formatDate(ofertaSeleccionada.fecha_creacion)}</span>
                    </div>
                    {ofertaSeleccionada.metodo_pago && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Método pago</span>
                        <span className="font-medium">{ofertaSeleccionada.metodo_pago}</span>
                      </div>
                    )}
                    {ofertaSeleccionada.moneda_pago && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Moneda</span>
                        <span className="font-medium">{ofertaSeleccionada.moneda_pago}</span>
                      </div>
                    )}
                    {ofertaSeleccionada.descuento_free && (
                      <div className="col-span-2 flex items-start gap-2 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
                        <span className="text-xs font-semibold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full shrink-0">
                          Descuento Free
                        </span>
                        {ofertaSeleccionada.motivo_descuento_free && (
                          <span className="text-xs text-orange-700 leading-snug">
                            {ofertaSeleccionada.motivo_descuento_free}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="col-span-2 pt-2 border-t flex justify-between font-semibold text-base">
                      <span>Total</span>
                      <span className="text-orange-600">${fmt(ofertaSeleccionada.precio_total)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Materiales */}
              <Card className="border-gray-200">
                <CardContent className="p-4 space-y-3">
                  <p className="text-sm text-gray-500 font-medium">
                    Materiales ({ofertaSeleccionada.materiales.length})
                  </p>
                  {ofertaSeleccionada.materiales.length === 0 ? (
                    <p className="text-sm text-gray-400">Sin materiales registrados</p>
                  ) : (
                    <div className="divide-y divide-gray-100 rounded-lg border border-gray-100">
                      {ofertaSeleccionada.materiales.map((mat, idx) => {
                        // Enriquecer con datos del catálogo local si el snapshot no los tiene
                        const catalogEntry =
                          materialesMap.get(mat.material_id) ??
                          (mat.codigo ? materialesMap.get(mat.codigo) : undefined);
                        const foto = mat.foto_url || catalogEntry?.foto;
                        const nombre = mat.descripcion || catalogEntry?.nombre || mat.codigo || mat.material_id;
                        return (
                          <div
                            key={mat.id ?? `${mat.material_id}-${idx}`}
                            className="flex items-center gap-3 p-3"
                          >
                            <div className="h-14 w-14 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
                              {foto ? (
                                <img
                                  src={foto}
                                  alt={nombre}
                                  className="w-full h-full object-contain"
                                />
                              ) : (
                                <Package className="h-6 w-6 text-gray-300" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 break-words leading-snug">
                                {nombre}
                              </p>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {mat.codigo && <span>{mat.codigo}</span>}
                                {mat.codigo && mat.categoria && <span> · </span>}
                                {mat.categoria && <span>{mat.categoria}</span>}
                                {mat.um && <span> · {mat.um}</span>}
                              </p>
                            </div>
                            <div className="text-right shrink-0 space-y-0.5">
                              <p className="text-sm font-semibold text-gray-900">
                                {mat.cantidad} {mat.um ?? "u"}
                              </p>
                              {(mat.descuento_porcentaje ?? 0) > 0 ? (
                                <>
                                  <p className="text-xs text-gray-400 line-through">
                                    ${fmt(mat.precio * mat.cantidad)}
                                  </p>
                                  <p className="text-xs text-orange-500 font-medium">
                                    -{mat.descuento_porcentaje}% desc.
                                  </p>
                                </>
                              ) : (
                                <p className="text-xs text-gray-400">${fmt(mat.precio)}/u</p>
                              )}
                              <p className="text-sm font-bold text-orange-600">
                                ${fmt(mat.subtotal ?? mat.precio * mat.cantidad)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {ofertaSeleccionada.observaciones && (
                <Card className="border-gray-200">
                  <CardContent className="p-4 text-sm text-gray-700">
                    <p className="text-gray-500 text-xs mb-1">Observaciones</p>
                    {ofertaSeleccionada.observaciones}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Sub-dialog: Crear nueva oferta ───────────────────────── */}
      <AgregarOfertaDialog
        open={showCrear}
        onOpenChange={setShowCrear}
        cliente={cliente}
        onCreated={handleOfertaCreatedOrEdited}
      />

      {/* ── Sub-dialog: Editar oferta ────────────────────────────── */}
      {ofertaEditar && (
        <AgregarOfertaDialog
          open={Boolean(ofertaEditar)}
          onOpenChange={(open) => { if (!open) setOfertaEditar(null); }}
          cliente={cliente}
          ofertaToEdit={ofertaEditar}
          onCreated={handleOfertaCreatedOrEdited}
        />
      )}

      {/* ── Sub-dialog: Confirmar eliminación ───────────────────── */}
      <ConfirmDeleteDialog
        open={Boolean(ofertaEliminar)}
        onOpenChange={(open) => { if (!open) setOfertaEliminar(null); }}
        title="Eliminar oferta"
        message={`¿Estás seguro de eliminar la oferta ${ofertaEliminar?.codigo ?? ""}?`}
        onConfirm={handleConfirmDelete}
        confirmText="Eliminar"
      />
    </>
  );
}
