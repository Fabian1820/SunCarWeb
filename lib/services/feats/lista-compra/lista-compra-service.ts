/* eslint-disable @typescript-eslint/no-explicit-any */
import { apiRequest } from "@/lib/api-config";
import type {
  EstadoItemListaCompra,
  ItemListaCompra,
  ItemListaCompraCreateData,
  ItemListaCompraUpdateData,
} from "@/lib/types/feats/lista-compra/lista-compra-types";

const BASE = "/lista-compra";

const unwrap = (res: any): any => {
  if (res?.error?.message) throw new Error(res.error.message);
  if (res?.detail) throw new Error(res.detail);
  if (res?.success === false && res?.message) throw new Error(res.message);
  return res?.data ?? res;
};

export class ListaCompraService {
  static async getAll(
    estado?: EstadoItemListaCompra,
  ): Promise<ItemListaCompra[]> {
    const url = estado ? `${BASE}/?estado=${estado}` : `${BASE}/`;
    const res: any = await apiRequest(url);
    return (unwrap(res) as ItemListaCompra[]) ?? [];
  }

  static async create(
    data: ItemListaCompraCreateData,
  ): Promise<ItemListaCompra> {
    const res: any = await apiRequest(`${BASE}/`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    return unwrap(res) as ItemListaCompra;
  }

  static async update(
    id: string,
    data: ItemListaCompraUpdateData,
  ): Promise<ItemListaCompra> {
    const res: any = await apiRequest(`${BASE}/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    return unwrap(res) as ItemListaCompra;
  }

  static async delete(id: string): Promise<void> {
    const res: any = await apiRequest(`${BASE}/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    unwrap(res);
  }

  static async marcarEnviados(ids: string[]): Promise<number> {
    const res: any = await apiRequest(`${BASE}/marcar-enviados`, {
      method: "POST",
      body: JSON.stringify({ ids }),
    });
    if (res?.error?.message) throw new Error(res.error.message);
    if (res?.detail) throw new Error(res.detail);
    return res?.cantidad_actualizada ?? 0;
  }
}
