export type UrgenciaCompra = "alta" | "media" | "baja";
export type EstadoItemListaCompra = "pendiente" | "enviado";
export type OrigenItemListaCompra = "automatico" | "manual";

export interface ItemListaCompra {
  id: string;
  material_codigo: string;
  material_nombre: string;
  cantidad: number;
  urgencia: UrgenciaCompra;
  nota?: string | null;
  estado: EstadoItemListaCompra;
  origen: OrigenItemListaCompra;
  almacen_id?: string | null;
  dias_restantes_estimados?: number | null;
  creado_por_ci?: string | null;
  created_at: string;
  updated_at: string;
  fecha_envio?: string | null;
}

export interface ItemListaCompraCreateData {
  material_codigo: string;
  material_nombre: string;
  cantidad: number;
  urgencia?: UrgenciaCompra;
  nota?: string;
  origen?: OrigenItemListaCompra;
  almacen_id?: string;
  dias_restantes_estimados?: number;
}

export interface ItemListaCompraUpdateData {
  cantidad?: number;
  urgencia?: UrgenciaCompra;
  nota?: string;
}

export const URGENCIA_LABELS: Record<UrgenciaCompra, string> = {
  alta: "Alta",
  media: "Media",
  baja: "Baja",
};

export const URGENCIA_BADGE_CLASSES: Record<UrgenciaCompra, string> = {
  alta: "bg-red-100 text-red-800 border-red-200",
  media: "bg-amber-100 text-amber-800 border-amber-200",
  baja: "bg-green-100 text-green-800 border-green-200",
};

export const URGENCIA_EMOJI: Record<UrgenciaCompra, string> = {
  alta: "🔴",
  media: "🟡",
  baja: "🟢",
};
