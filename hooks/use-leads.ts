import { useState, useEffect, useCallback, useMemo } from "react";
import { LeadService } from "@/lib/api-services";
import type {
  Lead,
  LeadCreateData,
  LeadUpdateData,
  LeadConversionRequest,
  Cliente,
} from "@/lib/api-types";

interface LeadFilters {
  searchTerm: string;
  estado: string;
  fuente: string;
  comercial: string;
  fechaDesde: string;
  fechaHasta: string;
  skip: number;
  limit: number;
}

interface UseLeadsReturn {
  leads: Lead[];
  availableSources: string[];
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
  setFilters: (filters: Partial<LeadFilters>) => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  loadLeads: (overrideFilters?: Partial<LeadFilters>) => Promise<void>;
  getAllFilteredLeadsForExport: () => Promise<Lead[]>;
  createLead: (data: LeadCreateData) => Promise<boolean>;
  updateLead: (id: string, data: LeadUpdateData) => Promise<boolean>;
  deleteLead: (id: string) => Promise<boolean>;
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
  const [filters, setFiltersState] = useState<LeadFilters>({
    searchTerm: "",
    estado: "",
    fuente: "",
    comercial: "",
    fechaDesde: "",
    fechaHasta: "",
    skip: 0,
    limit: 20,
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
      fechaDesde: string;
      fechaHasta: string;
    }): Promise<Lead[]> => {
      const allLeads: Lead[] = [];
      const backendPageSize = 200;
      let currentSkip = 0;
      let totalRegistros = 0;
      let registrosRecibidos = 0;

      do {
        const { leads: fetchedLeads, total } = await LeadService.getLeads({
          estado: baseFilters.estado || undefined,
          fuente: baseFilters.fuente || undefined,
          comercial: baseFilters.comercial || undefined,
          fechaDesde: baseFilters.fechaDesde || undefined,
          fechaHasta: baseFilters.fechaHasta || undefined,
          skip: currentSkip,
          limit: backendPageSize,
        });

        if (currentSkip === 0) {
          totalRegistros = total;
        }

        allLeads.push(
          ...fetchedLeads.filter((lead) => !isTemporaryCodegenLead(lead)),
        );
        registrosRecibidos += fetchedLeads.length;
        currentSkip += backendPageSize;

        if (fetchedLeads.length === 0) break;
      } while (registrosRecibidos < totalRegistros);

      return allLeads;
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
        const normalizedSearchTerm = normalizeSearchValue(effectiveSearchTerm);

        if (effectiveSearchTerm) {
          const allBaseLeads = await fetchAllLeadsByBaseFilters({
            estado: effectiveFilters.estado,
            fuente: effectiveFilters.fuente,
            comercial: effectiveFilters.comercial,
            fechaDesde: effectiveFilters.fechaDesde,
            fechaHasta: effectiveFilters.fechaHasta,
          });

          const filteredByGlobalSearch = allBaseLeads.filter((lead) =>
            buildLeadSearchText(lead).includes(normalizedSearchTerm),
          );

          const start = Math.max(0, effectiveFilters.skip);
          const end = start + Math.max(1, effectiveFilters.limit);
          const paginatedLeads = filteredByGlobalSearch.slice(start, end);

          setLeads(paginatedLeads);
          setTotalLeads(filteredByGlobalSearch.length);

          if (
            overrideFilters?.skip !== undefined ||
            overrideFilters?.limit !== undefined
          ) {
            setFiltersState((prev) => ({
              ...prev,
              skip: effectiveFilters.skip,
              limit: effectiveFilters.limit,
            }));
          }
        } else {
          const {
            leads: fetchedLeads,
            total,
            skip,
            limit,
          } = await LeadService.getLeads({
            estado: effectiveFilters.estado || undefined,
            fuente: effectiveFilters.fuente || undefined,
            comercial: effectiveFilters.comercial || undefined,
            fechaDesde: effectiveFilters.fechaDesde || undefined,
            fechaHasta: effectiveFilters.fechaHasta || undefined,
            skip: effectiveFilters.skip,
            limit: effectiveFilters.limit,
          });
          console.log("Backend response for leads:", {
            fetchedLeads,
            total,
            skip,
            limit,
          });
          setLeads(
            fetchedLeads.filter((lead) => !isTemporaryCodegenLead(lead)),
          );
          setTotalLeads(total);

          if (
            overrideFilters?.skip !== undefined ||
            overrideFilters?.limit !== undefined
          ) {
            setFiltersState((prev) => ({ ...prev, skip, limit }));
          }
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

  const setFilters = useCallback((newFilters: Partial<LeadFilters>) => {
    if (typeof newFilters.searchTerm === "string") {
      setSearchTerm(newFilters.searchTerm);
    }

    const shouldResetSkip =
      newFilters.searchTerm !== undefined ||
      newFilters.estado !== undefined ||
      newFilters.fuente !== undefined ||
      newFilters.comercial !== undefined ||
      newFilters.fechaDesde !== undefined ||
      newFilters.fechaHasta !== undefined;

    setFiltersState((prev) => ({
      ...prev,
      ...newFilters,
      skip: shouldResetSkip ? 0 : (newFilters.skip ?? prev.skip),
    }));
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
      setLoading(true);
      setError(null);
      try {
        await LeadService.createLead(data);
        await loadLeads(); // Recargar la lista
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al crear el lead");
        console.error("Error creating lead:", err);
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
    const allBaseLeads = await fetchAllLeadsByBaseFilters({
      estado: filters.estado,
      fuente: filters.fuente,
      comercial: filters.comercial,
      fechaDesde: filters.fechaDesde,
      fechaHasta: filters.fechaHasta,
    });

    const effectiveSearchTerm = normalizeSearchValue(filters.searchTerm.trim());
    if (!effectiveSearchTerm) {
      return allBaseLeads;
    }

    return allBaseLeads.filter((lead) =>
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
    filters.searchTerm,
    normalizeSearchValue,
  ]);

  // Cargar leads al montar y cuando cambien filtros (incluyendo búsqueda)
  useEffect(() => {
    loadLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.estado,
    filters.fuente,
    filters.comercial,
    filters.fechaDesde,
    filters.fechaHasta,
    filters.skip,
    filters.limit,
    debouncedSearchTerm,
  ]);

  const pageSize = filters.limit;
  const page = pageSize > 0 ? Math.floor(filters.skip / pageSize) + 1 : 1;

  return {
    leads,
    availableSources,
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
    convertLead,
    generarCodigoCliente,
    uploadLeadComprobante,
    clearError,
  };
}
