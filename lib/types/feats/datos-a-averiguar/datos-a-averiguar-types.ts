/** Cuándo debe preguntarlo el asistente de WhatsApp. */
export type MomentoDato = "antes_de_ofertas" | "despues";

export interface DatoAAveriguar {
  id: string;
  dato: string;
  motivo?: string | null;
  momento: MomentoDato;
  activo: boolean;
  orden: number;
}

export interface DatoAAveriguarCreateData {
  dato: string;
  motivo?: string | null;
  momento: MomentoDato;
  activo: boolean;
  orden: number;
}

export type DatoAAveriguarUpdateData = Partial<DatoAAveriguarCreateData>;
