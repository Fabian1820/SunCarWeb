// Configuración de las alertas por WhatsApp/SMS de movimientos grandes de
// billetera. Refleja `GET|PUT /api/wallet/alertas/config` del backend.
//
// Las credenciales de Twilio no se editan desde aquí a propósito: son secretos
// y viven en las variables de entorno del servidor. El panel solo muestra si
// están puestas, a través de `TwilioDiagnostico`.

export type AlertaTipo = "ingreso" | "gasto" | "transferencia";
export type AlertaCanal = "auto" | "whatsapp" | "sms";

/** "*" como moneda significa "cualquier moneda sin regla propia". */
export const MONEDA_TODAS = "*";

export interface UmbralAlerta {
  tipo: AlertaTipo;
  moneda: string;
  monto: number;
}

export interface WalletAlertConfig {
  activo: boolean;
  canal: AlertaCanal;
  destinatarios: string[];
  umbrales: UmbralAlerta[];
  updated_at?: string | null;
  updated_by_ci?: string | null;
  updated_by_nombre?: string | null;
}

export interface TwilioDiagnostico {
  configurado: boolean;
  account_sid: string | null;
  auth_token_presente: boolean;
  whatsapp_from: string | null;
  whatsapp_plantilla: boolean;
  sms_from: string | null;
  messaging_service_sid: boolean;
  canales_disponibles: Array<"whatsapp" | "sms">;
}

export interface WalletAlertEstado {
  config: WalletAlertConfig;
  twilio: TwilioDiagnostico;
  /** true solo si está activo, hay destinatarios y Twilio tiene credenciales. */
  operativo: boolean;
}

export interface ResultadoPrueba {
  destinatario: string;
  canal: "whatsapp" | "sms" | null;
  sid: string | null;
  error: string | null;
}

export const TIPOS_ALERTA: { value: AlertaTipo; label: string }[] = [
  { value: "gasto", label: "Gasto" },
  { value: "ingreso", label: "Ingreso" },
  { value: "transferencia", label: "Transferencia" },
];

export const CANALES: { value: AlertaCanal; label: string; hint: string }[] = [
  {
    value: "auto",
    label: "WhatsApp, y SMS si falla",
    hint: "Recomendado. Intenta WhatsApp primero por ser más barato.",
  },
  { value: "whatsapp", label: "Solo WhatsApp", hint: "No reintenta por SMS." },
  { value: "sms", label: "Solo SMS", hint: "Más caro y menos fiable hacia Cuba." },
];

export function configVacia(): WalletAlertConfig {
  return { activo: false, canal: "auto", destinatarios: [], umbrales: [] };
}

/**
 * Valida un teléfono en formato internacional E.164. El backend vuelve a
 * validarlo y es quien manda; esto solo evita el viaje de ida y vuelta.
 */
export function telefonoValido(numero: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test(numero.trim().replace(/[\s\-().]/g, ""));
}

export function normalizarTelefono(numero: string): string {
  let limpio = numero.trim().replace(/[\s\-().]/g, "");
  if (limpio.startsWith("00")) limpio = `+${limpio.slice(2)}`;
  if (limpio && !limpio.startsWith("+")) limpio = `+${limpio}`;
  return limpio;
}

export function etiquetaTipo(tipo: AlertaTipo): string {
  return TIPOS_ALERTA.find((t) => t.value === tipo)?.label ?? tipo;
}

export function etiquetaMoneda(moneda: string): string {
  return moneda === MONEDA_TODAS ? "Todas las monedas" : moneda;
}
