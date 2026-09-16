"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Ban,
  ClipboardList,
  Download,
  Eye,
  FileText,
  Loader2,
  Pencil,
  Plus,
  Send,
} from "lucide-react";
import { RouteGuard } from "@/components/auth/route-guard";
import { ModuleHeader } from "@/components/shared/organism/module-header";
import { Button } from "@/components/shared/atom/button";
import { Card, CardContent } from "@/components/shared/molecule/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select";
import { Toaster } from "@/components/shared/molecule/toaster";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { usePresupuestosLogistica } from "@/hooks/use-presupuestos-logistica";
import { SedeService } from "@/lib/api-services";
import type { Sede } from "@/lib/types/feats/sedes/sede-types";
import { PresupuestoEditorDialog } from "@/components/feats/presupuesto-logistica/presupuesto-editor-dialog";
import { PresupuestoRevisionDialog } from "@/components/feats/presupuesto-logistica/presupuesto-revision-dialog";
import { PresupuestoEstadoBadge } from "@/components/feats/presupuesto-logistica/presupuesto-estado-badge";
import { TablaTotales } from "@/components/feats/presupuesto-logistica/tabla-totales";
import { exportarPresupuestoPDF } from "@/lib/services/feats/presupuesto-logistica/export-presupuesto-service";
import type {
  EstadoPresupuesto,
  PresupuestoLogistica,
} from "@/lib/types/feats/presupuesto-logistica/presupuesto-logistica-types";
import { nombreMes } from "@/lib/types/feats/presupuesto-logistica/presupuesto-logistica-types";

const MODULO = "logistica/presupuesto";
const MODULO_APROBAR = "logistica/presupuesto/aprobar";

export default function PresupuestoLogisticaPage() {
  return (
    <RouteGuard requiredModule={MODULO}>
      <Contenido />
    </RouteGuard>
  );
}

