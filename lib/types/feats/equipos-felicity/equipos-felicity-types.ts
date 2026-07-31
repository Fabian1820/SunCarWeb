/**
 * Tipos del módulo Equipos Felicity (plataforma FSolar).
 *
 * Los campos se mantienen en snake_case, idénticos a lo que devuelve
 * SuncarBackend (ver docs/FRONTEND_EQUIPOS_FELICITY.md) — no hay conversión
 * de camelCase de por medio en este módulo.
 */

export type UnidadMedida = "kw" | "va";

export type TipoDispositivoFelicity = "OC" | "BP"; // OC = inversor, BP = batería

export type NivelRiesgo = "SEGURO" | "PRECAUCION" | "CRITICO";

export type EstadoComando =
  | "SIMULADO"
  | "RECHAZADO"
  | "ENVIADO"
  | "APLICADO"
  | "FALLIDO";

export type OperacionFelicity =
  | "cambiar_parametro"
  | "cambiar_frecuencia_reporte"
  | "sincronizar_hora"
  | "gestionar_alarma"
  | "limpiar_log_eventos"
  | "limpiar_log_almacenamiento"
  | "reset_fabrica";

export interface CuentaFelicity {
  id?: string | null;
  usuario_suncar: string;
  cuenta: string;
  fsolar_user: string;
  region: string;
  tiene_password_comandos: boolean;
  activa: boolean;
  vinculada_en: string;
  actualizada_en?: string | null;
  ultimo_login_ok?: string | null;
  ultimo_error?: string | null;
}

export interface DispositivoFelicity {
  cuenta?: string | null;
  sn: string;
  tipo: string;
  modelo?: string | null;
  alias?: string | null;

  planta_id?: string | null;
  planta_nombre?: string | null;
  colector_sn?: string | null;
  inversor_sn?: string | null;

  estado?: string | null;
  estado_descripcion?: string | null;
  senal_wifi?: number | null;
  frecuencia_reporte?: number | null;
  zona_horaria?: string | null;
  version_firmware?: string | null;
  version_modulo?: string | null;
  potencia_nominal?: string | null;

  permisos: string[];

  actualizado_en?: string | null;
  datos_crudos: Record<string, unknown>;
}

export interface LineaElectrica {
  nombre: string;
  voltaje?: number | null;
  corriente?: number | null;
  potencia_kw?: number | null;
}

export interface BloqueEnergia {
  potencia_kw?: number | null;
  disponible?: boolean | null;
  lineas: LineaElectrica[];
}

export interface BloqueBateria {
  soc?: number | null;
  soh?: number | null;
  energia_restante_kwh?: number | null;
  potencia_kw?: number | null;
  voltaje?: number | null;
  corriente?: number | null;
  flujo?: "cargando" | "descargando" | "reposo" | null;
}

export interface EstadoRapido {
  dispositivo_sn: string;
  modelo?: string | null;
  tipo?: string | null;
  planta_nombre?: string | null;
  momento: string;
  unidad: UnidadMedida;

  bateria: BloqueBateria;
  paneles: BloqueEnergia;
  red: BloqueEnergia;
  consumo: BloqueEnergia;
}

export interface MetricasLectura {
  potencia_salida_ac?: number | null;
  potencia_entrada_ac?: number | null;
  potencia_pv?: number | null;
  potencia_bateria?: number | null;
  hay_red?: boolean | null;
  frecuencia_salida?: number | null;

  soc?: number | null;
  soh?: number | null;
  voltaje_bateria?: number | null;
  corriente_bateria?: number | null;
  energia_restante?: number | null;

  temperatura_max?: number | null;
  temperatura_min?: number | null;

  energia_pv_hoy?: number | null;
  energia_carga_hoy?: number | null;
  energia_carga_bateria_hoy?: number | null;
  energia_descarga_bateria_hoy?: number | null;
  energia_total?: number | null;
}

export interface LecturaFelicity {
  cuenta?: string | null;
  dispositivo_sn: string;
  tipo: string;
  planta_nombre?: string | null;
  momento: string;
  recibido_en: string;
  metricas: MetricasLectura;
  datos_crudos: Record<string, unknown>;
}

export interface ParametroConfigurable {
  codigo: string;
  nombre?: string | null;
  valor_actual?: unknown;
  unidad?: string | null;
  minimo?: number | null;
  maximo?: number | null;
  opciones: Record<string, unknown>[];
  solo_lectura: boolean;
  datos_crudos: Record<string, unknown>;
}

export interface ComandoFelicity {
  id?: string | null;
  cuenta?: string | null;
  dispositivo_sn: string;
  tipo_dispositivo?: string | null;

  operacion: OperacionFelicity;
  nivel_riesgo: NivelRiesgo;
  advertencia: string;

  parametros: Record<string, unknown>;
  valor_anterior?: unknown;

  estado: EstadoComando;
  simulado: boolean;
  motivo?: string | null;
  usuario?: string | null;

  comando_externo_id?: string | null;
  respuesta?: Record<string, unknown> | null;
  error?: string | null;

  creado_en: string;
  actualizado_en?: string | null;
}

export interface ResumenPlanta {
  planta_id?: string | null;
  planta_nombre?: string | null;
  dispositivos: DispositivoFelicity[];
  ultima_lectura?: string | null;
  senal_wifi_min?: number | null;
  alarmas: number;
}

export interface OperacionCatalogoItem {
  operacion: OperacionFelicity;
  nivel_riesgo: NivelRiesgo;
  advertencia: string;
  requiere_motivo: boolean;
  requiere_confirmacion: boolean;
  texto_confirmacion?: string | null;
  reversible: boolean;
}

// ---------------------------------------------------------------- respuestas

export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data?: T;
}

export interface CuentaResponse extends ApiEnvelope<CuentaFelicity> {
  vinculada: boolean;
}

export interface EstadosRapidosListResponse extends ApiEnvelope<EstadoRapido[]> {
  errores: Record<string, unknown>[];
}

export interface PrevisualizacionData {
  operacion: OperacionFelicity;
  nivel_riesgo: NivelRiesgo;
  advertencia: string;
  requiere_motivo: boolean;
  requiere_confirmacion: boolean;
  texto_confirmacion?: string | null;
  aviso_enlace?: string | null;
  valor_actual?: unknown;
  [key: string]: unknown;
}

export interface ComandoResponse extends ApiEnvelope<ComandoFelicity> {
  advertencia?: string | null;
}

export interface SincronizacionResultado {
  dispositivos: number;
  nuevas: number;
  errores: Record<string, unknown>[];
}

// ---------------------------------------------------------------- ui labels

export const ETIQUETA_NIVEL_RIESGO: Record<NivelRiesgo, string> = {
  SEGURO: "Seguro",
  PRECAUCION: "Precaución",
  CRITICO: "Crítico",
};

export const CLASE_NIVEL_RIESGO: Record<NivelRiesgo, string> = {
  SEGURO: "bg-emerald-100 text-emerald-700 border-emerald-200",
  PRECAUCION: "bg-amber-100 text-amber-700 border-amber-200",
  CRITICO: "bg-rose-100 text-rose-700 border-rose-200",
};

export const ETIQUETA_TIPO_DISPOSITIVO: Record<string, string> = {
  OC: "Inversor",
  BP: "Batería",
};

export const CONFIRMACION_REQUERIDA = "CONFIRMO";
