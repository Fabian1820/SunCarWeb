import { useCallback, useEffect, useMemo, useState } from "react";
import { SolicitudEntradaAlmacenService } from "@/lib/api-services";
import type {
  AprobarSolicitudRequest,
  DenegarSolicitudRequest,
  EstadoSolicitudEntrada,
  SolicitudEntradaAlmacen,
  SolicitudEntradaAlmacenCreateData,
} from "@/lib/types/feats/solicitudes-entrada-almacen/solicitud-entrada-almacen-types";

interface UseSolicitudesEntradaAlmacenReturn {
  solicitudes: SolicitudEntradaAlmacen[];
  filteredSolicitudes: SolicitudEntradaAlmacen[];
  loading: boolean;
  creating: boolean;
  resolving: boolean;
  error: string | null;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  estadoFilter: "todos" | EstadoSolicitudEntrada;
  setEstadoFilter: (value: "todos" | EstadoSolicitudEntrada) => void;
  almacenFilter: string;
  setAlmacenFilter: (value: string) => void;
  compraFilter: string;
  setCompraFilter: (value: string) => void;
  loadSolicitudes: () => Promise<void>;
  createSolicitud: (data: SolicitudEntradaAlmacenCreateData) => Promise<SolicitudEntradaAlmacen>;
  aprobarSolicitud: (id: string, payload?: AprobarSolicitudRequest) => Promise<SolicitudEntradaAlmacen>;
  denegarSolicitud: (id: string, payload: DenegarSolicitudRequest) => Promise<SolicitudEntradaAlmacen>;
  clearError: () => void;
}

export function useSolicitudesEntradaAlmacen(): UseSolicitudesEntradaAlmacenReturn {
  const [solicitudes, setSolicitudes] = useState<SolicitudEntradaAlmacen[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [estadoFilter, setEstadoFilter] = useState<"todos" | EstadoSolicitudEntrada>("todos");
  const [almacenFilter, setAlmacenFilter] = useState<string>("todos");
  const [compraFilter, setCompraFilter] = useState<string>("todos");

  const loadSolicitudes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await SolicitudEntradaAlmacenService.getSolicitudes();
      setSolicitudes(
        [...data].sort((a, b) => {
          const dateA = new Date(a.fecha_creacion || 0).getTime();
          const dateB = new Date(b.fecha_creacion || 0).getTime();
          return dateB - dateA;
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar las solicitudes");
      setSolicitudes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSolicitudes();
  }, [loadSolicitudes]);

  const createSolicitud = useCallback(async (data: SolicitudEntradaAlmacenCreateData) => {
    setCreating(true);
    setError(null);
    try {
      const created = await SolicitudEntradaAlmacenService.createSolicitud(data);
      setSolicitudes((prev) => [created, ...prev]);
      return created;
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo crear la solicitud";
      setError(message);
      throw new Error(message);
    } finally {
      setCreating(false);
    }
  }, []);

  const aprobarSolicitud = useCallback(async (id: string, payload: AprobarSolicitudRequest = {}) => {
    setResolving(true);
    setError(null);
    try {
      const updated = await SolicitudEntradaAlmacenService.aprobarSolicitud(id, payload);
      setSolicitudes((prev) => prev.map((s) => (s.id === id ? updated : s)));
      return updated;
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo aprobar la solicitud";
      setError(message);
      throw new Error(message);
    } finally {
      setResolving(false);
    }
  }, []);

  const denegarSolicitud = useCallback(async (id: string, payload: DenegarSolicitudRequest) => {
    setResolving(true);
    setError(null);
    try {
      const updated = await SolicitudEntradaAlmacenService.denegarSolicitud(id, payload);
      setSolicitudes((prev) => prev.map((s) => (s.id === id ? updated : s)));
      return updated;
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo denegar la solicitud";
      setError(message);
      throw new Error(message);
    } finally {
      setResolving(false);
    }
  }, []);

  const filteredSolicitudes = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return solicitudes.filter((sol) => {
      if (estadoFilter !== "todos" && sol.estado !== estadoFilter) return false;
      if (almacenFilter !== "todos" && sol.almacen_id !== almacenFilter) return false;
      if (compraFilter !== "todos" && sol.compra_id !== compraFilter) return false;
      if (!term) return true;
      const index = [
        sol.id,
        sol.compra_id,
        sol.almacen_id,
        sol.creado_por_ci,
        sol.aprobado_por_ci,
        sol.motivo_denegacion,
        sol.observaciones_recepcion,
        ...sol.materiales.map((m) => m.material_nombre),
        ...sol.materiales.map((m) => m.material_codigo),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return index.includes(term);
    });
  }, [solicitudes, searchTerm, estadoFilter, almacenFilter, compraFilter]);

  const clearError = useCallback(() => setError(null), []);

  return {
    solicitudes,
    filteredSolicitudes,
    loading,
    creating,
    resolving,
    error,
    searchTerm,
    setSearchTerm,
    estadoFilter,
    setEstadoFilter,
    almacenFilter,
    setAlmacenFilter,
    compraFilter,
    setCompraFilter,
    loadSolicitudes,
    createSolicitud,
    aprobarSolicitud,
    denegarSolicitud,
    clearError,
  };
}
