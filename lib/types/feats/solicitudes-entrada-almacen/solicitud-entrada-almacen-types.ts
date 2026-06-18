export const ESTADOS_SOLICITUD_ENTRADA = ["pendiente", "aprobada", "denegada"] as const;
export type EstadoSolicitudEntrada = (typeof ESTADOS_SOLICITUD_ENTRADA)[number];

export const POOLS = ["indistinto", "instaladora", "ventas"] as const;
export type PoolKey = (typeof POOLS)[number];

export const ORIGENES_SOLICITUD_ENTRADA = ["compra", "consignacion"] as const;
export type OrigenSolicitudEntrada = (typeof ORIGENES_SOLICITUD_ENTRADA)[number];

export const SOLICITUD_ENTRADA_ORIGEN_LABELS: Record<OrigenSolicitudEntrada, string> = {
  compra: "Compra",
  consignacion: "Consignación",
};

export interface SplitPool {
  indistinto: number;
  instaladora: number;
  ventas: number;
}

export interface MaterialSolicitudEntrada {
  material_id: string;
  material_codigo: string;
  material_nombre: string;
  cantidad_total: number;
  costo_unitario: number;
  split: SplitPool;
  /**
   * Motivo cuando `cantidad_total` es menor que lo pendiente de la compra.
   * Obligatorio en escritura si hay parcial; opcional/null si la cantidad
   * cubre todo el pendiente.
   */
  motivo_parcial?: string | null;
}

export interface SolicitudEntradaAlmacen {
  id: string;
  /** Origen de la entrada: "compra" (default) o "consignacion" (devolución de cliente). */
  origen: OrigenSolicitudEntrada;
  /** Vacío cuando origen='consignacion'. */
  compra_id: string;
  /** Vacío cuando origen='compra'. */
  consignacion_id?: string;
  almacen_id: string;
  materiales: MaterialSolicitudEntrada[];
  estado: EstadoSolicitudEntrada;
  motivo_denegacion?: string;
  observaciones_recepcion?: string;
  movimientos_generados: string[];
  kardex_generados: string[];
  creado_por_ci?: string;
  aprobado_por_ci?: string;
  fecha_creacion: string;
  fecha_resolucion?: string;
}

export interface MaterialSolicitudEntradaCreate {
  material_id: string;
  material_codigo: string;
  material_nombre: string;
  cantidad_total: number;
  /**
   * Costo unitario. Opcional: si no se envía, el backend lo deduce de la
   * Ficha de Costos de la compra. Si la ficha no existe, queda en 0 y se
   * pondera después con POST /api/compras/{id}/ponderar-costo.
   */
  costo_unitario?: number;
  split: SplitPool;
  /**
   * Si `cantidad_total` es menor que lo pendiente de la compra, el backend
   * exige `motivo_parcial`. El frontend debe enviarlo cuando aplique.
   */
  motivo_parcial?: string;
}

export interface SolicitudEntradaAlmacenCreateData {
  origen?: OrigenSolicitudEntrada;
  /** Obligatorio cuando origen='compra'. */
  compra_id?: string;
  /** Obligatorio cuando origen='consignacion'. */
  consignacion_id?: string;
  almacen_id: string;
  materiales: MaterialSolicitudEntradaCreate[];
}

export interface AprobarSolicitudRequest {
  observaciones_recepcion?: string;
}

export interface DenegarSolicitudRequest {
  motivo: string;
}

/** Material que bloquea la aprobación por tener una entrada kardex pendiente de costeo */
export interface PendienteCosteoMaterial {
  material_id: string;
  material_codigo: string;
  material_nombre: string;
  compra_id: string | null;
  compra_nombre: string;
}

export const SOLICITUD_ENTRADA_ESTADO_LABELS: Record<EstadoSolicitudEntrada, string> = {
  pendiente: "Pendiente",
  aprobada: "Aprobada",
  denegada: "Denegada",
};

export const POOL_LABELS: Record<PoolKey, string> = {
  indistinto: "Común",
  instaladora: "Instaladora",
  ventas: "Ventas",
};

export const POOL_DESCRIPCIONES: Record<PoolKey, string> = {
  indistinto: "Disponible para ambos sectores",
  instaladora: "Reservado para vales de instalación",
  ventas: "Reservado para ventas en tienda",
};
