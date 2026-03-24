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
import type { TrabajoDiarioRegistro } from "@/lib/types/feats/instalaciones/trabajos-diarios-types";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, X } from "lucide-react";

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

export function TrabajosDiariosTodosView() {
  const { toast } = useToast();
  const [fecha, setFecha] = useState("");
  const [workerFilterOpen, setWorkerFilterOpen] = useState(false);
  const [trabajadoresSeleccionados, setTrabajadoresSeleccionados] = useState<string[]>([]);
  const [clienteFiltro, setClienteFiltro] = useState("");
  const [loading, setLoading] = useState(false);
  const [trabajos, setTrabajos] = useState<TrabajoDiarioRegistro[]>([]);
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
          <CardTitle className="text-base">
            Todos los trabajos diarios ({trabajos.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : trabajos.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay trabajos diarios para los filtros seleccionados.
            </p>
          ) : (
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
                  </tr>
                </thead>
                <tbody>
                  {trabajos.map((trabajo) => {
                    const instaladores = (trabajo.instaladores || []).filter(Boolean);
                    const tipo = safeText(trabajo.tipo_trabajo, "Sin tipo");
                    const fechaTrabajo = formatFechaTrabajo(
                      safeText(trabajo.fecha_trabajo || trabajo.fecha || trabajo.created_at),
                    );
                    return (
                      <tr
                        key={safeText(trabajo.id, `${trabajo.cliente_numero}-${fechaTrabajo}`)}
                        className="border-t align-top"
                      >
                        <td className="px-3 py-2 whitespace-nowrap">{fechaTrabajo}</td>
                        <td className="px-3 py-2 min-w-[220px]">
                          <p className="font-medium text-slate-900">
                            {safeText(trabajo.cliente_nombre, "Sin cliente")}
                          </p>
                          <p className="text-xs text-slate-500">
                            {safeText(trabajo.cliente_numero, "Sin código")}
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
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
