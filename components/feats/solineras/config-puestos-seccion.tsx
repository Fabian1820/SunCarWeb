"use client"

import { useMemo, useState } from "react"
import { Pencil, Plus, Wrench } from "lucide-react"
import { Button } from "@/components/shared/atom/button"
import { Switch } from "@/components/shared/molecule/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shared/molecule/table"
import { useToast } from "@/hooks/use-toast"
import { SolineraService } from "@/lib/services/feats/solineras/solinera-service"
import { cn } from "@/lib/utils"
import { TIPOS_TOMA, etiquetaVehiculo } from "@/lib/utils/solineras"
import type { EstadoPuestoManual, Puesto, Solinera } from "@/lib/types/feats/solineras/solinera-types"
import { EtiquetaEstado, Seccion } from "./config-comun"
import { ConfigPuestoDialog, type ModoPuesto } from "./config-puesto-dialog"
import { ConfigPuestoEstadoDialog } from "./config-puesto-estado-dialog"

interface Props {
  solinera: Solinera
  /** Puede crear, editar y activar o desactivar puestos (permiso de red). */
  editable: boolean
  recargarSolinera: () => Promise<void>
}

const ETIQUETA_ESTADO: Record<EstadoPuestoManual, string> = {
  operativo: "Operativo",
  fuera_servicio: "Fuera de servicio",
  falla: "En falla",
}

const COLOR_ESTADO: Record<EstadoPuestoManual, string> = {
  operativo: "bg-emerald-100 text-emerald-800",
  fuera_servicio: "bg-slate-200 text-slate-700",
  falla: "bg-red-100 text-red-800",
}

const formatoKw = new Intl.NumberFormat("es-CU", { maximumFractionDigits: 2 })

const etiquetaToma = (toma: Puesto["tipo_toma"]) =>
  TIPOS_TOMA.find((t) => t.value === toma)?.label ?? toma

