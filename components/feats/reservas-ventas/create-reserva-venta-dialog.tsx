"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  BookmarkCheck,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Loader2,
  Package,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  User,
  Warehouse,
  X,
} from "lucide-react";
import {
  ClienteVentaService,
  InventarioService,
  OfertaVentaService,
  ReservaVentaService,
  SolicitudVentaService,
} from "@/lib/api-services";
import type {
  Almacen,
  ClienteVenta,
  MaterialVentaWeb,
  OfertaVenta,
  Reserva,
  ReservaCreateData,
  StockItem,
} from "@/lib/api-types";

interface MaterialRow {
  material_id: string;
  cantidad_reservada: number;
  cantidad_consumida: number;
  codigo: string;
  nombre: string;
  um?: string;
  /** Stock disponible (sector ventas + Común − reservas activas). null mientras no hay almacén o se carga. */
  stock_actual: number | null;
  alerta_stock: boolean;
  faltante: number;
  /** true si el almacén tiene el material sin desglose por sector — backend rechazará. */
  sinDesgloseSector: boolean;
}

// Stock disponible desglosado por sector
type PoolBreakdown = {
  ventas: number;
  instaladora: number;
  indistinto: number;
  /** true si el doc de stock no traía .pools — el backend rechazará el reserve. */
  sinDesglose?: boolean;
};
const ZERO_POOL: PoolBreakdown = { ventas: 0, instaladora: 0, indistinto: 0 };

/** Mapa material_id/codigo → desglose de stock por sector. */
const buildPoolStockMap = (items: StockItem[]): Map<string, PoolBreakdown> => {
  const map = new Map<string, PoolBreakdown>();
  for (const item of items) {
    let pools: PoolBreakdown;
    if (item.pools) {
      pools = {
        ventas: item.pools.ventas?.cantidad ?? 0,
        instaladora: item.pools.instaladora?.cantidad ?? 0,
        indistinto: item.pools.indistinto?.cantidad ?? 0,
      };
      if (pools.ventas + pools.instaladora + pools.indistinto === 0 && item.cantidad > 0) {
        pools.indistinto = item.cantidad;
      }
    } else {
      pools = { ventas: 0, instaladora: 0, indistinto: item.cantidad, sinDesglose: true };
    }
    if (item.material_id) map.set(item.material_id, pools);
    if (item.material_codigo) {
      map.set(`c:${item.material_codigo.trim().toLowerCase()}`, pools);
    }
  }
  return map;
};

/**
 * Busca el desglose por sector en el mapa ya cargado.
 * Devuelve null si el mapa aún no está cargado (almacén no seleccionado).
 */
const lookupPoolStock = (
  map: Map<string, PoolBreakdown>,
  materialId: string,
  codigo?: string,
): PoolBreakdown | null => {
  if (map.size === 0) return null;
  if (materialId && map.has(materialId)) return map.get(materialId)!;
  if (codigo) {
    const key = `c:${codigo.trim().toLowerCase()}`;
    if (map.has(key)) return map.get(key)!;
  }
  return { ...ZERO_POOL };
};

interface CreateReservaVentaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ReservaCreateData) => Promise<void>;
  isLoading?: boolean;
}

const formatClienteLabel = (cliente: ClienteVenta) =>
  cliente.numero
    ? `${cliente.nombre} (${cliente.numero})`
    : `${cliente.nombre} (${cliente.id.slice(-6).toUpperCase()})`;

