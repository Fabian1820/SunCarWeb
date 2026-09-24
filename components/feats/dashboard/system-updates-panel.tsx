"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, ChevronDown, Loader2, Megaphone, Plus } from "lucide-react";

import { Button } from "@/components/shared/atom/button";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ActualizacionesSistemaService } from "@/lib/services/feats/actualizaciones-sistema/actualizaciones-sistema-service";
import {
  ETIQUETA_CATEGORIA,
  type ActualizacionSistema,
  type ActualizacionSistemaCreateData,
  type CategoriaActualizacion,
} from "@/lib/types/feats/actualizaciones-sistema/actualizaciones-sistema-types";
import { PublicarActualizacionDialog } from "@/components/feats/dashboard/publicar-actualizacion-dialog";
import { NotificarTrabajadoresDialog } from "@/components/feats/dashboard/notificar-trabajadores-dialog";

/** Cuántas se ven al entrar; el resto queda detrás de "Ver todas". */
const VISIBLES = 3;

/** Color de la categoría como texto con punto, no como pastilla: pesa menos en una lista. */
const TONO_CATEGORIA: Record<CategoriaActualizacion, { punto: string; texto: string }> = {
  nueva_funcion: { punto: "bg-emerald-500", texto: "text-emerald-700" },
  mejora: { punto: "bg-blue-500", texto: "text-blue-700" },
  arreglo: { punto: "bg-amber-500", texto: "text-amber-700" },
  otro: { punto: "bg-slate-400", texto: "text-slate-600" },
};

/** "Hoy 12:52" / "Ayer 09:10". */
function cuando(fechaStr: string): string {
  try {
    const d = new Date(fechaStr);
    const hoy = new Date();
    const ayer = new Date();
    ayer.setDate(hoy.getDate() - 1);
    const hora = d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
    if (d.toDateString() === hoy.toDateString()) return `Hoy ${hora}`;
    if (d.toDateString() === ayer.toDateString()) return `Ayer ${hora}`;
    return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  } catch {
    return "";
  }
}

export function SystemUpdatesPanel() {
  const { hasPermission, hasExactPermission } = useAuth();
  const { toast } = useToast();
  // Antes solo superAdmin; ahora sub-permisos aditivos de actualizaciones-sistema.
  const puedePublicar = hasExactPermission("actualizaciones-sistema/publicar");
  const puedeNotificar = hasExactPermission("actualizaciones-sistema/notificar");

  const [actualizaciones, setActualizaciones] = useState<ActualizacionSistema[]>([]);
  const [loading, setLoading] = useState(true);
  const [verTodas, setVerTodas] = useState(false);
  const [abierta, setAbierta] = useState<string | null>(null);
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

  const handlePublicar = async (data: ActualizacionSistemaCreateData): Promise<boolean> => {
    try {
      await ActualizacionesSistemaService.crear(data);
      toast({ title: "Actualización publicada" });
      await cargar();
      return true;
    } catch (error) {
      toast({
        title: "No se pudo publicar",
        description: error instanceof Error ? error.message : "Inténtalo de nuevo.",
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
  if (!loading && actualizaciones.length === 0 && !puedePublicar) {
    return null;
  }

  const ocultas = Math.max(actualizaciones.length - VISIBLES, 0);
  const visibles = verTodas ? actualizaciones : actualizaciones.slice(0, VISIBLES);
  const puedeVerHistorial = hasPermission("actualizaciones-sistema");

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-emerald-600" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
            Actualizaciones del sistema
          </h3>
          {actualizaciones.length > 0 && (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
              {actualizaciones.length}
            </span>
          )}
        </div>
        {puedePublicar && (
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
      ) : actualizaciones.length === 0 ? (
        <p className="text-sm text-gray-500">Sin actualizaciones en el día de hoy ni de ayer.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200/80 bg-white">
          <ul className="divide-y divide-gray-100">
            {visibles.map((a) => {
              const tono = TONO_CATEGORIA[a.categoria] ?? TONO_CATEGORIA.otro;
              const expandida = abierta === a.id;
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => setAbierta(expandida ? null : a.id)}
                    aria-expanded={expandida}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-gray-50 focus-visible:bg-gray-50 focus-visible:outline-none"
                  >
                    <span className={cn("h-2 w-2 shrink-0 rounded-full", tono.punto)} aria-hidden />
                    <span className="line-clamp-2 min-w-0 flex-1 text-sm font-medium text-gray-900 sm:truncate">
                      {a.titulo}
                    </span>
                    <span className={cn("hidden shrink-0 text-xs font-medium sm:inline", tono.texto)}>
                      {ETIQUETA_CATEGORIA[a.categoria]}
                    </span>
                    <span className="shrink-0 text-right text-xs tabular-nums text-gray-400 sm:w-20">
                      {cuando(a.fecha_creacion)}
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200",
                        expandida && "rotate-180",
                      )}
                      aria-hidden
                    />
                  </button>
                  {expandida && (
                    <div className="flex flex-col items-start gap-2 px-4 pb-3 pl-9 sm:flex-row sm:justify-between sm:gap-3">
                      <div className="min-w-0 space-y-1">
                        <p className="max-w-[70ch] text-sm leading-relaxed text-gray-600">{a.mensaje}</p>
                        {a.autor_nombre && <p className="text-xs text-gray-400">{a.autor_nombre}</p>}
                      </div>
                      {puedeNotificar && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="-ml-2 h-7 shrink-0 px-2 text-xs text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 sm:ml-0"
                          onClick={() => abrirNotificar(a)}
                        >
                          <Bell className="mr-1 h-3.5 w-3.5" />
                          Notificar
                        </Button>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {(ocultas > 0 || puedeVerHistorial) && (
            <div className="flex items-center justify-between gap-2 border-t border-gray-100 bg-gray-50/60 px-4 py-2">
              {ocultas > 0 ? (
                <button
                  type="button"
                  onClick={() => setVerTodas((v) => !v)}
                  className="flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800"
                >
                  {verTodas ? "Ver menos" : `Ver todas (${actualizaciones.length})`}
                  <ChevronDown
                    className={cn("h-3.5 w-3.5 transition-transform duration-200", verTodas && "rotate-180")}
                    aria-hidden
                  />
                </button>
              ) : (
                <span />
              )}
              {puedeVerHistorial && (
                <Link
                  href="/actualizaciones-sistema"
                  className="text-xs text-gray-500 hover:text-gray-800"
                >
                  Historial completo
                </Link>
              )}
            </div>
          )}
        </div>
      )}

      {puedePublicar && (
        <PublicarActualizacionDialog
          open={publicarAbierto}
          onOpenChange={setPublicarAbierto}
          onPublicar={handlePublicar}
        />
      )}
      {puedeNotificar && (
        <NotificarTrabajadoresDialog
          open={notificarAbierto}
          onOpenChange={setNotificarAbierto}
          actualizacion={actualizacionParaNotificar}
        />
      )}
    </section>
  );
}
