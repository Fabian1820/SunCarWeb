"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, Loader2, Megaphone, Plus, Trash2 } from "lucide-react";

import { RouteGuard } from "@/components/auth/route-guard";
import { ModuleHeader } from "@/components/shared/organism/module-header";
import { Badge } from "@/components/shared/atom/badge";
import { Button } from "@/components/shared/atom/button";
import { Toaster } from "@/components/shared/molecule/toaster";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { ActualizacionesSistemaService } from "@/lib/services/feats/actualizaciones-sistema/actualizaciones-sistema-service";
import {
  CLASE_CATEGORIA,
  ETIQUETA_CATEGORIA,
  type ActualizacionSistema,
  type ActualizacionSistemaCreateData,
} from "@/lib/types/feats/actualizaciones-sistema/actualizaciones-sistema-types";
import { PublicarActualizacionDialog } from "@/components/feats/dashboard/publicar-actualizacion-dialog";
import { NotificarTrabajadoresDialog } from "@/components/feats/dashboard/notificar-trabajadores-dialog";

/** Cuántos días de historial se piden de una vez. Cubre de sobra el uso
 * real ("ir viendo el trabajo diario"); si algún día hace falta más, esto
 * es lo único que habría que subir (el backend acepta hasta 3650). */
const DIAS_HISTORIAL = 180;

function fechaLegible(fechaStr: string): string {
  const d = new Date(fechaStr);
  const hoy = new Date();
  const ayer = new Date();
  ayer.setDate(hoy.getDate() - 1);
  const mismoDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (mismoDay(d, hoy)) return "Hoy";
  if (mismoDay(d, ayer)) return "Ayer";
  return d.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function horaCorta(fechaStr: string): string {
  try {
    return new Date(fechaStr).toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

/** Clave de agrupación estable (fecha calendario, no timestamp) para que
 * todas las de un mismo día caigan en el mismo grupo aunque no sean "hoy". */
function claveDia(fechaStr: string): string {
  const d = new Date(fechaStr);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function ActualizacionesSistemaPageContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const esSuperAdmin = Boolean(user?.is_superAdmin);

  const [actualizaciones, setActualizaciones] = useState<ActualizacionSistema[]>(
    [],
  );
  const [cargando, setCargando] = useState(true);
  const [publicarAbierto, setPublicarAbierto] = useState(false);
  const [notificarAbierto, setNotificarAbierto] = useState(false);
  const [actualizacionParaNotificar, setActualizacionParaNotificar] =
    useState<ActualizacionSistema | null>(null);
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setActualizaciones(
        await ActualizacionesSistemaService.listarRecientes(DIAS_HISTORIAL),
      );
    } catch (error) {
      toast({
        title: "No se pudo cargar el historial",
        description:
          error instanceof Error ? error.message : "Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setCargando(false);
    }
  }, [toast]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const handlePublicar = async (
    data: ActualizacionSistemaCreateData,
  ): Promise<boolean> => {
    try {
      await ActualizacionesSistemaService.crear(data);
      toast({ title: "Actualización publicada" });
      await cargar();
      return true;
    } catch (error) {
      toast({
        title: "No se pudo publicar",
        description:
          error instanceof Error ? error.message : "Inténtalo de nuevo.",
        variant: "destructive",
      });
      return false;
    }
  };

  const handleEliminar = async (actualizacion: ActualizacionSistema) => {
    if (
      !window.confirm(
        `¿Eliminar "${actualizacion.titulo}"? No se puede deshacer.`,
      )
    )
      return;
    setEliminandoId(actualizacion.id);
    try {
      await ActualizacionesSistemaService.eliminar(actualizacion.id);
      setActualizaciones((prev) =>
        prev.filter((a) => a.id !== actualizacion.id),
      );
    } catch (error) {
      toast({
        title: "No se pudo eliminar",
        description:
          error instanceof Error ? error.message : "Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setEliminandoId(null);
    }
  };

  const abrirNotificar = (actualizacion: ActualizacionSistema) => {
    setActualizacionParaNotificar(actualizacion);
    setNotificarAbierto(true);
  };

  // Agrupadas por día calendario, en el orden en que ya vienen del backend
  // (más reciente primero), para que "Hoy"/"Ayer" queden arriba sin tener
  // que reordenar nada.
  const grupos = useMemo(() => {
    const mapa = new Map<string, { fecha: string; items: ActualizacionSistema[] }>();
    for (const a of actualizaciones) {
      const clave = claveDia(a.fecha_creacion);
      if (!mapa.has(clave)) {
        mapa.set(clave, { fecha: a.fecha_creacion, items: [] });
      }
      mapa.get(clave)!.items.push(a);
    }
    return Array.from(mapa.values());
  }, [actualizaciones]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f4f9f6] via-white to-[#e8f4ee]">
      <ModuleHeader
        title="Actualizaciones del Sistema"
        subtitle="Historial de lo que fue cambiando en el sistema, día por día."
      />

      <div className="content-with-fixed-header container mx-auto px-4 py-6 space-y-4 max-w-3xl">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-emerald-600" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
              Últimos {DIAS_HISTORIAL} días
            </h2>
          </div>
          {esSuperAdmin && (
            <Button size="sm" onClick={() => setPublicarAbierto(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Publicar
            </Button>
          )}
        </div>

        {cargando ? (
          <div className="flex items-center justify-center py-16 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Cargando historial...
          </div>
        ) : grupos.length === 0 ? (
          <p className="py-12 text-center text-sm text-gray-500">
            Todavía no hay actualizaciones publicadas.
          </p>
        ) : (
          <div className="space-y-6">
            {grupos.map((grupo) => (
              <div key={grupo.fecha} className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  {fechaLegible(grupo.fecha)}
                </p>
                <div className="space-y-2">
                  {grupo.items.map((a) => (
                    <div
                      key={a.id}
                      className="rounded-xl border border-gray-200/70 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="text-sm font-semibold text-gray-900">
                              {a.titulo}
                            </p>
                            <Badge
                              variant="outline"
                              className={CLASE_CATEGORIA[a.categoria]}
                            >
                              {ETIQUETA_CATEGORIA[a.categoria]}
                            </Badge>
                          </div>
                          <p className="mt-1 text-sm text-gray-600">
                            {a.mensaje}
                          </p>
                          <p className="mt-1 text-[11px] text-gray-400">
                            {horaCorta(a.fecha_creacion)}
                            {a.autor_nombre ? ` · ${a.autor_nombre}` : ""}
                          </p>
                        </div>
                        {esSuperAdmin && (
                          <div className="flex shrink-0 items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                              onClick={() => abrirNotificar(a)}
                            >
                              <Bell className="mr-1 h-3.5 w-3.5" />
                              Notificar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                              onClick={() => handleEliminar(a)}
                              disabled={eliminandoId === a.id}
                              aria-label={`Eliminar ${a.titulo}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {esSuperAdmin && (
        <>
          <PublicarActualizacionDialog
            open={publicarAbierto}
            onOpenChange={setPublicarAbierto}
            onPublicar={handlePublicar}
          />
          <NotificarTrabajadoresDialog
            open={notificarAbierto}
            onOpenChange={setNotificarAbierto}
            actualizacion={actualizacionParaNotificar}
          />
        </>
      )}

      <Toaster />
    </div>
  );
}

export default function ActualizacionesSistemaPage() {
  return (
    <RouteGuard requiredModule="actualizaciones-sistema">
      <ActualizacionesSistemaPageContent />
    </RouteGuard>
  );
}
