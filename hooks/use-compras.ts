import { useCallback, useEffect, useMemo, useState } from "react";
import { CompraService } from "@/lib/api-services";
import type {
  Compra,
  CompraCreateData,
  EstadoCompra,
  TipoCompra,
} from "@/lib/types/feats/compras/compra-types";

interface UseComprasReturn {
  compras: Compra[];
  filteredCompras: Compra[];
  loading: boolean;
  creating: boolean;
  updating: boolean;
  error: string | null;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  estadoFilter: "todos" | EstadoCompra;
  setEstadoFilter: (value: "todos" | EstadoCompra) => void;
  tipoFilter: "todos" | TipoCompra;
  setTipoFilter: (value: "todos" | TipoCompra) => void;
  pagadoFilter: "todos" | "pagado" | "pendiente";
  setPagadoFilter: (value: "todos" | "pagado" | "pendiente") => void;
  loadCompras: () => Promise<void>;
  createCompra: (data: CompraCreateData) => Promise<Compra>;
  updateCompra: (id: string, data: Partial<CompraCreateData>) => Promise<Compra>;
  deleteCompra: (id: string) => Promise<void>;
  clearError: () => void;
}

export function useCompras(): UseComprasReturn {
  const [compras, setCompras] = useState<Compra[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [estadoFilter, setEstadoFilter] = useState<"todos" | EstadoCompra>("todos");
  const [tipoFilter, setTipoFilter] = useState<"todos" | TipoCompra>("todos");
  const [pagadoFilter, setPagadoFilter] = useState<"todos" | "pagado" | "pendiente">("todos");

  const loadCompras = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await CompraService.getCompras();
      setCompras(
        [...data].sort((a, b) => {
          const dateA = new Date(a.fecha_envio || 0).getTime();
          const dateB = new Date(b.fecha_envio || 0).getTime();
          return dateB - dateA;
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar las compras");
      setCompras([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCompras();
  }, [loadCompras]);

  const createCompra = useCallback(async (data: CompraCreateData) => {
    setCreating(true);
    setError(null);
    try {
      const created = await CompraService.createCompra(data);
      setCompras((prev) => [created, ...prev]);
      return created;
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo registrar la compra";
      setError(message);
      throw new Error(message);
    } finally {
      setCreating(false);
    }
  }, []);

  const updateCompra = useCallback(async (id: string, data: Partial<CompraCreateData>) => {
    setUpdating(true);
    setError(null);
    try {
      const updated = await CompraService.updateCompra(id, data);
      setCompras((prev) => prev.map((c) => (c.id === id ? updated : c)));
      return updated;
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo actualizar la compra";
      setError(message);
      throw new Error(message);
    } finally {
      setUpdating(false);
    }
  }, []);

  const deleteCompra = useCallback(async (id: string) => {
    setError(null);
    try {
      await CompraService.deleteCompra(id);
      setCompras((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo eliminar la compra";
      setError(message);
      throw new Error(message);
    }
  }, []);

  const filteredCompras = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return compras.filter((compra) => {
      if (estadoFilter !== "todos" && compra.estado !== estadoFilter) return false;
      if (tipoFilter !== "todos" && compra.tipo !== tipoFilter) return false;
      if (pagadoFilter === "pagado" && !compra.pagado) return false;
      if (pagadoFilter === "pendiente" && compra.pagado) return false;
      if (!term) return true;
      const index = [
        compra.nombre,
        compra.descripcion,
        compra.proveedor,
        compra.cliente,
        compra.fecha_envio,
        compra.fecha_llegada_aproximada,
        compra.datos_maritimo?.bl,
        compra.datos_maritimo?.buque,
        compra.datos_maritimo?.puerto_origen,
        ...compra.materiales.map((m) => m.material_nombre),
        ...compra.materiales.map((m) => m.material_codigo),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return index.includes(term);
    });
  }, [compras, searchTerm, estadoFilter, tipoFilter, pagadoFilter]);

  const clearError = useCallback(() => setError(null), []);

  return {
    compras,
    filteredCompras,
    loading,
    creating,
    updating,
    error,
    searchTerm,
    setSearchTerm,
    estadoFilter,
    setEstadoFilter,
    tipoFilter,
    setTipoFilter,
    pagadoFilter,
    setPagadoFilter,
    loadCompras,
    createCompra,
    updateCompra,
    deleteCompra,
    clearError,
  };
}
