import { useState, useEffect, useCallback, useMemo } from "react";
import { LeadService } from "@/lib/api-services";
import { apiRequest } from "@/lib/api-config";
import type {
  Lead,
  LeadCreateData,
  LeadUpdateData,
  LeadConversionRequest,
  Cliente,
} from "@/lib/api-types";

type OfertasFilter = "" | "con_ofertas" | "sin_ofertas" | "confirmadas" | "pendientes";

interface LeadFilters {
  searchTerm: string;
  estado: string[];
  fuente: string;
  comercial: string;
  provincia: string[];
  municipio: string[];
  ofertas: OfertasFilter;
  fechaDesde: string;
  fechaHasta: string;
  skip: number;
  limit: number;
  /** Si es true, incluye leads anulados junto a los activos (por defecto solo se ven los activos). */
  mostrarAnulados: boolean;
}

interface UseLeadsReturn {
  leads: Lead[];
  availableSources: string[];
  availableComerciales: string[];
  availableProvincias: string[];
  availableMunicipios: string[];
  ensureComercialesCargados: () => Promise<void>;
  filters: LeadFilters;
  initialLoading: boolean;
  loading: boolean;
  error: string | null;
  totalLeads: number;
  skip: number;
  limit: number;
  page: number;
  pageSize: number;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  setFilters: (arg: Partial<LeadFilters> | ((prev: LeadFilters) => Partial<LeadFilters>)) => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  loadLeads: (overrideFilters?: Partial<LeadFilters>) => Promise<void>;
  getAllFilteredLeadsForExport: () => Promise<Lead[]>;
  createLead: (data: LeadCreateData) => Promise<boolean>;
  updateLead: (id: string, data: LeadUpdateData) => Promise<boolean>;
  deleteLead: (id: string) => Promise<boolean>;
  setLeadStatus: (
    id: string,
    activo: boolean,
  ) => Promise<
    | { success: true }
    | { success: false; error: { code: string; title: string; message: string; field?: string } }
  >;
  convertLead: (id: string, data: LeadConversionRequest) => Promise<Cliente>;
  generarCodigoCliente: (id: string, equipoPropio?: boolean) => Promise<string>;
  uploadLeadComprobante: (
    id: string,
    payload: { file: File; metodo_pago?: string; moneda?: string },
  ) => Promise<{
    comprobante_pago_url: string;
    metodo_pago?: string;
    moneda?: string;
  }>;
  clearError: () => void;
}

const TEMP_CODEGEN_LEAD_MARKER = "__TEMP_LEAD_GENERAR_CODIGO_CLIENTE__";

const parseLeadDate = (value?: string): Date | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    const [day, month, year] = trimmed.split("/").map(Number);
    const parsed = new Date(year, month - 1, day);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [year, month, day] = trimmed.split("-").map(Number);
    const parsed = new Date(year, month - 1, day);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const applyLeadDateRangeFilter = (
  leads: Lead[],
  fechaDesde?: string,
  fechaHasta?: string,
): Lead[] => {
  if (!fechaDesde && !fechaHasta) return leads;

  const desde = parseLeadDate(fechaDesde);
  const hasta = parseLeadDate(fechaHasta);
  if (desde) desde.setHours(0, 0, 0, 0);
  if (hasta) hasta.setHours(23, 59, 59, 999);

  return leads.filter((lead) => {
    const fechaLead = parseLeadDate(lead.fecha_contacto);
    if (!fechaLead) return false;

    if (desde && fechaLead < desde) return false;
    if (hasta && fechaLead > hasta) return false;
    return true;
  });
};

const isTemporaryCodegenLead = (lead: Lead): boolean => {
  const comentario = lead.comentario?.trim();
  if (comentario === TEMP_CODEGEN_LEAD_MARKER) return true;

  // Compatibilidad con leads temporales antiguos que no tenían marcador explícito.
  const nombre = lead.nombre?.trim().toLowerCase();
  const fuente = lead.fuente?.trim().toLowerCase();
  const estado = lead.estado?.trim().toLowerCase();

  return (
    nombre === "cliente temporal" && fuente === "sistema" && estado === "nuevo"
  );
};

