"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ModuleHeader } from "@/components/shared/organism/module-header";
import { Button } from "@/components/shared/atom/button";
import { Input } from "@/components/shared/atom/input";
import { Loader2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PlanificacionService } from "@/lib/services/feats/planificacion/planificacion-service";
import { BrigadaService } from "@/lib/services/feats/brigade/brigada-service";
import {
  PanelCandidatos,
  type OpcionAsignable,
} from "@/components/feats/planificacion/panel-candidatos";
import { PanelPlan } from "@/components/feats/planificacion/panel-plan";
import type { TrabajoPlanificado } from "@/lib/types/feats/planificacion/planificacion-types";

/** Mañana: es el día que se planifica cuando uno se sienta a hacerlo. */
function manana(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function claveTrabajo(t: TrabajoPlanificado): string {
  const entidad = t.lead_id ? `lead:${t.lead_id}` : `cliente:${t.cliente_numero}`;
  return `${t.tipo}|${entidad}`;
}

export default function PlanificacionPage() {
  const { toast } = useToast();
  const [fecha, setFecha] = useState(manana);
  const [trabajos, setTrabajos] = useState<TrabajoPlanificado[]>([]);
  const [guardado, setGuardado] = useState<TrabajoPlanificado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [brigadas, setBrigadas] = useState<OpcionAsignable[]>([]);
  const [trabajadores, setTrabajadores] = useState<OpcionAsignable[]>([]);

  const cargarPlan = useCallback(async () => {
    setCargando(true);
    try {
      const plan = await PlanificacionService.obtener(fecha);
      setTrabajos(plan.trabajos || []);
      setGuardado(plan.trabajos || []);
    } catch {
      toast({
        title: "No se pudo cargar el plan",
        description: "Revisa la conexión e inténtalo otra vez.",
        variant: "destructive",
      });
    } finally {
      setCargando(false);
    }
  }, [fecha, toast]);

  useEffect(() => {
    void cargarPlan();
  }, [cargarPlan]);

  // Brigadas e integrantes: de ahí salen las dos listas de asignables.
  useEffect(() => {
    BrigadaService.getAllBrigadas()
      .then((datos: any[]) => {
        const bs: OpcionAsignable[] = [];
        const ts = new Map<string, OpcionAsignable>();
        for (const b of datos || []) {
          const lider = b.lider || {};
          bs.push({
            tipo: "brigada",
            id: String(b.id ?? b._id ?? ""),
            nombre: lider.nombre || lider.CI || "sin líder",
          });
          for (const persona of [lider, ...(b.integrantes || [])]) {
            const ci = String(persona?.CI ?? "");
            if (ci) ts.set(ci, { tipo: "trabajador", id: ci, nombre: persona?.nombre || ci });
          }
        }
        setBrigadas(bs);
        setTrabajadores([...ts.values()].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      })
      .catch(() =>
        toast({
          title: "No se pudieron cargar las brigadas",
          description: "Sin ellas no se puede asignar ningún trabajo.",
          variant: "destructive",
        }),
      );
  }, [toast]);

  const yaPlanificados = useMemo(
    () => new Set(trabajos.map(claveTrabajo)),
    [trabajos],
  );

  const haycambios = useMemo(
    () => JSON.stringify(trabajos) !== JSON.stringify(guardado),
    [trabajos, guardado],
  );

  // Avisa antes de cerrar con cambios sin guardar: una sesión de planificación
  // son veinte minutos de trabajo que no se pueden perder por una pestaña.
  useEffect(() => {
    if (!haycambios) return;
    const alSalir = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", alSalir);
    return () => window.removeEventListener("beforeunload", alSalir);
  }, [haycambios]);

  async function guardar() {
    setGuardando(true);
    try {
      const plan = await PlanificacionService.guardar(fecha, trabajos);
      setTrabajos(plan.trabajos || []);
      setGuardado(plan.trabajos || []);
      toast({
        title: "Plan guardado",
        description: `${plan.trabajos?.length ?? 0} trabajos para el ${fecha}.`,
      });
    } catch (e) {
      toast({
        title: "No se pudo guardar",
        description: e instanceof Error ? e.message : "Inténtalo otra vez.",
        variant: "destructive",
      });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ModuleHeader
        title="Planificación"
        subtitle="Qué hace cada brigada cada día"
        actions={
          <div className="flex items-center gap-3">
            <Input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-40"
              aria-label="Día que se planifica"
            />
            <Button onClick={guardar} disabled={guardando || cargando || !haycambios}>
              {guardando ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {haycambios ? "Guardar plan" : "Guardado"}
            </Button>
          </div>
        }
      />

      <main className="content-with-fixed-header mx-auto max-w-[1800px] px-4 pb-10 sm:px-6 lg:px-8">
        {cargando ? (
          <div className="flex items-center justify-center gap-2 py-24 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando el plan…
          </div>
        ) : (
          // Dos lados a la vez: lo disponible y lo asignado. Planificar es
          // mirar los dos, no abrir una ventana cada vez.
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <PanelCandidatos
              brigadas={brigadas}
              trabajadores={trabajadores}
              yaPlanificados={yaPlanificados}
              onAgregar={(nuevos) => setTrabajos((previos) => [...previos, ...nuevos])}
            />

            <div className="lg:sticky lg:top-[calc(var(--content-with-fixed-header-padding,144px))]">
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Plan del día</h2>
                <span className="text-sm text-gray-500">
                  {trabajos.length === 0
                    ? "sin trabajos"
                    : `${trabajos.length} trabajo${trabajos.length === 1 ? "" : "s"}`}
                </span>
              </div>
              <PanelPlan
                trabajos={trabajos}
                onQuitar={(t) => setTrabajos((previos) => previos.filter((x) => x !== t))}
                onCambiarNota={(t, nota) =>
                  setTrabajos((previos) => previos.map((x) => (x === t ? { ...x, nota } : x)))
                }
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
