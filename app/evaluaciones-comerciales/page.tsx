"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RouteGuard } from "@/components/auth/route-guard";
import { ModuleHeader } from "@/components/shared/organism/module-header";
import { Button } from "@/components/shared/atom/button";
import { Input } from "@/components/shared/atom/input";
import { Label } from "@/components/shared/atom/label";
import { Textarea } from "@/components/shared/molecule/textarea";
import { Badge } from "@/components/shared/atom/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/shared/molecule/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/shared/molecule/tabs";
import { Toaster } from "@/components/shared/molecule/toaster";
import { useToast } from "@/hooks/use-toast";
import {
  FileDown,
  Loader2,
  MessageSquare,
  FileText,
  ClipboardCheck,
  PenSquare,
} from "lucide-react";
import { EvaluacionesComercialesService } from "@/lib/services/feats/evaluaciones-comerciales/evaluaciones-comerciales-service";
import { generarEvaluacionPdf } from "@/lib/services/feats/evaluaciones-comerciales/export-evaluacion-pdf-service";
import type {
  AlcanceEvaluaciones,
  ComercialAlcance,
  CriteriosActitud,
  CriteriosDocumentacion,
  EvaluacionComercial,
  OfertasDatos,
  WhatsappDatos,
} from "@/lib/types/feats/evaluaciones-comerciales/evaluaciones-comerciales-types";

function primerYUltimoDiaDeMes(mesInput: string) {
  if (!mesInput) return null;
  const [anioStr, mesStr] = mesInput.split("-");
  const anio = Number(anioStr);
  const mes = Number(mesStr);
  if (!anio || !mes) return null;
  const desde = `${anioStr}-${mesStr}-01`;
  const ultimo = new Date(anio, mes, 0).getDate();
  const hasta = `${anioStr}-${mesStr}-${String(ultimo).padStart(2, "0")}`;
  return { desde, hasta };
}

