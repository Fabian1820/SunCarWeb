/* eslint-disable @typescript-eslint/no-explicit-any */

import { apiRequest } from "../../../api-config"
import type {
  Carga,
  CargaIniciarData,
  ClienteCreateData,
  ClienteSolinera,
  ClienteUpdateData,
  ConfiguracionSolinera,
  DisponibilidadDia,
  ListaPaginada,
  PagoCreateData,
  PagoSolinera,
  PanelSolinera,
  Puesto,
  PuestoCreateData,
  PuestoUpdateData,
  ReservaCreateData,
  ReservaSolinera,
  Solinera,
  SolineraCreateData,
  SolineraUpdateData,
  Tarifa,
  TarifaCreateData,
  TarifaUpdateData,
  TipoVehiculo,
  Turno,
  TurnoAbrirData,
  TurnoCerrarData,
  Vehiculo,
  VehiculoCreateData,
  VehiculoUpdateData,
  EstadoPuestoManual,
} from "../../../types/feats/solineras/solinera-types"

const BASE = "/solineras"

/**
 * Los 4xx del backend no lanzan: `apiRequest` los devuelve como
 * `{ success: false, detail }`. Aquí se convierten en un Error con el mensaje
 * que el backend escribió para la persona ("El puesto P-01 está ocupado por…").
 */
function errorDe(raw: any): string | null {
  if (!raw || raw.success !== false) return null
  const detalle = raw.detail
  if (typeof detalle === "string" && detalle) return detalle
  return raw.message || raw.error?.message || "La operación no pudo completarse"
}

async function llamar(endpoint: string, options?: RequestInit): Promise<any> {
  const raw = await apiRequest<any>(`${BASE}${endpoint}`, options)
  const error = errorDe(raw)
  if (error) throw new Error(error)
  return raw
}

const json = (cuerpo: unknown): RequestInit => ({ body: JSON.stringify(cuerpo) })

function query(params: Record<string, string | number | boolean | null | undefined>): string {
  const p = new URLSearchParams()
  for (const [clave, valor] of Object.entries(params)) {
    if (valor !== undefined && valor !== null && valor !== "") p.append(clave, String(valor))
  }
  const qs = p.toString()
  return qs ? `?${qs}` : ""
}

function lista<T>(raw: any, skip: number, limit: number): ListaPaginada<T> {
  const data: T[] = Array.isArray(raw?.data) ? raw.data : []
  return { data, total: raw?.total ?? data.length, skip, limit }
}

export class SolineraService {
  // --- Red ---------------------------------------------------------------

  static async listar(estado?: string): Promise<Solinera[]> {
    const raw = await llamar(`/${query({ estado })}`)
    return raw.data ?? []
  }

  static async obtener(id: string): Promise<Solinera> {
    return (await llamar(`/${encodeURIComponent(id)}`)).data
  }

  static async crear(datos: SolineraCreateData): Promise<Solinera> {
    return (await llamar("/", { method: "POST", ...json(datos) })).data
  }

  static async actualizar(id: string, datos: SolineraUpdateData): Promise<Solinera> {
    return (await llamar(`/${encodeURIComponent(id)}`, { method: "PUT", ...json(datos) })).data
  }

  static async guardarConfiguracion(
    id: string,
    configuracion: ConfiguracionSolinera,
  ): Promise<ConfiguracionSolinera> {
    return (
      await llamar(`/${encodeURIComponent(id)}/configuracion`, { method: "PUT", ...json(configuracion) })
    ).data
  }

  // --- Puestos -----------------------------------------------------------

  static async crearPuesto(solineraId: string, datos: PuestoCreateData): Promise<Puesto> {
    return (
      await llamar(`/${encodeURIComponent(solineraId)}/puestos`, { method: "POST", ...json(datos) })
    ).data
  }

  static async actualizarPuesto(
    solineraId: string,
    puestoId: string,
    datos: PuestoUpdateData,
  ): Promise<Puesto> {
    return (
      await llamar(`/${encodeURIComponent(solineraId)}/puestos/${encodeURIComponent(puestoId)}`, {
        method: "PUT",
        ...json(datos),
      })
    ).data
  }

