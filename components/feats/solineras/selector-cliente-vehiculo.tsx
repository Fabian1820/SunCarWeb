"use client"

import { useEffect, useState } from "react"
import { Ban, Check, Loader2, Plus, Search, UserRound, X } from "lucide-react"
import { Button } from "@/components/shared/atom/button"
import { Label } from "@/components/shared/atom/label"
import { Input } from "@/components/shared/molecule/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select"
import { useToast } from "@/hooks/use-toast"
import { SolineraService } from "@/lib/services/feats/solineras/solinera-service"
import { TIPOS_VEHICULO, describirVehiculo } from "@/lib/utils/solineras"
import { cn } from "@/lib/utils"
import type {
  ClienteSolinera,
  TipoVehiculo,
  Vehiculo,
} from "@/lib/types/feats/solineras/solinera-types"

interface Props {
  solineraId: string
  cliente: ClienteSolinera | null
  vehiculoId: string | null
  onChange: (cliente: ClienteSolinera | null, vehiculoId: string | null) => void
  /** Solo se ofrecen estos vehículos (p. ej. los que admite el puesto elegido). */
  tiposPermitidos?: TipoVehiculo[]
  autoFocus?: boolean
}

type Modo = "buscar" | "clienteNuevo" | "vehiculoNuevo"

/**
 * Elige al cliente y su vehículo para una carga o una reserva. Busca por nombre,
 * carné, teléfono o chapa, y permite registrar un cliente o un vehículo nuevo sin
 * salir de aquí: el cliente está esperando en el mostrador.
 */
