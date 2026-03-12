import { useState, useEffect, useCallback, useMemo } from "react";
import { ClienteVentaService } from "@/lib/api-services";
import type {
  ClienteVenta,
  ClienteVentaCreateData,
  ClienteVentaUpdateData,
} from "@/lib/api-types";

interface UseClientesVentasReturn {
  clientes: ClienteVenta[];
  filteredClientes: ClienteVenta[];
  loading: boolean;
  error: string | null;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  loadClientes: () => Promise<void>;
  createCliente: (data: ClienteVentaCreateData) => Promise<ClienteVenta>;
  updateCliente: (
    id: string,
    data: ClienteVentaUpdateData,
    usePut?: boolean,
  ) => Promise<ClienteVenta>;
  deleteCliente: (id: string) => Promise<boolean>;
  clearError: () => void;
}

const normalizeText = (value?: string): string =>
  (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

export function useClientesVentas(): UseClientesVentasReturn {
  const [clientes, setClientes] = useState<ClienteVenta[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const loadClientes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ClienteVentaService.getClientes({
        skip: 0,
        limit: 500,
      });
      setClientes(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al cargar clientes ventas",
      );
      setClientes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const filteredClientes = useMemo(() => {
    const term = normalizeText(searchTerm);
    if (!term) return clientes;

    return clientes.filter((cliente) => {
      const searchIndex = [
        cliente.numero,
        cliente.nombre,
        cliente.telefono,
        cliente.ci,
        cliente.direccion,
      ]
        .map((value) => normalizeText(value))
        .join(" ");

      return searchIndex.includes(term);
    });
  }, [clientes, searchTerm]);

  const createCliente = useCallback(
    async (data: ClienteVentaCreateData): Promise<ClienteVenta> => {
      setLoading(true);
      setError(null);
      try {
        const response = await ClienteVentaService.createCliente(data);
        await loadClientes();
        return response;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Error al crear cliente venta";
        setError(message);
        throw new Error(message);
      } finally {
        setLoading(false);
      }
    },
    [loadClientes],
  );

  const updateCliente = useCallback(
    async (
      id: string,
      data: ClienteVentaUpdateData,
      usePut = false,
    ): Promise<ClienteVenta> => {
      setLoading(true);
      setError(null);
      try {
        const response = usePut
          ? await ClienteVentaService.putCliente(id, data)
          : await ClienteVentaService.patchCliente(id, data);
        await loadClientes();
        return response;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Error al actualizar cliente venta";
        setError(message);
        throw new Error(message);
      } finally {
        setLoading(false);
      }
    },
    [loadClientes],
  );

  const deleteCliente = useCallback(
    async (id: string): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        await ClienteVentaService.deleteCliente(id);
        await loadClientes();
        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Error al eliminar cliente venta";
        setError(message);
        throw new Error(message);
      } finally {
        setLoading(false);
      }
    },
    [loadClientes],
  );

  const clearError = useCallback(() => setError(null), []);

  useEffect(() => {
    loadClientes();
  }, [loadClientes]);

  return {
    clientes,
    filteredClientes,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    loadClientes,
    createCliente,
    updateCliente,
    deleteCliente,
    clearError,
  };
}
