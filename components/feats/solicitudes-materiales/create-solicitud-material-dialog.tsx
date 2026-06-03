"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
import {
  Search,
  Plus,
  Trash2,
  Loader2,
  Package,
  AlertTriangle,
  X,
} from "lucide-react";
import { Badge } from "@/components/shared/atom/badge";
import {
  ClienteService,
  InventarioService,
  MaterialService,
  ReservaVentaService,
  SolicitudMaterialService,
  TrabajadorService,
} from "@/lib/api-services";
import { apiRequest } from "@/lib/api-config";
import type { Almacen, StockItem, Trabajador } from "@/lib/api-types";
import type {
  SolicitudMaterial,
  SolicitudMaterialCreateData,
  SolicitudMaterialUpdateData,
  MaterialSugerido,
} from "@/lib/types/feats/solicitudes-materiales/solicitud-material-types";

interface MaterialRow {
  material_id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  um: string;
  cantidad: number;
  foto?: string;
  sinVinculo?: boolean;
  entregado?: boolean;
  stock_actual: number | null;
  alerta_stock: boolean;
  stock_suficiente: boolean;
  stock_despues: number | null;
  faltante: number;
}

interface LookupCliente {
  id?: string;
  _id?: string;
  nombre?: string;
  numero?: string;
}

interface CatalogMaterial {
  id?: string;
  _id?: string;
  codigo?: string | number;
  nombre?: string;
  descripcion?: string;
  categoria?: string;
  um?: string;
  foto?: string;
}

const normalizeCategory = (value: unknown): string =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const isCategoriaOfertaPermitida = (value: unknown): boolean => {
  const categoria = normalizeCategory(value);
  if (!categoria) return false;

  return (
    categoria.includes("inversor") ||
    categoria.includes("bateria") ||
    categoria.includes("panel") ||
    categoria.includes("mppt") ||
    categoria.includes("estructura")
  );
};

const calculateStockAlert = (
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

/** Construye un mapa material_id/codigo → cantidad bruta de stock (sin descontar reservas). */
const buildStockMap = (items: StockItem[]): Map<string, number> => {
  const map = new Map<string, number>();
  for (const item of items) {
    if (item.material_id) map.set(item.material_id, item.cantidad);
    if (item.material_codigo) {
      map.set(`c:${item.material_codigo.trim().toLowerCase()}`, item.cantidad);
    }
  }
  return map;
};

/**
 * Mapa material_id (y c:codigo) → disponible por pool {sector, indistinto}.
 * disponible = cantidad − cantidad_reservada. El backend ya rellena
 * cantidad_reservada por pool con las reservas activas reales, así que esto
 * refleja lo que de verdad le queda a cada pool.
 */
const buildPoolsDispMap = (
  items: StockItem[],
  sectorKey: "instaladora" | "ventas",
): Map<string, { sector: number; indistinto: number }> => {
  const map = new Map<string, { sector: number; indistinto: number }>();
  const disp = (p?: { cantidad?: number; cantidad_reservada?: number }) =>
    Math.max(0, (p?.cantidad ?? 0) - (p?.cantidad_reservada ?? 0));
  for (const item of items) {
    const entry = {
      sector: disp(item.pools?.[sectorKey]),
      indistinto: disp(item.pools?.indistinto),
    };
    if (item.material_id) map.set(item.material_id, entry);
    if (item.material_codigo) {
      map.set(`c:${item.material_codigo.trim().toLowerCase()}`, entry);
    }
  }
  return map;
};

const lookupPoolDisp = (
  map: Map<string, { sector: number; indistinto: number }>,
  materialId: string,
  codigo?: string,
): { sector: number; indistinto: number } | null => {
  if (map.size === 0) return null;
  if (materialId && map.has(materialId)) return map.get(materialId)!;
  if (codigo) {
    const key = `c:${codigo.trim().toLowerCase()}`;
    if (map.has(key)) return map.get(key)!;
  }
  return { sector: 0, indistinto: 0 };
};

/** Mapa inverso codigo → material_id (ObjectId real de MongoDB). */
const buildCodigoToIdMap = (items: StockItem[]): Map<string, string> => {
  const map = new Map<string, string>();
  for (const item of items) {
    if (item.material_codigo && item.material_id) {
      map.set(item.material_codigo.trim().toLowerCase(), item.material_id);
    }
  }
  return map;
};

/**
 * Construye un mapa material_id → cantidad neta reservada a partir de una lista de Reservas.
 * Si se pasa un clienteId, excluye sus reservas del total (para poder aplicar el bonus aparte).
 */
const buildReservaMap = (
  reservas: { materiales?: { material_id: string; cantidad_reservada: number; cantidad_consumida?: number }[] }[],
  excludeClienteId?: string,
  excludeAlmacenId?: string,
): Map<string, number> => {
  const map = new Map<string, number>();
  for (const reserva of reservas) {
    for (const mat of reserva.materiales ?? []) {
      const neta = Math.max(0, mat.cantidad_reservada - (mat.cantidad_consumida ?? 0));
      if (neta > 0) map.set(mat.material_id, (map.get(mat.material_id) ?? 0) + neta);
    }
  }
  return map;
};

/**
 * Busca el stock en el mapa ya cargado.
 * Devuelve null si el mapa aún no está cargado (almacén no seleccionado).
 * Devuelve 0 si el mapa está cargado pero el material no tiene stock.
 */
const lookupFromMap = (
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

const normalizeDateInput = (dateStr?: string | null): string => {
  if (!dateStr) return "";
  const match = dateStr.match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] || "";
};

interface CreateSolicitudMaterialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void | Promise<void>;
  solicitud?: SolicitudMaterial | null;
}

