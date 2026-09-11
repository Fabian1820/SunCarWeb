"use client";

import { useMemo, useState } from "react";
import { RouteGuard } from "@/components/auth/route-guard";
import { ModuleHeader } from "@/components/shared/organism/module-header";
import { Button } from "@/components/shared/atom/button";
import { Textarea } from "@/components/shared/molecule/textarea";
import {
  Card,
  CardContent,
} from "@/components/shared/molecule/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/shared/molecule/dialog";
import { Checkbox } from "@/components/shared/molecule/checkbox";
import { Input } from "@/components/shared/atom/input";
import { Toaster } from "@/components/shared/molecule/toaster";
import { ExportButtons } from "@/components/shared/molecule/export-buttons";
import type { ExportOptions } from "@/lib/export-service";
import { useToast } from "@/hooks/use-toast";
import { useSolicitudesDesarrollo } from "@/hooks/use-solicitudes-desarrollo";
import {
  CheckCircle2,
  Clock,
  XCircle,
  MinusCircle,
  Loader2,
  Inbox,
  MessageSquare,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  CategoriaSolicitud,
  EstadoSolicitud,
  ResolucionSolicitud,
  SolicitudDesarrollo,
} from "@/lib/types/feats/solicitudes-desarrollo/solicitud-desarrollo-types";
import {
  ETIQUETA_CATEGORIA,
  ETIQUETA_ESTADO,
} from "@/lib/types/feats/solicitudes-desarrollo/solicitud-desarrollo-types";

const ESTADO_META: Record<
  EstadoSolicitud,
  { className: string; Icon: typeof Clock }
> = {
  pendiente: { className: "bg-amber-100 text-amber-700", Icon: Clock },
  posible: { className: "bg-emerald-100 text-emerald-700", Icon: CheckCircle2 },
  no_posible: { className: "bg-rose-100 text-rose-700", Icon: XCircle },
  no_aplica: { className: "bg-slate-100 text-slate-600", Icon: MinusCircle },
};

const FILTROS_ESTADO: { key: "todos" | EstadoSolicitud; label: string }[] = [
  { key: "todos", label: "Todas" },
  { key: "pendiente", label: "Pendientes" },
  { key: "posible", label: "Posibles" },
  { key: "no_posible", label: "No posibles" },
  { key: "no_aplica", label: "No aplican" },
];

const RESOLUCIONES: { key: ResolucionSolicitud; label: string; hint: string }[] = [
  { key: "posible", label: "Sí, es posible", hint: "El equipo puede implementar esta petición." },
  { key: "no_posible", label: "No, no es posible", hint: "El equipo evaluó y no puede realizarla." },
  { key: "no_aplica", label: "No tiene que ver con desarrollo", hint: "No corresponde al equipo de desarrollo." },
];

const FILTROS_IMPLEMENTADA: { key: "todas" | "si" | "no"; label: string }[] = [
  { key: "todas", label: "Cualquiera" },
  { key: "si", label: "Implementadas" },
  { key: "no", label: "Sin implementar" },
];

