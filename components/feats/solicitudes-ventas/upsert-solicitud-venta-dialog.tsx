"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
import { Button } from "@/components/shared/atom/button";
import { Input } from "@/components/shared/molecule/input";
import { Label } from "@/components/shared/atom/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select";
import { Badge } from "@/components/shared/atom/badge";
import {
  Loader2,
  Package,
  Plus,
  Search,
  Trash2,
  ClipboardList,
  UserRoundPlus,
  X,
  BookmarkCheck,
  ChevronDown,
  ChevronUp,
  Warehouse,
  User,
  AlertTriangle,
} from "lucide-react";
import {
  ClienteVentaService,
  InventarioService,
  ReservaVentaService,
  SolicitudVentaService,
} from "@/lib/api-services";
import type {
  Almacen,
  ClienteVenta,
  MaterialVentaWeb,
  Reserva,
  SolicitudVenta,
  SolicitudVentaCreateData,
  SolicitudVentaUpdateData,
} from "@/lib/api-types";

interface MaterialRow {
  material_id: string;
  cantidad: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  um?: string;
  foto?: string;
  stock_actual: number | null;
  alerta_stock: boolean;
  stock_suficiente: boolean;
  stock_despues: number | null;
  faltante: number;
}

interface UpsertSolicitudVentaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (
    data: SolicitudVentaCreateData | SolicitudVentaUpdateData,
  ) => Promise<void>;
  solicitud?: SolicitudVenta | null;
  isLoading?: boolean;
}

const toFiniteNumberV = (value: unknown): number | null => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const normalizeCodeV = (value?: string): string => value?.trim().toLowerCase() || "";

const calculateStockAlertV = (
  cantidadDespachar: number,
  stockActual: number | null,
  fallbackAlert = false,
) => {
  if (stockActual === null) {
    return {
      alerta_stock: fallbackAlert,
      stock_suficiente: !fallbackAlert,
      stock_despues: null,
      faltante: 0,
    };
  }
  const alerta_stock = cantidadDespachar > stockActual;
  return {
    alerta_stock,
    stock_suficiente: !alerta_stock,
    faltante: Math.max(cantidadDespachar - stockActual, 0),
    stock_despues: stockActual - cantidadDespachar,
  };
};

const getStockFromAlmacenV = async (
  almacenId: string,
  materialId: string,
  materialCodigo?: string,
): Promise<number | null> => {
  if (!almacenId) return null;
  try {
    let stockRows = await InventarioService.getStock({
      almacen_id: almacenId,
      material_id: materialId,
    });
    if ((!stockRows || stockRows.length === 0) && materialCodigo) {
      stockRows = await InventarioService.getStock({
        almacen_id: almacenId,
        material_codigo: materialCodigo,
      });
    }
    if (!stockRows || stockRows.length === 0) return 0;
    const targetCode = normalizeCodeV(materialCodigo);
    const match =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      stockRows.find((row: any) => row.material_id === materialId) ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      stockRows.find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (row: any) =>
          targetCode.length > 0 &&
          normalizeCodeV(String(row.material_codigo || "")) === targetCode,
      ) ||
      stockRows[0];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return toFiniteNumberV((match as any)?.cantidad) ?? 0;
  } catch {
    return 0;
  }
};

const formatClienteLabel = (cliente: ClienteVenta) =>
  cliente.numero
    ? `${cliente.nombre} (${cliente.numero})`
    : `${cliente.nombre} (${cliente.id.slice(-6).toUpperCase()})`;

