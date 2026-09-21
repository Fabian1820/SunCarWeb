import type {
  AlertaCarga,
  EstadoCarga,
  EstadoComprobante,
  EstadoPuestoVista,
  EstadoReserva,
  EstadoSolinera,
  MetodoPago,
  Moneda,
  TipoToma,
  TipoVehiculo,
} from "@/lib/types/feats/solineras/solinera-types"

/** Las solineras están en Cuba: las horas se muestran siempre en su zona, no en la del navegador. */
export const ZONA_CUBA = "America/Havana"

export const TIPOS_VEHICULO: { value: TipoVehiculo; label: string }[] = [
  { value: "moto", label: "Moto" },
  { value: "motorina", label: "Motorina" },
  { value: "bicicleta", label: "Bicicleta eléctrica" },
  { value: "triciclo", label: "Triciclo" },
  { value: "tricitaxi", label: "Tricitaxi" },
  { value: "bicitaxi", label: "Bicitaxi" },
  { value: "auto", label: "Auto" },
  { value: "equipo", label: "Equipo o batería" },
  { value: "otro", label: "Otro" },
]

export const TIPOS_TOMA: { value: TipoToma; label: string }[] = [
  { value: "220V", label: "220 V" },
  { value: "110V", label: "110 V" },
  { value: "otro", label: "Otra" },
]

export const MONEDAS: Moneda[] = ["CUP", "USD", "EUR"]

export const METODOS_PAGO: { value: MetodoPago; label: string; electronico: boolean }[] = [
  { value: "efectivo", label: "Efectivo", electronico: false },
  { value: "transferencia", label: "Transferencia", electronico: true },
  { value: "transfermovil", label: "Transfermóvil", electronico: true },
  { value: "enzona", label: "EnZona", electronico: true },
]

export const ESTADOS_SOLINERA: { value: EstadoSolinera; label: string }[] = [
  { value: "operativa", label: "Operativa" },
  { value: "en_obra", label: "En obra" },
  { value: "pausada", label: "Pausada" },
  { value: "cerrada", label: "Cerrada" },
]

export const DIAS_SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]

const etiqueta = <T extends string>(lista: { value: T; label: string }[], valor: T | null | undefined) =>
  lista.find((i) => i.value === valor)?.label ?? String(valor ?? "")

export const etiquetaVehiculo = (tipo: TipoVehiculo | null | undefined) => etiqueta(TIPOS_VEHICULO, tipo)
export const etiquetaMetodo = (metodo: MetodoPago) => etiqueta(METODOS_PAGO, metodo)
export const etiquetaEstadoSolinera = (estado: EstadoSolinera) => etiqueta(ESTADOS_SOLINERA, estado)

export const ETIQUETA_ESTADO_CARGA: Record<EstadoCarga, string> = {
  cargando: "Cargando",
  terminada: "Terminada",
  cobrada: "Cobrada",
  retirada: "Retirada",
  anulada: "Anulada",
}

export const ETIQUETA_ESTADO_PUESTO: Record<EstadoPuestoVista, string> = {
  libre: "Libre",
  cargando: "Cargando",
  terminada: "Terminó",
  fuera_servicio: "Fuera de servicio",
  falla: "En falla",
}

export const ETIQUETA_ESTADO_RESERVA: Record<EstadoReserva, string> = {
  confirmada: "Confirmada",
  presentada: "Se presentó",
  no_presentada: "No se presentó",
  cancelada: "Cancelada",
}

export const ETIQUETA_COMPROBANTE: Record<EstadoComprobante, string> = {
  pendiente: "Por validar",
  validado: "Validado",
  rechazado: "Rechazado",
}

export const ETIQUETA_ALERTA: Record<AlertaCarga, string> = {
  excedida: "Pasó el tiempo pedido",
  maximo: "Supera el tiempo máximo",
  ocupando: "Terminó y sigue en el puesto",
}

/** 1.250 CUP · 3,50 USD. Los CUP van sin decimales, como se cobran. */
export function formatearMonto(monto: number | null | undefined, moneda: Moneda): string {
  if (monto === null || monto === undefined) return "—"
  const decimales = moneda === "CUP" ? 0 : 2
  const numero = new Intl.NumberFormat("es-CU", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(monto)
  return `${numero} ${moneda}`
}

/** 150 → "2 h 30 min"; 45 → "45 min"; 60 → "1 h". */
export function formatearDuracion(minutos: number | null | undefined): string {
  if (minutos === null || minutos === undefined) return "—"
  const total = Math.round(Math.abs(minutos))
  const horas = Math.floor(total / 60)
  const resto = total % 60
  if (horas && resto) return `${horas} h ${resto} min`
  if (horas) return `${horas} h`
  return `${resto} min`
}

export function formatearHora(iso: string | null | undefined): string {
  if (!iso) return "—"
  return new Intl.DateTimeFormat("es-CU", {
    timeZone: ZONA_CUBA,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso))
}

export function formatearFechaHora(iso: string | null | undefined): string {
  if (!iso) return "—"
  return new Intl.DateTimeFormat("es-CU", {
    timeZone: ZONA_CUBA,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso))
}

export function formatearFecha(iso: string | null | undefined): string {
  if (!iso) return "—"
  return new Intl.DateTimeFormat("es-CU", {
    timeZone: ZONA_CUBA,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(iso))
}

/** "AAAA-MM-DD" del día de hoy en Cuba (más `dias` de desplazamiento). */
export function fechaCuba(dias = 0): string {
  const base = new Date(Date.now() + dias * 86_400_000)
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA_CUBA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(base)
  return partes
}

/** Descripción corta de un vehículo: "Moto Yadea · P123456". */
export function describirVehiculo(v: {
  tipo: TipoVehiculo
  marca?: string | null
  modelo?: string | null
  chapa?: string | null
}): string {
  const nombre = [etiquetaVehiculo(v.tipo), v.marca, v.modelo].filter(Boolean).join(" ")
  return v.chapa ? `${nombre} · ${v.chapa}` : nombre
}

/** Abre un PDF (el ticket) en una pestaña nueva y devuelve el aviso si el navegador la bloqueó. */
export function abrirPdf(blob: Blob): boolean {
  const url = URL.createObjectURL(blob)
  const ventana = window.open(url, "_blank")
  // Se libera pasado un rato: la pestaña nueva ya tiene el archivo cargado.
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
  return ventana !== null
}