function EvaluacionesContent() {
  const { toast } = useToast();
  const [alcance, setAlcance] = useState<AlcanceEvaluaciones | null>(null);
  const [mes, setMes] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [comercialCi, setComercialCi] = useState<string>("");
  const [evaluacion, setEvaluacion] = useState<EvaluacionComercial | null>(null);
  const [whatsapp, setWhatsapp] = useState<WhatsappDatos | null>(null);
  const [ofertas, setOfertas] = useState<OfertasDatos | null>(null);
  const [actitud, setActitud] = useState<CriteriosActitud>({});
  const [documentacion, setDocumentacion] = useState<CriteriosDocumentacion>({});
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const rango = useMemo(() => primerYUltimoDiaDeMes(mes), [mes]);

  useEffect(() => {
    (async () => {
      try {
        const a = await EvaluacionesComercialesService.alcance();
        setAlcance(a);
        if (a.comerciales.length > 0) setComercialCi(a.comerciales[0].CI);
      } catch (e) {
        console.error(e);
        toast({
          title: "Error",
          description: "No se pudo cargar el alcance de evaluaciones.",
          variant: "destructive",
        });
      }
    })();
  }, [toast]);

  const cargarDatos = useCallback(async () => {
    if (!comercialCi || !rango) return;
    setCargando(true);
    try {
      const [lista, w, o] = await Promise.all([
        EvaluacionesComercialesService.listar({ comercialCi }),
        EvaluacionesComercialesService.whatsapp(
          comercialCi,
          rango.desde,
          rango.hasta,
        ),
        EvaluacionesComercialesService.ofertas(
          comercialCi,
          rango.desde,
          rango.hasta,
        ),
      ]);

      const existente = (lista.evaluaciones || []).find(
        (ev) =>
          ev.periodo_inicio.slice(0, 10) === rango.desde &&
          ev.periodo_fin.slice(0, 10) === rango.hasta,
      );

      setEvaluacion(existente ?? null);
      setActitud(existente?.actitud ?? {});
      setDocumentacion(existente?.documentacion ?? {});
      setWhatsapp(w);
      setOfertas(o);
    } catch (e) {
      console.error(e);
      toast({
        title: "Error al cargar",
        description: e instanceof Error ? e.message : "Intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setCargando(false);
    }
  }, [comercialCi, rango, toast]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const puedoEvaluar = useMemo(() => {
    if (!alcance) return false;
    return alcance.rol !== "comercial";
  }, [alcance]);

  const puedoEditar = puedoEvaluar && !evaluacion?.firmada;

  const guardar = async (firmar: boolean) => {
    if (!comercialCi || !rango) return;
    setGuardando(true);
    try {
      let ev = evaluacion;
      if (!ev) {
        const res = await EvaluacionesComercialesService.crear({
          comercial_ci: comercialCi,
          periodo_inicio: `${rango.desde}T00:00:00Z`,
          periodo_fin: `${rango.hasta}T23:59:59Z`,
          actitud,
          documentacion,
        });
        ev = res.evaluacion;
      } else if (!ev.firmada) {
        const res = await EvaluacionesComercialesService.actualizar(ev.id, {
          actitud,
          documentacion,
        });
        ev = res.evaluacion;
      }
      if (firmar && ev && !ev.firmada) {
        const res = await EvaluacionesComercialesService.firmar(ev.id);
        ev = res.evaluacion;
      }
      setEvaluacion(ev);
      toast({
        title: firmar ? "Evaluación firmada" : "Evaluación guardada",
        description: firmar
          ? "Ya puedes descargar el PDF."
          : "Los cambios quedaron guardados.",
      });
    } catch (e) {
      console.error(e);
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setGuardando(false);
    }
  };

  const descargarPdf = () => {
    if (!evaluacion) {
      toast({
        title: "Guarda primero",
        description: "Debes guardar la evaluación antes de exportarla.",
        variant: "destructive",
      });
      return;
    }
    generarEvaluacionPdf(evaluacion, whatsapp, ofertas);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f4f9f6] via-white to-[#e8f4ee]">
      <ModuleHeader
        title="Evaluaciones de Comercial"
        subtitle="WhatsApp, ofertas y actitud/documentación por comercial y periodo."
      />
      <main className="content-with-fixed-header max-w-[80rem] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Selecciona periodo y comercial</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div className="space-y-1.5">
              <Label htmlFor="mes">Mes evaluado</Label>
              <Input
                id="mes"
                type="month"
                value={mes}
                onChange={(e) => setMes(e.target.value)}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Comercial</Label>
              <Select value={comercialCi} onValueChange={setComercialCi}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un comercial" />
                </SelectTrigger>
                <SelectContent>
                  {(alcance?.comerciales ?? []).map((c: ComercialAlcance) => (
                    <SelectItem key={c.CI} value={c.CI}>
                      {c.nombre} — {c.cargo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {cargando ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-700" />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                Rol: {alcance?.rol ?? "—"}
              </Badge>
              {evaluacion?.firmada ? (
                <Badge className="bg-slate-800 text-white">
                  Firmada por {evaluacion.firmada_por_nombre ?? "—"}
                </Badge>
              ) : (
                <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                  {evaluacion ? "Borrador — no firmada" : "Sin evaluación en este mes"}
                </Badge>
              )}
            </div>

            <Tabs defaultValue="whatsapp" className="space-y-4">
              <TabsList>
                <TabsTrigger value="whatsapp">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  WhatsApp
                </TabsTrigger>
                <TabsTrigger value="ofertas">
                  <FileText className="h-4 w-4 mr-2" />
                  Ofertas
                </TabsTrigger>
                <TabsTrigger value="actitud">
                  <ClipboardCheck className="h-4 w-4 mr-2" />
                  Actitud y Documentación
                </TabsTrigger>
              </TabsList>

              <TabsContent value="whatsapp">
                <TabWhatsapp datos={whatsapp} />
              </TabsContent>

              <TabsContent value="ofertas">
                <TabOfertas datos={ofertas} />
              </TabsContent>

              <TabsContent value="actitud">
                <TabActitudDocumentacion
                  actitud={actitud}
                  documentacion={documentacion}
                  setActitud={setActitud}
                  setDocumentacion={setDocumentacion}
                  bloqueado={!puedoEditar}
                />
              </TabsContent>
            </Tabs>

            <div className="flex flex-wrap gap-2 justify-end">
              {puedoEditar && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => guardar(false)}
                    disabled={guardando}
                  >
                    {guardando ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <PenSquare className="h-4 w-4 mr-2" />
                    )}
                    Guardar borrador
                  </Button>
                  <Button onClick={() => guardar(true)} disabled={guardando}>
                    {guardando ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <ClipboardCheck className="h-4 w-4 mr-2" />
                    )}
                    Firmar evaluación
                  </Button>
                </>
              )}
              <Button
                variant="outline"
                onClick={descargarPdf}
                disabled={!evaluacion}
              >
                <FileDown className="h-4 w-4 mr-2" />
                Exportar PDF
              </Button>
            </div>
          </>
        )}
        <Toaster />
      </main>
    </div>
  );
}

function fmtDuracion(seg?: number | null): string {
  if (seg == null) return "—";
  const min = Math.floor(seg / 60);
  const s = seg % 60;
  if (min < 60) return `${min}m ${s}s`;
  const h = Math.floor(min / 60);
  return `${h}h ${min % 60}m`;
}

function fmtMoney(n: number): string {
  return `$${n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function TabWhatsapp({ datos }: { datos: WhatsappDatos | null }) {
  if (!datos || !datos.disponible || !datos.datos) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-muted-foreground">
          {datos?.razon ?? "Sin datos de WhatsApp en este periodo."}
        </CardContent>
      </Card>
    );
  }
  const r = datos.datos.resumen_conversaciones;
  const csat = datos.datos.csat_resumen;
  const respuestas = datos.datos.csat_respuestas || [];
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-muted-foreground">
            Agente en Chatwoot: <b>{datos.datos.agente.nombre}</b>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <Mini label="Abiertas" val={r?.conversaciones_abiertas} />
          <Mini label="Sin atender" val={r?.conversaciones_sin_atender} />
          <Mini label="Resueltas" val={r?.resueltas} />
          <Mini
            label="1ra respuesta"
            val={fmtDuracion(r?.tiempo_primera_respuesta_seg)}
            raw
          />
          <Mini
            label="Resolución"
            val={fmtDuracion(r?.tiempo_resolucion_seg)}
            raw
          />
          <Mini label="CSAT respuestas" val={csat?.total_respuestas} />
          <Mini
            label="CSAT %"
            val={csat?.csat_pct != null ? `${csat.csat_pct}%` : "—"}
            raw
          />
          <Mini label="Rating prom." val={csat?.promedio_rating} />
        </CardContent>
      </Card>

      {respuestas.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">
              Feedback de clientes ({respuestas.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {respuestas.map((r, i) => (
              <div
                key={i}
                className="border rounded-md p-3 text-sm space-y-1 bg-muted/30"
              >
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{r.contact_nombre ?? "—"}</span>
                  <span>·</span>
                  <span>{r.fecha ? new Date(r.fecha).toLocaleDateString("es-ES") : "—"}</span>
                  {r.rating != null && (
                    <Badge className="ml-auto bg-amber-100 text-amber-800 border-amber-200">
                      Rating {r.rating}
                    </Badge>
                  )}
                </div>
                {r.feedback && <p>{r.feedback}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TabOfertas({ datos }: { datos: OfertasDatos | null }) {
  if (!datos) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-muted-foreground">
          Sin datos.
        </CardContent>
      </Card>
    );
  }
  if (datos.razon) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-muted-foreground">
          {datos.razon}
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-6 text-sm">
        <Mini label="Ofertas creadas" val={datos.creadas} />
        <Mini label="Confirmadas sin pagos" val={datos.confirmadas_sin_pagos} />
        <Mini
          label="Confirmadas con anticipo"
          val={datos.confirmadas_con_anticipo}
        />
        <Mini label="Obras terminadas" val={datos.obras_terminadas} />
        <Mini label="Monto vendido" val={fmtMoney(datos.monto_vendido)} raw />
        <Mini label="Monto cobrado" val={fmtMoney(datos.monto_cobrado)} raw />
      </CardContent>
    </Card>
  );
}

function Mini({
  label,
  val,
  raw = false,
}: {
  label: string;
  val?: number | string | null;
  raw?: boolean;
}) {
  return (
    <div className="space-y-1">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold text-emerald-900">
        {val == null || val === "" ? "—" : raw ? val : String(val)}
      </div>
    </div>
  );
}

function TabActitudDocumentacion({
  actitud,
  documentacion,
  setActitud,
  setDocumentacion,
  bloqueado,
}: {
  actitud: CriteriosActitud;
  documentacion: CriteriosDocumentacion;
  setActitud: (v: CriteriosActitud) => void;
  setDocumentacion: (v: CriteriosDocumentacion) => void;
  bloqueado: boolean;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Actitud y disposición</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <NotaField
            label="Trato al cliente"
            val={actitud.trato_al_cliente ?? null}
            onChange={(v) => setActitud({ ...actitud, trato_al_cliente: v })}
            disabled={bloqueado}
          />
          <NotaField
            label="Trato a los compañeros"
            val={actitud.trato_a_companeros ?? null}
            onChange={(v) => setActitud({ ...actitud, trato_a_companeros: v })}
            disabled={bloqueado}
          />
          <NotaField
            label="Disposición para hacer tareas"
            val={actitud.disposicion_para_tareas ?? null}
            onChange={(v) =>
              setActitud({ ...actitud, disposicion_para_tareas: v })
            }
            disabled={bloqueado}
          />
          <NotaField
            label="Colaboración"
            val={actitud.colaboracion ?? null}
            onChange={(v) => setActitud({ ...actitud, colaboracion: v })}
            disabled={bloqueado}
          />
          <div className="space-y-1">
            <Label>Observaciones</Label>
            <Textarea
              rows={3}
              value={actitud.observaciones ?? ""}
              onChange={(e) =>
                setActitud({ ...actitud, observaciones: e.target.value })
              }
              disabled={bloqueado}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Documentación</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <NotaField
            label="Manejo de contratos"
            val={documentacion.manejo_de_contratos ?? null}
            onChange={(v) =>
              setDocumentacion({ ...documentacion, manejo_de_contratos: v })
            }
            disabled={bloqueado}
          />
          <NotaField
            label="Calidad de información en el sistema"
            val={documentacion.calidad_informacion_sistema ?? null}
            onChange={(v) =>
              setDocumentacion({
                ...documentacion,
                calidad_informacion_sistema: v,
              })
            }
            disabled={bloqueado}
          />
          <NotaField
            label="Cumplimiento de procedimientos"
            val={documentacion.cumplimiento_de_procedimientos ?? null}
            onChange={(v) =>
              setDocumentacion({
                ...documentacion,
                cumplimiento_de_procedimientos: v,
              })
            }
            disabled={bloqueado}
          />
          <div className="space-y-1">
            <Label>Observaciones</Label>
            <Textarea
              rows={3}
              value={documentacion.observaciones ?? ""}
              onChange={(e) =>
                setDocumentacion({
                  ...documentacion,
                  observaciones: e.target.value,
                })
              }
              disabled={bloqueado}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function NotaField({
  label,
  val,
  onChange,
  disabled,
}: {
  label: string;
  val: number | null;
  onChange: (v: number | null) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label className="text-sm text-muted-foreground flex-1">{label}</Label>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            disabled={disabled}
            onClick={() => onChange(val === n ? null : n)}
            className={`w-8 h-8 rounded-md text-sm font-semibold border transition ${
              val === n
                ? "bg-emerald-600 text-white border-emerald-700"
                : "bg-white text-emerald-800 border-emerald-200 hover:bg-emerald-50"
            } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function EvaluacionesComercialesPage() {
  return (
    <RouteGuard requiredModule="reportes-comercial">
      <EvaluacionesContent />
    </RouteGuard>
  );
}
