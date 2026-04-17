"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/shared/atom/badge";
import { Button } from "@/components/shared/atom/button";
import { Input } from "@/components/shared/molecule/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/shared/molecule/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/shared/molecule/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/shared/molecule/popover";
import { SearchableSelect } from "@/components/shared/molecule/searchable-select";
import { useToast } from "@/hooks/use-toast";
import { API_BASE_URL } from "@/lib/api-config";
import { ClienteService, TrabajadorService, TrabajosDiariosService } from "@/lib/api-services";
import type { Cliente } from "@/lib/types/feats/customer/cliente-types";
import type {
  TrabajoDiarioArchivo,
  TrabajoDiarioRegistro,
} from "@/lib/types/feats/instalaciones/trabajos-diarios-types";
import { cn } from "@/lib/utils";
import { AlertTriangle, Check, ChevronsUpDown, Clock, Download, Eye, MapPin, User, X } from "lucide-react";

type ViewMode = "tabla" | "fecha" | "cliente";
type ArchivoActionMode = "view" | "download";

type TrabajoArchivoItem = TrabajoDiarioArchivo & {
  etapa: "inicio" | "fin";
};

type Worker = {
  CI?: string;
  nombre?: string;
  is_brigadista?: boolean;
};

const safeText = (value: unknown, fallback = "") => {
  const text = String(value || "").trim();
  return text || fallback;
};