export function CreateSolicitudMaterialDialog({
  open,
  onOpenChange,
  onSuccess,
  solicitud,
}: CreateSolicitudMaterialDialogProps) {
  const [clienteSearch, setClienteSearch] = useState("");
  const [clienteResults, setClienteResults] = useState<LookupCliente[]>([]);
  const [selectedCliente, setSelectedCliente] = useState<LookupCliente | null>(
    null,
  );
  const [clienteLoading, setClienteLoading] = useState(false);
  const [showClienteDropdown, setShowClienteDropdown] = useState(false);

  const [materiales, setMateriales] = useState<MaterialRow[]>([]);
  const [materialesSinVinculo, setMaterialesSinVinculo] = useState<string[]>(
    [],
  );
  const [loadingSugeridos, setLoadingSugeridos] = useState(false);

  const [materialSearch, setMaterialSearch] = useState("");
  const [materialResults, setMaterialResults] = useState<CatalogMaterial[]>([]);
  const [materialSearchLoading, setMaterialSearchLoading] = useState(false);
  const [showMaterialDropdown, setShowMaterialDropdown] = useState(false);



  const [almacenes, setAlmacenes] = useState<Almacen[]>([]);
  const [selectedAlmacenId, setSelectedAlmacenId] = useState("");
  const [almacenesLoading, setAlmacenesLoading] = useState(false);
  const [trabajadoresLoading, setTrabajadoresLoading] = useState(false);
  const [responsableResults, setResponsableResults] = useState<Trabajador[]>(
    [],
  );
  const [showResponsableDropdown, setShowResponsableDropdown] = useState(false);
  const [responsableRecogida, setResponsableRecogida] = useState("");
  const [fechaRecogida, setFechaRecogida] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const isEditMode = useMemo(() => Boolean(solicitud?.id), [solicitud?.id]);

  // Stock precargado del almacén seleccionado (una sola llamada al backend)
  const [stockMap, setStockMap] = useState<Map<string, number>>(new Map());
  // Disponible por pool (sector instaladora + indistinto) para los badges
  const [poolsDispMap, setPoolsDispMap] = useState<Map<string, { sector: number; indistinto: number }>>(new Map());
  const [loadingStock, setLoadingStock] = useState(false);
  const stockMapRef = useRef<Map<string, number>>(new Map());
  // Lista raw de todas las reservas activas del almacén seleccionado
  const todasReservasRef = useRef<import("@/lib/types/feats/reservas-ventas/reserva-venta-types").Reserva[]>([]);
  // Mapa de reservas netas totales del almacén (todos los clientes): material_id → total reservado
  const totalReservaMapRef = useRef<Map<string, number>>(new Map());
  // Mapa de reservas netas del cliente seleccionado: material_id → cantidad reservada por ese cliente
  const clientReservaMapRef = useRef<Map<string, number>>(new Map());
  // Mapa inverso codigo → ObjectId de MongoDB, construido del stock del almacén
  const codigoToIdRef = useRef<Map<string, string>>(new Map());

  // Ref to access current materiales inside effects without causing loops
  const materialesRef = useRef<MaterialRow[]>([]);
  materialesRef.current = materiales;

  // Ref para acceder al cliente seleccionado sin cerrar sobre estado obsoleto en effects
  const selectedClienteRef = useRef<LookupCliente | null>(null);
  selectedClienteRef.current = selectedCliente;

  useEffect(() => {
    if (!open) return;

    const loadData = async () => {
      setAlmacenesLoading(true);
      try {
        const almacenesData = await InventarioService.getAlmacenes();
        setAlmacenes(Array.isArray(almacenesData) ? almacenesData : []);
      } catch (error) {
        console.error("Error loading dialog data:", error);
      } finally {
        setAlmacenesLoading(false);
      }
    };

    void loadData();
  }, [open]);

  useEffect(() => {
    if (!open) {
      setClienteSearch("");
      setClienteResults([]);
      setSelectedCliente(null);
      setMateriales([]);
      setMaterialesSinVinculo([]);
      setSelectedAlmacenId("");
      setResponsableRecogida("");
      setFechaRecogida("");
      setMaterialSearch("");
      setMaterialResults([]);
      setResponsableResults([]);
      setShowClienteDropdown(false);
      setShowMaterialDropdown(false);
      setShowResponsableDropdown(false);
      return;
    }

    if (!solicitud) {
      setClienteSearch("");
      setClienteResults([]);
      setSelectedCliente(null);
      setMateriales([]);
      setMaterialesSinVinculo([]);
      setSelectedAlmacenId("");
      setResponsableRecogida("");
      setFechaRecogida("");
      setMaterialSearch("");
      setMaterialResults([]);
      setResponsableResults([]);
      setShowClienteDropdown(false);
      setShowMaterialDropdown(false);
      setShowResponsableDropdown(false);
      return;
    }

    const cliente = solicitud.cliente
      ? {
          id: solicitud.cliente.id,
          nombre: solicitud.cliente.nombre,
          numero: solicitud.cliente.numero,
        }
      : null;

    const rows: MaterialRow[] = (solicitud.materiales || []).map((item) => {
      const materialInfo = item.material;
      return {
        material_id: item.material_id || "",
        codigo:
          materialInfo?.codigo || item.material_codigo || item.codigo || "",
        nombre:
          materialInfo?.nombre ||
          materialInfo?.descripcion ||
          item.material_descripcion ||
          item.descripcion ||
          "",
        descripcion:
          materialInfo?.descripcion ||
          materialInfo?.nombre ||
          item.material_descripcion ||
          item.descripcion ||
          "",
        um: materialInfo?.um || item.um || "U",
        cantidad: Math.max(0, Math.trunc(item.cantidad || 0)),
        foto: materialInfo?.foto,
        sinVinculo: !item.material_id,
        stock_actual: null,
        alerta_stock: false,
        stock_suficiente: true,
        stock_despues: null,
        faltante: 0,
      };
    });

    setSelectedCliente(cliente);
    setClienteSearch(cliente?.nombre || cliente?.numero || "");
    setMateriales(rows);
    setMaterialesSinVinculo([]);
    setSelectedAlmacenId(solicitud.almacen_id || solicitud.almacen?.id || "");
    setResponsableRecogida(solicitud.responsable_recogida || "");
    setFechaRecogida(normalizeDateInput(solicitud.fecha_recogida));
    setMaterialSearch("");
    setMaterialResults([]);
    setResponsableResults([]);
    setShowClienteDropdown(false);
    setShowMaterialDropdown(false);
    setShowResponsableDropdown(false);
  }, [open, solicitud]);

  useEffect(() => {
    if (!clienteSearch.trim() || selectedCliente) {
      setClienteResults([]);
      setShowClienteDropdown(false);
      return;
    }

    const handler = setTimeout(async () => {
      setClienteLoading(true);
      try {
        const data = await ClienteService.getClientes({
          nombre: clienteSearch,
        });
        setClienteResults(data.clients || []);
        setShowClienteDropdown(true);
      } catch {
        setClienteResults([]);
      } finally {
        setClienteLoading(false);
      }
    }, 350);

    return () => clearTimeout(handler);
  }, [clienteSearch, selectedCliente]);

  const loadSugeridos = useCallback(
    async (clienteId: string, clienteNumero: string | undefined, catalog: CatalogMaterial[], almacenId?: string) => {
      // Filtra las reservas del cliente desde la lista ya cargada en memoria (sin llamada extra).
      // Si el almacén no está cargado aún, devuelve mapa vacío.
      const buildCMap = (): Map<string, number> => {
        if (!almacenId) return new Map();
        const reservasCliente = todasReservasRef.current.filter((r) => r.cliente_id === clienteId);
        const cMap = new Map<string, number>();
        for (const reserva of reservasCliente) {
          for (const mat of reserva.materiales ?? []) {
            const neta = Math.max(0, mat.cantidad_reservada - (mat.cantidad_consumida ?? 0));
            if (neta > 0) cMap.set(mat.material_id, (cMap.get(mat.material_id) ?? 0) + neta);
          }
        }
        clientReservaMapRef.current = cMap;
        return cMap;
      };
      setLoadingSugeridos(true);
      try {
        // Intentar obtener materiales de la oferta confección
        if (clienteNumero) {
          try {
            const catalogByCodigo = new Map<string, CatalogMaterial>();
            catalog.forEach((mat) => {
              const key = String(mat.codigo || "").trim();
              if (key) catalogByCodigo.set(key, mat);
            });

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const ofertaResponse = await apiRequest<any>(
              `/ofertas/confeccion/cliente/${encodeURIComponent(clienteNumero)}`,
            );
            const payload = ofertaResponse?.data ?? ofertaResponse;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const rawOfertas: any[] = Array.isArray(payload?.ofertas)
              ? payload.ofertas
              : Array.isArray(payload)
                ? payload
                : payload?.oferta
                  ? [payload.oferta]
                  : [];

            // Solo considerar ofertas confirmadas por el cliente.
            // Si hay más de una confirmada, usar la más reciente (por fecha_actualizacion / fecha_creacion).
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const esConfirmada = (o: any) => {
              const estado = String(o?.estado || o?.status || "").toLowerCase();
              return estado.includes("confirmada_por_cliente") || estado.includes("confirmada_cliente");
            };
            const confirmadas = rawOfertas.filter(esConfirmada);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const ofertaSeleccionada: any | null =
              confirmadas.length === 0
                ? null
                : confirmadas.reduce((mejor, actual) => {
                    const tMejor = new Date(
                      mejor?.fecha_actualizacion || mejor?.fecha_creacion || mejor?.updated_at || mejor?.created_at || 0,
                    ).getTime();
                    const tActual = new Date(
                      actual?.fecha_actualizacion || actual?.fecha_creacion || actual?.updated_at || actual?.created_at || 0,
                    ).getTime();
                    return tActual > tMejor ? actual : mejor;
                  });
            const ofertasAUsar = ofertaSeleccionada ? [ofertaSeleccionada] : [];

            // Acumular por material_codigo: pendiente total y si tiene alguna entrega
            const acumulado = new Map<string, { pendiente: number; tieneEntregas: boolean }>();
            for (const oferta of ofertasAUsar) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const items: any[] = Array.isArray(oferta.items ?? oferta.materiales)
                ? (oferta.items ?? oferta.materiales)
                : [];
              for (const item of items) {
                if (!item.material_codigo) continue;
                const materialCodigo = String(item.material_codigo).trim();
                if (!materialCodigo) continue;
                const catalogMat = catalogByCodigo.get(materialCodigo);
                const categoriaItem =
                  item.categoria ??
                  item.categoria_nombre ??
                  item.categoria_material ??
                  catalogMat?.categoria;
                if (!isCategoriaOfertaPermitida(categoriaItem)) continue;

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const entregas: any[] = Array.isArray(item.entregas) ? item.entregas : [];
                const tieneEntregas = entregas.length > 0;
                const totalEntregado = entregas.reduce(
                  (sum, entrega) => sum + (Number(entrega?.cantidad) || 0),
                  0,
                );
                const cantidadTotal = Number(item.cantidad) || 0;
                const rawPendiente = item.cantidad_pendiente_por_entregar;
                const pendiente =
                  Number.isFinite(Number(rawPendiente)) && rawPendiente !== undefined && rawPendiente !== null
                    ? Math.max(0, Number(rawPendiente))
                    : Math.max(0, cantidadTotal - totalEntregado);
                const existing = acumulado.get(materialCodigo);
                if (existing) {
                  existing.pendiente = existing.pendiente + pendiente;
                  existing.tieneEntregas = existing.tieneEntregas || tieneEntregas;
                } else {
                  acumulado.set(materialCodigo, {
                    pendiente,
                    tieneEntregas,
                  });
                }
              }
            }

            if (acumulado.size > 0) {
              const entregados: MaterialRow[] = [];
              const pendientes: MaterialRow[] = [];

              for (const [codigo, info] of acumulado) {
                const catalogMat = catalog.find(m => m.codigo?.toString() === codigo);
                if (!catalogMat) continue;
                const id = catalogMat.id || catalogMat._id || "";
                const row: MaterialRow = {
                  material_id: id,
                  codigo: catalogMat.codigo?.toString() || codigo,
                  nombre: catalogMat.nombre || catalogMat.descripcion || "",
                  descripcion: catalogMat.descripcion || catalogMat.nombre || "",
                  um: catalogMat.um || "U",
                  cantidad: Math.max(0, Math.trunc(info.pendiente)),
                  foto: catalogMat.foto,
                  stock_actual: null,
                  alerta_stock: false,
                  stock_suficiente: true,
                  stock_despues: null,
                  faltante: 0,
                };
                // Entregado = sin pendiente Y tiene al menos una entrega registrada
                if (info.pendiente === 0 && info.tieneEntregas) {
                  entregados.push({ ...row, entregado: true });
                } else {
                  pendientes.push({ ...row, cantidad: Math.max(1, Math.trunc(info.pendiente)) });
                }
              }

              if (entregados.length > 0 || pendientes.length > 0) {
                const allRows = [...pendientes, ...entregados];
                const map = stockMapRef.current;
                const tMap = totalReservaMapRef.current;
                const cMap = buildCMap();
                setMateriales(
                  allRows.map((r) => {
                    if (!r.material_id || r.sinVinculo || r.entregado) return r;
                    const bruto = lookupFromMap(map, r.material_id, r.codigo);
                    if (bruto === null) return { ...r, stock_actual: null };
                    const effective = Math.max(0, bruto - (tMap.get(r.material_id) ?? 0) + (cMap.get(r.material_id) ?? 0));
                    return { ...r, stock_actual: effective, ...calculateStockAlert(r.cantidad, effective) };
                  }),
                );
                setMaterialesSinVinculo([]);
                return;
              }
            }
          } catch {
            // Si falla la consulta de oferta, continuar con sugeridos
          }
        }

        // Fallback: materiales sugeridos del cliente
        const { materiales: sugeridos, materiales_sin_vinculo } =
          await SolicitudMaterialService.getMaterialesSugeridos(clienteId);

        const rows: MaterialRow[] = sugeridos.map((s: MaterialSugerido) => {
          const mat = s.material;
          const catalogMat = !mat
            ? catalog.find((m) => (m.id || m._id) === s.material_id)
            : null;
          const src = mat || catalogMat;
          return {
            material_id: s.material_id || "",
            codigo: src?.codigo?.toString() || s.material_codigo || s.codigo || "",
            nombre:
              src?.nombre ||
              src?.descripcion ||
              s.material_descripcion ||
              s.nombre ||
              s.descripcion ||
              "",
            descripcion:
              src?.descripcion ||
              src?.nombre ||
              s.material_descripcion ||
              s.descripcion ||
              "",
            um: src?.um || s.um || "U",
            cantidad: Math.max(0, Math.trunc(s.cantidad || 0)),
            foto: src?.foto,
            sinVinculo: !s.material_id,
            stock_actual: null,
            alerta_stock: false,
            stock_suficiente: true,
            stock_despues: null,
            faltante: 0,
          };
        });

        const map = stockMapRef.current;
        const tMap = totalReservaMapRef.current;
        const cMap = buildCMap();
        setMateriales(
          rows.map((r) => {
            if (!r.material_id || r.sinVinculo) return r;
            const bruto = lookupFromMap(map, r.material_id, r.codigo);
            if (bruto === null) return { ...r, stock_actual: null };
            const effective = Math.max(0, bruto - (tMap.get(r.material_id) ?? 0) + (cMap.get(r.material_id) ?? 0));
            return { ...r, stock_actual: effective, ...calculateStockAlert(r.cantidad, effective) };
          }),
        );
        setMaterialesSinVinculo(materiales_sin_vinculo || []);
      } catch (error) {
        console.error("Error loading suggested materials:", error);
        setMateriales([]);
      } finally {
        setLoadingSugeridos(false);
      }
    },
    [],
  );

  const handleSelectCliente = (cliente: LookupCliente) => {
    setSelectedCliente(cliente);
    setClienteSearch(cliente.nombre || cliente.numero || "");
    setShowClienteDropdown(false);
    if (cliente.id || cliente._id) {
      void loadSugeridos((cliente.id || cliente._id)!, cliente.numero, [], selectedAlmacenId || undefined);
    }
  };

  const handleClearCliente = () => {
    setSelectedCliente(null);
    setClienteSearch("");
    setShowClienteDropdown(false);
    // Sin cliente: stock visible = bruto - total_reservado (sin bonus)
    clientReservaMapRef.current = new Map();
    const tMap = totalReservaMapRef.current;
    setMateriales((prev) =>
      prev.map((m) => {
        if (!m.material_id || m.sinVinculo || m.entregado) return m;
        const bruto = lookupFromMap(stockMapRef.current, m.material_id, m.codigo);
        if (bruto === null) return m;
        const effective = Math.max(0, bruto - (tMap.get(m.material_id) ?? 0));
        return { ...m, stock_actual: effective, ...calculateStockAlert(m.cantidad, effective) };
      }),
    );
  };

  useEffect(() => {
    if (!materialSearch.trim()) {
      setMaterialResults([]);
      setShowMaterialDropdown(false);
      return;
    }

    const handler = setTimeout(async () => {
      setMaterialSearchLoading(true);
      try {
        let filtered: CatalogMaterial[] = [];
        if (selectedAlmacenId) {
          // Buscar en el inventario del almacén: devuelve material_id como ObjectId real
          const { data: stockItems } = await InventarioService.getStock({
            almacen_id: selectedAlmacenId,
            q: materialSearch.trim(),
            limit: 15,
          });
          filtered = stockItems
            .filter((s) => s.material_id && !materiales.some((row) => row.material_id === s.material_id))
            .map((s) => ({
              id: s.material_id,
              _id: s.material_id,
              codigo: s.material_codigo || s.material_id,
              nombre: s.material_descripcion || s.material_codigo || "",
              descripcion: s.material_descripcion || "",
              um: s.um || "",
              foto: (s.material as any)?.foto,
            }));
        } else {
          // Sin almacén aún: búsqueda en catálogo (sin ObjectId garantizado)
          const results = await MaterialService.searchMaterialsByCode(materialSearch.trim(), 15);
          filtered = results.filter((m) => !materiales.some((row) => row.material_id === m.id));
        }
        setMaterialResults(filtered);
        setShowMaterialDropdown(filtered.length > 0);
      } catch {
        setMaterialResults([]);
      } finally {
        setMaterialSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [materialSearch, materiales]);

  useEffect(() => {
    const term = responsableRecogida.trim();
    if (!term) {
      setResponsableResults([]);
      setShowResponsableDropdown(false);
      return;
    }

    const handler = setTimeout(async () => {
      setTrabajadoresLoading(true);
      try {
        const results = await TrabajadorService.buscarTrabajadores(term);
        const filtered = (Array.isArray(results) ? results : []).slice(0, 15);
        setResponsableResults(filtered as unknown as Trabajador[]);
        setShowResponsableDropdown(filtered.length > 0);
      } catch {
        setResponsableResults([]);
      } finally {
        setTrabajadoresLoading(false);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [responsableRecogida]);

  const handleSelectResponsable = (trabajador: Trabajador) => {
    setResponsableRecogida(trabajador.nombre);
    setShowResponsableDropdown(false);
    setResponsableResults([]);
  };

  const handleClearResponsable = () => {
    setResponsableRecogida("");
    setShowResponsableDropdown(false);
    setResponsableResults([]);
  };

  const handleAddMaterial = (material: CatalogMaterial) => {
    // El stock del almacén siempre expone material_id como ObjectId real;
    // para búsquedas de catálogo sin almacén, dependemos de que el backend
    // entregue `material_id` (ObjectId) — ahora priorizado en normalizeSearchMaterial.
    const codigoKey = material.codigo?.toString().trim().toLowerCase() ?? "";
    const id =
      codigoToIdRef.current.get(codigoKey) ||
      material.id ||
      material._id ||
      "";
    if (!id || materiales.some((m) => m.material_id === id)) return;
    if (!/^[a-f0-9]{24}$/i.test(id)) {
      alert(
        "No se pudo identificar el material. Seleccione un almacén antes de agregar materiales manuales.",
      );
      return;
    }

    const bruto = lookupFromMap(stockMapRef.current, id, material.codigo?.toString());
    const stockActual = bruto !== null
      ? Math.max(0, bruto - (totalReservaMapRef.current.get(id) ?? 0) + (clientReservaMapRef.current.get(id) ?? 0))
      : null;
    const stockState = calculateStockAlert(1, stockActual);

    setMateriales((prev) =>
      prev.some((row) => row.material_id === id)
        ? prev
        : [
            ...prev,
            {
              material_id: id,
              codigo: material.codigo?.toString() || "",
              nombre: material.nombre || material.descripcion || "",
              descripcion: material.descripcion || material.nombre || "",
              um: material.um || "U",
              cantidad: 1,
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

  const handleRemoveMaterial = (index: number) => {
    setMateriales((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCantidadChange = (index: number, value: string) => {
    // Permitir campo vacío temporalmente para facilitar edición
    if (value === "") {
      setMateriales((prev) =>
        prev.map((m, i) =>
          i === index
            ? { ...m, cantidad: 0, ...calculateStockAlert(0, m.stock_actual) }
            : m,
        ),
      );
      return;
    }

    const num = Number.parseInt(value, 10);
    if (Number.isNaN(num) || num < 0) return;
    setMateriales((prev) =>
      prev.map((m, i) =>
        i === index
          ? { ...m, cantidad: num, ...calculateStockAlert(num, m.stock_actual, m.alerta_stock) }
          : m,
      ),
    );
  };

  // Una sola llamada al cambiar el almacén: carga TODO el stock y recalcula en memoria
  useEffect(() => {
    if (!selectedAlmacenId) {
      const empty = new Map<string, number>();
      setStockMap(empty);
      setPoolsDispMap(new Map());
      stockMapRef.current = empty;
      todasReservasRef.current = [];
      totalReservaMapRef.current = new Map();
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

        const map = buildStockMap(items);
        setStockMap(map);
        setPoolsDispMap(buildPoolsDispMap(items, "instaladora"));
        stockMapRef.current = map;
        codigoToIdRef.current = buildCodigoToIdMap(items);

        // Guardar lista raw y construir mapa total
        todasReservasRef.current = todasReservas;
        const tMap = buildReservaMap(todasReservas);
        totalReservaMapRef.current = tMap;

        // Mapa de reservas solo del cliente seleccionado (filtrado del total ya cargado)
        const currentCliente = selectedClienteRef.current;
        const clienteId = currentCliente?.id || currentCliente?._id;
        const cMap = new Map<string, number>();
        if (clienteId) {
          const reservasCliente = todasReservas.filter((r) => r.cliente_id === clienteId);
          for (const reserva of reservasCliente) {
            for (const mat of reserva.materiales ?? []) {
              const neta = Math.max(0, mat.cantidad_reservada - (mat.cantidad_consumida ?? 0));
              if (neta > 0) cMap.set(mat.material_id, (cMap.get(mat.material_id) ?? 0) + neta);
            }
          }
        }
        clientReservaMapRef.current = cMap;

        // stock_visible = bruto − total_reservado + reservado_por_cliente
        const mats = materialesRef.current;
        if (mats.length > 0) {
          setMateriales(
            mats.map((m) => {
              if (!m.material_id || m.sinVinculo || m.entregado) return m;
              const bruto = lookupFromMap(map, m.material_id, m.codigo);
              if (bruto === null) return m;
              const effective = Math.max(0, bruto - (tMap.get(m.material_id) ?? 0) + (cMap.get(m.material_id) ?? 0));
              return { ...m, stock_actual: effective, ...calculateStockAlert(m.cantidad, effective) };
            }),
          );
        }
      } finally {
        setLoadingStock(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAlmacenId]);

  const handleSubmit = async () => {
    if (!selectedAlmacenId) return;

    // Excluir materiales sin id, sin vínculo, entregados o con cantidad 0
    const validMaterials = materiales.filter(
      (m) => m.material_id && !m.sinVinculo && !m.entregado && m.cantidad > 0,
    );
    if (validMaterials.length === 0) return;

    setSubmitting(true);
    try {
      const normalizedMateriales = validMaterials.map((m) => ({
        material_id: m.material_id,
        cantidad: Math.max(0, Math.trunc(m.cantidad)),
      }));
      const clienteId = selectedCliente
        ? selectedCliente.id || selectedCliente._id
        : null;
      const normalizedResponsable = responsableRecogida.trim();
      const normalizedFechaRecogida = fechaRecogida.trim();

      if (isEditMode && solicitud?.id) {
        const payload: SolicitudMaterialUpdateData = {
          almacen_id: selectedAlmacenId,
          materiales: normalizedMateriales,
          cliente_id: clienteId,
          responsable_recogida: normalizedResponsable || null,
          fecha_recogida: normalizedFechaRecogida || null,
        };
        await SolicitudMaterialService.updateSolicitud(solicitud.id, payload);
      } else {
        const payload: SolicitudMaterialCreateData = {
          almacen_id: selectedAlmacenId,
          materiales: normalizedMateriales,
        };
        if (clienteId) {
          payload.cliente_id = clienteId;
        }
        if (normalizedResponsable) {
          payload.responsable_recogida = normalizedResponsable;
        }
        if (normalizedFechaRecogida) {
          payload.fecha_recogida = normalizedFechaRecogida;
        }
        await SolicitudMaterialService.createSolicitud(payload);
      }

      await onSuccess();
      onOpenChange(false);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : isEditMode
            ? "Error al actualizar la solicitud"
            : "Error al crear la solicitud";
      console.error(
        isEditMode ? "Error updating solicitud:" : "Error creating solicitud:",
        error,
      );
      alert(message);
    } finally {
      setSubmitting(false);
    }
  };

  const hasSinVinculo = materiales.some((m) => m.sinVinculo);
  const validCount = materiales.filter(
    (m) => m.material_id && !m.sinVinculo && !m.entregado && m.cantidad > 0,
  ).length;
  const canSubmit =
    selectedAlmacenId && validCount > 0 && !submitting;

  const dialogTitle = isEditMode
    ? "Editar Solicitud de Materiales"
    : "Nueva Solicitud de Materiales";
  const submitText = isEditMode
    ? `Guardar cambios (${validCount} materiales)`
    : `Crear Solicitud (${validCount} materiales)`;
  const submittingText = isEditMode ? "Guardando..." : "Creando...";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-purple-600" />
            {dialogTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Almacen <span className="text-red-500">*</span>
            </Label>
            {almacenesLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando almacenes...
              </div>
            ) : (
              <Select
                value={selectedAlmacenId}
                onValueChange={setSelectedAlmacenId}
                disabled={loadingStock}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione un almacen" />
                </SelectTrigger>
                <SelectContent>
                  {almacenes.map((a) => (
                    <SelectItem key={a.id} value={a.id!}>
                      {a.nombre}
                      {a.codigo && ` (${a.codigo})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Cliente{" "}
              <span className="text-gray-400 font-normal">(opcional)</span>
            </Label>
            <div className="relative">
              {selectedCliente ? (
                <div className="flex items-center gap-2 border rounded-md px-3 py-2 bg-purple-50 border-purple-200">
                  <span className="text-sm font-medium text-purple-800 flex-1">
                    {selectedCliente.nombre || selectedCliente.numero}
                    {selectedCliente.numero && (
                      <span className="ml-2 text-purple-500 font-normal">
                        N {selectedCliente.numero}
                      </span>
                    )}
                  </span>
                  <button
                    onClick={handleClearCliente}
                    className="text-purple-400 hover:text-purple-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar cliente por nombre..."
                    value={clienteSearch}
                    onChange={(e) => setClienteSearch(e.target.value)}
                    className="pl-10"
                  />
                  {clienteLoading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
                  )}
                </>
              )}
              {showClienteDropdown && clienteResults.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {clienteResults.map((c) => (
                    <button
                      key={c.id || c._id}
                      className="w-full text-left px-4 py-2 hover:bg-purple-50 text-sm"
                      onClick={() => handleSelectCliente(c)}
                    >
                      <span className="font-medium">{c.nombre}</span>
                      {c.numero && (
                        <span className="ml-2 text-gray-500">N {c.numero}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Materiales</Label>
              {materiales.length > 0 && (
                <button
                  type="button"
                  onClick={() => setMateriales([])}
                  className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Quitar todos
                </button>
              )}
            </div>

            {loadingSugeridos && (
              <div className="flex items-center gap-2 text-sm text-gray-500 py-3">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando materiales sugeridos del cliente...
              </div>
            )}

            {materialesSinVinculo.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm">
                <div className="flex items-center gap-1.5 text-amber-700 font-medium mb-1">
                  <AlertTriangle className="h-4 w-4" />
                  Materiales sin vinculo
                </div>
                <p className="text-amber-600 text-xs">
                  Los siguientes codigos no tienen un material valido asociado.
                  Deben seleccionarse manualmente:{" "}
                  {materialesSinVinculo.join(", ")}
                </p>
              </div>
            )}

            {materiales.length > 0 && (
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="text-left py-2 px-3 font-medium text-gray-700">
                        Material
                      </th>
                      <th className="text-left py-2 px-3 font-medium text-gray-700 w-20">
                        UM
                      </th>
                      <th className="text-left py-2 px-3 font-medium text-gray-700 w-28">
                        Cantidad
                      </th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {materiales.map((mat, idx) => {
                      const rowBg = mat.entregado
                        ? "bg-red-50"
                        : mat.sinVinculo
                          ? "bg-orange-50"
                          : mat.alerta_stock
                            ? "bg-red-50/60"
                            : "";
                      return (
                        <tr
                          key={idx}
                          className={`border-b last:border-b-0 ${rowBg}`}
                        >
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-2">
                              {mat.foto ? (
                                <img
                                  src={mat.foto}
                                  alt={mat.nombre || mat.descripcion}
                                  className={`h-8 w-8 rounded object-cover border flex-shrink-0 ${mat.entregado ? "border-red-200 opacity-60" : "border-gray-200"}`}
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display =
                                      "none";
                                  }}
                                />
                              ) : (
                                <div className={`h-8 w-8 rounded border flex items-center justify-center flex-shrink-0 ${mat.entregado ? "bg-red-100 border-red-200" : "bg-gray-100 border-gray-200"}`}>
                                  <Package className={`h-4 w-4 ${mat.entregado ? "text-red-400" : "text-gray-400"}`} />
                                </div>
                              )}
                              <div>
                                <p
                                  className={`font-medium leading-tight ${mat.entregado ? "text-red-700 line-through" : mat.sinVinculo ? "text-orange-700" : "text-gray-900"}`}
                                >
                                  {mat.nombre || mat.descripcion || mat.codigo}
                                </p>
                                {mat.codigo && (
                                  <p className={`text-xs ${mat.entregado ? "text-red-400" : "text-gray-400"}`}>
                                    {mat.codigo}
                                  </p>
                                )}
                                {mat.entregado && (
                                  <Badge
                                    variant="outline"
                                    className="text-xs bg-red-100 text-red-700 border-red-300 mt-0.5"
                                  >
                                    Ya entregado
                                  </Badge>
                                )}
                                {mat.sinVinculo && !mat.entregado && (
                                  <Badge
                                    variant="outline"
                                    className="text-xs bg-orange-100 text-orange-700 border-orange-300"
                                  >
                                    Sin vinculo
                                  </Badge>
                                )}
                                {mat.alerta_stock && !mat.entregado && !mat.sinVinculo && (
                                  <Badge
                                    variant="outline"
                                    className="text-xs bg-red-50 text-red-700 border-red-200 mt-0.5"
                                  >
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    Stock insuficiente
                                  </Badge>
                                )}
                                {!mat.entregado && !mat.sinVinculo && selectedAlmacenId && (
                                  mat.alerta_stock ? (
                                    <p className="text-xs text-red-600 mt-0.5">
                                      Stock: {mat.stock_actual ?? 0} {mat.um} | Faltante: {mat.faltante}
                                    </p>
                                  ) : (
                                    <p className="text-xs text-gray-500 mt-0.5">
                                      Stock disponible: {mat.stock_actual ?? 0} {mat.um}
                                    </p>
                                  )
                                )}
                                {!mat.entregado && !mat.sinVinculo && selectedAlmacenId && (() => {
                                  const pd = lookupPoolDisp(poolsDispMap, mat.material_id, mat.codigo?.toString());
                                  if (!pd) return null;
                                  return (
                                    <div className="flex flex-wrap items-center gap-1 mt-1">
                                      <Badge
                                        variant="outline"
                                        className="text-[10px] bg-blue-50 text-blue-700 border-blue-200"
                                        title="Disponible en el sector Instaladora"
                                      >
                                        Instaladora: {pd.sector}
                                      </Badge>
                                      <Badge
                                        variant="outline"
                                        className="text-[10px] bg-violet-50 text-violet-700 border-violet-200"
                                        title="Disponible en el pool indistinto (sirve a ambos sectores)"
                                      >
                                        Ambos: {pd.indistinto}
                                      </Badge>
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                          </td>
                          <td className={`py-2 px-3 ${mat.entregado ? "text-red-400" : "text-gray-500"}`}>{mat.um}</td>
                          <td className="py-2 px-3">
                            {mat.entregado ? (
                              <span className="text-xs text-red-500 font-medium">Completo</span>
                            ) : (
                              <Input
                                type="number"
                                min="0"
                                step="1"
                                value={mat.cantidad === 0 ? "" : mat.cantidad}
                                onChange={(e) =>
                                  handleCantidadChange(idx, e.target.value)
                                }
                                className="h-8 w-24"
                                placeholder="0"
                              />
                            )}
                          </td>
                          <td className="py-2 px-3">
                            {!mat.entregado && (
                              <button
                                onClick={() => handleRemoveMaterial(idx)}
                                className="text-red-400 hover:text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar material para agregar..."
                value={materialSearch}
                onChange={(e) => setMaterialSearch(e.target.value)}
                className="pl-10"
              />
              {materialSearchLoading && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
              )}
              {showMaterialDropdown && materialResults.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {materialResults.map((m) => {
                    const matId = m.id || m._id || "";
                    const brutoDisponible = selectedAlmacenId
                      ? lookupFromMap(stockMap, matId, m.codigo?.toString())
                      : null;
                    const stockDisponible = brutoDisponible !== null
                      ? Math.max(0, brutoDisponible - (totalReservaMapRef.current.get(matId) ?? 0) + (clientReservaMapRef.current.get(matId) ?? 0))
                      : null;
                    return (
                      <button
                        key={matId}
                        className="w-full text-left px-3 py-2 hover:bg-purple-50 text-sm flex items-center gap-2"
                        onClick={() => handleAddMaterial(m)}
                      >
                        {m.foto ? (
                          <img
                            src={m.foto}
                            alt={m.nombre || m.descripcion}
                            className="h-7 w-7 rounded object-cover border border-gray-200 flex-shrink-0"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display =
                                "none";
                            }}
                          />
                        ) : (
                          <div className="h-7 w-7 rounded bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
                            <Package className="h-3 w-3 text-gray-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {m.nombre || m.descripcion}
                          </p>
                          <div className="flex items-center gap-2 text-xs">
                            {m.codigo && (
                              <span className="text-gray-400">{m.codigo}</span>
                            )}
                            {selectedAlmacenId && (
                              <span
                                className={
                                  (stockDisponible ?? 0) > 0
                                    ? "text-green-600 font-medium"
                                    : "text-red-500 font-medium"
                                }
                              >
                                Stock: {stockDisponible ?? 0} {m.um || "U"}
                              </span>
                            )}
                          </div>
                        </div>
                        <Plus className="h-4 w-4 text-green-600 flex-shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {!selectedAlmacenId && (
              <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
                <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                Seleccione un almacén arriba para ver alertas de stock disponible
              </p>
            )}
            {loadingStock && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Loader2 className="h-3 w-3 animate-spin" />
                Cargando stock del almacén...
              </div>
            )}

            {materiales.length === 0 && !loadingSugeridos && (
              <p className="text-sm text-gray-400 text-center py-2">
                {selectedCliente
                  ? "No se encontraron materiales sugeridos. Agregue materiales manualmente."
                  : "Seleccione un cliente para cargar sugeridos o agregue materiales manualmente."}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Responsable de Recogida{" "}
                <span className="text-gray-400 font-normal">(opcional)</span>
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar trabajador por nombre..."
                  value={responsableRecogida}
                  onChange={(event) => setResponsableRecogida(event.target.value)}
                  onFocus={() => {
                    if (responsableResults.length > 0) {
                      setShowResponsableDropdown(true);
                    }
                  }}
                  className="pl-10 pr-10"
                />
                {trabajadoresLoading ? (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
                ) : null}
                {!trabajadoresLoading && responsableRecogida ? (
                  <button
                    type="button"
                    onClick={handleClearResponsable}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
                {showResponsableDropdown && responsableResults.length > 0 ? (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {responsableResults.map((trabajador) => (
                      <button
                        key={`${trabajador.id}-${trabajador.CI}`}
                        type="button"
                        className="w-full text-left px-4 py-2 hover:bg-purple-50 text-sm"
                        onClick={() => handleSelectResponsable(trabajador)}
                      >
                        <span className="font-medium">{trabajador.nombre}</span>
                        {trabajador.CI ? (
                          <span className="ml-2 text-gray-500">
                            CI {trabajador.CI}
                          </span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              {!trabajadoresLoading && responsableResults.length === 0 && responsableRecogida.trim() ? (
                <p className="text-xs text-gray-500">
                  No se encontraron trabajadores.
                </p>
              ) : null}
              <button
                type="button"
                onClick={handleClearResponsable}
                className="text-xs text-purple-600 hover:text-purple-800"
              >
                Dejar sin responsable
              </button>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Fecha de Recogida{" "}
                <span className="text-gray-400 font-normal">(opcional)</span>
              </Label>
              <Input
                type="date"
                value={fechaRecogida}
                onChange={(event) => setFechaRecogida(event.target.value)}
              />
              <p className="text-xs text-gray-500">
                Si no se define al crear, backend usa la fecha de hoy.
              </p>
            </div>
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
              className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {submittingText}
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  {submitText}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
