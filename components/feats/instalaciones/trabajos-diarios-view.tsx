"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/shared/molecule/card";
import { Button } from "@/components/shared/atom/button";
import { Input } from "@/components/shared/molecule/input";
import { Badge } from "@/components/shared/atom/badge";
import { useToast } from "@/hooks/use-toast";
import {
  InstalacionesService,
  TrabajadorService,
} from "@/lib/api-services";
import { apiRequest } from "@/lib/api-config";
import type { TrabajoDiarioVale } from "@/lib/services/feats/instalaciones/instalaciones-service";
import { CheckCircle2, Truck, Users } from "lucide-react";

type Brigadista = {
  id?: string;
  CI?: string;
  nombre?: string;
  is_brigadista?: boolean;
};

const toDateInput = (value: Date) => {
  const yyyy = value.getFullYear();
  const mm = String(value.getMonth() + 1).padStart(2, "0");
  const dd = String(value.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const safeText = (value: unknown, fallback = "") => {
  const text = String(value ?? "").trim();
  return text || fallback;
};

const extractApiErrorMessage = (response: unknown) => {
  if (!response || typeof response !== "object") return "";
  const data = response as Record<string, unknown>;
  if (typeof data.message === "string" && data.message.trim())
    return data.message;
  if (typeof data.detail === "string" && data.detail.trim()) return data.detail;
  if (typeof data.error === "string" && data.error.trim()) return data.error;
  if (
    data.error &&
    typeof data.error === "object" &&
    typeof (data.error as Record<string, unknown>).message === "string"
  ) {
    return String((data.error as Record<string, unknown>).message);
  }
  return "";
};

const matchResponsable = (responsable: string, worker: Brigadista) => {
  const r = safeText(responsable).toLowerCase();
  if (!r) return false;
  const ci = safeText(worker.CI).toLowerCase();
  const nombre = safeText(worker.nombre).toLowerCase();
  return (
    (ci && r.includes(ci)) ||
    (nombre && r.includes(nombre)) ||
    r === ci ||
    r === nombre
  );
};

const CONFIRMAR_SALIDA_ENDPOINT = "/operaciones/confirmar-salida-instalacion";

type TrabajosDiariosViewMode = "vales" | "entregas";

interface TrabajosDiariosViewProps {
  mode?: TrabajosDiariosViewMode;
}

export function TrabajosDiariosView({ mode = "vales" }: TrabajosDiariosViewProps) {
  const { toast } = useToast();
  const [fechaTrabajo, setFechaTrabajo] = useState(() =>
    toDateInput(new Date()),
  );
  const [loading, setLoading] = useState(false);
  const [vales, setVales] = useState<TrabajoDiarioVale[]>([]);
  const [brigadistas, setBrigadistas] = useState<Brigadista[]>([]);
  const [responsableFiltro, setResponsableFiltro] = useState("");
  const [clienteFiltro, setClienteFiltro] = useState("");

  // valeId -> set of CI
  const [seleccionPorVale, setSeleccionPorVale] = useState<
    Record<string, string[]>
  >({});
  const [confirmando, setConfirmando] = useState<Record<string, boolean>>({});
  const [salidaConfirmadaPorVale, setSalidaConfirmadaPorVale] = useState<
    Record<string, boolean>
  >({});
  const [confirmandoEntrega, setConfirmandoEntrega] = useState<
    Record<string, boolean>
  >({});
  const [entregaConfirmadaPorVale, setEntregaConfirmadaPorVale] = useState<
    Record<string, boolean>
  >({});

  const valesFiltrados = useMemo(() => {
    const normalizar = (value: unknown) =>
      safeText(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const responsableQ = normalizar(responsableFiltro);
    const clienteQ = normalizar(clienteFiltro);

    return (vales || []).filter((vale) => {
      const responsableTexto = normalizar(vale.responsable_recogida);
      const clienteTexto = [
        vale.cliente_nombre,
        vale.cliente_numero,
        vale.cliente_direccion,
      ]
        .map((v) => normalizar(v))
        .join(" ");

      const matchResponsable = !responsableQ || responsableTexto.includes(responsableQ);
      const matchCliente = !clienteQ || clienteTexto.includes(clienteQ);
      return matchResponsable && matchCliente;
    });
  }, [clienteFiltro, responsableFiltro, vales]);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      const [valesData, trabajadoresData] = await Promise.all([
        mode === "entregas"
          ? InstalacionesService.getEntregasSinInstalar(fechaTrabajo)
          : InstalacionesService.getTrabajosDiarios(fechaTrabajo),
        TrabajadorService.getAllTrabajadores(),
      ]);

      const brigadistasOnly = (
        trabajadoresData as unknown as Brigadista[]
      ).filter((t) => t?.is_brigadista === true);

      setVales(valesData || []);
      setBrigadistas(
        brigadistasOnly.sort((a, b) =>
          safeText(a.nombre).localeCompare(safeText(b.nombre), "es"),
        ),
      );

      // Preselección: incluir responsable_recogida si coincide con algún brigadista
      const nextSeleccion: Record<string, string[]> = {};
      (valesData || []).forEach((vale) => {
        const responsable = safeText(vale.responsable_recogida);
        if (!responsable) return;
        const matches = brigadistasOnly.filter((w) =>
          matchResponsable(responsable, w),
        );
        if (matches.length > 0) {
          const cis = matches.map((m) => safeText(m.CI)).filter(Boolean);
          if (cis.length > 0 && vale.vale_id) {
            nextSeleccion[vale.vale_id] = Array.from(new Set(cis));
          }
        }
      });
      setSeleccionPorVale((prev) => ({ ...nextSeleccion, ...prev }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error cargando datos";
      toast({ title: "Error", description: message, variant: "destructive" });
      setVales([]);
      setBrigadistas([]);
    } finally {
      setLoading(false);
    }
  }, [fechaTrabajo, mode, toast]);

  useEffect(() => {
    void cargarDatos();
  }, [cargarDatos]);

  const toggleBrigadista = (valeId: string, ci: string) => {
    const normalized = safeText(ci);
    if (!normalized) return;
    setSeleccionPorVale((prev) => {
      const current = new Set(prev[valeId] || []);
      if (current.has(normalized)) current.delete(normalized);
      else current.add(normalized);
      return { ...prev, [valeId]: Array.from(current) };
    });
  };

  const confirmarSalida = async (vale: TrabajoDiarioVale) => {
    const valeId = vale.vale_id;
    if (!valeId) {
      toast({
        title: "Vale inválido",
        description: "No se pudo identificar el vale de salida.",
        variant: "destructive",
      });
      return;
    }

    const seleccionados = seleccionPorVale[valeId] || [];
    if (seleccionados.length === 0) {
      toast({
        title: "Faltan brigadistas",
        description:
          "Selecciona al menos un trabajador (is_brigadista=true) antes de confirmar la salida.",
        variant: "destructive",
      });
      return;
    }

    setConfirmando((prev) => ({ ...prev, [valeId]: true }));
    try {
      const response = await apiRequest<unknown>(CONFIRMAR_SALIDA_ENDPOINT, {
        method: "POST",
        body: JSON.stringify({
          id_vale_salida: valeId,
          fecha: fechaTrabajo,
          brigadistas_ci: seleccionados,
        }),
      });

      if (response && typeof response === "object") {
        const responseObj = response as Record<string, unknown>;
        const httpStatus = typeof responseObj._httpStatus === "number" ? responseObj._httpStatus : 0;
        const isHttpError = httpStatus >= 400;
        const hasDetail = typeof responseObj.detail === "string" && responseObj.detail.trim().length > 0;
        if (
          responseObj.success === false ||
          responseObj.error ||
          isHttpError ||
          (hasDetail && !responseObj.trabajo_diario_id && !(responseObj.data as Record<string, unknown> | undefined)?.trabajo_diario_id)
        ) {
          throw new Error(
            extractApiErrorMessage(response) ||
              "No se pudo confirmar la salida de brigada.",
          );
        }
      }

      const payloadData =
        response && typeof response === "object"
          ? ((response as Record<string, unknown>).data as
              | Record<string, unknown>
              | undefined)
          : undefined;

      const trabajoId =
        safeText(payloadData?.trabajo_diario_id) ||
        safeText((response as Record<string, unknown> | undefined)?.trabajo_diario_id);
      const entregaId =
        safeText(payloadData?.entrega_material_id) ||
        safeText((response as Record<string, unknown> | undefined)?.entrega_material_id);
      const clienteNumero =
        safeText(payloadData?.cliente_numero) ||
        safeText((response as Record<string, unknown> | undefined)?.cliente_numero) ||
        safeText(vale.cliente_numero);
      const clienteEstadoAnterior = safeText(payloadData?.cliente_estado_anterior);
      const clienteEstadoActual = safeText(payloadData?.cliente_estado_actual);
      const idempotente =
        payloadData?.idempotente === true ||
        (response as Record<string, unknown> | undefined)?.idempotente === true;
      const clienteActualizado =
        payloadData?.cliente_actualizado === true ||
        (response as Record<string, unknown> | undefined)?.cliente_actualizado === true;

      const detalleEstado = clienteEstadoActual
        ? clienteEstadoAnterior
          ? `Estado cliente: ${clienteEstadoAnterior} -> ${clienteEstadoActual}.`
          : `Estado cliente actual: ${clienteEstadoActual}.`
        : clienteActualizado
          ? "Cliente actualizado."
          : "Estado del cliente sin cambios.";
      const detalleIds = [
        trabajoId ? `Trabajo: ${trabajoId}` : "",
        entregaId ? `Entrega: ${entregaId}` : "",
      ]
        .filter(Boolean)
        .join(" • ");

      toast({
        title: "Confirmado",
        description: `${idempotente ? "Operación ya confirmada previamente." : "Salida y entrega confirmadas."}${clienteNumero ? ` Cliente: ${clienteNumero}.` : ""} ${detalleEstado} ${detalleIds}`.trim(),
      });
      setSalidaConfirmadaPorVale((prev) => ({ ...prev, [valeId]: true }));
      // Remover inmediatamente el vale de la pestaña de confirmación
      setVales((prev) => prev.filter((item) => item.vale_id !== valeId));
      setSeleccionPorVale((prev) => {
        const next = { ...prev };
        delete next[valeId];
        return next;
      });
      setConfirmandoEntrega((prev) => {
        const next = { ...prev };
        delete next[valeId];
        return next;
      });
      setEntregaConfirmadaPorVale((prev) => {
        const next = { ...prev };
        delete next[valeId];
        return next;
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error confirmando salida";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setConfirmando((prev) => ({ ...prev, [valeId]: false }));
    }
  };

  const confirmarEntregaMateriales = async (vale: TrabajoDiarioVale) => {
    const valeId = safeText(vale.vale_id);
    
    if (!valeId) {
      toast({
        title: "Vale inválido",
        description: "No se pudo identificar el vale de salida.",
        variant: "destructive",
      });
      return;
    }

    setConfirmandoEntrega((prev) => ({ ...prev, [valeId]: true }));
    try {
      const response = await apiRequest<unknown>("/entregas-materiales/confirmar-desde-vale", {
        method: "POST",
        body: JSON.stringify({
          id_vale_salida: valeId,
          fecha: fechaTrabajo, // Formato YYYY-MM-DD
        }),
      });

      if (response && typeof response === "object") {
        const responseObj = response as Record<string, unknown>;
        if (responseObj.success === false || responseObj.error) {
          throw new Error(
            extractApiErrorMessage(response) ||
              "No se pudo confirmar la entrega de materiales.",
          );
        }
      }

      const responsable = safeText(vale.responsable_recogida, "N/A");
      const entregaId =
        response && typeof response === "object"
          ? safeText((response as Record<string, unknown>).entrega_material_id)
          : "";
      
      setEntregaConfirmadaPorVale((prev) => ({ ...prev, [valeId]: true }));
      
      toast({
        title: "Entrega confirmada",
        description: `Entrega creada para el vale ${safeText(vale.vale_codigo, valeId)}${entregaId ? ` (${entregaId})` : ""}. Responsable de recogida: ${responsable}.`,
      });
      // Remover inmediatamente el vale de la pestaña de confirmación
      setVales((prev) => prev.filter((item) => item.vale_id !== valeId));
      setSeleccionPorVale((prev) => {
        const next = { ...prev };
        delete next[valeId];
        return next;
      });
      setConfirmando((prev) => {
        const next = { ...prev };
        delete next[valeId];
        return next;
      });
      setSalidaConfirmadaPorVale((prev) => {
        const next = { ...prev };
        delete next[valeId];
        return next;
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo confirmar la entrega de materiales";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setConfirmandoEntrega((prev) => ({ ...prev, [valeId]: false }));
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-l-4 border-l-purple-600">
        <CardHeader>
          <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <span>Fecha de trabajo</span>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <Input
                type="date"
                value={fechaTrabajo}
                onChange={(e) => setFechaTrabajo(e.target.value)}
                className="w-full sm:w-[190px]"
              />
              <Button
                type="button"
                variant="outline"
                onClick={cargarDatos}
                disabled={loading}
                className="w-full sm:w-auto"
              >
                {loading ? "Cargando..." : "Recargar"}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            {mode === "entregas" ? (
              <>
                Se listan entregas con <strong>salida_brigada=false</strong> para
                confirmar salida e iniciar/actualizar el trabajo diario, sin
                volver a registrar la entrega.
              </>
            ) : (
              <>
                Se listan vales de salida de{" "}
                <strong>solicitudes de materiales</strong> cuya{" "}
                <strong>fecha de recogida</strong> coincide con la fecha de trabajo.
              </>
            )}
          </p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-indigo-600">
        <CardHeader>
          <CardTitle className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <span>
              {mode === "entregas" ? "Entregas sin instalar" : "Vales del día"} (
              {valesFiltrados.length})
            </span>
            <span className="text-sm text-gray-500 flex items-center gap-2">
              <Users className="h-4 w-4" /> Brigadistas: {brigadistas.length}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <Input
              value={responsableFiltro}
              onChange={(e) => setResponsableFiltro(e.target.value)}
              placeholder="Buscar por responsable de recogida"
            />
            <Input
              value={clienteFiltro}
              onChange={(e) => setClienteFiltro(e.target.value)}
              placeholder="Buscar por cliente (nombre, número o dirección)"
            />
          </div>
          {loading ? (
            <div className="py-10 text-center text-gray-600">
              Cargando vales...
            </div>
          ) : valesFiltrados.length === 0 ? (
            <div className="py-10 text-center text-gray-600">
              {mode === "entregas"
                ? "No hay entregas pendientes de salida de brigada para esta fecha."
                : "No hay vales de salida (solicitudes de materiales) para esta fecha."}
            </div>
          ) : (
            <div className="space-y-4">
              {valesFiltrados.map((vale) => {
                const responsable = safeText(vale.responsable_recogida, "N/A");
                const seleccion = new Set(seleccionPorVale[vale.vale_id] || []);
                const salidaConfirmada =
                  salidaConfirmadaPorVale[vale.vale_id] === true;
                const entregaConfirmada =
                  entregaConfirmadaPorVale[vale.vale_id] === true;
                
                // Solo se puede usar uno de los dos botones
                const salidaDisabled =
                  confirmando[vale.vale_id] === true || 
                  salidaConfirmada || 
                  entregaConfirmada; // Deshabilitar si ya se confirmó entrega
                
                const entregaDisabled =
                  confirmandoEntrega[vale.vale_id] === true ||
                  entregaConfirmada ||
                  salidaConfirmada; // Deshabilitar si ya se confirmó salida

                return (
                  <div
                    key={vale.vale_id}
                    className="border rounded-lg p-3 sm:p-4 bg-white space-y-3"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-gray-900">
                            Vale: {safeText(vale.vale_codigo, vale.vale_id)}
                          </p>
                          <Badge className="bg-slate-100 text-slate-800">
                            Solicitud:{" "}
                            {safeText(vale.solicitud_codigo, vale.solicitud_id)}
                          </Badge>
                          <Badge className="bg-purple-100 text-purple-800">
                            Fecha recogida:{" "}
                            {safeText(vale.fecha_recogida, "N/A").slice(0, 10)}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-700 mt-1 break-words">
                          <strong>Responsable recogida:</strong> {responsable}
                        </p>
                        <p className="text-sm text-gray-700 mt-1 break-words">
                          <strong>Cliente:</strong>{" "}
                          {safeText(vale.cliente_nombre, "N/A")}
                          {vale.cliente_numero
                            ? ` • ${vale.cliente_numero}`
                            : ""}
                        </p>
                        <p className="text-sm text-gray-600 break-words">
                          <strong>Dirección:</strong>{" "}
                          {safeText(vale.cliente_direccion, "N/A")}
                        </p>
                        <p className="text-sm text-gray-600 break-words">
                          <strong>Teléfono:</strong>{" "}
                          {safeText(vale.cliente_telefono, "N/A")}
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <Button
                          type="button"
                          className={`w-full sm:w-auto ${
                            salidaConfirmada
                              ? "bg-slate-500 hover:bg-slate-500"
                              : "bg-emerald-700 hover:bg-emerald-800"
                          }`}
                          onClick={() => void confirmarSalida(vale)}
                          disabled={salidaDisabled}
                          title={
                            salidaConfirmada
                              ? "Salida ya confirmada para este vale"
                              : entregaConfirmada
                                ? "No se puede confirmar salida porque ya se confirmó la entrega de materiales"
                                : "Confirma salida y actualiza el estado del cliente solo si aplica"
                          }
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          {salidaConfirmada
                            ? "Salida confirmada"
                            : confirmando[vale.vale_id] === true
                              ? "Confirmando..."
                              : entregaConfirmada
                                ? "No disponible"
                                : "Confirmar salida"}
                        </Button>
                        {mode === "vales" ? (
                          <Button
                            type="button"
                            className={`w-full sm:w-auto ${
                              entregaConfirmada
                                ? "bg-slate-500 hover:bg-slate-500"
                                : "bg-blue-700 hover:bg-blue-800"
                            }`}
                            onClick={() => void confirmarEntregaMateriales(vale)}
                            disabled={entregaDisabled}
                            title={
                              entregaConfirmada
                                ? "Entrega de materiales ya confirmada para este vale"
                                : salidaConfirmada
                                  ? "No se puede confirmar entrega porque ya se confirmó la salida"
                                  : "Confirma solo la entrega de materiales del vale"
                            }
                          >
                            <Truck className="h-4 w-4 mr-2" />
                            {entregaConfirmada
                              ? "Entrega confirmada"
                              : confirmandoEntrega[vale.vale_id] === true
                                ? "Confirmando..."
                                : salidaConfirmada
                                  ? "No disponible"
                                  : "Entrega Materiales"}
                          </Button>
                        ) : null}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="rounded-md border border-slate-200 p-3">
                        <p className="text-sm font-semibold text-slate-900 mb-2">
                          Materiales del vale
                        </p>
                        <div className="h-[220px] sm:h-[240px] overflow-y-auto overscroll-contain pr-1">
                          {Array.isArray(vale.items) &&
                          vale.items.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="w-full min-w-[560px] text-sm">
                                <thead>
                                  <tr className="border-b border-slate-200">
                                    <th className="text-left py-1.5 pr-2">
                                      Código
                                    </th>
                                    <th className="text-left py-1.5 pr-2">
                                      Descripción
                                    </th>
                                    <th className="text-right py-1.5">Cant.</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {vale.items.map((m, idx) => (
                                    <tr
                                      key={`${m.material_id}-${idx}`}
                                      className="border-b border-slate-100"
                                    >
                                      <td className="py-1.5 pr-2">
                                        {safeText(m.material_codigo, "--")}
                                      </td>
                                      <td className="py-1.5 pr-2">
                                        {safeText(
                                          m.material_descripcion,
                                          "Material",
                                        )}
                                      </td>
                                      <td className="py-1.5 text-right">
                                        {Number(m.cantidad || 0)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <p className="text-sm text-slate-600">
                              Sin materiales.
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="rounded-md border border-slate-200 p-3">
                        <p className="text-sm font-semibold text-slate-900 mb-2">
                          Brigadistas que salieron
                        </p>
                        {brigadistas.length === 0 ? (
                          <p className="text-sm text-slate-600">
                            No hay brigadistas disponibles.
                          </p>
                        ) : (
                          <div className="h-[220px] sm:h-[240px] overflow-y-auto overscroll-contain space-y-2 pr-1">
                            {brigadistas.map((b) => {
                              const ci = safeText(b.CI);
                              const checked = ci ? seleccion.has(ci) : false;
                              const isMatch = matchResponsable(responsable, b);
                              return (
                                <label
                                  key={
                                    ci ||
                                    safeText(b.id) ||
                                    `${safeText(b.nombre)}-${Math.random()}`
                                  }
                                  className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-50 rounded px-2 py-1"
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() =>
                                      toggleBrigadista(vale.vale_id, ci)
                                    }
                                    disabled={!ci}
                                  />
                                  <span className="min-w-0">
                                    <span className="font-medium text-slate-900 break-words">
                                      {safeText(b.nombre, "Trabajador")}
                                    </span>
                                    {ci ? (
                                      <span className="text-slate-500 ml-0 sm:ml-2 block sm:inline">
                                        ({ci})
                                      </span>
                                    ) : null}
                                    {isMatch ? (
                                      <span className="ml-2 text-xs font-semibold text-emerald-700">
                                        • coincide con responsable
                                      </span>
                                    ) : null}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                        <p className="text-xs text-slate-500 mt-2">
                          Seleccionados: {seleccion.size}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
