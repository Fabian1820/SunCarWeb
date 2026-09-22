"use client"

import { useEffect, useState, type FormEvent } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/shared/atom/button"
import { Label } from "@/components/shared/atom/label"
import { Input } from "@/components/shared/molecule/input"
import { Textarea } from "@/components/shared/molecule/textarea"
import { Checkbox } from "@/components/shared/molecule/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select"
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
import { TIPOS_TOMA, TIPOS_VEHICULO } from "@/lib/utils/solineras"
import type { Puesto, TipoToma, TipoVehiculo } from "@/lib/types/feats/solineras/solinera-types"
import { Campo, descripcionDe } from "./config-comun"

/** "nuevo" = crear; un puesto = editarlo; null = cerrado. */
export type ModoPuesto = Puesto | "nuevo" | null

interface Props {
  solineraId: string
  /** Los puestos que ya existen: sirven para avisar de un código repetido antes de enviar. */
  puestos: Puesto[]
  modo: ModoPuesto
  onOpenChange: (abierto: boolean) => void
  onGuardado: () => Promise<void>
}

const POTENCIA_MAX = 500

interface Borrador {
  codigo: string
  nombre: string
  tipoToma: TipoToma
  potencia: string
  tipos: TipoVehiculo[]
  nota: string
}

const borradorDe = (modo: ModoPuesto): Borrador =>
  modo && modo !== "nuevo"
    ? {
        codigo: modo.codigo,
        nombre: modo.nombre ?? "",
        tipoToma: modo.tipo_toma,
        potencia: modo.potencia_max_kw != null ? String(modo.potencia_max_kw) : "",
        tipos: modo.tipos_vehiculo,
        nota: modo.nota ?? "",
      }
    : { codigo: "", nombre: "", tipoToma: "220V", potencia: "", tipos: [], nota: "" }

