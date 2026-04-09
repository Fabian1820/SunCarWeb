export const ESTADOS_ENVIO_CONTENEDOR = [
  "despachado",
  "recibido",
  "cancelado",
] as const;

export type EstadoEnvioContenedor =
  (typeof ESTADOS_ENVIO_CONTENEDOR)[number];

export interface EnvioContenedorMaterial {
  material_id: string;
  material_codigo: string;
  material_nombre: string;
  material_descripcion?: string;
  um?: string;
  cantidad: number;
}

export interface EnvioContenedor {
  id: string;
  nombre: string;
  descripcion?: string;
  fecha_envio: string;
  fecha_llegada_aproximada: string;
  estado: EstadoEnvioContenedor;
  materiales: EnvioContenedorMaterial[];
  created_at?: string;
  updated_at?: string;
}

export interface EnvioContenedorCreateData {
  nombre: string;
  descripcion?: string;
  fecha_envio: string;
  fecha_llegada_aproximada: string;
  estado: EstadoEnvioContenedor;
  materiales: EnvioContenedorMaterial[];
}

export const ENVIO_CONTENEDOR_ESTADO_LABELS: Record<
  EstadoEnvioContenedor,
  string
> = {
  despachado: "Despachado",
  recibido: "Recibido",
  cancelado: "Cancelado",
};
