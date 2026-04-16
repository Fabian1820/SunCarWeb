"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
import type { TrabajoDiarioTipo } from "@/lib/types/feats/instalaciones/trabajos-diarios-types";
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

export function TrabajosDiariosRegistroView() {
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
  const [draftsById, setDraftsById] = useState<
    Record<string, TrabajoDiarioRegistro>
  >({});
  const [selectedId, setSelectedId] = useState("");
  const selectedIdRef = useRef("");
  const [loadingTrabajoId, setLoadingTrabajoId] = useState("");
  const [selectedTrabajo, setSelectedTrabajo] =
    useState<TrabajoDiarioRegistro | null>(null);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loadingClientes, setLoadingClientes] = useState(false);

  // ── Diálogo "Agregar sin vale" ──
  const [showCrearDialog, setShowCrearDialog] = useState(false);
  const [creandoSinVale, setCreandoSinVale] = useState(false);
  const [crearFecha, setCrearFecha] = useState("");
  const [crearClienteId, setCrearClienteId] = useState("");
  const [crearInstaladores, setCrearInstaladores] = useState<string[]>([]);
  const [crearInstaladorOpen, setCrearInstaladorOpen] = useState(false);
  const [crearTipo, setCrearTipo] = useState<TrabajoDiarioTipo>("INSTALACION NUEVA");

  const hydrateMaterialesResumen = useCallback(
    (
      rows: TrabajoDiarioMaterialResumen[],
      materialesActuales: TrabajoDiarioRegistro["materiales_utilizados"] = [],
    ): TrabajoDiarioMaterialResumen[] => {
      const materialesById = new Map(
        (materialesActuales || []).map((material) => [
          safeText(material.id_material),
          material,
        ]),
      );
      return (rows || []).map((row) => {
        const disponible = Math.max(0, Number(row.disponible_hoy || 0));
        const materialActual = materialesById.get(safeText(row.material_id));
        const desdeResumen = Number(row.cantidad_usada_hoy);
        const desdeTrabajo = Number(materialActual?.cantidad_utilizada);
        const cantidadHoy = Number.isFinite(desdeResumen)
          ? Math.max(0, Math.min(disponible, desdeResumen))
          : Number.isFinite(desdeTrabajo)
            ? Math.max(0, Math.min(disponible, desdeTrabajo))
            : disponible;
        const cantidadServicioRaw = Number(
          row.cantidad_en_servicio ?? materialActual?.cantidad_en_servicio ?? 0,
        );
        const cantidadServicio = Math.max(
          0,
          Math.min(cantidadHoy, Number.isFinite(cantidadServicioRaw) ? cantidadServicioRaw : 0),
        );
        const enServicio =
          (row.en_servicio === true || materialActual?.en_servicio === true) &&
          cantidadServicio > 0;
        return {
          ...row,
          categoria: row.categoria || materialActual?.categoria,
          cantidad_usada_hoy: cantidadHoy,
          saldo_despues_de_hoy: disponible - cantidadHoy,
          en_servicio: enServicio,
          cantidad_en_servicio: cantidadServicio,
        };
      });
    },
    [],
  );

  const mapResumenToMaterialesUtilizados = useCallback(
    (rows: TrabajoDiarioMaterialResumen[]) =>
      (rows || [])
        .filter((m) => {
          const usada = Number(m.cantidad_usada_hoy || 0);
          const servicio = Number(m.cantidad_en_servicio || 0);
          return usada > 0 || servicio > 0 || m.en_servicio === true;
        })
        .map((m) => ({
          id_material: m.material_id,
          codigo_material: m.codigo_material,
          material_codigo: m.material_codigo || m.codigo_material,
          categoria: m.categoria,
          nombre: m.nombre,
          cantidad_utilizada: Math.max(0, Number(m.cantidad_usada_hoy || 0)),
          en_servicio: m.en_servicio === true,
          cantidad_en_servicio: Math.max(
            0,
            Math.min(
              Number(m.cantidad_usada_hoy || 0),
              Number(m.cantidad_en_servicio || 0),
            ),
          ),
        })),
    [],
  );

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
        solo_abiertos: true,
      });
      setTrabajos(rows || []);
      if (!rows || rows.length === 0) {
        setSelectedId("");
        setSelectedTrabajo(null);
        setMaterialesResumen([]);
        return;
      }

      const keepSelected = rows.find(
        (t) => safeText(t.id) === selectedIdRef.current,
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
    toast,
    trabajadoresFiltroBackend,
    clienteFiltro,
  ]);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    void Promise.all([loadWorkers(), loadClientes()]);
  }, [loadWorkers, loadClientes]);

  useEffect(() => {
    void loadTrabajos();
    // Dependencias explícitas para evitar errores de tamaño del array en useEffect
    // durante hot reload/refresh de Next.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    fecha,
    selectedClient?.id,
    selectedClient?.numero,
    toast,
    trabajadoresFiltroBackend,
    clienteFiltro,
  ]);

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
      if (rowId === selectedId && selectedTrabajo) {
        return;
      }

      const previousTrabajo = selectedTrabajo;
      setSelectedId(rowId);
      setLoadingTrabajoId(rowId);
      setLoadingDetalle(true);
      setLoadingMateriales(true);
      try {
        const [detalleResult, resumenResult] = await Promise.allSettled([
          TrabajosDiariosService.getTrabajoById(rowId),
          TrabajosDiariosService.getMaterialesResumen(rowId),
        ]);

        if (detalleResult.status !== "fulfilled") {
          throw detalleResult.reason;
        }

        const detalle = detalleResult.value;
        const nextTrabajo = { ...detalle, id: safeText(detalle.id, rowId) };
        setSelectedTrabajo(nextTrabajo);
        setDraftsById((prev) => ({ ...prev, [rowId]: nextTrabajo }));

        let resumen: TrabajoDiarioMaterialResumen[] = [];
        if (resumenResult.status === "fulfilled") {
          resumen = resumenResult.value;
        }
        const detalleId = safeText(detalle.id, rowId);
        if (resumen.length === 0 && detalleId && detalleId !== rowId) {
          try {
            resumen = await TrabajosDiariosService.getMaterialesResumen(
              detalleId,
            );
          } catch {
            // noop
          }
        }

        if (resumen.length > 0) {
          const hydratedResumen = hydrateMaterialesResumen(
            resumen,
            nextTrabajo.materiales_utilizados,
          );
          setMaterialesResumen(hydratedResumen);
          const nextTrabajoWithMateriales: TrabajoDiarioRegistro = {
            ...nextTrabajo,
            materiales_utilizados: mapResumenToMaterialesUtilizados(hydratedResumen),
          };
          setSelectedTrabajo(nextTrabajoWithMateriales);
          setDraftsById((prev) => ({ ...prev, [rowId]: nextTrabajoWithMateriales }));
        } else {
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
        const fallback = draftsById[rowId] || previousTrabajo;
        if (fallback) {
          setSelectedTrabajo(fallback);
        } else {
          setSelectedTrabajo(null);
        }
        setMaterialesResumen([]);
      } finally {
        setLoadingDetalle(false);
        setLoadingMateriales(false);
        setLoadingTrabajoId("");
      }
    },
    [
      draftsById,
      hydrateMaterialesResumen,
      mapResumenToMaterialesUtilizados,
      selectedId,
      selectedTrabajo,
      toast,
    ],
  );

  const handleTrabajoChange = useCallback(
    (next: TrabajoDiarioRegistro) => {
      setSelectedTrabajo(next);
      const id = safeText(next.id || selectedId);
      if (!id) return;
      setDraftsById((prev) => ({ ...prev, [id]: { ...next, id } }));
    },
    [selectedId],
  );

  const handleSave = async () => {
    if (!selectedTrabajo) return;
    const trabajoId = safeText(selectedTrabajo.id || selectedId);
    if (!trabajoId) {
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
      console.log("📤 [RegistrarDatos.handleSave] Payload local previo a PATCH", {
        trabajoId,
        selectedId,
        selectedTrabajo,
      });
      const saved = await TrabajosDiariosService.updateTrabajo(
        trabajoId,
        selectedTrabajo,
      );

      const savedId = safeText(
        saved.id || trabajoId,
      );
      const nextRows = [...trabajos];
      const index = nextRows.findIndex(
        (item) => safeText(item.id) === selectedId,
      );
      if (index >= 0) nextRows[index] = { ...selectedTrabajo, ...saved };
      else nextRows.unshift({ ...selectedTrabajo, ...saved });

      setTrabajos(nextRows);
      setSelectedId(savedId || selectedId);
      const merged = { ...selectedTrabajo, ...saved, id: savedId || trabajoId };
      setSelectedTrabajo(merged);
      setDraftsById((prev) => ({
        ...prev,
        [safeText(savedId || trabajoId)]: merged,
      }));
      if (savedId) {
        try {
          const resumen = await TrabajosDiariosService.getMaterialesResumen(
            savedId,
          );
          setMaterialesResumen(
            hydrateMaterialesResumen(resumen, merged.materiales_utilizados),
          );
        } catch {
          // noop
        }
      }
      toast({
        title: "Guardado",
        description: "Trabajo diario actualizado correctamente.",
      });
    } catch (error) {
      console.error("❌ [RegistrarDatos.handleSave] Error al guardar", {
        trabajoId,
        selectedId,
        selectedTrabajo,
        error,
      });
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
      setSelectedTrabajo(selectedTrabajo);
      setDraftsById((prev) => ({ ...prev, [trabajoId]: selectedTrabajo }));
    } finally {
      setSaving(false);
    }
  };

  const handleCloseDay = async () => {
    if (!selectedTrabajo) return;
    const trabajoId = safeText(selectedTrabajo.id || selectedId);
    if (!trabajoId) return;
    setClosingDay(true);
    try {
      const payload: TrabajoDiarioRegistro = {
        ...selectedTrabajo,
        id: trabajoId,
        cierre_diario_confirmado: true,
      };
      console.log("📤 [RegistrarDatos.handleCloseDay] Payload local previo a PATCH", {
        trabajoId,
        selectedId,
        payload,
      });
      const saved = await TrabajosDiariosService.updateTrabajo(
        trabajoId,
        payload,
      );
      setSelectedTrabajo({
        ...payload,
        ...saved,
        id: safeText(saved.id, trabajoId),
        cierre_diario_confirmado: true,
      });
      toast({
        title: "Día cerrado",
        description: "El trabajo diario quedó cerrado para edición.",
      });
    } catch (error) {
      console.error("❌ [RegistrarDatos.handleCloseDay] Error al cerrar día", {
        trabajoId,
        selectedId,
        selectedTrabajo,
        error,
      });
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo cerrar el trabajo diario";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      if (trabajoId) {
        try {
          const detalle = await TrabajosDiariosService.getTrabajoById(
            trabajoId,
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

  const handleCrearSinVale = async () => {
    const cliente = clientes.find((c) => safeText(c.numero || c.id) === crearClienteId);
    if (!cliente) {
      toast({ title: "Falta cliente", description: "Selecciona un cliente para continuar.", variant: "destructive" });
      return;
    }
    const instNames = crearInstaladores
      .map((sel) => {
        const w = workersOptions.find((w) => safeText(w.CI) === sel || safeText(w.nombre) === sel);
        return safeText(w?.nombre, sel);
      })
      .filter(Boolean);

    if (!crearFecha) {
      toast({ title: "Falta fecha", description: "Selecciona la fecha del trabajo.", variant: "destructive" });
      return;
    }

    if (instNames.length === 0) {
      toast({ title: "Falta instalador", description: "Selecciona al menos un instalador.", variant: "destructive" });
      return;
    }

    setCreandoSinVale(true);
    try {
      const created = await TrabajosDiariosService.createTrabajoDiarioSinVale({
        cliente_numero: safeText(cliente.numero),
        fecha: crearFecha,
        instaladores: instNames,
        tipo_trabajo: crearTipo,
      });
      // Enriquecer con datos del cliente para mostrarlo en la lista
      const enriched: TrabajoDiarioRegistro = {
        ...created,
        cliente_nombre: safeText(cliente.nombre),
        cliente_telefono: safeText(cliente.telefono),
        cliente_direccion: safeText(cliente.direccion),
        fecha_trabajo: crearFecha,
      };
      setTrabajos((prev) => [enriched, ...prev]);
      setShowCrearDialog(false);
      setCrearFecha("");
      setCrearClienteId("");
      setCrearInstaladores([]);
      setCrearTipo("INSTALACION NUEVA");
      toast({ title: "Trabajo creado", description: "El trabajo diario fue creado. Ahora puedes rellenarlo." });
      if (enriched.id) void handleSelectTrabajo(enriched);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo crear el trabajo diario";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setCreandoSinVale(false);
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
              <div className="w-full">
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-start lg:justify-end">
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
                    className="shrink-0 flex-1 sm:flex-none"
                  >
                    {loading ? "Actualizando..." : "Actualizar"}
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
        <Card className="xl:col-span-1 h-auto max-h-[52vh] xl:max-h-none xl:h-[72vh] min-h-0 xl:min-h-[560px] flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">
                Resultados ({trabajosFiltrados.length})
              </CardTitle>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs shrink-0"
                onClick={() => { setCrearFecha(fecha); setShowCrearDialog(true); }}
              >
                <Plus className="h-3.5 w-3.5" />
                Sin vale
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto px-0 pb-0">
            {loading && trabajosFiltrados.length === 0 ? (
              <p className="text-sm text-muted-foreground px-6 py-4">Cargando...</p>
            ) : trabajosFiltrados.length === 0 ? (
              <p className="text-sm text-muted-foreground px-6 py-4">
                No hay trabajos para estos filtros.
              </p>
            ) : (
              <div className="space-y-3 p-3">
                {loading ? (
                  <p className="text-xs text-slate-500 px-1">Actualizando resultados...</p>
                ) : null}
                {trabajosFiltrados.map((trabajo) => {
                  const rowId = safeText(trabajo.id);
                  const active = rowId === selectedId;
                  const loadingRow = loadingTrabajoId === rowId;
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
                      disabled={loadingRow}
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
                      {loadingRow ? (
                        <p className="mt-2 text-[11px] text-blue-600">Cargando detalle...</p>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-2 h-auto xl:h-[72vh] min-h-0 xl:min-h-[560px] flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Cierre diario instalaciones</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto pr-0 xl:pr-2">
            {loadingDetalle ? (
              <div className="space-y-3 animate-pulse">
                <div className="h-10 bg-slate-100 rounded-md" />
                <div className="h-28 bg-slate-100 rounded-md" />
                <div className="h-24 bg-slate-100 rounded-md" />
                <div className="h-40 bg-slate-100 rounded-md" />
              </div>
            ) : !selectedTrabajo ? (
              <p className="text-sm text-muted-foreground">
                Selecciona un trabajo de la lista para introducir inicio, fin y materiales.
              </p>
            ) : (
              <TrabajoDiarioForm
                value={selectedTrabajo}
                onChange={handleTrabajoChange}
                materialesResumen={materialesResumen}
                onMaterialesResumenChange={setMaterialesResumen}
                onSubmit={() => void handleSave()}
                onCloseDay={() => void handleCloseDay()}
                submitLabel="Guardar datos del trabajo"
                showSubmitButton={false}
                isSaving={saving || loadingMateriales}
                isClosing={closingDay}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Diálogo: Agregar trabajo sin vale de salida ── */}
      <Dialog open={showCrearDialog} onOpenChange={setShowCrearDialog}>
        <DialogContent className="w-full max-w-2xl flex flex-col overflow-hidden p-0 gap-0">
          {/* Cabecera fija */}
          <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <DialogTitle>Agregar trabajo sin vale de salida</DialogTitle>
          </DialogHeader>

          {/* Zona scrollable */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="grid grid-cols-2 gap-4">
              {/* Fecha */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">
                  Fecha de trabajo <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={crearFecha}
                  onChange={(e) => setCrearFecha(e.target.value)}
                />
              </div>

              {/* Tipo de trabajo */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Tipo de trabajo</label>
                <select
                  value={crearTipo}
                  onChange={(e) => setCrearTipo(e.target.value as TrabajoDiarioTipo)}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="INSTALACION NUEVA">Instalación nueva</option>
                  <option value="INSTALACION EN PROCESO">Instalación en proceso</option>
                  <option value="AVERIA">Avería</option>
                  <option value="ACTUALIZACION">Actualización</option>
                </select>
              </div>

              {/* Cliente */}
              <div className="col-span-2 space-y-1">
                <label className="text-xs font-medium text-slate-600">
                  Cliente <span className="text-red-500">*</span>
                </label>
                <SearchableSelect
                  options={clienteOptions}
                  value={crearClienteId}
                  onValueChange={setCrearClienteId}
                  placeholder={loadingClientes ? "Cargando clientes..." : "Buscar cliente"}
                  searchPlaceholder="Nombre, código o dirección..."
                  disabled={loadingClientes}
                  className="w-full"
                  truncateSelected={false}
                  truncateOptions={false}
                  disablePortal={true}
                  listClassName="max-h-[180px]"
                />
              </div>

              {/* Instaladores */}
              <div className="col-span-2 space-y-1">
                <label className="text-xs font-medium text-slate-600">
                  Instaladores <span className="text-red-500">*</span>
                </label>
                <Popover open={crearInstaladorOpen} onOpenChange={setCrearInstaladorOpen}>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" role="combobox" className="w-full justify-between text-sm">
                      <span className="truncate text-left">
                        {crearInstaladores.length > 0
                          ? `${crearInstaladores.length} seleccionado(s)`
                          : "Seleccionar instaladores"}
                      </span>
                      <ChevronsUpDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start" disablePortal={true}>
                    <Command>
                      <CommandInput placeholder="Buscar trabajador..." />
                      <CommandList className="max-h-[180px]">
                        <CommandEmpty>No se encontraron trabajadores.</CommandEmpty>
                        <CommandGroup>
                          {workersOptions.map((worker, index) => {
                            const ci = safeText(worker.CI);
                            const nombre = safeText(worker.nombre) || "Trabajador";
                            const value = ci || nombre;
                            const label = ci ? `${nombre} (${ci})` : nombre;
                            const selected = crearInstaladores.includes(value);
                            return (
                              <CommandItem
                                key={`crear-${value}-${index}`}
                                value={`${value} ${label}`}
                                onSelect={() =>
                                  setCrearInstaladores((prev) =>
                                    prev.includes(value)
                                      ? prev.filter((v) => v !== value)
                                      : [...prev, value],
                                  )
                                }
                              >
                                <Check className={cn("mr-2 h-4 w-4", selected ? "opacity-100" : "opacity-0")} />
                                {label}
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {crearInstaladores.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {crearInstaladores.map((val) => {
                      const label = workerMap.get(val) || val;
                      return (
                        <Badge key={val} variant="outline" className="gap-1 text-xs">
                          <span className="max-w-[220px] truncate">{label}</span>
                          <button
                            type="button"
                            onClick={() => setCrearInstaladores((prev) => prev.filter((v) => v !== val))}
                            className="text-slate-400 hover:text-slate-700"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer fijo con botones */}
          <div className="px-6 py-4 border-t shrink-0 flex justify-end gap-2 bg-white">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowCrearDialog(false);
                setCrearFecha("");
                setCrearClienteId("");
                setCrearInstaladores([]);
                setCrearTipo("INSTALACION NUEVA");
              }}
              disabled={creandoSinVale}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => void handleCrearSinVale()}
              disabled={creandoSinVale || !crearClienteId || !crearFecha}
            >
              {creandoSinVale ? "Creando..." : "Crear trabajo"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
