"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog"
import { apiRequest } from "@/lib/api-config"
import { useToast } from "@/hooks/use-toast"
import { SolineraService } from "@/lib/services/feats/solineras/solinera-service"
import { TIPOS_TOMA } from "@/lib/utils/solineras"
import type { Solinera, TipoToma } from "@/lib/types/feats/solineras/solinera-types"

interface Lugar {
  codigo: string
  nombre: string
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreada: (solinera: Solinera) => void
}

const VACIO = {
  nombre: "",
  provincia: "",
  municipio: "",
  direccion: "",
  telefono: "",
  responsable: "",
  cantidadPuestos: "4",
  tipoToma: "220V" as TipoToma,
}

export function CrearSolineraDialog({ open, onOpenChange, onCreada }: Props) {
  const { toast } = useToast()
  const [form, setForm] = useState(VACIO)
  const [provincias, setProvincias] = useState<Lugar[]>([])
  const [municipios, setMunicipios] = useState<Lugar[]>([])
  const [guardando, setGuardando] = useState(false)

  const cambiar = <K extends keyof typeof VACIO>(campo: K, valor: (typeof VACIO)[K]) =>
    setForm((f) => ({ ...f, [campo]: valor }))

  useEffect(() => {
    if (!open) return
    setForm(VACIO)
    apiRequest<{ success: boolean; data: Lugar[] }>("/provincias/")
      .then((r) => setProvincias(r.success && r.data ? r.data : []))
      .catch(() => setProvincias([]))
  }, [open])

  const provinciaElegida = provincias.find((p) => p.nombre === form.provincia)

  useEffect(() => {
    if (!provinciaElegida) {
      setMunicipios([])
      return
    }
    apiRequest<{ success: boolean; data: Lugar[] }>(
      `/provincias/provincia/${provinciaElegida.codigo}/municipios`,
    )
      .then((r) => setMunicipios(r.success && r.data ? r.data : []))
      .catch(() => setMunicipios([]))
  }, [provinciaElegida])

  const puestos = Number.parseInt(form.cantidadPuestos, 10)
  const puestosValidos = Number.isInteger(puestos) && puestos >= 0 && puestos <= 60
  const puedeGuardar = form.nombre.trim().length >= 2 && puestosValidos && !guardando

  const guardar = async () => {
    setGuardando(true)
    try {
      const solinera = await SolineraService.crear({
        nombre: form.nombre.trim(),
        provincia_codigo: provinciaElegida?.codigo ?? null,
        provincia_nombre: form.provincia || null,
        municipio: form.municipio || null,
        direccion: form.direccion.trim() || null,
        telefono: form.telefono.trim() || null,
        responsable: form.responsable.trim() || null,
        cantidad_puestos: puestos,
        tipo_toma: form.tipoToma,
      })
      toast({ title: "Solinera creada", description: `${solinera.nombre} · ${solinera.codigo}` })
      onCreada(solinera)
      onOpenChange(false)
    } catch (error) {
      toast({
        title: "No se pudo crear la solinera",
        description: error instanceof Error ? error.message : "Inténtalo de nuevo",
        variant: "destructive",
      })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nueva solinera</DialogTitle>
          <DialogDescription>
            Los puestos se crean con código P-01, P-02… Después puedes añadir más, cambiar sus reglas y
            fijar las tarifas.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="sol-nombre">Nombre</Label>
            <Input
              id="sol-nombre"
              value={form.nombre}
              onChange={(e) => cambiar("nombre", e.target.value)}
              placeholder="Solinera Miramar"
              autoFocus
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Provincia</Label>
              <Select
                value={form.provincia}
                onValueChange={(v) => setForm((f) => ({ ...f, provincia: v, municipio: "" }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Elige la provincia" />
                </SelectTrigger>
                <SelectContent>
                  {provincias.map((p) => (
                    <SelectItem key={p.codigo} value={p.nombre}>
                      {p.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Municipio</Label>
              <Select
                value={form.municipio}
                onValueChange={(v) => cambiar("municipio", v)}
                disabled={municipios.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={form.provincia ? "Elige el municipio" : "Primero la provincia"} />
                </SelectTrigger>
                <SelectContent>
                  {municipios.map((m) => (
                    <SelectItem key={m.codigo} value={m.nombre}>
                      {m.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="sol-direccion">Dirección</Label>
            <Input
              id="sol-direccion"
              value={form.direccion}
              onChange={(e) => cambiar("direccion", e.target.value)}
              placeholder="Calle, número y entre calles"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="sol-responsable">Responsable</Label>
              <Input
                id="sol-responsable"
                value={form.responsable}
                onChange={(e) => cambiar("responsable", e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="sol-telefono">Teléfono</Label>
              <Input
                id="sol-telefono"
                value={form.telefono}
                onChange={(e) => cambiar("telefono", e.target.value)}
                inputMode="tel"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="sol-puestos">Puestos de carga</Label>
              <Input
                id="sol-puestos"
                type="number"
                min={0}
                max={60}
                value={form.cantidadPuestos}
                onChange={(e) => cambiar("cantidadPuestos", e.target.value)}
                aria-invalid={!puestosValidos}
              />
              {!puestosValidos && (
                <p className="text-xs text-destructive">Entre 0 y 60 puestos.</p>
              )}
            </div>
            <div className="grid gap-1.5">
              <Label>Tipo de toma</Label>
              <Select value={form.tipoToma} onValueChange={(v) => cambiar("tipoToma", v as TipoToma)}>
                <SelectTrigger>
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
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={guardando}>
            Cancelar
          </Button>
          <Button onClick={guardar} disabled={!puedeGuardar}>
            {guardando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Crear solinera
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
