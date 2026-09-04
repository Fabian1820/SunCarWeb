"use client";

import { useEffect, useState } from "react";
import {
  CalendarClock,
  Check,
  Loader2,
  Phone,
  UserCog,
  UserX,
  X,
} from "lucide-react";

import { Badge } from "@/components/shared/atom/badge";
import { Button } from "@/components/shared/atom/button";
import { Input } from "@/components/shared/atom/input";
import { Label } from "@/components/shared/atom/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
import { Separator } from "@/components/shared/molecule/separator";
import { CitasService } from "@/lib/services/feats/citas/citas-service";
import {
  CLASE_ESTADO,
  ETIQUETA_ESTADO,
  type Cita,
  type Disponibilidad,
  type EstadoCita,
} from "@/lib/types/feats/citas/citas-types";

type Panel = "posponer" | "reasignar" | "cancelar" | null;

interface CitaDetalleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cita: Cita | null;
  /** Comerciales que reciben visitas ese día, para reasignar. */
  agenda: Disponibilidad | null;
  procesando: boolean;
  puedeGestionar: boolean;
  onCambiarEstado: (
    id: string,
    estado: EstadoCita,
    motivo?: string | null,
  ) => Promise<boolean>;
  onPosponer: (
    id: string,
    fecha: string,
    hora: string,
    motivo?: string | null,
  ) => Promise<boolean>;
  onReasignar: (
    id: string,
    comercialCi: string,
    motivo?: string | null,
  ) => Promise<boolean>;
}