  /** Lo puede hacer quien atiende la solinera; poner «falla» o «fuera de servicio» exige motivo. */
  static async cambiarEstadoPuesto(
    solineraId: string,
    puestoId: string,
    estado: EstadoPuestoManual,
    motivo?: string,
  ): Promise<Puesto> {
    return (
      await llamar(
        `/${encodeURIComponent(solineraId)}/puestos/${encodeURIComponent(puestoId)}/estado`,
        { method: "POST", ...json({ estado, motivo: motivo || null }) },
      )
    ).data
  }

  // --- Tarifas -----------------------------------------------------------

  static async listarTarifas(solineraId: string): Promise<Tarifa[]> {
    return (await llamar(`/${encodeURIComponent(solineraId)}/tarifas`)).data ?? []
  }

  static async crearTarifa(solineraId: string, datos: TarifaCreateData): Promise<Tarifa> {
    return (
      await llamar(`/${encodeURIComponent(solineraId)}/tarifas`, { method: "POST", ...json(datos) })
    ).data
  }

  static async actualizarTarifa(
    solineraId: string,
    tarifaId: string,
    datos: TarifaUpdateData,
  ): Promise<Tarifa> {
    return (
      await llamar(`/${encodeURIComponent(solineraId)}/tarifas/${encodeURIComponent(tarifaId)}`, {
        method: "PUT",
        ...json(datos),
      })
    ).data
  }

  // --- Clientes y vehículos ----------------------------------------------

  static async buscarClientes(
    solineraId: string,
    q = "",
    skip = 0,
    limit = 50,
  ): Promise<ListaPaginada<ClienteSolinera>> {
    const raw = await llamar(`/${encodeURIComponent(solineraId)}/clientes${query({ q, skip, limit })}`)
    return lista<ClienteSolinera>(raw, skip, limit)
  }

  static async obtenerCliente(solineraId: string, clienteId: string): Promise<ClienteSolinera> {
    return (
      await llamar(`/${encodeURIComponent(solineraId)}/clientes/${encodeURIComponent(clienteId)}`)
    ).data
  }

  static async crearCliente(solineraId: string, datos: ClienteCreateData): Promise<ClienteSolinera> {
    return (
      await llamar(`/${encodeURIComponent(solineraId)}/clientes`, { method: "POST", ...json(datos) })
    ).data
  }

  static async actualizarCliente(
    solineraId: string,
    clienteId: string,
    datos: ClienteUpdateData,
  ): Promise<ClienteSolinera> {
    return (
      await llamar(`/${encodeURIComponent(solineraId)}/clientes/${encodeURIComponent(clienteId)}`, {
        method: "PUT",
        ...json(datos),
      })
    ).data
  }

  static async bloquearCliente(
    solineraId: string,
    clienteId: string,
    bloqueado: boolean,
    motivo?: string,
  ): Promise<ClienteSolinera> {
    return (
      await llamar(
        `/${encodeURIComponent(solineraId)}/clientes/${encodeURIComponent(clienteId)}/bloqueo`,
        { method: "POST", ...json({ bloqueado, motivo: motivo || null }) },
      )
    ).data
  }

  static async crearVehiculo(
    solineraId: string,
    clienteId: string,
    datos: VehiculoCreateData,
  ): Promise<Vehiculo> {
    return (
      await llamar(
        `/${encodeURIComponent(solineraId)}/clientes/${encodeURIComponent(clienteId)}/vehiculos`,
        { method: "POST", ...json(datos) },
      )
    ).data
  }

  static async actualizarVehiculo(
    solineraId: string,
    vehiculoId: string,
    datos: VehiculoUpdateData,
  ): Promise<Vehiculo> {
    return (
      await llamar(`/${encodeURIComponent(solineraId)}/vehiculos/${encodeURIComponent(vehiculoId)}`, {
        method: "PUT",
        ...json(datos),
      })
    ).data
  }

  // --- Panel en vivo -----------------------------------------------------

  static async panel(solineraId: string): Promise<PanelSolinera> {
    return (await llamar(`/panel/${encodeURIComponent(solineraId)}`)).data
  }

  // --- Reservas ----------------------------------------------------------

