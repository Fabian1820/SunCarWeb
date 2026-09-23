import type {
  ElementoPersonalizado,
  OfertaEmbebida,
  OfertaAsignacion,
  OfertaConfeccionResumen,
} from "../leads/lead-types";
import type { Averia } from "../averias/averia-types";

export interface ClienteFoto {
  url: string;
  fecha: string;
  /**
   * Categoría histórica: solo aparece en registros antiguos (instalacion/averia/visita).
   * Los archivos nuevos ya no se categorizan al subir, así que llega null/undefined.
   */
  tipo?: "instalacion" | "averia" | "visita" | null;
  /** Qué es el archivo, puesto por quien lo sube. Solo en archivos nuevos. */
  concepto?: string | null;
  /** Nombre de quien subió el archivo. Solo en archivos nuevos. */
  subida_por?: string | null;
  /** Agrupa varios archivos subidos juntos bajo el mismo concepto. */
  grupo_id?: string | null;
}

/**
 * Equipo principal del cliente, acumulando todas sus ofertas confirmadas: una
 * ampliación posterior suma sobre la instalación original.
 *
 * `fuente` dice de dónde salió el dato — "ofertas_confirmadas" (el sistema
 * vivo), "snapshot_cliente" (el legado congelado en `ofertas[0]`, para
 * clientes anteriores al módulo de confección), "mixta", o `null` cuando no
 * hay equipo registrado. Un componente en `null` significa "no se sabe", no
 * "cero": esos clientes quedan fuera de cualquier filtro por capacidad.
 */
export interface CapacidadEquipos {
  inversor_kw: number | null;
  bateria_kwh: number | null;
  paneles: number | null;
  /** "ficha": el cliente tiene ficha de equipos y esto es lo instalado según ella. */
  fuente: "ofertas_confirmadas" | "snapshot_cliente" | "mixta" | "ficha" | null;
}

/**
 * Familia de un equipo del cliente. La caja combinadora no tiene sección
 * propia en las ofertas: el backend la reconoce por el nombre. Las estructuras
 * no son equipo a propósito — se deducen del número de paneles.
 */
export type CategoriaEquipo =
  | "INVERSORES"
  | "BATERIAS"
  | "PANELES"
  | "MPPT"
  | "CAJA_COMBINADORA"
  | "OTRO";

export type EstadoEquipo = "activo" | "retirado" | "sustituido";

export type OrigenEquipo =
  | "oferta_confirmada"
  | "migracion_oferta"
  | "migracion_snapshot"
  | "alta_manual"
  | "equipo_propio_cliente";

/**
 * Un equipo tal como está hoy en casa del cliente (`clientes.equipos`).
 *
 * Es la proyección de un log de movimientos, así que no se edita como campo:
 * cada cambio es un movimiento con motivo. `cantidad_actual` es lo ofertado
 * —la base— y `cantidad_entregada` lo que respalda un vale; la diferencia es
 * la discrepancia, que en la mayoría de los clientes existe porque las
 * entregas no se registraron.
 */
export interface EquipoCliente {
  equipo_key: string;
  material_id: string | null;
  material_codigo: string | null;
  descripcion: string;
  categoria: CategoriaEquipo;
  marca: string | null;
  potencia_kw: number | null;
  /** Foto actual del material en el catálogo; solo en las respuestas de /equipos. */
  foto?: string | null;
  /**
   * Nombre del material en el catálogo. Mostrar este antes que `descripcion`,
   * que es la línea de la oferta: texto libre, a veces largo o vago.
   */
  nombre?: string | null;
  /** Vales que respaldan lo entregado; solo en las respuestas de /equipos. */
  vales_entrega?: ValeEntregaEquipo[];
  /**
   * Por qué lo entregado con vale no llega a lo ofertado. Solo "falta_entregar"
   * es una entrega pendiente de verdad: en un cliente instalado, el hueco casi
   * siempre es de antes de los vales o equipo que aportó el cliente.
   */
  explicacion_faltante?: ExplicacionFaltante | null;
  cantidad_actual: number;
  /** Según almacén (vales menos devoluciones), calculado al leer la ficha. */
  cantidad_entregada: number;
  estado: EstadoEquipo;
  numeros_serie: string[];
  es_equipo_propio: boolean;
  origen_inicial: OrigenEquipo | null;
  pendiente_resolver_material: boolean;
  fecha_alta: string | null;
  fecha_ultimo_cambio: string | null;
  total_movimientos: number;
  /** Solo viene en las respuestas de /equipos; en el listado se calcula. */
  discrepancia?: number;
  tiene_discrepancia?: boolean;
}