export function useLeads(): UseLeadsReturn {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalLeads, setTotalLeads] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [allComerciales, setAllComerciales] = useState<string[]>([]);
  const [provinciasCatalogo, setProvinciasCatalogo] = useState<
    Array<{ codigo: string; nombre: string }>
  >([]);
  const [municipiosCatalogo, setMunicipiosCatalogo] = useState<
    Array<{ codigo: string; nombre: string }>
  >([]);
  const [filters, setFiltersState] = useState<LeadFilters>({
    searchTerm: "",
    estado: [],
    fuente: "",
    comercial: "",
    provincia: [],
    municipio: [],
    ofertas: "",
    fechaDesde: "",
    fechaHasta: "",
    skip: 0,
    limit: 20,
    mostrarAnulados: false,
  });

  // Sincronizar searchTerm con filters y resetear paginación
  const handleSetSearchTerm = useCallback((term: string) => {
    setSearchTerm(term);
    setFiltersState((prev) => ({ ...prev, searchTerm: term, skip: 0 }));
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [searchTerm]);

  const normalizeSearchValue = useCallback((value: string): string => {
    return value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }, []);

  const buildLeadSearchText = useCallback(
    (lead: Lead): string => {
      const numeroLead = (lead as Lead & { numero?: string | number }).numero;

      const fieldsToSearch = [
        lead.nombre,
        numeroLead !== undefined && numeroLead !== null
          ? String(numeroLead)
          : "",
        lead.id,
        lead.referencia,
        lead.fuente,
        lead.direccion,
        lead.provincia_montaje,
        lead.municipio,
        lead.comercial,
        lead.telefono,
      ]
        .filter((value): value is string =>
          Boolean(value && String(value).trim()),
        )
        .map((value) => value.trim());

      return normalizeSearchValue(fieldsToSearch.join(" "));
    },
    [normalizeSearchValue],
  );

  const fetchAllLeadsByBaseFilters = useCallback(
    async (baseFilters: {
      estado: string;
      fuente: string;
      comercial: string;
      fechaDesde?: string;
      fechaHasta?: string;
      activo?: boolean;
    }): Promise<Lead[]> => {
      const backendPageSize = 200;
      const maxConcurrentPages = 5;

      const fetchPage = (skip: number) =>
        LeadService.getLeads({
          estado: baseFilters.estado || undefined,
          fuente: baseFilters.fuente || undefined,
          comercial: baseFilters.comercial || undefined,
          fechaDesde: baseFilters.fechaDesde || undefined,
          fechaHasta: baseFilters.fechaHasta || undefined,
          activo: baseFilters.activo,
          skip,
          limit: backendPageSize,
        });

      const primeraPagina = await fetchPage(0);
      const total = primeraPagina.total;
      const paginas: Lead[][] = [primeraPagina.leads];

      const restanteSkips: number[] = [];
      for (let skip = backendPageSize; skip < total; skip += backendPageSize) {
        restanteSkips.push(skip);
      }

      for (let i = 0; i < restanteSkips.length; i += maxConcurrentPages) {
        const lote = restanteSkips.slice(i, i + maxConcurrentPages);
        const resultados = await Promise.all(lote.map(fetchPage));
        resultados.forEach((r) => paginas.push(r.leads));
      }

      return paginas
        .flat()
        .filter((lead) => !isTemporaryCodegenLead(lead));
    },
    [],
  );

  const matchesOfertasFilter = useCallback(
    (lead: Lead, ofertas: OfertasFilter): boolean => {
      if (!ofertas) return true;
      const oc = lead.oferta_confeccion;
      const totalOfertas = oc?.total_ofertas ?? 0;
      const totalConfirmadas = oc?.total_confirmadas ?? 0;
      const tieneEmbebidas =
        Array.isArray(lead.ofertas) &&
        lead.ofertas.some(
          (o) =>
            o.inversor_codigo ||
            o.bateria_codigo ||
            o.panel_codigo ||
            o.elementos_personalizados,
        );
      const tieneOfertas = totalOfertas > 0 || tieneEmbebidas;
      switch (ofertas) {
        case "con_ofertas":
          return tieneOfertas;
        case "sin_ofertas":
          return !tieneOfertas;
        case "confirmadas":
          return totalConfirmadas > 0;
        case "pendientes":
          return totalOfertas > 0 && totalConfirmadas === 0;
        default:
          return true;
      }
    },
    [],
  );

  const loadLeads = useCallback(
    async (overrideFilters?: Partial<LeadFilters>) => {
      setLoading(true);
      setError(null);
      try {
        const effectiveFilters = { ...filters, ...overrideFilters };
        const effectiveSearchTerm = (
          overrideFilters?.searchTerm ?? debouncedSearchTerm
        ).trim();
        const hasDateFilters = Boolean(
          effectiveFilters.fechaDesde || effectiveFilters.fechaHasta,
        );
        const estadosSeleccionados = Array.isArray(effectiveFilters.estado)
          ? effectiveFilters.estado.filter(Boolean)
          : [];
        const hasClientFilters =
          effectiveFilters.provincia.length > 0 ||
          effectiveFilters.municipio.length > 0 ||
          Boolean(effectiveFilters.ofertas) ||
          estadosSeleccionados.length > 1;

        if (hasDateFilters || hasClientFilters) {
          const allBaseLeads = await fetchAllLeadsByBaseFilters({
            estado:
              estadosSeleccionados.length === 1
                ? estadosSeleccionados[0]
                : "",
            fuente: effectiveFilters.fuente,
            comercial: effectiveFilters.comercial,
            fechaDesde: effectiveFilters.fechaDesde,
            fechaHasta: effectiveFilters.fechaHasta,
            activo: effectiveFilters.mostrarAnulados ? undefined : true,
          });

          // Filtro defensivo redundante: el backend ya filtra por fecha, pero se
          // mantiene por si el filtro combina fechas con otros criterios.
          const filteredByDate = applyLeadDateRangeFilter(
            allBaseLeads,
            effectiveFilters.fechaDesde,
            effectiveFilters.fechaHasta,
          );

          const filteredByLocation = filteredByDate.filter((lead) => {
            if (
              estadosSeleccionados.length > 1 &&
              !estadosSeleccionados.includes((lead.estado || "").trim())
            ) {
              return false;
            }
            if (
              effectiveFilters.provincia.length > 0 &&
              !effectiveFilters.provincia.includes((lead.provincia_montaje || "").trim())
            ) {
              return false;
            }
            if (
              effectiveFilters.municipio.length > 0 &&
              !effectiveFilters.municipio.includes((lead.municipio || "").trim())
            ) {
              return false;
            }
            return matchesOfertasFilter(lead, effectiveFilters.ofertas);
          });

          const filteredBySearch = effectiveSearchTerm
            ? filteredByLocation.filter((lead) =>
                buildLeadSearchText(lead).includes(
                  normalizeSearchValue(effectiveSearchTerm),
                ),
              )
            : filteredByLocation;

          const total = filteredBySearch.length;
          const skip = effectiveFilters.skip ?? 0;
          const limit = effectiveFilters.limit ?? 20;
          const end = limit > 0 ? skip + limit : undefined;
          const paged = filteredBySearch.slice(skip, end);

          setLeads(paged);
          setTotalLeads(total);

          if (
            overrideFilters?.skip !== undefined ||
            overrideFilters?.limit !== undefined
          ) {
            setFiltersState((prev) => ({ ...prev, skip, limit }));
          }

          return;
        }

        const {
          leads: fetchedLeads,
          total,
          skip,
          limit,
        } = await LeadService.getLeads({
          q: effectiveSearchTerm || undefined,
          estado:
            estadosSeleccionados.length === 1
              ? estadosSeleccionados[0]
              : undefined,
          fuente: effectiveFilters.fuente || undefined,
          comercial: effectiveFilters.comercial || undefined,
          fechaDesde: effectiveFilters.fechaDesde || undefined,
          fechaHasta: effectiveFilters.fechaHasta || undefined,
          activo: effectiveFilters.mostrarAnulados ? undefined : true,
          skip: effectiveFilters.skip,
          limit: effectiveFilters.limit,
        });

        setLeads(fetchedLeads.filter((lead) => !isTemporaryCodegenLead(lead)));
        setTotalLeads(total);

        if (
          overrideFilters?.skip !== undefined ||
          overrideFilters?.limit !== undefined
        ) {
          setFiltersState((prev) => ({ ...prev, skip, limit }));
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Error al cargar los leads",
        );
        console.error("Error loading leads:", err);
      } finally {
        setLoading(false);
        setInitialLoading(false);
      }
    },
    [
      filters,
      debouncedSearchTerm,
      fetchAllLeadsByBaseFilters,
      buildLeadSearchText,
      normalizeSearchValue,
      matchesOfertasFilter,
    ],
  );

  // Obtener fuentes únicas de los leads existentes
  const availableSources = useMemo(() => {
    const sources = leads
      .map((lead) => lead.fuente)
      .filter((fuente) => fuente && fuente.trim() !== "")
      .filter((fuente, index, self) => self.indexOf(fuente) === index) // Quitar duplicados
      .sort();

    return sources as string[];
  }, [leads]);

  // Comerciales: carga lazy con cache en sessionStorage (TTL 10 min).
  // v2: la lista ahora une el roster de instaladora con los comerciales
  // distintos ya usados en leads; se sube la versión para invalidar cachés v1.
  const COMERCIALES_CACHE_KEY = "leads_comerciales_cache_v2";
  const COMERCIALES_CACHE_TTL_MS = 10 * 60 * 1000;
  const comercialesLoadingRef = useMemo(() => ({ inFlight: false }), []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.sessionStorage.getItem(COMERCIALES_CACHE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { ts: number; data: string[] };
      if (
        parsed?.ts &&
        Date.now() - parsed.ts < COMERCIALES_CACHE_TTL_MS &&
        Array.isArray(parsed.data)
      ) {
        setAllComerciales(parsed.data);
      }
    } catch {
      // ignore cache errors
    }
  }, []);

  const ensureComercialesCargados = useCallback(async () => {
    if (comercialesLoadingRef.inFlight) return;
    if (allComerciales.length > 0) return;
    comercialesLoadingRef.inFlight = true;
    try {
      // Unimos el roster de instaladora con los comerciales distintos ya usados
      // en leads (incluye comerciales de ventas que están de apoyo). Así el de
      // apoyo aparece de forma fiable tras su primer lead, sin listar a todos.
      const [instaladoraRes, leadsRes] = await Promise.all([
        apiRequest<{ success: boolean; data: string[] }>(
          "/trabajadores/comerciales",
          { method: "GET" },
        ).catch(() => null),
        apiRequest<{ success: boolean; data: string[] }>(
          "/leads/comerciales",
          { method: "GET" },
        ).catch(() => null),
      ]);
      const instaladora = instaladoraRes?.data;
      const deLeads = leadsRes?.data;
      const set = new Set<string>();
      for (const nombre of [
        ...(Array.isArray(instaladora) ? instaladora : []),
        ...(Array.isArray(deLeads) ? deLeads : []),
      ]) {
        if (typeof nombre === "string" && nombre.trim()) {
          set.add(nombre.trim());
        }
      }
      const comerciales = Array.from(set);
      setAllComerciales(comerciales);
      if (typeof window !== "undefined") {
        try {
          window.sessionStorage.setItem(
            COMERCIALES_CACHE_KEY,
            JSON.stringify({ ts: Date.now(), data: comerciales }),
          );
        } catch {
          // ignore quota errors
        }
      }
    } catch (error) {
      console.error("Error cargando comerciales:", error);
    } finally {
      comercialesLoadingRef.inFlight = false;
    }
  }, [allComerciales.length, comercialesLoadingRef]);

  // Fusionar comerciales globales con los de la página actual (por si hay alguno
  // recién creado que aún no está en el cache de allComerciales).
  const availableComerciales = useMemo(() => {
    const set = new Set<string>(allComerciales);
    for (const lead of leads) {
      if (typeof lead.comercial === "string" && lead.comercial.trim()) {
        set.add(lead.comercial.trim());
      }
    }
    return Array.from(set).sort((a, b) =>
      a.localeCompare(b, "es", { sensitivity: "base" }),
    );
  }, [allComerciales, leads]);

  // Cargar catálogo de provincias desde el backend
  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const response = await apiRequest<{
          success: boolean;
          data: Array<{ codigo: string; nombre: string }>;
        }>("/provincias/", { method: "GET" });
        if (cancelado) return;
        if (response?.success && Array.isArray(response.data)) {
          setProvinciasCatalogo(
            [...response.data].sort((a, b) =>
              a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }),
            ),
          );
        }
      } catch (error) {
        console.error("Error cargando catálogo de provincias:", error);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, []);

  // Cargar municipios para todas las provincias seleccionadas
  useEffect(() => {
    let cancelado = false;
    if (filters.provincia.length === 0) {
      setMunicipiosCatalogo([]);
      return;
    }
    const codigos = filters.provincia
      .map((nombre) => provinciasCatalogo.find((p) => p.nombre === nombre)?.codigo)
      .filter(Boolean) as string[];
    if (codigos.length === 0) {
      setMunicipiosCatalogo([]);
      return;
    }
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
        setMunicipiosCatalogo(
          [...combined.values()].sort((a, b) =>
            a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }),
          ),
        );
      } catch (error) {
        console.error("Error cargando catálogo de municipios:", error);
        setMunicipiosCatalogo([]);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [filters.provincia, provinciasCatalogo]);

  const availableProvincias = useMemo(
    () => provinciasCatalogo.map((p) => p.nombre),
    [provinciasCatalogo],
  );

  const availableMunicipios = useMemo(
    () => municipiosCatalogo.map((m) => m.nombre),
    [municipiosCatalogo],
  );

  const setFilters = useCallback((arg: Partial<LeadFilters> | ((prev: LeadFilters) => Partial<LeadFilters>)) => {
    if (typeof arg === "function") {
      setFiltersState((prev) => {
        const newFilters = arg(prev);
        const shouldResetSkip =
          newFilters.searchTerm !== undefined ||
          newFilters.estado !== undefined ||
          newFilters.fuente !== undefined ||
          newFilters.comercial !== undefined ||
          newFilters.provincia !== undefined ||
          newFilters.municipio !== undefined ||
          newFilters.ofertas !== undefined ||
          newFilters.fechaDesde !== undefined ||
          newFilters.fechaHasta !== undefined ||
          newFilters.mostrarAnulados !== undefined;
        return {
          ...prev,
          ...newFilters,
          skip: shouldResetSkip ? 0 : (newFilters.skip ?? prev.skip),
        };
      });
      return;
    }

    const newFilters = arg;
    if (typeof newFilters.searchTerm === "string") {
      setSearchTerm(newFilters.searchTerm);
    }

    const shouldResetSkip =
      newFilters.searchTerm !== undefined ||
      newFilters.estado !== undefined ||
      newFilters.fuente !== undefined ||
      newFilters.comercial !== undefined ||
      newFilters.provincia !== undefined ||
      newFilters.municipio !== undefined ||
      newFilters.ofertas !== undefined ||
      newFilters.fechaDesde !== undefined ||
      newFilters.fechaHasta !== undefined;

    setFiltersState((prev) => {
      const next: LeadFilters = {
        ...prev,
        ...newFilters,
        skip: shouldResetSkip ? 0 : (newFilters.skip ?? prev.skip),
      };
      if (
        newFilters.provincia !== undefined &&
        newFilters.provincia !== prev.provincia &&
        newFilters.municipio === undefined
      ) {
        next.municipio = [];
      }
      return next;
    });
  }, []);

  const setPage = useCallback(
    (page: number) => {
      const newSkip = (page - 1) * filters.limit;
      setFiltersState((prev) => ({ ...prev, skip: newSkip }));
    },
    [filters.limit],
  );

  const setPageSize = useCallback((size: number) => {
    setFiltersState((prev) => ({ ...prev, limit: size, skip: 0 }));
  }, []);

  const createLead = useCallback(
    async (data: LeadCreateData): Promise<boolean> => {
      console.log("🎯 [use-leads.createLead] Iniciando proceso de creación");
      console.log("📝 [use-leads.createLead] Datos recibidos:", data);
      
      setLoading(true);
      setError(null);
      try {
        console.log("⏳ [use-leads.createLead] Llamando a LeadService.createLead...");
        await LeadService.createLead(data);
        
        console.log("🔄 [use-leads.createLead] Lead creado, recargando lista...");
        await loadLeads(); // Recargar la lista
        
        console.log("✅ [use-leads.createLead] Proceso completado exitosamente");
        return true;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Error al crear el lead";
        setError(errorMessage);
        
        console.error("❌ [use-leads.createLead] Error en el proceso:");
        console.error("  - Mensaje:", errorMessage);
        console.error("  - Error completo:", err);
        
        return false;
      } finally {
        setLoading(false);
      }
    },
    [loadLeads],
  );

  const updateLead = useCallback(
    async (id: string, data: LeadUpdateData): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        await LeadService.updateLead(id, data);
        await loadLeads(); // Recargar la lista
        return true;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Error al actualizar el lead",
        );
        console.error("Error updating lead:", err);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [loadLeads],
  );

  const deleteLead = useCallback(
    async (id: string): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        await LeadService.deleteLead(id);
        await loadLeads(); // Recargar la lista
        return true;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Error al eliminar el lead",
        );
        console.error("Error deleting lead:", err);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [loadLeads],
  );

  const setLeadStatus = useCallback(
    async (id: string, activo: boolean) => {
      setLoading(true);
      setError(null);
      try {
        const resultado = await LeadService.updateLeadStatus(id, activo);
        if (resultado.success) {
          await loadLeads();
        }
        return resultado;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Error al actualizar el estado del lead";
        setError(message);
        console.error("Error updating lead status:", err);
        return {
          success: false as const,
          error: { code: "ERROR_DESCONOCIDO", title: "Error", message },
        };
      } finally {
        setLoading(false);
      }
    },
    [loadLeads],
  );

  const convertLead = useCallback(
    async (id: string, data: LeadConversionRequest): Promise<Cliente> => {
      setLoading(true);
      setError(null);
      try {
        const cliente = await LeadService.convertLeadToCliente(id, data);
        await loadLeads();
        return cliente;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Error al convertir el lead";
        setError(message);
        console.error("Error converting lead:", err);
        throw err instanceof Error ? err : new Error(message);
      } finally {
        setLoading(false);
      }
    },
    [loadLeads],
  );

  const generarCodigoCliente = useCallback(
    async (id: string, equipoPropio?: boolean): Promise<string> => {
      setError(null);
      try {
        const codigo = await LeadService.generarCodigoCliente(id, equipoPropio);
        return codigo;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Error al generar el código de cliente";
        setError(message);
        console.error("Error generating client code:", err);
        throw err instanceof Error ? err : new Error(message);
      }
    },
    [],
  );

  const uploadLeadComprobante = useCallback(
    async (
      id: string,
      payload: { file: File; metodo_pago?: string; moneda?: string },
    ): Promise<{
      comprobante_pago_url: string;
      metodo_pago?: string;
      moneda?: string;
    }> => {
      setLoading(true);
      setError(null);
      try {
        const result = await LeadService.uploadComprobante(id, payload);
        setLeads((prev) =>
          prev.map((lead) =>
            lead.id === id
              ? {
                  ...lead,
                  comprobante_pago_url: result.comprobante_pago_url,
                  metodo_pago: result.metodo_pago ?? lead.metodo_pago,
                  moneda: result.moneda ?? lead.moneda,
                }
              : lead,
          ),
        );
        return result;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Error al subir el comprobante";
        setError(message);
        console.error("Error uploading lead comprobante:", err);
        throw err instanceof Error ? err : new Error(message);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const getAllFilteredLeadsForExport = useCallback(async (): Promise<
    Lead[]
  > => {
    const estadosSel = (filters.estado || []).filter(Boolean);
    const allBaseLeads = await fetchAllLeadsByBaseFilters({
      estado: estadosSel.length === 1 ? estadosSel[0] : "",
      fuente: filters.fuente,
      comercial: filters.comercial,
    });

    const allDateFilteredLeads = applyLeadDateRangeFilter(
      allBaseLeads,
      filters.fechaDesde,
      filters.fechaHasta,
    );

    const allLocationFiltered = allDateFilteredLeads.filter((lead) => {
      if (
        estadosSel.length > 1 &&
        !estadosSel.includes((lead.estado || "").trim())
      )
        return false;
      if (
        filters.provincia.length > 0 &&
        !filters.provincia.includes((lead.provincia_montaje || "").trim())
      )
        return false;
      if (
        filters.municipio.length > 0 &&
        !filters.municipio.includes((lead.municipio || "").trim())
      )
        return false;
      return matchesOfertasFilter(lead, filters.ofertas);
    });

    const effectiveSearchTerm = normalizeSearchValue(filters.searchTerm.trim());
    if (!effectiveSearchTerm) {
      return allLocationFiltered;
    }

    return allLocationFiltered.filter((lead) =>
      buildLeadSearchText(lead).includes(effectiveSearchTerm),
    );
  }, [
    buildLeadSearchText,
    fetchAllLeadsByBaseFilters,
    filters.comercial,
    filters.estado,
    filters.fechaDesde,
    filters.fechaHasta,
    filters.fuente,
    filters.provincia,
    filters.municipio,
    filters.ofertas,
    filters.searchTerm,
    normalizeSearchValue,
    matchesOfertasFilter,
  ]);

  // Cargar leads al montar y cuando cambien filtros (incluyendo búsqueda)
  useEffect(() => {
    loadLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.estado,
    filters.fuente,
    filters.comercial,
    filters.provincia,
    filters.municipio,
    filters.ofertas,
    filters.fechaDesde,
    filters.fechaHasta,
    filters.mostrarAnulados,
    filters.skip,
    filters.limit,
    debouncedSearchTerm,
  ]);

  const pageSize = filters.limit;
  const page = pageSize > 0 ? Math.floor(filters.skip / pageSize) + 1 : 1;

  return {
    leads,
    availableSources,
    availableComerciales,
    availableProvincias,
    availableMunicipios,
    ensureComercialesCargados,
    filters,
    initialLoading,
    loading,
    error,
    totalLeads,
    skip: filters.skip,
    limit: filters.limit,
    page,
    pageSize,
    searchTerm,
    setSearchTerm: handleSetSearchTerm,
    setFilters,
    setPage,
    setPageSize,
    loadLeads,
    getAllFilteredLeadsForExport,
    createLead,
    updateLead,
    deleteLead,
    setLeadStatus,
    convertLead,
    generarCodigoCliente,
    uploadLeadComprobante,
    clearError,
  };
}
