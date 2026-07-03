"use client";

import { useCallback, useState } from "react";
import { ListaCompraService } from "@/lib/services/feats/lista-compra/lista-compra-service";
import type {
  EstadoItemListaCompra,
  ItemListaCompra,
  ItemListaCompraCreateData,
  ItemListaCompraUpdateData,
} from "@/lib/types/feats/lista-compra/lista-compra-types";

export function useListaCompra(estadoInicial: EstadoItemListaCompra = "pendiente") {
  const [items, setItems] = useState<ItemListaCompra[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadItems = useCallback(
    async (estado: EstadoItemListaCompra = estadoInicial) => {
      setLoading(true);
      setError(null);
      try {
        const data = await ListaCompraService.getAll(estado);
        setItems(data);
      } catch (e: any) {
        setError(e?.message || "Error al cargar la lista de compra");
        setItems([]);
      } finally {
        setLoading(false);
      }
    },
    [estadoInicial],
  );

  const addItem = useCallback(
    async (data: ItemListaCompraCreateData): Promise<ItemListaCompra> => {
      const creado = await ListaCompraService.create(data);
      setItems((prev) => [creado, ...prev]);
      return creado;
    },
    [],
  );

  const updateItem = useCallback(
    async (
      id: string,
      data: ItemListaCompraUpdateData,
    ): Promise<ItemListaCompra> => {
      const actualizado = await ListaCompraService.update(id, data);
      setItems((prev) =>
        prev.map((i) => (i.id === actualizado.id ? actualizado : i)),
      );
      return actualizado;
    },
    [],
  );

  const deleteItem = useCallback(async (id: string): Promise<void> => {
    await ListaCompraService.delete(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const marcarEnviados = useCallback(async (ids: string[]): Promise<void> => {
    await ListaCompraService.marcarEnviados(ids);
    setItems((prev) => prev.filter((i) => !ids.includes(i.id)));
  }, []);

  return {
    items,
    loading,
    error,
    loadItems,
    addItem,
    updateItem,
    deleteItem,
    marcarEnviados,
  };
}
