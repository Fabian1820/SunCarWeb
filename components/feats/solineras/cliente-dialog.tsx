"use client"

import { useState, type FormEvent } from "react"
import { Ban, Loader2 } from "lucide-react"
import { Button } from "@/components/shared/atom/button"
import { Label } from "@/components/shared/atom/label"
import { Input } from "@/components/shared/molecule/input"
import { Textarea } from "@/components/shared/molecule/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog"
import { useToast } from "@/hooks/use-toast"
import { SolineraService } from "@/lib/services/feats/solineras/solinera-service"
import type { ClienteSolinera } from "@/lib/types/feats/solineras/solinera-types"
import { ClienteVehiculos } from "./cliente-vehiculos"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  solineraId: string
  /** null = registrar un cliente nuevo. */
  cliente: ClienteSolinera | null
  /** Algo cambió (alta, edición, vehículos, bloqueo): la lista debe recargarse. */
  onCambio: () => void
}

export function ClienteDialog({ open, onOpenChange, solineraId, cliente, onCambio }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* El contenido solo existe con el diálogo abierto: cada apertura arranca desde el cliente elegido. */}
      <DialogContent className="max-w-lg">
        <Contenido
          solineraId={solineraId}
          inicial={cliente}
          onCambio={onCambio}
          onCerrar={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

function Contenido({
  solineraId,
  inicial,
  onCambio,
  onCerrar,
}: {
  solineraId: string
  inicial: ClienteSolinera | null
  onCambio: () => void
  onCerrar: () => void
}) {
  // Tras registrar un cliente el diálogo pasa a su ficha, para añadirle el vehículo enseguida.
  const [actual, setActual] = useState<ClienteSolinera | null>(inicial)

  const cambiar = (cliente: ClienteSolinera) => {
    setActual(cliente)
    onCambio()
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{actual ? actual.nombre : "Nuevo cliente"}</DialogTitle>
        <DialogDescription>
          {actual
            ? "Sus datos, sus vehículos y si puede cargar o reservar."
            : "Después de registrarlo podrás añadirle sus vehículos."}
        </DialogDescription>
      </DialogHeader>

      {actual?.bloqueado && (
        <p
          role="status"
          className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          <Ban className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Cliente bloqueado{actual.motivo_bloqueo ? `: ${actual.motivo_bloqueo}` : ""}. No puede cargar ni
            reservar hasta que se le desbloquee.
          </span>
        </p>
      )}

      <DatosCliente solineraId={solineraId} cliente={actual} onGuardado={cambiar} onCancelar={onCerrar} />

      {actual && (
        <>
          <ClienteVehiculos
            solineraId={solineraId}
            cliente={actual}
            onVehiculos={(vehiculos) => cambiar({ ...actual, vehiculos })}
          />
          <BloqueoCliente solineraId={solineraId} cliente={actual} onCambiado={cambiar} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCerrar}>
              Cerrar
            </Button>
          </DialogFooter>
        </>
      )}
    </>
  )
}

// --- Datos ---------------------------------------------------------------------

