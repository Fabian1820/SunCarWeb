"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/molecule/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select"
import { Label } from "@/components/shared/atom/label"
import { apiRequest } from "@/lib/api-config"
import { useToast } from "@/hooks/use-toast"
import { SolineraService } from "@/lib/services/feats/solineras/solinera-service"
import { ESTADOS_SOLINERA } from "@/lib/utils/solineras"
import type { EstadoSolinera, Solinera } from "@/lib/types/feats/solineras/solinera-types"
import { Campo, Seccion, descripcionDe } from "./config-comun"

interface Lugar {
  codigo: string
  nombre: string
}

interface Props {
  solinera: Solinera
  editable: boolean
  recargarSolinera: () => Promise<void>
}

const NOMBRE_MIN = 2

interface BorradorDatos {
  nombre: string
  estado: EstadoSolinera
  provincia: string
  municipio: string
  direccion: string
  telefono: string
  responsable: string
}

const baseDe = (s: Solinera): BorradorDatos => ({
  nombre: s.nombre ?? "",
  estado: s.estado,
  provincia: s.provincia_nombre ?? "",
  municipio: s.municipio ?? "",
  direccion: s.direccion ?? "",
  telefono: s.telefono ?? "",
  responsable: s.responsable ?? "",
})

/** Si el valor guardado no está en la lista (dato viejo), se añade para que el desplegable no quede en blanco. */
const conActual = (lista: Lugar[], actual: string): Lugar[] =>
  actual && !lista.some((l) => l.nombre === actual)
    ? [{ codigo: `actual-${actual}`, nombre: actual }, ...lista]
    : lista

