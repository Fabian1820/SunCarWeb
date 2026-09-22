"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
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
import { leerMonto } from "@/components/feats/solineras/cerrar-turno-dialog"
import { useToast } from "@/hooks/use-toast"
import { SolineraService } from "@/lib/services/feats/solineras/solinera-service"
import type { Moneda, MontosPorMoneda, Turno } from "@/lib/types/feats/solineras/solinera-types"

const NOTA_MAX = 200

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  solineraId: string
  /** Monedas en las que se puede declarar fondo (las que acepta la solinera). */
  monedas: Moneda[]
  onAbierto: (turno: Turno) => void
}

/** Abre el turno de caja declarando el efectivo con el que arranca cada moneda. */
export function AbrirTurnoDialog({ open, onOpenChange, solineraId, monedas, onAbierto }: Props) {
  const { toast } = useToast()
  const [fondo, setFondo] = useState<Partial<Record<Moneda, string>>>({})
  const [nota, setNota] = useState("")
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (!open) return
    setFondo({})
    setNota("")
  }, [open])

  const lecturas = monedas.map((moneda) => ({ moneda, ...leerMonto(fondo[moneda] ?? "") }))
  const hayInvalidos = lecturas.some((l) => !l.vacio && l.valor === null)

  const abrir = async () => {
    if (hayInvalidos) return
    // Solo viajan las monedas que la persona escribió; vacío equivale a 0.
    const fondoInicial: MontosPorMoneda = {}
    for (const l of lecturas) {
      if (l.valor !== null) fondoInicial[l.moneda] = l.valor
    }
    setGuardando(true)
    try {
      const turno = await SolineraService.abrirTurno(solineraId, {
        fondo_inicial: fondoInicial,
        nota: nota.trim() || null,
      })
      toast({ title: "Turno abierto", description: "Ya se pueden iniciar cargas y registrar cobros." })
      onAbierto(turno)
      onOpenChange(false)
    } catch (error) {
      toast({
        title: "No se pudo abrir el turno",
        description: error instanceof Error ? error.message : "Inténtalo de nuevo",
        variant: "destructive",
      })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(valor) => !guardando && onOpenChange(valor)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Abrir turno</DialogTitle>
          <DialogDescription>
            Cuenta el efectivo con el que arranca la caja. Al cerrar el turno se comparará con lo que haya. Deja
            vacío lo que sea 0.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          {lecturas.map((l) => (
            <div key={l.moneda} className="grid gap-1.5">
              <Label htmlFor={`fondo-${l.moneda}`}>Fondo inicial en {l.moneda}</Label>
              <Input
                id={`fondo-${l.moneda}`}
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                value={fondo[l.moneda] ?? ""}
                onChange={(e) => setFondo((f) => ({ ...f, [l.moneda]: e.target.value }))}
                placeholder="0"
                aria-invalid={!l.vacio && l.valor === null}
                className="h-11 tabular-nums"
                autoFocus={l.moneda === monedas[0]}
              />
              {!l.vacio && l.valor === null && (
                <p className="text-xs text-destructive">Escribe un monto de 0 o más.</p>
              )}
            </div>
          ))}
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="apertura-nota">Nota (opcional)</Label>
          <Textarea
            id="apertura-nota"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            maxLength={NOTA_MAX}
            rows={2}
            className="min-h-[60px]"
            placeholder="Alguna observación al recibir la caja"
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={guardando}>
            Cancelar
          </Button>
          <Button onClick={abrir} disabled={hayInvalidos || guardando}>
            {guardando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Abrir turno
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
