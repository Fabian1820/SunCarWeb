"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
import { Badge } from "@/components/shared/atom/badge";
import { Button } from "@/components/shared/atom/button";
import { Label } from "@/components/shared/atom/label";
import { Input } from "@/components/shared/molecule/input";
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  Eye,
  FileOutput,
  FileText,
  Loader2,
  Package,
  User,
  UserCheck,
} from "lucide-react";
import { ValeSalidaService } from "@/lib/api-services";
import type { Cliente, ValeSalida, ValeSalidaSummary } from "@/lib/api-types";
import { ValeSalidaDetailDialog } from "@/components/feats/vales-salida/vale-salida-detail-dialog";
import { useToast } from "@/hooks/use-toast";
import { parseFechaUtc } from "@/lib/utils/fecha-utc";

// Un cliente de la instaladora tiene pocas decenas de vales: con este tope se
// ven todos sin paginar, y si alguno lo pasa se avisa debajo de la lista.
const LIMITE_VALES = 200;

interface ClienteValesSalidaDialogProps {
  cliente: Cliente | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formatFechaHora = (value?: string | null) => {
  const fecha = parseFechaUtc(value);
  if (!fecha) return "-";
  return fecha.toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// fecha_recogida es un dia (YYYY-MM-DD), no un instante: no se convierte.
const formatDia = (value?: string | null) => {
  if (!value) return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
};

const formatCantidad = (cantidad: number) =>
  Number.isInteger(cantidad)
    ? String(cantidad)
    : cantidad.toLocaleString("es-ES", { maximumFractionDigits: 2 });

export function ClienteValesSalidaDialog({
  cliente,
  open,
  onOpenChange,
}: ClienteValesSalidaDialogProps) {
  const { toast } = useToast();
  const [vales, setVales] = useState<ValeSalidaSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
  const [valeDetalle, setValeDetalle] = useState<ValeSalida | null>(null);
  const [cargandoDetalleId, setCargandoDetalleId] = useState<string | null>(
    null,
  );

  const clienteId = cliente?.id;

  // Cada cliente se abre limpio: sin los filtros ni las filas abiertas del anterior.
  useEffect(() => {
    setFechaDesde("");
    setFechaHasta("");
    setExpandidos(new Set());
    setVales([]);
    setTotal(0);
    setError(null);
  }, [clienteId]);

  useEffect(() => {
    if (!open || !clienteId) return;
    let cancelado = false;

    setLoading(true);
    setError(null);
    ValeSalidaService.getValesSummary({
      cliente_id: clienteId,
      fecha_desde: fechaDesde || undefined,
      fecha_hasta: fechaHasta || undefined,
      limit: LIMITE_VALES,
    })
      .then(({ data, total: totalVales }) => {
        if (cancelado) return;
        setVales(data);
        setTotal(totalVales);
      })
      .catch((err: unknown) => {
        if (cancelado) return;
        setVales([]);
        setTotal(0);
        setError(
          err instanceof Error ? err.message : "No se pudieron cargar los vales",
        );
      })
      .finally(() => {
        if (!cancelado) setLoading(false);
      });

    return () => {
      cancelado = true;
    };
  }, [open, clienteId, fechaDesde, fechaHasta]);

  const toggleExpandido = (valeId: string) => {
    setExpandidos((prev) => {
      const next = new Set(prev);
      if (next.has(valeId)) next.delete(valeId);
      else next.add(valeId);
      return next;
    });
  };

  const abrirDetalle = async (valeId: string) => {
    setCargandoDetalleId(valeId);
    try {
      const vale = await ValeSalidaService.getValeById(valeId);
      if (!vale) throw new Error("El vale ya no existe");
      setValeDetalle(vale);
    } catch (err) {
      toast({
        title: "No se pudo abrir el vale",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setCargandoDetalleId(null);
    }
  };

  const hayFiltros = Boolean(fechaDesde || fechaHasta);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileOutput className="h-5 w-5 text-emerald-600" />
              Vales de salida
            </DialogTitle>
            <DialogDescription>
              {cliente
                ? `${cliente.nombre}${cliente.numero ? ` · ${cliente.numero}` : ""}`
                : ""}
            </DialogDescription>
          </DialogHeader>

          {!clienteId ? (
            <p className="py-8 text-center text-sm text-gray-500">
              Este cliente no tiene identificador en la base de datos, así que
              no se pueden buscar sus vales.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
                <div>
                  <Label
                    htmlFor="vales-cliente-desde"
                    className="text-sm font-medium text-gray-700 mb-1.5 block"
                  >
                    Desde
                  </Label>
                  <Input
                    id="vales-cliente-desde"
                    type="date"
                    value={fechaDesde}
                    max={fechaHasta || undefined}
                    onChange={(e) => setFechaDesde(e.target.value)}
                  />
                </div>
                <div>
                  <Label
                    htmlFor="vales-cliente-hasta"
                    className="text-sm font-medium text-gray-700 mb-1.5 block"
                  >
                    Hasta
                  </Label>
                  <Input
                    id="vales-cliente-hasta"
                    type="date"
                    value={fechaHasta}
                    min={fechaDesde || undefined}
                    onChange={(e) => setFechaHasta(e.target.value)}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFechaDesde("");
                    setFechaHasta("");
                  }}
                  disabled={!hayFiltros}
                  className="text-gray-500 hover:text-gray-700"
                >
                  Limpiar fechas
                </Button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-gray-500">
                  <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
                  Cargando vales...
                </div>
              ) : error ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              ) : vales.length === 0 ? (
                <div className="py-12 text-center">
                  <FileOutput className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                  <p className="text-sm text-gray-600">
                    {hayFiltros
                      ? "No hay vales de salida de este cliente en esas fechas."
                      : "Este cliente no tiene vales de salida."}
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-xs text-gray-500">
                    {total} {total === 1 ? "vale" : "vales"}, del más reciente
                    al más antiguo
                  </p>
                  <ul className="space-y-2">
                    {vales.map((vale) => {
                      const abierto = expandidos.has(vale.id);
                      const anulado = vale.estado === "anulado";
                      const materiales = vale.materiales ?? [];
                      const recogida = formatDia(vale.fecha_recogida);
                      return (
                        <li
                          key={vale.id}
                          className={`rounded-lg border ${
                            anulado
                              ? "border-red-200 bg-red-50/40"
                              : "border-gray-200 bg-white"
                          }`}
                        >
                          <div className="flex flex-wrap items-start gap-x-4 gap-y-2 p-3">
                            <button
                              type="button"
                              onClick={() => toggleExpandido(vale.id)}
                              className="flex min-w-0 flex-1 items-start gap-2 text-left"
                              aria-expanded={abierto}
                              title={
                                abierto
                                  ? "Ocultar materiales"
                                  : "Ver materiales"
                              }
                            >
                              {abierto ? (
                                <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
                              ) : (
                                <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
                              )}
                              <div className="min-w-0 space-y-1.5">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge
                                    variant="outline"
                                    className="bg-emerald-50 text-emerald-700 border-emerald-200 font-mono text-xs"
                                  >
                                    {vale.codigo || vale.id.slice(-6).toUpperCase()}
                                  </Badge>
                                  <span className="flex items-center gap-1 text-sm text-gray-700">
                                    <Calendar className="h-3.5 w-3.5 text-gray-400" />
                                    {formatFechaHora(vale.fecha_creacion)}
                                  </span>
                                  {anulado ? (
                                    <Badge
                                      variant="outline"
                                      className="bg-red-50 text-red-700 border-red-200 text-xs"
                                    >
                                      Anulado
                                    </Badge>
                                  ) : null}
                                  <Badge
                                    variant="outline"
                                    className="bg-gray-50 text-gray-700 border-gray-200 text-xs"
                                  >
                                    {materiales.length}{" "}
                                    {materiales.length === 1
                                      ? "material"
                                      : "materiales"}
                                  </Badge>
                                </div>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                                  <span className="flex items-center gap-1">
                                    <UserCheck className="h-3.5 w-3.5 text-gray-400" />
                                    Entregado a:{" "}
                                    {vale.recibido_por ? (
                                      <span className="font-medium text-gray-800">
                                        {vale.recibido_por}
                                      </span>
                                    ) : (
                                      <span className="italic">
                                        sin responsable registrado
                                      </span>
                                    )}
                                  </span>
                                  {recogida ? (
                                    <span>Recogida: {recogida}</span>
                                  ) : null}
                                  {vale.creador_nombre ? (
                                    <span className="flex items-center gap-1">
                                      <User className="h-3.5 w-3.5 text-gray-400" />
                                      Emitió: {vale.creador_nombre}
                                    </span>
                                  ) : null}
                                  {vale.solicitud_codigo ? (
                                    <span className="flex items-center gap-1">
                                      <FileText className="h-3.5 w-3.5 text-gray-400" />
                                      Solicitud {vale.solicitud_codigo}
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            </button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => void abrirDetalle(vale.id)}
                              disabled={cargandoDetalleId === vale.id}
                              className="border-blue-300 text-blue-700 hover:bg-blue-50"
                              title="Ver el vale completo, con sus documentos"
                            >
                              {cargandoDetalleId === vale.id ? (
                                <Loader2 className="h-4 w-4 animate-spin sm:mr-1" />
                              ) : (
                                <Eye className="h-4 w-4 sm:mr-1" />
                              )}
                              <span className="hidden sm:inline text-xs">
                                Ver vale
                              </span>
                            </Button>
                          </div>

                          {abierto ? (
                            <div className="border-t border-gray-200 px-3 pb-3 pt-2">
                              {materiales.length === 0 ? (
                                <p className="py-2 text-sm text-gray-500">
                                  El vale no tiene materiales.
                                </p>
                              ) : (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="border-b text-left text-xs text-gray-500">
                                        <th className="py-1.5 pr-3 font-medium">
                                          Material
                                        </th>
                                        <th className="py-1.5 pr-3 font-medium w-32">
                                          Código
                                        </th>
                                        <th className="py-1.5 font-medium text-right w-28">
                                          Cantidad
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {materiales.map((mat, idx) => (
                                        <tr
                                          key={`${mat.material_id}-${idx}`}
                                          className="border-b last:border-b-0"
                                        >
                                          <td className="py-2 pr-3">
                                            <span className="flex items-center gap-2 text-gray-900">
                                              <Package className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                                              {mat.material_nombre ||
                                                mat.material_descripcion ||
                                                mat.material_codigo ||
                                                mat.material_id}
                                            </span>
                                          </td>
                                          <td className="py-2 pr-3 font-mono text-xs text-gray-500">
                                            {mat.material_codigo || "-"}
                                          </td>
                                          <td className="py-2 text-right font-semibold text-gray-900 whitespace-nowrap">
                                            {formatCantidad(mat.cantidad)}{" "}
                                            <span className="font-normal text-gray-500">
                                              {mat.um || "U"}
                                            </span>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                  {total > vales.length ? (
                    <p className="text-center text-xs text-amber-700">
                      Se muestran los {vales.length} más recientes de {total}.
                      Acota las fechas para ver los anteriores.
                    </p>
                  ) : null}
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ValeSalidaDetailDialog
        open={valeDetalle !== null}
        onOpenChange={(abierto) => {
          if (!abierto) setValeDetalle(null);
        }}
        vale={valeDetalle}
      />
    </>
  );
}
