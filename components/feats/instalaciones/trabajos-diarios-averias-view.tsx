"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/shared/atom/badge";
import { Button } from "@/components/shared/atom/button";
import { Input } from "@/components/shared/molecule/input";
import { Label } from "@/components/shared/atom/label";
import { Textarea } from "@/components/shared/molecule/textarea";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/shared/molecule/dialog";
import { useToast } from "@/hooks/use-toast";
import { AveriaService, ClienteService, TrabajadorService, TrabajosDiariosService } from "@/lib/api-services";
import type { Cliente } from "@/lib/types/feats/customer/cliente-types";
import type { Averia } from "@/lib/types/feats/averias/averia-types";
import type {
  TrabajoDiarioMaterialResumen,
  TrabajoDiarioRegistro,
} from "@/lib/types/feats/instalaciones/trabajos-diarios-types";
import { extraerComponentesDeOfertaConfeccion } from "@/lib/utils/oferta-confeccion-items";
import { AVERIA_CODIGOS, getAveriaCodigoLabel } from "@/lib/constants/averia-codigos";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Battery,
  Check,
  ChevronsUpDown,
  Plus,
  RefreshCw,
  Search,
  Sun,
  X,
  Zap,
} from "lucide-react";
import { TrabajoDiarioForm } from "./trabajo-diario-form";

type Worker = {
  CI?: string;
  nombre?: string;
};

const safeText = (value: unknown, fallback = "") => {
  const text = String(value || "").trim();
  return text || fallback;
};

const formatFecha = (value?: string | null) => {
  if (!value) return "Sin fecha";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value.slice(0, 10);
  return parsed.toLocaleDateString("es-ES");
};

interface ClienteConAveria {
  cliente: Cliente;
  averia: Averia;
}

// ── Sub-componente: display de oferta igual que la tabla de clientes ──
function OfertaDisplay({ cliente }: { cliente: Cliente }) {
  const oc = cliente.oferta_confeccion;
  const embebidas = (cliente.ofertas as any[])?.filter(
    (o: any) => o.inversor_codigo || o.bateria_codigo || o.panel_codigo || o.elementos_personalizados,
  ) ?? [];

  let inv: { cantidad: number; descripcion: string } | null = null;
  let bats: { cantidad: number; descripcion: string }[] = [];
  let pan: { cantidad: number; descripcion: string } | null = null;

  if (oc && oc.items?.length) {
    ({ inv, bats, pan } = extraerComponentesDeOfertaConfeccion(oc));
  } else if (embebidas.length > 0) {
    const oferta = embebidas[0];
    if (oferta.inversor_codigo && oferta.inversor_cantidad > 0)
      inv = { cantidad: oferta.inversor_cantidad, descripcion: oferta.inversor_nombre || oferta.inversor_codigo };
    if (oferta.bateria_codigo && oferta.bateria_cantidad > 0)
      bats = [{ cantidad: oferta.bateria_cantidad, descripcion: oferta.bateria_nombre || oferta.bateria_codigo }];
    if (oferta.panel_codigo && oferta.panel_cantidad > 0)
      pan = { cantidad: oferta.panel_cantidad, descripcion: oferta.panel_nombre || oferta.panel_codigo };
  }

  const sinComponentes = !inv && bats.length === 0 && !pan;

  if (sinComponentes && !oc) {
    return <p className="text-xs text-slate-400">Sin oferta</p>;
  }

  const totalOfertas = oc?.total_ofertas ?? 0;
  const totalConfirmadas = oc?.total_confirmadas ?? 0;

  return (
    <div className="space-y-1">
      {oc && (
        <div className="flex flex-wrap gap-1 mb-1">
          <span className="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-medium text-gray-700">
            {totalOfertas} {totalOfertas === 1 ? "oferta" : "ofertas"}
          </span>
          <span
            className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium ${
              totalConfirmadas > 0
                ? "bg-emerald-100 text-emerald-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {totalConfirmadas} confirmada{totalConfirmadas === 1 ? "" : "s"}
          </span>
        </div>
      )}
      <div className="space-y-0.5 text-[12px]">
        {inv && (
          <div className="flex items-center gap-1 text-gray-700">
            <Zap className="h-3 w-3 text-orange-500 shrink-0" />
            <span className="font-medium">{inv.cantidad}x</span>
            <span className="truncate">{inv.descripcion}</span>
          </div>
        )}
        {bats.map((bat, i) => (
          <div key={i} className="flex items-center gap-1 text-gray-700">
            <Battery className="h-3 w-3 text-green-500 shrink-0" />
            <span className="font-medium">{bat.cantidad}x</span>
            <span className="truncate">{bat.descripcion}</span>
          </div>
        ))}
        {pan && (
          <div className="flex items-center gap-1 text-gray-700">
            <Sun className="h-3 w-3 text-yellow-500 shrink-0" />
            <span className="font-medium">{pan.cantidad}x</span>
            <span className="truncate">{pan.descripcion}</span>
          </div>
        )}
        {sinComponentes && oc && (
          <p className="text-slate-400 text-[11px]">Sin componentes principales</p>
        )}
      </div>
    </div>
  );
}

// ── Dialog para crear nueva avería ──
interface NuevaAveriaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientePreseleccionado?: Cliente | null;
  onSuccess: () => void;
}

