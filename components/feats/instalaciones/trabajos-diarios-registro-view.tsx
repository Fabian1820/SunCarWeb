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
import { ClienteService, TrabajadorService, TrabajosDiariosService } from "@/lib/api-services";
import type { Cliente } from "@/lib/types/feats/customer/cliente-types";
import type {
  TrabajoDiarioMaterialResumen,
  TrabajoDiarioRegistro,
} from "@/lib/types/feats/instalaciones/trabajos-diarios-types";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, Plus, X } from "lucide-react";
import { TrabajoDiarioForm } from "./trabajo-diario-form";

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

interface TrabajosDiariosRegistroViewProps {
  onCreateRequested: () => void;
}

export function TrabajosDiariosRegistroView({
  onCreateRequested,
}: TrabajosDiariosRegistroViewProps) {
  const { toast } = useToast();
  const [fecha, setFecha] = useState(() => toDateInput(new Date()));
  const [workerFilterOpen, setWorkerFilterOpen] = useState(false);
  const [trabajadoresSeleccionados, setTrabajadoresSeleccionados] = useState<string[]>([]);
  const [clienteFiltro, setClienteFiltro] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [loadingMateriales, setLoadingMateriales] = useState(false);
  const [saving, setSaving] = useState(false);
  const [closingDay, setClosingDay] = useState(false);
  const [trabajos, setTrabajos] = useState<TrabajoDiarioRegistro[]>([]);
  const [materialesResumen, setMaterialesResumen] = useState<
    TrabajoDiarioMaterialResumen[]
  >([]);
  const [selectedId, setSelectedId] = useState("");
  const [selectedTrabajo, setSelectedTrabajo] =
    useState<TrabajoDiarioRegistro | null>(null);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loadingClientes, setLoadingClientes] = useState(false);

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

  const clienteOptions = useMemo(
    () =>
      (clientes || [])
        .map((cliente) => {
          const value = safeText(cliente.numero || cliente.id);
          if (!value) return null;
          const nombre = safeText(cliente.nombre, "Sin nombre");
          const numero = safeText(cliente.numero, "Sin código");
          const direccion = safeText(cliente.direccion, "Sin dirección");
          return {
            value,
            label: `${nombre} (${numero}) • ${direccion}`,
          };
        })
        .filter(Boolean) as Array<{ value: string; label: string }>,
    [clientes],
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
              // El backend normalmente guarda/filtra por nombre de instalador.
              return safeText(worker?.nombre, selectedValue);
            })
            .filter(Boolean),
        ),
      ),
    [trabajadoresSeleccionados, workersOptions],
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
    if (!fecha) {
      setTrabajos([]);
      setSelectedId("");
      setSelectedTrabajo(null);
      setMaterialesResumen([]);
      return;
    }

    setLoading(true);
    try {
      const clienteNumeroFiltro = safeText(selectedClient?.numero);
      const clienteIdFiltro = safeText(selectedClient?.id);
      const qClienteFiltro =
        !clienteNumeroFiltro && !clienteIdFiltro ? safeText(clienteFiltro) : "";

      const rows = await TrabajosDiariosService.getTrabajos({
        fecha,
        instaladores: trabajadoresFiltroBackend,
        cliente_numero: clienteNumeroFiltro || undefined,
        cliente_id:
          !clienteNumeroFiltro && clienteIdFiltro ? clienteIdFiltro : undefined,
        q_cliente:
          !clienteNumeroFiltro && !clienteIdFiltro && qClienteFiltro
            ? qClienteFiltro
            : undefined,
      });
      setTrabajos(rows || []);
      if (!rows || rows.length === 0) {
        setSelectedId("");
        setSelectedTrabajo(null);
        setMaterialesResumen([]);
        return;
      }

      const keepSelected = rows.find(
        (t) => safeText(t.id) === selectedId,
      );
      if (!keepSelected) {
        setSelectedId("");
        setSelectedTrabajo(null);
        setMaterialesResumen([]);
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudieron cargar trabajos";
      toast({ title: "Error", description: message, variant: "destructive" });
      setTrabajos([]);
      setSelectedId("");
      setSelectedTrabajo(null);
      setMaterialesResumen([]);
    } finally {
      setLoading(false);
    }
  }, [
    fecha,
    selectedClient?.id,
    selectedClient?.numero,
    selectedId,
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

  const trabajosFiltrados = useMemo(() => trabajos, [trabajos]);

  useEffect(() => {
    if (!selectedId) return;
    const found = trabajosFiltrados.find(
      (t) => safeText(t.id) === selectedId,
    );
    if (found) {
      return;
    }

    setSelectedId("");
    setSelectedTrabajo(null);
    setMaterialesResumen([]);
  }, [selectedId, trabajosFiltrados]);

  const handleSelectTrabajo = useCallback(
    async (trabajoResumen: TrabajoDiarioRegistro) => {
      const rowId = safeText(trabajoResumen.id);
      if (!rowId) {
        toast({
          title: "ID inválido",
          description: "La tarjeta no tiene un ID de trabajo diario válido.",
          variant: "destructive",
        });
        return;
      }

      setSelectedId(rowId);
      setSelectedTrabajo(null);
      setLoadingDetalle(true);
      setLoadingMateriales(true);
      try {
        const detalle = await TrabajosDiariosService.getTrabajoById(rowId);
        setSelectedTrabajo(detalle);
        const detalleId = safeText(detalle.id, rowId);
        try {
          const resumen = await TrabajosDiariosService.getMaterialesResumen(
            detalleId,
          );
          setMaterialesResumen(resumen);
        } catch {
          // El resumen no debe bloquear la edición del trabajo
          setMaterialesResumen([]);
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "No se pudo cargar el detalle del trabajo";
        toast({
          title: "Error",
          description: message,
          variant: "destructive",
        });
        setSelectedTrabajo(null);
        setMaterialesResumen([]);
      } finally {
        setLoadingDetalle(false);
        setLoadingMateriales(false);
      }
    },
    [toast],
  );

  const handleSave = async () => {
    if (!selectedTrabajo) return;
    if (!safeText(selectedTrabajo.id)) {
      toast({
        title: "No editable",
        description:
          "El trabajo seleccionado no tiene ID para editar en backend.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const saved = await TrabajosDiariosService.updateTrabajo(
        selectedTrabajo.id as string,
        selectedTrabajo,
      );

      const savedId = safeText(
        saved.id || selectedTrabajo.id,
      );
      const nextRows = [...trabajos];
      const index = nextRows.findIndex(
        (item) => safeText(item.id) === selectedId,
      );
      if (index >= 0) nextRows[index] = { ...selectedTrabajo, ...saved };
      else nextRows.unshift({ ...selectedTrabajo, ...saved });

      setTrabajos(nextRows);
      setSelectedId(savedId || selectedId);
      setSelectedTrabajo({ ...selectedTrabajo, ...saved });
      if (savedId) {
        try {
          const resumen = await TrabajosDiariosService.getMaterialesResumen(
            savedId,
          );
          setMaterialesResumen(resumen);
        } catch {
          // noop
        }
      }
      toast({
        title: "Guardado",
        description: "Trabajo diario actualizado correctamente.",
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo guardar en backend";
      toast({
        title: "Aviso",
        description: `${message}. Se mantienen los cambios en pantalla para no perder datos.`,
      });
      const nextRows = [...trabajos];
      const index = nextRows.findIndex(
        (item) => safeText(item.id) === selectedId,
      );
      if (index >= 0) nextRows[index] = selectedTrabajo;
      setTrabajos(nextRows);
    } finally {
      setSaving(false);
    }
  };

  const handleCloseDay = async () => {
    if (!selectedTrabajo || !safeText(selectedTrabajo.id)) return;
    setClosingDay(true);
    try {
      const payload: TrabajoDiarioRegistro = {
        ...selectedTrabajo,
        cierre_diario_confirmado: true,
      };
      const saved = await TrabajosDiariosService.updateTrabajo(
        selectedTrabajo.id as string,
        payload,
      );
      setSelectedTrabajo({ ...payload, ...saved, cierre_diario_confirmado: true });
      toast({
        title: "Día cerrado",
        description: "El trabajo diario quedó cerrado para edición.",
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo cerrar el trabajo diario";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      if (safeText(selectedTrabajo.id)) {
        try {
          const detalle = await TrabajosDiariosService.getTrabajoById(
            selectedTrabajo.id as string,
          );
          setSelectedTrabajo(detalle);
        } catch {
          // noop
        }
      }
    } finally {
      setClosingDay(false);
    }
  };

  const toggleTrabajador = (value: string) => {
    setTrabajadoresSeleccionados((prev) => {
      if (prev.includes(value)) {
        return prev.filter((item) => item !== value);
      }
      return [...prev, value];
    });
  };

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
                placeholder={toDateInput(new Date())}
              />
            </div>

            <div className="lg:col-span-3">
              <Popover open={workerFilterOpen} onOpenChange={setWorkerFilterOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between"
                  >
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
              <div className="flex items-center gap-2">
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
            </div>

            <div className="lg:col-span-2 lg:pl-2">
              <div className="overflow-x-auto">
                <div className="flex items-center gap-2 flex-nowrap whitespace-nowrap justify-start lg:justify-end min-w-max">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setClienteFiltro("")}
                    aria-label="Limpiar cliente"
                    disabled={!clienteFiltro}
                    className="shrink-0 ml-1"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void loadTrabajos()}
                    disabled={loading}
                    className="shrink-0"
                  >
                    {loading ? "Actualizando..." : "Actualizar"}
                  </Button>
                  <Button
                    type="button"
                    onClick={onCreateRequested}
                    className="shrink-0"
                    size="icon"
                    aria-label="Crear trabajo diario"
                    title="Crear trabajo diario"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
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
                    aria-label={`Quitar ${label}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-stretch">
        <Card className="xl:col-span-1 h-auto xl:h-[72vh] min-h-0 xl:min-h-[560px] flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Resultados ({trabajosFiltrados.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-visible xl:overflow-y-auto px-0 pb-0">
            {loading ? (
              <p className="text-sm text-muted-foreground px-6 py-4">Cargando...</p>
            ) : trabajosFiltrados.length === 0 ? (
              <p className="text-sm text-muted-foreground px-6 py-4">
                No hay trabajos para estos filtros.
              </p>
            ) : (
              <div className="space-y-3 p-3">
                {trabajosFiltrados.map((trabajo) => {
                  const rowId = safeText(trabajo.id);
                  const active = rowId === selectedId;
                  const instaladores = (trabajo.instaladores || []).filter(Boolean);
                  const instaladoresTexto =
                    instaladores.length > 0 ? instaladores.join(", ") : "Sin instaladores";
                  const fechaTrabajo = formatFechaTrabajo(
                    safeText(trabajo.fecha_trabajo || trabajo.fecha || trabajo.created_at),
                  );

                  return (
                    <button
                      key={rowId}
                      type="button"
                      className={cn(
                        "w-full text-left rounded-xl border p-3.5 transition shadow-sm",
                        active
                          ? "border-blue-300 bg-blue-50 ring-1 ring-blue-100"
                          : "border-slate-200 bg-white hover:bg-slate-50",
                      )}
                      onClick={() => {
                        void handleSelectTrabajo(trabajo);
                      }}
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Cliente
                      </p>
                      <p className="text-sm font-semibold text-slate-900 truncate mt-0.5">
                        {safeText(trabajo.cliente_nombre, "Sin cliente")}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {safeText(trabajo.cliente_numero, "Sin código")}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {safeText(trabajo.cliente_direccion, "Sin dirección")}
                      </p>

                      <div className="mt-3 grid grid-cols-1 gap-2">
                        <div className="rounded-md bg-slate-50 border border-slate-200 px-2.5 py-2">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                            Fecha
                          </p>
                          <p className="text-xs text-slate-700">{fechaTrabajo}</p>
                        </div>
                        <div className="rounded-md bg-slate-50 border border-slate-200 px-2.5 py-2">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                            Instaladores
                          </p>
                          <p className="text-xs text-slate-700 line-clamp-2">
                            {instaladoresTexto}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-2 h-auto xl:h-[72vh] min-h-0 xl:min-h-[560px] flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Registrar datos de trabajo</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-visible xl:overflow-y-auto pr-0 xl:pr-2">
            {loadingDetalle ? (
              <p className="text-sm text-muted-foreground">Cargando detalle...</p>
            ) : !selectedTrabajo ? (
              <p className="text-sm text-muted-foreground">
                Selecciona un trabajo de la lista para introducir inicio, fin y materiales.
              </p>
            ) : (
              <TrabajoDiarioForm
                value={selectedTrabajo}
                onChange={setSelectedTrabajo}
                materialesResumen={materialesResumen}
                onMaterialesResumenChange={setMaterialesResumen}
                onSubmit={() => void handleSave()}
                onCloseDay={() => void handleCloseDay()}
                submitLabel="Guardar datos del trabajo"
                isSaving={saving || loadingMateriales}
                isClosing={closingDay}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
