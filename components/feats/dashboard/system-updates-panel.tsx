"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, Loader2, Megaphone, Plus } from "lucide-react";

import { Badge } from "@/components/shared/atom/badge";
import { Button } from "@/components/shared/atom/button";
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

/** "Hoy" / "Ayer", igual que el agrupado de la campana de notificaciones. */
function grupoFecha(fechaStr: string): "Hoy" | "Ayer" | "Anteriores" {
  const d = new Date(fechaStr);
  const diffDias = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (diffDias <= 0) return "Hoy";
  if (diffDias === 1) return "Ayer";
  return "Anteriores";
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

export function SystemUpdatesPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const esSuperAdmin = Boolean(user?.is_superAdmin);

  const [actualizaciones, setActualizaciones] = useState<ActualizacionSistema[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [publicarAbierto, setPublicarAbierto] = useState(false);
  const [notificarAbierto, setNotificarAbierto] = useState(false);
  const [actualizacionParaNotificar, setActualizacionParaNotificar] =
    useState<ActualizacionSistema | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      setActualizaciones(await ActualizacionesSistemaService.listarRecientes(2));
    } catch {
      // Silencioso: es un panel informativo en Inicio, no bloquea el resto
      // del dashboard si el backend falla un momento.
      setActualizaciones([]);
    } finally {
      setLoading(false);
    }
  }, []);

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

  const abrirNotificar = (actualizacion: ActualizacionSistema) => {
    setActualizacionParaNotificar(actualizacion);
    setNotificarAbierto(true);
  };

  // Nada que mostrar y nadie que pueda publicar: no ocupar espacio en Inicio.
  if (!loading && actualizaciones.length === 0 && !esSuperAdmin) {
    return null;
  }

  const grupos: { label: "Hoy" | "Ayer"; items: ActualizacionSistema[] }[] = (
    ["Hoy", "Ayer"] as const
  )
    .map((label) => ({
      label,
      items: actualizaciones.filter((a) => grupoFecha(a.fecha_creacion) === label),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-emerald-600" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
            Actualizaciones del sistema
          </h3>
        </div>
        {esSuperAdmin && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setPublicarAbierto(true)}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Publicar
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando...
        </div>
      ) : grupos.length === 0 ? (
        <p className="text-sm text-gray-500">
          Sin actualizaciones en el día de hoy ni de ayer.
        </p>
      ) : (
        <div className="space-y-4">
          {grupos.map((grupo) => (
            <div key={grupo.label} className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                {grupo.label}
              </p>
              <div className="space-y-2">
                {grupo.items.map((a) => (
                  <div
                    key={a.id}
                    className="rounded-xl border border-gray-200/70 bg-white/80 p-3 shadow-sm backdrop-blur-sm"
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
                        <p className="mt-1 text-sm text-gray-600">{a.mensaje}</p>
                        <p className="mt-1 text-[11px] text-gray-400">
                          {horaCorta(a.fecha_creacion)}
                          {a.autor_nombre ? ` · ${a.autor_nombre}` : ""}
                        </p>
                      </div>
                      {esSuperAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 shrink-0 px-2 text-xs text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                          onClick={() => abrirNotificar(a)}
                        >
                          <Bell className="mr-1 h-3.5 w-3.5" />
                          Notificar
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

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
    </section>
  );
}
