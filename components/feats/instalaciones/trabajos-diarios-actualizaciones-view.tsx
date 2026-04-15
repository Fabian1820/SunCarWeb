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
import { SearchableSelect } from "@/components/shared/molecule/searchable-select";
import { Textarea } from "@/components/shared/molecule/textarea";
import { useToast } from "@/hooks/use-toast";
import { ClienteService, TrabajadorService, TrabajosDiariosService } from "@/lib/api-services";
import {
  createEmptyTrabajoDiario,
  type TrabajoDiarioArchivo,
  type TrabajoDiarioRegistro,
} from "@/lib/types/feats/instalaciones/trabajos-diarios-types";
import type { Cliente } from "@/lib/types/feats/customer/cliente-types";
import { cn } from "@/lib/utils";
import { Check, Loader2, Plus, Upload, X } from "lucide-react";

type Worker = {
  CI?: string;
  nombre?: string;
  is_brigadista?: boolean;
};

const toDateInput = (value: Date) => {
  const yyyy = value.getFullYear();
  const mm = String(value.getMonth() + 1).padStart(2, "0");
  const dd = String(value.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
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

const inferArchivoTipo = (file: File): TrabajoDiarioArchivo["tipo"] =>
  file.type.startsWith("video/")
    ? "video"
    : file.type.startsWith("audio/")
      ? "audio"
      : "imagen";

export function TrabajosDiariosActualizacionesView() {
  const { toast } = useToast();
  const [fechaFiltro, setFechaFiltro] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [trabajos, setTrabajos] = useState<TrabajoDiarioRegistro[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loadingClientes, setLoadingClientes] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [workerSearch, setWorkerSearch] = useState("");
  const [clienteSeleccionado, setClienteSeleccionado] = useState("");
  const [instaladoresSeleccionados, setInstaladoresSeleccionados] = useState<string[]>([]);
  const [comentarioFin, setComentarioFin] = useState("");
  const [archivosPendientes, setArchivosPendientes] = useState<File[]>([]);

  const workersOptions = useMemo(
    () =>
      (workers || [])
        .filter((w) => Boolean(safeText(w.nombre)))
        .sort((a, b) => safeText(a.nombre).localeCompare(safeText(b.nombre), "es")),
    [workers],
  );

  const workerNameByValue = useMemo(() => {
    const map = new Map<string, string>();
    workersOptions.forEach((worker) => {
      const ci = safeText(worker.CI);
      const nombre = safeText(worker.nombre);
      const value = ci || nombre;
      if (value) map.set(value, nombre || value);
      if (ci && nombre) map.set(ci, nombre);
    });
    return map;
  }, [workersOptions]);

  const formatWorkerName = useCallback(
    (value: string) => {
      const text = safeText(value);
      if (!text) return "Sin trabajador";
      return workerNameByValue.get(text) || text;
    },
    [workerNameByValue],
  );

  const filteredWorkers = useMemo(() => {
    const q = safeText(workerSearch).toLowerCase();
    if (!q) return workersOptions;
    return workersOptions.filter((worker) => {
      const nombre = safeText(worker.nombre).toLowerCase();
      const ci = safeText(worker.CI).toLowerCase();
      return nombre.includes(q) || ci.includes(q);
    });
  }, [workerSearch, workersOptions]);

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
      const rows = await TrabajosDiariosService.getTrabajosTodos({
        incluir_cerrados: true,
      });
      const actualizaciones = (rows || [])
        .filter((row) => safeText(row.tipo_trabajo) === "ACTUALIZACION")
        .filter((row) => {
          if (!fechaFiltro) return true;
          const fechaRow = safeText(
            row.fecha_trabajo || row.fecha || row.created_at,
          ).slice(0, 10);
          return fechaRow === fechaFiltro;
        });
      setTrabajos(actualizaciones);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudieron cargar las actualizaciones";
      toast({ title: "Error", description: message, variant: "destructive" });
      setTrabajos([]);
    } finally {
      setLoading(false);
    }
  }, [fechaFiltro, toast]);

  useEffect(() => {
    void Promise.all([loadWorkers(), loadClientes()]);
  }, [loadWorkers, loadClientes]);

  useEffect(() => {
    void loadTrabajos();
  }, [loadTrabajos]);

  const resetModal = () => {
    setClienteSeleccionado("");
    setInstaladoresSeleccionados([]);
    setComentarioFin("");
    setArchivosPendientes([]);
  };

  const openModal = () => {
    resetModal();
    setModalOpen(true);
  };

  const toggleInstalador = (nombre: string) => {
    setInstaladoresSeleccionados((prev) => {
      if (prev.includes(nombre)) {
        return prev.filter((item) => item !== nombre);
      }
      return [...prev, nombre];
    });
  };

  const handleGuardarActualizacion = async () => {
    if (!clienteSeleccionado) {
      toast({
        title: "Falta cliente",
        description: "Selecciona un cliente.",
        variant: "destructive",
      });
      return;
    }

    if (instaladoresSeleccionados.length === 0) {
      toast({
        title: "Faltan trabajadores",
        description: "Selecciona al menos un trabajador.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const cliente = clientes.find((c) => {
        const numero = safeText(c.numero);
        const id = safeText(c.id);
        return numero === clienteSeleccionado || id === clienteSeleccionado;
      });

      const archivosSubidos: TrabajoDiarioArchivo[] = [];
      for (const file of archivosPendientes) {
        const uploaded = await TrabajosDiariosService.uploadArchivo(file);
        archivosSubidos.push({
          id:
            uploaded.id ||
            `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          url: uploaded.url,
          tipo: uploaded.tipo || inferArchivoTipo(file),
          nombre: uploaded.nombre || file.name,
          tamano: Number.isFinite(uploaded.tamano) ? uploaded.tamano : file.size,
          mime_type: uploaded.mime_type || file.type || "application/octet-stream",
          created_at: uploaded.created_at || new Date().toISOString(),
        });
      }

      const draft: TrabajoDiarioRegistro = {
        ...createEmptyTrabajoDiario(),
        fecha_trabajo: fechaFiltro || toDateInput(new Date()),
        tipo_trabajo: "ACTUALIZACION",
        cliente_numero: safeText(cliente?.numero) || clienteSeleccionado,
        cliente_id: safeText(cliente?.id) || undefined,
        cliente_nombre: safeText(cliente?.nombre) || undefined,
        cliente_telefono: safeText(cliente?.telefono) || undefined,
        cliente_direccion: safeText(cliente?.direccion) || undefined,
        instaladores: instaladoresSeleccionados,
        materiales_utilizados: [],
        inicio: {
          archivos: [],
          comentario: "",
          fecha: fechaFiltro || toDateInput(new Date()),
        },
        fin: {
          archivos: archivosSubidos,
          comentario: comentarioFin,
          fecha: fechaFiltro || toDateInput(new Date()),
        },
      };

      await TrabajosDiariosService.createTrabajo(draft);

      toast({
        title: "Actualización creada",
        description: "Se guardó correctamente.",
      });

      setModalOpen(false);
      resetModal();
      await loadTrabajos();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo guardar la actualización";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <Input
              type="date"
              value={fechaFiltro}
              onChange={(e) => setFechaFiltro(e.target.value)}
            />
            <Button type="button" variant="outline" onClick={() => void loadTrabajos()} disabled={loading}>
              {loading ? "Actualizando..." : "Actualizar"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setFechaFiltro("")}
              disabled={!fechaFiltro}
            >
              Limpiar fecha
            </Button>
            <div className="md:col-span-2 flex justify-end">
              <Button type="button" className="bg-purple-700 hover:bg-purple-800" onClick={openModal}>
                <Plus className="h-4 w-4 mr-2" />
                Crear trabajo diario
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Actualizaciones ({trabajos.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-slate-600">Cargando actualizaciones...</p>
          ) : trabajos.length === 0 ? (
            <p className="text-sm text-slate-600">
              {fechaFiltro
                ? "No hay actualizaciones para la fecha filtrada."
                : "No hay actualizaciones registradas."}
            </p>
          ) : (
            <div className="space-y-2">
              {trabajos.map((trabajo, index) => (
                <div key={safeText(trabajo.id, String(index))} className="rounded-md border bg-white p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-slate-900">
                      {safeText(trabajo.cliente_nombre, "Sin cliente")} ({safeText(trabajo.cliente_numero, "Sin código")})
                    </p>
                    <Badge variant="outline">{formatFechaTrabajo(trabajo.fecha_trabajo || trabajo.fecha)}</Badge>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Trabajadores:{" "}
                    {(trabajo.instaladores || []).length > 0
                      ? (trabajo.instaladores || [])
                          .map((item) => formatWorkerName(safeText(item)))
                          .join(", ")
                      : "Sin trabajadores"}
                  </p>
                  <p className="text-sm text-slate-700 mt-1">
                    {safeText(trabajo.fin?.comentario, "Sin comentario")}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Archivos: {(trabajo.fin?.archivos || []).length}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="w-[90vw] max-w-2xl max-h-none overflow-visible">
          <DialogHeader>
            <DialogTitle>Nueva actualización</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Cliente</label>
              <SearchableSelect
                options={clienteOptions}
                value={clienteSeleccionado}
                onValueChange={setClienteSeleccionado}
                placeholder={loadingClientes ? "Cargando clientes..." : "Buscar cliente"}
                searchPlaceholder="Nombre, código o dirección..."
                disabled={loadingClientes}
                disablePortal={true}
                className="w-full"
                truncateSelected={false}
                truncateOptions={false}
              />
              {clienteSeleccionado ? (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="max-w-full truncate">
                    {clienteOptions.find((c) => c.value === clienteSeleccionado)?.label ||
                      clienteSeleccionado}
                  </Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setClienteSeleccionado("")}
                  >
                    Limpiar
                  </Button>
                </div>
              ) : null}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Trabajadores que realizaron</label>
              <Input
                type="text"
                value={workerSearch}
                onChange={(e) => setWorkerSearch(e.target.value)}
                placeholder="Buscar trabajador..."
              />
              <div className="max-h-56 overflow-y-auto border rounded-md">
                {filteredWorkers.length === 0 ? (
                  <p className="text-sm text-slate-500 px-3 py-2">
                    No se encontraron trabajadores.
                  </p>
                ) : (
                  filteredWorkers.map((worker, index) => {
                    const nombre = safeText(worker.nombre);
                    const ci = safeText(worker.CI);
                    const value = ci || nombre;
                    const label = nombre || ci;
                    const selected = instaladoresSeleccionados.includes(value);

                    return (
                      <button
                        key={`${value}-${index}`}
                        type="button"
                        className={cn(
                          "w-full flex items-center gap-2 px-3 py-2 text-left border-b last:border-b-0",
                          selected ? "bg-purple-50" : "hover:bg-slate-50",
                        )}
                        onClick={() => toggleInstalador(value)}
                      >
                        <Check
                          className={cn(
                            "h-4 w-4",
                            selected ? "opacity-100 text-purple-700" : "opacity-0",
                          )}
                        />
                        <span className="text-sm">{label}</span>
                      </button>
                    );
                  })
                )}
              </div>
              {instaladoresSeleccionados.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {instaladoresSeleccionados.map((value) => (
                    <Badge key={value} variant="outline" className="gap-1">
                      <span>{formatWorkerName(value)}</span>
                      <button type="button" onClick={() => toggleInstalador(value)}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Comentario final</label>
              <Textarea
                value={comentarioFin}
                onChange={(e) => setComentarioFin(e.target.value)}
                placeholder="Comentario de actualización"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Archivos (fin)</label>
              <Input
                type="file"
                multiple
                accept="image/*,video/*,audio/*"
                onChange={(event) => {
                  const files = Array.from(event.target.files || []);
                  setArchivosPendientes(files);
                }}
              />
              <p className="text-xs text-slate-500">
                {archivosPendientes.length > 0
                  ? `${archivosPendientes.length} archivo(s) seleccionado(s)`
                  : "Sin archivos seleccionados"}
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button type="button" onClick={() => void handleGuardarActualizacion()} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Guardar
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