export function ConfigPuestosSeccion({ solinera, editable, recargarSolinera }: Props) {
  const { toast } = useToast()
  const [modo, setModo] = useState<ModoPuesto>(null)
  const [estadoDe, setEstadoDe] = useState<Puesto | null>(null)
  const [cambiandoActivo, setCambiandoActivo] = useState<string | null>(null)

  const puestos = useMemo(
    () =>
      [...(solinera.puestos ?? [])].sort((a, b) =>
        a.codigo.localeCompare(b.codigo, "es", { numeric: true }),
      ),
    [solinera.puestos],
  )

  const cambiarActivo = async (puesto: Puesto, activo: boolean) => {
    setCambiandoActivo(puesto.id)
    try {
      await SolineraService.actualizarPuesto(solinera.id, puesto.id, { activo })
      toast({
        title: activo ? "Puesto activado" : "Puesto desactivado",
        description: puesto.codigo,
      })
      await recargarSolinera()
    } catch (error) {
      toast({
        title: activo ? "No se pudo activar el puesto" : "No se pudo desactivar el puesto",
        description: error instanceof Error ? error.message : "Inténtalo de nuevo",
        variant: "destructive",
      })
    } finally {
      setCambiandoActivo(null)
    }
  }

  return (
    <Seccion
      id="config-puestos"
      titulo="Puestos"
      descripcion="Las tomas donde se conectan los vehículos a cargar."
      acciones={
        editable ? (
          <Button type="button" onClick={() => setModo("nuevo")}>
            <Plus />
            Nuevo puesto
          </Button>
        ) : undefined
      }
    >
      {puestos.length === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          Esta solinera todavía no tiene puestos.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table className="min-w-[52rem]">
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="h-10 px-3 text-xs font-semibold">Código</TableHead>
                <TableHead className="h-10 px-3 text-xs font-semibold">Nombre</TableHead>
                <TableHead className="h-10 px-3 text-xs font-semibold">Toma</TableHead>
                <TableHead className="h-10 px-3 text-right text-xs font-semibold">
                  Potencia máx. (kW)
                </TableHead>
                <TableHead className="h-10 px-3 text-xs font-semibold">Vehículos que admite</TableHead>
                <TableHead className="h-10 px-3 text-xs font-semibold">Estado</TableHead>
                <TableHead className="h-10 px-3 text-xs font-semibold">Activo</TableHead>
                <TableHead className="h-10 px-3 text-right text-xs font-semibold">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {puestos.map((puesto) => (
                <TableRow key={puesto.id} className={cn(!puesto.activo && "text-muted-foreground")}>
                  <TableCell className="px-3 py-3 align-top">
                    <span className="font-mono text-xs font-medium">{puesto.codigo}</span>
                  </TableCell>
                  <TableCell className="px-3 py-3 align-top">{puesto.nombre || "—"}</TableCell>
                  <TableCell className="whitespace-nowrap px-3 py-3 align-top">
                    {etiquetaToma(puesto.tipo_toma)}
                  </TableCell>
                  <TableCell className="px-3 py-3 text-right align-top tabular-nums">
                    {puesto.potencia_max_kw != null ? formatoKw.format(puesto.potencia_max_kw) : "—"}
                  </TableCell>
                  <TableCell className="max-w-[16rem] px-3 py-3 align-top">
                    {puesto.tipos_vehiculo.length > 0
                      ? puesto.tipos_vehiculo.map((t) => etiquetaVehiculo(t)).join(", ")
                      : "Todos"}
                  </TableCell>
                  <TableCell className="px-3 py-3 align-top">
                    <div className="grid max-w-[14rem] justify-items-start gap-1">
                      <EtiquetaEstado className={COLOR_ESTADO[puesto.estado_manual]}>
                        {ETIQUETA_ESTADO[puesto.estado_manual]}
                      </EtiquetaEstado>
                      {puesto.estado_manual !== "operativo" && puesto.motivo_estado && (
                        <span className="text-xs text-muted-foreground">{puesto.motivo_estado}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="px-3 py-3 align-top">
                    {editable ? (
                      <div className="flex min-h-10 items-center">
                        <Switch
                          checked={puesto.activo}
                          onCheckedChange={(activo) => void cambiarActivo(puesto, activo)}
                          disabled={cambiandoActivo === puesto.id}
                          aria-label={`${puesto.activo ? "Desactivar" : "Activar"} el puesto ${puesto.codigo}`}
                        />
                      </div>
                    ) : (
                      <span>{puesto.activo ? "Sí" : "No"}</span>
                    )}
                  </TableCell>
                  <TableCell className="px-3 py-3 align-top">
                    <div className="flex flex-wrap justify-end gap-2">
                      {editable && (
                        <Button
                          variant="outline"
                          onClick={() => setModo(puesto)}
                          aria-label={`Editar el puesto ${puesto.codigo}`}
                        >
                          <Pencil />
                          Editar
                        </Button>
                      )}
                      {/* El backend deja cambiar el estado a quien atiende la solinera (no exige el
                          permiso de red): si se quema una toma, el operador no puede esperar. */}
                      <Button
                        variant="outline"
                        onClick={() => setEstadoDe(puesto)}
                        aria-label={`Cambiar el estado del puesto ${puesto.codigo}`}
                      >
                        <Wrench />
                        Estado
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ConfigPuestoDialog
        solineraId={solinera.id}
        puestos={puestos}
        modo={modo}
        onOpenChange={(abierto) => {
          if (!abierto) setModo(null)
        }}
        onGuardado={recargarSolinera}
      />
      <ConfigPuestoEstadoDialog
        solineraId={solinera.id}
        puesto={estadoDe}
        onOpenChange={(abierto) => {
          if (!abierto) setEstadoDe(null)
        }}
        onGuardado={recargarSolinera}
      />
    </Seccion>
  )
}
