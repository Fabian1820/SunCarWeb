/**
 * Bitácora del sistema: quién hizo qué, cuándo y con qué resultado.
 *
 * Los eventos los genera el backend solo (un middleware audita toda petición que
 * modifica datos), así que aquí no hay tipos de creación: esta pantalla es de
 * lectura, como la propia bitácora.
 */

export interface AuditoriaEvento {
  id: string;
  fecha: string;
  tipo: string;
  accion: string;
  recurso: string;
  operacion?: string | null;
  descripcion: string;
  usuario_ci?: string | null;
  usuario_nombre?: string | null;
  usuario_rol?: string | null;
  usuario_es_super_admin: boolean;
  origen?: string | null;
  metodo?: string | null;
  ruta?: string | null;
  path?: string | null;
  path_params: Record<string, unknown>;
  query_params: Record<string, unknown>;
  cuerpo?: unknown;
  estado_http?: number | null;
  exito: boolean;
  entidad_id?: string | null;
  respuesta?: unknown;
  error?: string | null;
  duracion_ms?: number | null;
  ip?: string | null;
  user_agent?: string | null;
  request_id?: string | null;
}

export interface AuditoriaFiltros {
  usuarioCi?: string;
  usuarioNombre?: string;
  recurso?: string;
  accion?: string;
  metodo?: string;
  tipo?: string;
  entidadId?: string;
  soloFallidos?: boolean;
  desde?: string;
  hasta?: string;
  texto?: string;
  /** Solo peticiones que tardaron al menos estos milisegundos. */
  duracionMin?: number;
  /** fecha = las más recientes primero; duracion = las más lentas primero. */
  ordenarPor?: "fecha" | "duracion";
  pagina: number;
  porPagina: number;
}

/** Lo que tarda un módulo (o una ruta) en el periodo consultado. */
export interface AuditoriaRendimiento {
  grupo: string;
  total: number;
  media_ms: number;
  maxima_ms: number;
  lentas: number;
  peor: {
    duracion_ms?: number;
    ruta?: string;
    operacion?: string;
    metodo?: string;
  };
}

export interface AuditoriaPagina {
  eventos: AuditoriaEvento[];
  total: number;
  pagina: number;
  porPagina: number;
}

export interface AuditoriaFacetas {
  recursos: string[];
  acciones: string[];
  usuarios: string[];
}

export interface AuditoriaEstado {
  encolados: number;
  escritos: number;
  descartados: number;
  pendientes: number;
  capacidad: number;
  activo: number;
}

export const FILTROS_INICIALES: AuditoriaFiltros = {
  pagina: 1,
  porPagina: 50,
};

/** Tipos de evento del backend. Lista fija: no salen de los datos. */
export const TIPOS_EVENTO: { valor: string; etiqueta: string }[] = [
  { valor: "http", etiqueta: "Peticiones" },
  { valor: "auth", etiqueta: "Sesiones" },
  { valor: "sistema", etiqueta: "Del sistema" },
];

export const METODOS_HTTP = ["POST", "PUT", "PATCH", "DELETE", "GET"] as const;

/** Umbrales de "lenta" que ofrece la pantalla, en milisegundos. */
export const UMBRALES_DURACION: { valor: number; etiqueta: string }[] = [
  { valor: 500, etiqueta: "Más de 0,5 s" },
  { valor: 1000, etiqueta: "Más de 1 s" },
  { valor: 2000, etiqueta: "Más de 2 s" },
  { valor: 5000, etiqueta: "Más de 5 s" },
];

/** Cuántos eventos por página puede pedir la pantalla. El backend admite 500. */
export const TAMANOS_PAGINA = [25, 50, 100, 200] as const;

export const ETIQUETA_ACCION: Record<string, string> = {
  crear: "Creó",
  actualizar: "Actualizó",
  eliminar: "Eliminó",
  consultar: "Consultó",
  confirmar: "Confirmó",
  aprobar: "Aprobó",
  rechazar: "Rechazó",
  cancelar: "Canceló",
  resolver: "Resolvió",
  cerrar: "Cerró",
  enviar: "Envió",
  generar: "Generó",
  exportar: "Exportó",
  importar: "Importó",
  subir: "Subió",
  asignar: "Asignó",
  transferir: "Transfirió",
  revertir: "Revirtió",
  restaurar: "Restauró",
  pagar: "Pagó",
  facturar: "Facturó",
  login: "Inició sesión",
  login_fallido: "Sesión fallida",
};

/** Color del distintivo según lo que implique la acción. */
export const COLOR_ACCION: Record<string, string> = {
  crear: "bg-emerald-100 text-emerald-700",
  actualizar: "bg-amber-100 text-amber-700",
  eliminar: "bg-rose-100 text-rose-700",
  cancelar: "bg-rose-100 text-rose-700",
  rechazar: "bg-rose-100 text-rose-700",
  revertir: "bg-rose-100 text-rose-700",
  consultar: "bg-slate-100 text-slate-600",
  login: "bg-sky-100 text-sky-700",
  login_fallido: "bg-rose-100 text-rose-700",
  pagar: "bg-indigo-100 text-indigo-700",
  facturar: "bg-indigo-100 text-indigo-700",
};

export function etiquetaAccion(accion: string): string {
  return ETIQUETA_ACCION[accion] ?? accion.replace(/_/g, " ");
}

export function colorAccion(accion: string): string {
  return COLOR_ACCION[accion] ?? "bg-blue-100 text-blue-700";
}

/** Fecha en hora local, que es como la lee quien investiga algo. */
export function formatearFecha(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return iso;
  return fecha.toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function formatearHora(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return iso;
  return fecha.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/** Milisegundos en algo que se lee de un vistazo. */
export function formatearDuracion(ms?: number | null): string {
  if (ms === null || ms === undefined) return "-";
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(ms < 10000 ? 1 : 0)} s`;
}

/** Verde por debajo de medio segundo, ámbar hasta dos, rojo por encima. */
export function colorDuracion(ms?: number | null): string {
  if (ms === null || ms === undefined) return "text-gray-400";
  if (ms >= 2000) return "text-rose-600 font-semibold";
  if (ms >= 500) return "text-amber-600";
  return "text-gray-500";
}