  static async disponibilidad(
    solineraId: string,
    fecha: string,
    duracionMin: number,
    tipoVehiculo: TipoVehiculo,
  ): Promise<DisponibilidadDia> {
    const qs = query({ fecha, duracion_min: duracionMin, tipo_vehiculo: tipoVehiculo })
    return (await llamar(`/${encodeURIComponent(solineraId)}/reservas/disponibilidad${qs}`)).data
  }

  static async listarReservas(
    solineraId: string,
    filtros: { fecha?: string; estado?: string } = {},
  ): Promise<ReservaSolinera[]> {
    return (await llamar(`/${encodeURIComponent(solineraId)}/reservas${query(filtros)}`)).data ?? []
  }

  static async crearReserva(solineraId: string, datos: ReservaCreateData): Promise<ReservaSolinera> {
    return (
      await llamar(`/${encodeURIComponent(solineraId)}/reservas`, { method: "POST", ...json(datos) })
    ).data
  }

  static async cancelarReserva(
    solineraId: string,
    reservaId: string,
    motivo: string,
  ): Promise<ReservaSolinera> {
    return (
      await llamar(
        `/${encodeURIComponent(solineraId)}/reservas/${encodeURIComponent(reservaId)}/cancelar`,
        { method: "POST", ...json({ motivo }) },
      )
    ).data
  }

  // --- Cargas ------------------------------------------------------------

  static async listarCargas(
    solineraId: string,
    filtros: { estado?: string; q?: string; fecha?: string; skip?: number; limit?: number } = {},
  ): Promise<ListaPaginada<Carga>> {
    const raw = await llamar(`/${encodeURIComponent(solineraId)}/cargas${query(filtros)}`)
    return lista<Carga>(raw, filtros.skip ?? 0, filtros.limit ?? 50)
  }

  static async obtenerCarga(solineraId: string, cargaId: string): Promise<Carga> {
    return (
      await llamar(`/${encodeURIComponent(solineraId)}/cargas/${encodeURIComponent(cargaId)}`)
    ).data
  }

  /** Busca por el código que lleva el ticket (o su QR). */
  static async cargaPorCodigo(solineraId: string, codigo: string): Promise<Carga> {
    return (
      await llamar(`/${encodeURIComponent(solineraId)}/cargas/codigo/${encodeURIComponent(codigo.trim())}`)
    ).data
  }

  static async iniciarCarga(solineraId: string, datos: CargaIniciarData): Promise<Carga> {
    return (
      await llamar(`/${encodeURIComponent(solineraId)}/cargas`, { method: "POST", ...json(datos) })
    ).data
  }

  /** `finCarga` (ISO) es opcional: si el vehículo terminó antes de que se marcara. */
  static async terminarCarga(
    solineraId: string,
    cargaId: string,
    opciones: { finCarga?: string; nota?: string } = {},
  ): Promise<Carga> {
    return (
      await llamar(
        `/${encodeURIComponent(solineraId)}/cargas/${encodeURIComponent(cargaId)}/terminar`,
        { method: "POST", ...json({ fin_carga: opciones.finCarga ?? null, nota: opciones.nota ?? null }) },
      )
    ).data
  }

  static async retirarCarga(solineraId: string, cargaId: string): Promise<Carga> {
    return (
      await llamar(`/${encodeURIComponent(solineraId)}/cargas/${encodeURIComponent(cargaId)}/retirar`, {
        method: "POST",
      })
    ).data
  }

  /** Requiere el permiso `solineras/anular`. */
  static async anularCarga(solineraId: string, cargaId: string, motivo: string): Promise<Carga> {
    return (
      await llamar(`/${encodeURIComponent(solineraId)}/cargas/${encodeURIComponent(cargaId)}/anular`, {
        method: "POST",
        ...json({ motivo }),
      })
    ).data
  }

  /** Ticket de 80 mm en PDF. Devuelve el archivo para abrirlo o imprimirlo. */
  static async ticketPdf(solineraId: string, cargaId: string): Promise<Blob> {
    const raw = await apiRequest<any>(
      `${BASE}/${encodeURIComponent(solineraId)}/cargas/${encodeURIComponent(cargaId)}/ticket`,
      { responseType: "blob" } as any,
    )
    if (raw instanceof Blob) return raw
    throw new Error(errorDe(raw) || "No se pudo generar el ticket")
  }

