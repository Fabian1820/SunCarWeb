export type SedeTipo = "nacional" | "provincial";

export interface Sede {
  id: string;
  nombre: string;
  tipo: SedeTipo | string;
  provincia_codigo?: string | null;
  provincia_nombre?: string | null;
  activo: boolean;
}

export interface SedeUpsertRequest {
  nombre: string;
  tipo: SedeTipo;
  provincia_codigo?: string | null;
  provincia_nombre?: string | null;
  activo?: boolean;
}
