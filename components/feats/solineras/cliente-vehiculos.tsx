"use client"

import { useState, type FormEvent } from "react"
import { Loader2, Pencil, Plus } from "lucide-react"
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
import type { ClienteSolinera, TipoVehiculo, Vehiculo } from "@/lib/types/feats/solineras/solinera-types"

interface Props {
  solineraId: string
  cliente: ClienteSolinera
  /** Devuelve la lista de vehículos ya con el cambio hecho. */
  onVehiculos: (vehiculos: Vehiculo[]) => void
}

const NUEVO = "nuevo"

export function formatearKwh(kwh: number): string {
  return `${new Intl.NumberFormat("es-CU", { maximumFractionDigits: 2 }).format(kwh)} kWh`
}

/** "60 V · 20 Ah · 1,2 kWh", con lo que haya. */
function detalleElectrico(v: Vehiculo): string {
  return [
    v.voltaje_v ? `${v.voltaje_v} V` : null,
    v.capacidad_ah ? `${v.capacidad_ah} Ah` : null,
    v.kwh_estimados ? formatearKwh(v.kwh_estimados) : null,
  ]
    .filter(Boolean)
    .join(" · ")
}

/** Los vehículos de un cliente: lista, edición de cada uno y alta de uno nuevo. */
export function ClienteVehiculos({ solineraId, cliente, onVehiculos }: Props) {
  const [editando, setEditando] = useState<string | null>(null)

  return (
    <section className="grid gap-2" aria-labelledby="cli-vehiculos">
      <div className="flex items-center justify-between gap-2">
        <h3 id="cli-vehiculos" className="text-sm font-semibold">
          Vehículos
        </h3>
        {editando !== NUEVO && (
          <Button type="button" variant="outline" size="sm" className="h-10" onClick={() => setEditando(NUEVO)}>
            <Plus />
            Añadir vehículo
          </Button>
        )}
      </div>

      {cliente.vehiculos.length === 0 && editando !== NUEVO && (
        <p className="text-sm text-muted-foreground">
          Este cliente aún no tiene vehículos. Sin un vehículo no se le puede cargar ni reservar.
        </p>
      )}

      {cliente.vehiculos.length > 0 && (
        <ul className="divide-y rounded-lg border">
          {cliente.vehiculos.map((v) =>
            editando === v.id ? (
              <li key={v.id} className="p-3">
                <FormularioVehiculo
                  solineraId={solineraId}
                  clienteId={cliente.id}
                  vehiculo={v}
                  onCancelar={() => setEditando(null)}
                  onGuardado={(actualizado) => {
                    onVehiculos(cliente.vehiculos.map((x) => (x.id === actualizado.id ? actualizado : x)))
                    setEditando(null)
                  }}
                />
              </li>
            ) : (
              <li key={v.id} className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{describirVehiculo(v)}</p>
                  {detalleElectrico(v) && (
                    <p className="text-xs tabular-nums text-muted-foreground">{detalleElectrico(v)}</p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={() => setEditando(v.id)}
                  aria-label={`Editar el vehículo ${describirVehiculo(v)}`}
                >
                  <Pencil />
                </Button>
              </li>
            ),
          )}
        </ul>
      )}

      {editando === NUEVO && (
        <div className="rounded-lg border p-3">
          <FormularioVehiculo
            solineraId={solineraId}
            clienteId={cliente.id}
            vehiculo={null}
            onCancelar={() => setEditando(null)}
            onGuardado={(nuevo) => {
              onVehiculos([...cliente.vehiculos, nuevo])
              setEditando(null)
            }}
          />
        </div>
      )}
    </section>
  )
}

/** "60" y "12,5" valen; en el mostrador se teclea con coma. */
function parsearDecimal(texto: string): number | null {
  const limpio = texto.trim().replace(",", ".")
  return /^\d+(\.\d+)?$/.test(limpio) ? Number(limpio) : null
}

function FormularioVehiculo({
  solineraId,
  clienteId,
  vehiculo,
  onCancelar,
  onGuardado,
}: {
  solineraId: string
  clienteId: string
  /** null = vehículo nuevo. */
  vehiculo: Vehiculo | null
  onCancelar: () => void
  onGuardado: (vehiculo: Vehiculo) => void
}) {
  const { toast } = useToast()
  const editando = vehiculo !== null
  const [tipo, setTipo] = useState<TipoVehiculo | "">(vehiculo?.tipo ?? "")
  const [chapa, setChapa] = useState(vehiculo?.chapa ?? "")
  const [marca, setMarca] = useState(vehiculo?.marca ?? "")
  const [modelo, setModelo] = useState(vehiculo?.modelo ?? "")
  const [voltaje, setVoltaje] = useState(vehiculo?.voltaje_v ? String(vehiculo.voltaje_v) : "")
  const [amperios, setAmperios] = useState(vehiculo?.capacidad_ah ? String(vehiculo.capacidad_ah) : "")
  const [guardando, setGuardando] = useState(false)

  const voltajeNum = parsearDecimal(voltaje)
  const amperiosNum = parsearDecimal(amperios)

  // El backend no permite quitar el voltaje ni la capacidad una vez puestos (un valor vacío
  // se ignora): se pide un valor en vez de aparentar que se borró.
  const validar = (texto: string, numero: number | null, maximo: number, previo: number | null | undefined) => {
    if (texto.trim() === "") {
      return previo ? "Una vez registrado no se puede dejar vacío: escribe el valor correcto." : null
    }
    if (numero === null || numero <= 0) return "Escribe un número mayor que cero."
    if (numero > maximo) return `El máximo es ${maximo}.`
    return null
  }
  const errorVoltaje = validar(voltaje, voltajeNum, 1000, vehiculo?.voltaje_v)
  const errorAmperios = validar(amperios, amperiosNum, 2000, vehiculo?.capacidad_ah)

  const kwh = voltajeNum && amperiosNum && !errorVoltaje && !errorAmperios
    ? Math.round((voltajeNum * amperiosNum) / 10) / 100
    : null

  const puedeGuardar = tipo !== "" && !errorVoltaje && !errorAmperios && !guardando

  const guardar = async (evento: FormEvent) => {
    evento.preventDefault()
    if (tipo === "" || !puedeGuardar) return
    setGuardando(true)
    try {
      const resultado = vehiculo
        ? await SolineraService.actualizarVehiculo(solineraId, vehiculo.id, {
            tipo,
            // Vacío ("") limpia el campo en el backend; null lo dejaría como estaba.
            chapa: chapa.trim(),
            marca: marca.trim(),
            modelo: modelo.trim(),
            ...(voltajeNum !== null ? { voltaje_v: voltajeNum } : {}),
            ...(amperiosNum !== null ? { capacidad_ah: amperiosNum } : {}),
          })
        : await SolineraService.crearVehiculo(solineraId, clienteId, {
            tipo,
            chapa: chapa.trim() || null,
            marca: marca.trim() || null,
            modelo: modelo.trim() || null,
            voltaje_v: voltajeNum,
            capacidad_ah: amperiosNum,
          })
      toast({ title: editando ? "Vehículo actualizado" : "Vehículo añadido" })
      onGuardado(resultado)
    } catch (error) {
      toast({
        title: editando ? "No se pudo actualizar el vehículo" : "No se pudo añadir el vehículo",
        description: error instanceof Error ? error.message : "Inténtalo de nuevo",
        variant: "destructive",
      })
    } finally {
      setGuardando(false)
    }
  }

  const prefijo = vehiculo ? `veh-${vehiculo.id}` : "veh-nuevo"

  return (
    <form onSubmit={guardar} noValidate className="grid gap-3">
      <p className="text-sm font-medium">{editando ? "Editar vehículo" : "Vehículo nuevo"}</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor={`${prefijo}-tipo`}>Tipo</Label>
          <Select value={tipo} onValueChange={(v) => setTipo(v as TipoVehiculo)}>
            <SelectTrigger id={`${prefijo}-tipo`}>
              <SelectValue placeholder="Elige el tipo" />
            </SelectTrigger>
            <SelectContent>
              {TIPOS_VEHICULO.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${prefijo}-chapa`}>Chapa</Label>
          <Input
            id={`${prefijo}-chapa`}
            value={chapa}
            onChange={(e) => setChapa(e.target.value)}
            maxLength={20}
            autoComplete="off"
            className="uppercase"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${prefijo}-marca`}>Marca</Label>
          <Input
            id={`${prefijo}-marca`}
            value={marca}
            onChange={(e) => setMarca(e.target.value)}
            maxLength={40}
            autoComplete="off"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${prefijo}-modelo`}>Modelo</Label>
          <Input
            id={`${prefijo}-modelo`}
            value={modelo}
            onChange={(e) => setModelo(e.target.value)}
            maxLength={40}
            autoComplete="off"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${prefijo}-v`}>Voltaje (V)</Label>
          <Input
            id={`${prefijo}-v`}
            value={voltaje}
            onChange={(e) => setVoltaje(e.target.value)}
            inputMode="decimal"
            placeholder="60 o 72"
            autoComplete="off"
            className="tabular-nums"
            aria-invalid={errorVoltaje !== null}
          />
          {errorVoltaje && <p className="text-xs text-destructive">{errorVoltaje}</p>}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${prefijo}-ah`}>Capacidad (Ah)</Label>
          <Input
            id={`${prefijo}-ah`}
            value={amperios}
            onChange={(e) => setAmperios(e.target.value)}
            inputMode="decimal"
            autoComplete="off"
            className="tabular-nums"
            aria-invalid={errorAmperios !== null}
          />
          {errorAmperios && <p className="text-xs text-destructive">{errorAmperios}</p>}
        </div>
      </div>

      <p className="text-xs tabular-nums text-muted-foreground" aria-live="polite">
        {kwh !== null
          ? `Batería estimada: ${formatearKwh(kwh)}`
          : "Con el voltaje y la capacidad se estiman los kWh de la batería."}
      </p>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancelar} disabled={guardando}>
          Cancelar
        </Button>
        <Button type="submit" disabled={!puedeGuardar}>
          {guardando && <Loader2 className="animate-spin" />}
          {editando ? "Guardar vehículo" : "Añadir vehículo"}
        </Button>
      </div>
    </form>
  )
}
