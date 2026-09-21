"use client"

import { useEffect, useState, type FormEvent } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/shared/atom/button"
import { Label } from "@/components/shared/atom/label"
import { Textarea } from "@/components/shared/molecule/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/shared/molecule/radio-group"
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
import type { EstadoPuestoManual, Puesto } from "@/lib/types/feats/solineras/solinera-types"

interface Props {
  solineraId: string
  /** null = cerrado. */
  puesto: Puesto | null
  onOpenChange: (abierto: boolean) => void
  onGuardado: () => Promise<void>
}

const OPCIONES: { valor: EstadoPuestoManual; etiqueta: string; detalle: string }[] = [
  { valor: "operativo", etiqueta: "Operativo", detalle: "El puesto queda listo para recibir vehículos." },
  {
    valor: "fuera_servicio",
    etiqueta: "Fuera de servicio",
    detalle: "Detenido a propósito: mantenimiento, limpieza, obra.",
  },
  {
    valor: "falla",
    etiqueta: "En falla",
    detalle: "Algo se rompió: la toma, el breaker, el cable.",
  },
]

const MOTIVO_MIN = 3
const MOTIVO_MAX = 200

export function ConfigPuestoEstadoDialog({ solineraId, puesto, onOpenChange, onGuardado }: Props) {
  const { toast } = useToast()
  const [estado, setEstado] = useState<EstadoPuestoManual>("operativo")
  const [motivo, setMotivo] = useState("")
  const [tocado, setTocado] = useState(false)
  const [guardando, setGuardando] = useState(false)
  // Se conserva el último puesto para que el texto no desaparezca durante la animación de cierre.
  const [mostrado, setMostrado] = useState<Puesto | null>(puesto)

  useEffect(() => {
    if (!puesto) return
    setMostrado(puesto)
    setEstado(puesto.estado_manual)
    setMotivo(puesto.motivo_estado ?? "")
    setTocado(false)
  }, [puesto])

  const necesitaMotivo = estado !== "operativo"
  const texto = motivo.trim()
  const errorMotivo = necesitaMotivo && texto.length < MOTIVO_MIN
  const sinCambio = mostrado !== null && estado === mostrado.estado_manual && estado === "operativo"

  const guardar = async (evento: FormEvent) => {
    evento.preventDefault()
    if (!mostrado || guardando) return
    setTocado(true)
    if (errorMotivo || sinCambio) return
    setGuardando(true)
    try {
      await SolineraService.cambiarEstadoPuesto(
        solineraId,
        mostrado.id,
        estado,
        necesitaMotivo ? texto : undefined,
      )
      toast({
        title: "Estado del puesto actualizado",
        description: `${mostrado.codigo} · ${OPCIONES.find((o) => o.valor === estado)?.etiqueta}`,
      })
      await onGuardado()
      onOpenChange(false)
    } catch (error) {
      toast({
        title: "No se pudo cambiar el estado",
        description: error instanceof Error ? error.message : "Inténtalo de nuevo",
        variant: "destructive",
      })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialog
      open={puesto !== null}
      onOpenChange={(abierto) => {
        if (!guardando) onOpenChange(abierto)
      }}
    >
      <DialogContent className="max-w-md">
        <form onSubmit={guardar} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Estado del puesto {mostrado?.codigo}</DialogTitle>
            <DialogDescription>
              Para ponerlo fuera de servicio o en falla, el puesto no puede tener una carga en curso:
              hay que terminarla y retirar el vehículo antes.
            </DialogDescription>
          </DialogHeader>

          <RadioGroup
            value={estado}
            onValueChange={(v) => setEstado(v as EstadoPuestoManual)}
            aria-label="Estado del puesto"
          >
            {OPCIONES.map((o) => {
              const id = `puesto-estado-${o.valor}`
              return (
                <label
                  key={o.valor}
                  htmlFor={id}
                  className="flex min-h-10 cursor-pointer items-start gap-3 rounded-md border px-3 py-2.5 hover:bg-accent/50"
                >
                  <RadioGroupItem id={id} value={o.valor} className="mt-0.5" />
                  <span>
                    <span className="block text-sm font-medium">{o.etiqueta}</span>
                    <span className="block text-xs text-muted-foreground">{o.detalle}</span>
                  </span>
                </label>
              )
            })}
          </RadioGroup>

          {necesitaMotivo && (
            <div className="grid gap-1.5">
              <Label htmlFor="puesto-estado-motivo">Motivo</Label>
              <Textarea
                id="puesto-estado-motivo"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                onBlur={() => setTocado(true)}
                maxLength={MOTIVO_MAX}
                rows={2}
                placeholder="Ej.: se quemó la toma, viene el electricista el lunes"
                aria-invalid={tocado && errorMotivo}
                aria-describedby="puesto-estado-motivo-ayuda"
              />
              <p
                id="puesto-estado-motivo-ayuda"
                role={tocado && errorMotivo ? "alert" : undefined}
                className={tocado && errorMotivo ? "text-xs text-destructive" : "text-xs text-muted-foreground"}
              >
                {tocado && errorMotivo
                  ? `Escribe al menos ${MOTIVO_MIN} caracteres.`
                  : "Obligatorio: quien atienda la solinera después tiene que saber qué pasó."}
              </p>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={guardando}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={guardando || sinCambio}>
              {guardando && <Loader2 className="animate-spin" />}
              Guardar estado
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