function fechaLarga(fechaStr?: string | null): string {
  if (!fechaStr) return "—";
  try {
    return new Date(fechaStr).toLocaleString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function fechaCorta(fechaStr?: string | null): string {
  if (!fechaStr) return "—";
  try {
    return new Date(fechaStr).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function EstadoPill({ solicitud }: { solicitud: SolicitudDesarrollo }) {
  const meta = ESTADO_META[solicitud.estado] ?? ESTADO_META.pendiente;
  const { Icon } = meta;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full text-xs font-medium px-2.5 py-1",
        meta.className,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {ETIQUETA_ESTADO[solicitud.estado]}
      {solicitud.estado === "posible" && solicitud.terminada && (
        <span className="ml-1 rounded bg-emerald-600 text-white text-[10px] font-semibold px-1.5 py-[1px]">
          TERMINADA
        </span>
      )}
    </span>
  );
}

function PeticionesContent() {
  const { toast } = useToast();
  const {
    solicitudes,
    loading,
    filtros,
    setFiltros,
    resolver,
    marcarTerminada,
  } = useSolicitudesDesarrollo(true);

  // El estado ("pendiente"/"posible"/...) se filtra en el cliente sobre el
  // resultado ya filtrado por el backend (categoría, implementada, fechas,
  // búsqueda), para poder cambiar de pestaña sin re-consultar cada vez.
  const [filtroEstado, setFiltroEstado] = useState<"todos" | EstadoSolicitud>("pendiente");
  const [dialogo, setDialogo] = useState<SolicitudDesarrollo | null>(null);
  const [resolucion, setResolucion] = useState<ResolucionSolicitud>("posible");
  const [comentario, setComentario] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const categoriaValue: "todas" | CategoriaSolicitud = filtros.categoria?.[0] ?? "todas";
  const implementadaValue: "todas" | "si" | "no" =
    filtros.terminada === true ? "si" : filtros.terminada === false ? "no" : "todas";

  const conteos = useMemo(() => {
    const base = { pendiente: 0, posible: 0, no_posible: 0, no_aplica: 0, todos: solicitudes.length };
    for (const s of solicitudes) {
      base[s.estado] = (base[s.estado] ?? 0) + 1;
    }
    return base;
  }, [solicitudes]);

  const filtradas = useMemo(() => {
    if (filtroEstado === "todos") return solicitudes;
    return solicitudes.filter((s) => s.estado === filtroEstado);
  }, [solicitudes, filtroEstado]);

  const getExportOptions = async (): Promise<Omit<ExportOptions, "filename">> => {
    let titulo = "Peticiones al equipo de desarrollo";
    if (filtroEstado !== "todos") titulo += ` - ${ETIQUETA_ESTADO[filtroEstado]}`;
    if (categoriaValue !== "todas") titulo += ` - ${ETIQUETA_CATEGORIA[categoriaValue]}`;

    const subtitlePartes = [`Fecha: ${new Date().toLocaleDateString("es-ES")}`];
    if (filtros.fechaDesde || filtros.fechaHasta) {
      subtitlePartes.push(
        `Rango: ${filtros.fechaDesde ? fechaCorta(filtros.fechaDesde) : "inicio"} - ${filtros.fechaHasta ? fechaCorta(filtros.fechaHasta) : "hoy"}`,
      );
    }
    subtitlePartes.push(`Total: ${filtradas.length}`);

    return {
      title: titulo,
      subtitle: subtitlePartes.join(" · "),
      columns: [
        { header: "No.", key: "numero", width: 5 },
        { header: "Fecha", key: "fecha", width: 12 },
        { header: "Usuario", key: "usuario", width: 20 },
        { header: "CI", key: "ci", width: 14 },
        { header: "Categoría", key: "categoria", width: 12 },
        { header: "Pantalla", key: "pantalla", width: 16 },
        { header: "Petición", key: "mensaje", width: 45 },
        { header: "Estado", key: "estado", width: 14 },
        { header: "Implementada", key: "implementada", width: 14 },
        { header: "Respuesta", key: "respuesta", width: 40 },
        { header: "Respondido por", key: "respondidoPor", width: 18 },
        { header: "Fecha respuesta", key: "fechaRespuesta", width: 14 },
      ],
      data: filtradas.map((s, i) => ({
        numero: i + 1,
        fecha: fechaCorta(s.fecha_creacion),
        usuario: s.usuario_nombre,
        ci: s.usuario_ci,
        categoria: ETIQUETA_CATEGORIA[s.categoria],
        pantalla: s.pantalla || "—",
        mensaje: s.mensaje,
        estado: ETIQUETA_ESTADO[s.estado],
        implementada: s.estado === "posible" ? (s.terminada ? "Sí" : "No") : "N/A",
        respuesta: s.respuesta || "—",
        respondidoPor: s.respondido_por || "—",
        fechaRespuesta: fechaCorta(s.fecha_respuesta),
      })),
    };
  };

  const abrirDialogo = (s: SolicitudDesarrollo) => {
    setDialogo(s);
    const preset: ResolucionSolicitud =
      s.estado === "pendiente" ? "posible" : (s.estado as ResolucionSolicitud);
    setResolucion(preset);
    setComentario(s.respuesta ?? "");
  };

  const cerrarDialogo = () => {
    setDialogo(null);
    setComentario("");
    setGuardando(false);
  };

  const handleGuardar = async () => {
    if (!dialogo) return;
    if (!comentario.trim()) {
      toast({
        title: "Falta el comentario",
        description: "Escribe un comentario explicando la resolución.",
        variant: "destructive",
      });
      return;
    }
    setGuardando(true);
    const ok = await resolver(dialogo.id, resolucion, comentario.trim());
    setGuardando(false);
    if (ok) {
      toast({
        title: "Petición resuelta",
        description: `Se marcó como ${ETIQUETA_ESTADO[resolucion]}.`,
      });
      cerrarDialogo();
    } else {
      toast({
        title: "No se pudo resolver",
        description: "Intenta de nuevo.",
        variant: "destructive",
      });
    }
  };

  const handleToggleTerminada = async (s: SolicitudDesarrollo, terminada: boolean) => {
    setTogglingId(s.id);
    const ok = await marcarTerminada(s.id, terminada);
    setTogglingId(null);
    if (ok) {
      toast({
        title: terminada ? "Marcada como terminada" : "Reabierta",
        description: terminada
          ? "La petición quedó registrada como implementada."
          : "La petición vuelve a estar en curso.",
      });
    } else {
      toast({
        title: "No se pudo actualizar",
        description: "Intenta de nuevo.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f4f9f6] via-white to-[#e8f4ee]">
      <ModuleHeader
        title="Peticiones"
        subtitle="Peticiones enviadas al equipo de desarrollo."
      />

      <div className="content-with-fixed-header container mx-auto px-4 py-6 space-y-4">
        {/* Filtros: chips de estado + select categoría */}
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {FILTROS_ESTADO.map((f) => {
              const activo = filtroEstado === f.key;
              const count = conteos[f.key as keyof typeof conteos] ?? 0;
              return (
                <button
                  key={f.key}
                  onClick={() => setFiltroEstado(f.key)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
                    activo
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                      : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50",
                  )}
                >
                  {f.label}
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[11px] font-semibold",
                      activo ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600",
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {filtradas.length > 0 && (
            <ExportButtons
              getExportOptions={getExportOptions}
              baseFilename="peticiones-desarrollo"
              variant="compact"
            />
          )}
        </div>

        {/* Fila de filtros adicionales (se aplican en el backend): búsqueda, categoría, implementada, rango de fechas */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={filtros.q ?? ""}
              onChange={(e) => setFiltros({ q: e.target.value || undefined })}
              placeholder="Buscar por usuario, CI, pantalla o texto..."
              className="pl-8 bg-white"
            />
          </div>

          <Select
            value={categoriaValue}
            onValueChange={(v) =>
              setFiltros({ categoria: v === "todas" ? undefined : [v as CategoriaSolicitud] })
            }
          >
            <SelectTrigger className="w-44 bg-white">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas las categorías</SelectItem>
              <SelectItem value="bug">Bug</SelectItem>
              <SelectItem value="mejora">Mejora</SelectItem>
              <SelectItem value="idea">Idea</SelectItem>
              <SelectItem value="otro">Otro</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={implementadaValue}
            onValueChange={(v) =>
              setFiltros({ terminada: v === "todas" ? undefined : v === "si" })
            }
          >
            <SelectTrigger className="w-40 bg-white">
              <SelectValue placeholder="Implementada" />
            </SelectTrigger>
            <SelectContent>
              {FILTROS_IMPLEMENTADA.map((f) => (
                <SelectItem key={f.key} value={f.key}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="date"
            value={filtros.fechaDesde ?? ""}
            onChange={(e) => setFiltros({ fechaDesde: e.target.value || undefined })}
            className="w-40 bg-white"
            aria-label="Fecha desde"
          />
          <Input
            type="date"
            value={filtros.fechaHasta ?? ""}
            onChange={(e) => setFiltros({ fechaHasta: e.target.value || undefined })}
            className="w-40 bg-white"
            aria-label="Fecha hasta"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
          </div>
        ) : filtradas.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 flex flex-col items-center gap-3 text-gray-400">
              <Inbox className="h-10 w-10 opacity-40" />
              <p className="text-sm">Sin peticiones para este filtro.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtradas.map((s) => (
              <Card key={s.id} className="overflow-hidden">
                <CardContent className="p-5 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                        <span className="uppercase tracking-wide font-semibold text-gray-500">
                          {ETIQUETA_CATEGORIA[s.categoria]}
                        </span>
                        <span>·</span>
                        <span>{s.usuario_nombre}</span>
                        {s.pantalla && (
                          <>
                            <span>·</span>
                            <span className="text-gray-400">{s.pantalla}</span>
                          </>
                        )}
                      </div>
                      <p className="text-gray-900 leading-relaxed">{s.mensaje}</p>
                      <p className="text-[11px] text-gray-400 mt-1.5">
                        Enviada el {fechaLarga(s.fecha_creacion)}
                      </p>
                    </div>
                    <EstadoPill solicitud={s} />
                  </div>

                  {s.estado !== "pendiente" && s.respuesta && (
                    <div
                      className={cn(
                        "rounded-md border px-3 py-2",
                        s.estado === "posible" && "bg-emerald-50 border-emerald-100",
                        s.estado === "no_posible" && "bg-rose-50 border-rose-100",
                        s.estado === "no_aplica" && "bg-slate-50 border-slate-200",
                      )}
                    >
                      <p className="text-[11px] font-semibold text-gray-600 mb-0.5">
                        Respuesta {s.respondido_por ? `de ${s.respondido_por}` : ""}
                        {s.fecha_respuesta ? ` · ${fechaLarga(s.fecha_respuesta)}` : ""}
                      </p>
                      <p className="text-sm text-gray-800">{s.respuesta}</p>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-2">
                      {s.estado === "posible" && (
                        <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                          <Checkbox
                            checked={s.terminada}
                            disabled={togglingId === s.id}
                            onCheckedChange={(checked) =>
                              handleToggleTerminada(s, Boolean(checked))
                            }
                          />
                          Terminada
                          {togglingId === s.id && (
                            <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
                          )}
                        </label>
                      )}
                    </div>
                    <Button
                      variant={s.estado === "pendiente" ? "default" : "outline"}
                      size="sm"
                      onClick={() => abrirDialogo(s)}
                      className={
                        s.estado === "pendiente"
                          ? "bg-indigo-600 hover:bg-indigo-700"
                          : ""
                      }
                    >
                      <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                      {s.estado === "pendiente" ? "Responder" : "Cambiar respuesta"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Diálogo de resolución */}
      <Dialog open={dialogo !== null} onOpenChange={(v) => !v && cerrarDialogo()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Responder petición</DialogTitle>
            <DialogDescription>
              Elige la resolución y escribe un comentario explicando la decisión.
            </DialogDescription>
          </DialogHeader>
          {dialogo && (
            <div className="space-y-4">
              <div className="rounded-md bg-gray-50 border border-gray-100 p-3">
                <p className="text-[11px] uppercase tracking-wide font-semibold text-gray-500 mb-1">
                  Petición de {dialogo.usuario_nombre}
                </p>
                <p className="text-sm text-gray-800">{dialogo.mensaje}</p>
              </div>

              <div className="space-y-2">
                {RESOLUCIONES.map((r) => {
                  const activo = resolucion === r.key;
                  return (
                    <button
                      key={r.key}
                      type="button"
                      onClick={() => setResolucion(r.key)}
                      className={cn(
                        "w-full text-left rounded-md border px-3 py-2.5 transition-colors",
                        activo
                          ? "border-indigo-500 bg-indigo-50 ring-1 ring-indigo-100"
                          : "border-gray-200 hover:bg-gray-50",
                      )}
                    >
                      <p
                        className={cn(
                          "text-sm font-medium",
                          activo ? "text-indigo-700" : "text-gray-800",
                        )}
                      >
                        {r.label}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{r.hint}</p>
                    </button>
                  );
                })}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Comentario
                </label>
                <Textarea
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  placeholder="Explica la decisión: por qué es posible, por qué no lo es, o a quién habría que dirigir esta petición."
                  className="min-h-[110px] text-sm"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={cerrarDialogo} disabled={guardando}>
              Cancelar
            </Button>
            <Button
              onClick={handleGuardar}
              disabled={guardando || !comentario.trim()}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {guardando ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Guardando...
                </>
              ) : (
                "Guardar resolución"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  );
}

export default function PeticionesPage() {
  return (
    <RouteGuard requiredModule="peticiones">
      <PeticionesContent />
    </RouteGuard>
  );
}
