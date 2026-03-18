"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/molecule/card";
import { Button } from "@/components/shared/atom/button";
import { Input } from "@/components/shared/molecule/input";
import { Badge } from "@/components/shared/atom/badge";
import { useToast } from "@/hooks/use-toast";
import { ClienteService, TrabajadorService, ValeSalidaService } from "@/lib/api-services";
import type { ValeSalida } from "@/lib/api-types";
import { CheckCircle2, Users } from "lucide-react";

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

const isSameDay = (iso: string | null | undefined, day: string) => {
  if (!iso || !day) return false;
  // aceptamos "YYYY-MM-DD" o "YYYY-MM-DDTHH:mm:ss"
  return safeText(iso).startsWith(day);
};

const matchResponsable = (responsable: string, worker: Brigadista) => {
  const r = safeText(responsable).toLowerCase();
  if (!r) return false;
  const ci = safeText(worker.CI).toLowerCase();
  const nombre = safeText(worker.nombre).toLowerCase();
  return (ci && r.includes(ci)) || (nombre && r.includes(nombre)) || r === ci || r === nombre;
};

export function TrabajosDiariosView() {
  const { toast } = useToast();
  const [fechaTrabajo, setFechaTrabajo] = useState(() => toDateInput(new Date()));
  const [loading, setLoading] = useState(false);
  const [vales, setVales] = useState<ValeSalida[]>([]);
  const [brigadistas, setBrigadistas] = useState<Brigadista[]>([]);

  // valeId -> set of CI
  const [seleccionPorVale, setSeleccionPorVale] = useState<Record<string, string[]>>({});
  const [confirmando, setConfirmando] = useState<Record<string, boolean>>({});

  const valesFiltrados = useMemo(() => {
    return (vales || [])
      .filter((vale) => String(vale.solicitud_tipo || "").toLowerCase().includes("material"))
      .filter((vale) => {
        const solicitud = vale.solicitud_material || vale.solicitud || null;
        return isSameDay(solicitud?.fecha_recogida, fechaTrabajo);
      })
      .filter((vale) => {
        const solicitud = vale.solicitud_material || vale.solicitud || null;
        return Boolean(solicitud?.cliente?.id || solicitud?.cliente?.numero);
      });
  }, [vales, fechaTrabajo]);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      const [valesData, trabajadoresData] = await Promise.all([
        // Traemos un lote grande y filtramos por fecha en el cliente
        ValeSalidaService.getVales({ solicitud_tipo: "material", limit: 800 }),
        TrabajadorService.getAllTrabajadores(),
      ]);

      const brigadistasOnly = (trabajadoresData as unknown as Brigadista[]).filter(
        (t) => t?.is_brigadista === true,
      );

      setVales(valesData || []);
      setBrigadistas(
        brigadistasOnly.sort((a, b) => safeText(a.nombre).localeCompare(safeText(b.nombre), "es")),
      );

      // Preselección: incluir responsable_recogida si coincide con algún brigadista
      const nextSeleccion: Record<string, string[]> = {};
      (valesData || []).forEach((vale) => {
        const solicitud = vale.solicitud_material || vale.solicitud || null;
        if (!isSameDay(solicitud?.fecha_recogida, fechaTrabajo)) return;
        const responsable = safeText(solicitud?.responsable_recogida);
        if (!responsable) return;
        const matches = brigadistasOnly.filter((w) => matchResponsable(responsable, w));
        if (matches.length > 0) {
          const cis = matches.map((m) => safeText(m.CI)).filter(Boolean);
          if (cis.length > 0 && vale.id) nextSeleccion[vale.id] = Array.from(new Set(cis));
        }
      });
      setSeleccionPorVale((prev) => ({ ...nextSeleccion, ...prev }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error cargando datos";
      toast({ title: "Error", description: message, variant: "destructive" });
      setVales([]);
      setBrigadistas([]);
    } finally {
      setLoading(false);
    }
  }, [fechaTrabajo, toast]);

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

  const confirmarSalida = async (vale: ValeSalida) => {
    const solicitud = vale.solicitud_material || vale.solicitud || null;
    const clienteNumero = safeText(solicitud?.cliente?.numero);
    const valeId = vale.id;
    if (!clienteNumero) {
      toast({
        title: "Sin cliente",
        description: "Este vale no tiene un cliente válido asociado.",
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
      const payload = {
        estado: "Instalación en Proceso",
        fecha_instalacion: `${fechaTrabajo}T00:00:00`,
      };
      const response = await ClienteService.actualizarCliente(clienteNumero, payload);
      if (response?.success === false) {
        throw new Error(response.message || "No se pudo actualizar el cliente");
      }

      toast({
        title: "Confirmado",
        description: `Cliente ${clienteNumero} pasó a Instalación en Proceso (inicio: ${fechaTrabajo}).`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error confirmando salida";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setConfirmando((prev) => ({ ...prev, [valeId]: false }));
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-l-4 border-l-purple-600">
        <CardHeader>
          <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <span>Fecha de trabajo</span>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={fechaTrabajo}
                onChange={(e) => setFechaTrabajo(e.target.value)}
                className="w-[190px]"
              />
              <Button type="button" variant="outline" onClick={cargarDatos} disabled={loading}>
                {loading ? "Cargando..." : "Recargar"}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            Se listan vales de salida de <strong>solicitudes de materiales</strong> cuya{" "}
            <strong>fecha de recogida</strong> coincide con la fecha de trabajo.
          </p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-indigo-600">
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-3">
            <span>Vales del día ({valesFiltrados.length})</span>
            <span className="text-sm text-gray-500 flex items-center gap-2">
              <Users className="h-4 w-4" /> Brigadistas: {brigadistas.length}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 text-center text-gray-600">Cargando vales...</div>
          ) : valesFiltrados.length === 0 ? (
            <div className="py-10 text-center text-gray-600">
              No hay vales de salida (solicitudes de materiales) para esta fecha.
            </div>
          ) : (
            <div className="space-y-4">
              {valesFiltrados.map((vale) => {
                const solicitud = vale.solicitud_material || vale.solicitud || null;
                const cliente = solicitud?.cliente || null;
                const responsable = safeText(solicitud?.responsable_recogida, "N/A");
                const seleccion = new Set(seleccionPorVale[vale.id] || []);
                const disabled = confirmando[vale.id] === true;

                return (
                  <div key={vale.id} className="border rounded-lg p-4 bg-white space-y-3">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-gray-900">
                            Vale: {safeText(vale.codigo, vale.id)}
                          </p>
                          <Badge className="bg-slate-100 text-slate-800">
                            Solicitud: {safeText(solicitud?.codigo, safeText(solicitud?.id))}
                          </Badge>
                          <Badge className="bg-purple-100 text-purple-800">
                            Fecha recogida: {safeText(solicitud?.fecha_recogida, "N/A").slice(0, 10)}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-700 mt-1 break-words">
                          <strong>Responsable recogida:</strong> {responsable}
                        </p>
                        <p className="text-sm text-gray-700 mt-1 break-words">
                          <strong>Cliente:</strong> {safeText(cliente?.nombre, "N/A")}
                          {cliente?.numero ? ` • ${cliente.numero}` : ""}
                        </p>
                        <p className="text-sm text-gray-600 break-words">
                          <strong>Dirección:</strong> {safeText(cliente?.direccion, "N/A")}
                        </p>
                        <p className="text-sm text-gray-600 break-words">
                          <strong>Teléfono:</strong> {safeText(cliente?.telefono, "N/A")}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          className="bg-emerald-700 hover:bg-emerald-800 w-full sm:w-auto"
                          onClick={() => void confirmarSalida(vale)}
                          disabled={disabled}
                          title="Pasa el cliente a Instalación en Proceso y asigna fecha de inicio"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          {disabled ? "Confirmando..." : "Confirmar salida"}
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="rounded-md border border-slate-200 p-3">
                        <p className="text-sm font-semibold text-slate-900 mb-2">Materiales del vale</p>
                        <div className="h-[220px] sm:h-[240px] overflow-y-auto overscroll-contain pr-1">
                          {Array.isArray(vale.materiales) && vale.materiales.length > 0 ? (
                            <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-slate-200">
                                  <th className="text-left py-1.5 pr-2">Código</th>
                                  <th className="text-left py-1.5 pr-2">Descripción</th>
                                  <th className="text-right py-1.5">Cant.</th>
                                </tr>
                              </thead>
                              <tbody>
                                {vale.materiales.map((m, idx) => (
                                  <tr key={`${m.material_id}-${idx}`} className="border-b border-slate-100">
                                    <td className="py-1.5 pr-2">{safeText(m.material_codigo, m.codigo || "--")}</td>
                                    <td className="py-1.5 pr-2">
                                      {safeText(m.material_descripcion, m.descripcion || "Material")}
                                    </td>
                                    <td className="py-1.5 text-right">{Number(m.cantidad || 0)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            </div>
                          ) : (
                            <p className="text-sm text-slate-600">Sin materiales.</p>
                          )}
                        </div>
                      </div>

                      <div className="rounded-md border border-slate-200 p-3">
                        <p className="text-sm font-semibold text-slate-900 mb-2">Brigadistas que salieron</p>
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
                                  key={ci || safeText(b.id) || `${safeText(b.nombre)}-${Math.random()}`}
                                  className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-50 rounded px-2 py-1"
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggleBrigadista(vale.id, ci)}
                                    disabled={!ci}
                                  />
                                  <span className="min-w-0">
                                    <span className="font-medium text-slate-900 break-words">
                                      {safeText(b.nombre, "Trabajador")}
                                    </span>
                                    {ci ? <span className="text-slate-500 ml-2">({ci})</span> : null}
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

