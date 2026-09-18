"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, Package } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { Textarea } from "@/components/shared/molecule/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select"
import { SearchableSelect } from "@/components/shared/molecule/searchable-select"
import { useToast } from "@/hooks/use-toast"
import type { CategoriaEquipo, EquipoCliente } from "@/lib/api-types"
import type { MotivoCambioEquipo } from "@/lib/types/feats/customer/cliente-types"
import { MaterialService } from "@/lib/services/feats/materials/material-service"
import type { Material } from "@/lib/types/feats/materials/material-types"
import {
  EquiposClienteService,
  type EquipoLibre,
} from "@/lib/services/feats/customer/equipos-cliente-service"
import { CATEGORIA_EQUIPO_UI } from "./equipos-cliente-cell"

export type ModoAccionEquipo = "agregar" | "ajustar" | "sustituir" | "retirar" | "corregir"

const MOTIVO_LABEL: Record<MotivoCambioEquipo, string> = {
  instalacion_inicial: "Instalación inicial",
  ampliacion: "Ampliación",
  garantia: "Garantía",
  autorizado_direccion: "Autorizado por dirección",
  correccion_dato: "Corrección de dato",
  venta_adicional: "Venta adicional",
  retiro: "Retiro",
  migracion: "Registro inicial",
}

/** Motivos que el operador puede elegir en cada acción, el primero por defecto. */
const MOTIVOS_POR_MODO: Record<Exclude<ModoAccionEquipo, "corregir">, MotivoCambioEquipo[]> = {
  agregar: ["ampliacion", "instalacion_inicial", "venta_adicional", "garantia", "autorizado_direccion", "correccion_dato"],
  ajustar: ["correccion_dato", "ampliacion", "venta_adicional", "garantia", "autorizado_direccion", "retiro"],
  sustituir: ["garantia", "autorizado_direccion", "correccion_dato"],
  retirar: ["retiro", "garantia", "autorizado_direccion", "correccion_dato"],
}

/**
 * Mismos que exige el backend: sin explicación escrita, un cambio por
 * garantía o "lo autorizó dirección" no se distingue de un error de tecleo.
 */
const MOTIVOS_CON_NOTA: MotivoCambioEquipo[] = ["garantia", "autorizado_direccion", "correccion_dato"]

const TITULO: Record<ModoAccionEquipo, string> = {
  agregar: "Agregar equipo",
  ajustar: "Ajustar cantidad",
  sustituir: "Sustituir equipo",
  retirar: "Retirar equipo",
  corregir: "Corregir datos del equipo",
}

const CATEGORIAS_ELEGIBLES: CategoriaEquipo[] = [
  "INVERSORES",
  "BATERIAS",
  "PANELES",
  "MPPT",
  "CAJA_COMBINADORA",
]

const normalizar = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim()

/**
 * Qué familia de equipo es un material del catálogo, o null si no es equipo.
 * La caja combinadora va por nombre, como en el backend: en el catálogo vive
 * en BATERÍAS o en MATERIAL VARIO según sea de batería o de paneles.
 */
function categoriaDeMaterial(categoria: string, nombre: string): CategoriaEquipo | null {
  if (/\bCAJA\s+COMBINADORA\b/i.test(nombre)) return "CAJA_COMBINADORA"
  const c = normalizar(categoria || "")
  if (c.startsWith("INVERSOR")) return "INVERSORES"
  if (c.startsWith("BATERIA")) return "BATERIAS"
  if (c.startsWith("PANEL")) return "PANELES"
  if (c === "MPPT" || /\bMPPT\b/i.test(nombre)) return "MPPT"
  return null
}

type MaterialEquipo = {
  material_id: string
  codigo: string
  nombre: string
  categoria: CategoriaEquipo
  foto: string | null
  potencia_kw: number | null
}

let cacheMateriales: MaterialEquipo[] | null = null

async function cargarMaterialesEquipo(): Promise<MaterialEquipo[]> {
  if (cacheMateriales) return cacheMateriales
  const todos = await MaterialService.getAllMaterials()
  const vistos = new Set<string>()
  const lista: MaterialEquipo[] = []
  // El tipo Material no declara material_id, pero getAllMaterials lo trae del
  // backend (hace spread del material): es el identificador estable.
  for (const m of todos as Array<Material & { material_id?: string }>) {
    const id = String(m.material_id ?? "").trim()
    if (!id || vistos.has(id)) continue
    const nombre = String(m.nombre || m.descripcion || "").trim()
    const categoria = categoriaDeMaterial(m.categoria ?? "", nombre)
    if (!categoria) continue
    vistos.add(id)
    lista.push({
      material_id: id,
      codigo: String(m.codigo ?? ""),
      nombre,
      categoria,
      foto: m.foto || null,
      potencia_kw: typeof m.potenciaKW === "number" ? m.potenciaKW : null,
    })
  }
  lista.sort((a, b) => a.nombre.localeCompare(b.nombre))
  cacheMateriales = lista
  return lista
}