function DatosCliente({
  solineraId,
  cliente,
  onGuardado,
  onCancelar,
}: {
  solineraId: string
  cliente: ClienteSolinera | null
  onGuardado: (cliente: ClienteSolinera) => void
  onCancelar: () => void
}) {
  const { toast } = useToast()
  const editando = cliente !== null
  const [nombre, setNombre] = useState(cliente?.nombre ?? "")
  const [telefono, setTelefono] = useState(cliente?.telefono ?? "")
  const [carnet, setCarnet] = useState(cliente?.carnet_identidad ?? "")
  const [direccion, setDireccion] = useState(cliente?.direccion ?? "")
  const [nota, setNota] = useState(cliente?.nota ?? "")
  const [guardando, setGuardando] = useState(false)

  // Las mismas reglas del backend: un 422 dispara un aviso global poco amable.
  const errorNombre = nombre.trim().length >= 2 ? null : "Escribe el nombre (al menos 2 letras)."
  const errorTelefono =
    telefono.trim() !== "" && telefono.replace(/\D/g, "").length < 6
      ? "El teléfono necesita al menos 6 dígitos."
      : null
  const errorCarnet =
    carnet.trim() !== "" && carnet.replace(/[\s-]/g, "").length < 5
      ? "El carné necesita al menos 5 caracteres."
      : null

  const cambiado =
    !cliente ||
    nombre.trim() !== cliente.nombre ||
    telefono.trim() !== (cliente.telefono ?? "") ||
    carnet.trim() !== (cliente.carnet_identidad ?? "") ||
    direccion.trim() !== (cliente.direccion ?? "") ||
    nota.trim() !== (cliente.nota ?? "")

  const puedeGuardar = !errorNombre && !errorTelefono && !errorCarnet && cambiado && !guardando

  /** El backend normaliza el teléfono y el carné (sin espacios ni guiones): el formulario muestra lo guardado. */
  const sembrar = (guardado: ClienteSolinera) => {
    setNombre(guardado.nombre)
    setTelefono(guardado.telefono ?? "")
    setCarnet(guardado.carnet_identidad ?? "")
    setDireccion(guardado.direccion ?? "")
    setNota(guardado.nota ?? "")
  }

  const guardar = async (evento: FormEvent) => {
    evento.preventDefault()
    if (!puedeGuardar) return
    setGuardando(true)
    try {
      if (cliente) {
        // En la edición se envía "" (no null) para vaciar un campo: el backend ignora los null.
        const actualizado = await SolineraService.actualizarCliente(solineraId, cliente.id, {
          nombre: nombre.trim(),
          telefono: telefono.trim(),
          carnet_identidad: carnet.trim(),
          direccion: direccion.trim(),
          nota: nota.trim(),
        })
        sembrar(actualizado)
        toast({ title: "Cliente actualizado" })
        onGuardado(actualizado)
      } else {
        const nuevo = await SolineraService.crearCliente(solineraId, {
          nombre: nombre.trim(),
          telefono: telefono.trim() || null,
          carnet_identidad: carnet.trim() || null,
          direccion: direccion.trim() || null,
          nota: nota.trim() || null,
        })
        sembrar(nuevo)
        toast({ title: "Cliente registrado", description: nuevo.nombre })
        onGuardado(nuevo)
      }
    } catch (error) {
      toast({
        title: editando ? "No se pudo actualizar al cliente" : "No se pudo registrar al cliente",
        description: error instanceof Error ? error.message : "Inténtalo de nuevo",
        variant: "destructive",
      })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form onSubmit={guardar} noValidate className="grid gap-3" aria-label="Datos del cliente">
      {editando && <h3 className="text-sm font-semibold">Datos</h3>}

      <div className="grid gap-1.5">
        <Label htmlFor="cli-nombre">Nombre</Label>
        <Input
          id="cli-nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          maxLength={100}
          autoComplete="off"
          autoFocus={!editando}
          aria-invalid={nombre !== "" && errorNombre !== null}
        />
        {nombre !== "" && errorNombre && <p className="text-xs text-destructive">{errorNombre}</p>}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="cli-telefono">Teléfono</Label>
          <Input
            id="cli-telefono"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            inputMode="tel"
            maxLength={30}
            autoComplete="off"
            className="tabular-nums"
            aria-invalid={errorTelefono !== null}
          />
          {errorTelefono && <p className="text-xs text-destructive">{errorTelefono}</p>}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="cli-carnet">Carné de identidad</Label>
          <Input
            id="cli-carnet"
            value={carnet}
            onChange={(e) => setCarnet(e.target.value)}
            inputMode="numeric"
            maxLength={20}
            autoComplete="off"
            className="tabular-nums"
            aria-invalid={errorCarnet !== null}
          />
          {errorCarnet && <p className="text-xs text-destructive">{errorCarnet}</p>}
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="cli-direccion">Dirección</Label>
        <Input
          id="cli-direccion"
          value={direccion}
          onChange={(e) => setDireccion(e.target.value)}
          maxLength={200}
          autoComplete="off"
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="cli-nota">Nota</Label>
        <Textarea
          id="cli-nota"
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          maxLength={300}
          rows={2}
        />
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {!editando && (
          <Button type="button" variant="outline" onClick={onCancelar} disabled={guardando}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={!puedeGuardar}>
          {guardando && <Loader2 className="animate-spin" />}
          {editando ? "Guardar cambios" : "Registrar cliente"}
        </Button>
      </div>
    </form>
  )
}

// --- Bloqueo -------------------------------------------------------------------

function BloqueoCliente({
  solineraId,
  cliente,
  onCambiado,
}: {
  solineraId: string
  cliente: ClienteSolinera
  onCambiado: (cliente: ClienteSolinera) => void
}) {
  const { toast } = useToast()
  const [pidiendoMotivo, setPidiendoMotivo] = useState(false)
  const [motivo, setMotivo] = useState("")
  const [procesando, setProcesando] = useState(false)

  const motivoValido = motivo.trim().length >= 3

  const cambiarBloqueo = async (bloqueado: boolean) => {
    setProcesando(true)
    try {
      const actualizado = await SolineraService.bloquearCliente(
        solineraId,
        cliente.id,
        bloqueado,
        bloqueado ? motivo.trim() : undefined,
      )
      toast({ title: bloqueado ? "Cliente bloqueado" : "Cliente desbloqueado", description: cliente.nombre })
      setPidiendoMotivo(false)
      setMotivo("")
      onCambiado(actualizado)
    } catch (error) {
      toast({
        title: bloqueado ? "No se pudo bloquear al cliente" : "No se pudo desbloquear al cliente",
        description: error instanceof Error ? error.message : "Inténtalo de nuevo",
        variant: "destructive",
      })
    } finally {
      setProcesando(false)
    }
  }

  return (
    <section className="grid gap-2 border-t pt-4" aria-labelledby="cli-acceso">
      <h3 id="cli-acceso" className="text-sm font-semibold">
        Acceso
      </h3>

      {cliente.bloqueado ? (
        <>
          <p className="text-sm text-muted-foreground">
            Mientras esté bloqueado no puede cargar ni reservar en esta solinera. Sus datos y vehículos se
            conservan.
          </p>
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-fit"
            onClick={() => void cambiarBloqueo(false)}
            disabled={procesando}
          >
            {procesando && <Loader2 className="animate-spin" />}
            Desbloquear cliente
          </Button>
        </>
      ) : pidiendoMotivo ? (
        <form
          className="grid gap-2"
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            if (motivoValido && !procesando) void cambiarBloqueo(true)
          }}
        >
          <Label htmlFor="cli-motivo">Motivo del bloqueo</Label>
          <Input
            id="cli-motivo"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            maxLength={200}
            autoComplete="off"
            autoFocus
            placeholder="Por qué no debe cargar ni reservar"
          />
          <p className="text-xs text-muted-foreground">
            Un cliente bloqueado no puede cargar ni reservar en esta solinera. El motivo queda a la vista de
            quien lo atienda.
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setPidiendoMotivo(false)
                setMotivo("")
              }}
              disabled={procesando}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="destructive" disabled={!motivoValido || procesando}>
              {procesando && <Loader2 className="animate-spin" />}
              Bloquear cliente
            </Button>
          </div>
        </form>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Un cliente bloqueado no puede cargar ni reservar en esta solinera. Hay que indicar el motivo.
          </p>
          <Button
            type="button"
            variant="outline"
            className="w-full border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 sm:w-fit"
            onClick={() => setPidiendoMotivo(true)}
          >
            <Ban />
            Bloquear cliente
          </Button>
        </>
      )}
    </section>
  )
}
