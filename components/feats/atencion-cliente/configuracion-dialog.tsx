"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
import { Button } from "@/components/shared/atom/button";
import { Input } from "@/components/shared/atom/input";
import { Label } from "@/components/shared/atom/label";
import { Checkbox } from "@/components/shared/molecule/checkbox";
import { Badge } from "@/components/shared/atom/badge";
import { AlertTriangle, Loader2, Plus, Trash2 } from "lucide-react";
import { AtencionClienteService } from "@/lib/services/feats/atencion-cliente/atencion-cliente-service";
import { useToast } from "@/hooks/use-toast";
import type {
  ImpactoConfiguracion,
  TurnoConfig,
} from "@/lib/types/feats/atencion-cliente/atencion-cliente-types";

const NOMBRES_DIAS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

interface Props {
  open: boolean;
  onOpenChange: (abierto: boolean) => void;
  onGuardado: () => void;
}

function hoyISO(): string {
  return new Date().toLocaleDateString("en-CA");
}

/**
 * Plantilla semanal de turnos. Lo que se toca aquí es el horario POR DEFECTO:
 * afecta a lo que se planifique de ahora en adelante. Para que alcance a días
 * ya planificados hay que marcarlo expresamente, y antes se muestra a cuántos
 * días y a cuántas guardias afectaría — un cambio de horario a ciegas puede
 * borrar guardias que ya tenía gente asignada.
 */
