"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ModuleHeader } from "@/components/shared/organism/module-header";
import { Button } from "@/components/shared/atom/button";
import { Badge } from "@/components/shared/atom/badge";
import { Input } from "@/components/shared/atom/input";
import { Loader2, Plus, Save, Trash2, Users, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PlanificacionService } from "@/lib/services/feats/planificacion/planificacion-service";
import { BrigadaService } from "@/lib/services/feats/brigade/brigada-service";
import {
  AgregarTrabajosDialog,
  type OpcionAsignable,
} from "@/components/feats/planificacion/agregar-trabajos-dialog";
import {
  ETIQUETA_TIPO,
  type TrabajoPlanificado,
} from "@/lib/types/feats/planificacion/planificacion-types";

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
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const [brigadas, setBrigadas] = useState<OpcionAsignable[]>([]);
  const [trabajadores, setTrabajadores] = useState<OpcionAsignable[]>([]);

  const cargarPlan = useCallback(async () => {
    setCargando(true);
    try {
      const plan = await PlanificacionService.obtener(fecha);
      setTrabajos(plan.trabajos || []);
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

  // Las brigadas y sus integrantes: de ahí salen las dos listas de asignables.
  useEffect(() => {
    BrigadaService.getAllBrigadas()
      .then((datos: any[]) => {
        const bs: OpcionAsignable[] = [];
        const ts = new Map<string, OpcionAsignable>();
        for (const b of datos || []) {
          const lider = b.lider || {};
          const nombreLider = lider.nombre || lider.CI || "sin líder";
          bs.push({ tipo: "brigada", id: String(b.id ?? b._id ?? ""), nombre: nombreLider });
          for (const persona of [lider, ...(b.integrantes || [])]) {
            const ci = String(persona?.CI ?? "");
            if (ci) ts.set(ci, { tipo: "trabajador", id: ci, nombre: persona?.nombre || ci });
          }
        }
        setBrigadas(bs);
        setTrabajadores([...ts.values()].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      })
      .catch(() => {
        toast({
          title: "No se pudieron cargar las brigadas",
          description: "Sin ellas no se puede asignar ningún trabajo.",
          variant: "destructive",
        });
      });
  }, [toast]);

  // Agrupado por quien lo hace: es como se lee un plan, "mañana la brigada de
  // Daniel hace estas cuatro cosas".
  const grupos = useMemo(() => {
    const mapa = new Map<string, { nombre: string; tipo: string; trabajos: TrabajoPlanificado[] }>();
    for (const t of trabajos) {
      const clave = `${t.asignado.tipo}:${t.asignado.id}`;
      if (!mapa.has(clave)) {
        mapa.set(clave, { nombre: t.asignado.nombre, tipo: t.asignado.tipo, trabajos: [] });
      }
      mapa.get(clave)!.trabajos.push(t);
    }
    return [...mapa.values()].sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [trabajos]);

  const yaPlanificados = useMemo(
    () => new Set(trabajos.map(claveTrabajo)),
    [trabajos],
  );

  function quitar(indice: number) {
    setTrabajos((previos) => previos.filter((_, i) => i !== indice));
  }

  function cambiarNota(objetivo: TrabajoPlanificado, nota: string) {
    setTrabajos((previos) =>
      previos.map((t) => (t === objetivo ? { ...t, nota } : t)),
    );
  }

  async function guardar() {
    setGuardando(true);
    try {
      const plan = await PlanificacionService.guardar(fecha, trabajos);
      setTrabajos(plan.trabajos || []);
      toast({ title: "Plan guardado", description: `${plan.trabajos?.length ?? 0} trabajos para el ${fecha}.` });
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
          <Button onClick={guardar} disabled={guardando || cargando}>
            {guardando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Guardar plan
          </Button>
        }
      />

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        <div className="flex flex-wrap items-end justify-between gap-4 rounded-lg border bg-white p-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Día que se planifica</label>
            <Input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-48"
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              {trabajos.length === 0
                ? "Sin trabajos todavía"
                : `${trabajos.length} trabajo${trabajos.length === 1 ? "" : "s"}`}
            </span>
            <Button variant="outline" onClick={() => setAbierto(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Añadir trabajos
            </Button>
          </div>
        </div>

        {cargando ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando el plan…
          </div>
        ) : grupos.length === 0 ? (
          <div className="rounded-lg border bg-white py-16 text-center">
            <p className="font-medium text-gray-900">Este día no tiene nada planificado</p>
            <p className="mt-1 text-sm text-gray-500">
              Añade trabajos y asígnalos a una brigada o a un trabajador.
            </p>
          </div>
        ) : (
          grupos.map((grupo) => (
            <section key={`${grupo.tipo}:${grupo.nombre}`} className="overflow-hidden rounded-lg border bg-white">
              <header className="flex items-center gap-2 border-b bg-gray-50 px-4 py-3">
                {grupo.tipo === "brigada" ? (
                  <Users className="h-4 w-4 text-gray-500" />
                ) : (
                  <User className="h-4 w-4 text-gray-500" />
                )}
                <h2 className="font-semibold text-gray-900">{grupo.nombre}</h2>
                <Badge variant="secondary">{grupo.trabajos.length}</Badge>
              </header>
              <ul className="divide-y">
                {grupo.trabajos.map((t) => (
                  <li key={`${claveTrabajo(t)}-${t.id}`} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <Badge variant="outline" className="shrink-0">
                      {ETIQUETA_TIPO[t.tipo]}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-gray-900">{t.nombre || "Sin nombre"}</p>
                      <p className="truncate text-xs text-gray-500">{t.direccion || "Sin dirección"}</p>
                    </div>
                    {t.estado !== "planificado" && (
                      <Badge variant={t.estado === "cumplido" ? "default" : "destructive"}>
                        {t.estado === "cumplido" ? "Cumplido" : "No realizado"}
                      </Badge>
                    )}
                    <Input
                      value={t.nota ?? ""}
                      onChange={(e) => cambiarNota(t, e.target.value)}
                      placeholder="Nota"
                      className="h-8 w-full sm:w-56"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => quitar(trabajos.indexOf(t))}
                      aria-label="Quitar del plan"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </main>

      <AgregarTrabajosDialog
        abierto={abierto}
        onCerrar={() => setAbierto(false)}
        brigadas={brigadas}
        trabajadores={trabajadores}
        yaPlanificados={yaPlanificados}
        onAgregar={(nuevos) => setTrabajos((previos) => [...previos, ...nuevos])}
      />
    </div>
  );
}