export function CreateReservaVentaDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading = false,
}: CreateReservaVentaDialogProps) {
  // Almacenes
  const [almacenes, setAlmacenes] = useState<Almacen[]>([]);
  const [loadingAlmacenes, setLoadingAlmacenes] = useState(false);
  const [selectedAlmacenId, setSelectedAlmacenId] = useState("");

  // Clientes ventas
  const [clienteSearch, setClienteSearch] = useState("");
  const [clienteResults, setClienteResults] = useState<ClienteVenta[]>([]);
  const [searchingClientes, setSearchingClientes] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<ClienteVenta | null>(null);

  // Materiales
  const [materialesWeb, setMaterialesWeb] = useState<MaterialVentaWeb[]>([]);
  const [loadingMateriales, setLoadingMateriales] = useState(false);
  const [materialSearch, setMaterialSearch] = useState("");
  const [materialRows, setMaterialRows] = useState<MaterialRow[]>([]);
  const [showMaterialSearch, setShowMaterialSearch] = useState(false);

  // Stock precargado del almacén seleccionado (una sola llamada al backend)
  const [loadingStock, setLoadingStock] = useState(false);
  const poolStockMapRef = useRef<Map<string, PoolBreakdown>>(new Map());
  // Mapa material_id → reservas netas por sector (todas las reservas activas del almacén)
  const poolReservaMapRef = useRef<Map<string, PoolBreakdown>>(new Map());
  // Espejo de materialRows para recalcular dentro del efecto de carga de stock
  const materialRowsRef = useRef<MaterialRow[]>([]);
  useEffect(() => {
    materialRowsRef.current = materialRows;
  }, [materialRows]);

  // Fecha expiración
  const [fechaExpiracion, setFechaExpiracion] = useState("");

  // Oferta shortcut
  const [showOfertaPanel, setShowOfertaPanel] = useState(false);
  const [ofertasDisponibles, setOfertasDisponibles] = useState<OfertaVenta[]>([]);
  const [loadingOfertas, setLoadingOfertas] = useState(false);
  const [ofertaAplicada, setOfertaAplicada] = useState<OfertaVenta | null>(null);

  // Errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load almacenes and materiales when dialog opens
  useEffect(() => {
    if (!open) return;
    setLoadingAlmacenes(true);
    InventarioService.getAlmacenes()
      .then((data) => setAlmacenes(data.filter((a) => a.activo !== false)))
      .catch(() => setAlmacenes([]))
      .finally(() => setLoadingAlmacenes(false));

    setLoadingMateriales(true);
    SolicitudVentaService.getMaterialesVendiblesWeb()
      .then((data) => setMaterialesWeb(data))
      .catch(() => setMaterialesWeb([]))
      .finally(() => setLoadingMateriales(false));
  }, [open]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setSelectedAlmacenId("");
      setSelectedCliente(null);
      setClienteSearch("");
      setClienteResults([]);
      setMaterialRows([]);
      setMaterialSearch("");
      setFechaExpiracion("");
      setErrors({});
      setShowMaterialSearch(false);
      setShowOfertaPanel(false);
      setOfertasDisponibles([]);
      setOfertaAplicada(null);
    }
  }, [open]);

  // Search clientes with debounce
  useEffect(() => {
    if (!clienteSearch.trim()) {
      setClienteResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchingClientes(true);
      try {
        const data = await ClienteVentaService.getClientes({
          nombre: clienteSearch.trim(),
          limit: 20,
        });
        setClienteResults(data);
      } catch {
        setClienteResults([]);
      } finally {
        setSearchingClientes(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [clienteSearch]);

  // Calcula los campos de stock de una fila. Las reservas de ventas consumen
  // primero el sector ventas, luego el Común — nunca instaladora. Por eso:
  //   disponible = max(0, pool_ventas − reservado_ventas) + max(0, común − reservado_común)
  const computeStock = (
    materialId: string,
    codigo: string,
    cantidad: number,
  ): Pick<MaterialRow, "stock_actual" | "alerta_stock" | "faltante" | "sinDesgloseSector"> => {
    const poolStock = lookupPoolStock(poolStockMapRef.current, materialId, codigo);
    if (poolStock === null) {
      return { stock_actual: null, alerta_stock: false, faltante: 0, sinDesgloseSector: false };
    }
    const poolReserva = poolReservaMapRef.current.get(materialId) ?? { ...ZERO_POOL };
    const libre_sector = Math.max(0, poolStock.ventas - poolReserva.ventas);
    const libre_comun = Math.max(0, poolStock.indistinto - poolReserva.indistinto);
    const disponible = libre_sector + libre_comun;
    const sinDesgloseSector = poolStock.sinDesglose === true;
    return {
      stock_actual: disponible,
      // Bloquear cuando el almacén no tiene desglose por sector: el backend
      // rechazará la reserva en _distribuir_split_pools.
      alerta_stock: cantidad > disponible || sinDesgloseSector,
      faltante: Math.max(cantidad - disponible, 0),
      sinDesgloseSector,
    };
  };

  // Una sola llamada al cambiar el almacén: carga stock bruto + reservas activas
  useEffect(() => {
    if (!selectedAlmacenId) {
      poolStockMapRef.current = new Map();
      poolReservaMapRef.current = new Map();
      setMaterialRows((prev) =>
        prev.map((r) => ({
          ...r,
          stock_actual: null,
          alerta_stock: false,
          faltante: 0,
          sinDesgloseSector: false,
        })),
      );
      return;
    }

    let cancelled = false;
    void (async () => {
      setLoadingStock(true);
      try {
        const [{ data: items }, { data: todasReservas }] = await Promise.all([
          InventarioService.getStock({ almacen_id: selectedAlmacenId, limit: 500 }),
          ReservaVentaService.getReservas({
            almacen_id: selectedAlmacenId,
            estado: "activa",
            limit: 500,
          }),
        ]);
        if (cancelled) return;

        poolStockMapRef.current = buildPoolStockMap(items);

        // Reservas netas activas desglosadas por sector
        const pMap = new Map<string, PoolBreakdown>();
        for (const reserva of todasReservas) {
          for (const mat of reserva.materiales ?? []) {
            const neta = Math.max(
              0,
              mat.cantidad_reservada - (mat.cantidad_consumida ?? 0),
            );
            if (neta > 0) {
              const rawPool = mat.pool ?? "indistinto";
              const sectorReserva: keyof PoolBreakdown =
                rawPool === "ventas" || rawPool === "instaladora" ? rawPool : "indistinto";
              const curr = pMap.get(mat.material_id) ?? { ...ZERO_POOL };
              curr[sectorReserva] = (curr[sectorReserva] ?? 0) + neta;
              pMap.set(mat.material_id, curr);
            }
          }
        }
        poolReservaMapRef.current = pMap;

        setMaterialRows(
          materialRowsRef.current.map((r) => ({
            ...r,
            ...computeStock(r.material_id, r.codigo, r.cantidad_reservada),
          })),
        );
      } catch {
        if (!cancelled) {
          poolStockMapRef.current = new Map();
          poolReservaMapRef.current = new Map();
        }
      } finally {
        if (!cancelled) setLoadingStock(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAlmacenId]);

  const filteredMateriales = useMemo(() => {
    if (!materialSearch.trim()) return materialesWeb.slice(0, 50);
    const term = materialSearch.toLowerCase();
    return materialesWeb
      .filter(
        (m) =>
          m.nombre.toLowerCase().includes(term) ||
          m.codigo.toLowerCase().includes(term),
      )
      .slice(0, 30);
  }, [materialesWeb, materialSearch]);

  const addMaterial = (mat: MaterialVentaWeb) => {
    const existing = materialRows.find((r) => r.material_id === mat.id);
    if (existing) return;
    setMaterialRows((prev) => [
      ...prev,
      {
        material_id: mat.id,
        cantidad_reservada: 1,
        cantidad_consumida: 0,
        codigo: mat.codigo,
        nombre: mat.nombre,
        um: mat.um,
        ...computeStock(mat.id, mat.codigo, 1),
      },
    ]);
    setShowMaterialSearch(false);
    setMaterialSearch("");
  };

  const removeMaterial = (materialId: string) => {
    setMaterialRows((prev) => prev.filter((r) => r.material_id !== materialId));
  };

  const updateCantidad = (materialId: string, value: number) => {
    setMaterialRows((prev) =>
      prev.map((r) => {
        if (r.material_id !== materialId) return r;
        const cantidad = Math.max(1, value);
        return {
          ...r,
          cantidad_reservada: cantidad,
          ...computeStock(r.material_id, r.codigo, cantidad),
        };
      }),
    );
  };

  const handleToggleOfertaPanel = async () => {
    if (showOfertaPanel) { setShowOfertaPanel(false); return; }
    setShowOfertaPanel(true);
    if (ofertasDisponibles.length > 0) return;
    setLoadingOfertas(true);
    try {
      const data = await OfertaVentaService.getOfertas({ limit: 100 });
      const filtered = data.filter((o) => o.estado !== "cancelada");

      // Enriquecer nombres de clientes vacíos
      const sinNombre = filtered.filter((o) => !o.cliente_nombre);
      if (sinNombre.length > 0) {
        const uniqueIds = [...new Set(sinNombre.map((o) => o.cliente_venta_id))];
        const fetched = await Promise.allSettled(
          uniqueIds.map((id) => ClienteVentaService.getClienteById(id)),
        );
        const nombreMap = new Map<string, string>();
        fetched.forEach((r, i) => {
          if (r.status === "fulfilled" && r.value?.nombre) nombreMap.set(uniqueIds[i], r.value.nombre);
        });
        setOfertasDisponibles(
          filtered.map((o) => ({
            ...o,
            cliente_nombre: o.cliente_nombre || nombreMap.get(o.cliente_venta_id) || o.cliente_venta_id,
          })),
        );
      } else {
        setOfertasDisponibles(filtered);
      }
    } catch {
      setOfertasDisponibles([]);
    } finally {
      setLoadingOfertas(false);
    }
  };

  const applyOferta = async (oferta: OfertaVenta) => {
    // Resolver nombre del cliente
    let clienteObj: ClienteVenta = {
      id: oferta.cliente_venta_id,
      nombre: oferta.cliente_nombre || oferta.cliente_venta_id,
    };
    if (!oferta.cliente_nombre) {
      try {
        const real = await ClienteVentaService.getClienteById(oferta.cliente_venta_id);
        if (real?.nombre) clienteObj = real;
      } catch { /**/ }
    }
    setSelectedCliente(clienteObj);
    setClienteSearch("");
    setClienteResults([]);

    // Pre-fill almacén
    if (oferta.almacen_id) setSelectedAlmacenId(oferta.almacen_id);

    // Pre-fill materiales cruzando con el catálogo para nombre/um
    const rows: MaterialRow[] = oferta.materiales
      .filter((m) => m.material_id)
      .map((m) => {
        const cat = materialesWeb.find((mv) => mv.id === m.material_id);
        const codigo = m.codigo ?? cat?.codigo ?? "";
        return {
          material_id: m.material_id,
          cantidad_reservada: m.cantidad,
          cantidad_consumida: 0,
          codigo,
          nombre: m.descripcion ?? cat?.nombre ?? m.codigo ?? m.material_id,
          um: m.um ?? cat?.um,
          ...computeStock(m.material_id, codigo, m.cantidad),
        };
      });
    setMaterialRows(rows);
    setOfertaAplicada(oferta);
    setShowOfertaPanel(false);
    setErrors({});
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!selectedAlmacenId) newErrors.almacen = "Selecciona un almacén";
    if (!selectedCliente) newErrors.cliente = "Selecciona un cliente";
    if (materialRows.length === 0) {
      newErrors.materiales = "Agrega al menos un material";
    } else {
      const sinDesglose = materialRows.filter((r) => r.sinDesgloseSector);
      const sinStock = materialRows.filter(
        (r) => r.stock_actual !== null && r.alerta_stock && !r.sinDesgloseSector,
      );
      if (sinDesglose.length > 0) {
        newErrors.materiales = `Sin desglose por sector en almacén: ${sinDesglose.map((r) => r.nombre).join(", ")}. Genera un movimiento de entrada con split por sector antes de reservar.`;
      } else if (sinStock.length > 0) {
        newErrors.materiales = `Stock insuficiente en sector Ventas + Común: ${sinStock.map((r) => r.nombre).join(", ")}`;
      }
    }
    if (!fechaExpiracion)
      newErrors.fechaExpiracion = "Ingresa la fecha de expiración";
    else if (new Date(fechaExpiracion) <= new Date())
      newErrors.fechaExpiracion = "La fecha de expiración debe ser futura";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    const data: ReservaCreateData = {
      almacen_id: selectedAlmacenId,
      cliente_id: selectedCliente!.id,
      cliente_tipo: "cliente_venta",
      origen: "ventas",
      // pool="indistinto" → el backend auto-distribuye entre sector ventas + Común
      // (_distribuir_split_pools), generando las líneas de split correctas.
      materiales: materialRows.map((r) => ({
        material_id: r.material_id,
        cantidad_reservada: r.cantidad_reservada,
        cantidad_consumida: 0,
        pool: "indistinto" as const,
      })),
      fecha_expiracion: new Date(fechaExpiracion).toISOString(),
    };
    try {
      await onSubmit(data);
    } catch (err) {
      // Backend rechazó (típicamente stock insuficiente por race condition con
      // otra reserva creada entre la carga del dialog y el submit).
      const msg = err instanceof Error ? err.message : "No se pudo crear la reserva";
      setErrors((prev) => ({ ...prev, materiales: msg }));
      throw err;
    }
  };

  // Min date for expiration (tomorrow)
  const minDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookmarkCheck className="h-5 w-5 text-indigo-600" />
            Nueva Reserva de Ventas
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Almacén */}
          <div className="space-y-1.5">
            <Label>
              Almacén <span className="text-red-500">*</span>
            </Label>
            {loadingAlmacenes ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando almacenes...
              </div>
            ) : (
              <Select value={selectedAlmacenId} onValueChange={setSelectedAlmacenId}>
                <SelectTrigger className={errors.almacen ? "border-red-500" : ""}>
                  <div className="flex items-center gap-2">
                    <Warehouse className="h-4 w-4 text-gray-400" />
                    <SelectValue placeholder="Seleccionar almacén" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {almacenes.map((a) => (
                    <SelectItem key={a.id!} value={a.id!}>
                      {a.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {errors.almacen && (
              <p className="text-xs text-red-500">{errors.almacen}</p>
            )}
          </div>

          {/* Oferta shortcut */}
          <div className="space-y-2">
            <Button
              type="button"
              variant="outline"
              className="w-full justify-between border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300"
              onClick={handleToggleOfertaPanel}
            >
              <span className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                Cargar desde oferta de venta
                {ofertaAplicada && (
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 font-normal">
                    {ofertaAplicada.codigo || ofertaAplicada.id.slice(-8).toUpperCase()}
                  </Badge>
                )}
              </span>
              {showOfertaPanel
                ? <ChevronUp className="h-4 w-4 opacity-60" />
                : <ChevronDown className="h-4 w-4 opacity-60" />}
            </Button>

            {showOfertaPanel && (
              <div className="border border-emerald-100 rounded-md bg-emerald-50/40 overflow-hidden">
                {loadingOfertas ? (
                  <div className="flex items-center gap-2 p-4 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cargando ofertas...
                  </div>
                ) : ofertasDisponibles.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center p-4">
                    No hay ofertas de venta disponibles.
                  </p>
                ) : (
                  <div className="divide-y divide-emerald-100 max-h-60 overflow-y-auto">
                    {ofertasDisponibles.map((oferta) => {
                      const ESTADO_COLOR: Record<string, string> = {
                        enviada:   "bg-blue-50 text-blue-700 border-blue-200",
                        confirmada:"bg-green-50 text-green-700 border-green-200",
                        pagada:    "bg-emerald-50 text-emerald-700 border-emerald-200",
                      };
                      const ESTADO_LABEL: Record<string, string> = {
                        enviada: "Enviada", confirmada: "Confirmada", pagada: "Pagada",
                      };
                      return (
                        <button
                          key={oferta.id}
                          type="button"
                          onClick={() => applyOferta(oferta)}
                          className="w-full text-left px-4 py-3 hover:bg-emerald-100/60 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-emerald-800 font-mono">
                                {oferta.codigo || oferta.id.slice(-8).toUpperCase()}
                              </p>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                                <span className="flex items-center gap-1 text-xs text-gray-600">
                                  <User className="h-3 w-3" />
                                  {oferta.cliente_nombre || oferta.cliente_venta_id.slice(-6)}
                                </span>
                                <span className="flex items-center gap-1 text-xs text-gray-600">
                                  <Package className="h-3 w-3" />
                                  {oferta.materiales.length} material{oferta.materiales.length !== 1 ? "es" : ""}
                                </span>
                                <span className="flex items-center gap-1 text-xs font-medium text-gray-700">
                                  <DollarSign className="h-3 w-3" />
                                  {oferta.precio_total.toLocaleString("es-ES", { minimumFractionDigits: 2 })}
                                  {oferta.moneda_pago ? ` ${oferta.moneda_pago}` : ""}
                                </span>
                              </div>
                            </div>
                            <Badge
                              variant="outline"
                              className={`shrink-0 text-xs ${ESTADO_COLOR[oferta.estado] ?? "bg-gray-50 text-gray-600 border-gray-200"}`}
                            >
                              {ESTADO_LABEL[oferta.estado] ?? oferta.estado}
                            </Badge>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {ofertaAplicada && (
              <div className="flex items-center justify-between rounded-md bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-700">
                <span>
                  Materiales cargados desde oferta{" "}
                  <span className="font-mono font-semibold">
                    {ofertaAplicada.codigo || ofertaAplicada.id.slice(-8).toUpperCase()}
                  </span>
                  . Puedes editar antes de crear.
                </span>
                <button
                  type="button"
                  onClick={() => setOfertaAplicada(null)}
                  className="ml-3 hover:text-emerald-900 shrink-0"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>

          {/* Cliente Ventas */}
          <div className="space-y-1.5">
            <Label>
              Cliente Ventas <span className="text-red-500">*</span>
            </Label>
            {selectedCliente ? (
              <div className="flex items-center justify-between p-2 border rounded-md bg-teal-50 border-teal-200">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-teal-600" />
                  <span className="text-sm font-medium text-teal-800">
                    {formatClienteLabel(selectedCliente)}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedCliente(null);
                    setClienteSearch("");
                    setClienteResults([]);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar cliente por nombre..."
                    value={clienteSearch}
                    onChange={(e) => setClienteSearch(e.target.value)}
                    className={`pl-9 ${errors.cliente ? "border-red-500" : ""}`}
                  />
                  {searchingClientes && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
                  )}
                </div>
                {clienteResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {clienteResults.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                        onClick={() => {
                          setSelectedCliente(c);
                          setClienteSearch("");
                          setClienteResults([]);
                        }}
                      >
                        {formatClienteLabel(c)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {errors.cliente && (
              <p className="text-xs text-red-500">{errors.cliente}</p>
            )}
          </div>

          {/* Fecha Expiración */}
          <div className="space-y-1.5">
            <Label>
              Fecha de Expiración <span className="text-red-500">*</span>
            </Label>
            <Input
              type="date"
              min={minDate}
              value={fechaExpiracion}
              onChange={(e) => setFechaExpiracion(e.target.value)}
              className={errors.fechaExpiracion ? "border-red-500" : ""}
            />
            {errors.fechaExpiracion && (
              <p className="text-xs text-red-500">{errors.fechaExpiracion}</p>
            )}
          </div>

          {/* Materiales */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>
                Materiales <span className="text-red-500">*</span>
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowMaterialSearch((v) => !v)}
                disabled={loadingMateriales}
              >
                {loadingMateriales ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Agregar material
              </Button>
            </div>

            {/* Material search dropdown */}
            {showMaterialSearch && (
              <div className="border rounded-md p-3 bg-gray-50 space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar material..."
                    value={materialSearch}
                    onChange={(e) => setMaterialSearch(e.target.value)}
                    className="pl-9"
                    autoFocus
                  />
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {filteredMateriales.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No se encontraron materiales
                    </p>
                  ) : (
                    filteredMateriales.map((m) => {
                      const alreadyAdded = materialRows.some(
                        (r) => r.material_id === m.id,
                      );
                      return (
                        <button
                          key={m.id}
                          type="button"
                          disabled={alreadyAdded}
                          className={`w-full text-left px-3 py-2 rounded text-sm flex items-center justify-between ${
                            alreadyAdded
                              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                              : "hover:bg-white border hover:border-indigo-200"
                          }`}
                          onClick={() => !alreadyAdded && addMaterial(m)}
                        >
                          <span>
                            <span className="font-mono text-xs text-gray-500 mr-2">
                              {m.codigo}
                            </span>
                            {m.nombre}
                          </span>
                          {m.um && (
                            <Badge variant="outline" className="text-xs ml-2 shrink-0">
                              {m.um}
                            </Badge>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {!selectedAlmacenId && materialRows.length > 0 && (
              <p className="text-xs text-amber-600">
                Selecciona un almacén arriba para ver el stock disponible.
              </p>
            )}
            {loadingStock && (
              <p className="flex items-center gap-1.5 text-xs text-gray-500">
                <Loader2 className="h-3 w-3 animate-spin" />
                Cargando stock del almacén...
              </p>
            )}

            {/* Material rows */}
            {materialRows.length > 0 && (
              <div className="border rounded-md divide-y">
                {materialRows.map((row) => (
                  <div
                    key={row.material_id}
                    className={`flex items-center gap-3 px-3 py-2 ${
                      row.sinDesgloseSector
                        ? "bg-amber-50/60"
                        : row.alerta_stock
                          ? "bg-red-50/60"
                          : ""
                    }`}
                  >
                    <Package className="h-4 w-4 text-gray-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{row.nombre}</p>
                      <p className="text-xs text-gray-500">
                        {row.codigo}
                        {row.um && ` · ${row.um}`}
                      </p>
                      {row.sinDesgloseSector ? (
                        <p className="text-xs font-medium text-amber-700 mt-0.5">
                          Sin desglose por sector en este almacén · no se puede reservar
                        </p>
                      ) : row.stock_actual !== null ? (
                        row.alerta_stock ? (
                          <p className="text-xs font-medium text-red-600 mt-0.5">
                            Disponible (Ventas + Común): {row.stock_actual} {row.um || "U"} · Faltan{" "}
                            {row.faltante}
                          </p>
                        ) : (
                          <p className="text-xs text-emerald-600 mt-0.5">
                            Disponible (Ventas + Común): {row.stock_actual} {row.um || "U"}
                          </p>
                        )
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Label className="text-xs text-gray-500 whitespace-nowrap">
                        Cant.
                      </Label>
                      <Input
                        type="number"
                        min={1}
                        value={row.cantidad_reservada}
                        onChange={(e) =>
                          updateCantidad(
                            row.material_id,
                            parseInt(e.target.value, 10) || 1,
                          )
                        }
                        className={`w-20 text-center h-8 ${
                          row.alerta_stock ? "border-red-400" : ""
                        }`}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMaterial(row.material_id)}
                      className="text-red-500 hover:text-red-600 shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            {errors.materiales && (
              <p className="text-xs text-red-500">{errors.materiales}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isLoading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <BookmarkCheck className="h-4 w-4 mr-2" />
                  Crear Reserva
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