function Contenido() {
  const { toast } = useToast();
  const { user, hasExactPermission } = useAuth();
  const {
    presupuestos,
    sugerencias,
    loading,
    saving,
    error,
    anioFilter,
    setAnioFilter,
    estadoFilter,
    setEstadoFilter,
    crear,
    actualizar,
    enviar,
    revisar,
    resolver,
    anular,
  } = usePresupuestosLogistica();

  const [sedes, setSedes] = useState<Sede[]>([]);
  const [editorAbierto, setEditorAbierto] = useState(false);
  const [enEdicion, setEnEdicion] = useState<PresupuestoLogistica | null>(null);
  const [revisionAbierta, setRevisionAbierta] = useState(false);
  const [enRevision, setEnRevision] = useState<PresupuestoLogistica | null>(null);
  const [expandido, setExpandido] = useState<string | null>(null);

  // Herencia padre->hijo: `hasPermission` daría true al que solo tiene crear.
  // Aquí hace falta la pertenencia exacta.
  const puedeAprobar = hasExactPermission(MODULO_APROBAR);

  useEffect(() => {
    SedeService.getSedes(true)
      .then(setSedes)
      // Sin sedes el módulo sigue usable: los bloques admiten nombre libre.
      .catch(() => setSedes([]));
  }, []);

  useEffect(() => {
    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" });
    }
  }, [error, toast]);

  const anios = useMemo(() => {
    const actual = new Date().getFullYear();
    return [actual + 1, actual, actual - 1, actual - 2];
  }, []);

  const agrupados = useMemo(() => {
    const mapa = new Map<string, PresupuestoLogistica[]>();
    for (const p of presupuestos) {
      const k = `${p.anio}-${String(p.mes).padStart(2, "0")}`;
      mapa.set(k, [...(mapa.get(k) ?? []), p]);
    }
    return [...mapa.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([k, lista]) => ({
        clave: k,
        etiqueta: `${nombreMes(Number(k.slice(5)))} ${k.slice(0, 4)}`,
        // El ordinario primero; los extraordinarios cuelgan debajo.
        lista: lista.sort((a, b) =>
          a.tipo === b.tipo ? a.numero.localeCompare(b.numero) : a.tipo === "ordinario" ? -1 : 1,
        ),
      }));
  }, [presupuestos]);

  const exportar = async (presupuesto: PresupuestoLogistica) => {
    try {
      await exportarPresupuestoPDF(presupuesto, user?.nombre ?? "");
      toast({ title: "PDF generado", description: presupuesto.numero });
    } catch (e) {
      toast({
        title: "No se pudo exportar",
        description: e instanceof Error ? e.message : "Error desconocido",
        variant: "destructive",
      });
    }
  };

  const confirmarEnvio = async (presupuesto: PresupuestoLogistica) => {
    try {
      await enviar(presupuesto.id);
      toast({
        title: "Enviado a aprobación",
        description: `${presupuesto.numero} queda bloqueado hasta que lo revisen.`,
      });
    } catch {
      /* el toast de error lo dispara el efecto de `error` */
    }
  };

  const confirmarAnulacion = async (presupuesto: PresupuestoLogistica) => {
    const motivo = window.prompt(`Motivo para anular ${presupuesto.numero}:`);
    if (!motivo?.trim()) return;
    try {
      await anular(presupuesto.id, motivo.trim());
      toast({ title: "Presupuesto anulado", description: presupuesto.numero });
    } catch {
      /* idem */
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f4f9f6] via-white to-[#e8f4ee]">
      <ModuleHeader
        title="Presupuesto de Logística"
        subtitle="Planificación mensual de Logística, Transporte y Seguridad Interna"
        actions={
          <Button onClick={() => { setEnEdicion(null); setEditorAbierto(true); }}>
            <Plus className="mr-1 h-4 w-4" /> Nuevo presupuesto
          </Button>
        }
      />

      <div className="mx-auto max-w-7xl space-y-4 px-4 py-6">
        <div className="flex flex-wrap gap-3">
          <Select
            value={String(anioFilter)}
            onValueChange={(v) => setAnioFilter(v === "todos" ? "todos" : Number(v))}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los años</SelectItem>
              {anios.map((a) => (
                <SelectItem key={a} value={String(a)}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={estadoFilter}
            onValueChange={(v) => setEstadoFilter(v as EstadoPresupuesto | "todos")}
          >
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los estados</SelectItem>
              <SelectItem value="borrador">Borrador</SelectItem>
              <SelectItem value="enviada">Enviado a aprobación</SelectItem>
              <SelectItem value="devuelta">Devuelto para ajuste</SelectItem>
              <SelectItem value="aprobada">Aprobado</SelectItem>
              <SelectItem value="anulada">Anulado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando presupuestos…
          </div>
        ) : agrupados.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-16 text-slate-500">
              <ClipboardList className="h-10 w-10 text-slate-300" />
              <p>No hay presupuestos para este filtro.</p>
            </CardContent>
          </Card>
        ) : (
          agrupados.map((grupo) => (
            <div key={grupo.clave} className="space-y-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                {grupo.etiqueta}
              </h3>

              {grupo.lista.map((p) => {
                const abierto = expandido === p.id;
                return (
                  <Card key={p.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <FileText className="h-5 w-5 text-emerald-600" />
                        <div className="min-w-[180px] flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-slate-800">
                              {p.numero}
                            </span>
                            {p.tipo === "extraordinario" && (
                              <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[11px] font-medium text-sky-800">
                                Extraordinario
                              </span>
                            )}
                            <PresupuestoEstadoBadge estado={p.estado} />
                            {p.ronda > 1 && (
                              <span className="text-xs text-slate-400">
                                ronda {p.ronda}
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {p.confeccionado_por_nombre ?? "—"}
                            {p.confeccionado_por_cargo
                              ? ` · ${p.confeccionado_por_cargo}`
                              : ""}
                            {" · "}
                            {p.totales.por_sede.length} bloques ·{" "}
                            {p.revision.total} ítems
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-lg font-bold tabular-nums text-emerald-700">
                            {p.totales.total_general_usd.toLocaleString("es-ES", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}{" "}
                            USD
                          </p>
                          <p className="text-[11px] text-slate-400">
                            tasa {p.tasa_cup_por_usd} CUP/USD
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setExpandido(abierto ? null : p.id)}
                          >
                            <Eye className="mr-1 h-3.5 w-3.5" />
                            {abierto ? "Ocultar" : "Totales"}
                          </Button>

                          <Button variant="outline" size="sm" onClick={() => exportar(p)}>
                            <Download className="mr-1 h-3.5 w-3.5" /> PDF
                          </Button>

                          {p.editable && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEnEdicion(p);
                                  setEditorAbierto(true);
                                }}
                              >
                                <Pencil className="mr-1 h-3.5 w-3.5" /> Editar
                              </Button>
                              <Button
                                size="sm"
                                disabled={saving}
                                onClick={() => confirmarEnvio(p)}
                              >
                                <Send className="mr-1 h-3.5 w-3.5" /> Enviar
                              </Button>
                            </>
                          )}

                          {p.estado === "enviada" && puedeAprobar && (
                            <Button
                              size="sm"
                              className="bg-amber-600 hover:bg-amber-700"
                              onClick={() => {
                                setEnRevision(p);
                                setRevisionAbierta(true);
                              }}
                            >
                              <ClipboardList className="mr-1 h-3.5 w-3.5" /> Revisar
                            </Button>
                          )}

                          {(p.estado === "borrador" || p.estado === "enviada") && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-rose-600 hover:bg-rose-50"
                              onClick={() => confirmarAnulacion(p)}
                            >
                              <Ban className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {p.estado === "devuelta" && (
                        <div className="mt-3 flex items-start gap-2 rounded-lg border border-orange-200 bg-orange-50 p-2.5 text-sm text-orange-900">
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                          <span>
                            Devuelto con {p.revision.rechazados} ítems rechazados.
                            {p.comentario_devolucion
                              ? ` "${p.comentario_devolucion}"`
                              : ""}{" "}
                            Los {p.revision.aprobados} ya aprobados siguen aprobados
                            mientras no los cambies.
                          </span>
                        </div>
                      )}

                      {abierto && (
                        <div className="mt-4">
                          <TablaTotales totales={p.totales} />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ))
        )}
      </div>

      <PresupuestoEditorDialog
        abierto={editorAbierto}
        onCerrar={() => setEditorAbierto(false)}
        presupuesto={enEdicion}
        sedes={sedes}
        sugerencias={sugerencias}
        guardando={saving}
        onCrear={crear}
        onActualizar={actualizar}
      />

      <PresupuestoRevisionDialog
        abierto={revisionAbierta}
        onCerrar={() => setRevisionAbierta(false)}
        presupuesto={enRevision}
        guardando={saving}
        onRevisar={revisar}
        onResolver={resolver}
      />

      <Toaster />
    </div>
  );
}