export function ConfigDatosSeccion({ solinera, editable, recargarSolinera }: Props) {
  const { toast } = useToast()
  const base = useMemo(() => baseDe(solinera), [solinera])
  const claveBase = useMemo(() => JSON.stringify(base), [base])
  const baseRef = useRef(base)
  baseRef.current = base

  const [form, setForm] = useState<BorradorDatos>(base)
  const [provincias, setProvincias] = useState<Lugar[]>([])
  const [municipios, setMunicipios] = useState<Lugar[]>([])
  const [guardando, setGuardando] = useState(false)

  // Solo se rehace el borrador si cambian los datos guardados: recargar la solinera por
  // un cambio en otra sección no debe borrar lo que se está escribiendo aquí.
  useEffect(() => {
    setForm(baseRef.current)
  }, [claveBase])

  const cambiar = <K extends keyof BorradorDatos>(campo: K, valor: BorradorDatos[K]) =>
    setForm((f) => ({ ...f, [campo]: valor }))

  useEffect(() => {
    let vigente = true
    apiRequest<{ success: boolean; data: Lugar[] }>("/provincias/")
      .then((r) => {
        if (vigente) setProvincias(r.success && r.data ? r.data : [])
      })
      .catch(() => {
        if (vigente) setProvincias([])
      })
    return () => {
      vigente = false
    }
  }, [])

  const provinciaElegida = provincias.find((p) => p.nombre === form.provincia)
  const codigoProvincia =
    provinciaElegida?.codigo ??
    (form.provincia && form.provincia === solinera.provincia_nombre
      ? (solinera.provincia_codigo ?? undefined)
      : undefined)

  useEffect(() => {
    if (!codigoProvincia) {
      setMunicipios([])
      return
    }
    let vigente = true
    apiRequest<{ success: boolean; data: Lugar[] }>(
      `/provincias/provincia/${codigoProvincia}/municipios`,
    )
      .then((r) => {
        if (vigente) setMunicipios(r.success && r.data ? r.data : [])
      })
      .catch(() => {
        if (vigente) setMunicipios([])
      })
    return () => {
      vigente = false
    }
  }, [codigoProvincia])

  const errorNombre =
    form.nombre.trim().length < NOMBRE_MIN ? `El nombre necesita al menos ${NOMBRE_MIN} letras.` : undefined
  const hayCambios = JSON.stringify(form) !== claveBase
  const opcionesProvincia = conActual(provincias, form.provincia)
  const opcionesMunicipio = conActual(municipios, form.municipio)

  const guardar = async () => {
    if (errorNombre || guardando) return
    setGuardando(true)
    try {
      await SolineraService.actualizar(solinera.id, {
        nombre: form.nombre.trim(),
        estado: form.estado,
        // El backend ignora los null: para vaciar un dato hay que mandar texto vacío.
        direccion: form.direccion.trim(),
        telefono: form.telefono.trim(),
        responsable: form.responsable.trim(),
        municipio: form.municipio,
        ...(form.provincia
          ? { provincia_nombre: form.provincia, provincia_codigo: codigoProvincia }
          : {}),
      })
      toast({ title: "Datos guardados", description: form.nombre.trim() })
      await recargarSolinera()
    } catch (error) {
      toast({
        title: "No se pudieron guardar los datos",
        description: error instanceof Error ? error.message : "Inténtalo de nuevo",
        variant: "destructive",
      })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Seccion
      id="config-datos"
      titulo="Datos de la solinera"
      descripcion="Nombre, estado y ubicación con los que se identifica esta solinera."
    >
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          void guardar()
        }}
        className="grid gap-4"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo id="sol-nombre" etiqueta="Nombre" error={editable ? errorNombre : undefined}>
            <Input
              id="sol-nombre"
              value={form.nombre}
              onChange={(e) => cambiar("nombre", e.target.value)}
              maxLength={80}
              disabled={!editable}
              aria-invalid={editable && Boolean(errorNombre)}
              aria-describedby={descripcionDe("sol-nombre")}
            />
          </Campo>

          <Campo
            id="sol-estado"
            etiqueta="Estado"
            ayuda="Solo «Operativa» admite cargas y reservas."
          >
            <Select
              value={form.estado}
              onValueChange={(v) => cambiar("estado", v as EstadoSolinera)}
              disabled={!editable}
            >
              <SelectTrigger id="sol-estado" aria-describedby={descripcionDe("sol-estado")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ESTADOS_SOLINERA.map((e) => (
                  <SelectItem key={e.value} value={e.value}>
                    {e.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Campo>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="sol-provincia">Provincia</Label>
            <Select
              value={form.provincia}
              onValueChange={(v) => setForm((f) => ({ ...f, provincia: v, municipio: "" }))}
              disabled={!editable}
            >
              <SelectTrigger id="sol-provincia">
                <SelectValue placeholder="Sin provincia" />
              </SelectTrigger>
              <SelectContent>
                {opcionesProvincia.map((p) => (
                  <SelectItem key={p.codigo} value={p.nombre}>
                    {p.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="sol-municipio">Municipio</Label>
            <Select
              value={form.municipio}
              onValueChange={(v) => cambiar("municipio", v)}
              disabled={!editable || opcionesMunicipio.length === 0}
            >
              <SelectTrigger id="sol-municipio">
                <SelectValue
                  placeholder={form.provincia ? "Sin municipio" : "Primero la provincia"}
                />
              </SelectTrigger>
              <SelectContent>
                {opcionesMunicipio.map((m) => (
                  <SelectItem key={m.codigo} value={m.nombre}>
                    {m.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Campo id="sol-direccion" etiqueta="Dirección">
          <Input
            id="sol-direccion"
            value={form.direccion}
            onChange={(e) => cambiar("direccion", e.target.value)}
            maxLength={200}
            disabled={!editable}
            placeholder={editable ? "Calle, número y entre calles" : undefined}
          />
        </Campo>

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo id="sol-responsable" etiqueta="Responsable">
            <Input
              id="sol-responsable"
              value={form.responsable}
              onChange={(e) => cambiar("responsable", e.target.value)}
              maxLength={80}
              disabled={!editable}
            />
          </Campo>
          <Campo id="sol-telefono" etiqueta="Teléfono">
            <Input
              id="sol-telefono"
              value={form.telefono}
              onChange={(e) => cambiar("telefono", e.target.value)}
              maxLength={40}
              inputMode="tel"
              disabled={!editable}
            />
          </Campo>
        </div>

        {editable && (
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setForm(base)}
              disabled={!hayCambios || guardando}
            >
              Descartar
            </Button>
            <Button type="submit" disabled={!hayCambios || Boolean(errorNombre) || guardando}>
              {guardando && <Loader2 className="animate-spin" />}
              Guardar datos
            </Button>
          </div>
        )}
      </form>
    </Seccion>
  )
}