export function UpsertSolicitudVentaDialog({
  open,
  onOpenChange,
  onSubmit,
  solicitud,
  isLoading = false,
}: UpsertSolicitudVentaDialogProps) {
  const [selectedClienteVenta, setSelectedClienteVenta] =
    useState<ClienteVenta | null>(null);
  const [clienteSearch, setClienteSearch] = useState("");
  const [clienteSearchResults, setClienteSearchResults] = useState<
    ClienteVenta[]
  >([]);
  const [showClienteDropdown, setShowClienteDropdown] = useState(false);
  const [loadingClientes, setLoadingClientes] = useState(false);

  const [showQuickCreateCliente, setShowQuickCreateCliente] = useState(false);
  const [quickNombre, setQuickNombre] = useState("");
  const [quickDireccion, setQuickDireccion] = useState("");
  const [quickTelefono, setQuickTelefono] = useState("");
  const [quickCi, setQuickCi] = useState("");
  const [quickCreateError, setQuickCreateError] = useState<string | null>(null);
  const [quickCreateLoading, setQuickCreateLoading] = useState(false);

  const [selectedAlmacenId, setSelectedAlmacenId] = useState("");
  const [almacenes, setAlmacenes] = useState<Almacen[]>([]);
  const [materialesVendibles, setMaterialesVendibles] = useState<
    MaterialVentaWeb[]
  >([]);
  const [materialRows, setMaterialRows] = useState<MaterialRow[]>([]);

  const [materialSearch, setMaterialSearch] = useState("");
  const [showMaterialDropdown, setShowMaterialDropdown] = useState(false);

  const [loadingData, setLoadingData] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Reserva shortcut
  const [showReservaPanel, setShowReservaPanel] = useState(false);
  const [reservasActivas, setReservasActivas] = useState<Reserva[]>([]);
  const [loadingReservas, setLoadingReservas] = useState(false);
  const [reservaAplicada, setReservaAplicada] = useState<Reserva | null>(null);

  const isEdit = Boolean(solicitud?.id);

  // Ref to access current materialRows inside effects without causing loops
  const materialRowsRef = useRef<MaterialRow[]>([]);
  materialRowsRef.current = materialRows;

  useEffect(() => {
    if (!open) return;

    const loadData = async () => {
      setLoadingData(true);
      setLoadError(null);
      try {
        const [almacenesData, materialesData] = await Promise.all([
          InventarioService.getAlmacenes(),
          SolicitudVentaService.getMaterialesVendiblesWeb(),
        ]);

        setAlmacenes(Array.isArray(almacenesData) ? almacenesData : []);
        setMaterialesVendibles(
          Array.isArray(materialesData) ? materialesData : [],
        );
      } catch (error) {
        console.error("Error loading solicitud venta dialog data:", error);
        setLoadError(
          error instanceof Error
            ? error.message
            : "No se pudieron cargar almacenes y materiales vendibles",
        );
      } finally {
        setLoadingData(false);
      }
    };

    void loadData();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const clienteSolicitud = solicitud?.cliente_venta || null;
    setSelectedClienteVenta(clienteSolicitud);
    setClienteSearch(
      clienteSolicitud ? formatClienteLabel(clienteSolicitud) : "",
    );
    setClienteSearchResults([]);
    setShowClienteDropdown(false);
    setShowQuickCreateCliente(false);
    setQuickNombre("");
    setQuickDireccion("");
    setQuickTelefono("");
    setQuickCi("");
    setQuickCreateError(null);

    setSelectedAlmacenId(solicitud?.almacen_id || solicitud?.almacen?.id || "");

    const initialRows: MaterialRow[] = (solicitud?.materiales || []).map(
      (item) => ({
        material_id: item.material_id,
        cantidad: item.cantidad,
        codigo:
          item.material?.codigo || item.material_codigo || item.codigo || "",
        nombre:
          item.material?.nombre ||
          item.material?.descripcion ||
          item.material_descripcion ||
          item.descripcion ||
          item.material_id,
        descripcion:
          item.material?.descripcion ||
          item.material_descripcion ||
          item.descripcion ||
          item.material?.nombre,
        um: item.material?.um || item.um,
        foto: item.material?.foto,
        stock_actual: null,
        alerta_stock: false,
        stock_suficiente: true,
        stock_despues: null,
        faltante: 0,
      }),
    );

    setMaterialRows(initialRows);
    setMaterialSearch("");
    setShowMaterialDropdown(false);
    setShowReservaPanel(false);
    setReservasActivas([]);
    setReservaAplicada(null);

    if (!clienteSolicitud && solicitud?.cliente_venta_id) {
      void ClienteVentaService.getClienteById(solicitud.cliente_venta_id)
        .then((cliente) => {
          if (!cliente) return;
          setSelectedClienteVenta(cliente);
          setClienteSearch(formatClienteLabel(cliente));
        })
        .catch(() => {
          // Si falla la carga del cliente, el usuario puede buscarlo manualmente.
        });
    }
  }, [open, solicitud]);

  useEffect(() => {
    if (!open) return;

    const term = clienteSearch.trim();
    if (!term || selectedClienteVenta) {
      setClienteSearchResults([]);
      setShowClienteDropdown(false);
      return;
    }

    const handler = setTimeout(async () => {
      setLoadingClientes(true);
      try {
        const data = await ClienteVentaService.buscarClientesPorNombre(
          term,
          20,
        );
        setClienteSearchResults(data);
        setShowClienteDropdown(data.length > 0);
      } catch {
        setClienteSearchResults([]);
        setShowClienteDropdown(false);
      } finally {
        setLoadingClientes(false);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [open, clienteSearch, selectedClienteVenta]);

  const filteredMateriales = useMemo(() => {
    const term = materialSearch.trim().toLowerCase();
    if (!term) return [];

    return materialesVendibles
      .filter((material) => {
        if (materialRows.some((row) => row.material_id === material.id)) {
          return false;
        }

        const searchIndex = [
          material.codigo,
          material.nombre,
          material.descripcion,
          material.categoria,
        ]
          .join(" ")
          .toLowerCase();

        return searchIndex.includes(term);
      })
      .slice(0, 20);
  }, [materialSearch, materialesVendibles, materialRows]);

  useEffect(() => {
    setShowMaterialDropdown(filteredMateriales.length > 0);
  }, [filteredMateriales]);

  const validMaterials = useMemo(
    () =>
      materialRows.filter(
        (item) => item.material_id.trim().length > 0 && item.cantidad > 0,
      ),
    [materialRows],
  );

  const canSubmit = useMemo(() => {
    if (!selectedClienteVenta?.id) return false;
    if (!selectedAlmacenId.trim()) return false;
    if (validMaterials.length === 0) return false;
    if (submitting || isLoading || loadingData) return false;
    return true;
  }, [
    selectedClienteVenta,
    selectedAlmacenId,
    validMaterials.length,
    submitting,
    isLoading,
    loadingData,
  ]);

  const handleSelectCliente = (cliente: ClienteVenta) => {
    setSelectedClienteVenta(cliente);
    setClienteSearch(formatClienteLabel(cliente));
    setClienteSearchResults([]);
    setShowClienteDropdown(false);
    setShowQuickCreateCliente(false);
    setQuickCreateError(null);
  };

  const handleClearCliente = () => {
    setSelectedClienteVenta(null);
    setClienteSearch("");
    setClienteSearchResults([]);
    setShowClienteDropdown(false);
  };

  const handleQuickCreateCliente = async () => {
    const nombre = quickNombre.trim();
    if (!nombre) {
      setQuickCreateError("El nombre del cliente es obligatorio");
      return;
    }

    setQuickCreateLoading(true);
    setQuickCreateError(null);
    try {
      const created = await ClienteVentaService.createCliente({
        nombre,
        direccion: quickDireccion.trim() || undefined,
        telefono: quickTelefono.trim() || undefined,
        ci: quickCi.trim() || undefined,
      });

      handleSelectCliente(created);
      setShowQuickCreateCliente(false);
      setQuickNombre("");
      setQuickDireccion("");
      setQuickTelefono("");
      setQuickCi("");
    } catch (error) {
      setQuickCreateError(
        error instanceof Error ? error.message : "No se pudo crear el cliente",
      );
    } finally {
      setQuickCreateLoading(false);
    }
  };

  const handleAddMaterial = async (material: MaterialVentaWeb) => {
    if (materialRows.some((row) => row.material_id === material.id)) return;

    const stockActual = await getStockFromAlmacenV(
      selectedAlmacenId,
      material.id,
      material.codigo,
    );
    const stockState = calculateStockAlertV(1, stockActual);

    setMaterialRows((prev) =>
      prev.some((row) => row.material_id === material.id)
        ? prev
        : [
            ...prev,
            {
              material_id: material.id,
              cantidad: 1,
              codigo: material.codigo,
              nombre: material.nombre,
              descripcion: material.descripcion,
              um: material.um,
              foto: material.foto,
              stock_actual: stockActual,
              alerta_stock: stockState.alerta_stock,
              stock_suficiente: stockState.stock_suficiente,
              stock_despues: stockState.stock_despues,
              faltante: stockState.faltante,
            },
          ],
    );
    setMaterialSearch("");
    setShowMaterialDropdown(false);
  };

  const handleCantidadChange = (index: number, value: string) => {
    const cantidad = Number(value);
    if (!Number.isFinite(cantidad) || cantidad < 0) return;

    setMaterialRows((prev) =>
      prev.map((item, rowIndex) =>
        rowIndex === index
          ? { ...item, cantidad, ...calculateStockAlertV(cantidad, item.stock_actual, item.alerta_stock) }
          : item,
      ),
    );
  };

  // Recalcular stock de todos los materiales cuando cambia el almacén
  useEffect(() => {
    if (!selectedAlmacenId) return;
    const rows = materialRowsRef.current;
    if (rows.length === 0) return;

    void (async () => {
      const updated = await Promise.all(
        rows.map(async (m) => {
          if (!m.material_id) return m;
          const stockActual = await getStockFromAlmacenV(selectedAlmacenId, m.material_id, m.codigo);
          return { ...m, stock_actual: stockActual, ...calculateStockAlertV(m.cantidad, stockActual) };
        }),
      );
      setMaterialRows(updated);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAlmacenId]);

  const handleRemoveMaterial = (index: number) => {
    setMaterialRows((prev) => prev.filter((_, rowIndex) => rowIndex !== index));
  };

  const handleToggleReservaPanel = async () => {
    if (showReservaPanel) {
      setShowReservaPanel(false);
      return;
    }
    setShowReservaPanel(true);
    if (reservasActivas.length > 0) return; // already loaded
    setLoadingReservas(true);
    try {
      const { data } = await ReservaVentaService.getReservas({
        origen: "ventas",
        estado: "activa",
        limit: 50,
      });
      setReservasActivas(data);
    } catch {
      setReservasActivas([]);
    } finally {
      setLoadingReservas(false);
    }
  };

  const applyReserva = async (reserva: Reserva) => {
    // Pre-fill cliente (minimal object, sufficient for the form payload)
    const cliente: ClienteVenta = {
      id: reserva.cliente_id,
      nombre: reserva.cliente_nombre || reserva.cliente_id,
    };
    setSelectedClienteVenta(cliente);
    setClienteSearch(reserva.cliente_nombre || reserva.cliente_id);
    setClienteSearchResults([]);
    setShowClienteDropdown(false);

    // Pre-fill almacen
    setSelectedAlmacenId(reserva.almacen_id);

    // Pre-fill materiales — cruza con el catálogo ya cargado para obtener um y foto
    const baseRows: MaterialRow[] = (reserva.materiales || [])
      .filter((m) => m.nombre || m.material_id)
      .map((m) => {
        const cat = materialesVendibles.find((mv) => mv.id === m.material_id);
        return {
          material_id: m.material_id,
          cantidad: Math.max(1, m.cantidad_reservada - (m.cantidad_consumida ?? 0)),
          codigo: m.codigo ?? cat?.codigo ?? "",
          nombre: m.nombre ?? cat?.nombre ?? m.material_id,
          descripcion: m.descripcion ?? cat?.descripcion,
          um: cat?.um,
          foto: cat?.foto,
          stock_actual: null,
          alerta_stock: false,
          stock_suficiente: true,
          stock_despues: null,
          faltante: 0,
        };
      });

    // Fetch stock for each material if almacen is known
    if (reserva.almacen_id && baseRows.length > 0) {
      const rowsWithStock = await Promise.all(
        baseRows.map(async (r) => {
          const stockActual = await getStockFromAlmacenV(reserva.almacen_id, r.material_id, r.codigo);
          return { ...r, stock_actual: stockActual, ...calculateStockAlertV(r.cantidad, stockActual) };
        }),
      );
      setMaterialRows(rowsWithStock);
    } else {
      setMaterialRows(baseRows);
    }

    setReservaAplicada(reserva);
    setShowReservaPanel(false);
  };

  const handleSubmit = async () => {
    if (!canSubmit || !selectedClienteVenta) return;

    const payload: SolicitudVentaCreateData | SolicitudVentaUpdateData = {
      cliente_venta_id: selectedClienteVenta.id,
      almacen_id: selectedAlmacenId,
      materiales: validMaterials.map((material) => ({
        material_id: material.material_id,
        cantidad: material.cantidad,
      })),
    };

    setSubmitting(true);
    try {
      await onSubmit(payload);
      onOpenChange(false);
    } catch {
      // El padre muestra el mensaje de error y mantiene el dialogo abierto.
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-indigo-600" />
            {isEdit ? "Editar solicitud de venta" : "Nueva solicitud de venta"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {loadingData ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando almacenes y materiales vendibles...
            </div>
          ) : null}

          {loadError ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {loadError}
            </div>
          ) : null}

          <div className="space-y-2">
            <Label>
              Almacen <span className="text-red-500">*</span>
            </Label>
            <Select
              value={selectedAlmacenId}
              onValueChange={setSelectedAlmacenId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccione un almacen" />
              </SelectTrigger>
              <SelectContent>
                {almacenes
                  .filter((almacen) => Boolean(almacen.id))
                  .map((almacen) => (
                    <SelectItem key={almacen.id} value={almacen.id!}>
                      {almacen.nombre}
                      {almacen.codigo ? ` (${almacen.codigo})` : ""}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reserva shortcut — solo en modo crear */}
          {!isEdit ? (
            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                className="w-full justify-between border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300"
                onClick={handleToggleReservaPanel}
              >
                <span className="flex items-center gap-2">
                  <BookmarkCheck className="h-4 w-4" />
                  Seleccionar reserva activa
                  {reservaAplicada && (
                    <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 font-normal">
                      {reservaAplicada.reserva_id || reservaAplicada.id.slice(-8).toUpperCase()}
                    </Badge>
                  )}
                </span>
                {showReservaPanel ? (
                  <ChevronUp className="h-4 w-4 opacity-60" />
                ) : (
                  <ChevronDown className="h-4 w-4 opacity-60" />
                )}
              </Button>

              {showReservaPanel ? (
                <div className="border border-indigo-100 rounded-md bg-indigo-50/40 overflow-hidden">
                  {loadingReservas ? (
                    <div className="flex items-center gap-2 p-4 text-sm text-gray-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Cargando reservas activas...
                    </div>
                  ) : reservasActivas.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center p-4">
                      No hay reservas de ventas activas disponibles.
                    </p>
                  ) : (
                    <div className="divide-y divide-indigo-100 max-h-64 overflow-y-auto">
                      {reservasActivas.map((reserva) => {
                        const totalMats = reserva.materiales?.length ?? 0;
                        const totalUnidades = reserva.materiales?.reduce(
                          (s, m) => s + Math.max(0, m.cantidad_reservada - (m.cantidad_consumida ?? 0)),
                          0,
                        ) ?? 0;
                        return (
                          <button
                            key={reserva.id}
                            type="button"
                            onClick={() => applyReserva(reserva)}
                            className="w-full text-left px-4 py-3 hover:bg-indigo-100/60 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-indigo-800 font-mono">
                                  {reserva.reserva_id || reserva.id.slice(-8).toUpperCase()}
                                </p>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                                  <span className="flex items-center gap-1 text-xs text-gray-600">
                                    <User className="h-3 w-3" />
                                    {reserva.cliente_nombre || reserva.cliente_id.slice(-6)}
                                  </span>
                                  <span className="flex items-center gap-1 text-xs text-gray-600">
                                    <Warehouse className="h-3 w-3" />
                                    {reserva.almacen_nombre || reserva.almacen_id.slice(-6)}
                                  </span>
                                  <span className="flex items-center gap-1 text-xs text-gray-600">
                                    <Package className="h-3 w-3" />
                                    {totalMats} tipo{totalMats !== 1 ? "s" : ""} · {totalUnidades} ud.
                                  </span>
                                </div>
                              </div>
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 shrink-0 text-xs">
                                Activa
                              </Badge>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : null}

              {reservaAplicada ? (
                <div className="flex items-center justify-between rounded-md bg-indigo-50 border border-indigo-200 px-3 py-2 text-xs text-indigo-700">
                  <span>
                    Datos prellenados desde reserva{" "}
                    <span className="font-mono font-semibold">
                      {reservaAplicada.reserva_id || reservaAplicada.id.slice(-8).toUpperCase()}
                    </span>
                    . Puedes editar los campos antes de crear.
                  </span>
                  <button
                    type="button"
                    onClick={() => setReservaAplicada(null)}
                    className="ml-3 hover:text-indigo-900 shrink-0"
                    title="Quitar indicador"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-2">
            <Label>
              Cliente venta <span className="text-red-500">*</span>
            </Label>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={clienteSearch}
                onChange={(event) => {
                  const value = event.target.value;
                  setClienteSearch(value);
                  if (
                    selectedClienteVenta &&
                    value !== formatClienteLabel(selectedClienteVenta)
                  ) {
                    setSelectedClienteVenta(null);
                  }
                }}
                placeholder="Buscar cliente existente por nombre..."
                className="pl-10 pr-20"
              />

              {loadingClientes ? (
                <Loader2 className="absolute right-14 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
              ) : null}

              {selectedClienteVenta ? (
                <button
                  onClick={handleClearCliente}
                  className="absolute right-14 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  title="Quitar cliente seleccionado"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}

              <button
                onClick={() => setShowQuickCreateCliente((current) => !current)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-600 hover:text-indigo-700"
                title="Crear cliente rapido"
              >
                <UserRoundPlus className="h-4 w-4" />
              </button>

              {showClienteDropdown && clienteSearchResults.length > 0 ? (
                <div className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
                  {clienteSearchResults.map((cliente) => (
                    <button
                      key={cliente.id}
                      className="w-full px-3 py-2 text-left hover:bg-indigo-50 text-sm"
                      onClick={() => handleSelectCliente(cliente)}
                    >
                      <p className="font-medium text-gray-900 truncate">
                        {cliente.nombre}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {cliente.numero || cliente.id.slice(-6).toUpperCase()}
                        {cliente.telefono ? ` - ${cliente.telefono}` : ""}
                      </p>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            {selectedClienteVenta ? (
              <Badge
                variant="outline"
                className="bg-emerald-50 text-emerald-700 border-emerald-200"
              >
                Cliente seleccionado: {selectedClienteVenta.nombre}
              </Badge>
            ) : null}
          </div>

          {showQuickCreateCliente ? (
            <div className="rounded-md border border-indigo-200 bg-indigo-50/50 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-indigo-700">
                  Crear cliente rapido
                </h4>
              </div>

              {quickCreateError ? (
                <div className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                  {quickCreateError}
                </div>
              ) : null}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="quick-cliente-nombre">
                    Nombre <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="quick-cliente-nombre"
                    value={quickNombre}
                    onChange={(event) => setQuickNombre(event.target.value)}
                    placeholder="Nombre del cliente"
                    maxLength={120}
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="quick-cliente-direccion">Direccion</Label>
                  <Input
                    id="quick-cliente-direccion"
                    value={quickDireccion}
                    onChange={(event) => setQuickDireccion(event.target.value)}
                    placeholder="Direccion"
                    maxLength={200}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="quick-cliente-telefono">Telefono</Label>
                  <Input
                    id="quick-cliente-telefono"
                    value={quickTelefono}
                    onChange={(event) => setQuickTelefono(event.target.value)}
                    placeholder="Ej: 5551234"
                    maxLength={40}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="quick-cliente-ci">CI</Label>
                  <Input
                    id="quick-cliente-ci"
                    value={quickCi}
                    onChange={(event) => setQuickCi(event.target.value)}
                    placeholder="Carnet de identidad"
                    maxLength={40}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleQuickCreateCliente}
                  disabled={quickCreateLoading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  size="sm"
                >
                  {quickCreateLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    "Crear y seleccionar"
                  )}
                </Button>
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label>
              Materiales <span className="text-red-500">*</span>
            </Label>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar material vendible por codigo o nombre..."
                value={materialSearch}
                onChange={(event) => setMaterialSearch(event.target.value)}
                className="pl-10"
              />

              {showMaterialDropdown ? (
                <div className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
                  {filteredMateriales.map((material) => (
                    <button
                      key={material.id}
                      className="w-full px-3 py-2 text-left hover:bg-indigo-50 text-sm flex items-center justify-between gap-2"
                      onClick={() => handleAddMaterial(material)}
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {material.nombre}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {material.codigo}
                          {material.um ? ` - ${material.um}` : ""}
                        </p>
                      </div>
                      <Plus className="h-4 w-4 text-green-600 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            {!selectedAlmacenId && (
              <p className="text-xs text-amber-600 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                Seleccione un almacén arriba para ver alertas de stock disponible
              </p>
            )}

            {materialRows.length > 0 ? (
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="text-left py-2 px-3 font-medium text-gray-700">
                        Material
                      </th>
                      <th className="text-left py-2 px-3 font-medium text-gray-700 w-24">
                        UM
                      </th>
                      <th className="text-left py-2 px-3 font-medium text-gray-700 w-28">
                        Cantidad
                      </th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {materialRows.map((material, index) => (
                      <tr
                        key={`${material.material_id}-${index}`}
                        className={`border-b last:border-b-0 ${material.alerta_stock ? "bg-red-50/60" : ""}`}
                      >
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            {material.foto ? (
                              <img
                                src={material.foto}
                                alt={material.nombre}
                                className="h-8 w-8 rounded object-cover border border-gray-200"
                                onError={(event) => {
                                  (
                                    event.target as HTMLImageElement
                                  ).style.display = "none";
                                }}
                              />
                            ) : (
                              <div className="h-8 w-8 rounded bg-gray-100 border border-gray-200 flex items-center justify-center">
                                <Package className="h-4 w-4 text-gray-400" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 leading-tight truncate">
                                {material.nombre}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {material.codigo}
                              </p>
                              {material.alerta_stock && (
                                <Badge
                                  variant="outline"
                                  className="text-xs bg-red-50 text-red-700 border-red-200 mt-0.5"
                                >
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Stock insuficiente
                                </Badge>
                              )}
                              {material.alerta_stock && (
                                <p className="text-xs text-red-600 mt-0.5">
                                  Stock: {material.stock_actual ?? 0} | Faltante: {material.faltante}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-gray-600">
                          {material.um || "-"}
                        </td>
                        <td className="py-2 px-3">
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            value={material.cantidad}
                            onChange={(event) =>
                              handleCantidadChange(index, event.target.value)
                            }
                            className="h-8 w-24"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <button
                            onClick={() => handleRemoveMaterial(index)}
                            className="text-red-400 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-500 py-2">
                Agrega al menos un material vendible para enviar la solicitud.
              </p>
            )}

            {validMaterials.length > 0 ? (
              <Badge
                variant="outline"
                className="bg-blue-50 text-blue-700 border-blue-200"
              >
                {validMaterials.length} material
                {validMaterials.length !== 1 ? "es" : ""} seleccionado
              </Badge>
            ) : null}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : isEdit ? (
                "Guardar cambios"
              ) : (
                "Crear solicitud"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