function NuevaAveriaDialog({
  open,
  onOpenChange,
  clientePreseleccionado,
  onSuccess,
}: NuevaAveriaDialogProps) {
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [codigo, setCodigo] = useState("");
  const [searchCliente, setSearchCliente] = useState("");
  const [fechaReporte, setFechaReporte] = useState(() => new Date().toISOString().slice(0, 10));
  const [horaReporte, setHoraReporte] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  });

  const clientesFiltrados = useMemo(() => {
    if (!searchCliente.trim()) return [];
    const q = searchCliente.toLowerCase();
    return clientes.filter(
      (c) =>
        c.nombre.toLowerCase().includes(q) ||
        c.numero.toLowerCase().includes(q) ||
        c.telefono?.toLowerCase().includes(q) ||
        c.direccion?.toLowerCase().includes(q),
    );
  }, [clientes, searchCliente]);

  useEffect(() => {
    if (!open) return;
    if (clientePreseleccionado) {
      setClienteSeleccionado(safeText(clientePreseleccionado.numero));
      setClientes([clientePreseleccionado]);
      return;
    }
    setLoadingClientes(true);
    ClienteService.getClientes({})
      .then((data) => setClientes(data.clients || []))
      .catch(() => setClientes([]))
      .finally(() => setLoadingClientes(false));
  }, [open, clientePreseleccionado]);

  const handleClose = () => {
    setClienteSeleccionado("");
    setDescripcion("");
    setCodigo("");
    setSearchCliente("");
    const now = new Date();
    setFechaReporte(now.toISOString().slice(0, 10));
    setHoraReporte(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`);
    onOpenChange(false);
  };

  const handleCrear = async () => {
    if (!clienteSeleccionado) {
      toast({ title: "Error", description: "Debes seleccionar un cliente", variant: "destructive" });
      return;
    }
    if (!descripcion.trim()) {
      toast({ title: "Error", description: "Debes ingresar una descripción", variant: "destructive" });
      return;
    }
    setIsCreating(true);
    try {
      await AveriaService.agregarAveria(clienteSeleccionado, {
        descripcion: descripcion.trim(),
        estado: "Pendiente",
        codigo: codigo || null,
        fecha_reporte: `${fechaReporte}T${horaReporte}:00`,
      });
      toast({ title: "Avería creada", description: "La avería se registró correctamente." });
      handleClose();
      onSuccess();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "No se pudo crear la avería";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  const clienteActual = clientes.find((c) => c.numero === clienteSeleccionado);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Crear nueva avería
          </DialogTitle>
          <DialogDescription>Registra una nueva avería para un cliente</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Cliente */}
          <div>
            <Label>Buscar y seleccionar cliente *</Label>
            {clienteActual && !searchCliente ? (
              <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-green-900">{clienteActual.nombre}</p>
                    <p className="text-xs text-green-700">
                      {clienteActual.numero} • {clienteActual.telefono}
                    </p>
                    {clienteActual.direccion && (
                      <p className="text-xs text-green-600 truncate">{clienteActual.direccion}</p>
                    )}
                  </div>
                  {!clientePreseleccionado && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => { setClienteSeleccionado(""); setSearchCliente(""); }}
                      className="text-green-700 hover:text-green-900 hover:bg-green-100"
                    >
                      Cambiar
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar por nombre, código o teléfono..."
                    value={searchCliente}
                    onChange={(e) => setSearchCliente(e.target.value)}
                    className="pl-10"
                    disabled={isCreating || loadingClientes || Boolean(clientePreseleccionado)}
                  />
                </div>
                {searchCliente && !clienteSeleccionado && (
                  <div className="border rounded-lg max-h-[180px] overflow-y-auto bg-white shadow-lg mt-1">
                    {loadingClientes ? (
                      <div className="px-4 py-6 text-center text-gray-500">Cargando clientes...</div>
                    ) : clientesFiltrados.length > 0 ? (
                      <div className="divide-y">
                        {clientesFiltrados.slice(0, 15).map((c) => (
                          <button
                            key={c.numero}
                            type="button"
                            onClick={() => { setClienteSeleccionado(c.numero); setSearchCliente(""); }}
                            className="w-full text-left px-4 py-2.5 hover:bg-blue-50 transition-colors"
                          >
                            <p className="font-medium text-gray-900 text-sm">{c.nombre}</p>
                            <p className="text-xs text-gray-600 mt-0.5">{c.numero} • {c.telefono}</p>
                            {c.direccion && (
                              <p className="text-xs text-gray-400 truncate mt-0.5">{c.direccion}</p>
                            )}
                          </button>
                        ))}
                        {clientesFiltrados.length > 15 && (
                          <div className="px-4 py-2 text-xs text-gray-500 text-center bg-gray-50">
                            Mostrando 15 de {clientesFiltrados.length} resultados
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="px-4 py-6 text-center text-sm text-gray-500">
                        No se encontraron clientes
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Fecha y hora del reporte */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="fecha-reporte-dlg">Fecha del reporte *</Label>
              <input
                id="fecha-reporte-dlg"
                type="date"
                value={fechaReporte}
                onChange={(e) => setFechaReporte(e.target.value)}
                disabled={isCreating}
                className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <Label htmlFor="hora-reporte-dlg">Hora del reporte *</Label>
              <input
                id="hora-reporte-dlg"
                type="time"
                value={horaReporte}
                onChange={(e) => setHoraReporte(e.target.value)}
                disabled={isCreating}
                className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Código */}
          <div>
            <Label htmlFor="codigo-averia">Código de causa</Label>
            <select
              id="codigo-averia"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              disabled={isCreating}
              className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— Sin código —</option>
              {AVERIA_CODIGOS.map((op) => (
                <option key={op.codigo} value={op.codigo}>
                  {op.label}
                </option>
              ))}
            </select>
          </div>

          {/* Descripción */}
          <div>
            <Label htmlFor="descripcion-averia">Descripción de la avería *</Label>
            <Textarea
              id="descripcion-averia"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej: Inversor no enciende, panel dañado, batería no carga, etc."
              rows={4}
              disabled={isCreating}
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">Describe el problema de forma clara y detallada</p>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={handleClose} disabled={isCreating}>
            Cancelar
          </Button>
          <Button
            onClick={() => void handleCrear()}
            disabled={isCreating || !clienteSeleccionado || !descripcion.trim()}
            className="bg-gradient-to-r from-red-500 to-red-600"
          >
            {isCreating ? "Creando..." : "Crear avería"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Componente principal ──
export function TrabajosDiariosAveriasView() {
  const { toast } = useToast();

  // Panel izquierdo
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [clientesConAverias, setClientesConAverias] = useState<ClienteConAveria[]>([]);
  const [selectedItem, setSelectedItem] = useState<ClienteConAveria | null>(null);
  const [searchCliente, setSearchCliente] = useState("");
  const [showNuevaAveriaDialog, setShowNuevaAveriaDialog] = useState(false);
  const [clienteParaNuevaAveria, setClienteParaNuevaAveria] = useState<Cliente | null>(null);

  // Panel derecho
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [instaladores, setInstaladores] = useState<string[]>([]);
  const [instaladorOpen, setInstaladorOpen] = useState(false);
  const [fecha, setFecha] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [selectedTrabajo, setSelectedTrabajo] = useState<TrabajoDiarioRegistro | null>(null);
  const [trabajosAnteriores, setTrabajosAnteriores] = useState<TrabajoDiarioRegistro[]>([]);
  const [materialesResumen, setMaterialesResumen] = useState<TrabajoDiarioMaterialResumen[]>([]);
  const [saving, setSaving] = useState(false);
  const [closing, setClosing] = useState(false);
  const [averiaCodigoEdit, setAveriaCodigoEdit] = useState<string>("");
  const [loadingTrabajo, setLoadingTrabajo] = useState(false);
  const draftsById = useRef<Record<string, TrabajoDiarioRegistro>>({});

  const loadWorkers = useCallback(async () => {
    try {
      const data = await TrabajadorService.getAllTrabajadores();
      setWorkers((data as unknown as Worker[]) || []);
    } catch {
      setWorkers([]);
    }
  }, []);

  const loadClientesConAverias = useCallback(async () => {
    setLoadingClientes(true);
    try {
      const clientes = await ClienteService.getClientesConAverias();
      const items: ClienteConAveria[] = [];
      for (const cliente of clientes) {
        const pendientes = (cliente.averias || []).filter((a) => a.estado === "Pendiente");
        for (const averia of pendientes) {
          items.push({ cliente, averia });
        }
      }
      setClientesConAverias(items);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al cargar averías";
      toast({ title: "Error", description: message, variant: "destructive" });
      setClientesConAverias([]);
    } finally {
      setLoadingClientes(false);
    }
  }, [toast]);

  useEffect(() => {
    void Promise.all([loadWorkers(), loadClientesConAverias()]);
  }, [loadWorkers, loadClientesConAverias]);

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

  const instaladorLabels = useMemo(
    () => instaladores.map((v) => workerMap.get(v) || v).filter(Boolean),
    [instaladores, workerMap],
  );

  const itemsFiltrados = useMemo(() => {
    if (!searchCliente.trim()) return clientesConAverias;
    const q = searchCliente.toLowerCase();
    return clientesConAverias.filter(
      ({ cliente, averia }) =>
        safeText(cliente.nombre).toLowerCase().includes(q) ||
        safeText(cliente.numero).toLowerCase().includes(q) ||
        safeText(averia.descripcion).toLowerCase().includes(q),
    );
  }, [clientesConAverias, searchCliente]);

  const crearBorradorNuevo = useCallback(
    (item: ClienteConAveria): TrabajoDiarioRegistro => ({
      cliente_numero: safeText(item.cliente.numero) || undefined,
      cliente_nombre: safeText(item.cliente.nombre) || undefined,
      cliente_telefono: safeText(item.cliente.telefono) || undefined,
      cliente_direccion: safeText(item.cliente.direccion) || undefined,
      fecha_trabajo: fecha,
      tipo_trabajo: "AVERIA",
      averia_id: safeText(item.averia.id) || undefined,
      problema_encontrado: safeText(item.averia.descripcion),
      solucion: "",
      instaladores: instaladores
        .map((v) => {
          const w = workersOptions.find((w) => safeText(w.CI) === v || safeText(w.nombre) === v);
          return safeText(w?.nombre, v);
        })
        .filter(Boolean),
      inicio: { archivos: [], comentario: "", fecha: "" },
      fin: { archivos: [], comentario: "", fecha: "" },
      materiales_utilizados: [],
    }),
    [fecha, instaladores, workersOptions],
  );

  const handleNuevoTrabajo = useCallback(() => {
    if (!selectedItem) return;
    setMaterialesResumen([]);
    if (selectedTrabajo?.cierre_diario_confirmado) {
      setTrabajosAnteriores((prev) =>
        prev.some((t) => t.id === selectedTrabajo.id) ? prev : [selectedTrabajo, ...prev],
      );
    }
    setSelectedTrabajo(crearBorradorNuevo(selectedItem));
  }, [selectedItem, selectedTrabajo, crearBorradorNuevo]);

  const handleSelectItem = useCallback(
    async (item: ClienteConAveria) => {
      setSelectedItem(item);
      setSelectedTrabajo(null);
      setTrabajosAnteriores([]);
      setMaterialesResumen([]);
      setAveriaCodigoEdit(safeText(item.averia.codigo));
      setLoadingTrabajo(true);
      try {
        const clienteNumero = safeText(item.cliente.numero);
        const averiaId = safeText(item.averia.id);

        // Traer todos los trabajos del cliente y filtrar por averia_id
        let todos: TrabajoDiarioRegistro[] = [];
        try {
          todos = await TrabajosDiariosService.getTrabajosByCliente(clienteNumero);
        } catch {
          try {
            todos = await TrabajosDiariosService.getTrabajos({ cliente_numero: clienteNumero });
          } catch { /* continuar con borrador vacío */ }
        }

        // Trabajos de ESTA avería, ordenados del más reciente al más antiguo.
        // Si averia_id aún no coincide (trabajo viejo sin ese campo) también
        // buscamos por tipo_trabajo AVERIA como fallback, pero priorizamos averia_id.
        const deEstaAveria = todos
          .filter((t) => averiaId ? safeText(t.averia_id) === averiaId : safeText(t.tipo_trabajo) === "AVERIA")
          .sort((a, b) => safeText(b.fecha_trabajo).localeCompare(safeText(a.fecha_trabajo)));

        // Cualquier trabajo no cerrado de esta avería → cargarlo (sin filtrar por fecha)
        const abierto = deEstaAveria.find((t) => !t.cierre_diario_confirmado);

        if (abierto?.id) {
          const detalle = await TrabajosDiariosService.getTrabajoById(abierto.id);
          draftsById.current[safeText(detalle.id)] = detalle;
          setSelectedTrabajo(detalle);
          if (detalle.instaladores && detalle.instaladores.length > 0) {
            setInstaladores(detalle.instaladores);
          }
          const cerrados = deEstaAveria.filter((t) => t.id !== abierto.id && !!t.cierre_diario_confirmado);
          setTrabajosAnteriores(cerrados);
          try {
            const resumen = await TrabajosDiariosService.getMaterialesResumen(detalle.id!);
            setMaterialesResumen(resumen);
          } catch { /* noop */ }
          return;
        }

        // Sin trabajo abierto → los cerrados van al resumen, crear borrador nuevo
        setTrabajosAnteriores(deEstaAveria.filter((t) => !!t.cierre_diario_confirmado));
        setSelectedTrabajo(crearBorradorNuevo(item));
      } catch (error) {
        const message = error instanceof Error ? error.message : "Error al cargar trabajo";
        toast({ title: "Error", description: message, variant: "destructive" });
        setSelectedTrabajo(null);
      } finally {
        setLoadingTrabajo(false);
      }
    },
    [fecha, instaladores, toast, workersOptions, crearBorradorNuevo],
  );

  const handleTrabajoChange = useCallback((next: TrabajoDiarioRegistro) => {
    setSelectedTrabajo(next);
    const id = safeText(next.id);
    if (id) draftsById.current[id] = next;
  }, []);

  const actualizarCodigoAveria = async () => {
    if (!selectedItem) return;
    const clienteNumero = safeText(selectedItem.cliente.numero);
    const averiaId = safeText(selectedItem.averia.id);
    const codigoOriginal = safeText(selectedItem.averia.codigo);
    if (!clienteNumero || !averiaId) return;
    if (averiaCodigoEdit === codigoOriginal) return;
    try {
      await AveriaService.actualizarAveria(clienteNumero, averiaId, {
        codigo: averiaCodigoEdit || null,
      });
    } catch {
      // no bloquear el flujo principal si falla actualizar el código
    }
  };

  const buildPayload = (): TrabajoDiarioRegistro | null => {
    if (!selectedTrabajo) return null;
    const instNames = instaladores
      .map((v) => {
        const w = workersOptions.find((ww) => safeText(ww.CI) === v || safeText(ww.nombre) === v);
        return safeText(w?.nombre, v);
      })
      .filter(Boolean);
    return {
      ...selectedTrabajo,
      tipo_trabajo: "AVERIA",
      instaladores: (selectedTrabajo.instaladores || []).length > 0 ? selectedTrabajo.instaladores : instNames,
      fecha_trabajo: fecha,
    };
  };

  const ensureTrabajoCreado = async (payload: TrabajoDiarioRegistro): Promise<{ id: string; merged: TrabajoDiarioRegistro }> => {
    const trabajoId = safeText(payload.id);
    if (trabajoId) {
      const saved = await TrabajosDiariosService.updateTrabajo(trabajoId, payload);
      const merged = { ...payload, ...saved, id: safeText(saved.id, trabajoId) };
      return { id: safeText(merged.id), merged };
    }
    if (!selectedItem) throw new Error("No hay avería seleccionada");
    const instNames = (payload.instaladores || []).filter(Boolean);
    if (instNames.length === 0) throw new Error("Selecciona al menos un instalador antes de guardar");
    const created = await TrabajosDiariosService.createTrabajoDiarioSinVale({
      cliente_numero: safeText(selectedItem.cliente.numero),
      fecha,
      instaladores: instNames,
      tipo_trabajo: "AVERIA",
    });
    const withData = await TrabajosDiariosService.updateTrabajo(safeText(created.id), {
      ...payload,
      id: safeText(created.id),
    });
    const merged = { ...payload, ...withData, id: safeText(withData.id || created.id) };
    return { id: safeText(merged.id), merged };
  };

  const handleSave = async () => {
    const payload = buildPayload();
    if (!payload) return;
    setSaving(true);
    try {
      await actualizarCodigoAveria();
      const { merged } = await ensureTrabajoCreado(payload);
      setSelectedTrabajo(merged);
      draftsById.current[safeText(merged.id)] = merged;
      toast({ title: "Guardado", description: "Trabajo guardado correctamente." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo guardar";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleCloseDay = async () => {
    const payload = buildPayload();
    if (!payload) return;
    setClosing(true);
    try {
      await actualizarCodigoAveria();
      const { merged } = await ensureTrabajoCreado(payload);
      await TrabajosDiariosService.updateTrabajo(merged.id!, {
        ...merged,
        cierre_diario_confirmado: true,
      });
      const estadoMsg = merged.hay_pendiente ? "La avería quedó como pendiente." : "La avería fue marcada como solucionada.";
      toast({ title: "Día cerrado", description: estadoMsg });
      setSelectedItem(null);
      setSelectedTrabajo(null);
      setMaterialesResumen([]);
      void loadClientesConAverias();
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo cerrar el día";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setClosing(false);
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-stretch">
        {/* ── Panel izquierdo ── */}
        <Card className="xl:col-span-1 h-auto max-h-[52vh] xl:max-h-none xl:h-[78vh] min-h-0 xl:min-h-[560px] flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">
                Averías pendientes ({itemsFiltrados.length})
              </CardTitle>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-1 text-xs"
                  onClick={() => { setClienteParaNuevaAveria(null); setShowNuevaAveriaDialog(true); }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Nueva
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void loadClientesConAverias()}
                  disabled={loadingClientes}
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", loadingClientes && "animate-spin")} />
                </Button>
              </div>
            </div>
            <Input
              placeholder="Buscar cliente o avería..."
              value={searchCliente}
              onChange={(e) => setSearchCliente(e.target.value)}
              className="mt-2 h-8 text-sm"
            />
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto px-0 pb-0">
            {loadingClientes ? (
              <p className="text-sm text-muted-foreground px-6 py-4">Cargando...</p>
            ) : itemsFiltrados.length === 0 ? (
              <p className="text-sm text-muted-foreground px-6 py-4">No hay averías pendientes.</p>
            ) : (
              <div className="space-y-3 p-3">
                {itemsFiltrados.map(({ cliente, averia }) => {
                  const key = `${safeText(cliente.id)}-${safeText(averia.id)}`;
                  const active =
                    selectedItem?.averia.id === averia.id &&
                    selectedItem?.cliente.id === cliente.id;

                  return (
                    <div
                      key={key}
                      className={cn(
                        "w-full text-left rounded-xl border transition shadow-sm overflow-hidden",
                        active
                          ? "border-orange-300 bg-orange-50 ring-1 ring-orange-100"
                          : "border-slate-200 bg-white",
                      )}
                    >
                      {/* Zona clickable principal */}
                      <button
                        type="button"
                        className="w-full text-left p-3.5 hover:bg-orange-50/60 transition"
                        onClick={() => void handleSelectItem({ cliente, averia })}
                      >
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          Cliente
                        </p>
                        <p className="text-sm font-semibold text-slate-900 truncate mt-0.5">
                          {safeText(cliente.nombre, "Sin nombre")}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {safeText(cliente.numero, "Sin código")}
                        </p>
                        {cliente.direccion && (
                          <p className="text-xs text-slate-400 truncate">
                            {cliente.direccion}
                          </p>
                        )}

                        {/* Oferta */}
                        <div className="mt-2 rounded-md bg-slate-50 border border-slate-200 px-2.5 py-2">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
                            Oferta
                          </p>
                          <OfertaDisplay cliente={cliente} />
                        </div>

                        {/* Avería */}
                        <div className="mt-2 space-y-2">
                          {averia.codigo && (
                            <div className="rounded-md bg-blue-50 border border-blue-200 px-2.5 py-2">
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-600">
                                Código
                              </p>
                              <p className="text-xs font-semibold text-blue-800">
                                {averia.codigo}
                              </p>
                              <p className="text-xs text-blue-700 mt-0.5">
                                {getAveriaCodigoLabel(averia.codigo).replace(`${averia.codigo} – `, "")}
                              </p>
                            </div>
                          )}
                          <div className="rounded-md bg-orange-50 border border-orange-200 px-2.5 py-2">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-orange-600">
                              Descripción
                            </p>
                            <p className="text-xs text-slate-700 line-clamp-3">
                              {safeText(averia.descripcion, "Sin descripción")}
                            </p>
                          </div>
                          <div className="rounded-md bg-slate-50 border border-slate-200 px-2.5 py-2">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                              Fecha reporte
                            </p>
                            <p className="text-xs text-slate-700">
                              {formatFecha(averia.fecha_reporte)}
                            </p>
                          </div>
                        </div>
                      </button>

                      {/* Botón agregar avería al cliente */}
                      <div className="px-3.5 pb-3">
                        <button
                          type="button"
                          className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-orange-300 py-1.5 text-[11px] font-medium text-orange-600 hover:bg-orange-50 transition"
                          onClick={(e) => {
                            e.stopPropagation();
                            setClienteParaNuevaAveria(cliente);
                            setShowNuevaAveriaDialog(true);
                          }}
                        >
                          <Plus className="h-3 w-3" />
                          Agregar avería a este cliente
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Panel derecho ── */}
        <Card className="xl:col-span-2 h-auto xl:h-[78vh] min-h-0 xl:min-h-[560px] flex flex-col">
          <CardHeader className="pb-3 shrink-0">
            <CardTitle className="text-base">Registro de avería</CardTitle>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Fecha de trabajo</label>
                <Input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Instaladores</label>
                <Popover open={instaladorOpen} onOpenChange={setInstaladorOpen}>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" role="combobox" className="w-full justify-between">
                      <span className="truncate text-left">
                        {instaladorLabels.length > 0
                          ? `${instaladorLabels.length} seleccionado(s)`
                          : "Seleccionar instaladores"}
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
                            const selected = instaladores.includes(value);
                            return (
                              <CommandItem
                                key={`inst-${value}-${index}`}
                                value={`${value} ${label}`}
                                onSelect={() =>
                                  setInstaladores((prev) =>
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
                {instaladorLabels.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {instaladorLabels.map((label, i) => (
                      <Badge key={`badge-${i}`} variant="outline" className="gap-1 text-xs">
                        <span className="max-w-[180px] truncate">{label}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const val = instaladores[i];
                            if (val) setInstaladores((prev) => prev.filter((v) => v !== val));
                          }}
                          className="text-slate-400 hover:text-slate-700"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto pr-0 xl:pr-2">
            {loadingTrabajo ? (
              <div className="space-y-3 animate-pulse">
                <div className="h-10 bg-slate-100 rounded-md" />
                <div className="h-28 bg-slate-100 rounded-md" />
                <div className="h-24 bg-slate-100 rounded-md" />
              </div>
            ) : !selectedItem ? (
              <p className="text-sm text-muted-foreground">
                Selecciona una avería de la lista para registrar el trabajo.
              </p>
            ) : !selectedTrabajo ? (
              <p className="text-sm text-muted-foreground">Cargando información del cliente...</p>
            ) : (
              <div className="space-y-3">
                {/* Trabajos anteriores de esta avería */}
                {trabajosAnteriores.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                      Trabajos anteriores en esta avería
                    </p>
                    {trabajosAnteriores.map((t, i) => (
                      <div key={t.id ?? i} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 space-y-1.5">
                        <p className="text-xs font-semibold text-amber-700">
                          {safeText(t.fecha_trabajo).slice(0, 10) || "Sin fecha"}
                          {t.instaladores?.length ? ` — ${t.instaladores.join(", ")}` : ""}
                        </p>
                        {(t.hora_salida || t.hora_llegada_trabajo || t.hora_concluido || t.hora_llegada_almacen) && (
                          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs text-amber-800">
                            {t.hora_salida && <p><span className="font-medium">Salida:</span> {t.hora_salida}</p>}
                            {t.hora_llegada_trabajo && <p><span className="font-medium">Llegada:</span> {t.hora_llegada_trabajo}</p>}
                            {t.hora_concluido && <p><span className="font-medium">Concluido:</span> {t.hora_concluido}</p>}
                            {t.hora_llegada_almacen && <p><span className="font-medium">Almacén:</span> {t.hora_llegada_almacen}</p>}
                          </div>
                        )}
                        {t.problema_encontrado && (
                          <p className="text-xs text-amber-800">
                            <span className="font-medium">Problema:</span> {t.problema_encontrado}
                          </p>
                        )}
                        {t.solucion && (
                          <p className="text-xs text-amber-800">
                            <span className="font-medium">Solución:</span> {t.solucion}
                          </p>
                        )}
                        {t.hay_pendiente && (
                          <p className="text-xs text-amber-800">
                            <span className="font-medium">Pendiente:</span> {t.descripcion_pendiente || "Sí"}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Código de causa de la avería — editable desde aquí */}
                <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                    Código de causa de la avería
                  </label>
                  <select
                    value={averiaCodigoEdit}
                    onChange={(e) => setAveriaCodigoEdit(e.target.value)}
                    disabled={selectedTrabajo.cierre_diario_confirmado}
                    className="w-full rounded-md border border-blue-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                  >
                    <option value="">— Sin código —</option>
                    {AVERIA_CODIGOS.map((op) => (
                      <option key={op.codigo} value={op.codigo}>
                        {op.label}
                      </option>
                    ))}
                  </select>
                </div>

                <TrabajoDiarioForm
                  value={selectedTrabajo}
                  onChange={handleTrabajoChange}
                  materialesResumen={materialesResumen}
                  onMaterialesResumenChange={setMaterialesResumen}
                  onSubmit={() => void handleSave()}
                  submitLabel="Guardar avería"
                  showSubmitButton={false}
                  isSaving={saving}
                  showInicioSection={true}
                  showMaterialesSection={false}
                  forcedTipoTrabajo="AVERIA"
                />
              </div>
            )}
          </CardContent>

          {selectedTrabajo && (
            <div className="px-6 py-4 border-t shrink-0 flex justify-end gap-2 bg-white">
              {selectedTrabajo.cierre_diario_confirmado ? (
                <Button
                  type="button"
                  onClick={handleNuevoTrabajo}
                  className="bg-gradient-to-r from-orange-500 to-orange-600"
                >
                  Nuevo trabajo para hoy
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void handleSave()}
                    disabled={saving || closing}
                  >
                    {saving ? "Guardando..." : "Guardar"}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => void handleCloseDay()}
                    disabled={saving || closing}
                    className="bg-gradient-to-r from-emerald-500 to-emerald-600"
                  >
                    {closing ? "Cerrando..." : "Cerrar día"}
                  </Button>
                </>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* ── Dialog: nueva avería ── */}
      <NuevaAveriaDialog
        open={showNuevaAveriaDialog}
        onOpenChange={setShowNuevaAveriaDialog}
        clientePreseleccionado={clienteParaNuevaAveria}
        onSuccess={() => void loadClientesConAverias()}
      />
    </>
  );
}