export function CitaDetalleDialog({
  open,
  onOpenChange,
  cita,
  agenda,
  procesando,
  puedeGestionar,
  onCambiarEstado,
  onPosponer,
  onReasignar,
}: CitaDetalleDialogProps) {
  const [panel, setPanel] = useState<Panel>(null);
  const [motivo, setMotivo] = useState("");
  const [nuevaFecha, setNuevaFecha] = useState("");
  const [nuevaHora, setNuevaHora] = useState("");
  const [nuevoComercial, setNuevoComercial] = useState("");
  const [slotsDestino, setSlotsDestino] = useState<
    { hora_inicio: string; hora_fin: string }[]
  >([]);
  const [cargandoSlots, setCargandoSlots] = useState(false);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setPanel(null);
    setMotivo("");
    setNuevaFecha(cita?.fecha || "");
    setNuevaHora("");
    setNuevoComercial("");
    setSlotsDestino([]);
    setErrorLocal(null);
  }, [open, cita?.id, cita?.fecha]);

  // Al posponer hay que mirar la disponibilidad del día DESTINO, que puede
  // tener otro horario y otras comerciales que el día de origen.
  useEffect(() => {
    if (panel !== "posponer" || !nuevaFecha || !cita) return;
    let cancelado = false;
    setCargandoSlots(true);
    CitasService.disponibilidad(nuevaFecha)
      .then((destino) => {
        if (cancelado) return;
        const suya = destino.comerciales.find(
          (c) => c.comercial_ci === cita.comercial_ci,
        );
        setSlotsDestino(
          (suya?.slots || [])
            .filter((s) => s.libre)
            .map((s) => ({ hora_inicio: s.hora_inicio, hora_fin: s.hora_fin })),
        );
      })
      .catch(() => {
        if (!cancelado) setSlotsDestino([]);
      })
      .finally(() => {
        if (!cancelado) setCargandoSlots(false);
      });
    return () => {
      cancelado = true;
    };
  }, [panel, nuevaFecha, cita]);

  if (!cita) return null;

  const cerrada = cita.estado === "cancelada";

  const ejecutar = async (accion: () => Promise<boolean>) => {
    setErrorLocal(null);
    const ok = await accion();
    if (ok) {
      onOpenChange(false);
    } else {
      setErrorLocal("No se pudo completar la acción. Revisa el aviso de arriba.");
    }
  };

  const comercialesDestino = (agenda?.comerciales || []).filter(
    (c) => c.comercial_ci !== cita.comercial_ci,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {cita.contacto_nombre}
            <Badge variant="outline" className={CLASE_ESTADO[cita.estado]}>
              {ETIQUETA_ESTADO[cita.estado]}
            </Badge>
            {cita.tipo === "espontanea" && (
              <Badge variant="outline" className="bg-purple-100 text-purple-800">
                Sin cita
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {cita.fecha} · {cita.hora_inicio}–{cita.hora_fin} ·{" "}
            {cita.comercial_nombre || cita.comercial_ci}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-2 rounded-lg bg-slate-50 p-3 text-sm sm:grid-cols-2">
            {cita.contacto_telefono && (
              <div className="flex items-center gap-2 text-slate-700">
                <Phone className="h-4 w-4 text-slate-400" />
                {cita.contacto_telefono}
              </div>
            )}
            {(cita.cliente_numero || cita.lead_id) && (
              <div className="text-slate-600">
                {cita.cliente_numero
                  ? `Cliente Nº ${cita.cliente_numero}`
                  : "Lead registrado"}
              </div>
            )}
            {cita.motivo && (
              <div className="sm:col-span-2">
                <span className="font-medium text-slate-700">Motivo: </span>
                <span className="text-slate-600">{cita.motivo}</span>
              </div>
            )}
            {cita.notas && (
              <div className="sm:col-span-2">
                <span className="font-medium text-slate-700">Notas: </span>
                <span className="text-slate-600">{cita.notas}</span>
              </div>
            )}
            {cita.veces_pospuesta > 0 && (
              <div className="sm:col-span-2 text-amber-700">
                Pospuesta {cita.veces_pospuesta}{" "}
                {cita.veces_pospuesta === 1 ? "vez" : "veces"}
              </div>
            )}
          </div>

          {puedeGestionar && !cerrada && (
            <>
              {/* Acciones rápidas de asistencia */}
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                  disabled={procesando || cita.estado === "confirmada"}
                  onClick={() =>
                    ejecutar(() => onCambiarEstado(cita.id, "confirmada"))
                  }
                >
                  <Check className="mr-1.5 h-4 w-4" />
                  Vino
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={procesando || cita.estado === "no_vino"}
                  onClick={() =>
                    ejecutar(() => onCambiarEstado(cita.id, "no_vino"))
                  }
                >
                  <UserX className="mr-1.5 h-4 w-4" />
                  No vino
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={procesando}
                  onClick={() => setPanel(panel === "posponer" ? null : "posponer")}
                >
                  <CalendarClock className="mr-1.5 h-4 w-4" />
                  Posponer
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={procesando}
                  onClick={() =>
                    setPanel(panel === "reasignar" ? null : "reasignar")
                  }
                >
                  <UserCog className="mr-1.5 h-4 w-4" />
                  Reasignar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-200 text-red-700 hover:bg-red-50"
                  disabled={procesando}
                  onClick={() => setPanel(panel === "cancelar" ? null : "cancelar")}
                >
                  <X className="mr-1.5 h-4 w-4" />
                  Cancelar
                </Button>
              </div>

              {panel === "posponer" && (
                <div className="space-y-3 rounded-lg border border-slate-200 p-3">
                  <p className="text-sm font-medium text-slate-700">
                    Mover la cita a otro día u hora
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="posponer-fecha">Nueva fecha</Label>
                      <Input
                        id="posponer-fecha"
                        type="date"
                        value={nuevaFecha}
                        onChange={(e) => {
                          setNuevaFecha(e.target.value);
                          setNuevaHora("");
                        }}
                        disabled={procesando}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="posponer-hora">Nueva hora</Label>
                      <Select
                        value={nuevaHora}
                        onValueChange={setNuevaHora}
                        disabled={procesando || cargandoSlots}
                      >
                        <SelectTrigger id="posponer-hora">
                          <SelectValue
                            placeholder={
                              cargandoSlots ? "Cargando..." : "Elegir hora..."
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {slotsDestino.map((s) => (
                            <SelectItem key={s.hora_inicio} value={s.hora_inicio}>
                              {s.hora_inicio} – {s.hora_fin}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {!cargandoSlots && nuevaFecha && slotsDestino.length === 0 && (
                        <p className="text-xs text-amber-700">
                          Sin horarios libres ese día para esa comercial.
                        </p>
                      )}
                    </div>
                  </div>
                  <Input
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    placeholder="Motivo (opcional)"
                    disabled={procesando}
                  />
                  <Button
                    size="sm"
                    disabled={procesando || !nuevaFecha || !nuevaHora}
                    onClick={() =>
                      ejecutar(() =>
                        onPosponer(cita.id, nuevaFecha, nuevaHora, motivo || null),
                      )
                    }
                  >
                    {procesando && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Posponer cita
                  </Button>
                </div>
              )}

              {panel === "reasignar" && (
                <div className="space-y-3 rounded-lg border border-slate-200 p-3">
                  <p className="text-sm font-medium text-slate-700">
                    Pasar la cita a otra comercial, misma fecha y hora
                  </p>
                  <div className="space-y-1.5">
                    <Label htmlFor="reasignar-comercial">Nueva comercial</Label>
                    <Select
                      value={nuevoComercial}
                      onValueChange={setNuevoComercial}
                      disabled={procesando}
                    >
                      <SelectTrigger id="reasignar-comercial">
                        <SelectValue placeholder="Elegir comercial..." />
                      </SelectTrigger>
                      <SelectContent>
                        {comercialesDestino.map((c) => {
                          const libre = c.slots.find(
                            (s) => s.hora_inicio === cita.hora_inicio,
                          )?.libre;
                          return (
                            <SelectItem
                              key={c.comercial_ci}
                              value={c.comercial_ci}
                              disabled={libre === false}
                            >
                              {c.comercial_nombre}
                              {libre === false ? " (ocupada a esa hora)" : ""}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <Input
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    placeholder="Motivo (opcional)"
                    disabled={procesando}
                  />
                  <Button
                    size="sm"
                    disabled={procesando || !nuevoComercial}
                    onClick={() =>
                      ejecutar(() =>
                        onReasignar(cita.id, nuevoComercial, motivo || null),
                      )
                    }
                  >
                    {procesando && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Reasignar cita
                  </Button>
                </div>
              )}

              {panel === "cancelar" && (
                <div className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-3">
                  <p className="text-sm font-medium text-red-800">
                    Cancelar la cita libera el horario.
                  </p>
                  <Input
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    placeholder="Motivo de la cancelación (obligatorio)"
                    disabled={procesando}
                  />
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={procesando || !motivo.trim()}
                    onClick={() =>
                      ejecutar(() =>
                        onCambiarEstado(cita.id, "cancelada", motivo.trim()),
                      )
                    }
                  >
                    {procesando && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Confirmar cancelación
                  </Button>
                </div>
              )}
            </>
          )}

          {puedeGestionar && cerrada && (
            <Button
              size="sm"
              variant="outline"
              disabled={procesando}
              onClick={() => ejecutar(() => onCambiarEstado(cita.id, "agendada"))}
            >
              Reabrir cita
            </Button>
          )}

          {errorLocal && (
            <p className="rounded-md bg-red-50 p-2 text-sm text-red-700">
              {errorLocal}
            </p>
          )}

          {cita.historial.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">Historial</p>
                <ul className="space-y-1.5">
                  {cita.historial.map((evento, i) => (
                    <li key={i} className="text-xs text-slate-600">
                      <span className="font-medium text-slate-800">
                        {new Date(evento.fecha).toLocaleString("es-ES", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </span>
                      {" · "}
                      {evento.detalle || evento.accion}
                      {evento.usuario ? ` (${evento.usuario})` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