export function ConfiguracionDialog({ open, onOpenChange, onGuardado }: Props) {
  const { toast } = useToast();
  const [dias, setDias] = useState<Record<string, TurnoConfig[]>>({});
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [aplicarAPlanificado, setAplicarAPlanificado] = useState(false);
  const [desde, setDesde] = useState(hoyISO());
  const [impacto, setImpacto] = useState<ImpactoConfiguracion | null>(null);
  const [calculando, setCalculando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCargando(true);
    setImpacto(null);
    setAplicarAPlanificado(false);
    AtencionClienteService.getConfiguracion()
      .then((config) => setDias(config.dias))
      .catch((error) =>
        toast({
          title: "No se pudo cargar la configuración",
          description: error instanceof Error ? error.message : "Error",
          variant: "destructive",
        }),
      )
      .finally(() => setCargando(false));
  }, [open, toast]);

  const actualizarTurno = (
    dia: string,
    indice: number,
    campo: keyof TurnoConfig,
    valor: string,
  ) => {
    setDias((previos) => ({
      ...previos,
      [dia]: previos[dia].map((turno, i) =>
        i === indice ? { ...turno, [campo]: valor } : turno,
      ),
    }));
    setImpacto(null);
  };

  const anadirTurno = (dia: string) => {
    setDias((previos) => ({
      ...previos,
      [dia]: [
        ...(previos[dia] || []),
        {
          clave: `turno${(previos[dia]?.length || 0) + 1}`,
          nombre: "Nuevo turno",
          inicio: "07:00",
          fin: "14:00",
        },
      ],
    }));
    setImpacto(null);
  };

  const quitarTurno = (dia: string, indice: number) => {
    setDias((previos) => ({
      ...previos,
      [dia]: previos[dia].filter((_, i) => i !== indice),
    }));
    setImpacto(null);
  };

  /** Copia los turnos de lunes al resto de días laborables: lo normal es que
   *  L-V sean iguales y nadie quiere teclear lo mismo cinco veces. */
  const copiarALaborables = () => {
    setDias((previos) => ({
      ...previos,
      "1": previos["0"].map((t) => ({ ...t })),
      "2": previos["0"].map((t) => ({ ...t })),
      "3": previos["0"].map((t) => ({ ...t })),
      "4": previos["0"].map((t) => ({ ...t })),
    }));
    setImpacto(null);
  };

  const verImpacto = async () => {
    setCalculando(true);
    try {
      setImpacto(await AtencionClienteService.getImpacto(dias, desde));
    } catch (error) {
      toast({
        title: "No se pudo calcular el impacto",
        description: error instanceof Error ? error.message : "Error",
        variant: "destructive",
      });
    } finally {
      setCalculando(false);
    }
  };

  const guardar = async () => {
    setGuardando(true);
    try {
      const resultado = await AtencionClienteService.guardarConfiguracion(
        dias,
        aplicarAPlanificado ? desde : undefined,
      );
      toast({
        title: "Horarios guardados",
        description: aplicarAPlanificado
          ? `${resultado.dias_reescritos} día(s) ya planificados se actualizaron.`
          : "Rigen para lo que se planifique de ahora en adelante.",
      });
      onGuardado();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "No se pudo guardar",
        description: error instanceof Error ? error.message : "Error",
        variant: "destructive",
      });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Horarios predeterminados</DialogTitle>
        </DialogHeader>

        {cargando ? (
          <div className="flex items-center justify-center py-10 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Cargando…
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={copiarALaborables}>
                Copiar lunes a martes–viernes
              </Button>
            </div>

            {NOMBRES_DIAS.map((nombre, indice) => {
              const clave = String(indice);
              const turnos = dias[clave] || [];
              return (
                <div key={clave} className="rounded-lg border border-gray-200 p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900">{nombre}</span>
                    <div className="flex items-center gap-2">
                      {turnos.length === 0 && (
                        <span className="text-xs text-gray-500">Sin guardia</span>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => anadirTurno(clave)}
                      >
                        <Plus className="h-4 w-4 mr-1" /> Turno
                      </Button>
                    </div>
                  </div>
                  {turnos.map((turno, i) => (
                    <div
                      key={`${clave}-${i}`}
                      className="mt-2 flex flex-wrap items-end gap-2"
                    >
                      <div>
                        <Label className="text-xs text-gray-500">Nombre</Label>
                        <Input
                          value={turno.nombre}
                          onChange={(e) =>
                            actualizarTurno(clave, i, "nombre", e.target.value)
                          }
                          className="h-9 w-40"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Clave</Label>
                        <Input
                          value={turno.clave}
                          onChange={(e) =>
                            actualizarTurno(clave, i, "clave", e.target.value)
                          }
                          className="h-9 w-32"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Desde</Label>
                        <Input
                          type="time"
                          value={turno.inicio}
                          onChange={(e) =>
                            actualizarTurno(clave, i, "inicio", e.target.value)
                          }
                          className="h-9 w-28"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Hasta</Label>
                        <Input
                          type="time"
                          value={turno.fin}
                          onChange={(e) =>
                            actualizarTurno(clave, i, "fin", e.target.value)
                          }
                          className="h-9 w-28"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-red-600"
                        onClick={() => quitarTurno(clave, i)}
                        aria-label="Quitar turno"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              );
            })}

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-3">
              <div className="flex items-start gap-2">
                <Checkbox
                  id="aplicar-planificado"
                  checked={aplicarAPlanificado}
                  onCheckedChange={(v) => {
                    setAplicarAPlanificado(v === true);
                    setImpacto(null);
                  }}
                />
                <div>
                  <Label htmlFor="aplicar-planificado" className="font-medium">
                    Aplicar también a los días ya planificados
                  </Label>
                  <p className="text-xs text-gray-600">
                    Sin marcar, el horario nuevo solo rige para lo que se
                    planifique después. La gente ya asignada se conserva siempre
                    que su turno siga existiendo ese día.
                  </p>
                </div>
              </div>

              {aplicarAPlanificado && (
                <div className="flex flex-wrap items-end gap-2">
                  <div>
                    <Label className="text-xs text-gray-500">Desde el día</Label>
                    <Input
                      type="date"
                      value={desde}
                      onChange={(e) => {
                        setDesde(e.target.value);
                        setImpacto(null);
                      }}
                      className="h-9 w-[10.5rem]"
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={verImpacto}
                    disabled={calculando}
                    className="h-9"
                  >
                    {calculando && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    Ver qué cambiaría
                  </Button>
                </div>
              )}

              {impacto && (
                <div className="space-y-2 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">
                      {impacto.dias_afectados.length} día(s) afectados
                    </Badge>
                    {impacto.guardias_que_se_pierden > 0 && (
                      <Badge className="bg-red-600 text-white">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {impacto.guardias_que_se_pierden} guardia(s) se perderían
                      </Badge>
                    )}
                  </div>
                  <div className="max-h-44 overflow-y-auto space-y-1">
                    {impacto.dias_afectados.map((dia) => (
                      <div key={dia.fecha} className="text-xs text-gray-700">
                        <span className="font-medium">
                          {dia.fecha} ({dia.dia_semana})
                        </span>
                        {dia.cambios.map((cambio, i) => (
                          <div key={i} className="pl-3">
                            · {cambio.turno}: {cambio.detalle}
                            {cambio.comerciales.length > 0 && (
                              <span className="text-gray-500">
                                {" "}
                                ({cambio.comerciales.join(", ")})
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                    {impacto.dias_afectados.length === 0 && (
                      <p className="text-xs text-gray-600">
                        Ningún día planificado cambia con este horario.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={guardar} disabled={guardando}>
                {guardando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Guardar horarios
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