  // --- Turnos ------------------------------------------------------------

  /** null si no hay turno abierto. */
  static async turnoActual(solineraId: string): Promise<Turno | null> {
    const raw = await llamar(`/${encodeURIComponent(solineraId)}/turnos/actual`)
    return raw.data ?? null
  }

  static async listarTurnos(solineraId: string, skip = 0, limit = 30): Promise<ListaPaginada<Turno>> {
    const raw = await llamar(`/${encodeURIComponent(solineraId)}/turnos${query({ skip, limit })}`)
    return lista<Turno>(raw, skip, limit)
  }

  static async abrirTurno(solineraId: string, datos: TurnoAbrirData): Promise<Turno> {
    return (
      await llamar(`/${encodeURIComponent(solineraId)}/turnos/abrir`, { method: "POST", ...json(datos) })
    ).data
  }

  static async cerrarTurno(solineraId: string, turnoId: string, datos: TurnoCerrarData): Promise<Turno> {
    return (
      await llamar(`/${encodeURIComponent(solineraId)}/turnos/${encodeURIComponent(turnoId)}/cerrar`, {
        method: "POST",
        ...json(datos),
      })
    ).data
  }

  // --- Pagos y comprobantes ----------------------------------------------

  static async listarPagos(
    solineraId: string,
    filtros: { carga_id?: string; turno_id?: string; comprobante?: string; skip?: number; limit?: number } = {},
  ): Promise<ListaPaginada<PagoSolinera>> {
    const raw = await llamar(`/${encodeURIComponent(solineraId)}/pagos${query(filtros)}`)
    return lista<PagoSolinera>(raw, filtros.skip ?? 0, filtros.limit ?? 50)
  }

  static async registrarPago(solineraId: string, datos: PagoCreateData): Promise<PagoSolinera> {
    return (
      await llamar(`/${encodeURIComponent(solineraId)}/pagos`, { method: "POST", ...json(datos) })
    ).data
  }

  /** Sube la captura o el PDF de una transferencia (JPG, PNG, WEBP o PDF, hasta 5 MB). */
  static async subirComprobante(solineraId: string, archivo: File): Promise<{ url: string }> {
    const formulario = new FormData()
    formulario.append("archivo", archivo)
    return (
      await llamar(`/${encodeURIComponent(solineraId)}/pagos/comprobante`, {
        method: "POST",
        body: formulario,
      })
    ).data
  }

  /** URL firmada de corta vida para ver el comprobante. */
  static async urlComprobante(solineraId: string, pagoId: string): Promise<string> {
    return (
      await llamar(`/${encodeURIComponent(solineraId)}/pagos/${encodeURIComponent(pagoId)}/comprobante`)
    ).data.url
  }

  /** Requiere el permiso `solineras/anular`. */
  static async cancelarPago(solineraId: string, pagoId: string, motivo: string): Promise<PagoSolinera> {
    return (
      await llamar(`/${encodeURIComponent(solineraId)}/pagos/${encodeURIComponent(pagoId)}/cancelar`, {
        method: "POST",
        ...json({ motivo }),
      })
    ).data
  }

  /** Requiere el permiso `solineras/comprobantes`. */
  static async validarComprobante(solineraId: string, pagoId: string): Promise<PagoSolinera> {
    return (
      await llamar(
        `/${encodeURIComponent(solineraId)}/pagos/${encodeURIComponent(pagoId)}/comprobante/validar`,
        { method: "POST" },
      )
    ).data
  }

  /** Requiere el permiso `solineras/comprobantes`. */
  static async rechazarComprobante(
    solineraId: string,
    pagoId: string,
    motivo: string,
  ): Promise<PagoSolinera> {
    return (
      await llamar(
        `/${encodeURIComponent(solineraId)}/pagos/${encodeURIComponent(pagoId)}/comprobante/rechazar`,
        { method: "POST", ...json({ motivo }) },
      )
    ).data
  }
}
