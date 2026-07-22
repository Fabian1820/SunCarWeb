"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/shared/atom/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  ConfirmDeleteDialog,
} from "@/components/shared/molecule/dialog";
import { User, Search, ChevronDown } from "lucide-react";
import { ClienteService } from "@/lib/api-services";
import { ClientsTable } from "@/components/feats/customer-service/clients-table";
import { PageLoader } from "@/components/shared/atom/page-loader";
import { Loader } from "@/components/shared/atom/loader";
import { useToast } from "@/hooks/use-toast";
import { useFuentesSync } from "@/hooks/use-fuentes-sync";
import { Toaster } from "@/components/shared/molecule/toaster";
import { ModuleHeader } from "@/components/shared/organism/module-header";
import { CreateClientDialog } from "@/components/feats/cliente/create-client-dialog";
import { ExportButtons } from "@/components/shared/molecule/export-buttons";
import { SmartPagination } from "@/components/shared/molecule/smart-pagination";
import { Card, CardContent } from "@/components/shared/molecule/card";
import { Input } from "@/components/shared/molecule/input";
import { Label } from "@/components/shared/atom/label";
import { Checkbox } from "@/components/shared/molecule/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/shared/molecule/popover";
import { apiRequest } from "@/lib/api-config";
import type {
  Cliente,
  ClienteCreateData,
  ClienteUpdateData,
  OfertaEmbebida,
} from "@/lib/api-types";
import type { ExportOptions } from "@/lib/export-service";
import { downloadFile } from "@/lib/utils/download-file";
import { extraerComponentesDeOfertaConfeccion } from "@/lib/utils/oferta-confeccion-items";
import { EditClientDialog } from "@/components/feats/cliente/edit-client-dialog";

type ClientesFilters = {
  searchTerm: string;
  estado: string[];
  fuente: string;
  comercial: string;
  fechaDesde: string;
  fechaHasta: string;
  mes: string;
  provincia: string[];
  municipio: string[];
  ofertas: string;
  tiempo: string;
  mostrarAnulados: boolean;
  skip: number;
  limit: number;
};

const TIEMPO_RANGES: Record<string, (dias: number) => boolean> = {
  "1_5": (d) => d >= 1 && d < 5,
  "5_10": (d) => d >= 5 && d < 10,
  "10_15": (d) => d >= 10 && d < 15,
  "15_20": (d) => d >= 15 && d < 20,
  "1mes": (d) => d >= 20 && d <= 30,
  ">1mes": (d) => d > 30,
};

const TIEMPO_LABELS: Record<string, string> = {
  "1_5": "Entre 1 y 5 días",
  "5_10": "Entre 5 y 10 días",
  "10_15": "Entre 10 y 15 días",
  "15_20": "Entre 15 y 20 días",
  "1mes": "1 mes",
  ">1mes": "Más de 1 mes",
};

const OFERTAS_FILTER_OPTIONS = [
  { value: "todas", label: "Todas las ofertas" },
  { value: "con_ofertas", label: "Con ofertas" },
  { value: "sin_ofertas", label: "Sin ofertas" },
  { value: "con_confirmadas", label: "Con ofertas confirmadas" },
  { value: "mas_1_confirmada", label: "Con más de 1 confirmada" },
  { value: "sin_confirmadas", label: "Sin ofertas confirmadas" },
];

const CLIENT_ESTADOS = [
  "Equipo instalado con éxito",
  "Esperando equipo",
  "Pendiente de instalación",
  "Instalación en Proceso",
  "Pendiente de visita",
  "Pendiente de visitarnos",
  "No interesado",
];

const LEAD_FUENTES = [
  "Página Web",
  "Instagram",
  "Facebook",
  "Directo",
  "Mensaje de Whatsapp",
  "Visita",
];

const LEAD_COMERCIALES = [
  "Enelido Alexander Calero Perez",
  "Yanet Clara Rodríguez Quintana",
  "Dashel Pinillos Zubiaur",
  "Gretel María Mojena Almenares",
];

const COMERCIALES_LEADS_CACHE_KEY = "leadsComercialesAllCache";

const getTotalConfirmadasCliente = (client: Cliente): number => {
  if (typeof client.oferta_confeccion?.total_confirmadas === "number") {
    return client.oferta_confeccion.total_confirmadas;
  }
  const raw = client as Cliente & Record<string, unknown>;
  const resumen = raw.ofertas_confeccion_resumen;
  if (Array.isArray(resumen)) {
    let total = 0;
    for (const r of resumen) {
      const tc = (r as Record<string, unknown>)?.total_confirmadas;
      if (typeof tc === "number") total += tc;
    }
    if (total > 0) return total;
  }
  if (Array.isArray(client.ofertas)) {
    return client.ofertas.filter((o: any) => o?.aprobada === true).length;
  }
  return 0;
};

const getTieneOfertasCliente = (client: Cliente): boolean => {
  if ((client.oferta_confeccion?.total_ofertas ?? 0) > 0) return true;
  return Array.isArray(client.ofertas) && client.ofertas.length > 0;
};

