"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Copy,
  Download,
  Eye,
  FileText,
  ImagePlus,
  Package,
  Pencil,
  Plus,
  Save,
  Trash2,
  User,
} from "lucide-react";
import Image from "next/image";
import { ModuleHeader } from "@/components/shared/organism/module-header";
import { Button } from "@/components/shared/atom/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/shared/molecule/card";
import { Input } from "@/components/shared/molecule/input";
import { Label } from "@/components/shared/atom/label";
import { Badge } from "@/components/shared/atom/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/shared/molecule/toaster";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
import { ClienteSearchSelector } from "@/components/feats/cliente/cliente-search-selector";
import { useBrigadasTrabajadores } from "@/hooks/use-brigadas-trabajadores";
import {
  useOfertasConfeccion,
  type OfertaConfeccion,
} from "@/hooks/use-ofertas-confeccion";
import { useMaterials } from "@/hooks/use-materials";
import { useMarcas } from "@/hooks/use-marcas";
import { ClienteService } from "@/lib/services/feats/customer/cliente-service";
import { apiRequest } from "@/lib/api-config";
import type { Cliente, Trabajador } from "@/lib/api-types";
import type { Brigada } from "@/lib/types/feats/brigade/brigade-types";
import type { Material } from "@/lib/material-types";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type MaterialRow = {
  id: string;
  materialCodigo: string;
  nombre: string;
  categoria: string;
  potenciaKw: number | null;
  marca: string;
  foto: string;
  unidad: string;
  cantidadOferta: string;
  originalCantidadOferta: string;
  origen: "oferta" | "manual";
  editado: boolean;
};

type WorkOrder = {
  id: string;
  codigo: string;
  fecha: string;
  clienteId: string;
  clienteNumero: string;
  celular: string;
  cliente: string;
  direccion: string;
  ci: string;
  provincia: string;
  otorgadoA: string; // CI trabajador
  aEjecutar: string; // ID brigada
  pgdFotos: string[];
  esquemaGeneralFotos: string[];
  comunicacionFotos: string[];
  materiales: MaterialRow[];
  ofertaIdConfirmada: string;
  ofertaNumero: string;
  createdAt: string;
  updatedAt: string;
};

const nowIso = () => new Date().toISOString();