const hoyISO = () => new Date().toISOString().slice(0, 10)

interface EquipoAccionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  modo: ModoAccionEquipo
  clienteNumero: string
  /** El equipo sobre el que se actúa; no aplica al agregar. */
  equipo?: EquipoCliente | null
  onHecho: () => void
}

export function EquipoAccionDialog({
  open,
  onOpenChange,
  modo,
  clienteNumero,
  equipo,
  onHecho,
}: EquipoAccionDialogProps) {
  const { toast } = useToast()
  const conEquipoNuevo = modo === "agregar" || modo === "sustituir"

  const [materiales, setMateriales] = useState<MaterialEquipo[]>([])
  const [cargandoMateriales, setCargandoMateriales] = useState(false)
  const [guardando, setGuardando] = useState(false)

  const [origen, setOrigen] = useState<"catalogo" | "propio">("catalogo")
  const [materialId, setMaterialId] = useState("")
  const [libre, setLibre] = useState<EquipoLibre>({ descripcion: "", categoria: "INVERSORES" })
  const [cantidad, setCantidad] = useState("")
  const [motivo, setMotivo] = useState<MotivoCambioEquipo>("correccion_dato")
  const [nota, setNota] = useState("")
  const [autorizadoPor, setAutorizadoPor] = useState("")
  const [fecha, setFecha] = useState(hoyISO())
  const [numeroSerie, setNumeroSerie] = useState("")

  // Reinicia el formulario cada vez que se abre.
  useEffect(() => {
    if (!open) return
    setOrigen("catalogo")
    setMaterialId("")
    setLibre({
      descripcion: modo === "corregir" ? equipo?.descripcion ?? "" : "",
      categoria: (equipo?.categoria as CategoriaEquipo) ?? "INVERSORES",
      marca: modo === "corregir" ? equipo?.marca ?? "" : "",
      potencia_kw: modo === "corregir" ? equipo?.potencia_kw ?? null : null,
    })
    setCantidad(
      modo === "agregar"
        ? "1"
        : modo === "corregir"
          ? ""
          : String(equipo?.cantidad_actual ?? ""),
    )
    setMotivo(modo === "corregir" ? "correccion_dato" : MOTIVOS_POR_MODO[modo][0])
    setNota("")
    setAutorizadoPor("")
    setFecha(hoyISO())
    setNumeroSerie("")
  }, [open, modo, equipo])

  // El catálogo solo hace falta cuando se elige un material.
  useEffect(() => {
    if (!open || !(conEquipoNuevo || modo === "corregir")) return
    let vivo = true
    setCargandoMateriales(true)
    cargarMaterialesEquipo()
      .then((lista) => vivo && setMateriales(lista))
      .catch(() => vivo && setMateriales([]))
      .finally(() => vivo && setCargandoMateriales(false))
    return () => {
      vivo = false
    }
  }, [open, conEquipoNuevo, modo])

  const opciones = useMemo(
    () =>
      materiales.map((m) => ({
        value: m.material_id,
        label: `${m.nombre}${m.codigo ? ` · ${m.codigo}` : ""}`,
      })),
    [materiales],
  )
  const seleccionado = materiales.find((m) => m.material_id === materialId) ?? null

  const notaObligatoria = modo === "sustituir" || modo === "corregir" || MOTIVOS_CON_NOTA.includes(motivo)
  const cantidadNum = Number(cantidad)

  const error = (() => {
    if (conEquipoNuevo) {
      if (origen === "catalogo" && !materialId) return "Elige el material del catálogo"
      if (origen === "propio" && !libre.descripcion.trim()) return "Describe el equipo"
    }
    if (modo === "agregar" && !(cantidadNum > 0)) return "La cantidad tiene que ser mayor que 0"
    if (modo === "ajustar" && !(cantidadNum >= 0)) return "La cantidad no puede ser negativa"
    if ((modo === "retirar" || modo === "sustituir") && cantidad !== "") {
      if (!(cantidadNum > 0)) return "La cantidad tiene que ser mayor que 0"
      if (equipo && cantidadNum > equipo.cantidad_actual)
        return `El cliente tiene ${equipo.cantidad_actual}; no se pueden ${modo === "retirar" ? "retirar" : "sustituir"} más`
    }
    if (notaObligatoria && nota.trim().length < 3) return "Explica el motivo en la nota"
    return null
  })()

  const guardar = async () => {
    if (error) return
    setGuardando(true)
    const traza = {
      motivo,
      nota: nota.trim() || null,
      autorizado_por: autorizadoPor.trim() || null,
      fecha_efectiva: fecha ? `${fecha}T12:00:00Z` : null,
    }
    const libreLimpio: EquipoLibre = {
      descripcion: libre.descripcion.trim(),
      categoria: libre.categoria,
      marca: libre.marca?.trim() || null,
      potencia_kw: libre.potencia_kw ?? null,
    }
    try {
      if (modo === "agregar") {
        await EquiposClienteService.agregar(clienteNumero, {
          ...traza,
          cantidad: cantidadNum,
          ...(origen === "catalogo"
            ? {
                material_id: materialId,
                // La familia la decide la regla de equipo, no la categoría del
                // catálogo: una caja combinadora vive en BATERÍAS.
                libre: seleccionado
                  ? { descripcion: seleccionado.nombre, categoria: seleccionado.categoria }
                  : null,
              }
            : { libre: libreLimpio, es_equipo_propio: true }),
          numero_serie: numeroSerie.trim() || null,
        })
      } else if (modo === "ajustar" && equipo) {
        await EquiposClienteService.ajustar(clienteNumero, equipo.equipo_key, {
          ...traza,
          nueva_cantidad: cantidadNum,
        })
      } else if (modo === "retirar" && equipo) {
        await EquiposClienteService.retirar(clienteNumero, equipo.equipo_key, {
          ...traza,
          cantidad: cantidad === "" ? null : cantidadNum,
        })
      } else if (modo === "sustituir" && equipo) {
        await EquiposClienteService.sustituir(clienteNumero, equipo.equipo_key, {
          ...traza,
          nota: nota.trim(),
          cantidad: cantidad === "" ? null : cantidadNum,
          ...(origen === "catalogo"
            ? {
                material_id: materialId,
                libre: seleccionado
                  ? { descripcion: seleccionado.nombre, categoria: seleccionado.categoria }
                  : null,
              }
            : { libre: libreLimpio }),
          numero_serie: numeroSerie.trim() || null,
        })
      } else if (modo === "corregir" && equipo) {
        await EquiposClienteService.corregir(clienteNumero, equipo.equipo_key, {
          nota: nota.trim(),
          material_id: materialId || null,
          descripcion: seleccionado ? null : libreLimpio.descripcion || null,
          categoria: seleccionado ? seleccionado.categoria : libreLimpio.categoria,
          marca: seleccionado ? null : libreLimpio.marca,
          potencia_kw: seleccionado ? null : libreLimpio.potencia_kw,
          numero_serie: numeroSerie.trim() || null,
        })
      }
      toast({ title: `${TITULO[modo]}: hecho` })
      onOpenChange(false)
      onHecho()
    } catch (err) {
      toast({
        title: "No se guardó",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      })
    } finally {
      setGuardando(false)
    }
  }

  const selectorCatalogo = (
    <div className="space-y-2">
      <SearchableSelect
        options={opciones}
        value={materialId}
        onValueChange={setMaterialId}
        placeholder={cargandoMateriales ? "Cargando catálogo…" : "Buscar por nombre o código"}
        searchPlaceholder="Inversor, batería, panel…"
        disabled={cargandoMateriales}
        disablePortal
      />
      {seleccionado && (
        <div className="flex items-center gap-3 rounded-md border border-gray-100 bg-gray-50 p-2">
          <FotoMaterial url={seleccionado.foto} />
          <div className="min-w-0 text-sm">
            <p className="font-medium text-gray-900">{seleccionado.nombre}</p>
            <p className="text-xs text-gray-500">
              {CATEGORIA_EQUIPO_UI[seleccionado.categoria]?.label}
              {seleccionado.codigo && ` · ${seleccionado.codigo}`}
            </p>
          </div>
        </div>
      )}
    </div>
  )

  const camposLibres = (
    <div className="grid grid-cols-2 gap-2">
      <div className="col-span-2">
        <Label className="text-xs">Descripción</Label>
        <Input
          value={libre.descripcion}
          onChange={(e) => setLibre({ ...libre, descripcion: e.target.value })}
          placeholder="Ej. Inversor Growatt 5kW"
        />
      </div>
      <div>
        <Label className="text-xs">Tipo</Label>
        <Select
          value={libre.categoria}
          onValueChange={(v) => setLibre({ ...libre, categoria: v as CategoriaEquipo })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIAS_ELEGIBLES.map((c) => (
              <SelectItem key={c} value={c}>
                {CATEGORIA_EQUIPO_UI[c].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs">Marca</Label>
        <Input
          value={libre.marca ?? ""}
          onChange={(e) => setLibre({ ...libre, marca: e.target.value })}
        />
      </div>
      {(libre.categoria === "INVERSORES" || libre.categoria === "BATERIAS") && (
        <div className="col-span-2">
          <Label className="text-xs">
            {libre.categoria === "BATERIAS" ? "Capacidad por unidad (kWh)" : "Potencia por unidad (kW)"}
          </Label>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={libre.potencia_kw ?? ""}
            onChange={(e) =>
              setLibre({ ...libre, potencia_kw: e.target.value === "" ? null : Number(e.target.value) })
            }
          />
        </div>
      )}
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{TITULO[modo]}</DialogTitle>
          {equipo && modo !== "agregar" && (
            <DialogDescription>
              {equipo.cantidad_actual}x {equipo.descripcion}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4">
          {conEquipoNuevo && (
            <div className="space-y-2">
              <Label className="text-xs">{modo === "sustituir" ? "Equipo que entra" : "Equipo"}</Label>
              <div className="flex gap-1 rounded-md bg-gray-100 p-1 text-sm">
                {(["catalogo", "propio"] as const).map((o) => (
                  <button
                    key={o}
                    type="button"
                    onClick={() => setOrigen(o)}
                    className={`flex-1 rounded px-2 py-1 transition-colors ${
                      origen === o ? "bg-white font-medium text-gray-900 shadow-sm" : "text-gray-500"
                    }`}
                  >
                    {o === "catalogo" ? "Del catálogo" : modo === "agregar" ? "Propio del cliente" : "No está en el catálogo"}
                  </button>
                ))}
              </div>
              {origen === "catalogo" ? selectorCatalogo : camposLibres}
            </div>
          )}

          {modo === "corregir" && (
            <div className="space-y-2">
              <Label className="text-xs">Material del catálogo (si se sabe cuál es)</Label>
              {selectorCatalogo}
              {!seleccionado && camposLibres}
            </div>
          )}

          {modo !== "corregir" && (
            <div>
              <Label className="text-xs">
                {modo === "agregar"
                  ? "Cantidad"
                  : modo === "ajustar"
                    ? "Cantidad que queda"
                    : `Cantidad (vacío = las ${equipo?.cantidad_actual ?? ""})`}
              </Label>
              <Input
                type="number"
                min={0}
                step="1"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
              />
            </div>
          )}

          {modo !== "corregir" && (
            <div>
              <Label className="text-xs">Motivo</Label>
              <Select value={motivo} onValueChange={(v) => setMotivo(v as MotivoCambioEquipo)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MOTIVOS_POR_MODO[modo].map((m) => (
                    <SelectItem key={m} value={m}>
                      {MOTIVO_LABEL[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label className="text-xs">Nota{notaObligatoria ? " (obligatoria)" : ""}</Label>
            <Textarea
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              rows={3}
              placeholder={
                modo === "corregir"
                  ? "Qué estaba mal y cómo se comprobó"
                  : "Qué pasó y por qué"
              }
            />
          </div>

          {modo !== "corregir" && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Autorizado por</Label>
                <Input
                  value={autorizadoPor}
                  onChange={(e) => setAutorizadoPor(e.target.value)}
                  placeholder="Opcional"
                />
              </div>
              <div>
                <Label className="text-xs">Fecha en que pasó</Label>
                <Input type="date" value={fecha} max={hoyISO()} onChange={(e) => setFecha(e.target.value)} />
              </div>
            </div>
          )}

          {(conEquipoNuevo || modo === "corregir") && (
            <div>
              <Label className="text-xs">Número de serie</Label>
              <Input
                value={numeroSerie}
                onChange={(e) => setNumeroSerie(e.target.value)}
                placeholder="Opcional"
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {error && <p className="mr-auto self-center text-xs text-amber-700">{error}</p>}
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={guardando}>
            Cancelar
          </Button>
          <Button onClick={guardar} disabled={!!error || guardando}>
            {guardando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Miniatura del material, con un icono si no hay foto o no carga. */
export function FotoMaterial({ url, size = 48 }: { url?: string | null; size?: number }) {
  const [rota, setRota] = useState(false)
  if (!url || rota) {
    return (
      <div
        className="flex flex-shrink-0 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-300"
        style={{ width: size, height: size }}
      >
        <Package className="h-5 w-5" />
      </div>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- next.config tiene las imágenes sin optimizar
    <img
      src={url}
      alt=""
      loading="lazy"
      onError={() => setRota(true)}
      className="flex-shrink-0 rounded-md border border-gray-200 bg-white object-contain"
      style={{ width: size, height: size }}
    />
  )
}
