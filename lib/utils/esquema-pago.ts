/**
 * Esquema de pago de una oferta: el reparto porcentual de los tres hitos que se
 * imprime en la sección "Formas de pago" de la oferta exportada.
 *
 * El texto completo de esa sección vive en Mongo (colección
 * `terminos_condiciones`) y no hay UI para editarlo; lo único que varía por
 * cliente son los porcentajes, y para eso está este campo en la oferta. Si la
 * oferta no trae esquema, la exportación usa el texto de la BD tal cual.
 *
 * El render está en `lib/utils/terminos-condiciones-export.ts`.
 */

export interface EsquemaPago {
  anticipo: number;
  entrega_suministros: number;
  puesta_marcha: number;
}

export interface EsquemaPagoPreset {
  id: string;
  label: string;
  esquema: EsquemaPago;
}

/** Los tres repartos que usa comercial. El primero es el de los términos actuales. */
export const ESQUEMAS_PAGO_PRESETS: EsquemaPagoPreset[] = [
  {
    id: "50_30_20",
    label: "50 / 30 / 20",
    esquema: { anticipo: 50, entrega_suministros: 30, puesta_marcha: 20 },
  },
  {
    id: "40_40_20",
    label: "40 / 40 / 20",
    esquema: { anticipo: 40, entrega_suministros: 40, puesta_marcha: 20 },
  },
  {
    id: "50_40_10",
    label: "50 / 40 / 10",
    esquema: { anticipo: 50, entrega_suministros: 40, puesta_marcha: 10 },
  },
];

/** Valor del select cuando la oferta no fija esquema y hereda el de los términos. */
export const ESQUEMA_PAGO_POR_DEFECTO = "por_defecto";
export const ESQUEMA_PAGO_PERSONALIZADO = "personalizado";

export const HITOS_ESQUEMA_PAGO: {
  key: keyof EsquemaPago;
  label: string;
}[] = [
  { key: "anticipo", label: "Anticipo (firma)" },
  { key: "entrega_suministros", label: "Entrega de suministros" },
  { key: "puesta_marcha", label: "Puesta en marcha" },
];

const redondear = (valor: number) => Number(valor.toFixed(2));

export const sumaEsquemaPago = (esquema: EsquemaPago): number =>
  redondear(
    Number(esquema.anticipo || 0) +
      Number(esquema.entrega_suministros || 0) +
      Number(esquema.puesta_marcha || 0),
  );

/** El backend rechaza cualquier reparto que no sume 100 (tolerancia de 0.01). */
export const esEsquemaPagoValido = (esquema: EsquemaPago): boolean => {
  const valores = [
    esquema.anticipo,
    esquema.entrega_suministros,
    esquema.puesta_marcha,
  ];
  if (valores.some((v) => !Number.isFinite(Number(v)) || Number(v) < 0)) {
    return false;
  }
  return Math.abs(sumaEsquemaPago(esquema) - 100) <= 0.01;
};

/** Normaliza lo que llega del backend; devuelve null si no es un esquema usable. */
export const normalizarEsquemaPago = (raw: unknown): EsquemaPago | null => {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const esquema: EsquemaPago = {
    anticipo: Number(record.anticipo),
    entrega_suministros: Number(record.entrega_suministros),
    puesta_marcha: Number(record.puesta_marcha),
  };
  return esEsquemaPagoValido(esquema) ? esquema : null;
};

/** Id del preset que coincide con el esquema, o "personalizado" si no coincide ninguno. */
export const identificarEsquemaPago = (esquema: EsquemaPago | null): string => {
  if (!esquema) return ESQUEMA_PAGO_POR_DEFECTO;
  const preset = ESQUEMAS_PAGO_PRESETS.find(
    (p) =>
      p.esquema.anticipo === redondear(Number(esquema.anticipo)) &&
      p.esquema.entrega_suministros ===
        redondear(Number(esquema.entrega_suministros)) &&
      p.esquema.puesta_marcha === redondear(Number(esquema.puesta_marcha)),
  );
  return preset ? preset.id : ESQUEMA_PAGO_PERSONALIZADO;
};

/** Etiqueta corta para mostrar el esquema en tablas y resúmenes. */
export const describirEsquemaPago = (esquema: EsquemaPago | null): string => {
  if (!esquema) return "Por defecto";
  const fmt = (v: number) => String(Number(Number(v).toFixed(2)));
  return `${fmt(esquema.anticipo)} / ${fmt(esquema.entrega_suministros)} / ${fmt(esquema.puesta_marcha)}`;
};