export function SelectorClienteVehiculo({
  solineraId,
  cliente,
  vehiculoId,
  onChange,
  tiposPermitidos,
  autoFocus,
}: Props) {
  const { toast } = useToast()
  const [modo, setModo] = useState<Modo>("buscar")
  const [texto, setTexto] = useState("")
  const [resultados, setResultados] = useState<ClienteSolinera[]>([])
  const [buscando, setBuscando] = useState(false)
  const [sinResultados, setSinResultados] = useState(false)

  // Búsqueda con pausa de 250 ms al teclear, para no pedir una por letra.
  useEffect(() => {
    if (cliente || modo !== "buscar") return
    const consulta = texto.trim()
    if (consulta.length < 2) {
      setResultados([])
      setSinResultados(false)
      return
    }
    let vigente = true
    setBuscando(true)
    const temporizador = setTimeout(async () => {
      try {
        const { data } = await SolineraService.buscarClientes(solineraId, consulta, 0, 6)
        if (!vigente) return
        setResultados(data)
        setSinResultados(data.length === 0)
      } catch (error) {
        if (!vigente) return
        setResultados([])
        toast({
          title: "No se pudo buscar",
          description: error instanceof Error ? error.message : undefined,
          variant: "destructive",
        })
      } finally {
        if (vigente) setBuscando(false)
      }
    }, 250)
    return () => {
      vigente = false
      clearTimeout(temporizador)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto, cliente, modo, solineraId])

  const elegir = (elegido: ClienteSolinera) => {
    const utiles = vehiculosUtiles(elegido.vehiculos, tiposPermitidos)
    onChange(elegido, utiles.length === 1 ? utiles[0].id : null)
    setTexto("")
    setResultados([])
    if (utiles.length === 0) setModo("vehiculoNuevo")
  }

  const cambiarCliente = () => {
    onChange(null, null)
    setModo("buscar")
  }

  // --- Cliente elegido -------------------------------------------------------
  if (cliente) {
    const utiles = vehiculosUtiles(cliente.vehiculos, tiposPermitidos)
    return (
      <div className="grid gap-3">
        <div className="flex items-start justify-between gap-3 rounded-lg border bg-muted/40 p-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 font-medium">
              <UserRound className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{cliente.nombre}</span>
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {[cliente.telefono, cliente.carnet_identidad].filter(Boolean).join(" · ") || "Sin teléfono ni carné"}
            </p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={cambiarCliente}>
            Cambiar
          </Button>
        </div>

        {cliente.bloqueado && (
          <p className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <Ban className="mt-0.5 h-4 w-4 shrink-0" />
            Cliente bloqueado{cliente.motivo_bloqueo ? `: ${cliente.motivo_bloqueo}` : ""}. No se le puede cargar
            ni reservar.
          </p>
        )}

        {modo === "vehiculoNuevo" ? (
          <FormularioVehiculo
            solineraId={solineraId}
            cliente={cliente}
            tiposPermitidos={tiposPermitidos}
            onCancelar={utiles.length > 0 ? () => setModo("buscar") : undefined}
            onCreado={(actualizado, vehiculo) => {
              onChange(actualizado, vehiculo.id)
              setModo("buscar")
            }}
          />
        ) : (
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm font-medium">Vehículo</legend>
            {utiles.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Este cliente no tiene ningún vehículo
                {tiposPermitidos?.length ? " que admita ese puesto" : ""}.
              </p>
            )}
            {utiles.map((v) => {
              const activo = v.id === vehiculoId
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => onChange(cliente, v.id)}
                  aria-pressed={activo}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-lg border p-3 text-left text-sm transition-colors",
                    activo ? "border-primary bg-primary/5" : "hover:border-primary/50",
                  )}
                >
                  <span>
                    {describirVehiculo(v)}
                    {v.voltaje_v && v.capacidad_ah ? (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {v.voltaje_v} V · {v.capacidad_ah} Ah
                      </span>
                    ) : null}
                  </span>
                  {activo && <Check className="h-4 w-4 shrink-0 text-primary" />}
                </button>
              )
            })}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={() => setModo("vehiculoNuevo")}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Añadir vehículo
            </Button>
          </fieldset>
        )}
      </div>
    )
  }

  // --- Registrar un cliente nuevo -------------------------------------------
  if (modo === "clienteNuevo") {
    return (
      <FormularioCliente
        solineraId={solineraId}
        nombreInicial={texto}
        onCancelar={() => setModo("buscar")}
        onCreado={(nuevo) => {
          onChange(nuevo, null)
          setTexto("")
          setModo("vehiculoNuevo")
        }}
      />
    )
  }

  // --- Buscar ---------------------------------------------------------------
  return (
    <div className="grid gap-2">
      <Label htmlFor="sol-buscar-cliente">Cliente</Label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="sol-buscar-cliente"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Nombre, carné, teléfono o chapa"
          className="pl-9"
          autoComplete="off"
          autoFocus={autoFocus}
        />
        {buscando && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {resultados.length > 0 && (
        <ul className="overflow-hidden rounded-lg border">
          {resultados.map((r) => (
            <li key={r.id} className="border-b last:border-b-0">
              <button
                type="button"
                onClick={() => elegir(r)}
                className="flex w-full items-start justify-between gap-3 p-3 text-left text-sm hover:bg-muted/50"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{r.nombre}</span>
                  <span className="block text-xs text-muted-foreground">
                    {[r.telefono, r.carnet_identidad].filter(Boolean).join(" · ") || "Sin teléfono ni carné"}
                  </span>
                </span>
                <span className="shrink-0 text-right text-xs text-muted-foreground">
                  {r.bloqueado ? (
                    <span className="font-medium text-red-700">Bloqueado</span>
                  ) : (
                    r.vehiculos.map((v) => v.chapa || describirVehiculo(v)).join(", ")
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {sinResultados && !buscando && (
        <p className="text-sm text-muted-foreground">No hay ningún cliente que coincida con «{texto.trim()}».</p>
      )}

      <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => setModo("clienteNuevo")}>
        <Plus className="mr-1.5 h-4 w-4" />
        Registrar cliente nuevo
      </Button>
    </div>
  )
}

function vehiculosUtiles(vehiculos: Vehiculo[], permitidos?: TipoVehiculo[]): Vehiculo[] {
  return permitidos?.length ? vehiculos.filter((v) => permitidos.includes(v.tipo)) : vehiculos
}

// --- Alta rápida de cliente ---------------------------------------------------

function FormularioCliente({
  solineraId,
  nombreInicial,
  onCancelar,
  onCreado,
}: {
  solineraId: string
  nombreInicial: string
  onCancelar: () => void
  onCreado: (cliente: ClienteSolinera) => void
}) {
  const { toast } = useToast()
  const [nombre, setNombre] = useState(/\d{4,}/.test(nombreInicial) ? "" : nombreInicial.trim())
  const [telefono, setTelefono] = useState("")
  const [carnet, setCarnet] = useState("")
  const [guardando, setGuardando] = useState(false)

  // El backend rechaza un teléfono o un carné demasiado cortos: se avisa antes de enviar.
  const telefonoInvalido = telefono.trim() !== "" && telefono.replace(/\D/g, "").length < 6
  const carnetInvalido = carnet.trim() !== "" && carnet.replace(/[\s-]/g, "").length < 5

  const guardar = async () => {
    setGuardando(true)
    try {
      const nuevo = await SolineraService.crearCliente(solineraId, {
        nombre: nombre.trim(),
        telefono: telefono.trim() || null,
        carnet_identidad: carnet.trim() || null,
      })
      onCreado(nuevo)
    } catch (error) {
      toast({
        title: "No se pudo registrar al cliente",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="grid gap-3 rounded-lg border p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Cliente nuevo</p>
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onCancelar} aria-label="Cancelar">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="sol-cli-nombre">Nombre</Label>
        <Input id="sol-cli-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} autoFocus />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="sol-cli-tel">Teléfono</Label>
          <Input
            id="sol-cli-tel"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            inputMode="tel"
            aria-invalid={telefonoInvalido}
          />
          {telefonoInvalido && <p className="text-xs text-destructive">Muy corto: mínimo 6 dígitos.</p>}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="sol-cli-ci">Carné de identidad</Label>
          <Input
            id="sol-cli-ci"
            value={carnet}
            onChange={(e) => setCarnet(e.target.value)}
            inputMode="numeric"
            aria-invalid={carnetInvalido}
          />
          {carnetInvalido && <p className="text-xs text-destructive">Muy corto: mínimo 5 caracteres.</p>}
        </div>
      </div>
      <Button
        type="button"
        onClick={guardar}
        disabled={nombre.trim().length < 2 || telefonoInvalido || carnetInvalido || guardando}
      >
        {guardando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Registrar y continuar
      </Button>
    </div>
  )
}

// --- Alta rápida de vehículo --------------------------------------------------

function FormularioVehiculo({
  solineraId,
  cliente,
  tiposPermitidos,
  onCancelar,
  onCreado,
}: {
  solineraId: string
  cliente: ClienteSolinera
  tiposPermitidos?: TipoVehiculo[]
  onCancelar?: () => void
  onCreado: (cliente: ClienteSolinera, vehiculo: Vehiculo) => void
}) {
  const { toast } = useToast()
  const tipos = tiposPermitidos?.length
    ? TIPOS_VEHICULO.filter((t) => tiposPermitidos.includes(t.value))
    : TIPOS_VEHICULO
  const [tipo, setTipo] = useState<TipoVehiculo | "">(tipos.length === 1 ? tipos[0].value : "")
  const [marca, setMarca] = useState("")
  const [modelo, setModelo] = useState("")
  const [chapa, setChapa] = useState("")
  const [voltaje, setVoltaje] = useState("")
  const [amperios, setAmperios] = useState("")
  const [guardando, setGuardando] = useState(false)

  const numero = (valor: string) => (valor.trim() === "" ? null : Number(valor))

  const guardar = async () => {
    if (!tipo) return
    setGuardando(true)
    try {
      const vehiculo = await SolineraService.crearVehiculo(solineraId, cliente.id, {
        tipo,
        marca: marca.trim() || null,
        modelo: modelo.trim() || null,
        chapa: chapa.trim() || null,
        voltaje_v: numero(voltaje),
        capacidad_ah: numero(amperios),
      })
      onCreado({ ...cliente, vehiculos: [...cliente.vehiculos, vehiculo] }, vehiculo)
    } catch (error) {
      toast({
        title: "No se pudo registrar el vehículo",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      })
    } finally {
      setGuardando(false)
    }
  }

  const voltajeInvalido = voltaje !== "" && !(Number(voltaje) > 0)
  const amperiosInvalido = amperios !== "" && !(Number(amperios) > 0)

  return (
    <div className="grid gap-3 rounded-lg border p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Vehículo nuevo</p>
        {onCancelar && (
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onCancelar} aria-label="Cancelar">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label>Tipo</Label>
          <Select value={tipo} onValueChange={(v) => setTipo(v as TipoVehiculo)}>
            <SelectTrigger>
              <SelectValue placeholder="Elige el tipo" />
            </SelectTrigger>
            <SelectContent>
              {tipos.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="sol-veh-chapa">Chapa</Label>
          <Input id="sol-veh-chapa" value={chapa} onChange={(e) => setChapa(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="sol-veh-marca">Marca</Label>
          <Input id="sol-veh-marca" value={marca} onChange={(e) => setMarca(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="sol-veh-modelo">Modelo</Label>
          <Input id="sol-veh-modelo" value={modelo} onChange={(e) => setModelo(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="sol-veh-v">Voltaje (V)</Label>
          <Input
            id="sol-veh-v"
            type="number"
            min={0}
            value={voltaje}
            onChange={(e) => setVoltaje(e.target.value)}
            placeholder="60 o 72"
            aria-invalid={voltajeInvalido}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="sol-veh-ah">Capacidad (Ah)</Label>
          <Input
            id="sol-veh-ah"
            type="number"
            min={0}
            value={amperios}
            onChange={(e) => setAmperios(e.target.value)}
            aria-invalid={amperiosInvalido}
          />
        </div>
      </div>
      <Button type="button" onClick={guardar} disabled={!tipo || voltajeInvalido || amperiosInvalido || guardando}>
        {guardando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Añadir vehículo
      </Button>
    </div>
  )
}