const getDiasDesdeCreacionCliente = (client: Cliente): number | null => {
  const fecha =
    parseClientDate(client.fecha_creacion) ??
    parseClientDate(client.created_at);
  if (!fecha) return null;
  const diff = Date.now() - fecha.getTime();
  if (Number.isNaN(diff) || diff < 0) return 0;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

const normalizeFilterValue = (value: string): string =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const parseClientDate = (value?: string): Date | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    const [day, month, year] = trimmed.split("/").map(Number);
    const parsed = new Date(year, month - 1, day);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getCodigoCliente = (client: Cliente): string => {
  const dynamicClient = client as Record<string, unknown>;
  const candidates = [
    client.numero,
    typeof dynamicClient.codigo_cliente === "string"
      ? dynamicClient.codigo_cliente
      : undefined,
    typeof dynamicClient.numero_cliente === "string"
      ? dynamicClient.numero_cliente
      : undefined,
  ];

  return (candidates
    .find((value) => typeof value === "string" && value.trim())
    ?.trim() || "") as string;
};

const getCodigoTailValue = (code: string): number => {
  const normalizedCode = code.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const digits = normalizedCode.match(/\d+/g)?.join("") ?? "";
  if (!digits) return -1;

  const tailLength =
    normalizedCode.length === 10
      ? 5
      : normalizedCode.length === 8
        ? 3
        : normalizedCode.length > 10
          ? 5
          : 3;
  const tail = digits.slice(-tailLength);
  return Number.parseInt(tail, 10) || 0;
};

const sortClientsByCodigo = (items: Cliente[]): Cliente[] => {
  return [...items].sort((a, b) => {
    const codeA = getCodigoCliente(a);
    const codeB = getCodigoCliente(b);
    const tailA = getCodigoTailValue(codeA);
    const tailB = getCodigoTailValue(codeB);

    if (tailA !== tailB) return tailB - tailA;

    return codeB.localeCompare(codeA, "es", { sensitivity: "base" });
  });
};

const normalizeSearchText = (value: string): string =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const buildClientSearchText = (client: Cliente): string => {
  const dynamicClient = client as Record<string, unknown>;
  const provinciaAlterna =
    typeof dynamicClient.provincia === "string" ? dynamicClient.provincia : "";
  const referenciaAlterna =
    typeof dynamicClient.referencia_cliente === "string"
      ? dynamicClient.referencia_cliente
      : "";

  const fields = [
    client.nombre,
    client.direccion,
    client.telefono,
    client.municipio,
    client.provincia_montaje,
    provinciaAlterna,
    client.referencia,
    referenciaAlterna,
    client.comercial,
    client.fuente,
    client.numero,
  ]
    .filter((value): value is string => Boolean(value && value.trim()))
    .map((value) => value.trim());

  return normalizeSearchText(fields.join(" "));
};

const matchesClientLocalFilters = (
  client: Cliente,
  filters: Pick<
    ClientesFilters,
    | "fechaDesde"
    | "fechaHasta"
    | "mes"
    | "provincia"
    | "municipio"
    | "ofertas"
    | "tiempo"
  >,
): boolean => {
  if (filters.provincia.length > 0) {
    if (!filters.provincia.includes((client.provincia_montaje || "").trim()))
      return false;
  }
  if (filters.municipio.length > 0) {
    if (!filters.municipio.includes((client.municipio || "").trim())) return false;
  }
  if (filters.ofertas) {
    const tieneOfertas = getTieneOfertasCliente(client);
    if (filters.ofertas === "con_ofertas" && !tieneOfertas) return false;
    if (filters.ofertas === "sin_ofertas" && tieneOfertas) return false;
    const totalConfirmadas = getTotalConfirmadasCliente(client);
    if (filters.ofertas === "con_confirmadas" && totalConfirmadas <= 0)
      return false;
    if (filters.ofertas === "mas_1_confirmada" && totalConfirmadas <= 1)
      return false;
    if (filters.ofertas === "sin_confirmadas" && totalConfirmadas > 0)
      return false;
  }
  if (filters.tiempo) {
    const dias = getDiasDesdeCreacionCliente(client);
    if (dias === null) return false;
    const matcher = TIEMPO_RANGES[filters.tiempo];
    if (!matcher || !matcher(dias)) return false;
  }
  return matchesClientDateFilters(client, filters);
};

const matchesClientDateFilters = (
  client: Cliente,
  filters: Pick<ClientesFilters, "fechaDesde" | "fechaHasta" | "mes">,
): boolean => {
  if (!filters.fechaDesde && !filters.fechaHasta && !filters.mes) return true;

  const fechaCliente =
    parseClientDate(client.fecha_creacion) ?? parseClientDate(client.created_at);
  if (!fechaCliente) return false;

  if (filters.fechaDesde || filters.fechaHasta) {
    const desde = parseClientDate(filters.fechaDesde);
    const hasta = parseClientDate(filters.fechaHasta);
    if (desde) desde.setHours(0, 0, 0, 0);
    if (hasta) hasta.setHours(23, 59, 59, 999);

    if (desde && fechaCliente < desde) return false;
    if (hasta && fechaCliente > hasta) return false;
  }

  if (filters.mes) {
    const month = Number.parseInt(filters.mes, 10);
    if (Number.isFinite(month)) {
      if (fechaCliente.getMonth() + 1 !== month) return false;
    }
  }

  return true;
};

export default function ClientesPage() {
  const searchParams = useSearchParams();
  const buscarParam = searchParams.get("buscar") ?? "";
  const editarOfertaClienteParam =
    searchParams.get("editar_oferta_cliente") ?? "";
  const crearOfertaClienteParam =
    searchParams.get("crear_oferta_cliente") ?? "";

  const [clients, setClients] = useState<Cliente[]>([]);
  const [totalClients, setTotalClients] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);


  const [isCreateClientDialogOpen, setIsCreateClientDialogOpen] =
    useState(false);
  const [clientFormLoading, setClientFormLoading] = useState(false);
  const { toast } = useToast();
  const [isEditClientDialogOpen, setIsEditClientDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Cliente | null>(null);
  const [editClientFormLoading, setEditClientFormLoading] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Cliente | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Sincronizar fuentes de clientes con localStorage
  useFuentesSync([], clients, !initialLoading);

  // Estado para capturar los filtros aplicados desde ClientsTable
  const [appliedFilters, setAppliedFilters] = useState<ClientesFilters>({
    searchTerm: buscarParam,
    estado: [] as string[],
    fuente: "",
    comercial: "",
    fechaDesde: "",
    fechaHasta: "",
    mes: "",
    provincia: [] as string[],
    municipio: [] as string[],
    ofertas: "",
    tiempo: "",
    mostrarAnulados: false,
    skip: 0,
    limit: 20,
  });
  const updateFilters = useCallback(
    (patch: Partial<Omit<ClientesFilters, "skip" | "limit">>) => {
      setAppliedFilters((prev) => ({ ...prev, ...patch, skip: 0 }));
    },
    [],
  );

  // Buscador con debounce (mismo esquema que Leads)
  const [searchInput, setSearchInput] = useState(buscarParam);
  useEffect(() => {
    const timer = setTimeout(() => {
      updateFilters({ searchTerm: searchInput });
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  // Provincias / municipios para filtros
  const [provinciasList, setProvinciasList] = useState<
    Array<{ codigo: string; nombre: string }>
  >([]);
  const [municipiosList, setMunicipiosList] = useState<
    Array<{ codigo: string; nombre: string }>
  >([]);
  const [comercialesExtra, setComercialesExtra] = useState<string[]>([]);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const response = await apiRequest<{
          success: boolean;
          data: Array<{ codigo: string; nombre: string }>;
        }>("/provincias/", { method: "GET" });
        if (!cancelado && response.success && response.data) {
          setProvinciasList(response.data);
        }
      } catch (error) {
        console.error("Error cargando provincias:", error);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, []);

  useEffect(() => {
    if (appliedFilters.provincia.length === 0) {
      setMunicipiosList([]);
      return;
    }
    const codigos = appliedFilters.provincia
      .map((nombre) => provinciasList.find((p) => p.nombre === nombre)?.codigo)
      .filter(Boolean) as string[];
    if (codigos.length === 0) {
      setMunicipiosList([]);
      return;
    }
    let cancelado = false;
    (async () => {
      try {
        const resultados = await Promise.all(
          codigos.map((codigo) =>
            apiRequest<{ success: boolean; data: Array<{ codigo: string; nombre: string }> }>(
              `/provincias/provincia/${codigo}/municipios`,
              { method: "GET" },
            ),
          ),
        );
        if (cancelado) return;
        const combined = new Map<string, { codigo: string; nombre: string }>();
        for (const r of resultados) {
          if (r?.success && Array.isArray(r.data)) {
            for (const m of r.data) combined.set(m.nombre, m);
          }
        }
        setMunicipiosList(
          [...combined.values()].sort((a, b) =>
            a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }),
          ),
        );
      } catch (error) {
        console.error("Error cargando municipios:", error);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [appliedFilters.provincia, provinciasList]);

  // Cargar comerciales lazy: solo desde caché al inicio; el endpoint se invoca cuando el usuario abre el dropdown
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const cached = sessionStorage.getItem(COMERCIALES_LEADS_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as string[];
        if (Array.isArray(parsed)) setComercialesExtra(parsed);
      }
    } catch {}
  }, []);

  const comercialesFetchedRef = useRef(false);
  const ensureComercialesCargados = useCallback(async () => {
    if (comercialesFetchedRef.current) return;
    comercialesFetchedRef.current = true;
    try {
      const response = await apiRequest<{
        success: boolean;
        data: { leads?: Array<{ comercial?: string }> };
      }>("/leads/?skip=0&limit=500", { method: "GET" });
      const leads = response?.data?.leads ?? [];
      const set = new Set<string>();
      for (const lead of leads) {
        if (lead.comercial && lead.comercial.trim())
          set.add(lead.comercial.trim());
      }
      const list = Array.from(set);
      setComercialesExtra(list);
      try {
        sessionStorage.setItem(
          COMERCIALES_LEADS_CACHE_KEY,
          JSON.stringify(list),
        );
      } catch {}
    } catch (error) {
      console.warn("No se pudo cargar comerciales de leads:", error);
      comercialesFetchedRef.current = false;
    }
  }, []);

  const availableEstados = CLIENT_ESTADOS;
  const availableFuentes = LEAD_FUENTES;
  const availableComerciales = useMemo(() => {
    const set = new Set<string>();
    LEAD_COMERCIALES.forEach((c) => set.add(c));
    comercialesExtra.forEach((c) => set.add(c));
    clients.forEach((c) => {
      if (c.comercial && c.comercial.trim()) set.add(c.comercial.trim());
    });
    return Array.from(set).sort((a, b) =>
      a.localeCompare(b, "es", { sensitivity: "base" }),
    );
  }, [comercialesExtra, clients]);

  const toggleEstado = (estado: string) => {
    setAppliedFilters((prev) => {
      const next = prev.estado.includes(estado)
        ? prev.estado.filter((value) => value !== estado)
        : [...prev.estado, estado];
      return { ...prev, estado: next, skip: 0 };
    });
  };

  const hasActiveFilters = Boolean(
    searchInput.trim() ||
      appliedFilters.estado.length > 0 ||
      appliedFilters.fuente ||
      appliedFilters.comercial ||
      appliedFilters.fechaDesde ||
      appliedFilters.fechaHasta ||
      appliedFilters.mes ||
      appliedFilters.provincia.length > 0 ||
      appliedFilters.municipio.length > 0 ||
      appliedFilters.ofertas ||
      appliedFilters.tiempo,
  );

  const handleClearFilters = () => {
    setSearchInput("");
    setAppliedFilters((prev) => ({
      ...prev,
      searchTerm: "",
      estado: [],
      fuente: "",
      comercial: "",
      fechaDesde: "",
      fechaHasta: "",
      mes: "",
      provincia: [],
      municipio: [],
      ofertas: "",
      tiempo: "",
      mostrarAnulados: false,
      skip: 0,
    }));
  };

  const setPage = useCallback(
    (page: number) => {
      const newSkip = (page - 1) * appliedFilters.limit;
      setAppliedFilters((prev) => ({ ...prev, skip: newSkip }));
    },
    [appliedFilters.limit],
  );

  const fetchAllCacheRef = useRef<{
    key: string;
    data: Cliente[];
    timestamp: number;
  } | null>(null);
  const FETCH_ALL_CACHE_TTL_MS = 60_000; // 1 minuto

  const fetchAllClientsByBaseFilters = useCallback(
    async (baseParams: {
      q?: string;
      estado?: string[];
      fuente?: string;
      comercial?: string;
      provincia?: string;
      municipio?: string;
      fechaDesde?: string;
      fechaHasta?: string;
      activo?: boolean;
    }): Promise<Cliente[]> => {
      const cacheKey = JSON.stringify({
        q: baseParams.q || "",
        estado: [...(baseParams.estado || [])].sort(),
        fuente: baseParams.fuente || "",
        comercial: baseParams.comercial || "",
        provincia: baseParams.provincia || "",
        municipio: baseParams.municipio || "",
        fechaDesde: baseParams.fechaDesde || "",
        fechaHasta: baseParams.fechaHasta || "",
        activo: baseParams.activo ?? null,
      });
      const cached = fetchAllCacheRef.current;
      if (
        cached &&
        cached.key === cacheKey &&
        Date.now() - cached.timestamp < FETCH_ALL_CACHE_TTL_MS
      ) {
        return cached.data;
      }

      const pageSize = 500;
      const allClients: Cliente[] = [];
      const seenKeys = new Set<string>();
      let nextSkip = 0;
      let safetyCounter = 0;
      let totalHint = 0;

      while (safetyCounter < 500) {
        const pageResult = await ClienteService.getClientes({
          ...baseParams,
          skip: nextSkip,
          limit: pageSize,
        });

        const pageClients = Array.isArray(pageResult.clients)
          ? pageResult.clients
          : [];
        if (pageClients.length === 0) break;

        if (totalHint === 0 && typeof pageResult.total === "number") {
          totalHint = Math.max(0, pageResult.total);
        }

        let addedInPage = 0;
        for (const client of pageClients) {
          const key = `${client.id || ""}-${client.numero || ""}-${client.nombre || ""}`;
          if (seenKeys.has(key)) continue;
          seenKeys.add(key);
          allClients.push(client);
          addedInPage += 1;
        }

        const responseSkip =
          typeof pageResult.skip === "number" ? pageResult.skip : nextSkip;
        const responseLimit =
          typeof pageResult.limit === "number" && pageResult.limit > 0
            ? pageResult.limit
            : pageClients.length;
        nextSkip = responseSkip + responseLimit;
        safetyCounter += 1;

        // Si el backend sí envía total confiable y ya lo alcanzamos.
        if (totalHint > 0 && nextSkip >= totalHint) break;

        // Evitar bucles si el backend repite la misma página.
        if (addedInPage === 0) break;

        // Si llegó una página incompleta respecto al límite real de backend.
        if (pageClients.length < responseLimit) break;
      }

      fetchAllCacheRef.current = {
        key: cacheKey,
        data: allClients,
        timestamp: Date.now(),
      };
      return allClients;
    },
    [],
  );

  const fetchClients = useCallback(
    async (overrideFilters?: Partial<ClientesFilters>) => {
      setLoading(true);
      try {
        const filters = { ...appliedFilters, ...overrideFilters };
        const searchValue = filters.searchTerm.trim();
        const normalizedEstado = Array.from(
          new Set(filters.estado.map((value) => value.trim()).filter(Boolean)),
        );
        // El backend soporta server-side: q, estado, fuente, comercial, provincia (1 valor), municipio (1 valor), fechaDesde, fechaHasta
        // Múltiples provincias/municipios y mes/ofertas/tiempo se filtran localmente
        const multiProvincia = filters.provincia.length > 1;
        const multiMunicipio = filters.municipio.length > 1;
        const hasLocalOnlyFilter = Boolean(
          filters.mes || filters.ofertas || filters.tiempo || multiProvincia || multiMunicipio,
        );

        // Pasar al backend solo si hay exactamente 1 valor (compatibilidad API)
        const serverProvincia = filters.provincia.length === 1 ? filters.provincia[0] : undefined;
        const serverMunicipio = filters.municipio.length === 1 ? filters.municipio[0] : undefined;

        const baseParams = {
          q: searchValue || undefined,
          estado: normalizedEstado.length > 0 ? normalizedEstado : undefined,
          fuente: filters.fuente || undefined,
          comercial: filters.comercial || undefined,
          provincia: serverProvincia,
          municipio: serverMunicipio,
          fechaDesde: filters.fechaDesde || undefined,
          fechaHasta: filters.fechaHasta || undefined,
          activo: filters.mostrarAnulados ? undefined : true,
        };

        if (hasLocalOnlyFilter) {
          const all = await fetchAllClientsByBaseFilters(baseParams);
          // Provincias/municipios extra (>1) se filtran localmente; si hay 1 ya lo aplicó el backend
          const localProvincia = multiProvincia ? filters.provincia : [];
          const localMunicipio = multiMunicipio ? filters.municipio : [];
          const filtered = all.filter((client) =>
            matchesClientLocalFilters(client, {
              fechaDesde: "",
              fechaHasta: "",
              mes: filters.mes,
              provincia: localProvincia,
              municipio: localMunicipio,
              ofertas: filters.ofertas,
              tiempo: filters.tiempo,
            }),
          );
          const sorted = sortClientsByCodigo(filtered);
          const page = sorted.slice(
            filters.skip,
            filters.skip + filters.limit,
          );
          setClients(page);
          setTotalClients(filtered.length);
        } else {
          const result = await ClienteService.getClientes({
            ...baseParams,
            skip: filters.skip,
            limit: filters.limit,
          });
          setClients(sortClientsByCodigo(result.clients));
          setTotalClients(result.total);
        }

        if (
          overrideFilters?.skip !== undefined ||
          overrideFilters?.limit !== undefined
        ) {
          setAppliedFilters((prev) => ({
            ...prev,
            skip: filters.skip,
            limit: filters.limit,
          }));
        }
      } finally {
        setLoading(false);
      }
    },
    [appliedFilters, fetchAllClientsByBaseFilters],
  );

  const getAllFilteredClientsForExport = useCallback(async (): Promise<
    Cliente[]
  > => {
    const searchValue = appliedFilters.searchTerm.trim();
    const normalizedEstado = Array.from(
      new Set(
        appliedFilters.estado.map((value) => value.trim()).filter(Boolean),
      ),
    );

    const exportProvincia = appliedFilters.provincia.length === 1 ? appliedFilters.provincia[0] : undefined;
    const exportMunicipio = appliedFilters.municipio.length === 1 ? appliedFilters.municipio[0] : undefined;

    const result = await fetchAllClientsByBaseFilters({
      q: searchValue || undefined,
      estado: normalizedEstado.length > 0 ? normalizedEstado : undefined,
      fuente: appliedFilters.fuente || undefined,
      comercial: appliedFilters.comercial || undefined,
      provincia: exportProvincia,
      municipio: exportMunicipio,
      fechaDesde: appliedFilters.fechaDesde || undefined,
      fechaHasta: appliedFilters.fechaHasta || undefined,
    });

    const localProvinciaExport = appliedFilters.provincia.length > 1 ? appliedFilters.provincia : [];
    const localMunicipioExport = appliedFilters.municipio.length > 1 ? appliedFilters.municipio : [];

    const filtered = result.filter((client) =>
      matchesClientLocalFilters(client, {
        fechaDesde: "",
        fechaHasta: "",
        mes: appliedFilters.mes,
        provincia: localProvinciaExport,
        municipio: localMunicipioExport,
        ofertas: appliedFilters.ofertas,
        tiempo: appliedFilters.tiempo,
      }),
    );

    return sortClientsByCodigo(filtered);
  }, [appliedFilters, fetchAllClientsByBaseFilters]);

  // Cargar datos iniciales
  const loadInitialData = async () => {
    setInitialLoading(true);
    try {
      await fetchClients();
    } catch (error: unknown) {
      console.error("Error cargando datos iniciales:", error);
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (initialLoading) return;
    fetchClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    appliedFilters.searchTerm,
    appliedFilters.estado,
    appliedFilters.fuente,
    appliedFilters.comercial,
    appliedFilters.fechaDesde,
    appliedFilters.fechaHasta,
    appliedFilters.mes,
    appliedFilters.provincia,
    appliedFilters.municipio,
    appliedFilters.ofertas,
    appliedFilters.tiempo,
    appliedFilters.skip,
    appliedFilters.limit,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const refreshClients = () => {
      fetchAllCacheRef.current = null;
      fetchClients();
    };
    window.addEventListener("refreshClientsTable", refreshClients);
    return () => {
      window.removeEventListener("refreshClientsTable", refreshClients);
    };
  }, [fetchClients]);

  // Acción para editar cliente
  const handleEditClient = (client: Cliente) => {
    setEditingClient(client);
    setIsEditClientDialogOpen(true);
  };

  // Handler para actualizar cliente
  const handleUpdateClient = async (data: ClienteUpdateData) => {
    if (!editingClient) return;

    try {
      const result = await ClienteService.actualizarCliente(
        editingClient.numero,
        data,
      );
      if (!result?.success) {
        throw new Error(result?.message || "Error al actualizar el cliente");
      }
      toast({
        title: "Éxito",
        description: result.message || "Cliente actualizado correctamente",
      });
      await fetchClients();
    } catch (err: unknown) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Error al actualizar el cliente",
        variant: "destructive",
      });
      throw err;
    }
  };

  // Handler para actualizar solo la prioridad del cliente
  const handleUpdateClientPrioridad = async (
    clientId: string,
    prioridad: "Ninguna" | "Urgente" | "Alta" | "Media" | "Baja",
  ) => {
    try {
      // Buscar el cliente por su ID de MongoDB
      const cliente = clients.find((c) => c.id === clientId);
      if (!cliente) {
        throw new Error("Cliente no encontrado");
      }

      const result = await ClienteService.actualizarCliente(cliente.numero, {
        prioridad,
      });
      if (!result?.success) {
        throw new Error(result?.message || "Error al actualizar la prioridad");
      }
      await fetchClients();
      // No mostrar toast aquí, lo maneja la tabla
    } catch (err: unknown) {
      console.error("Error updating client priority:", err);
      throw err; // Re-lanzar para que la tabla maneje el error
    }
  };

  const handleCreateClient = async (data: ClienteCreateData) => {
    setClientFormLoading(true);
    try {
      const dataCliente = await ClienteService.crearCliente(data);
      if (!dataCliente?.success) {
        throw new Error(dataCliente?.message || "Error al crear el cliente");
      }
      toast({
        title: "Éxito",
        description: dataCliente.message || "Cliente creado correctamente",
      });
      setIsCreateClientDialogOpen(false);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("refreshClientsTable"));
      }
    } catch (err: unknown) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Error al crear el cliente",
        variant: "destructive",
      });
    } finally {
      setClientFormLoading(false);
    }
  };

  // Acción para eliminar cliente
  const handleDeleteClient = (client: Cliente) => {
    setClientToDelete(client);
    setIsDeleteDialogOpen(true);
  };

  // Anular/reactivar cliente (soft-delete), mismo esquema que anular lead
  const handleSetClienteStatus = async (numero: string, activo: boolean) => {
    const resultado = await ClienteService.updateClienteStatus(numero, activo);
    if (resultado.success && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("refreshClientsTable"));
    }
    return resultado;
  };

  const handleUploadClientComprobante = async (
    client: Cliente,
    payload: { file: File; metodo_pago?: string; moneda?: string },
  ) => {
    try {
      const result = await ClienteService.uploadComprobante(
        client.numero,
        payload,
      );
      toast({
        title: "Comprobante actualizado",
        description: result.metodo_pago
          ? `Método: ${result.metodo_pago}${result.moneda ? ` • Moneda: ${result.moneda}` : ""}`
          : "Comprobante guardado correctamente",
      });
      await fetchClients();
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo subir el comprobante";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      throw error instanceof Error ? error : new Error(message);
    }
  };

  const handleUploadClientFoto = async (
    client: Cliente,
    payload: { file: File; tipo: "instalacion" | "averia" },
  ) => {
    try {
      await ClienteService.uploadFotoCliente(client.numero, payload);
      toast({
        title: "Archivo agregado",
        description: `Se adjuntó correctamente como ${payload.tipo}.`,
      });
      await fetchClients();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "No se pudo subir el archivo";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      throw error instanceof Error ? error : new Error(message);
    }
  };

  const handleDownloadClientComprobante = async (client: Cliente) => {
    if (!client.comprobante_pago_url) {
      toast({
        title: "Sin comprobante",
        description: "Este cliente aún no tiene un comprobante registrado.",
        variant: "destructive",
      });
      return;
    }

    try {
      await downloadFile(
        client.comprobante_pago_url,
        `comprobante-cliente-${client.numero || client.nombre || "archivo"}`,
      );
      toast({
        title: "Descarga iniciada",
        description: "Revisa tu carpeta de descargas para ver el comprobante.",
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo descargar el comprobante";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    }
  };

  // Confirmar eliminación de cliente
  const confirmDeleteClient = async () => {
    if (!clientToDelete) return;

    setDeleteLoading(true);
    try {
      const res = await ClienteService.eliminarCliente(clientToDelete.numero);
      if (!res?.success) {
        throw new Error(res?.message || "Error al eliminar el cliente");
      }
      toast({
        title: "Éxito",
        description: "Cliente eliminado correctamente",
      });
      setIsDeleteDialogOpen(false);
      setClientToDelete(null);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("refreshClientsTable"));
      }
    } catch (error: unknown) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "No se pudo eliminar el cliente",
        variant: "destructive",
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleViewClientLocation = (client: Cliente) => {
    void client;
  };

  const buildClientesExportData = (clientesToExport: Cliente[]) => {
    const tieneInstalacionEnProceso = clientesToExport.some(
      (c) => c.estado === "Instalación en Proceso",
    );

    const exportData = clientesToExport.map((client, index) => {
      let ofertaTexto = "";

      const oc = client.oferta_confeccion;
      if (oc && oc.items?.length) {
        const { inv: itemInv, bats: itemBats, pan: itemPan } = extraerComponentesDeOfertaConfeccion(oc);
        const productos: string[] = [];
        if (itemInv) productos.push(`${itemInv.cantidad}x ${itemInv.descripcion}`);
        itemBats.forEach((b) => productos.push(`${b.cantidad}x ${b.descripcion}`));
        if (itemPan) productos.push(`${itemPan.cantidad}x ${itemPan.descripcion}`);
        ofertaTexto = productos.length > 0 ? productos.join(" • ") : "";
      } else if (client.ofertas && client.ofertas.length > 0) {
        const ofertasFormateadas = client.ofertas
          .map((oferta: OfertaEmbebida) => {
            const productos: string[] = [];
            if (oferta.inversor_codigo && oferta.inversor_cantidad > 0) {
              productos.push(`${oferta.inversor_cantidad}x ${oferta.inversor_nombre || oferta.inversor_codigo}`);
            }
            if (oferta.bateria_codigo && oferta.bateria_cantidad > 0) {
              productos.push(`${oferta.bateria_cantidad}x ${oferta.bateria_nombre || oferta.bateria_codigo}`);
            }
            if (oferta.panel_codigo && oferta.panel_cantidad > 0) {
              productos.push(`${oferta.panel_cantidad}x ${oferta.panel_nombre || oferta.panel_codigo}`);
            }
            if (oferta.elementos_personalizados) {
              productos.push(oferta.elementos_personalizados);
            }
            return productos.length > 0 ? "• " + productos.join(" • ") : "";
          })
          .filter(Boolean);
        ofertaTexto = ofertasFormateadas.join(" • ") || "";
      }

      const fechaCreacion = parseClientDate(client.fecha_creacion) ?? parseClientDate(client.created_at);
      const fechaFormateada = fechaCreacion
        ? `${String(fechaCreacion.getDate()).padStart(2, "0")}/${String(fechaCreacion.getMonth() + 1).padStart(2, "0")}/${fechaCreacion.getFullYear()}`
        : "N/A";

      const baseData: Record<string, string | number> = {
        numero: index + 1,
        nombre: client.nombre || "N/A",
        telefono: client.telefono || "N/A",
        fecha_creacion: fechaFormateada,
        provincia: client.provincia_montaje || "N/A",
        municipio: client.municipio || "N/A",
        direccion: client.direccion || "N/A",
      };

      if (tieneInstalacionEnProceso) {
        baseData.falta =
          client.estado === "Instalación en Proceso"
            ? client.falta_instalacion || "No especificado"
            : "";
      }

      baseData.oferta = ofertaTexto;
      return baseData;
    });

    const columns: Array<{ header: string; key: string; width: number }> = [
      { header: "No.", key: "numero", width: 4 },
      { header: "Nombre", key: "nombre", width: 14 },
      { header: "Teléfono", key: "telefono", width: 14 },
      { header: "Fecha de Creación", key: "fecha_creacion", width: 14 },
      { header: "Provincia", key: "provincia", width: 12 },
      { header: "Municipio", key: "municipio", width: 12 },
      { header: "Dirección", key: "direccion", width: 38 },
    ];

    if (tieneInstalacionEnProceso) {
      columns.push({ header: "Falta", key: "falta", width: 20 });
    }
    columns.push({ header: "Oferta", key: "oferta", width: 23.57 });

    return { data: exportData, columns };
  };

  // Preparar opciones de exportación para clientes (siempre desde backend con filtros actuales)
  const getExportOptions = async (): Promise<
    Omit<ExportOptions, "filename">
  > => {
    // Construir título con filtro de estado si aplica
    let titulo = "Listado de Clientes";
    if (appliedFilters.estado.length === 1) {
      titulo = `Listado de Clientes - ${appliedFilters.estado[0]}`;
    } else if (appliedFilters.estado.length > 1) {
      titulo = `Listado de Clientes - ${appliedFilters.estado.length} estados`;
    }

    const allFilteredClients = await getAllFilteredClientsForExport();
    const { data, columns } = buildClientesExportData(allFilteredClients);

    return {
      title: `Suncar SRL: ${titulo}`,
      subtitle: `Fecha: ${new Date().toLocaleDateString("es-ES")}`,
      columns,
      data,
    };
  };

  // Mostrar loader mientras se cargan los datos iniciales, salvo que haya
  // un deep-link de oferta pendiente: en ese caso montamos la tabla de una
  // vez para que el fetch de la oferta arranque en paralelo con la lista
  // en vez de esperar a que la lista termine de cargar primero.
  const hasPendingOfertaDeepLink = Boolean(
    editarOfertaClienteParam || crearOfertaClienteParam,
  );
  if (initialLoading && !hasPendingOfertaDeepLink) {
    return (
      <PageLoader moduleName="Clientes" text="Cargando lista de clientes..." />
    );
  }

  const page =
    appliedFilters.limit > 0
      ? Math.floor(appliedFilters.skip / appliedFilters.limit) + 1
      : 1;
  const totalPages =
    appliedFilters.limit > 0
      ? Math.ceil(totalClients / appliedFilters.limit)
      : 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f4f9f6] via-white to-[#e8f4ee]">
      <ModuleHeader
        title="Gestión de Clientes"
        subtitle="Visualiza y administra clientes"
        badge={{ text: "Servicio", className: "bg-emerald-100 text-emerald-800" }}
        className="bg-white shadow-sm border-b border-emerald-100"
        actions={
          totalClients > 0 ? (
            <ExportButtons
              getExportOptions={getExportOptions}
              baseFilename="clientes"
              variant="compact"
            />
          ) : undefined
        }
      />
      <main className="content-with-fixed-header max-w-[96rem] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pb-8">
        <div className="space-y-4">
          {/* Búsqueda y filtros */}
          <Card className="border-l-4 border-l-emerald-600">
            <CardContent className="p-4 sm:p-6">
              <div className="flex gap-3 mb-4 flex-col sm:flex-row">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="search-client"
                    placeholder="Buscar por cualquier dato..."
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    className="pl-10"
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-700 whitespace-nowrap px-1">
                  <Checkbox
                    checked={appliedFilters.mostrarAnulados}
                    onCheckedChange={(checked) =>
                      updateFilters({ mostrarAnulados: checked === true })
                    }
                  />
                  Mostrar anulados
                </label>
                <Button
                  variant="outline"
                  onClick={handleClearFilters}
                  className="text-gray-600 hover:text-gray-800 whitespace-nowrap"
                  disabled={!hasActiveFilters}
                >
                  Limpiar Filtros
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-between">
                        <span className="truncate">
                          {appliedFilters.estado.length > 0
                            ? `${appliedFilters.estado.length} estado${appliedFilters.estado.length > 1 ? "s" : ""}`
                            : "Todos los estados"}
                        </span>
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-72">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm text-gray-700">Estado</Label>
                        {appliedFilters.estado.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => updateFilters({ estado: [] })}
                          >
                            Limpiar
                          </Button>
                        )}
                      </div>
                      <div className="space-y-2 max-h-52 overflow-y-auto">
                        {availableEstados.map((estado) => (
                          <label
                            key={estado}
                            className="flex items-center gap-2 text-sm text-gray-700"
                          >
                            <Checkbox
                              checked={appliedFilters.estado.includes(estado)}
                              onCheckedChange={() => toggleEstado(estado)}
                            />
                            <span>{estado}</span>
                          </label>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Select
                    value={appliedFilters.fuente || "todas"}
                    onValueChange={(value) =>
                      updateFilters({ fuente: value === "todas" ? "" : value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todas las fuentes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas las fuentes</SelectItem>
                      {availableFuentes.map((fuente) => (
                        <SelectItem key={fuente} value={fuente}>
                          {fuente}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Select
                    value={appliedFilters.comercial || "todos"}
                    onValueChange={(value) =>
                      updateFilters({ comercial: value === "todos" ? "" : value })
                    }
                    onOpenChange={(open) => {
                      if (open) void ensureComercialesCargados();
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos los comerciales" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos los comerciales</SelectItem>
                      {availableComerciales.map((comercial) => (
                        <SelectItem key={comercial} value={comercial}>
                          {comercial}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Input
                    type="date"
                    value={appliedFilters.fechaDesde}
                    onChange={(event) =>
                      updateFilters({ fechaDesde: event.target.value })
                    }
                    placeholder="Fecha desde"
                  />
                </div>

                <div>
                  <Input
                    type="date"
                    value={appliedFilters.fechaHasta}
                    onChange={(event) =>
                      updateFilters({ fechaHasta: event.target.value })
                    }
                    placeholder="Fecha hasta"
                  />
                </div>

                <div>
                  <Select
                    value={appliedFilters.mes || "todos"}
                    onValueChange={(value) =>
                      updateFilters({ mes: value === "todos" ? "" : value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos los meses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos los meses</SelectItem>
                      <SelectItem value="1">Enero</SelectItem>
                      <SelectItem value="2">Febrero</SelectItem>
                      <SelectItem value="3">Marzo</SelectItem>
                      <SelectItem value="4">Abril</SelectItem>
                      <SelectItem value="5">Mayo</SelectItem>
                      <SelectItem value="6">Junio</SelectItem>
                      <SelectItem value="7">Julio</SelectItem>
                      <SelectItem value="8">Agosto</SelectItem>
                      <SelectItem value="9">Septiembre</SelectItem>
                      <SelectItem value="10">Octubre</SelectItem>
                      <SelectItem value="11">Noviembre</SelectItem>
                      <SelectItem value="12">Diciembre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-between">
                        <span className="truncate">
                          {appliedFilters.provincia.length > 0
                            ? `${appliedFilters.provincia.length} provincia${appliedFilters.provincia.length > 1 ? "s" : ""}`
                            : "Todas las provincias"}
                        </span>
                        <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-72">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm text-gray-700">Provincia</Label>
                        {appliedFilters.provincia.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() =>
                              updateFilters({ provincia: [], municipio: [] })
                            }
                          >
                            Limpiar
                          </Button>
                        )}
                      </div>
                      <div className="space-y-2 max-h-52 overflow-y-auto">
                        {provinciasList.map((p) => (
                          <label
                            key={p.codigo}
                            className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"
                          >
                            <Checkbox
                              checked={appliedFilters.provincia.includes(p.nombre)}
                              onCheckedChange={() => {
                                setAppliedFilters((prev) => {
                                  const next = prev.provincia.includes(p.nombre)
                                    ? prev.provincia.filter((x) => x !== p.nombre)
                                    : [...prev.provincia, p.nombre];
                                  return {
                                    ...prev,
                                    provincia: next,
                                    municipio: [],
                                    skip: 0,
                                  };
                                });
                              }}
                            />
                            <span>{p.nombre}</span>
                          </label>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-between"
                        disabled={appliedFilters.provincia.length === 0}
                      >
                        <span className="truncate">
                          {appliedFilters.municipio.length > 0
                            ? `${appliedFilters.municipio.length} municipio${appliedFilters.municipio.length > 1 ? "s" : ""}`
                            : appliedFilters.provincia.length > 0
                              ? "Todos los municipios"
                              : "Selecciona provincia"}
                        </span>
                        <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-72">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm text-gray-700">Municipio</Label>
                        {appliedFilters.municipio.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => updateFilters({ municipio: [] })}
                          >
                            Limpiar
                          </Button>
                        )}
                      </div>
                      <div className="space-y-2 max-h-52 overflow-y-auto">
                        {municipiosList.map((m) => (
                          <label
                            key={m.codigo}
                            className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"
                          >
                            <Checkbox
                              checked={appliedFilters.municipio.includes(m.nombre)}
                              onCheckedChange={() => {
                                setAppliedFilters((prev) => {
                                  const next = prev.municipio.includes(m.nombre)
                                    ? prev.municipio.filter((x) => x !== m.nombre)
                                    : [...prev.municipio, m.nombre];
                                  return { ...prev, municipio: next, skip: 0 };
                                });
                              }}
                            />
                            <span>{m.nombre}</span>
                          </label>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Select
                    value={appliedFilters.ofertas || "todas"}
                    onValueChange={(value) =>
                      updateFilters({ ofertas: value === "todas" ? "" : value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todas las ofertas" />
                    </SelectTrigger>
                    <SelectContent>
                      {OFERTAS_FILTER_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Select
                    value={appliedFilters.tiempo || "todos"}
                    onValueChange={(value) =>
                      updateFilters({ tiempo: value === "todos" ? "" : value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tiempo desde creación" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Cualquier tiempo</SelectItem>
                      {Object.entries(TIEMPO_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabla de clientes */}
          <div className="relative min-h-[16rem]">
            {loading && clients.length > 0 && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/80 backdrop-blur-sm">
                <Loader label="Aplicando filtros..." />
              </div>
            )}

            {loading && clients.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <Loader label="Cargando clientes..." />
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-500">
                  {totalClients} {totalClients === 1 ? "cliente" : "clientes"}
                </p>
                <ClientsTable
                  clients={clients}
                  totalClients={totalClients}
                  onEdit={handleEditClient}
                  onDelete={handleDeleteClient}
                  onSetClienteStatus={handleSetClienteStatus}
                  onViewLocation={handleViewClientLocation}
                  onUploadFotos={handleUploadClientFoto}
                  onUpdatePrioridad={handleUpdateClientPrioridad}
                  loading={loading || initialLoading}
                  autoOpenEditarOfertaClienteNumero={editarOfertaClienteParam || undefined}
                  autoOpenCrearOfertaClienteNumero={crearOfertaClienteParam || undefined}
                />
              </div>
            )}
          </div>
          {totalClients > appliedFilters.limit && appliedFilters.limit > 0 && (
            <SmartPagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          )}
        </div>
        {/* Modal de creacion de cliente */}
        <Dialog
          open={isCreateClientDialogOpen}
          onOpenChange={setIsCreateClientDialogOpen}
        >
          <DialogContent className="max-w-xl max-h-[85vh] overflow-hidden p-0 gap-0 flex flex-col">
            <DialogHeader className="shrink-0 border-b border-gray-100 px-5 py-4">
              <DialogTitle className="text-base font-semibold text-gray-900">
                Crear nuevo cliente
              </DialogTitle>
            </DialogHeader>
            <CreateClientDialog
              onSubmit={handleCreateClient}
              onCancel={() => setIsCreateClientDialogOpen(false)}
              isLoading={clientFormLoading}
            />
          </DialogContent>
        </Dialog>
        {/* Modal de edición de cliente */}
        {editingClient && (
          <EditClientDialog
            open={isEditClientDialogOpen}
            onOpenChange={(open) => {
              setIsEditClientDialogOpen(open);
              if (!open) setEditingClient(null);
            }}
            client={editingClient}
            onSubmit={handleUpdateClient}
            isLoading={editClientFormLoading}
          />
        )}

        {/* Modal de confirmación de eliminación */}
        <ConfirmDeleteDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          title="Eliminar Cliente"
          message={`¿Estás seguro de que quieres eliminar al cliente ${clientToDelete?.nombre}? Esta acción no se puede deshacer.`}
          onConfirm={confirmDeleteClient}
          confirmText="Eliminar Cliente"
          isLoading={deleteLoading}
        />
      </main>
      <Toaster />
    </div>
  );
}
