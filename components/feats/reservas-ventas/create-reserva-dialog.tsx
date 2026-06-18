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
  Loader2,
  Package,
  Plus,
  Search,
  Trash2,
  User,
  Warehouse,
  X,
} from "lucide-react";
import {
  ClienteService,
  ClienteVentaService,
  InventarioService,
  ReservaVentaService,
  SolicitudVentaService,
} from "@/lib/api-services";
import type {
  Almacen,
  Cliente,
  ClienteVenta,
  MaterialVentaWeb,
  Reserva,
  ReservaCreateData,
  ReservaOrigen,
  StockItem,
} from "@/lib/api-types";

// Categorías reservables
const CATEGORIAS_RESERVABLES = ["INVERSORES", "BATERIAS", "PANELES", "MPPT", "ESTRUCTURAS", "BMS"];
const normalizeCategoria = (c?: string) =>
  (c ?? "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();

interface MaterialRow {
  material_id: string;
  cantidad_reservada: number;
  cantidad_consumida: number;
  codigo: string;
  nombre: string;
  um?: string;
  stock_actual: number | null;
  alerta_stock: boolean;
  faltante: number;
}

// Stock disponible desglosado por sector
type PoolBreakdown = { ventas: number; instaladora: number; indistinto: number };
const ZERO_POOL: PoolBreakdown = { ventas: 0, instaladora: 0, indistinto: 0 };

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
      // Si todos los sectores están en 0 pero hay stock, tratarlo como Común
      if (pools.ventas + pools.instaladora + pools.indistinto === 0 && item.cantidad > 0) {
        pools.indistinto = item.cantidad;
      }
    } else {
      // Sin desglose: todo se considera Común (accesible para ambos sectores)
      pools = { ventas: 0, instaladora: 0, indistinto: item.cantidad };
    }
    if (item.material_id) map.set(item.material_id, pools);
    if (item.material_codigo) {
      map.set(`c:${item.material_codigo.trim().toLowerCase()}`, pools);
    }
  }
  return map;
};

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

interface CreateReservaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ReservaCreateData) => Promise<void>;
  isLoading?: boolean;
  /** Origen por defecto al abrir (viene del tab activo en la página). */
  defaultOrigen?: ReservaOrigen;
}

