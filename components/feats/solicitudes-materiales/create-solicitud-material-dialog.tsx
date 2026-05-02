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

/** Construye un mapa material_id/codigo → stock efectivo (total − reservado global) a partir de StockItem[]. */
const buildStockMap = (items: StockItem[]): Map<string, number> => {
  const map = new Map<string, number>();
  for (const item of items) {
    const efectivo = Math.max(0, item.cantidad - (item.cantidad_reservada ?? 0));
    if (item.material_id) map.set(item.material_id, efectivo);
    if (item.material_codigo) {
      map.set(`c:${item.material_codigo.trim().toLowerCase()}`, efectivo);
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

  const [allMaterials, setAllMaterials] = useState<CatalogMaterial[]>([]);

  const [almacenes, setAlmacenes] = useState<Almacen[]>([]);
  const [selectedAlmacenId, setSelectedAlmacenId] = useState("");
  const [almacenesLoading, setAlmacenesLoading] = useState(false);
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
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
  const [loadingStock, setLoadingStock] = useState(false);
  const stockMapRef = useRef<Map<string, number>>(new Map());
  // Mapa de reservas netas del cliente seleccionado: material_id → cantidad reservada por ese cliente
  const clientReservaMapRef = useRef<Map<string, number>>(new Map());

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
      setTrabajadoresLoading(true);
      try {
        const [almacenesData, materialsData, trabajadoresData] =
          await Promise.all([
            InventarioService.getAlmacenes(),
            MaterialService.getAllMaterials(),
            TrabajadorService.getAllTrabajadores(),
          ]);
        setAlmacenes(Array.isArray(almacenesData) ? almacenesData : []);
        setAllMaterials(Array.isArray(materialsData) ? materialsData : []);
        const trabajadoresDisponibles = (Array.isArray(trabajadoresData)
          ? trabajadoresData
          : []
        )
          .filter(
            (trabajador): trabajador is Trabajador =>
              Boolean(trabajador?.nombre?.trim()),
          )
          .map((trabajador) => ({
            ...trabajador,
            nombre: trabajador.nombre.trim(),
          }))
          .sort((a, b) =>
            a.nombre.localeCompare(b.nombre, "es", {
              sensitivity: "base",
            }),
          );
        setTrabajadores(trabajadoresDisponibles);
      } catch (error) {
        console.error("Error loading dialog data:", error);
      } finally {
        setAlmacenesLoading(false);
        setTrabajadoresLoading(false);
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
      // Carga reservas netas del cliente en el almacén dado; devuelve mapa vacío si no aplica
      const buildCMap = async (): Promise<Map<string, number>> => {
        if (!almacenId) return new Map();
        try {
          const { data } = await ReservaVentaService.getReservas({
            almacen_id: almacenId,
            cliente_id: clienteId,
            estado: "activa",
            limit: 100,
          });
          const cMap = new Map<string, number>();
          for (const reserva of data) {
            for (const mat of reserva.materiales ?? []) {
              const neta = Math.max(0, mat.cantidad_reservada - (mat.cantidad_consumida ?? 0));
              if (neta > 0) cMap.set(mat.material_id, (cMap.get(mat.material_id) ?? 0) + neta);
            }
          }
          return cMap;
        } catch {
          return new Map();
        }
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
                const cMap = await buildCMap();
                clientReservaMapRef.current = cMap;
                setMateriales(
                  allRows.map((r) => {
                    if (!r.material_id || r.sinVinculo || r.entregado) return r;
                    const base = lookupFromMap(map, r.material_id, r.codigo);
                    if (base === null) return { ...r, stock_actual: null };
                    const effective = base + (cMap.get(r.material_id) ?? 0);
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
        const cMap = await buildCMap();
        clientReservaMapRef.current = cMap;
        setMateriales(
          rows.map((r) => {
            if (!r.material_id || r.sinVinculo) return r;
            const base = lookupFromMap(map, r.material_id, r.codigo);
            if (base === null) return { ...r, stock_actual: null };
            const effective = base + (cMap.get(r.material_id) ?? 0);
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
      void loadSugeridos((cliente.id || cliente._id)!, cliente.numero, allMaterials, selectedAlmacenId || undefined);
    }
  };

  const handleClearCliente = () => {
    setSelectedCliente(null);
    setClienteSearch("");
    setShowClienteDropdown(false);
    // Limpiar bonus del cliente y recalcular stock sin él
    clientReservaMapRef.current = new Map();
    setMateriales((prev) =>
      prev.map((m) => {
        if (!m.material_id || m.sinVinculo || m.entregado) return m;
        const base = lookupFromMap(stockMapRef.current, m.material_id, m.codigo);
        return { ...m, stock_actual: base, ...(base !== null ? calculateStockAlert(m.cantidad, base) : {}) };
      }),
    );
  };

  useEffect(() => {
    if (!materialSearch.trim()) {
      setMaterialResults([]);
      setShowMaterialDropdown(false);
      return;
    }

    const handler = setTimeout(() => {
      setMaterialSearchLoading(true);
      const term = materialSearch.toLowerCase();
      const filtered = allMaterials
        .filter(
          (m) =>
            (m.descripcion?.toLowerCase().includes(term) ||
              m.nombre?.toLowerCase().includes(term) ||
              m.codigo?.toString().toLowerCase().includes(term)) &&
            !materiales.some((row) => row.material_id === (m.id || m._id)),
        )
        .slice(0, 15);

      setMaterialResults(filtered);
      setShowMaterialDropdown(filtered.length > 0);
      setMaterialSearchLoading(false);
    }, 200);

    return () => clearTimeout(handler);
  }, [materialSearch, allMaterials, materiales]);

  useEffect(() => {
    const term = responsableRecogida.trim().toLowerCase();
    if (!term) {
      setResponsableResults([]);
      setShowResponsableDropdown(false);
      return;
    }

    const handler = setTimeout(() => {
      const filtered = trabajadores
        .filter((trabajador) =>
          trabajador.nombre.toLowerCase().includes(term),
        )
        .slice(0, 15);
      setResponsableResults(filtered);
      setShowResponsableDropdown(filtered.length > 0);
    }, 200);

    return () => clearTimeout(handler);
  }, [responsableRecogida, trabajadores]);

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
    const id = material.id || material._id || "";
    if (materiales.some((m) => m.material_id === id)) return;

    const base = lookupFromMap(stockMapRef.current, id, material.codigo?.toString());
    const bonus = base !== null ? (clientReservaMapRef.current.get(id) ?? 0) : 0;
    const stockActual = base !== null ? base + bonus : null;
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
      stockMapRef.current = empty;
      clientReservaMapRef.current = new Map();
      return;
    }

    void (async () => {
      setLoadingStock(true);
      try {
        const { data: items } = await InventarioService.getStock({ almacen_id: selectedAlmacenId, limit: 200 });
        const map = buildStockMap(items);
        setStockMap(map);
        stockMapRef.current = map;

        // Cargar reservas netas del cliente seleccionado (si hay) para sumar su propio bonus
        const currentCliente = selectedClienteRef.current;
        const clienteId = currentCliente?.id || currentCliente?._id;
        const cMap = new Map<string, number>();
        if (clienteId) {
          try {
            const { data } = await ReservaVentaService.getReservas({
              almacen_id: selectedAlmacenId,
              cliente_id: clienteId,
              estado: "activa",
              limit: 100,
            });
            for (const reserva of data) {
              for (const mat of reserva.materiales ?? []) {
                const neta = Math.max(0, mat.cantidad_reservada - (mat.cantidad_consumida ?? 0));
                if (neta > 0) cMap.set(mat.material_id, (cMap.get(mat.material_id) ?? 0) + neta);
              }
            }
          } catch { /* ignorar error de reservas, mostrar solo stock efectivo */ }
        }
        clientReservaMapRef.current = cMap;

        // Recalcular alertas de todos los materiales ya cargados (sin más llamadas)
        const mats = materialesRef.current;
        if (mats.length > 0) {
          setMateriales(
            mats.map((m) => {
              if (!m.material_id || m.sinVinculo || m.entregado) return m;
              const base = lookupFromMap(map, m.material_id, m.codigo);
              if (base === null) return m;
              const effective = base + (cMap.get(m.material_id) ?? 0);
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

    const validMaterials = materiales.filter(
      (m) => m.material_id && !m.sinVinculo && !m.entregado,
    );
    if (validMaterials.length === 0) return;

    // Validar que no haya materiales con cantidad 0
    const materialesConCantidadCero = validMaterials.filter((m) => m.cantidad === 0);
    if (materialesConCantidadCero.length > 0) {
      alert(
        `No se puede ${isEditMode ? "guardar" : "crear"} la solicitud. Hay ${materialesConCantidadCero.length} material(es) con cantidad 0. Por favor, ajuste las cantidades o elimine los materiales no necesarios.`
      );
      return;
    }

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
    (m) => m.material_id && !m.sinVinculo && !m.entregado,
  ).length;
  const canSubmit =
    selectedAlmacenId && validCount > 0 && !submitting && !hasSinVinculo;

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
                    const baseDisponible = selectedAlmacenId
                      ? lookupFromMap(stockMap, matId, m.codigo?.toString())
                      : null;
                    const stockDisponible = baseDisponible !== null
                      ? baseDisponible + (clientReservaMapRef.current.get(matId) ?? 0)
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
              {!trabajadoresLoading && trabajadores.length === 0 ? (
                <p className="text-xs text-gray-500">
                  No hay trabajadores disponibles.
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