const parseDateForDisplay = (value: string): Date | null => {
  const text = safeText(value);
  if (!text) return null;

  const onlyDateMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (onlyDateMatch) {
    const year = Number(onlyDateMatch[1]);
    const month = Number(onlyDateMatch[2]);
    const day = Number(onlyDateMatch[3]);
    const local = new Date(year, month - 1, day);
    return Number.isNaN(local.getTime()) ? null : local;
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatFechaTrabajo = (value?: string) => {
  const text = safeText(value);
  if (!text) return "Sin fecha";
  const parsed = parseDateForDisplay(text);
  if (!parsed) return text.slice(0, 10);
  return parsed.toLocaleDateString("es-ES");
};

const toDateKey = (value?: string) => {
  const text = safeText(value);
  if (!text) return "sin-fecha";
  return text.slice(0, 10);
};

const formatDateTime = (value?: string) => {
  const text = safeText(value);
  if (!text) return "Sin registro";
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return text;
  return parsed.toLocaleString("es-ES");
};

const formatTime = (value?: string) => {
  const text = safeText(value);
  if (!text) return null;
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
};

const getArchivoName = (archivo: TrabajoArchivoItem) => {
  const byName = safeText(archivo.nombre);
  if (byName) return byName;
  const raw = safeText(archivo.url);
  if (!raw) return "archivo";
  return raw.split("?")[0].split("/").pop() || "archivo";
};

const inferArchivoMime = (archivo: TrabajoArchivoItem) => {
  const mime = safeText(archivo.mime_type).toLowerCase();
  if (mime) return mime;
  if (archivo.tipo === "video") return "video/*";
  if (archivo.tipo === "audio") return "audio/*";
  return "image/*";
};

const isAveria = (trabajo: TrabajoDiarioRegistro) =>
  safeText(trabajo.tipo_trabajo).toUpperCase().includes("AVERIA") ||
  safeText(trabajo.tipo_trabajo).toUpperCase().includes("AVERÍA");

export function TrabajosDiariosTodosView() {
  type FiltroTipo = "" | "hoy" | "semana" | "mes" | "rango" | "fecha";

  const todayStr = () => new Date().toISOString().slice(0, 10);
  const fmtDate = (d: Date) => d.toISOString().slice(0, 10);

  const { toast } = useToast();
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>("");
  const [fechaPersonalizada, setFechaPersonalizada] = useState(todayStr());
  const [rangoDesde, setRangoDesde] = useState(todayStr());
  const [rangoHasta, setRangoHasta] = useState(todayStr());
  const [workerFilterOpen, setWorkerFilterOpen] = useState(false);
  const [trabajadoresSeleccionados, setTrabajadoresSeleccionados] = useState<string[]>([]);
  const [clienteFiltro, setClienteFiltro] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("fecha");
  const [loading, setLoading] = useState(false);
  const [trabajos, setTrabajos] = useState<TrabajoDiarioRegistro[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [detalleOpen, setDetalleOpen] = useState(false);
  const [trabajoDetalle, setTrabajoDetalle] = useState<TrabajoDiarioRegistro | null>(null);
  const [materialesDialogOpen, setMaterialesDialogOpen] = useState(false);

  const workersOptions = useMemo(
    () =>
      (workers || [])
        .filter((w) => Boolean(safeText(w.CI) || safeText(w.nombre)))
        .sort((a, b) => safeText(a.nombre).localeCompare(safeText(b.nombre), "es")),
    [workers],
  );

  const workerMap = useMemo(() => {
    const next = new Map<string, string>();
    workersOptions.forEach((worker) => {
      const ci = safeText(worker.CI);
      const nombre = safeText(worker.nombre) || "Trabajador";
      const value = ci || nombre;
      if (value) next.set(value, nombre);
      if (ci) next.set(ci, nombre);
    });
    return next;
  }, [workersOptions]);

  const formatInstaladorNombre = useCallback(
    (value: string) => {
      const text = safeText(value);
      if (!text) return "Sin instalador";
      return workerMap.get(text) || text;
    },
    [workerMap],
  );

  const selectedWorkerLabels = useMemo(
    () =>
      trabajadoresSeleccionados
        .map((value) => workerMap.get(value) || value)
        .filter(Boolean),
    [trabajadoresSeleccionados, workerMap],
  );

  const trabajadoresFiltroBackend = useMemo(
    () =>
      Array.from(
        new Set(
          trabajadoresSeleccionados
            .map((selected) => {
              const selectedValue = safeText(selected);
              if (!selectedValue) return "";
              const worker = workersOptions.find(
                (w) =>
                  safeText(w.CI) === selectedValue ||
                  safeText(w.nombre) === selectedValue,
              );
              return safeText(worker?.nombre, selectedValue);
            })
            .filter(Boolean),
        ),
      ),
    [trabajadoresSeleccionados, workersOptions],
  );

  const clienteOptions = useMemo(
    () =>
      (clientes || [])
        .map((cliente) => {
          const value = safeText(cliente.numero || cliente.id);
          if (!value) return null;
          const nombre = safeText(cliente.nombre, "Sin nombre");
          const numero = safeText(cliente.numero, "Sin código");
          const direccion = safeText(cliente.direccion, "Sin dirección");
          return { value, label: `${nombre} (${numero}) • ${direccion}` };
        })
        .filter(Boolean) as Array<{ value: string; label: string }>,
    [clientes],
  );

  const selectedClient = useMemo(() => {
    if (!clienteFiltro) return null;
    return clientes.find((cliente) => {
      const numero = safeText(cliente.numero);
      const id = safeText(cliente.id);
      return numero === clienteFiltro || id === clienteFiltro;
    });
  }, [clienteFiltro, clientes]);

  const loadWorkers = useCallback(async () => {
    try {
      const data = await TrabajadorService.getAllTrabajadores();
      setWorkers((data as unknown as Worker[]) || []);
    } catch {
      setWorkers([]);
    }
  }, []);

  const loadClientes = useCallback(async () => {
    setLoadingClientes(true);
    try {
      const response = await ClienteService.getClientes({ limit: 1000 });
      setClientes(response.clients || []);
    } catch {
      setClientes([]);
    } finally {
      setLoadingClientes(false);
    }
  }, []);

  const getFechaFiltro = useCallback((): { fecha?: string; desde?: string; hasta?: string } => {
    const today = new Date();
    if (filtroTipo === "hoy") return { fecha: fmtDate(today) };
    if (filtroTipo === "fecha") return { fecha: fechaPersonalizada };
    if (filtroTipo === "semana") {
      const day = today.getDay();
      const lunes = new Date(today);
      lunes.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
      const domingo = new Date(lunes);
      domingo.setDate(lunes.getDate() + 6);
      return { desde: fmtDate(lunes), hasta: fmtDate(domingo) };
    }
    if (filtroTipo === "mes") {
      const desde = new Date(today.getFullYear(), today.getMonth(), 1);
      const hasta = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return { desde: fmtDate(desde), hasta: fmtDate(hasta) };
    }
    if (filtroTipo === "rango" && rangoDesde && rangoHasta) {
      return { desde: rangoDesde, hasta: rangoHasta };
    }
    return {};
  }, [filtroTipo, fechaPersonalizada, rangoDesde, rangoHasta]);

  const loadTrabajos = useCallback(async () => {
    setLoading(true);
    try {
      const clienteNumeroFiltro = safeText(selectedClient?.numero);
      const clienteIdFiltro = safeText(selectedClient?.id);
      const qClienteFiltro =
        !clienteNumeroFiltro && !clienteIdFiltro ? safeText(clienteFiltro) : "";
      const baseParams = {
        instaladores: trabajadoresFiltroBackend,
        cliente_numero: clienteNumeroFiltro || undefined,
        cliente_id: !clienteNumeroFiltro && clienteIdFiltro ? clienteIdFiltro : undefined,
        q_cliente: !clienteNumeroFiltro && !clienteIdFiltro && qClienteFiltro ? qClienteFiltro : undefined,
        incluir_cerrados: true,
      };

      const filtro = getFechaFiltro();

      let rows: TrabajoDiarioRegistro[];
      if (filtroTipo === "hoy") {
        rows = await TrabajosDiariosService.getTrabajos({ fecha: filtro.fecha!, ...baseParams });
      } else {
        rows = await TrabajosDiariosService.getTrabajosTodos(baseParams);
        if (filtro.fecha) {
          rows = rows.filter((t) => {
            const d = safeText(t.fecha_trabajo || t.fecha || t.created_at).slice(0, 10);
            return d === filtro.fecha;
          });
        } else if (filtro.desde && filtro.hasta) {
          rows = rows.filter((t) => {
            const d = safeText(t.fecha_trabajo || t.fecha || t.created_at).slice(0, 10);
            return d >= filtro.desde! && d <= filtro.hasta!;
          });
        }
      }

      setTrabajos((rows || []).filter((t) => t.cierre_diario_confirmado === true));
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudieron cargar los trabajos diarios";
      toast({ title: "Error", description: message, variant: "destructive" });
      setTrabajos([]);
    } finally {
      setLoading(false);
    }
  }, [
    getFechaFiltro,
    selectedClient?.id,
    selectedClient?.numero,
    toast,
    trabajadoresFiltroBackend,
    clienteFiltro,
  ]);

  useEffect(() => {
    void Promise.all([loadWorkers(), loadClientes()]);
  }, [loadWorkers, loadClientes]);

  useEffect(() => {
    void loadTrabajos();
  }, [loadTrabajos]);

  const toggleTrabajador = (value: string) => {
    setTrabajadoresSeleccionados((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value],
    );
  };

  const openDetalle = (trabajo: TrabajoDiarioRegistro) => {
    setTrabajoDetalle(trabajo);
    setDetalleOpen(true);
  };

  const archivosTrabajo = useMemo<TrabajoArchivoItem[]>(() => {
    if (!trabajoDetalle) return [];
    const inicio = (trabajoDetalle.inicio?.archivos || []).map((archivo) => ({
      ...archivo,
      etapa: "inicio" as const,
    }));
    const fin = (trabajoDetalle.fin?.archivos || []).map((archivo) => ({
      ...archivo,
      etapa: "fin" as const,
    }));
    return [...inicio, ...fin];
  }, [trabajoDetalle]);

  const archivosInicio = useMemo(
    () => archivosTrabajo.filter((archivo) => archivo.etapa === "inicio"),
    [archivosTrabajo],
  );

  const archivosFin = useMemo(
    () => archivosTrabajo.filter((archivo) => archivo.etapa === "fin"),
    [archivosTrabajo],
  );

  const getArchivoUrlCandidates = (archivo: TrabajoArchivoItem) => {
    const raw = safeText(archivo.url);
    if (!raw) return [];

    const apiOrigin = API_BASE_URL.replace(/\/api\/?$/, "");
    const apiBase = API_BASE_URL.replace(/\/+$/, "");
    const fileName = raw.split("?")[0].split("/").pop() || getArchivoName(archivo);
    const candidates: string[] = [];

    const push = (value: string) => {
      if (!value) return;
      if (!candidates.includes(value)) candidates.push(value);
    };

    if (/^https?:\/\//i.test(raw)) {
      push(raw);
    } else if (raw.startsWith("/")) {
      push(`${apiOrigin}${raw}`);
      if (!raw.startsWith("/api/")) {
        push(`${apiBase}${raw}`);
      }
    } else {
      push(`${apiOrigin}/${raw}`);
      push(`${apiBase}/${raw}`);
      push(`${apiOrigin}/uploads/${encodeURIComponent(fileName)}`);
      push(`${apiOrigin}/uploads/trabajos-diarios/${encodeURIComponent(fileName)}`);
    }

    return candidates;
  };

  const getArchivoPreviewUrl = (archivo: TrabajoArchivoItem) => {
    const candidates = getArchivoUrlCandidates(archivo);
    return candidates.find((candidate) => /^https?:\/\//i.test(candidate)) || "";
  };

  const openBlobFromResponse = async (
    response: Response,
    archivo: TrabajoArchivoItem,
    mode: ArchivoActionMode,
  ) => {
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("text/html")) {
      throw new Error("El servidor devolvió HTML en lugar del archivo.");
    }
    const blob = await response.blob();
    if (!blob || blob.size === 0) {
      throw new Error("El archivo llegó vacío.");
    }
    const blobUrl = URL.createObjectURL(blob);
    if (mode === "view") {
      window.open(blobUrl, "_blank", "noopener,noreferrer");
    } else {
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = getArchivoName(archivo);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
  };

  const handleArchivoAction = async (
    archivo: TrabajoArchivoItem,
    mode: ArchivoActionMode,
  ) => {
    try {
      const candidates = getArchivoUrlCandidates(archivo);
      if (candidates.length === 0) {
        throw new Error("No hay URL disponible para este archivo.");
      }

      const token = localStorage.getItem("auth_token") || "";
      const attemptErrors: string[] = [];

      for (const candidate of candidates) {
        try {
          const response = await fetch(candidate, {
            method: "GET",
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          if (response.ok) {
            await openBlobFromResponse(response, archivo, mode);
            return;
          }
          attemptErrors.push(`${candidate} -> ${response.status}`);
        } catch {
          attemptErrors.push(`${candidate} -> error con token`);
        }

        try {
          const response = await fetch(candidate, { method: "GET" });
          if (response.ok) {
            await openBlobFromResponse(response, archivo, mode);
            return;
          }
          attemptErrors.push(`${candidate} -> ${response.status} (sin token)`);
        } catch {
          attemptErrors.push(`${candidate} -> error sin token`);
        }
      }

      throw new Error(
        `No se pudo abrir/descargar el archivo. Intentos: ${attemptErrors.slice(0, 3).join(" | ")}`,
      );
    } catch (error) {
      toast({
        title:
          mode === "download"
            ? "No se pudo descargar el archivo"
            : "No se pudo abrir el archivo",
        description:
          error instanceof Error
            ? error.message
            : "Intenta nuevamente. Si persiste, verifica permisos.",
        variant: "destructive",
      });
    }
  };

  const renderFotosGrid = (archivos: TrabajoArchivoItem[]) => {
    if (archivos.length === 0) {
      return (
        <p className="text-sm text-slate-400 italic py-2">Sin fotos o videos registrados</p>
      );
    }

    const gridCols =
      archivos.length === 1
        ? "grid-cols-1"
        : archivos.length === 2
          ? "grid-cols-2"
          : "grid-cols-2 sm:grid-cols-3";

    return (
      <div className={`grid ${gridCols} gap-3 mt-3`}>
        {archivos.map((archivo) => {
          const previewUrl = getArchivoPreviewUrl(archivo);
          const mime = inferArchivoMime(archivo);
          const isImage = mime.startsWith("image/") || archivo.tipo === "imagen";
          const isVideo = mime.startsWith("video/") || archivo.tipo === "video";
          const imgHeight = archivos.length === 1 ? "h-64 sm:h-80" : "h-40 sm:h-52";

          return (
            <div
              key={`${archivo.etapa}-${archivo.id}`}
              className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50 shadow-sm"
            >
              <div className={`relative bg-slate-100 ${imgHeight} flex items-center justify-center`}>
                {previewUrl ? (
                  isImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewUrl}
                      alt={getArchivoName(archivo)}
                      className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => void handleArchivoAction(archivo, "view")}
                    />
                  ) : isVideo ? (
                    <video src={previewUrl} controls className="w-full h-full object-contain" />
                  ) : (
                    <p className="text-xs text-slate-500 text-center px-2">Sin vista previa</p>
                  )
                ) : (
                  <p className="text-xs text-slate-400 text-center px-2">URL no disponible</p>
                )}
              </div>
              <div className="flex items-center justify-between px-3 py-2 bg-white border-t border-slate-100">
                <p className="text-xs text-slate-500 truncate max-w-[60%]">
                  {getArchivoName(archivo)}
                </p>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-slate-600 hover:text-slate-900"
                    onClick={() => void handleArchivoAction(archivo, "view")}
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-slate-600 hover:text-slate-900"
                    onClick={() => void handleArchivoAction(archivo, "download")}
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const trabajosNormalizados = useMemo(() => {
    return (trabajos || []).map((trabajo, index) => {
      const fechaRaw = safeText(
        trabajo.fecha_trabajo || trabajo.fecha || trabajo.created_at,
      );
      const fechaKey = toDateKey(fechaRaw);
      const fechaLabel = formatFechaTrabajo(fechaRaw);
      const clienteNombre = safeText(trabajo.cliente_nombre, "Sin cliente");
      const clienteNumero = safeText(trabajo.cliente_numero, "Sin código");
      const clienteId = safeText(trabajo.cliente_id, "sin-id");
      const clienteKey =
        safeText(trabajo.cliente_numero) ||
        safeText(trabajo.cliente_id) ||
        safeText(trabajo.cliente_nombre) ||
        "sin-cliente";
      const instaladores = (trabajo.instaladores || []).filter(Boolean);
      const tipo = safeText(trabajo.tipo_trabajo, "Sin tipo");
      const inicio = safeText(trabajo.inicio?.fecha);
      const fin = safeText(trabajo.fin?.fecha);
      return {
        id: safeText(trabajo.id, `trabajo-${index}`),
        trabajo,
        fechaKey,
        fechaLabel,
        fechaRaw,
        clienteKey,
        clienteNombre,
        clienteNumero,
        clienteId,
        instaladores,
        tipo,
        inicio,
        fin,
      };
    });
  }, [trabajos]);

  const trabajosOrdenados = useMemo(
    () =>
      [...trabajosNormalizados].sort((a, b) =>
        b.fechaKey.localeCompare(a.fechaKey),
      ),
    [trabajosNormalizados],
  );

  const gruposPorFecha = useMemo(() => {
    const map = new Map<string, typeof trabajosOrdenados>();
    trabajosOrdenados.forEach((row) => {
      if (!map.has(row.fechaKey)) map.set(row.fechaKey, []);
      map.get(row.fechaKey)?.push(row);
    });
    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([fechaKey, rows]) => ({
        fechaKey,
        fechaLabel: formatFechaTrabajo(rows[0]?.fechaRaw || fechaKey),
        rows,
      }));
  }, [trabajosOrdenados]);

  const gruposPorCliente = useMemo(() => {
    const clientMap = new Map<string, typeof trabajosOrdenados>();
    trabajosOrdenados.forEach((row) => {
      if (!clientMap.has(row.clienteKey)) clientMap.set(row.clienteKey, []);
      clientMap.get(row.clienteKey)?.push(row);
    });

    return Array.from(clientMap.entries())
      .map(([clienteKey, rows]) => {
        const porFechaMap = new Map<string, typeof rows>();
        rows.forEach((row) => {
          if (!porFechaMap.has(row.fechaKey)) porFechaMap.set(row.fechaKey, []);
          porFechaMap.get(row.fechaKey)?.push(row);
        });
        const porFecha = Array.from(porFechaMap.entries())
          .sort((a, b) => b[0].localeCompare(a[0]))
          .map(([fechaKey, fechaRows]) => ({
            fechaKey,
            fechaLabel: formatFechaTrabajo(fechaRows[0]?.fechaRaw || fechaKey),
            rows: fechaRows,
          }));

        const rowsOrdenados = [...rows].sort((a, b) => b.fechaKey.localeCompare(a.fechaKey));
        const first = rowsOrdenados[0];
        const terminados = rowsOrdenados.filter((r) => r.trabajo.instalacion_terminada).length;
        const pendientes = rowsOrdenados.length - terminados;
        return {
          clienteKey,
          clienteNombre: first?.clienteNombre || "Sin cliente",
          clienteNumero: first?.clienteNumero || "Sin código",
          clienteId: first?.clienteId || "sin-id",
          clienteDireccion: safeText(first?.trabajo.cliente_direccion, "Sin dirección"),
          rows: rowsOrdenados,
          porFecha,
          terminados,
          pendientes,
        };
      })
      .sort((a, b) => a.clienteNombre.localeCompare(b.clienteNombre, "es"));
  }, [trabajosOrdenados]);

  const EstadoBadge = ({ terminada }: { terminada?: boolean }) =>
    terminada ? (
      <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 text-[11px] font-medium">
        Terminada
      </Badge>
    ) : (
      <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 text-[11px] font-medium">
        Pendiente
      </Badge>
    );

  return (
    <div className="space-y-4">
      {/* Filtros — fila única */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            {/* Presets de periodo */}
            {(["hoy", "semana", "mes", "fecha", "rango"] as const).map((tipo) => (
              <Button
                key={tipo}
                type="button"
                size="sm"
                variant={filtroTipo === tipo ? "default" : "outline"}
                onClick={() => setFiltroTipo(tipo)}
              >
                {tipo === "hoy" && "Hoy"}
                {tipo === "semana" && "Esta semana"}
                {tipo === "mes" && "Este mes"}
                {tipo === "fecha" && "Fecha"}
                {tipo === "rango" && "Rango"}
              </Button>
            ))}
            {filtroTipo !== "" && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-slate-400 hover:text-slate-700"
                onClick={() => setFiltroTipo("")}
              >
                Todos
              </Button>
            )}

            {/* Input fecha individual */}
            {filtroTipo === "fecha" && (
              <Input
                type="date"
                value={fechaPersonalizada}
                onChange={(e) => setFechaPersonalizada(e.target.value)}
                className="w-40"
              />
            )}

            {/* Inputs rango */}
            {filtroTipo === "rango" && (
              <>
                <Input
                  type="date"
                  value={rangoDesde}
                  onChange={(e) => setRangoDesde(e.target.value)}
                  className="w-40"
                />
                <span className="text-sm text-slate-400">—</span>
                <Input
                  type="date"
                  value={rangoHasta}
                  onChange={(e) => setRangoHasta(e.target.value)}
                  className="w-40"
                />
              </>
            )}

            {/* Separador visual */}
            <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block" />

            {/* Instaladores */}
            <Popover open={workerFilterOpen} onOpenChange={setWorkerFilterOpen}>
              <PopoverTrigger asChild>
                <Button type="button" size="sm" variant="outline" role="combobox" className="justify-between min-w-[150px]">
                  <span className="truncate text-left">
                    {selectedWorkerLabels.length > 0
                      ? `${selectedWorkerLabels.length} instalador(es)`
                      : "Instaladores"}
                  </span>
                  <ChevronsUpDown className="h-3.5 w-3.5 ml-1 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar trabajador..." />
                  <CommandList>
                    <CommandEmpty>No se encontraron trabajadores.</CommandEmpty>
                    <CommandGroup>
                      {workersOptions.map((worker, index) => {
                        const ci = safeText(worker.CI);
                        const nombre = safeText(worker.nombre) || "Trabajador";
                        const value = ci || nombre;
                        const selected = trabajadoresSeleccionados.includes(value);
                        return (
                          <CommandItem
                            key={`${value}-${index}`}
                            value={`${value} ${nombre}`}
                            onSelect={() => toggleTrabajador(value)}
                          >
                            <Check className={cn("mr-2 h-4 w-4", selected ? "opacity-100" : "opacity-0")} />
                            {nombre}
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {/* Cliente */}
            <div className="min-w-[200px] flex-1 max-w-xs">
              <SearchableSelect
                options={clienteOptions}
                value={clienteFiltro}
                onValueChange={setClienteFiltro}
                placeholder={loadingClientes ? "Cargando..." : "Cliente"}
                searchPlaceholder="Nombre, código o dirección..."
                disabled={loadingClientes}
                className="w-full"
                truncateSelected={false}
                truncateOptions={false}
              />
            </div>

            {/* Acciones */}
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0"
              onClick={() => {
                setFiltroTipo("");
                setClienteFiltro("");
                setTrabajadoresSeleccionados([]);
              }}
              disabled={!clienteFiltro && filtroTipo === "" && trabajadoresSeleccionados.length === 0}
            >
              <X className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void loadTrabajos()}
              disabled={loading}
              className="shrink-0"
            >
              {loading ? "..." : "Actualizar"}
            </Button>
          </div>

          {/* Chips de instaladores seleccionados */}
          {selectedWorkerLabels.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {selectedWorkerLabels.map((label, index) => (
                <Badge key={`${label}-${index}`} variant="outline" className="gap-1 text-xs">
                  <span className="max-w-[180px] truncate">{label}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const value = trabajadoresSeleccionados[index];
                      if (value) toggleTrabajador(value);
                    }}
                    className="text-slate-400 hover:text-slate-800"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contenido principal */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <CardTitle className="text-base">
              Todos los trabajos diarios ({trabajos.length})
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={viewMode === "tabla" ? "default" : "outline"}
                onClick={() => setViewMode("tabla")}
              >
                Tabla
              </Button>
              <Button
                type="button"
                size="sm"
                variant={viewMode === "fecha" ? "default" : "outline"}
                onClick={() => setViewMode("fecha")}
              >
                Por fecha
              </Button>
              <Button
                type="button"
                size="sm"
                variant={viewMode === "cliente" ? "default" : "outline"}
                onClick={() => setViewMode("cliente")}
              >
                Por cliente
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Cargando trabajos...</p>
          ) : trabajos.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No hay trabajos diarios para los filtros seleccionados.
            </p>
          ) : viewMode === "tabla" ? (
            /* ── VISTA TABLA ── */
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-[860px] text-sm">
                <thead className="bg-slate-50 text-slate-600 border-b">
                  <tr>
                    <th className="text-left px-3 py-2.5 font-semibold w-[90px]">Fecha</th>
                    <th className="text-left px-3 py-2.5 font-semibold min-w-[200px]">Cliente</th>
                    <th className="text-left px-3 py-2.5 font-semibold min-w-[140px]">Instaladores</th>
                    <th className="text-left px-3 py-2.5 font-semibold min-w-[240px]">Instalación</th>
                    <th className="text-left px-3 py-2.5 font-semibold w-[100px]">Estado</th>
                    <th className="px-3 py-2.5 w-[60px]" />
                  </tr>
                </thead>
                <tbody>
                  {trabajosOrdenados.map((row) => {
                    const { trabajo, instaladores, tipo, fechaLabel } = row;
                    const inicioComentario = safeText(trabajo.inicio?.comentario);
                    const finComentario = safeText(trabajo.fin?.comentario);
                    const averia = isAveria(trabajo);

                    return (
                      <tr key={row.id} className="align-top border-t-2 border-slate-200 hover:bg-slate-50 transition-colors">
                        <td className="px-3 py-3 text-slate-600 whitespace-nowrap text-xs">
                          {fechaLabel}
                        </td>

                        <td className="px-3 py-3">
                          <p className="font-semibold text-slate-900 leading-tight">
                            {row.clienteNombre}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">{row.clienteNumero}</p>
                          <p className="text-xs text-slate-500 mt-0.5 flex items-start gap-1">
                            <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                            <span className="line-clamp-2">{safeText(trabajo.cliente_direccion, "Sin dirección")}</span>
                          </p>
                        </td>

                        <td className="px-3 py-3">
                          {instaladores.length > 0 ? (
                            <div className="space-y-0.5">
                              {instaladores.map((item, i) => (
                                <p key={i} className="text-xs text-slate-700 flex items-center gap-1">
                                  <User className="h-3 w-3 text-slate-400 shrink-0" />
                                  {formatInstaladorNombre(item)}
                                </p>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400">Sin instaladores</p>
                          )}
                        </td>

                        <td className="px-3 py-3">
                          <p className={cn(
                            "text-xs font-semibold mb-1.5",
                            averia ? "text-red-700" : "text-slate-600",
                          )}>
                            {tipo}
                          </p>
                          {averia ? (
                            <>
                              {safeText(trabajo.problema_encontrado) && (
                                <p className="text-xs text-red-600">
                                  <span className="font-medium">Problema:</span>{" "}
                                  {trabajo.problema_encontrado}
                                </p>
                              )}
                              {safeText(trabajo.solucion) && (
                                <p className="text-xs text-slate-600 mt-0.5">
                                  <span className="font-medium">Solución:</span>{" "}
                                  {trabajo.solucion}
                                </p>
                              )}
                            </>
                          ) : (
                            <>
                              {inicioComentario && (
                                <p className="text-xs text-slate-600">
                                  <span className="font-medium text-slate-700">Inicio:</span>{" "}
                                  {inicioComentario}
                                </p>
                              )}
                              {finComentario && (
                                <p className="text-xs text-slate-600 mt-0.5">
                                  <span className="font-medium text-slate-700">Fin:</span>{" "}
                                  {finComentario}
                                </p>
                              )}
                            </>
                          )}
                        </td>

                        <td className="px-3 py-3">
                          <EstadoBadge terminada={trabajo.instalacion_terminada} />
                        </td>

                        <td className="px-3 py-3">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() => openDetalle(trabajo)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : viewMode === "fecha" ? (
            /* ── VISTA POR FECHA ── */
            <div className="space-y-6">
              {gruposPorFecha.map((group) => (
                <div key={group.fechaKey}>
                  {/* Cabecera de fecha */}
                  <div className="flex items-baseline gap-3 mb-2 pb-1.5 border-b-2 border-slate-800">
                    <p className="font-bold text-slate-900 text-base">{group.fechaLabel}</p>
                    <p className="text-xs text-slate-400">{group.rows.length} trabajo{group.rows.length !== 1 ? "s" : ""}</p>
                  </div>

                  {/* Filas de trabajos */}
                  <div className="divide-y divide-slate-200">
                    {group.rows.map((row) => {
                      const { trabajo, instaladores } = row;
                      const averia = isAveria(trabajo);
                      const pendiente = safeText(trabajo.queda_pendiente);
                      const finComentario = safeText(trabajo.fin?.comentario);

                      return (
                        <div key={row.id} className="py-3 flex items-start gap-4">
                          {/* Barra lateral por tipo de trabajo */}
                          <div className={cn(
                            "w-1 self-stretch rounded-full shrink-0 mt-0.5",
                            averia
                              ? "bg-red-400"
                              : row.tipo.toUpperCase().includes("NUEVA")
                                ? "bg-orange-400"
                                : row.tipo.toUpperCase().includes("PROCESO")
                                  ? "bg-blue-400"
                                  : row.tipo.toUpperCase().includes("TERMINAD")
                                    ? "bg-emerald-400"
                                    : row.tipo.toUpperCase().includes("ACTUALIZ")
                                      ? "bg-violet-500"
                                      : "bg-slate-400",
                          )} />

                          <div className="flex-1 min-w-0">
                            {/* Línea 1: nombre + código + tipo + estado */}
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <p className="font-semibold text-slate-900 text-sm">{row.clienteNombre}</p>
                              <p className="text-xs text-slate-400">{row.clienteNumero}</p>
                              <p className="text-xs text-slate-500">· {row.tipo}</p>
                              <EstadoBadge terminada={trabajo.instalacion_terminada} />
                            </div>

                            {/* Línea 2: dirección + instaladores */}
                            <p className="text-xs text-slate-500 mt-0.5">
                              {safeText(trabajo.cliente_direccion, "Sin dirección")}
                              {instaladores.length > 0 && (
                                <span className="text-slate-400">
                                  {" · "}{instaladores.map((i) => formatInstaladorNombre(i)).join(", ")}
                                </span>
                              )}
                            </p>

                            {/* Comentario de fin o avería */}
                            {averia ? (
                              <div className="mt-1 text-xs space-y-0.5">
                                {safeText(trabajo.problema_encontrado) && (
                                  <p className="text-red-600">
                                    <span className="font-medium">Problema:</span> {trabajo.problema_encontrado}
                                  </p>
                                )}
                                {safeText(trabajo.solucion) && (
                                  <p className="text-slate-600">
                                    <span className="font-medium">Solución:</span> {trabajo.solucion}
                                  </p>
                                )}
                              </div>
                            ) : finComentario ? (
                              <p className="text-xs text-slate-600 mt-1">
                                <span className="font-medium">Fin:</span> {finComentario}
                              </p>
                            ) : null}

                            {/* Pendiente */}
                            {pendiente && (
                              <p className="text-xs text-amber-700 mt-1">
                                <AlertTriangle className="h-3 w-3 inline mr-0.5 -mt-0.5" />
                                {pendiente}
                              </p>
                            )}
                          </div>

                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 shrink-0 text-slate-400 hover:text-slate-700"
                            onClick={() => openDetalle(trabajo)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* ── VISTA POR CLIENTE ── */
            <div className="space-y-6">
              {gruposPorCliente.map((group) => (
                <div key={group.clienteKey}>
                  {/* Cabecera del cliente */}
                  <div className="flex items-baseline gap-3 mb-2 pb-1.5 border-b-2 border-slate-800">
                    <p className="font-bold text-slate-900 text-base">{group.clienteNombre}</p>
                    <p className="text-xs text-slate-400">{group.clienteNumero}</p>
                    <p className="text-xs text-slate-400 hidden sm:inline">{group.clienteDireccion}</p>
                    <p className="text-xs text-slate-400 ml-auto">{group.rows.length} trabajo{group.rows.length !== 1 ? "s" : ""}</p>
                  </div>

                  {/* Filas de trabajos */}
                  <div className="divide-y divide-slate-200">
                    {group.rows.map((row) => {
                      const { trabajo, instaladores } = row;
                      const averia = isAveria(trabajo);
                      const pendiente = safeText(trabajo.queda_pendiente);
                      const finComentario = safeText(trabajo.fin?.comentario);

                      return (
                        <div key={row.id} className="py-3 flex items-start gap-4">
                          {/* Barra lateral por tipo */}
                          <div className={cn(
                            "w-1 self-stretch rounded-full shrink-0 mt-0.5",
                            averia
                              ? "bg-red-400"
                              : row.tipo.toUpperCase().includes("NUEVA")
                                ? "bg-orange-400"
                                : row.tipo.toUpperCase().includes("PROCESO")
                                  ? "bg-blue-400"
                                  : row.tipo.toUpperCase().includes("TERMINAD")
                                    ? "bg-emerald-400"
                                    : row.tipo.toUpperCase().includes("ACTUALIZ")
                                      ? "bg-violet-500"
                                      : "bg-slate-400",
                          )} />

                          <div className="flex-1 min-w-0">
                            {/* Línea 1: fecha + tipo + estado */}
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <p className="text-xs font-semibold text-slate-600">{row.fechaLabel}</p>
                              <p className="text-xs text-slate-500">· {row.tipo}</p>
                              <EstadoBadge terminada={trabajo.instalacion_terminada} />
                            </div>

                            {/* Línea 2: instaladores */}
                            {instaladores.length > 0 && (
                              <p className="text-xs text-slate-500 mt-0.5">
                                {instaladores.map((i) => formatInstaladorNombre(i)).join(", ")}
                              </p>
                            )}

                            {/* Comentario de fin o avería */}
                            {averia ? (
                              <div className="mt-1 text-xs space-y-0.5">
                                {safeText(trabajo.problema_encontrado) && (
                                  <p className="text-red-600">
                                    <span className="font-medium">Problema:</span> {trabajo.problema_encontrado}
                                  </p>
                                )}
                                {safeText(trabajo.solucion) && (
                                  <p className="text-slate-600">
                                    <span className="font-medium">Solución:</span> {trabajo.solucion}
                                  </p>
                                )}
                              </div>
                            ) : finComentario ? (
                              <p className="text-xs text-slate-600 mt-1">
                                <span className="font-medium">Fin:</span> {finComentario}
                              </p>
                            ) : null}

                            {/* Pendiente */}
                            {pendiente && (
                              <p className="text-xs text-amber-700 mt-1">
                                <AlertTriangle className="h-3 w-3 inline mr-0.5 -mt-0.5" />
                                {pendiente}
                              </p>
                            )}
                          </div>

                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 shrink-0 text-slate-400 hover:text-slate-700"
                            onClick={() => openDetalle(trabajo)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── DIALOG DE DETALLE ── */}
      <Dialog open={detalleOpen} onOpenChange={setDetalleOpen}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-0">
          {trabajoDetalle ? (
            <>
              {/* Header del dialog */}
              <div className="bg-slate-800 px-6 py-4 rounded-t-lg">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-white min-w-0">
                    <p className="font-bold text-lg leading-tight">
                      {safeText(trabajoDetalle.cliente_nombre, "Sin cliente")}
                    </p>
                    <p className="text-slate-300 text-sm mt-0.5 flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      {safeText(trabajoDetalle.cliente_direccion, "Sin dirección")}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <p className="text-slate-300 text-sm">
                      {formatFechaTrabajo(
                        safeText(
                          trabajoDetalle.fecha_trabajo ||
                            trabajoDetalle.fecha ||
                            trabajoDetalle.created_at,
                        ),
                      )}
                    </p>
                    <div className="flex gap-1.5">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] border-slate-500 text-slate-200",
                          isAveria(trabajoDetalle) && "border-red-400 text-red-300",
                        )}
                      >
                        {safeText(trabajoDetalle.tipo_trabajo, "Sin tipo")}
                      </Badge>
                      {trabajoDetalle.instalacion_terminada ? (
                        <Badge className="bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20 text-[10px]">
                          Terminada
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-500/20 text-amber-300 hover:bg-amber-500/20 text-[10px]">
                          Pendiente
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-6 py-5 space-y-5">
                {/* Instaladores */}
                {(trabajoDetalle.instaladores || []).length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Instaladores
                    </span>
                    {(trabajoDetalle.instaladores || []).map((item, i) => (
                      <Badge
                        key={i}
                        variant="secondary"
                        className="text-xs gap-1"
                      >
                        <User className="h-3 w-3" />
                        {formatInstaladorNombre(item)}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* ── INICIO ── */}
                {safeText(trabajoDetalle.inicio?.comentario) || archivosInicio.length > 0 ? (
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <div className="bg-slate-50 px-4 py-2.5 flex items-center justify-between border-b border-slate-200">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        <span className="font-semibold text-slate-800 text-sm">Inicio</span>
                      </div>
                      {trabajoDetalle.inicio?.fecha && (
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDateTime(trabajoDetalle.inicio.fecha)}
                        </span>
                      )}
                    </div>
                    <div className="px-4 py-4 space-y-3">
                      {safeText(trabajoDetalle.inicio?.comentario) && (
                        <p className="text-sm text-slate-800 leading-relaxed bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5">
                          {trabajoDetalle.inicio?.comentario}
                        </p>
                      )}
                      {renderFotosGrid(archivosInicio)}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-300 inline-block shrink-0" />
                    Inicio: Sin comentario ni fotos
                  </p>
                )}

                {/* ── FIN ── */}
                {safeText(trabajoDetalle.fin?.comentario) || archivosFin.length > 0 ? (
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <div className="bg-slate-50 px-4 py-2.5 flex items-center justify-between border-b border-slate-200">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="font-semibold text-slate-800 text-sm">Fin</span>
                      </div>
                      {trabajoDetalle.fin?.fecha && (
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDateTime(trabajoDetalle.fin.fecha)}
                        </span>
                      )}
                    </div>
                    <div className="px-4 py-4 space-y-3">
                      {safeText(trabajoDetalle.fin?.comentario) && (
                        <p className="text-sm text-slate-800 leading-relaxed bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2.5">
                          {trabajoDetalle.fin?.comentario}
                        </p>
                      )}
                      {renderFotosGrid(archivosFin)}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 inline-block shrink-0" />
                    Fin: Sin comentario ni fotos
                  </p>
                )}

                {/* ── AVERÍA: Problema y Solución ── */}
                {isAveria(trabajoDetalle) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                      <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-1.5">
                        Problema encontrado
                      </p>
                      <p className="text-sm text-red-800 leading-relaxed">
                        {safeText(trabajoDetalle.problema_encontrado, "No registrado")}
                      </p>
                    </div>
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                      <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-1.5">
                        Solución aplicada
                      </p>
                      <p className="text-sm text-emerald-800 leading-relaxed">
                        {safeText(trabajoDetalle.solucion, "No registrada")}
                      </p>
                    </div>
                  </div>
                )}

                {/* ── PENDIENTE ── */}
                {safeText(trabajoDetalle.queda_pendiente) && (
                  <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-0.5">
                        Queda pendiente
                      </p>
                      <p className="text-sm text-amber-800 leading-relaxed">
                        {trabajoDetalle.queda_pendiente}
                      </p>
                    </div>
                  </div>
                )}

                {/* ── Materiales (colapsado) ── */}
                {(trabajoDetalle.materiales_utilizados || []).length > 0 && (
                  <div className="rounded-xl border border-slate-200">
                    <button
                      type="button"
                      className="w-full flex items-center justify-between px-4 py-3 text-left"
                      onClick={() => setMaterialesDialogOpen(true)}
                    >
                      <span className="text-sm font-semibold text-slate-700">
                        Materiales utilizados ({(trabajoDetalle.materiales_utilizados || []).length})
                      </span>
                      <span className="text-xs text-slate-400 underline">Ver lista</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Footer del dialog */}
              <div className="px-6 pb-5">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setDetalleOpen(false)}
                >
                  Cerrar
                </Button>
              </div>
            </>
          ) : null}

          {/* Header oculto para accesibilidad */}
          <DialogHeader className="sr-only">
            <DialogTitle>Detalle de trabajo diario</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      {/* ── DIALOG MATERIALES ── */}
      <Dialog open={materialesDialogOpen} onOpenChange={setMaterialesDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Materiales utilizados</DialogTitle>
          </DialogHeader>
          {!trabajoDetalle || (trabajoDetalle.materiales_utilizados || []).length === 0 ? (
            <p className="text-sm text-slate-600">Sin materiales registrados.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-sm">
                <thead className="bg-slate-50 text-slate-600 border-b">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold">Código</th>
                    <th className="text-left px-3 py-2 font-semibold">Nombre</th>
                    <th className="text-right px-3 py-2 font-semibold">Cantidad</th>
                    <th className="text-center px-3 py-2 font-semibold">En servicio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(trabajoDetalle.materiales_utilizados || []).map((material, idx) => (
                    <tr key={`${material.id_material}-${idx}`}>
                      <td className="px-3 py-2 text-slate-600">
                        {safeText(
                          material.codigo_material || material.material_codigo,
                          safeText(material.id_material),
                        )}
                      </td>
                      <td className="px-3 py-2">{safeText(material.nombre, "Material")}</td>
                      <td className="px-3 py-2 text-right">
                        {Number(material.cantidad_utilizada || 0)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {material.en_servicio ? (
                          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 text-[10px]">
                            Sí
                          </Badge>
                        ) : (
                          <span className="text-slate-400 text-xs">No</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
