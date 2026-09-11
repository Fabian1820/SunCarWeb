"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ModuleHeader } from "@/components/shared/organism/module-header";
import { Button } from "@/components/shared/atom/button";
import { Input } from "@/components/shared/atom/input";
import { Loader2, Save, RotateCcw, X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/shared/atom/alert-dialog";
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

function claveBorrador(fecha: string): string {
  return `planificacion:borrador:${fecha}`;
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
  /** Fecha a la que se quiere ir teniendo cambios sin guardar. */
  const [fechaPendiente, setFechaPendiente] = useState<string | null>(null);
  /** Borrador encontrado al abrir, a la espera de que decidan. */
  const [borrador, setBorrador] = useState<TrabajoPlanificado[] | null>(null);

  const cargarPlan = useCallback(async () => {
    setCargando(true);
    try {
      const plan = await PlanificacionService.obtener(fecha);
      const delServidor = plan.trabajos || [];
      setTrabajos(delServidor);
      setGuardado(delServidor);

      // Si quedó un borrador de ese día y dice otra cosa, se ofrece: no se
      // aplica solo, porque el del servidor puede ser el bueno.
      try {
        const crudo = localStorage.getItem(claveBorrador(fecha));
        if (crudo) {
          const guardadoLocal = JSON.parse(crudo) as TrabajoPlanificado[];
          setBorrador(
            JSON.stringify(guardadoLocal) === JSON.stringify(delServidor) ? null : guardadoLocal,
          );
        } else {
          setBorrador(null);
        }
      } catch {
        setBorrador(null);
      }
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

  /**
   * Borrador en el propio navegador.
   *
   * El aviso de "vas a salir" solo cubre cerrar o recargar la pestaña. Navegar
   * dentro de la web, que es como se pierde de verdad el trabajo, no lo
   * dispara. Guardando el borrador segun se edita se cubren los dos casos, y
   * ademas quedarse sin bateria o sin conexion.
   */
  useEffect(() => {
    if (cargando) return;
    try {
      if (haycambios) {
        localStorage.setItem(claveBorrador(fecha), JSON.stringify(trabajos));
      } else {
        localStorage.removeItem(claveBorrador(fecha));
      }
    } catch {
      // Sin almacenamiento (modo privado) se sigue: es una red de seguridad,
      // no un requisito.
    }
  }, [trabajos, haycambios, fecha, cargando]);

  // Avisa antes de cerrar con cambios sin guardar: una sesión de planificación
  // son veinte minutos de trabajo que no se pueden perder por una pestaña.
  useEffect(() => {
    if (!haycambios) return;
    const alSalir = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Chrome respeta preventDefault; Safari y los navegadores viejos miran
      // returnValue. Sin esta linea ahi no sale ningun aviso.
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", alSalir);
    return () => window.removeEventListener("beforeunload", alSalir);
  }, [haycambios]);

  /**
   * Cambiar de dia recarga y sobrescribe lo que haya en pantalla. Si hay
   * trabajo sin guardar hay que preguntar: veinte minutos de planificacion se
   * perdian por tocar la fecha para echar un vistazo a otro dia.
   */
  function pedirCambioDeFecha(nueva: string) {
    if (nueva === fecha) return;
    if (haycambios) setFechaPendiente(nueva);
    else setFecha(nueva);
  }

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
              onChange={(e) => pedirCambioDeFecha(e.target.value)}
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
        {borrador && !cargando && (
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="min-w-0 flex-1 text-sm text-amber-900">
              Quedó un borrador de este día sin guardar, con{" "}
              <strong>{borrador.length}</strong> trabajo{borrador.length === 1 ? "" : "s"}.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setTrabajos(borrador);
                setBorrador(null);
              }}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Recuperarlo
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                try {
                  localStorage.removeItem(claveBorrador(fecha));
                } catch {
                  /* sin almacenamiento no hay nada que borrar */
                }
                setBorrador(null);
              }}
            >
              <X className="mr-2 h-4 w-4" />
              Descartarlo
            </Button>
          </div>
        )}

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

      <AlertDialog
        open={fechaPendiente !== null}
        onOpenChange={(v) => !v && setFechaPendiente(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tienes cambios sin guardar</AlertDialogTitle>
            <AlertDialogDescription>
              El plan del {fecha} tiene {trabajos.length} trabajo
              {trabajos.length === 1 ? "" : "s"} que todavía no has guardado. Si cambias de
              día ahora, se pierden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel>Quedarme aquí</AlertDialogCancel>
            <Button
              variant="outline"
              onClick={() => {
                const destino = fechaPendiente!;
                setFechaPendiente(null);
                setFecha(destino);
              }}
            >
              Cambiar sin guardar
            </Button>
            <AlertDialogAction
              onClick={async () => {
                const destino = fechaPendiente!;
                setFechaPendiente(null);
                await guardar();
                setFecha(destino);
              }}
            >
              Guardar y cambiar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