export function CreateReservaDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading = false,
  defaultOrigen = "ventas",
}: CreateReservaDialogProps) {
  const [origen, setOrigen] = useState<ReservaOrigen>(defaultOrigen);

  // Almacenes
  const [almacenes, setAlmacenes] = useState<Almacen[]>([]);
  const [loadingAlmacenes, setLoadingAlmacenes] = useState(false);
  const [selectedAlmacenId, setSelectedAlmacenId] = useState("");

  // Clientes — polimórficos según origen
  const [clienteSearch, setClienteSearch] = useState("");
  const [clienteResults, setClienteResults] = useState<
    (Cliente | ClienteVenta)[]
  >([]);
  const [searchingClientes, setSearchingClientes] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<
    Cliente | ClienteVenta | null
  >(null);

  // Materiales
  const [materialesWeb, setMaterialesWeb] = useState<MaterialVentaWeb[]>([]);
  const [loadingMateriales, setLoadingMateriales] = useState(false);
  const [materialSearch, setMaterialSearch] = useState("");
  const [materialRows, setMaterialRows] = useState<MaterialRow[]>([]);
  const [showMaterialSearch, setShowMaterialSearch] = useState(false);
  const [categoriaFilter, setCategoriaFilter] = useState<string>("todas");

  // Stock desglosado por sector + reservas activas por sector
  const [loadingStock, setLoadingStock] = useState(false);
  const poolStockMapRef = useRef<Map<string, PoolBreakdown>>(new Map());
  const poolReservaMapRef = useRef<Map<string, PoolBreakdown>>(new Map());
  const materialRowsRef = useRef<MaterialRow[]>([]);
  useEffect(() => {
    materialRowsRef.current = materialRows;
  }, [materialRows]);

  // Fecha expiración
  const [fechaExpiracion, setFechaExpiracion] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sync origen when defaultOrigen changes (opening from different tabs)
  useEffect(() => {
    if (open) setOrigen(defaultOrigen);
  }, [open, defaultOrigen]);

  // Load almacenes y materiales al abrir
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
      setCategoriaFilter("todas");
    }
  }, [open]);

  // Reset cliente al cambiar origen
  useEffect(() => {
    setSelectedCliente(null);
    setClienteSearch("");
    setClienteResults([]);
  }, [origen]);

  // Buscar clientes según origen con debounce
  useEffect(() => {
    if (!clienteSearch.trim()) {
      setClienteResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchingClientes(true);
      try {
        if (origen === "ventas") {
          const data = await ClienteVentaService.getClientes({
            nombre: clienteSearch.trim(),
            limit: 20,
          });
          setClienteResults(data);
        } else {
          const { clients } = await ClienteService.getClientes({
            nombre: clienteSearch.trim(),
            limit: 20,
          });
          setClienteResults(clients);
        }
      } catch {
        setClienteResults([]);
      } finally {
        setSearchingClientes(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [clienteSearch, origen]);

  /**
   * Calcula disponible para el sector activo:
   *   disponible = max(0, pool_propio - reservado_propio) + max(0, común - reservado_común)
   * Nunca suma el pool del sector contrario.
   */
  const computeStock = (
    materialId: string,
    codigo: string,
    cantidad: number,
    origenParam: ReservaOrigen,
  ): Pick<MaterialRow, "stock_actual" | "alerta_stock" | "faltante"> => {
    const poolStock = lookupPoolStock(poolStockMapRef.current, materialId, codigo);
    if (poolStock === null)
      return { stock_actual: null, alerta_stock: false, faltante: 0 };

    const poolReserva = poolReservaMapRef.current.get(materialId) ?? { ...ZERO_POOL };
    const sectorKey = origenParam === "instaladora" ? "instaladora" : "ventas";

    const libre_sector = Math.max(0, poolStock[sectorKey] - poolReserva[sectorKey]);
    const libre_comun = Math.max(0, poolStock.indistinto - poolReserva.indistinto);
    const disponible = libre_sector + libre_comun;

    return {
      stock_actual: disponible,
      alerta_stock: cantidad > disponible,
      faltante: Math.max(cantidad - disponible, 0),
    };
  };

  // Carga stock al cambiar almacén
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

        // Acumular reservas netas (reservado - consumido) por sector
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

        // Snap del origen actual para este batch (evita stale closure)
        const origenSnap = origen;
        setMaterialRows(
          materialRowsRef.current.map((r) => ({
            ...r,
            ...computeStock(r.material_id, r.codigo, r.cantidad_reservada, origenSnap),
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

  // Recomputa disponibilidad cuando el operador cambia de sector (ventas ↔ instaladora)
  useEffect(() => {
    if (poolStockMapRef.current.size === 0) return;
    setMaterialRows((prev) =>
      prev.map((r) => ({
        ...r,
        ...computeStock(r.material_id, r.codigo, r.cantidad_reservada, origen),
      })),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origen]);

  // Materiales filtrados por categoría y búsqueda
  const categoriasMateriales = useMemo(() => {
    const cats = new Set<string>();
    for (const m of materialesWeb) {
      const c = normalizeCategoria(m.categoria);
      if (CATEGORIAS_RESERVABLES.includes(c)) cats.add(c);
    }
    return Array.from(cats).sort();
  }, [materialesWeb]);

  const materialesFiltrados = useMemo(() => {
    let base = materialesWeb.filter((m) =>
      CATEGORIAS_RESERVABLES.includes(normalizeCategoria(m.categoria)),
    );
    if (categoriaFilter !== "todas") {
      base = base.filter(
        (m) => normalizeCategoria(m.categoria) === categoriaFilter,
      );
    }
    if (!materialSearch.trim()) return base.slice(0, 60);
    const term = materialSearch.toLowerCase();
    return base
      .filter(
        (m) =>
          m.nombre.toLowerCase().includes(term) ||
          m.codigo.toLowerCase().includes(term),
      )
      .slice(0, 40);
  }, [materialesWeb, materialSearch, categoriaFilter]);

  const addMaterial = (mat: MaterialVentaWeb) => {
    if (materialRows.some((r) => r.material_id === mat.id)) return;
    setMaterialRows((prev) => [
      ...prev,
      {
        material_id: mat.id,
        cantidad_reservada: 1,
        cantidad_consumida: 0,
        codigo: mat.codigo,
        nombre: mat.nombre,
        um: mat.um,
        ...computeStock(mat.id, mat.codigo, 1, origen),
      },
    ]);
    setShowMaterialSearch(false);
    setMaterialSearch("");
  };

  const removeMaterial = (materialId: string) =>
    setMaterialRows((prev) => prev.filter((r) => r.material_id !== materialId));

  const updateCantidad = (materialId: string, value: number) =>
    setMaterialRows((prev) =>
      prev.map((r) => {
        if (r.material_id !== materialId) return r;
        const cantidad = Math.max(1, value);
        return {
          ...r,
          cantidad_reservada: cantidad,
          ...computeStock(r.material_id, r.codigo, cantidad, origen),
        };
      }),
    );

  const getClienteLabel = (c: Cliente | ClienteVenta): string => {
    if (!c) return "";
    const numero = (c as ClienteVenta).numero;
    if (numero) return `${c.nombre} (${numero})`;
    return `${c.nombre} (${(c.id ?? "").slice(-6).toUpperCase()})`;
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!selectedAlmacenId) newErrors.almacen = "Selecciona un almacén";
    if (!selectedCliente) newErrors.cliente = "Selecciona un cliente";
    if (materialRows.length === 0) {
      newErrors.materiales = "Agrega al menos un material";
    } else {
      // Bloquear si algún material excede lo disponible en sector propio + Común
      const sinStock = materialRows.filter(
        (r) => r.stock_actual !== null && r.alerta_stock,
      );
      if (sinStock.length > 0) {
        const sector = origen === "instaladora" ? "Instaladora" : "Ventas";
        newErrors.materiales = `Stock insuficiente en sector ${sector} + Común: ${sinStock.map((r) => r.nombre).join(", ")}`;
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
    const cliente_tipo =
      origen === "instaladora" ? "cliente" : ("cliente_venta" as const);
    const data: ReservaCreateData = {
      almacen_id: selectedAlmacenId,
      cliente_id: selectedCliente!.id ?? "",
      cliente_tipo,
      origen,
      // pool="indistinto" → el backend auto-distribuye entre sector + Común
      // según el campo `origen`, generando las líneas de split correctas.
      materiales: materialRows.map((r) => ({
        material_id: r.material_id,
        cantidad_reservada: r.cantidad_reservada,
        cantidad_consumida: 0,
        pool: "indistinto" as const,
      })),
      fecha_expiracion: new Date(fechaExpiracion).toISOString(),
    };
    await onSubmit(data);
  };

  const minDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  })();

  const ORIGEN_STYLES: Record<ReservaOrigen, { pill: string; label: string }> = {
    instaladora: {
      pill: "bg-orange-100 text-orange-700 border-orange-200",
      label: "Instaladora",
    },
    ventas: {
      pill: "bg-indigo-100 text-indigo-700 border-indigo-200",
      label: "Ventas",
    },
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookmarkCheck className="h-5 w-5 text-indigo-600" />
            Nueva Reserva
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Selector de origen */}
          <div className="space-y-1.5">
            <Label>Sector</Label>
            <div className="flex gap-2">
              {(["ventas", "instaladora"] as ReservaOrigen[]).map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => setOrigen(o)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
                    origen === o
                      ? ORIGEN_STYLES[o].pill
                      : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {ORIGEN_STYLES[o].label}
                </button>
              ))}
            </div>
          </div>

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
              <Select
                value={selectedAlmacenId}
                onValueChange={setSelectedAlmacenId}
              >
                <SelectTrigger
                  className={errors.almacen ? "border-red-500" : ""}
                >
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

          {/* Cliente */}
          <div className="space-y-1.5">
            <Label>
              Cliente{" "}
              <span className="text-xs text-gray-400 font-normal">
                ({origen === "instaladora" ? "Instaladora" : "Ventas"})
              </span>{" "}
              <span className="text-red-500">*</span>
            </Label>
            {selectedCliente ? (
              <div className="flex items-center justify-between p-2 border rounded-md bg-teal-50 border-teal-200">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-teal-600" />
                  <span className="text-sm font-medium text-teal-800">
                    {getClienteLabel(selectedCliente)}
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
                    placeholder={
                      origen === "instaladora"
                        ? "Buscar cliente instaladora..."
                        : "Buscar cliente ventas..."
                    }
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
                        {getClienteLabel(c)}
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

            {showMaterialSearch && (
              <div className="border rounded-md p-3 bg-gray-50 space-y-2">
                {/* Filtro de categoría */}
                <div className="flex gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setCategoriaFilter("todas")}
                    className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${
                      categoriaFilter === "todas"
                        ? "bg-indigo-100 text-indigo-700 border-indigo-200"
                        : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    Todas
                  </button>
                  {categoriasMateriales.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategoriaFilter(cat)}
                      className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${
                        categoriaFilter === cat
                          ? "bg-indigo-100 text-indigo-700 border-indigo-200"
                          : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

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
                  {materialesFiltrados.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No se encontraron materiales reservables
                    </p>
                  ) : (
                    materialesFiltrados.map((m) => {
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
                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            {m.categoria && (
                              <Badge
                                variant="outline"
                                className="text-xs text-gray-500"
                              >
                                {m.categoria}
                              </Badge>
                            )}
                            {m.um && (
                              <Badge variant="outline" className="text-xs">
                                {m.um}
                              </Badge>
                            )}
                          </div>
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

            {materialRows.length > 0 && (
              <div className="border rounded-md divide-y">
                {materialRows.map((row) => (
                  <div
                    key={row.material_id}
                    className={`flex items-center gap-3 px-3 py-2 ${
                      row.alerta_stock ? "bg-red-50/60" : ""
                    }`}
                  >
                    <Package className="h-4 w-4 text-gray-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{row.nombre}</p>
                      <p className="text-xs text-gray-500">
                        {row.codigo}
                        {row.um && ` · ${row.um}`}
                      </p>
                      {row.stock_actual !== null &&
                        (row.alerta_stock ? (
                          <p className="text-xs font-medium text-red-600 mt-0.5">
                            Disponible (sector + Común): {row.stock_actual} {row.um || "U"} · Faltan {row.faltante}
                          </p>
                        ) : (
                          <p className="text-xs text-emerald-600 mt-0.5">
                            Disponible (sector + Común): {row.stock_actual} {row.um || "U"}
                          </p>
                        ))}
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
              className={`text-white ${
                origen === "instaladora"
                  ? "bg-orange-600 hover:bg-orange-700"
                  : "bg-indigo-600 hover:bg-indigo-700"
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <BookmarkCheck className="h-4 w-4 mr-2" />
                  Crear Reserva{" "}
                  {origen === "instaladora" ? "Instaladora" : "Ventas"}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
