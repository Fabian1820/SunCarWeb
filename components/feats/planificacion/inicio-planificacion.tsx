"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarX2,
  CheckCircle2,
  Download,
  Eye,
  Loader2,
  Pencil,
  Plus,
  Printer,
} from "lucide-react";
import { es } from "date-fns/locale";
import { Calendar } from "@/components/shared/molecule/calendar";
import { Button, buttonVariants } from "@/components/shared/atom/button";
import { Avatar, AvatarFallback } from "@/components/shared/atom/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shared/molecule/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { PlanificacionService } from "@/lib/services/feats/planificacion/planificacion-service";
import { ExportPlanificacionService } from "@/lib/services/feats/planificacion/export-planificacion-service";
import { aFecha, desplazar, isoLocal, nombreDia } from "@/components/feats/planificacion/fechas";
import { TarjetaTrabajo } from "@/components/feats/planificacion/menu-dia";
import { EtiquetaTipo } from "@/components/feats/planificacion/tipo-trabajo";
import type {
  Asignado,
  Planificacion,
  TipoTrabajo,
  TrabajoPlanificado,
} from "@/lib/types/feats/planificacion/planificacion-types";

const MODULO_CONFIRMAR = "planificacion/confirmar";

function fechaHoraCorta(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("es", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

interface Props {
  hoy: string;
  /** Abre un día para planificarlo o cambiar lo que tiene. */
  onElegir: (fecha: string) => void;
  /** El calendario para un día nuevo, que se abre con el botón de arriba. */
  eligiendoDia: boolean;
  onEligiendoDia: (abierto: boolean) => void;
}

function nombreDe(a: Asignado): string {
  return a.tipo === "brigada" ? `Brigada de ${a.nombre}` : a.nombre;
}

/** "5 trabajos · 2 equipos · 1 cerrado". */
function resumen(p: Planificacion): string {
  const n = p.trabajos.length;
  const equipos = new Set(p.trabajos.map((t) => `${t.asignado.tipo}:${t.asignado.id}`)).size;
  const cerrados = p.trabajos.filter((t) => t.estado !== "planificado").length;
  return [
    `${n} trabajo${n === 1 ? "" : "s"}`,
    `${equipos} equipo${equipos === 1 ? "" : "s"}`,
    cerrados ? `${cerrados} cerrado${cerrados === 1 ? "" : "s"}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** Los trabajos de un día, brigada por brigada. */
function porEquipo(trabajos: TrabajoPlanificado[]): [string, TrabajoPlanificado[]][] {
  const grupos = new Map<string, TrabajoPlanificado[]>();
  for (const t of trabajos) {
    const quien = nombreDe(t.asignado);
    grupos.set(quien, [...(grupos.get(quien) ?? []), t]);
  }
  return [...grupos.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

/** Cuántos trabajos hay de cada tipo, el más frecuente primero. */
function porTipo(trabajos: TrabajoPlanificado[]): [TipoTrabajo, number][] {
  const conteo = new Map<TipoTrabajo, number>();
  for (const t of trabajos) conteo.set(t.tipo, (conteo.get(t.tipo) ?? 0) + 1);
  return [...conteo.entries()].sort((a, b) => b[1] - a[1]);
}

/** Qué tanto de lo planificado ya se hizo, para los días que ya pasaron. */
function desglosarCierre(trabajos: TrabajoPlanificado[]): { cumplidos: number; noRealizados: number } {
  let cumplidos = 0;
  let noRealizados = 0;
  for (const t of trabajos) {
    if (t.estado === "cumplido") cumplidos++;
    else if (t.estado === "no_realizado") noRealizados++;
  }
  return { cumplidos, noRealizados };
}

/** Iniciales para el avatar de "Hecho por": una letra si el nombre es de una palabra, dos si son más. */
function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].charAt(0).toUpperCase();
  return (partes[0].charAt(0) + partes[partes.length - 1].charAt(0)).toUpperCase();
}

/**
 * Lo primero al entrar: las planificaciones que ya hay.
 *
 * Cada día se mira con el ojo, sin riesgo de tocar nada, o se cambia con el
 * lápiz. Un día nuevo se elige con el botón de arriba, en un calendario donde
 * los días que ya tienen trabajos llevan un punto verde.
 */
export function InicioPlanificacion({ hoy, onElegir, eligiendoDia, onEligiendoDia }: Props) {
  const { hasExactPermission } = useAuth();
  const { toast } = useToast();
  const puedeConfirmar = hasExactPermission(MODULO_CONFIRMAR);
  const [planes, setPlanes] = useState<Planificacion[] | null>(null);
  const [fallo, setFallo] = useState(false);
  const [viendo, setViendo] = useState<Planificacion | null>(null);
  const [confirmando, setConfirmando] = useState<string | null>(null);

  function reemplazar(actualizado: Planificacion) {
    setPlanes((lista) => (lista ?? []).map((p) => (p.fecha === actualizado.fecha ? actualizado : p)));
    setViendo((v) => (v && v.fecha === actualizado.fecha ? actualizado : v));
  }

  async function confirmar(fecha: string) {
    setConfirmando(fecha);
    try {
      const actualizado = await PlanificacionService.confirmar(fecha);
      reemplazar(actualizado);
      toast({ title: "Planificación confirmada" });
    } catch {
      toast({ title: "No se pudo confirmar", description: "Intenta de nuevo.", variant: "destructive" });
    } finally {
      setConfirmando(null);
    }
  }

  useEffect(() => {
    let cancelado = false;
    PlanificacionService.listar(desplazar(hoy, -31), desplazar(hoy, 120))
      .then((lista) => !cancelado && setPlanes(lista))
      .catch(() => {
        if (cancelado) return;
        setPlanes([]);
        setFallo(true);
      });
    return () => {
      cancelado = true;
    };
  }, [hoy]);

  const conTrabajos = useMemo(() => (planes ?? []).filter((p) => (p.trabajos?.length ?? 0) > 0), [planes]);
  const diasPlanificados = useMemo(() => conTrabajos.map((p) => aFecha(p.fecha.slice(0, 10))), [conTrabajos]);
  const proximas = useMemo(
    () => conTrabajos.filter((p) => p.fecha.slice(0, 10) >= hoy).sort((a, b) => a.fecha.localeCompare(b.fecha)),
    [conTrabajos, hoy],
  );
  const anteriores = useMemo(
    () =>
      conTrabajos
        .filter((p) => p.fecha.slice(0, 10) < hoy)
        .sort((a, b) => b.fecha.localeCompare(a.fecha))
        .slice(0, 10),
    [conTrabajos, hoy],
  );

  function elegir(fecha: string) {
    onEligiendoDia(false);
    onElegir(fecha);
  }

  const confirmadasProximas = proximas.filter((p) => p.confirmada_en).length;
  const confirmadasAnteriores = anteriores.filter((p) => p.confirmada_en).length;

  return (
    <div className="mx-auto max-w-7xl pt-2 pb-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Planificaciones</h2>
          <p className="mt-1 text-sm text-gray-600">
            Mira o cambia un día ya planificado. Para uno nuevo, usa <span className="font-medium">Nueva</span>.
          </p>
        </div>
      </div>

      {planes === null ? (
        <div className="mt-6 flex flex-col items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white py-16 text-center shadow-sm">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" aria-hidden />
          <p className="text-sm text-gray-600">Cargando planificaciones…</p>
        </div>
      ) : conTrabajos.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center shadow-sm">
          <CalendarX2 className="h-10 w-10 text-gray-400" aria-hidden />
          <p className="font-medium text-gray-900">
            {fallo ? "No se pudieron cargar las planificaciones." : "Todavía no hay ningún día planificado."}
          </p>
          {!fallo && (
            <Button className="mt-1" onClick={() => onEligiendoDia(true)}>
              <Plus className="mr-2 h-4 w-4" aria-hidden />
              Planificar un día
            </Button>
          )}
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          <ListaPlanes
            titulo="Próximas"
            resumenTitulo={`${proximas.length} día${proximas.length === 1 ? "" : "s"} por delante · ${confirmadasProximas} confirmado${confirmadasProximas === 1 ? "" : "s"}`}
            vacio="No hay nada planificado de hoy en adelante."
            planes={proximas}
            hoy={hoy}
            onVer={setViendo}
            onEditar={elegir}
            puedeConfirmar={puedeConfirmar}
            confirmando={confirmando}
            onConfirmar={confirmar}
          />
          {anteriores.length > 0 && (
            <ListaPlanes
              titulo="Anteriores"
              resumenTitulo={`${anteriores.length} día${anteriores.length === 1 ? "" : "s"} reciente${anteriores.length === 1 ? "" : "s"} · ${confirmadasAnteriores} confirmado${confirmadasAnteriores === 1 ? "" : "s"}`}
              planes={anteriores}
              hoy={hoy}
              onVer={setViendo}
              onEditar={elegir}
              puedeConfirmar={puedeConfirmar}
              confirmando={confirmando}
              onConfirmar={confirmar}
            />
          )}
        </div>
      )}

      <Dialog open={!!viendo} onOpenChange={(abierto) => !abierto && setViendo(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          {viendo && (
            <>
              <DialogHeader>
                <DialogTitle className="first-letter:uppercase">{nombreDia(viendo.fecha.slice(0, 10), hoy)}</DialogTitle>
                <DialogDescription>
                  {resumen(viendo)}
                  {viendo.confirmada_en && (
                    <span className="mt-1 block text-emerald-700">
                      Confirmada por {viendo.confirmada_por_nombre || "—"} el {fechaHoraCorta(viendo.confirmada_en)}
                    </span>
                  )}
                  {(viendo.hecho_por?.length ?? 0) > 0 && (
                    <span className="mt-1 block">Hecho por: {viendo.hecho_por!.join(", ")}</span>
                  )}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-5">
                {porEquipo(viendo.trabajos).map(([quien, lista]) => (
                  <section key={quien}>
                    <h3 className="mb-2 text-sm font-semibold text-gray-900">{quien}</h3>
                    <ul className="space-y-2">
                      {lista.map((t, i) => (
                        <TarjetaTrabajo key={t.id || i} trabajo={t} reciente={false} mostrarQuien={false} />
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setViendo(null)}>
                  Cerrar
                </Button>
                <Button
                  onClick={() => {
                    const fecha = viendo.fecha.slice(0, 10);
                    setViendo(null);
                    onElegir(fecha);
                  }}
                >
                  <Pencil className="mr-2 h-4 w-4" aria-hidden />
                  Editar
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={eligiendoDia} onOpenChange={onEligiendoDia}>
        <DialogContent className="w-auto max-w-fit">
          <DialogHeader>
            <DialogTitle>¿Qué día quieres planificar?</DialogTitle>
            <DialogDescription>Los días con punto verde ya tienen trabajos.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-center">
            <Calendar
              mode="single"
              locale={es}
              weekStartsOn={1}
              defaultMonth={aFecha(hoy)}
              onSelect={(d) => d && elegir(isoLocal(d))}
              modifiers={{ planificado: diasPlanificados }}
              modifiersClassNames={{
                planificado:
                  "font-semibold text-emerald-900 after:absolute after:bottom-1 after:left-1/2 after:h-1.5 after:w-1.5 after:-translate-x-1/2 after:rounded-full after:bg-emerald-600",
              }}
              classNames={{
                caption_label: "text-base font-semibold capitalize",
                head_cell: "w-11 rounded-md text-sm font-normal capitalize text-gray-500",
                cell: "relative h-11 w-11 p-0 text-center",
                day: cn(
                  buttonVariants({ variant: "ghost" }),
                  "relative h-11 w-11 p-0 text-base font-normal aria-selected:opacity-100",
                ),
                day_today: "border border-emerald-700 text-emerald-900",
              }}
            />
          </div>
          <div className="flex gap-2 border-t pt-3">
            {[
              { dias: 0, texto: "Hoy" },
              { dias: 1, texto: "Mañana" },
            ].map(({ dias, texto }) => (
              <button
                key={dias}
                type="button"
                onClick={() => elegir(desplazar(hoy, dias))}
                className={cn(
                  "flex-1 rounded-md px-3 py-2 text-sm font-semibold transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600",
                  dias === 1
                    ? "bg-emerald-800 text-white hover:bg-emerald-900"
                    : "border border-gray-200 text-gray-800 hover:border-emerald-600",
                )}
              >
                {texto}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ListaPlanes({
  titulo,
  resumenTitulo,
  vacio,
  planes,
  hoy,
  onVer,
  onEditar,
  puedeConfirmar,
  confirmando,
  onConfirmar,
}: {
  titulo: string;
  resumenTitulo: string;
  vacio?: string;
  planes: Planificacion[];
  hoy: string;
  onVer: (p: Planificacion) => void;
  onEditar: (fecha: string) => void;
  puedeConfirmar: boolean;
  confirmando: string | null;
  onConfirmar: (fecha: string) => void;
}) {
  return (
    <Card className="border-l-4 border-l-emerald-600">
      <CardHeader>
        <CardTitle>{titulo}</CardTitle>
        <CardDescription>{resumenTitulo}</CardDescription>
      </CardHeader>
      <CardContent className={planes.length === 0 ? undefined : "p-0"}>
        {planes.length === 0 ? (
          <p className="text-sm text-gray-500">{vacio}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-y border-gray-200 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3">Día</th>
                  <th className="px-4 py-3">Trabajos</th>
                  <th className="px-4 py-3">Hecho por</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {planes.map((p) => {
                  const fecha = p.fecha.slice(0, 10);
                  const dia = nombreDia(fecha, hoy);
                  const confirmada = !!p.confirmada_en;
                  const hechoPor = p.hecho_por ?? [];
                  const tipos = porTipo(p.trabajos);
                  const { cumplidos, noRealizados } = desglosarCierre(p.trabajos);
                  const equipos = new Set(p.trabajos.map((t) => `${t.asignado.tipo}:${t.asignado.id}`)).size;
                  return (
                    <tr key={fecha} className="transition-colors hover:bg-gray-50">
                      <td className="px-4 py-3 align-top font-medium text-gray-900 first-letter:uppercase">{dia}</td>
                      <td className="px-4 py-3 align-top">
                        <p className="text-gray-900">
                          {p.trabajos.length} trabajo{p.trabajos.length === 1 ? "" : "s"} · {equipos} equipo
                          {equipos === 1 ? "" : "s"}
                        </p>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {tipos.map(([tipo, n]) => (
                            <EtiquetaTipo key={tipo} tipo={tipo} count={n} />
                          ))}
                        </div>
                        {(cumplidos > 0 || noRealizados > 0) && (
                          <p className="mt-1.5 text-xs text-gray-500">
                            {cumplidos > 0 && (
                              <span className="font-medium text-emerald-700">
                                {cumplidos} cumplido{cumplidos === 1 ? "" : "s"}
                              </span>
                            )}
                            {cumplidos > 0 && noRealizados > 0 && " · "}
                            {noRealizados > 0 && (
                              <span className="font-medium text-red-600">
                                {noRealizados} no realizado{noRealizados === 1 ? "" : "s"}
                              </span>
                            )}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top">
                        {hechoPor.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {hechoPor.map((nombre) => (
                              <span
                                key={nombre}
                                className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 py-0.5 pl-0.5 pr-2.5 text-xs font-medium text-gray-700"
                              >
                                <Avatar className="h-5 w-5">
                                  <AvatarFallback className="bg-emerald-100 text-[10px] font-semibold text-emerald-700">
                                    {iniciales(nombre)}
                                  </AvatarFallback>
                                </Avatar>
                                {nombre}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top">
                        {confirmada ? (
                          <span
                            className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-900"
                            title={`Confirmada por ${p.confirmada_por_nombre || "—"} el ${fechaHoraCorta(p.confirmada_en!)}`}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                            Confirmada
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                            Sin confirmar
                          </span>
                        )}
                        {confirmada && (
                          <p className="mt-1 text-xs text-gray-500">
                            {p.confirmada_por_nombre} · {fechaHoraCorta(p.confirmada_en!)}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => onVer(p)} aria-label={`Ver el plan de ${dia}`} title="Ver">
                            <Eye className="h-4 w-4" aria-hidden />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onEditar(fecha)}
                            aria-label={`Editar el plan de ${dia}`}
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" aria-hidden />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => ExportPlanificacionService.descargar(p, dia)}
                            aria-label={`Descargar el plan de ${dia}`}
                            title="Descargar"
                          >
                            <Download className="h-4 w-4" aria-hidden />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => ExportPlanificacionService.imprimir(p, dia)}
                            aria-label={`Imprimir el plan de ${dia}`}
                            title="Imprimir"
                          >
                            <Printer className="h-4 w-4" aria-hidden />
                          </Button>
                          {puedeConfirmar && !confirmada && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onConfirmar(fecha)}
                              disabled={confirmando === fecha}
                              aria-label={`Confirmar el plan de ${dia}`}
                              title="Confirmar planificación"
                              className="text-emerald-800 hover:text-emerald-900"
                            >
                              {confirmando === fecha ? (
                                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                              ) : (
                                <CheckCircle2 className="h-4 w-4" aria-hidden />
                              )}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