export function ConfigPuestoDialog({ solineraId, puestos, modo, onOpenChange, onGuardado }: Props) {
  const { toast } = useToast()
  const [form, setForm] = useState<Borrador>(() => borradorDe(modo))
  const [intentado, setIntentado] = useState(false)
  const [guardando, setGuardando] = useState(false)
  // Se conserva el último modo para que el formulario no cambie durante la animación de cierre.
  const [mostrado, setMostrado] = useState<ModoPuesto>(modo)

  useEffect(() => {
    if (modo === null) return
    setMostrado(modo)
    setForm(borradorDe(modo))
    setIntentado(false)
  }, [modo])

  const editando = mostrado !== null && mostrado !== "nuevo" ? mostrado : null
  const cambiar = <K extends keyof Borrador>(campo: K, valor: Borrador[K]) =>
    setForm((f) => ({ ...f, [campo]: valor }))

  // --- Validación (los límites son los del backend) ---
  const codigo = form.codigo.trim()
  let errorCodigo: string | undefined
  if (!editando && codigo) {
    if (codigo.length > 20) errorCodigo = "Como máximo 20 caracteres."
    else if (puestos.some((p) => p.codigo.toUpperCase() === codigo.toUpperCase()))
      errorCodigo = `Ya existe un puesto con el código ${codigo.toUpperCase()}.`
  }

  const textoPotencia = form.potencia.trim().replace(",", ".")
  const potencia = textoPotencia === "" ? null : Number(textoPotencia)
  let errorPotencia: string | undefined
  if (potencia === null) {
    // El backend ignora los null al editar: una potencia ya fijada no se puede vaciar.
    if (editando && editando.potencia_max_kw != null)
      errorPotencia = "Una vez fijada, la potencia no se puede dejar vacía. Escribe un valor mayor que 0."
  } else if (!Number.isFinite(potencia) || potencia <= 0 || potencia > POTENCIA_MAX) {
    errorPotencia = `Escribe un valor mayor que 0 y hasta ${POTENCIA_MAX} kW.`
  }

  const hayErrores = Boolean(errorCodigo || errorPotencia)

  const alternarTipo = (tipo: TipoVehiculo, marcado: boolean) =>
    cambiar(
      "tipos",
      TIPOS_VEHICULO.map((t) => t.value).filter((t) =>
        t === tipo ? marcado : form.tipos.includes(t),
      ),
    )

  const guardar = async (evento: FormEvent) => {
    evento.preventDefault()
    if (guardando) return
    setIntentado(true)
    if (hayErrores) return
    setGuardando(true)
    try {
      if (editando) {
        await SolineraService.actualizarPuesto(solineraId, editando.id, {
          // Texto vacío (no null) para vaciar: el backend ignora los null.
          nombre: form.nombre.trim(),
          tipo_toma: form.tipoToma,
          tipos_vehiculo: form.tipos,
          nota: form.nota.trim(),
          ...(potencia !== null ? { potencia_max_kw: potencia } : {}),
        })
        toast({ title: "Puesto actualizado", description: editando.codigo })
      } else {
        const creado = await SolineraService.crearPuesto(solineraId, {
          codigo: codigo || null,
          nombre: form.nombre.trim() || null,
          tipo_toma: form.tipoToma,
          potencia_max_kw: potencia,
          tipos_vehiculo: form.tipos,
          nota: form.nota.trim() || null,
        })
        toast({ title: "Puesto creado", description: creado.codigo })
      }
      await onGuardado()
      onOpenChange(false)
    } catch (error) {
      toast({
        title: editando ? "No se pudo actualizar el puesto" : "No se pudo crear el puesto",
        description: error instanceof Error ? error.message : "Inténtalo de nuevo",
        variant: "destructive",
      })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialog
      open={modo !== null}
      onOpenChange={(abierto) => {
        if (!guardando) onOpenChange(abierto)
      }}
    >
      <DialogContent className="max-w-lg">
        <form onSubmit={guardar} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{editando ? `Editar puesto ${editando.codigo}` : "Nuevo puesto"}</DialogTitle>
            <DialogDescription>
              {editando
                ? "El código no se puede cambiar. El estado del puesto se cambia desde la lista."
                : "Una toma donde se conecta un vehículo a cargar."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            {!editando && (
              <Campo
                id="puesto-codigo"
                etiqueta="Código (opcional)"
                ayuda="Si lo dejas vacío se asigna el siguiente: P-05, P-06..."
                error={errorCodigo}
              >
                <Input
                  id="puesto-codigo"
                  value={form.codigo}
                  onChange={(e) => cambiar("codigo", e.target.value)}
                  maxLength={20}
                  placeholder="P-05"
                  autoFocus
                  aria-invalid={Boolean(errorCodigo)}
                  aria-describedby={descripcionDe("puesto-codigo")}
                  className="font-mono uppercase"
                />
              </Campo>
            )}
            <Campo id="puesto-nombre" etiqueta="Nombre (opcional)">
              <Input
                id="puesto-nombre"
                value={form.nombre}
                onChange={(e) => cambiar("nombre", e.target.value)}
                maxLength={60}
                placeholder="Junto a la entrada"
                autoFocus={Boolean(editando)}
              />
            </Campo>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid content-start gap-1.5">
              <Label htmlFor="puesto-toma">Tipo de toma</Label>
              <Select value={form.tipoToma} onValueChange={(v) => cambiar("tipoToma", v as TipoToma)}>
                <SelectTrigger id="puesto-toma">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_TOMA.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Campo
              id="puesto-potencia"
              etiqueta="Potencia máx. (kW, opcional)"
              error={intentado || potencia !== null ? errorPotencia : undefined}
            >
              <Input
                id="puesto-potencia"
                value={form.potencia}
                onChange={(e) => cambiar("potencia", e.target.value)}
                inputMode="decimal"
                placeholder="2,2"
                aria-invalid={Boolean(errorPotencia) && (intentado || potencia !== null)}
                aria-describedby={descripcionDe("puesto-potencia")}
                className="tabular-nums"
              />
            </Campo>
          </div>

          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm font-medium">Vehículos que admite</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {TIPOS_VEHICULO.map((t) => {
                const id = `puesto-vehiculo-${t.value}`
                return (
                  <label
                    key={t.value}
                    htmlFor={id}
                    className="flex min-h-10 cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm hover:bg-accent/50"
                  >
                    <Checkbox
                      id={id}
                      checked={form.tipos.includes(t.value)}
                      onCheckedChange={(v) => alternarTipo(t.value, v === true)}
                    />
                    {t.label}
                  </label>
                )
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Sin marcar ninguno, el puesto admite cualquier vehículo.
            </p>
          </fieldset>

          <Campo id="puesto-nota" etiqueta="Nota (opcional)">
            <Textarea
              id="puesto-nota"
              value={form.nota}
              onChange={(e) => cambiar("nota", e.target.value)}
              maxLength={200}
              rows={2}
            />
          </Campo>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={guardando}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={guardando}>
              {guardando && <Loader2 className="animate-spin" />}
              {editando ? "Guardar cambios" : "Crear puesto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