export type ExplicacionFaltante =
  | "falta_entregar"
  | "anterior_a_vales"
  | "propio_cliente"
  | "sin_vale";

export interface ValeEntregaEquipo {
  codigo: string | null;
  fecha: string | null;
  cantidad: number;
  devuelto: number;
  recogido_por: string | null;
  /**
   * Si la línea no es un vale sino un traspaso: lo entregado viaja con la
   * unidad. `cantidad` es negativa en quien la dio. `codigo` es el TR-….
   */
  traspaso?: {
    id: string;
    tipo: "entrada" | "salida";
    cliente_numero: string;
  } | null;
}

export type TipoMovimientoEquipo =
  | "alta"
  | "ajuste_cantidad"
  | "sustitucion"
  | "retiro"
  | "correccion"
  | "traspaso_salida"
  | "traspaso_entrada";

export type MotivoCambioEquipo =
  | "instalacion_inicial"
  | "ampliacion"
  | "garantia"
  | "autorizado_direccion"
  | "correccion_dato"
  | "venta_adicional"
  | "retiro"
  | "migracion"
  | "traspaso";

/** Un cambio en los equipos de un cliente. Inmutable. */
export interface MovimientoEquipoCliente {
  id: string | null;
  cliente_numero: string;
  equipo_key: string;
  tipo: TipoMovimientoEquipo;
  cantidad_delta: number;
  cantidad_entregada_delta: number;
  material_id: string | null;
  material_codigo: string | null;
  descripcion: string;
  /** Nombre de catálogo, añadido al leer el historial. */
  nombre?: string | null;
  categoria: CategoriaEquipo;
  marca: string | null;
  potencia_kw: number | null;
  numero_serie: string | null;
  origen: OrigenEquipo;
  oferta_id: string | null;
  numero_oferta: string | null;
  sustituye_a: string | null;
  /** Traspaso entre clientes: cada punta apunta al documento y al otro cliente. */
  traspaso_id?: string | null;
  traspaso_codigo?: string | null;
  contraparte_cliente_numero?: string | null;
  contraparte_cliente_nombre?: string | null;
  numeros_serie?: string[];
  fecha_alta_original?: string | null;
  motivo: MotivoCambioEquipo;
  nota: string | null;
  autorizado_por: string | null;
  actor_ci: string | null;
  actor_nombre: string | null;
  /** Cuándo pasó en la realidad. */
  fecha_efectiva: string;
  /** Cuándo se tecleó. */
  fecha_registro: string;
}

/** Una línea de un traspaso: un equipo que pasa de `desde` a `hacia`. */
export interface LineaTraspasoEquipos {
  desde: string;
  hacia: string;
  equipo_key: string;
  cantidad: number;
  cantidad_entregada: number;
  material_id: string | null;
  descripcion: string;
  categoria: CategoriaEquipo;
  numeros_serie: string[];
}

/**
 * Traspaso o intercambio de equipos entre dos clientes (`TR-…`). Nunca se
 * borra: deshacerlo es otro traspaso con `revierte_a`.
 */
export interface TraspasoEquipos {
  id: string | null;
  traspaso_id: string;
  codigo: string;
  cliente_a: { numero: string; nombre: string | null };
  cliente_b: { numero: string; nombre: string | null };
  lineas: LineaTraspasoEquipos[];
  motivo: MotivoCambioEquipo;
  nota: string;
  autorizado_por: string | null;
  actor_ci: string | null;
  actor_nombre: string | null;
  fecha_efectiva: string;
  fecha_registro: string;
  estado: "aplicando" | "aplicado";
  revierte_a: string | null;
  revertido_por: string | null;
}

