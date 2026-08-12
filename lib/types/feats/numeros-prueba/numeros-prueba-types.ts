export interface NumeroPrueba {
  id: string;
  numero: string;
  nota?: string | null;
  activo: boolean;
  orden: number;
}

export interface NumeroPruebaCreateData {
  numero: string;
  nota?: string | null;
  activo: boolean;
  orden: number;
}

export type NumeroPruebaUpdateData = Partial<NumeroPruebaCreateData>;
