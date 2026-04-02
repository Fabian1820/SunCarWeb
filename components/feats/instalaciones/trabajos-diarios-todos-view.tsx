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
import { Check, ChevronsUpDown, Eye, X } from "lucide-react";

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

const formatFechaTrabajo = (value?: string) => {
  const text = safeText(value);
  if (!text) return "Sin fecha";
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return text.slice(0, 10);
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

const getTrabajoEstado = (trabajo: TrabajoDiarioRegistro) =>
  trabajo.instalacion_terminada ? "Terminada" : "Pendiente";

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

export function TrabajosDiariosTodosView() {
  const { toast } = useToast();
  const [fecha, setFecha] = useState("");
  const [workerFilterOpen, setWorkerFilterOpen] = useState(false);
  const [trabajadoresSeleccionados, setTrabajadoresSeleccionados] = useState<string[]>([]);
  const [clienteFiltro, setClienteFiltro] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("tabla");
  const [loading, setLoading] = useState(false);
  const [trabajos, setTrabajos] = useState<TrabajoDiarioRegistro[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [detalleOpen, setDetalleOpen] = useState(false);
  const [trabajoDetalle, setTrabajoDetalle] = useState<TrabajoDiarioRegistro | null>(
    null,
  );
  const [archivosDialogOpen, setArchivosDialogOpen] = useState(false);

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
      const label = ci ? `${nombre} (${ci})` : nombre;
      if (value) next.set(value, label);
    });
    return next;
  }, [workersOptions]);

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

  const loadTrabajos = useCallback(async () => {
    setLoading(true);
    try {
      const clienteNumeroFiltro = safeText(selectedClient?.numero);
      const clienteIdFiltro = safeText(selectedClient?.id);
      const qClienteFiltro =
        !clienteNumeroFiltro && !clienteIdFiltro ? safeText(clienteFiltro) : "";

      const rows = fecha
        ? await TrabajosDiariosService.getTrabajos({
            fecha,
            instaladores: trabajadoresFiltroBackend,
            cliente_numero: clienteNumeroFiltro || undefined,
            cliente_id:
              !clienteNumeroFiltro && clienteIdFiltro ? clienteIdFiltro : undefined,
            q_cliente:
              !clienteNumeroFiltro && !clienteIdFiltro && qClienteFiltro
                ? qClienteFiltro
                : undefined,
            incluir_cerrados: true,
          })
        : await TrabajosDiariosService.getTrabajosTodos({
            instaladores: trabajadoresFiltroBackend,
            cliente_numero: clienteNumeroFiltro || undefined,
            cliente_id:
              !clienteNumeroFiltro && clienteIdFiltro ? clienteIdFiltro : undefined,
            q_cliente:
              !clienteNumeroFiltro && !clienteIdFiltro && qClienteFiltro
                ? qClienteFiltro
                : undefined,
            incluir_cerrados: true,
          });
      setTrabajos(rows || []);
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
    fecha,
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

        const first = rows[0];
        return {
          clienteKey,
          clienteNombre: first?.clienteNombre || "Sin cliente",
          clienteNumero: first?.clienteNumero || "Sin código",
          clienteId: first?.clienteId || "sin-id",
          rows,
          porFecha,
        };
      })
      .sort((a, b) => a.clienteNombre.localeCompare(b.clienteNombre, "es"));
  }, [trabajosOrdenados]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4 items-start">
            <div className="lg:col-span-3">
              <Input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
              />
            </div>

            <div className="lg:col-span-3">
              <Popover open={workerFilterOpen} onOpenChange={setWorkerFilterOpen}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" role="combobox" className="w-full justify-between">
                    <span className="truncate text-left">
                      {selectedWorkerLabels.length > 0
                        ? `${selectedWorkerLabels.length} seleccionado(s)`
                        : "Buscar y seleccionar"}
                    </span>
                    <ChevronsUpDown className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar trabajador..." />
                    <CommandList>
                      <CommandEmpty>No se encontraron trabajadores.</CommandEmpty>
                      <CommandGroup>
                        {workersOptions.map((worker, index) => {
                          const ci = safeText(worker.CI);
                          const nombre = safeText(worker.nombre) || "Trabajador";
                          const value = ci || nombre;
                          const label = ci ? `${nombre} (${ci})` : nombre;
                          const selected = trabajadoresSeleccionados.includes(value);

                          return (
                            <CommandItem
                              key={`${value}-${index}`}
                              value={`${value} ${label}`}
                              onSelect={() => toggleTrabajador(value)}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selected ? "opacity-100" : "opacity-0",
                                )}
                              />
                              {label}
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="lg:col-span-4">
              <SearchableSelect
                options={clienteOptions}
                value={clienteFiltro}
                onValueChange={setClienteFiltro}
                placeholder={loadingClientes ? "Cargando clientes..." : "Buscar cliente"}
                searchPlaceholder="Nombre, código o dirección..."
                disabled={loadingClientes}
                className="w-full"
                truncateSelected={false}
                truncateOptions={false}
              />
            </div>

            <div className="lg:col-span-2">
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap lg:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    setFecha("");
                    setClienteFiltro("");
                    setTrabajadoresSeleccionados([]);
                  }}
                  disabled={!clienteFiltro && !fecha && trabajadoresSeleccionados.length === 0}
                >
                  <X className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void loadTrabajos()}
                  disabled={loading}
                  className="flex-1 sm:flex-none"
                >
                  {loading ? "Actualizando..." : "Actualizar"}
                </Button>
              </div>
            </div>
          </div>

          {selectedWorkerLabels.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {selectedWorkerLabels.map((label, index) => (
                <Badge key={`${label}-${index}`} variant="outline" className="gap-1">
                  <span className="max-w-[210px] truncate">{label}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const value = trabajadoresSeleccionados[index];
                      if (value) toggleTrabajador(value);
                    }}
                    className="text-slate-500 hover:text-slate-800"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

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
                Agrupar por fecha
              </Button>
              <Button
                type="button"
                size="sm"
                variant={viewMode === "cliente" ? "default" : "outline"}
                onClick={() => setViewMode("cliente")}
              >
                Agrupar por cliente
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : trabajos.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay trabajos diarios para los filtros seleccionados.
            </p>
          ) : viewMode === "tabla" ? (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-[980px] text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold">Fecha</th>
                    <th className="text-left px-3 py-2 font-semibold">Cliente</th>
                    <th className="text-left px-3 py-2 font-semibold">Dirección</th>
                    <th className="text-left px-3 py-2 font-semibold">Instaladores</th>
                    <th className="text-left px-3 py-2 font-semibold">Tipo</th>
                    <th className="text-left px-3 py-2 font-semibold">Estado</th>
                    <th className="text-left px-3 py-2 font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {trabajosOrdenados.map((row) => {
                    const { trabajo, instaladores, tipo, fechaLabel } = row;
                    return (
                      <tr
                        key={row.id}
                        className="border-t align-top"
                      >
                        <td className="px-3 py-2 whitespace-nowrap">{fechaLabel}</td>
                        <td className="px-3 py-2 min-w-[220px]">
                          <p className="font-medium text-slate-900">
                            {row.clienteNombre}
                          </p>
                          <p className="text-xs text-slate-500">
                            {row.clienteNumero}
                          </p>
                        </td>
                        <td className="px-3 py-2 text-slate-700 max-w-[320px]">
                          <p className="line-clamp-2">
                            {safeText(trabajo.cliente_direccion, "Sin dirección")}
                          </p>
                        </td>
                        <td className="px-3 py-2 text-slate-700 min-w-[220px]">
                          <p className="line-clamp-2">
                            {instaladores.length > 0
                              ? instaladores.join(", ")
                              : "Sin instaladores"}
                          </p>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <Badge variant="outline" className="text-[11px]">
                            {tipo}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {trabajo.instalacion_terminada ? (
                            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 text-[11px]">
                              Terminada
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 text-[11px]">
                              Pendiente
                            </Badge>
                          )}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => openDetalle(trabajo)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Ver
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : viewMode === "fecha" ? (
            <div className="space-y-3">
              {gruposPorFecha.map((group) => (
                <details key={group.fechaKey} className="rounded-md border bg-white" open>
                  <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{group.fechaLabel}</p>
                      <p className="text-xs text-slate-500">{group.rows.length} trabajo(s)</p>
                    </div>
                    <Badge variant="outline">Fecha</Badge>
                  </summary>
                  <div className="px-4 pb-4 space-y-2">
                    {group.rows.map((row) => (
                      <div key={row.id} className="rounded-md border bg-slate-50 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-medium text-slate-900">
                            {row.clienteNombre} ({row.clienteNumero})
                          </p>
                          <Badge variant="outline" className="text-[11px]">
                            {row.tipo}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-600 mt-1">
                          Dirección: {safeText(row.trabajo.cliente_direccion, "Sin dirección")}
                        </p>
                        <p className="text-xs text-slate-600 mt-1">
                          Instaladores:{" "}
                          {row.instaladores.length > 0
                            ? row.instaladores.join(", ")
                            : "Sin instaladores"}
                        </p>
                        <p className="text-xs text-slate-600 mt-1">
                          Inicio: {formatDateTime(row.inicio)} | Fin: {formatDateTime(row.fin)}
                        </p>
                        <div className="mt-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => openDetalle(row.trabajo)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Ver detalle
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {gruposPorCliente.map((group) => (
                <details key={group.clienteKey} className="rounded-md border bg-white" open>
                  <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {group.clienteNombre} ({group.clienteNumero})
                      </p>
                      <p className="text-xs text-slate-500">
                        {group.rows.length} trabajo(s) en {group.porFecha.length} día(s)
                      </p>
                    </div>
                    <Badge variant="outline">Cliente</Badge>
                  </summary>
                  <div className="px-4 pb-4 space-y-2">
                    {group.porFecha.map((byDate) => (
                      <details key={`${group.clienteKey}-${byDate.fechaKey}`} className="rounded-md border bg-slate-50" open>
                        <summary className="cursor-pointer list-none px-3 py-2 flex items-center justify-between">
                          <span className="text-sm font-medium text-slate-800">
                            {byDate.fechaLabel}
                          </span>
                          <span className="text-xs text-slate-500">
                            {byDate.rows.length} trabajo(s)
                          </span>
                        </summary>
                        <div className="px-3 pb-3 space-y-2">
                          {byDate.rows.map((row) => (
                            <div key={row.id} className="rounded-md border bg-white p-3">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <Badge variant="outline" className="text-[11px]">
                                  {row.tipo}
                                </Badge>
                                {row.trabajo.instalacion_terminada ? (
                                  <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 text-[11px]">
                                    Terminada
                                  </Badge>
                                ) : (
                                  <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 text-[11px]">
                                    Pendiente
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-slate-600 mt-1">
                                Instaladores:{" "}
                                {row.instaladores.length > 0
                                  ? row.instaladores.join(", ")
                                  : "Sin instaladores"}
                              </p>
                              <p className="text-xs text-slate-600 mt-1">
                                Inicio: {formatDateTime(row.inicio)} | Fin: {formatDateTime(row.fin)}
                              </p>
                              <div className="mt-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openDetalle(row.trabajo)}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  Ver detalle
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </details>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={detalleOpen} onOpenChange={setDetalleOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle de trabajo diario</DialogTitle>
          </DialogHeader>

          {trabajoDetalle ? (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-md border p-3 bg-slate-50">
                  <p className="font-semibold text-slate-900">Datos generales</p>
                  <p className="mt-1 text-slate-700">
                    Fecha:{" "}
                    {formatFechaTrabajo(
                      safeText(
                        trabajoDetalle.fecha_trabajo ||
                          trabajoDetalle.fecha ||
                          trabajoDetalle.created_at,
                      ),
                    )}
                  </p>
                  <p className="text-slate-700">
                    Estado: {getTrabajoEstado(trabajoDetalle)}
                  </p>
                  <p className="text-slate-700">
                    Tipo: {safeText(trabajoDetalle.tipo_trabajo, "Sin tipo")}
                  </p>
                  <p className="text-slate-700">
                    ID trabajo: {safeText(trabajoDetalle.id, "Sin ID")}
                  </p>
                </div>

                <div className="rounded-md border p-3 bg-slate-50">
                  <p className="font-semibold text-slate-900">Cliente</p>
                  <p className="mt-1 text-slate-700">
                    Nombre: {safeText(trabajoDetalle.cliente_nombre, "Sin cliente")}
                  </p>
                  <p className="text-slate-700">
                    Número: {safeText(trabajoDetalle.cliente_numero, "Sin código")}
                  </p>
                  <p className="text-slate-700">
                    Teléfono: {safeText(trabajoDetalle.cliente_telefono, "Sin teléfono")}
                  </p>
                  <p className="text-slate-700">
                    Dirección: {safeText(trabajoDetalle.cliente_direccion, "Sin dirección")}
                  </p>
                </div>
              </div>

              <div className="rounded-md border p-3">
                <p className="font-semibold text-slate-900">Referencias</p>
                <p className="mt-1 text-slate-700">
                  Vale ID:{" "}
                  {safeText(
                    trabajoDetalle.id_vale_salida || trabajoDetalle.vale_id,
                    "Sin vale",
                  )}
                </p>
                <p className="text-slate-700">
                  Vale código: {safeText(trabajoDetalle.vale_codigo, "Sin código")}
                </p>
                <p className="text-slate-700">
                  Solicitud ID:{" "}
                  {safeText(
                    trabajoDetalle.id_solicitud_materiales || trabajoDetalle.solicitud_id,
                    "Sin solicitud",
                  )}
                </p>
                <p className="text-slate-700">
                  Solicitud código:{" "}
                  {safeText(trabajoDetalle.solicitud_codigo, "Sin código")}
                </p>
              </div>

              <div className="rounded-md border p-3">
                <p className="font-semibold text-slate-900">Brigada</p>
                <p className="mt-1 text-slate-700">
                  Instaladores:{" "}
                  {(trabajoDetalle.instaladores || []).length > 0
                    ? (trabajoDetalle.instaladores || []).join(", ")
                    : "Sin instaladores"}
                </p>
                <p className="text-slate-700">
                  Responsable recogida:{" "}
                  {safeText(
                    trabajoDetalle.responsable_recogida ||
                      trabajoDetalle.responsable_solicitud_materiales,
                    "Sin responsable",
                  )}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-md border p-3">
                  <p className="font-semibold text-slate-900">Inicio</p>
                  <p className="mt-1 text-slate-700">
                    Fecha/hora: {formatDateTime(trabajoDetalle.inicio?.fecha)}
                  </p>
                  <p className="text-slate-700">
                    Comentario: {safeText(trabajoDetalle.inicio?.comentario, "Sin comentario")}
                  </p>
                  <p className="text-slate-700">
                    Archivos: {(trabajoDetalle.inicio?.archivos || []).length}
                  </p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="font-semibold text-slate-900">Fin</p>
                  <p className="mt-1 text-slate-700">
                    Fecha/hora: {formatDateTime(trabajoDetalle.fin?.fecha)}
                  </p>
                  <p className="text-slate-700">
                    Comentario: {safeText(trabajoDetalle.fin?.comentario, "Sin comentario")}
                  </p>
                  <p className="text-slate-700">
                    Archivos: {(trabajoDetalle.fin?.archivos || []).length}
                  </p>
                </div>
              </div>

              <div className="rounded-md border p-3">
                <p className="font-semibold text-slate-900">Cierre y resultados</p>
                <p className="mt-1 text-slate-700">
                  Problema encontrado:{" "}
                  {safeText(trabajoDetalle.problema_encontrado, "No registrado")}
                </p>
                <p className="text-slate-700">
                  Solución: {safeText(trabajoDetalle.solucion, "No registrada")}
                </p>
                <p className="text-slate-700">
                  Queda pendiente:{" "}
                  {safeText(trabajoDetalle.queda_pendiente, "Nada pendiente")}
                </p>
                <p className="text-slate-700">
                  Cierre diario confirmado:{" "}
                  {trabajoDetalle.cierre_diario_confirmado ? "Sí" : "No"}
                </p>
              </div>

              <div className="rounded-md border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">Archivos subidos</p>
                    <p className="text-slate-700 mt-1">
                      Total: {archivosTrabajo.length} (inicio:{" "}
                      {(trabajoDetalle.inicio?.archivos || []).length}, fin:{" "}
                      {(trabajoDetalle.fin?.archivos || []).length})
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setArchivosDialogOpen(true)}
                    disabled={archivosTrabajo.length === 0}
                  >
                    Ver archivos subidos
                  </Button>
                </div>
              </div>

              <div className="rounded-md border p-3">
                <p className="font-semibold text-slate-900 mb-2">
                  Materiales utilizados ({(trabajoDetalle.materiales_utilizados || []).length})
                </p>
                {(trabajoDetalle.materiales_utilizados || []).length === 0 ? (
                  <p className="text-slate-600">Sin materiales registrados.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] text-sm">
                      <thead className="bg-slate-50 text-slate-600">
                        <tr>
                          <th className="text-left px-2 py-1 font-semibold">Código</th>
                          <th className="text-left px-2 py-1 font-semibold">Nombre</th>
                          <th className="text-right px-2 py-1 font-semibold">Cantidad</th>
                          <th className="text-center px-2 py-1 font-semibold">En servicio</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(trabajoDetalle.materiales_utilizados || []).map((material, idx) => (
                          <tr key={`${material.id_material}-${idx}`} className="border-t">
                            <td className="px-2 py-1">
                              {safeText(
                                material.codigo_material || material.material_codigo,
                                safeText(material.id_material),
                              )}
                            </td>
                            <td className="px-2 py-1">{safeText(material.nombre, "Material")}</td>
                            <td className="px-2 py-1 text-right">
                              {Number(material.cantidad_utilizada || 0)}
                            </td>
                            <td className="px-2 py-1 text-center">
                              {material.en_servicio ? "Sí" : "No"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={archivosDialogOpen} onOpenChange={setArchivosDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Archivos subidos del trabajo</DialogTitle>
          </DialogHeader>

          {archivosTrabajo.length === 0 ? (
            <p className="text-sm text-slate-600">Este trabajo no tiene archivos subidos.</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {archivosTrabajo.map((archivo) => {
                const previewUrl = getArchivoPreviewUrl(archivo);
                const mime = inferArchivoMime(archivo);
                const isImage =
                  mime.startsWith("image/") || archivo.tipo === "imagen";
                const isVideo =
                  mime.startsWith("video/") || archivo.tipo === "video";
                const isAudio =
                  mime.startsWith("audio/") || archivo.tipo === "audio";

                return (
                  <div
                    key={`${archivo.etapa}-${archivo.id}`}
                    className="rounded-md border bg-slate-50 p-3 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-slate-900 truncate">
                        {getArchivoName(archivo)}
                      </p>
                      <Badge variant="outline">
                        {archivo.etapa === "inicio" ? "Inicio" : "Fin"}
                      </Badge>
                    </div>

                    <div className="rounded-md border bg-white p-2 min-h-[120px] flex items-center justify-center">
                      {previewUrl ? (
                        isImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={previewUrl}
                            alt={getArchivoName(archivo)}
                            className="max-h-56 w-auto object-contain rounded"
                          />
                        ) : isVideo ? (
                          <video
                            src={previewUrl}
                            controls
                            className="w-full max-h-56 rounded"
                          />
                        ) : isAudio ? (
                          <audio src={previewUrl} controls className="w-full" />
                        ) : (
                          <p className="text-xs text-slate-500">
                            Sin vista previa para este tipo de archivo.
                          </p>
                        )
                      ) : (
                        <p className="text-xs text-slate-500">
                          URL no disponible para vista previa.
                        </p>
                      )}
                    </div>

                    <p className="text-xs text-slate-600">
                      Fecha: {formatDateTime(archivo.created_at)}
                    </p>
                    <p className="text-xs text-slate-600 break-all">
                      URL: {safeText(archivo.url, "Sin URL")}
                    </p>

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void handleArchivoAction(archivo, "view")}
                      >
                        Ver
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void handleArchivoAction(archivo, "download")}
                      >
                        Descargar
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