export interface Cliente {
  id?: string; // ID de MongoDB (transformado desde _id por el backend)
  numero: string;
  nombre: string;
  direccion: string;
  telefono?: string;
  telefono_adicional?: string;
  fecha_contacto?: string;
  estado?: string;
  fuente?: string;
  fuente_referencia?: string;
  referencia?: string;
  pais_contacto?: string;
  comentario?: string;
  provincia_montaje?: string;
  municipio?: string;
  comercial?: string;
  ofertas?: OfertaEmbebida[];
  elementos_personalizados?: ElementoPersonalizado[];
  latitud?: number | string;
  longitud?: number | string;
  carnet_identidad?: string;
  fecha_instalacion?: string;
  fecha_montaje?: string;
  fecha_creacion?: string;
  created_at?: string;
  updated_at?: string;
  comprobante_pago_url?: string;
  metodo_pago?: string;
  moneda?: string;
  falta_instalacion?: string; // Qué le falta a la instalación (solo para estado "Instalación en proceso")
  averias?: Averia[]; // Array de averías del cliente
  fotos?: ClienteFoto[]; // Evidencias (fotos/videos) del cliente
  prioridad?: "Ninguna" | "Urgente" | "Alta" | "Media" | "Baja";
  motivo_visita?: string; // Campo temporal para crear visita automática cuando estado = "Pendiente de visita"
  tipo_persona?: string;
  tipo_negocio?: string; // "BTB" | "BTC", del cliente en sí (no del equipo del comercial)
  oferta_confeccion?: OfertaConfeccionResumen | null;
  capacidad_equipos?: CapacidadEquipos | null;
  /**
   * Ficha de equipos (log proyectado). Ausente mientras no se haya migrado el
   * cliente o, en los nuevos, hasta que pase a "Equipo instalado con éxito".
   */
  equipos?: EquipoCliente[] | null;
  equipos_actualizado_en?: string | null;
  /** Ofertas cuyos equipos ya están en la ficha (instaladas). */
  equipos_ofertas_registradas?: string[] | null;
  es_trabajador_suncar?: boolean;
  activo?: boolean;
}

export interface ClienteResponse {
  success: boolean;
  message: string;
  data: Cliente | Cliente[] | null;
  total?: number;
  skip?: number;
  limit?: number;
}

export interface ClienteCreateData {
  numero: string;
  nombre: string;
  direccion: string;
  telefono?: string;
  telefono_adicional?: string;
  fecha_contacto?: string;
  estado?: string;
  fuente?: string;
  fuente_referencia?: string;
  referencia?: string;
  pais_contacto?: string;
  comentario?: string;
  provincia_montaje?: string;
  municipio?: string;
  comercial?: string;
  ofertas?: OfertaAsignacion[]; // Al crear: solo enviar oferta_id + cantidad
  elementos_personalizados?: ElementoPersonalizado[];
  latitud?: number | string;
  longitud?: number | string;
  carnet_identidad?: string;
  fecha_instalacion?: string;
  fecha_montaje?: string;
  comprobante_pago_url?: string;
  metodo_pago?: string;
  moneda?: string;
  falta_instalacion?: string; // Qué le falta a la instalación
  fotos?: ClienteFoto[];
  equipo_propio?: boolean; // Si el equipo es propio del cliente (código con P)
  es_trabajador_suncar?: boolean;
  prioridad?: "Ninguna" | "Urgente" | "Alta" | "Media" | "Baja";
  motivo_visita?: string; // Campo temporal para crear visita automática cuando estado = "Pendiente de visita"
  tipo_persona?: string;
  tipo_negocio?: string; // "BTB" | "BTC", del cliente en sí (no del equipo del comercial)
}

export interface ClienteSimpleCreateData {
  numero: string;
  nombre: string;
  direccion: string;
  telefono?: string;
  comprobante_pago_url?: string;
  metodo_pago?: string;
  moneda?: string;
  falta_instalacion?: string; // Qué le falta a la instalación
}

export type ClienteUpdateData = Partial<ClienteCreateData> & {
  fecha_equipo_instalado?: string;
};