const createId = () => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `ot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const getCodeSeed = (value: number) => String(value).padStart(2, "0");

const buildDefaultCode = () => {
  const date = new Date();
  const yy = date.getFullYear();
  const mm = getCodeSeed(date.getMonth() + 1);
  const dd = getCodeSeed(date.getDate());
  const hh = getCodeSeed(date.getHours());
  const min = getCodeSeed(date.getMinutes());
  return `OT-${yy}${mm}${dd}-${hh}${min}`;
};

const normalizeClienteNumero = (value: string | null | undefined) =>
  (value ?? "")
    .toString()
    .normalize("NFKC")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

const normalizeMaterialCode = (value: string | number | null | undefined) =>
  String(value ?? "")
    .trim()
    .toUpperCase();

const parseQuantity = (value: string | number | null | undefined) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const sanitizeQuantityInput = (value: string) => {
  const clean = value.trim();
  if (!clean) return "0";
  const parsed = Number(clean);
  if (!Number.isFinite(parsed) || parsed < 0) return "0";
  return String(parsed);
};

const readPhotoArray = (raw: unknown): string[] => {
  if (Array.isArray(raw)) {
    return raw
      .map((item) => String(item || "").trim())
      .filter(
        (item) => item.startsWith("data:image/") || item.startsWith("http"),
      );
  }

  if (typeof raw === "string") {
    const value = raw.trim();
    if (value.startsWith("data:image/") || value.startsWith("http")) {
      return [value];
    }
  }

  return [];
};

const createMaterialRowFromMaterial = (
  material: Material,
  marcaNombre: string,
  cantidad: number,
  origen: "oferta" | "manual",
): MaterialRow => {
  const cantidadTexto = String(Number.isFinite(cantidad) ? cantidad : 0);
  return {
    id: createId(),
    materialCodigo: normalizeMaterialCode(material.codigo),
    nombre:
      material.nombre || material.descripcion || `Material ${material.codigo}`,
    categoria: material.categoria || "-",
    potenciaKw: material.potenciaKW ?? null,
    marca: marcaNombre || "-",
    foto: material.foto || "",
    unidad: material.um || "u",
    cantidadOferta: cantidadTexto,
    originalCantidadOferta: origen === "oferta" ? cantidadTexto : "0",
    origen,
    editado: origen === "manual",
  };
};

const createMaterialRowFromOfertaItem = (
  item: NonNullable<OfertaConfeccion["items"]>[number],
  material: Material | undefined,
  marcaNombre: string,
): MaterialRow => {
  const cantidadOferta = String(Number(item.cantidad || 0));
  return {
    id: createId(),
    materialCodigo: normalizeMaterialCode(item.material_codigo),
    nombre:
      item.descripcion ||
      material?.nombre ||
      material?.descripcion ||
      `Material ${item.material_codigo || ""}`,
    categoria: item.categoria || material?.categoria || "-",
    potenciaKw: material?.potenciaKW ?? null,
    marca: marcaNombre || "-",
    foto: material?.foto || "",
    unidad: material?.um || "u",
    cantidadOferta,
    originalCantidadOferta: cantidadOferta,
    origen: "oferta",
    editado: false,
  };
};

const normalizeMaterial = (raw: unknown): MaterialRow | null => {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;

  const cantidadLegacy =
    record.cantidadOferta ??
    record.cantidad_oferta ??
    record.entregado ??
    record.gastado ??
    0;
  const cantidadTexto = sanitizeQuantityInput(String(cantidadLegacy));

  const origenRaw = String(record.origen || "").toLowerCase();
  const origen: "oferta" | "manual" =
    origenRaw === "oferta" ? "oferta" : "manual";

  const originalRaw =
    record.originalCantidadOferta ??
    record.original_cantidad_oferta ??
    cantidadTexto;
  const originalTexto = sanitizeQuantityInput(String(originalRaw));

  const editadoRaw = record.editado;
  const editadoCalculated =
    parseQuantity(cantidadTexto) !== parseQuantity(originalTexto);

  return {
    id: String(record.id || createId()),
    materialCodigo: normalizeMaterialCode(
      String(
        record.materialCodigo ?? record.material_codigo ?? record.codigo ?? "",
      ),
    ),
    nombre: String(record.nombre ?? record.descripcion ?? ""),
    categoria: String(record.categoria ?? "-"),
    potenciaKw: Number.isFinite(Number(record.potenciaKw ?? record.potenciaKW))
      ? Number(record.potenciaKw ?? record.potenciaKW)
      : null,
    marca: String(record.marca ?? "-"),
    foto: String(record.foto ?? ""),
    unidad: String(record.unidad ?? record.um ?? "u"),
    cantidadOferta: cantidadTexto,
    originalCantidadOferta: originalTexto,
    origen,
    editado:
      typeof editadoRaw === "boolean"
        ? editadoRaw
        : origen === "manual" || editadoCalculated,
  };
};

const cloneOrder = (order: WorkOrder): WorkOrder => ({
  ...order,
  pgdFotos: [...order.pgdFotos],
  esquemaGeneralFotos: [...order.esquemaGeneralFotos],
  comunicacionFotos: [...order.comunicacionFotos],
  materiales: order.materiales.map((item) => ({ ...item })),
});

const createEmptyOrder = (): WorkOrder => {
  const now = nowIso();
  return {
    id: createId(),
    codigo: buildDefaultCode(),
    fecha: new Date().toISOString().slice(0, 10),
    clienteId: "",
    clienteNumero: "",
    celular: "",
    cliente: "",
    direccion: "",
    ci: "",
    provincia: "",
    otorgadoA: "",
    aEjecutar: "",
    pgdFotos: [],
    esquemaGeneralFotos: [],
    comunicacionFotos: [],
    materiales: [],
    ofertaIdConfirmada: "",
    ofertaNumero: "",
    createdAt: now,
    updatedAt: now,
  };
};

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
    reader.readAsDataURL(file);
  });

const fileNameSafe = (value: string) =>
  (value || "orden_trabajo")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);

const formatDateLabel = (value: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("es-ES");
};

const loadImageAsDataUrl = async (src: string): Promise<string> => {
  if (!src) return "";
  if (src.startsWith("data:image/")) return src;

  const response = await fetch(src);
  const blob = await response.blob();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("No se pudo leer la imagen"));
    reader.readAsDataURL(blob);
  });
};

const getBrigadaId = (brigada: Brigada) =>
  String(brigada.id || brigada._id || brigada.lider?.CI || "").trim();

const getBrigadaLabel = (brigada: Brigada) => {
  const liderNombre = brigada.lider?.nombre || "Sin líder";
  const integrantes = Array.isArray(brigada.integrantes)
    ? brigada.integrantes.length
    : 0;
  return `${liderNombre} (${integrantes} integrante${integrantes === 1 ? "" : "s"})`;
};

const getTrabajadorId = (trabajador: Trabajador) =>
  String(trabajador.CI || trabajador.id || "").trim();

const WORK_ORDER_ENDPOINT_LIST = "/operaciones/ordenes-trabajo/";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const unwrapResponseData = (value: unknown): unknown => {
  if (!isRecord(value)) return value;
  if ("data" in value && value.data !== undefined && value.data !== null) {
    return value.data;
  }
  return value;
};

const extractOrdersArrayFromResponse = (
  response: unknown,
): Record<string, unknown>[] => {
  const unwrapped = unwrapResponseData(response);

  if (Array.isArray(unwrapped)) {
    return unwrapped.filter(isRecord);
  }

  if (!isRecord(unwrapped)) return [];

  const candidates = [unwrapped.ordenes, unwrapped.items, unwrapped.results];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter(isRecord);
    }
  }

  if ("id" in unwrapped || "_id" in unwrapped) {
    return [unwrapped];
  }

  return [];
};

const extractApiErrorMessage = (
  response: unknown,
  fallback: string,
): string => {
  if (!isRecord(response)) return fallback;
  const candidates = [
    response.message,
    response.detail,
    response.error_message,
    response.error,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) return candidate;
  }
  return fallback;
};

const ensureApiSuccess = (response: unknown, fallbackMessage: string) => {
  if (!isRecord(response)) return;
  const httpStatus =
    typeof response._httpStatus === "number" ? response._httpStatus : null;
  if (httpStatus !== null && httpStatus >= 400) {
    const method =
      typeof response._requestMethod === "string"
        ? response._requestMethod
        : "REQUEST";
    const url =
      typeof response._requestUrl === "string" ? response._requestUrl : "";
    const reason = extractApiErrorMessage(response, fallbackMessage);
    throw new Error(
      `${reason} [HTTP ${httpStatus}${url ? ` - ${method} ${url}` : ""}]`,
    );
  }

  if (
    typeof response.detail === "string" &&
    response.success !== true &&
    response.error !== true
  ) {
    throw new Error(response.detail);
  }

  if (response.success === false || response.error === true) {
    throw new Error(extractApiErrorMessage(response, fallbackMessage));
  }
};

const buildWorkOrderDetailEndpoint = (orderId: string) =>
  `/operaciones/ordenes-trabajo/${encodeURIComponent(orderId)}`;

const mapApiMaterialToRow = (
  raw: unknown,
  materialsByCode: Map<string, Material>,
  marcasById: Map<string, string>,
): MaterialRow | null => {
  if (!isRecord(raw)) return null;

  const codigo = normalizeMaterialCode(
    String(raw.material_codigo ?? raw.materialCodigo ?? raw.codigo ?? ""),
  );
  const materialCatalogo = codigo ? materialsByCode.get(codigo) : undefined;
  const marcaCatalogo = materialCatalogo?.marca_id
    ? (marcasById.get(materialCatalogo.marca_id) ?? materialCatalogo.marca_id)
    : "-";

  const base = {
    ...raw,
    materialCodigo: codigo,
    nombre: String(
      raw.nombre ??
        raw.material_nombre ??
        raw.descripcion ??
        materialCatalogo?.nombre ??
        materialCatalogo?.descripcion ??
        "",
    ),
    categoria: String(
      raw.categoria ??
        raw.material_categoria ??
        materialCatalogo?.categoria ??
        "-",
    ),
    potenciaKw:
      raw.potencia_kw ?? raw.potenciaKw ?? materialCatalogo?.potenciaKW ?? null,
    marca: String(raw.marca ?? raw.material_marca ?? marcaCatalogo ?? "-"),
    foto: String(raw.foto ?? raw.material_foto ?? materialCatalogo?.foto ?? ""),
    unidad: String(raw.um ?? raw.unidad ?? materialCatalogo?.um ?? "u"),
    cantidadOferta: String(raw.cantidad_orden ?? raw.cantidadOferta ?? 0),
    originalCantidadOferta: String(
      raw.cantidad_original_oferta ?? raw.originalCantidadOferta ?? 0,
    ),
    origen: String(raw.origen ?? "oferta"),
    editado: Boolean(raw.editado),
  };

  return normalizeMaterial(base);
};

const mapApiOrderToWorkOrder = (
  raw: unknown,
  materialsByCode: Map<string, Material>,
  marcasById: Map<string, string>,
): WorkOrder | null => {
  if (!isRecord(raw)) return null;

  const clienteObj = isRecord(raw.cliente) ? raw.cliente : null;
  const materialesRaw = Array.isArray(raw.materiales) ? raw.materiales : [];
  const materiales = materialesRaw
    .map((item) => mapApiMaterialToRow(item, materialsByCode, marcasById))
    .filter((item): item is MaterialRow => item !== null);

  return {
    id: String(raw.id ?? raw._id ?? createId()),
    codigo: String(raw.codigo ?? buildDefaultCode()),
    fecha: String(raw.fecha ?? new Date().toISOString().slice(0, 10)),
    clienteId: String(
      raw.cliente_id ??
        raw.clienteId ??
        clienteObj?.id ??
        raw.cliente_numero ??
        "",
    ),
    clienteNumero: String(
      raw.cliente_numero ?? raw.clienteNumero ?? clienteObj?.numero ?? "",
    ),
    celular: String(
      raw.cliente_telefono ?? raw.celular ?? clienteObj?.telefono ?? "",
    ),
    cliente: String(
      raw.cliente_nombre ?? raw.clienteNombre ?? clienteObj?.nombre ?? "",
    ),
    direccion: String(
      raw.cliente_direccion ?? raw.direccion ?? clienteObj?.direccion ?? "",
    ),
    ci: String(raw.cliente_ci ?? raw.ci ?? clienteObj?.carnet_identidad ?? ""),
    provincia: String(
      raw.cliente_provincia ??
        raw.provincia ??
        clienteObj?.provincia_montaje ??
        "",
    ),
    otorgadoA: String(raw.otorgado_a_ci ?? raw.otorgadoA ?? ""),
    aEjecutar: String(raw.brigada_id ?? raw.aEjecutar ?? ""),
    pgdFotos: readPhotoArray(raw.pgd_fotos ?? raw.pgdFotos ?? raw.pgd),
    esquemaGeneralFotos: readPhotoArray(
      raw.esquema_fotos ?? raw.esquemaGeneralFotos ?? raw.esquemaGeneral,
    ),
    comunicacionFotos: readPhotoArray(
      raw.comunicacion_fotos ?? raw.comunicacionFotos ?? raw.comunicacion,
    ),
    materiales,
    ofertaIdConfirmada: String(
      raw.oferta_id_confirmada ?? raw.ofertaIdConfirmada ?? "",
    ),
    ofertaNumero: String(raw.oferta_numero ?? raw.ofertaNumero ?? ""),
    createdAt: String(raw.created_at ?? raw.createdAt ?? nowIso()),
    updatedAt: String(raw.updated_at ?? raw.updatedAt ?? nowIso()),
  };
};

export function OrdenesTrabajoOperacionesModule() {
  const { toast } = useToast();
  const [ready, setReady] = useState(false);
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [draft, setDraft] = useState<WorkOrder>(createEmptyOrder);
  const [previewOrder, setPreviewOrder] = useState<WorkOrder | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [exportingOrderId, setExportingOrderId] = useState<string | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clientesLoading, setClientesLoading] = useState(false);
  const [loadingOfertaCliente, setLoadingOfertaCliente] = useState(false);
  const [ofertaStatus, setOfertaStatus] = useState<string>("");
  const [newMaterialCode, setNewMaterialCode] = useState("");
  const [newMaterialCantidad, setNewMaterialCantidad] = useState("1");

  const {
    trabajadores,
    brigadas,
    loading: loadingAsignaciones,
  } = useBrigadasTrabajadores();
  const { obtenerOfertaPorCliente } = useOfertasConfeccion();
  const { materials } = useMaterials();
  const { marcasSimplificadas } = useMarcas();

  const materialsByCode = useMemo(() => {
    const map = new Map<string, Material>();
    materials.forEach((material) => {
      map.set(normalizeMaterialCode(material.codigo), material);
    });
    return map;
  }, [materials]);

  const marcasById = useMemo(() => {
    const map = new Map<string, string>();
    marcasSimplificadas.forEach((marca) => {
      if (marca.id) {
        map.set(marca.id, marca.nombre);
      }
    });
    return map;
  }, [marcasSimplificadas]);

  const trabajadoresById = useMemo(() => {
    const map = new Map<string, Trabajador>();
    trabajadores.forEach((trabajador) => {
      const id = getTrabajadorId(trabajador);
      if (id) map.set(id, trabajador);
    });
    return map;
  }, [trabajadores]);

  const brigadasById = useMemo(() => {
    const map = new Map<string, Brigada>();
    brigadas.forEach((brigada) => {
      const id = getBrigadaId(brigada);
      if (id) map.set(id, brigada);
    });
    return map;
  }, [brigadas]);

  const selectedCliente = useMemo(
    () =>
      clientes.find(
        (cliente) =>
          cliente.id === draft.clienteId || cliente.numero === draft.clienteId,
      ) || null,
    [clientes, draft.clienteId],
  );

  const requestWorkOrderApi = useCallback(
    async (
      method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
      options?: {
        orderId?: string;
        body?: unknown;
      },
    ) => {
      const endpoint = options?.orderId
        ? buildWorkOrderDetailEndpoint(options.orderId)
        : WORK_ORDER_ENDPOINT_LIST;

      return apiRequest<unknown>(endpoint, {
        method,
        body:
          options?.body !== undefined
            ? JSON.stringify(options.body)
            : undefined,
      });
    },
    [],
  );

  const fetchOrders = useCallback(async () => {
    try {
      const response = await requestWorkOrderApi("GET");

      ensureApiSuccess(
        response,
        "No se pudieron cargar las órdenes de trabajo.",
      );
      const records = extractOrdersArrayFromResponse(response);
      const normalized = records
        .map((record) =>
          mapApiOrderToWorkOrder(record, materialsByCode, marcasById),
        )
        .filter((order): order is WorkOrder => order !== null);
      setOrders(normalized);
    } catch (error) {
      setOrders([]);
      toast({
        title: "Error cargando órdenes",
        description:
          error instanceof Error
            ? error.message
            : "No se pudieron cargar las órdenes de trabajo.",
        variant: "destructive",
      });
    } finally {
      setReady(true);
    }
  }, [marcasById, materialsByCode, requestWorkOrderApi, toast]);

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    let cancelled = false;

    const loadClientes = async () => {
      setClientesLoading(true);
      try {
        const response = await ClienteService.getClientes({});
        if (!cancelled) {
          setClientes(response.clients || []);
        }
      } catch {
        if (!cancelled) {
          setClientes([]);
          toast({
            title: "Error cargando clientes",
            description: "No se pudieron cargar los clientes para el selector.",
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) {
          setClientesLoading(false);
        }
      }
    };

    loadClientes();

    return () => {
      cancelled = true;
    };
  }, [toast]);

  const filteredOrders = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((order) => {
      const trabajador = workersLabel(order.otorgadoA, trabajadoresById);
      const brigada = brigadaLabel(order.aEjecutar, brigadasById);
      const searchable = [
        order.codigo,
        order.cliente,
        order.clienteNumero,
        order.direccion,
        trabajador,
        brigada,
      ]
        .join(" ")
        .toLowerCase();
      return searchable.includes(q);
    });
  }, [orders, searchTerm, trabajadoresById, brigadasById]);

  const isEditing = useMemo(
    () => orders.some((order) => order.id === draft.id),
    [orders, draft.id],
  );

  const editedMaterialsCount = useMemo(
    () => draft.materiales.filter((material) => material.editado).length,
    [draft.materiales],
  );

  const updateDraft = <K extends keyof WorkOrder>(
    field: K,
    value: WorkOrder[K],
  ) => {
    setDraft((prev) => ({
      ...prev,
      [field]: value,
      updatedAt: nowIso(),
    }));
  };

  const mapOfferItemsToRows = (
    oferta: OfertaConfeccion,
    materialMap: Map<string, Material>,
    marcasMap: Map<string, string>,
  ) => {
    const items = Array.isArray(oferta.items) ? oferta.items : [];
    return items.map((item) => {
      const codigo = normalizeMaterialCode(item.material_codigo);
      const material = materialMap.get(codigo);
      const marcaNombre = material?.marca_id
        ? (marcasMap.get(material.marca_id) ?? material.marca_id)
        : "-";
      return createMaterialRowFromOfertaItem(item, material, marcaNombre);
    });
  };

  const findConfirmedOffer = (
    ofertas: OfertaConfeccion[],
    clienteNumero: string,
  ) => {
    const numeroNormalizado = normalizeClienteNumero(clienteNumero);

    const candidatas = ofertas.filter((oferta) => {
      const numeroOferta = normalizeClienteNumero(oferta.cliente_numero || "");
      const estado = String(oferta.estado || "").toLowerCase();
      const coincideCliente =
        numeroOferta === numeroNormalizado || !numeroOferta;
      const esConfirmada = estado.includes("confirmada");
      return coincideCliente && esConfirmada;
    });

    if (candidatas.length === 0) return null;

    const sorted = [...candidatas].sort((a, b) => {
      const aDate =
        Date.parse(a.fecha_actualizacion || a.fecha_creacion || "") || 0;
      const bDate =
        Date.parse(b.fecha_actualizacion || b.fecha_creacion || "") || 0;
      return bDate - aDate;
    });

    return sorted[0] || null;
  };

  const loadOfferForClient = async (cliente: Cliente) => {
    const numeroCliente = String(cliente.numero || "").trim();
    const numeroNormalizado = normalizeClienteNumero(numeroCliente);

    if (!numeroNormalizado) {
      setOfertaStatus("Selecciona un cliente válido con código.");
      updateDraft("materiales", []);
      updateDraft("ofertaIdConfirmada", "");
      updateDraft("ofertaNumero", "");
      return;
    }

    setLoadingOfertaCliente(true);
    setOfertaStatus("Buscando oferta confirmada por cliente...");

    try {
      const result = await obtenerOfertaPorCliente(numeroCliente);
      const ofertas = Array.isArray(result.ofertas) ? result.ofertas : [];
      const ofertaConfirmada = findConfirmedOffer(ofertas, numeroCliente);

      setDraft((prev) => {
        if (normalizeClienteNumero(prev.clienteNumero) !== numeroNormalizado) {
          return prev;
        }

        if (!ofertaConfirmada) {
          return {
            ...prev,
            ofertaIdConfirmada: "",
            ofertaNumero: "",
            materiales: [],
            updatedAt: nowIso(),
          };
        }

        const materiales = mapOfferItemsToRows(
          ofertaConfirmada,
          materialsByCode,
          marcasById,
        );

        return {
          ...prev,
          ofertaIdConfirmada: String(ofertaConfirmada.id || ""),
          ofertaNumero: String(ofertaConfirmada.numero_oferta || ""),
          materiales,
          updatedAt: nowIso(),
        };
      });

      if (!ofertaConfirmada) {
        setOfertaStatus("El cliente no tiene oferta confirmada por cliente.");
      } else {
        const materialesCount = Array.isArray(ofertaConfirmada.items)
          ? ofertaConfirmada.items.length
          : 0;
        const numeroOferta = ofertaConfirmada.numero_oferta
          ? ` #${ofertaConfirmada.numero_oferta}`
          : "";
        setOfertaStatus(
          `Oferta confirmada${numeroOferta} cargada (${materialesCount} materiales).`,
        );
      }
    } catch {
      setOfertaStatus(
        "No se pudieron cargar los materiales de la oferta confirmada.",
      );
      toast({
        title: "Error cargando oferta",
        description: "No se pudo consultar la oferta confirmada del cliente.",
        variant: "destructive",
      });
      setDraft((prev) => {
        if (normalizeClienteNumero(prev.clienteNumero) !== numeroNormalizado)
          return prev;
        return {
          ...prev,
          ofertaIdConfirmada: "",
          ofertaNumero: "",
          materiales: [],
          updatedAt: nowIso(),
        };
      });
    } finally {
      setLoadingOfertaCliente(false);
    }
  };

  const handleClienteChange = (clienteId: string) => {
    const cliente =
      clientes.find(
        (item) => item.id === clienteId || item.numero === clienteId,
      ) || null;

    if (!cliente) {
      setOfertaStatus("");
      setDraft((prev) => ({
        ...prev,
        clienteId: "",
        clienteNumero: "",
        cliente: "",
        celular: "",
        direccion: "",
        ci: "",
        provincia: "",
        ofertaIdConfirmada: "",
        ofertaNumero: "",
        materiales: [],
        updatedAt: nowIso(),
      }));
      return;
    }

    setDraft((prev) => ({
      ...prev,
      clienteId,
      clienteNumero: cliente.numero || "",
      cliente: cliente.nombre || "",
      celular: cliente.telefono || "",
      direccion: cliente.direccion || "",
      ci: cliente.carnet_identidad || "",
      provincia: cliente.provincia_montaje || "",
      ofertaIdConfirmada: "",
      ofertaNumero: "",
      materiales: [],
      updatedAt: nowIso(),
    }));

    void loadOfferForClient(cliente);
  };

  const updateMaterialCantidad = (materialId: string, value: string) => {
    setDraft((prev) => ({
      ...prev,
      updatedAt: nowIso(),
      materiales: prev.materiales.map((item) => {
        if (item.id !== materialId) return item;
        const cantidadOferta = sanitizeQuantityInput(value);
        const changed =
          parseQuantity(cantidadOferta) !==
          parseQuantity(item.originalCantidadOferta);
        return {
          ...item,
          cantidadOferta,
          editado: item.origen === "manual" || changed,
        };
      }),
    }));
  };

  const restoreOfferMaterial = (materialId: string) => {
    setDraft((prev) => ({
      ...prev,
      updatedAt: nowIso(),
      materiales: prev.materiales.map((item) => {
        if (item.id !== materialId || item.origen !== "oferta") return item;
        return {
          ...item,
          cantidadOferta: item.originalCantidadOferta,
          editado: false,
        };
      }),
    }));
  };

  const addManualMaterial = () => {
    const code = normalizeMaterialCode(newMaterialCode);
    if (!code) {
      toast({
        title: "Material requerido",
        description: "Selecciona un material para agregar.",
        variant: "destructive",
      });
      return;
    }

    const material = materialsByCode.get(code);
    if (!material) {
      toast({
        title: "Material no encontrado",
        description: "No se encontró el material seleccionado en catálogo.",
        variant: "destructive",
      });
      return;
    }

    const cantidad = Number(newMaterialCantidad);
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      toast({
        title: "Cantidad inválida",
        description: "La cantidad debe ser mayor que 0.",
        variant: "destructive",
      });
      return;
    }

    const marcaNombre = material.marca_id
      ? (marcasById.get(material.marca_id) ?? material.marca_id)
      : "-";

    setDraft((prev) => {
      const existing = prev.materiales.find(
        (item) => normalizeMaterialCode(item.materialCodigo) === code,
      );

      if (existing) {
        return {
          ...prev,
          updatedAt: nowIso(),
          materiales: prev.materiales.map((item) => {
            if (item.id !== existing.id) return item;
            const nuevaCantidad = parseQuantity(item.cantidadOferta) + cantidad;
            const cantidadOferta = String(nuevaCantidad);
            const changed =
              parseQuantity(cantidadOferta) !==
              parseQuantity(item.originalCantidadOferta);
            return {
              ...item,
              cantidadOferta,
              editado: item.origen === "manual" || changed,
            };
          }),
        };
      }

      return {
        ...prev,
        updatedAt: nowIso(),
        materiales: [
          ...prev.materiales,
          createMaterialRowFromMaterial(
            material,
            marcaNombre,
            cantidad,
            "manual",
          ),
        ],
      };
    });

    setNewMaterialCode("");
    setNewMaterialCantidad("1");
  };

  const removeManualMaterial = (materialId: string) => {
    setDraft((prev) => ({
      ...prev,
      updatedAt: nowIso(),
      materiales: prev.materiales.filter((item) => item.id !== materialId),
    }));
  };

  const addPhotos = async (
    field: "pgdFotos" | "esquemaGeneralFotos" | "comunicacionFotos",
    files: FileList | null,
  ) => {
    if (!files || files.length === 0) return;

    const images = Array.from(files).filter((file) =>
      file.type.startsWith("image/"),
    );
    if (images.length === 0) {
      toast({
        title: "Solo imágenes",
        description: "Debes seleccionar archivos de imagen.",
        variant: "destructive",
      });
      return;
    }

    try {
      const encoded = await Promise.all(
        images.map((file) => fileToDataUrl(file)),
      );
      setDraft((prev) => ({
        ...prev,
        [field]: [...prev[field], ...encoded],
        updatedAt: nowIso(),
      }));
    } catch {
      toast({
        title: "Error al procesar fotos",
        description: "No se pudo leer una o varias imágenes seleccionadas.",
        variant: "destructive",
      });
    }
  };

  const removePhoto = (
    field: "pgdFotos" | "esquemaGeneralFotos" | "comunicacionFotos",
    index: number,
  ) => {
    setDraft((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, idx) => idx !== index),
      updatedAt: nowIso(),
    }));
  };

  const startNewOrder = () => {
    setDraft(createEmptyOrder());
    setOfertaStatus("");
    setNewMaterialCode("");
    setNewMaterialCantidad("1");
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setDraft(createEmptyOrder());
    setOfertaStatus("");
    setNewMaterialCode("");
    setNewMaterialCantidad("1");
  };

  const handleSave = async () => {
    if (!draft.clienteId || !draft.cliente.trim()) {
      toast({
        title: "Falta el cliente",
        description: "Debes seleccionar un cliente para guardar la orden.",
        variant: "destructive",
      });
      return;
    }

    if (!draft.otorgadoA) {
      toast({
        title: "Falta trabajador",
        description: "Selecciona el trabajador en el campo Otorgado a.",
        variant: "destructive",
      });
      return;
    }

    if (!draft.clienteNumero.trim()) {
      toast({
        title: "Código de cliente requerido",
        description: "El cliente debe tener un código para crear la orden.",
        variant: "destructive",
      });
      return;
    }

    if (!draft.aEjecutar) {
      toast({
        title: "Falta brigada",
        description: "Selecciona la brigada en el campo A ejecutar por.",
        variant: "destructive",
      });
      return;
    }

    const now = nowIso();
    const normalizedCode = draft.codigo.trim() || buildDefaultCode();

    const cleanedMateriales = draft.materiales
      .filter((item) => parseQuantity(item.cantidadOferta) > 0)
      .map((item) => ({
        ...item,
        cantidadOferta: sanitizeQuantityInput(item.cantidadOferta),
      }));

    const payload = {
      codigo: normalizedCode,
      fecha: draft.fecha,
      cliente_id: draft.clienteId || undefined,
      cliente_numero: draft.clienteNumero,
      cliente_nombre: draft.cliente || undefined,
      cliente_telefono: draft.celular || undefined,
      cliente_direccion: draft.direccion || undefined,
      cliente_ci: draft.ci || undefined,
      cliente_provincia: draft.provincia || undefined,
      otorgado_a_ci: draft.otorgadoA,
      brigada_id: draft.aEjecutar,
      oferta_id_confirmada: draft.ofertaIdConfirmada || undefined,
      oferta_numero: draft.ofertaNumero || undefined,
      materiales: cleanedMateriales.map((item) => ({
        material_codigo: item.materialCodigo,
        cantidad_orden: parseQuantity(item.cantidadOferta),
        cantidad_original_oferta: parseQuantity(item.originalCantidadOferta),
        origen: item.origen,
        editado: item.editado,
      })),
      pgd_fotos: draft.pgdFotos,
      esquema_fotos: draft.esquemaGeneralFotos,
      comunicacion_fotos: draft.comunicacionFotos,
      updated_at: now,
    };

    const method = isEditing ? "PUT" : "POST";

    setSavingOrder(true);
    try {
      const response = await requestWorkOrderApi(method, {
        orderId: isEditing ? draft.id : undefined,
        body: payload,
      });
      ensureApiSuccess(
        response,
        isEditing
          ? "No se pudo actualizar la orden de trabajo."
          : "No se pudo crear la orden de trabajo.",
      );

      await fetchOrders();

      setShowForm(false);
      setDraft(createEmptyOrder());
      setOfertaStatus("");
      setNewMaterialCode("");
      setNewMaterialCantidad("1");

      toast({
        title: isEditing ? "Orden actualizada" : "Orden creada",
        description: `La orden ${normalizedCode} se guardó correctamente.`,
      });
    } catch (error) {
      toast({
        title: "Error guardando orden",
        description:
          error instanceof Error
            ? error.message
            : "No se pudo guardar la orden de trabajo.",
        variant: "destructive",
      });
    } finally {
      setSavingOrder(false);
    }
  };

  const handleDelete = async (order: WorkOrder) => {
    if (typeof window !== "undefined") {
      const accepted = window.confirm(
        `¿Eliminar la orden ${order.codigo || order.id}?`,
      );
      if (!accepted) return;
    }

    try {
      const response = await requestWorkOrderApi("DELETE", {
        orderId: order.id,
      });
      ensureApiSuccess(response, "No se pudo eliminar la orden de trabajo.");

      if (draft.id === order.id) {
        setDraft(createEmptyOrder());
        setOfertaStatus("");
        setShowForm(false);
      }

      await fetchOrders();

      toast({
        title: "Orden eliminada",
        description: "La orden de trabajo fue eliminada.",
      });
    } catch (error) {
      toast({
        title: "Error eliminando orden",
        description:
          error instanceof Error
            ? error.message
            : "No se pudo eliminar la orden de trabajo.",
        variant: "destructive",
      });
    }
  };

  const loadOrder = (order: WorkOrder) => {
    setDraft(cloneOrder(order));
    setShowForm(true);
    setOfertaStatus(
      order.ofertaNumero
        ? `Orden cargada con oferta #${order.ofertaNumero}.`
        : order.ofertaIdConfirmada
          ? "Orden cargada con oferta confirmada vinculada."
          : "Orden cargada.",
    );
  };

  const duplicateOrder = (order: WorkOrder) => {
    const now = nowIso();
    const baseCode = order.codigo.trim() || buildDefaultCode();

    const duplicated: WorkOrder = {
      ...cloneOrder(order),
      id: createId(),
      codigo: `${baseCode}-COPIA`,
      fecha: new Date().toISOString().slice(0, 10),
      createdAt: now,
      updatedAt: now,
      materiales: order.materiales.map((item) => ({
        ...item,
        id: createId(),
      })),
    };

    setDraft(duplicated);
    setShowForm(true);
    setOfertaStatus(
      "Copia cargada en formulario. Guarda para crear nueva orden.",
    );

    toast({
      title: "Orden duplicada",
      description:
        "Se creó una copia en el formulario para guardarla como nueva orden.",
    });
  };

  const exportOrderToPdf = async (order: WorkOrder) => {
    if (typeof window === "undefined") return;

    setExportingOrderId(order.id);
    try {
      const trabajador = workersLabel(order.otorgadoA, trabajadoresById);
      const brigada = brigadaLabel(order.aEjecutar, brigadasById);

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 14;
      const generatedAt = new Date().toLocaleString("es-ES", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });

      const logoCandidates = [
        `${window.location.origin}/logo%20Suncar.png`,
        `${window.location.origin}/logo Suncar.png`,
      ];

      for (const logoUrl of logoCandidates) {
        try {
          const logoBase64 = await loadImageAsDataUrl(logoUrl);
          if (logoBase64) {
            doc.addImage(
              logoBase64,
              "PNG",
              pageWidth - margin - 24,
              10,
              24,
              16,
            );
            break;
          }
        } catch {
          // Ignorar y probar siguiente ruta
        }
      }

      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.text("SUNCAR INSTALADORA", margin, 14);
      doc.setFontSize(11);
      doc.text("ORDEN DE TRABAJO", margin, 20);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Código OT: ${order.codigo || "-"}`, margin, 26);
      doc.text(`Fecha: ${formatDateLabel(order.fecha)}`, margin + 52, 26);
      doc.line(margin, 30, pageWidth - margin, 30);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("Datos del cliente", margin, 36);

      autoTable(doc, {
        startY: 38,
        theme: "grid",
        styles: {
          font: "helvetica",
          fontSize: 9,
          textColor: [0, 0, 0],
          lineColor: [0, 0, 0],
          lineWidth: 0.2,
          cellPadding: 2,
        },
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontStyle: "bold",
        },
        columnStyles: {
          0: { fontStyle: "bold", cellWidth: 34 },
          1: { cellWidth: pageWidth - margin * 2 - 34 },
        },
        body: [
          ["Nombre", order.cliente || "-"],
          ["Código", order.clienteNumero || "-"],
          ["Teléfono", order.celular || "-"],
          ["Dirección", order.direccion || "-"],
        ],
        margin: { left: margin, right: margin },
      });

      const lastInfoY = (
        doc as unknown as { lastAutoTable?: { finalY?: number } }
      ).lastAutoTable?.finalY;
      const startOrderDataY = (lastInfoY ?? 58) + 6;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("Datos de la orden", margin, startOrderDataY);

      autoTable(doc, {
        startY: startOrderDataY + 2,
        theme: "grid",
        styles: {
          font: "helvetica",
          fontSize: 9,
          textColor: [0, 0, 0],
          lineColor: [0, 0, 0],
          lineWidth: 0.2,
          cellPadding: 2,
        },
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontStyle: "bold",
        },
        columnStyles: {
          0: { fontStyle: "bold", cellWidth: 34 },
          1: { cellWidth: pageWidth - margin * 2 - 34 },
        },
        body: [
          ["Otorgado por", trabajador || "-"],
          ["Brigada asignada", brigada || "-"],
          [
            "Oferta vinculada",
            order.ofertaNumero || order.ofertaIdConfirmada || "-",
          ],
        ],
        margin: { left: margin, right: margin },
      });

      const lastOrderDataY = (
        doc as unknown as { lastAutoTable?: { finalY?: number } }
      ).lastAutoTable?.finalY;
      const startMaterialsY = (lastOrderDataY ?? startOrderDataY + 20) + 8;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("Materiales", margin, startMaterialsY - 2);

      const materialesRows =
        order.materiales.length > 0
          ? order.materiales.map((item) => [
              item.materialCodigo || "-",
              item.nombre || "-",
              item.cantidadOferta || "0",
              item.originalCantidadOferta || "0",
              item.origen || "oferta",
              item.editado ? "Sí" : "No",
            ])
          : [["-", "Sin materiales", "-", "-", "-", "-"]];

      autoTable(doc, {
        startY: startMaterialsY,
        head: [
          [
            "Código",
            "Nombre",
            "Cantidad orden",
            "Cantidad original",
            "Origen",
            "Editado",
          ],
        ],
        body: materialesRows,
        theme: "grid",
        styles: {
          font: "helvetica",
          fontSize: 8.5,
          textColor: [0, 0, 0],
          cellPadding: 2,
          lineColor: [0, 0, 0],
          lineWidth: 0.2,
          overflow: "linebreak",
        },
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontStyle: "bold",
          halign: "center",
        },
        columnStyles: {
          0: { cellWidth: 24 },
          1: { cellWidth: 74 },
          2: { cellWidth: 26, halign: "right" },
          3: { cellWidth: 28, halign: "right" },
          4: { cellWidth: 20, halign: "center" },
          5: { cellWidth: 20, halign: "center" },
        },
        margin: { left: margin, right: margin },
      });

      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i += 1) {
        doc.setPage(i);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text(`Generado: ${generatedAt}`, margin, pageHeight - 10);
        doc.text(
          `Página ${i} de ${totalPages}`,
          pageWidth - margin,
          pageHeight - 10,
          {
            align: "right",
          },
        );
      }

      const filename = `orden_trabajo_${fileNameSafe(order.codigo || order.id)}`;
      doc.save(`${filename}.pdf`);

      toast({
        title: "PDF exportado",
        description: `La orden ${order.codigo || order.id} se exportó correctamente.`,
      });
    } catch {
      toast({
        title: "Error al exportar",
        description: "No se pudo generar el PDF de la orden.",
        variant: "destructive",
      });
    } finally {
      setExportingOrderId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      <ModuleHeader
        title="Órdenes de Trabajo"
        subtitle={
          showForm
            ? "Formulario de operaciones vinculado a cliente, oferta confirmada y materiales"
            : "Listado de órdenes creadas"
        }
        badge={{
          text: "Operaciones",
          className: "bg-orange-100 text-orange-800",
        }}
        backButton={{ href: "/instalaciones", label: "Volver a Operaciones" }}
        className="bg-white shadow-sm border-b border-orange-100"
        actions={
          <>
            <Button
              variant="outline"
              className="border-orange-300 text-orange-800 hover:bg-orange-50"
              onClick={startNewOrder}
              title="Nueva orden"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nueva</span>
            </Button>
            {showForm ? (
              <>
                <Button variant="outline" onClick={closeForm} title="Cancelar">
                  Cancelar
                </Button>
                <Button
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                  onClick={handleSave}
                  title="Guardar orden"
                  disabled={savingOrder}
                >
                  <Save className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {savingOrder
                      ? "Guardando..."
                      : isEditing
                        ? "Actualizar"
                        : "Guardar"}
                  </span>
                </Button>
              </>
            ) : null}
          </>
        }
      />

      <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pb-8">
        {showForm ? (
          <div className="grid grid-cols-1 gap-6">
            <Card className="border-0 shadow-md border-l-4 border-l-orange-600">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-orange-600" />
                  Formulario de orden
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3 rounded-md border border-slate-200 bg-white p-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-slate-500" />
                    <p className="text-sm font-semibold text-slate-900">
                      Cliente
                    </p>
                  </div>

                  <ClienteSearchSelector
                    label="Buscar cliente"
                    clients={clientes}
                    value={draft.clienteId}
                    onChange={handleClienteChange}
                    loading={clientesLoading}
                  />

                  {selectedCliente && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3">
                      <div className="flex items-center justify-between gap-2 pb-2 border-b border-emerald-200">
                        <p className="text-sm font-semibold text-emerald-900">
                          Datos del cliente
                        </p>
                        {(selectedCliente.numero || selectedCliente.id) && (
                          <Badge className="bg-emerald-600 text-white hover:bg-emerald-600 text-xs">
                            #{selectedCliente.numero || selectedCliente.id}
                          </Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 pt-2 text-sm text-emerald-900">
                        <p>
                          <span className="font-semibold">Nombre:</span>{" "}
                          {selectedCliente.nombre || "--"}
                        </p>
                        <p>
                          <span className="font-semibold">CI:</span>{" "}
                          {selectedCliente.carnet_identidad || "--"}
                        </p>
                        <p>
                          <span className="font-semibold">Teléfono:</span>{" "}
                          {selectedCliente.telefono || "--"}
                        </p>
                        <p>
                          <span className="font-semibold">Provincia:</span>{" "}
                          {selectedCliente.provincia_montaje || "--"}
                        </p>
                        <p className="sm:col-span-2">
                          <span className="font-semibold">Dirección:</span>{" "}
                          {selectedCliente.direccion || "--"}
                        </p>
                      </div>
                    </div>
                  )}

                  {draft.clienteId && (
                    <div
                      className={`text-xs rounded-md px-3 py-2 border ${
                        loadingOfertaCliente
                          ? "bg-blue-50 border-blue-200 text-blue-700"
                          : ofertaStatus.includes("no") ||
                              ofertaStatus.includes("No")
                            ? "bg-amber-50 border-amber-200 text-amber-700"
                            : "bg-slate-50 border-slate-200 text-slate-700"
                      }`}
                    >
                      {loadingOfertaCliente
                        ? "Cargando oferta confirmada..."
                        : ofertaStatus || " "}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <Label htmlFor="fecha">Fecha</Label>
                    <Input
                      id="fecha"
                      type="date"
                      value={draft.fecha}
                      onChange={(event) =>
                        updateDraft("fecha", event.target.value)
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="codigo">Código</Label>
                    <Input
                      id="codigo"
                      value={draft.codigo}
                      onChange={(event) =>
                        updateDraft("codigo", event.target.value)
                      }
                      placeholder="OT-20260306-1030"
                      readOnly={isEditing}
                      className={
                        isEditing ? "bg-slate-100 cursor-not-allowed" : ""
                      }
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Otorgado a (trabajador)</Label>
                    <Select
                      value={draft.otorgadoA}
                      onValueChange={(value) => updateDraft("otorgadoA", value)}
                      disabled={loadingAsignaciones}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar trabajador" />
                      </SelectTrigger>
                      <SelectContent>
                        {trabajadores.map((trabajador) => {
                          const id = getTrabajadorId(trabajador);
                          if (!id) return null;
                          return (
                            <SelectItem key={id} value={id}>
                              {trabajador.nombre || "Sin nombre"}
                              {trabajador.CI ? ` · CI ${trabajador.CI}` : ""}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>A ejecutar por (brigada)</Label>
                  <Select
                    value={draft.aEjecutar}
                    onValueChange={(value) => updateDraft("aEjecutar", value)}
                    disabled={loadingAsignaciones}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar brigada" />
                    </SelectTrigger>
                    <SelectContent>
                      {brigadas.map((brigada) => {
                        const id = getBrigadaId(brigada);
                        if (!id) return null;
                        return (
                          <SelectItem key={id} value={id}>
                            {getBrigadaLabel(brigada)}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold text-sm sm:text-base flex items-center gap-2">
                      <Package className="h-4 w-4 text-slate-600" />
                      Materiales de la oferta confirmada
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      {editedMaterialsCount > 0 ? (
                        <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                          {editedMaterialsCount} editado
                          {editedMaterialsCount === 1 ? "" : "s"}
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                          Sin cambios
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="rounded-md border border-slate-200 p-3 bg-slate-50">
                    <p className="text-xs font-medium text-slate-700 mb-2">
                      Agregar material adicional
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_140px_auto] gap-2">
                      <div>
                        <Input
                          list="materials-catalog"
                          value={newMaterialCode}
                          onChange={(event) =>
                            setNewMaterialCode(event.target.value)
                          }
                          placeholder="Código o nombre del material"
                        />
                        <datalist id="materials-catalog">
                          {materials.map((material) => {
                            const code = normalizeMaterialCode(material.codigo);
                            const nombre =
                              material.nombre ||
                              material.descripcion ||
                              "Sin nombre";
                            return (
                              <option key={material.id} value={code}>
                                {`${code} - ${nombre}`}
                              </option>
                            );
                          })}
                        </datalist>
                      </div>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        value={newMaterialCantidad}
                        onChange={(event) =>
                          setNewMaterialCantidad(event.target.value)
                        }
                        placeholder="Cantidad"
                      />
                      <Button
                        type="button"
                        onClick={addManualMaterial}
                        className="bg-slate-800 hover:bg-slate-900"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Agregar
                      </Button>
                    </div>
                  </div>

                  {draft.materiales.length === 0 ? (
                    <div className="text-sm text-gray-500 border rounded-md p-4 bg-white">
                      No hay materiales cargados. Selecciona un cliente con
                      oferta confirmada por cliente.
                    </div>
                  ) : (
                    <div className="overflow-x-auto border rounded-md bg-white">
                      <table className="w-full min-w-[1100px] table-fixed">
                        <thead className="bg-gray-50">
                          <tr className="text-left text-xs uppercase tracking-wide text-gray-600">
                            <th className="p-2 w-[84px]">Foto</th>
                            <th className="p-2">Nombre</th>
                            <th className="p-2 w-[150px]">Código</th>
                            <th className="p-2 w-[160px]">Categoría</th>
                            <th className="p-2 w-[110px]">Potencia</th>
                            <th className="p-2 w-[140px]">Marca</th>
                            <th className="p-2 w-[150px]">Cantidad oferta</th>
                            <th className="p-2 w-[130px]">Estado</th>
                            <th className="p-2 w-[130px]">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {draft.materiales.map((row) => {
                            const isManual = row.origen === "manual";
                            return (
                              <tr
                                key={row.id}
                                className={`border-t align-top ${row.editado ? "bg-amber-50" : "hover:bg-gray-50"}`}
                              >
                                <td className="p-2">
                                  {row.foto ? (
                                    <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-50 border border-gray-200">
                                      <Image
                                        src={row.foto}
                                        alt={row.nombre}
                                        fill
                                        unoptimized
                                        className="object-contain p-1"
                                      />
                                    </div>
                                  ) : (
                                    <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center border border-amber-200">
                                      <Package className="h-5 w-5 text-amber-700" />
                                    </div>
                                  )}
                                </td>
                                <td className="p-2">
                                  <div className="text-sm font-medium text-gray-900 truncate">
                                    {row.nombre}
                                  </div>
                                </td>
                                <td className="p-2">
                                  <div className="text-sm font-semibold text-gray-900">
                                    {row.materialCodigo || "-"}
                                  </div>
                                </td>
                                <td className="p-2">
                                  <span className="text-sm text-gray-700">
                                    {row.categoria || "-"}
                                  </span>
                                </td>
                                <td className="p-2">
                                  <span className="text-sm text-gray-700">
                                    {row.potenciaKw !== null
                                      ? `${row.potenciaKw} KW`
                                      : "-"}
                                  </span>
                                </td>
                                <td className="p-2">
                                  <span className="text-sm text-gray-700">
                                    {row.marca || "-"}
                                  </span>
                                </td>
                                <td className="p-2">
                                  <Input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={row.cantidadOferta}
                                    onChange={(event) =>
                                      updateMaterialCantidad(
                                        row.id,
                                        event.target.value,
                                      )
                                    }
                                    className={`h-9 text-right ${row.editado ? "border-amber-400 bg-amber-50" : ""}`}
                                  />
                                </td>
                                <td className="p-2">
                                  {isManual ? (
                                    <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                                      Agregado
                                    </Badge>
                                  ) : row.editado ? (
                                    <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                                      Editado
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                                      Original
                                    </Badge>
                                  )}
                                </td>
                                <td className="p-2">
                                  <div className="flex items-center gap-1">
                                    {!isManual && row.editado ? (
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                          restoreOfferMaterial(row.id)
                                        }
                                        title="Restaurar"
                                      >
                                        <Pencil className="h-3.5 w-3.5 mr-1" />
                                        Restaurar
                                      </Button>
                                    ) : null}
                                    {isManual ? (
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        onClick={() =>
                                          removeManualMaterial(row.id)
                                        }
                                        className="text-red-700 border-red-300 hover:bg-red-50"
                                        title="Eliminar material"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    ) : null}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {editedMaterialsCount > 0 ? (
                    <p className="text-xs text-amber-700 font-medium">
                      ✓ Se detectaron materiales editados manualmente (cantidad
                      cambiada o material agregado).
                    </p>
                  ) : null}
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-sm sm:text-base flex items-center gap-2">
                    <ImagePlus className="h-4 w-4 text-slate-600" />
                    Evidencias fotográficas
                  </h3>

                  {[
                    { key: "pgdFotos", label: "PGD", photos: draft.pgdFotos },
                    {
                      key: "esquemaGeneralFotos",
                      label: "Esquema",
                      photos: draft.esquemaGeneralFotos,
                    },
                    {
                      key: "comunicacionFotos",
                      label: "Comunicación",
                      photos: draft.comunicacionFotos,
                    },
                  ].map((field) => (
                    <div
                      key={field.key}
                      className="rounded-md border border-slate-200 p-3 bg-white space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Label className="text-sm font-semibold">
                          {field.label}
                        </Label>
                        <Badge className="bg-slate-100 text-slate-700 border-slate-200">
                          {field.photos.length} foto
                          {field.photos.length === 1 ? "" : "s"}
                        </Badge>
                      </div>
                      <div>
                        <Input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(event) => {
                            void addPhotos(
                              field.key as
                                | "pgdFotos"
                                | "esquemaGeneralFotos"
                                | "comunicacionFotos",
                              event.target.files,
                            );
                            event.target.value = "";
                          }}
                        />
                      </div>

                      {field.photos.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                          {field.photos.map((photo, index) => (
                            <div
                              key={`${field.key}-${index}`}
                              className="relative group"
                            >
                              <Image
                                src={photo}
                                alt={`${field.label} ${index + 1}`}
                                width={320}
                                height={160}
                                unoptimized
                                className="h-24 w-full object-cover rounded-md border border-slate-200"
                              />
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="absolute top-1 right-1 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() =>
                                  removePhoto(
                                    field.key as
                                      | "pgdFotos"
                                      | "esquemaGeneralFotos"
                                      | "comunicacionFotos",
                                    index,
                                  )
                                }
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500">
                          Aún no hay fotos cargadas.
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Button
                    onClick={handleSave}
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                    disabled={savingOrder}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {savingOrder
                      ? "Guardando..."
                      : isEditing
                        ? "Actualizar orden"
                        : "Guardar orden"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => duplicateOrder(draft)}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicar
                  </Button>
                  <Button variant="outline" onClick={startNewOrder}>
                    <Plus className="h-4 w-4 mr-2" />
                    Limpiar y nueva
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {!showForm ? (
          <Card className="border-0 shadow-md border-l-4 border-l-purple-600">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-purple-600" />
                Órdenes guardadas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar por fecha, cliente, brigada u otorgado por"
              />
              {!ready ? (
                <div className="text-sm text-gray-500">Cargando órdenes...</div>
              ) : filteredOrders.length === 0 ? (
                <div className="text-sm text-gray-500">
                  {orders.length === 0
                    ? "Todavía no hay órdenes guardadas."
                    : "No hay resultados para el filtro aplicado."}
                </div>
              ) : (
                <div className="overflow-x-auto border rounded-md">
                  <table className="w-full min-w-[760px]">
                    <thead className="bg-gray-50">
                      <tr className="text-left text-xs uppercase tracking-wide text-gray-600">
                        <th className="p-2">Fecha</th>
                        <th className="p-2">Cliente</th>
                        <th className="p-2">Brigada asignada</th>
                        <th className="p-2">Otorgado por</th>
                        <th className="p-2 w-[220px]">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map((order) => {
                        const rowSelected = draft.id === order.id;
                        const trabajador = workersLabel(
                          order.otorgadoA,
                          trabajadoresById,
                        );
                        const brigada = brigadaLabel(
                          order.aEjecutar,
                          brigadasById,
                        );

                        return (
                          <tr
                            key={order.id}
                            className={`border-t ${rowSelected ? "bg-orange-50" : "hover:bg-gray-50"}`}
                          >
                            <td className="p-2">{order.fecha || "-"}</td>
                            <td className="p-2">{order.cliente || "-"}</td>
                            <td className="p-2">{brigada}</td>
                            <td className="p-2">{trabajador}</td>
                            <td className="p-2">
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => setPreviewOrder(order)}
                                  title="Ver orden"
                                >
                                  <Eye className="h-4 w-4" />
                                  <span className="sr-only">Ver orden</span>
                                </Button>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => void exportOrderToPdf(order)}
                                  title="Exportar PDF"
                                  disabled={exportingOrderId === order.id}
                                >
                                  <Download className="h-4 w-4" />
                                  <span className="sr-only">Exportar PDF</span>
                                </Button>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => loadOrder(order)}
                                  title="Editar"
                                >
                                  <Pencil className="h-4 w-4" />
                                  <span className="sr-only">Editar</span>
                                </Button>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => duplicateOrder(order)}
                                  title="Duplicar"
                                >
                                  <Copy className="h-4 w-4" />
                                  <span className="sr-only">Duplicar</span>
                                </Button>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleDelete(order)}
                                  className="text-red-700 border-red-300 hover:bg-red-50"
                                  title="Eliminar"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  <span className="sr-only">Eliminar</span>
                                </Button>
                              </div>
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
        ) : null}
      </main>

      <Dialog
        open={previewOrder !== null}
        onOpenChange={(open) => {
          if (!open) setPreviewOrder(null);
        }}
      >
        <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Ver orden de trabajo{" "}
              {previewOrder?.codigo ? `- ${previewOrder.codigo}` : ""}
            </DialogTitle>
          </DialogHeader>

          {previewOrder ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Fecha</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {previewOrder.fecha || "-"}
                  </p>
                </div>
                <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Cliente</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {previewOrder.cliente || "-"}
                  </p>
                </div>
                <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Brigada asignada</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {brigadaLabel(previewOrder.aEjecutar, brigadasById)}
                  </p>
                </div>
                <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Otorgado por</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {workersLabel(previewOrder.otorgadoA, trabajadoresById)}
                  </p>
                </div>
              </div>

              <div className="rounded-md border border-slate-200 p-3 bg-white">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <p className="text-sm font-semibold text-slate-900">
                    Materiales ({previewOrder.materiales.length})
                  </p>
                  <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                    {
                      previewOrder.materiales.filter(
                        (material) => material.editado,
                      ).length
                    }{" "}
                    editados
                  </Badge>
                </div>
                <div className="overflow-x-auto border rounded-md">
                  <table className="w-full min-w-[980px]">
                    <thead className="bg-gray-50">
                      <tr className="text-left text-xs uppercase tracking-wide text-gray-600">
                        <th className="p-2">Foto</th>
                        <th className="p-2">Nombre</th>
                        <th className="p-2">Código</th>
                        <th className="p-2">Categoría</th>
                        <th className="p-2">Potencia</th>
                        <th className="p-2">Marca</th>
                        <th className="p-2">Cantidad</th>
                        <th className="p-2">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewOrder.materiales.length > 0 ? (
                        previewOrder.materiales.map((material) => (
                          <tr key={material.id} className="border-t">
                            <td className="p-2">
                              {material.foto ? (
                                <div className="relative w-10 h-10 rounded-md overflow-hidden border border-slate-200">
                                  <Image
                                    src={material.foto}
                                    alt={material.nombre}
                                    fill
                                    unoptimized
                                    className="object-contain p-1"
                                  />
                                </div>
                              ) : (
                                <div className="w-10 h-10 rounded-md bg-slate-100 flex items-center justify-center border border-slate-200">
                                  <Package className="h-4 w-4 text-slate-500" />
                                </div>
                              )}
                            </td>
                            <td className="p-2 text-sm">
                              {material.nombre || "-"}
                            </td>
                            <td className="p-2 text-sm font-semibold">
                              {material.materialCodigo || "-"}
                            </td>
                            <td className="p-2 text-sm">
                              {material.categoria || "-"}
                            </td>
                            <td className="p-2 text-sm">
                              {material.potenciaKw !== null
                                ? `${material.potenciaKw} KW`
                                : "-"}
                            </td>
                            <td className="p-2 text-sm">
                              {material.marca || "-"}
                            </td>
                            <td className="p-2 text-sm font-semibold text-right">
                              {material.cantidadOferta || "0"}
                            </td>
                            <td className="p-2">
                              {material.origen === "manual" ? (
                                <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                                  Agregado
                                </Badge>
                              ) : material.editado ? (
                                <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                                  Editado
                                </Badge>
                              ) : (
                                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                                  Original
                                </Badge>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={8}
                            className="p-4 text-sm text-slate-500"
                          >
                            Esta orden no tiene materiales.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-md border border-slate-200 bg-white p-3">
                  <p className="text-sm font-semibold text-slate-900">PGD</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {previewOrder.pgdFotos.length} foto
                    {previewOrder.pgdFotos.length === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="rounded-md border border-slate-200 bg-white p-3">
                  <p className="text-sm font-semibold text-slate-900">
                    Esquema
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {previewOrder.esquemaGeneralFotos.length} foto
                    {previewOrder.esquemaGeneralFotos.length === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="rounded-md border border-slate-200 bg-white p-3">
                  <p className="text-sm font-semibold text-slate-900">
                    Comunicación
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {previewOrder.comunicacionFotos.length} foto
                    {previewOrder.comunicacionFotos.length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
      <Toaster />
    </div>
  );
}

const workersLabel = (
  workerId: string,
  workersById: Map<string, Trabajador>,
) => {
  const worker = workersById.get(workerId);
  if (!worker) return "-";
  return worker.CI ? `${worker.nombre} (${worker.CI})` : worker.nombre;
};

const brigadaLabel = (
  brigadaId: string,
  brigadasById: Map<string, Brigada>,
) => {
  const brigada = brigadasById.get(brigadaId);
  if (!brigada) return "-";
  return getBrigadaLabel(brigada);
};
