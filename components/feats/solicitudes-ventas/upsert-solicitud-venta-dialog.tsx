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
  ShoppingCart,
  DollarSign,
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
  SolicitudVenta,
  SolicitudVentaCreateData,
  SolicitudVentaUpdateData,
  StockItem,
} from "@/lib/api-types";

interface MaterialRow {
  material_id: string;
  cantidad: number;
  precio: number;
  descuento_porcentaje: number;
  descuento_tipo: "%" | "$";
  descuento_display: string;
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
  /** Máximo % de descuento permitido para este material. undefined = sin límite */
  max_descuento?: number;
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

const buildStockMapV = (items: StockItem[]): Map<string, number> => {
  const map = new Map<string, number>();
  for (const item of items) {
    if (item.material_id) map.set(item.material_id, item.cantidad);
    if (item.material_codigo) {
      map.set(`c:${item.material_codigo.trim().toLowerCase()}`, item.cantidad);
    }
  }
  return map;
};

const lookupFromMapV = (
  map: Map<string, number>,
  materialId: string,
  codigo?: string,
): number | null => {
  if (map.size === 0) return null;
  if (materialId && map.has(materialId)) return map.get(materialId)!;
  if (codigo) {
    const key = `c:${codigo.trim().toLowerCase()}`;
    if (map.has(key)) return map.get(key)!;
  }
  return 0;
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

  // Oferta shortcut
  const [showOfertaPanel, setShowOfertaPanel] = useState(false);
  const [ofertasDisponibles, setOfertasDisponibles] = useState<OfertaVenta[]>([]);
  const [loadingOfertas, setLoadingOfertas] = useState(false);
  const [ofertaAplicada, setOfertaAplicada] = useState<OfertaVenta | null>(null);

  const isEdit = Boolean(solicitud?.id);

  // Stock precargado del almacén seleccionado (una sola llamada al backend)
  const [loadingStock, setLoadingStock] = useState(false);
  const stockMapRef = useRef<Map<string, number>>(new Map());
  // Lista raw de reservas activas del almacén y mapas derivados
  const todasReservasVRef = useRef<import("@/lib/types/feats/reservas-ventas/reserva-venta-types").Reserva[]>([]);
  const totalReservaVMapRef = useRef<Map<string, number>>(new Map());
  // Mapa de reservas netas del cliente seleccionado: material_id → cantidad reservada por ese cliente
  const clientReservaMapRef = useRef<Map<string, number>>(new Map());

  // Ref to access current materialRows inside effects without causing loops
  const materialRowsRef = useRef<MaterialRow[]>([]);
  materialRowsRef.current = materialRows;

  // Ref para acceder al clienteVenta seleccionado sin cerrar sobre estado obsoleto en effects
  const selectedClienteVentaRef = useRef<ClienteVenta | null>(null);
  selectedClienteVentaRef.current = selectedClienteVenta;

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
        material_id: item.material_id || item.material?.id || "",
        cantidad: item.cantidad,
        precio: item.precio ?? item.material?.precio ?? 0,
        descuento_porcentaje: item.descuento_porcentaje ?? 0,
        descuento_tipo: "%",
        descuento_display: String(item.descuento_porcentaje ?? 0),
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
        (item) => (item.material_id ?? "").trim().length > 0 && item.cantidad > 0,
      ),
    [materialRows],
  );

  const hasDiscountError = useMemo(
    () => materialRows.some(
      (m) => m.max_descuento !== undefined && m.descuento_porcentaje > m.max_descuento,
    ),
    [materialRows],
  );

  const canSubmit = useMemo(() => {
    if (!selectedClienteVenta?.id) return false;
    if (!selectedAlmacenId.trim()) return false;
    if (validMaterials.length === 0) return false;
    if (submitting || isLoading || loadingData) return false;
    if (hasDiscountError) return false;
    return true;
  }, [
    selectedClienteVenta,
    selectedAlmacenId,
    validMaterials.length,
    submitting,
    isLoading,
    loadingData,
    hasDiscountError,
  ]);

  const handleSelectCliente = (cliente: ClienteVenta) => {
    setSelectedClienteVenta(cliente);
    setClienteSearch(formatClienteLabel(cliente));
    setClienteSearchResults([]);
    setShowClienteDropdown(false);
    setShowQuickCreateCliente(false);
    setQuickCreateError(null);
    // Recalcular reservas del cliente filtrando del total ya en memoria
    if (selectedAlmacenId) {
      const reservasCliente = todasReservasVRef.current.filter((r) => r.cliente_id === cliente.id);
      const cMap = new Map<string, number>();
      for (const reserva of reservasCliente) {
        for (const mat of reserva.materiales ?? []) {
          const neta = Math.max(0, mat.cantidad_reservada - (mat.cantidad_consumida ?? 0));
          if (neta > 0) cMap.set(mat.material_id, (cMap.get(mat.material_id) ?? 0) + neta);
        }
      }
      clientReservaMapRef.current = cMap;
      const tMap = totalReservaVMapRef.current;
      setMaterialRows((prev) =>
        prev.map((m) => {
          const bruto = lookupFromMapV(stockMapRef.current, m.material_id, m.codigo);
          if (bruto === null) return m;
          const effective = Math.max(0, bruto - (tMap.get(m.material_id) ?? 0) + (cMap.get(m.material_id) ?? 0));
          return { ...m, stock_actual: effective, ...calculateStockAlertV(m.cantidad, effective) };
        }),
      );
    }
  };

  const handleClearCliente = () => {
    setSelectedClienteVenta(null);
    setClienteSearch("");
    setClienteSearchResults([]);
    setShowClienteDropdown(false);
    // Sin cliente: stock = bruto - total_reservado
    clientReservaMapRef.current = new Map();
    const tMap = totalReservaVMapRef.current;
    setMaterialRows((prev) =>
      prev.map((m) => {
        const bruto = lookupFromMapV(stockMapRef.current, m.material_id, m.codigo);
        if (bruto === null) return m;
        const effective = Math.max(0, bruto - (tMap.get(m.material_id) ?? 0));
        return { ...m, stock_actual: effective, ...calculateStockAlertV(m.cantidad, effective) };
      }),
    );
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

  const handleAddMaterial = (material: MaterialVentaWeb) => {
    if (materialRows.some((row) => row.material_id === material.id)) return;

    const bruto = lookupFromMapV(stockMapRef.current, material.id, material.codigo);
    const stockActual = bruto !== null
      ? Math.max(0, bruto - (totalReservaVMapRef.current.get(material.id) ?? 0) + (clientReservaMapRef.current.get(material.id) ?? 0))
      : null;
    const stockState = calculateStockAlertV(1, stockActual);

    setMaterialRows((prev) =>
      prev.some((row) => row.material_id === material.id)
        ? prev
        : [
            ...prev,
            {
              material_id: material.id,
              cantidad: 1,
              precio: material.precio ?? 0,
              descuento_porcentaje: 0,
              descuento_tipo: "%",
              descuento_display: "0",
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
              max_descuento: typeof material.porciento_rebajable_venta === "number"
                ? material.porciento_rebajable_venta
                : undefined,
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

  const handleDescuentoChange = (index: number, value: string) => {
    setMaterialRows((prev) =>
      prev.map((item, rowIndex) => {
        if (rowIndex !== index) return item;
        const raw = Number(value);
        if (!Number.isFinite(raw) || raw < 0) return { ...item, descuento_display: value };
        const pct = item.descuento_tipo === "$"
          ? (item.precio > 0 ? (raw / item.precio) * 100 : 0)
          : raw;
        const maxPct = item.max_descuento ?? 100;
        const descuento_porcentaje = Math.min(pct, maxPct);
        const displayFinal = pct > maxPct
          ? (item.descuento_tipo === "$"
              ? (item.precio * maxPct / 100).toFixed(2)
              : String(maxPct))
          : value;
        return { ...item, descuento_display: displayFinal, descuento_porcentaje };
      }),
    );
  };

  const handleDescuentoTipoChange = (index: number, tipo: "%" | "$") => {
    setMaterialRows((prev) =>
      prev.map((item, rowIndex) => {
        if (rowIndex !== index) return item;
        // Recalcular display para el nuevo modo
        const display =
          tipo === "$"
            ? (item.precio * item.descuento_porcentaje / 100).toFixed(2)
            : String(item.descuento_porcentaje);
        return { ...item, descuento_tipo: tipo, descuento_display: display };
      }),
    );
  };

  // Una sola llamada al cambiar el almacén: carga TODO el stock y recalcula en memoria
  useEffect(() => {
    if (!selectedAlmacenId) {
      stockMapRef.current = new Map();
      todasReservasVRef.current = [];
      totalReservaVMapRef.current = new Map();
      clientReservaMapRef.current = new Map();
      return;
    }

    void (async () => {
      setLoadingStock(true);
      try {
        // Carga paralela: stock bruto + todas las reservas activas del almacén
        const [{ data: items }, { data: todasReservas }] = await Promise.all([
          InventarioService.getStock({ almacen_id: selectedAlmacenId, limit: 500 }),
          ReservaVentaService.getReservas({ almacen_id: selectedAlmacenId, estado: "activa", limit: 500 }),
        ]);

        const map = buildStockMapV(items);
        stockMapRef.current = map;

        todasReservasVRef.current = todasReservas;
        const tMap = new Map<string, number>();
        for (const reserva of todasReservas) {
          for (const mat of reserva.materiales ?? []) {
            const neta = Math.max(0, mat.cantidad_reservada - (mat.cantidad_consumida ?? 0));
            if (neta > 0) tMap.set(mat.material_id, (tMap.get(mat.material_id) ?? 0) + neta);
          }
        }
        totalReservaVMapRef.current = tMap;

        // Mapa de reservas del cliente seleccionado (filtrado del total)
        const currentCliente = selectedClienteVentaRef.current;
        const cMap = new Map<string, number>();
        if (currentCliente?.id) {
          const reservasCliente = todasReservas.filter((r) => r.cliente_id === currentCliente.id);
          for (const reserva of reservasCliente) {
            for (const mat of reserva.materiales ?? []) {
              const neta = Math.max(0, mat.cantidad_reservada - (mat.cantidad_consumida ?? 0));
              if (neta > 0) cMap.set(mat.material_id, (cMap.get(mat.material_id) ?? 0) + neta);
            }
          }
        }
        clientReservaMapRef.current = cMap;

        // stock_visible = bruto − total_reservado + reservado_por_cliente
        const rows = materialRowsRef.current;
        if (rows.length > 0) {
          setMaterialRows(
            rows.map((m) => {
              if (!m.material_id) return m;
              const bruto = lookupFromMapV(map, m.material_id, m.codigo);
              if (bruto === null) return m;
              const effective = Math.max(0, bruto - (tMap.get(m.material_id) ?? 0) + (cMap.get(m.material_id) ?? 0));
              return { ...m, stock_actual: effective, ...calculateStockAlertV(m.cantidad, effective) };
            }),
          );
        }
      } finally {
        setLoadingStock(false);
      }
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

      // Enriquecer nombres de clientes que vengan vacíos del backend
      const sinNombre = data.filter((r) => !r.cliente_nombre);
      if (sinNombre.length > 0) {
        const uniqueIds = [...new Set(sinNombre.map((r) => r.cliente_id))];
        const fetched = await Promise.allSettled(
          uniqueIds.map((id) => ClienteVentaService.getClienteById(id)),
        );
        const nombreMap = new Map<string, string>();
        fetched.forEach((r, i) => {
          if (r.status === "fulfilled" && r.value?.nombre) {
            nombreMap.set(uniqueIds[i], r.value.nombre);
          }
        });
        setReservasActivas(
          data.map((r) => ({
            ...r,
            cliente_nombre: r.cliente_nombre || nombreMap.get(r.cliente_id) || r.cliente_id,
          })),
        );
      } else {
        setReservasActivas(data);
      }
    } catch {
      setReservasActivas([]);
    } finally {
      setLoadingReservas(false);
    }
  };

  const applyReserva = async (reserva: Reserva) => {
    // Si el nombre ya fue enriquecido en el panel úsalo; si no, fetchear ahora
    let clienteObj: ClienteVenta = {
      id: reserva.cliente_id,
      nombre: reserva.cliente_nombre || reserva.cliente_id,
    };
    if (!reserva.cliente_nombre) {
      try {
        const real = await ClienteVentaService.getClienteById(reserva.cliente_id);
        if (real?.nombre) clienteObj = real;
      } catch { /**/ }
    }
    setSelectedClienteVenta(clienteObj);
    setClienteSearch(formatClienteLabel(clienteObj));
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
          precio: cat?.precio ?? 0,
          descuento_porcentaje: 0,
          descuento_tipo: "%" as const,
          descuento_display: "0",
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

    // Aplicar stock desde el mapa ya cargado (sin llamadas extra)
    const map = stockMapRef.current;
    setMaterialRows(
      baseRows.map((r) => {
        const stockActual = lookupFromMapV(map, r.material_id, r.codigo);
        return { ...r, stock_actual: stockActual, ...calculateStockAlertV(r.cantidad, stockActual) };
      }),
    );

    setReservaAplicada(reserva);
    setOfertaAplicada(null);
    setShowReservaPanel(false);
  };

  const handleToggleOfertaPanel = async () => {
    if (showOfertaPanel) {
      setShowOfertaPanel(false);
      return;
    }
    setShowOfertaPanel(true);
    if (ofertasDisponibles.length > 0) return; // ya cargadas
    setLoadingOfertas(true);
    try {
      const data = await OfertaVentaService.getOfertas({ limit: 100 });
      const filtered = data.filter((o) => o.estado !== "cancelada");

      // Enriquecer nombres de clientes que vengan vacíos del backend
      const sinNombre = filtered.filter((o) => !o.cliente_nombre);
      if (sinNombre.length > 0) {
        const uniqueIds = [...new Set(sinNombre.map((o) => o.cliente_venta_id))];
        const fetched = await Promise.allSettled(
          uniqueIds.map((id) => ClienteVentaService.getClienteById(id)),
        );
        const nombreMap = new Map<string, string>();
        fetched.forEach((r, i) => {
          if (r.status === "fulfilled" && r.value?.nombre) {
            nombreMap.set(uniqueIds[i], r.value.nombre);
          }
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
    // Si el nombre ya fue enriquecido en el panel úsalo; si no, fetchear ahora
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
    setSelectedClienteVenta(clienteObj);
    setClienteSearch(formatClienteLabel(clienteObj));
    setClienteSearchResults([]);
    setShowClienteDropdown(false);

    // Pre-fill almacen
    if (oferta.almacen_id) setSelectedAlmacenId(oferta.almacen_id);

    // Pre-fill materiales con precio y descuento de la oferta
    const baseRows: MaterialRow[] = oferta.materiales
      .filter((m) => m.material_id)
      .map((m) => {
        const cat = materialesVendibles.find((mv) => mv.id === m.material_id);
        const descuento = m.descuento_porcentaje ?? 0;
        return {
          material_id: m.material_id,
          cantidad: m.cantidad,
          precio: m.precio,              // precio pactado en la oferta
          descuento_porcentaje: descuento,
          descuento_tipo: "%" as const,
          descuento_display: String(descuento),
          codigo: m.codigo ?? cat?.codigo ?? "",
          nombre: m.descripcion ?? cat?.nombre ?? m.codigo ?? m.material_id,
          descripcion: m.descripcion ?? cat?.descripcion,
          um: m.um ?? cat?.um,
          foto: m.foto_url ?? cat?.foto,
          stock_actual: null,
          alerta_stock: false,
          stock_suficiente: true,
          stock_despues: null,
          faltante: 0,
        };
      });

    // Aplicar stock desde el mapa ya cargado (sin llamadas extra al backend)
    const map = stockMapRef.current;
    setMaterialRows(
      baseRows.map((r) => {
        const stockActual = lookupFromMapV(map, r.material_id, r.codigo);
        return { ...r, stock_actual: stockActual, ...calculateStockAlertV(r.cantidad, stockActual) };
      }),
    );

    setOfertaAplicada(oferta);
    setReservaAplicada(null);
    setShowOfertaPanel(false);
  };

  const handleSubmit = async () => {
    if (!canSubmit || !selectedClienteVenta) return;

    const payload: SolicitudVentaCreateData | SolicitudVentaUpdateData = {
      cliente_venta_id: selectedClienteVenta.id,
      almacen_id: selectedAlmacenId,
      materiales: validMaterials.map((material) => ({
        material_id: material.material_id,
        cantidad: material.cantidad,
        ...(material.descuento_porcentaje > 0 && { descuento_porcentaje: material.descuento_porcentaje }),
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
            <Label className="flex items-center gap-2">
              Almacen <span className="text-red-500">*</span>
              {loadingStock && (
                <span className="flex items-center gap-1 text-xs font-normal text-gray-500">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Cargando stock...
                </span>
              )}
            </Label>
            <Select
              value={selectedAlmacenId}
              onValueChange={setSelectedAlmacenId}
              disabled={loadingStock}
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

              {/* ── Panel oferta de venta ─────────────────────────── */}
              <Button
                type="button"
                variant="outline"
                className="w-full justify-between border-orange-200 text-orange-700 hover:bg-orange-50 hover:border-orange-300"
                onClick={handleToggleOfertaPanel}
              >
                <span className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Cargar desde oferta de venta
                  {ofertaAplicada && (
                    <Badge className="bg-orange-100 text-orange-700 border-orange-200 font-normal">
                      {ofertaAplicada.codigo || ofertaAplicada.id.slice(-8).toUpperCase()}
                    </Badge>
                  )}
                </span>
                {showOfertaPanel ? (
                  <ChevronUp className="h-4 w-4 opacity-60" />
                ) : (
                  <ChevronDown className="h-4 w-4 opacity-60" />
                )}
              </Button>

              {showOfertaPanel ? (
                <div className="border border-orange-100 rounded-md bg-orange-50/40 overflow-hidden">
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
                    <div className="divide-y divide-orange-100 max-h-64 overflow-y-auto">
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
                            className="w-full text-left px-4 py-3 hover:bg-orange-100/60 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-orange-800 font-mono">
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
              ) : null}

              {ofertaAplicada ? (
                <div className="flex items-center justify-between rounded-md bg-orange-50 border border-orange-200 px-3 py-2 text-xs text-orange-700">
                  <span>
                    Materiales cargados desde oferta{" "}
                    <span className="font-mono font-semibold">
                      {ofertaAplicada.codigo || ofertaAplicada.id.slice(-8).toUpperCase()}
                    </span>
                    . Precios y descuentos incluidos.
                  </span>
                  <button
                    type="button"
                    onClick={() => setOfertaAplicada(null)}
                    className="ml-3 hover:text-orange-900 shrink-0"
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

            {!selectedAlmacenId && !loadingStock && (
              <p className="text-xs text-amber-600 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                Seleccione un almacén arriba para ver alertas de stock disponible
              </p>
            )}

            {materialRows.length > 0 ? (
              <div className="border rounded-md overflow-x-auto">
                <table className="text-sm" style={{ minWidth: "640px" }}>
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="text-left py-2 px-3 font-medium text-gray-700 w-44">
                        Material
                      </th>
                      <th className="text-center py-2 px-3 font-medium text-gray-700 w-20">
                        Cant.
                      </th>
                      <th className="text-right py-2 px-3 font-medium text-gray-700 w-24">
                        P. Unit.
                      </th>
                      <th className="text-left py-2 px-3 font-medium text-gray-700 w-44">
                        Descuento
                      </th>
                      <th className="text-right py-2 px-3 font-medium text-gray-700 w-24">
                        P. Total
                      </th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {materialRows.map((material, index) => {
                      const precioUnit = material.precio;
                      const descPct = material.descuento_porcentaje;
                      const maxDescPct = material.max_descuento ?? 100;
                      const descuentoExcedido = descPct > maxDescPct;
                      const precioConDesc = precioUnit * (1 - Math.min(descPct, maxDescPct) / 100);
                      const precioTotal = precioConDesc * material.cantidad;

                      return (
                      <tr
                        key={`${material.material_id}-${index}`}
                        className={`border-b last:border-b-0 ${material.alerta_stock ? "bg-red-50/60" : ""}`}
                      >
                        {/* Nombre — ancho fijo con truncate */}
                        <td className="py-2 px-3 w-44">
                          <div className="flex items-center gap-2">
                            {material.foto ? (
                              <img
                                src={material.foto}
                                alt={material.nombre}
                                className="h-7 w-7 flex-shrink-0 rounded object-cover border border-gray-200"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                              />
                            ) : (
                              <div className="h-7 w-7 flex-shrink-0 rounded bg-gray-100 border border-gray-200 flex items-center justify-center">
                                <Package className="h-3.5 w-3.5 text-gray-400" />
                              </div>
                            )}
                            <div className="min-w-0 w-28">
                              <p className="font-medium text-gray-900 leading-tight truncate text-xs" title={material.nombre}>
                                {material.nombre}
                              </p>
                              <p className="text-xs text-gray-400 truncate">
                                {material.codigo}{material.um ? ` · ${material.um}` : ""}
                              </p>
                              {material.alerta_stock ? (
                                <p className="text-xs text-red-600 mt-0.5">
                                  Stock: {material.stock_actual ?? 0} | Falta: {material.faltante}
                                </p>
                              ) : selectedAlmacenId && material.stock_actual !== null ? (
                                <p className="text-xs text-gray-400 mt-0.5">
                                  Stock: {material.stock_actual}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </td>
                        {/* Cantidad */}
                        <td className="py-2 px-3 w-20">
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            value={material.cantidad}
                            onChange={(e) => handleCantidadChange(index, e.target.value)}
                            className="h-8 w-16 text-center"
                          />
                        </td>
                        {/* Precio unitario */}
                        <td className="py-2 px-3 text-right text-gray-700 w-24">
                          {precioUnit > 0
                            ? `$${precioUnit.toFixed(2)}`
                            : <span className="text-gray-400">—</span>}
                        </td>
                        {/* Descuento con toggle % / $ */}
                        <td className="py-2 px-3 w-44">
                          <div className="flex items-center gap-1">
                            <div className="flex rounded border border-gray-200 overflow-hidden text-xs shrink-0">
                              <button
                                type="button"
                                onClick={() => handleDescuentoTipoChange(index, "%")}
                                className={`px-2 py-1 transition-colors ${material.descuento_tipo === "%" ? "bg-indigo-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
                              >%</button>
                              <button
                                type="button"
                                onClick={() => handleDescuentoTipoChange(index, "$")}
                                disabled={precioUnit <= 0}
                                className={`px-2 py-1 transition-colors ${material.descuento_tipo === "$" ? "bg-indigo-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"} disabled:opacity-40`}
                              >$</button>
                            </div>
                            <div className="flex-1 min-w-0">
                              <Input
                                type="number"
                                min="0"
                                step={material.descuento_tipo === "$" ? "0.01" : "0.5"}
                                value={material.descuento_display}
                                onChange={(e) => handleDescuentoChange(index, e.target.value)}
                                className={`h-8 text-right w-full ${descuentoExcedido ? "border-red-400 focus-visible:ring-red-400" : ""}`}
                              />
                              {material.max_descuento !== undefined && (
                                <p className="text-xs mt-0.5 text-right leading-tight text-gray-400">
                                  máx {material.max_descuento}%
                                </p>
                              )}
                              {descPct > 0 && !descuentoExcedido && (
                                <p className="text-xs mt-0.5 text-right leading-tight text-orange-500">
                                  {material.descuento_tipo === "$"
                                    ? `= ${descPct.toFixed(1)}%`
                                    : `= $${(precioUnit * descPct / 100).toFixed(2)}`}
                                </p>
                              )}
                              {descuentoExcedido && (
                                <p className="text-xs mt-0.5 text-right leading-tight text-red-600 font-semibold">
                                  máx {maxDescPct}%
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        {/* Precio total */}
                        <td className="py-2 px-3 text-right font-medium text-gray-800 w-24">
                          {precioUnit > 0
                            ? <span className={descPct > 0 ? "text-green-700" : ""}>${precioTotal.toFixed(2)}</span>
                            : <span className="text-gray-400">—</span>}
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
                      );
                    })}
                  </tbody>
                  {validMaterials.length > 0 && (() => {
                    const totalGeneral = validMaterials.reduce((sum, m) => {
                      const pu = m.precio;
                      const pcd = pu * (1 - m.descuento_porcentaje / 100);
                      return sum + pcd * m.cantidad;
                    }, 0);
                    return (
                      <tfoot>
                        <tr className="border-t bg-gray-50">
                          <td colSpan={4} className="py-2 px-3 text-right text-sm font-semibold text-gray-700">
                            Total a pagar
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-gray-900">
                            ${totalGeneral.toFixed(2)}
                          </td>
                          <td />
                        </tr>
                      </tfoot>
                    );
                  })()}
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
