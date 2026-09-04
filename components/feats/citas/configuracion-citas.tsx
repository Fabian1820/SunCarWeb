"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, MessageCircle, Save, Users } from "lucide-react";

import { Badge } from "@/components/shared/atom/badge";
import { Button } from "@/components/shared/atom/button";
import { Input } from "@/components/shared/atom/input";
import { Label } from "@/components/shared/atom/label";
import { Card, CardContent } from "@/components/shared/molecule/card";
import { Checkbox } from "@/components/shared/molecule/checkbox";
import { Switch } from "@/components/shared/molecule/switch";
import { useToast } from "@/hooks/use-toast";
import { CitasService } from "@/lib/services/feats/citas/citas-service";
import { EquipoComercialService } from "@/lib/services/feats/distribucion-comerciales/equipo-comercial-service";
import { DIAS_SEMANA, type HorarioDia } from "@/lib/types/feats/citas/citas-types";
import type { ComercialDistribucion } from "@/lib/types/feats/distribucion-comerciales/distribucion-types";
import { cn } from "@/lib/utils";

interface ConfiguracionCitasProps {
  puedeEditar: boolean;
  onGuardado?: () => void;
}

/**
 * Configuración recurrente: la misma distribución se aplica todas las semanas.
 * Por cada día se define el horario, la duración del slot, quién recibe
 * visitas agendadas y quién atiende WhatsApp.
 */
export function ConfiguracionCitas({
  puedeEditar,
  onGuardado,
}: ConfiguracionCitasProps) {
  const { toast } = useToast();
  const [dias, setDias] = useState<HorarioDia[]>([]);
  const [comerciales, setComerciales] = useState<ComercialDistribucion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [config, listaComerciales] = await Promise.all([
        CitasService.obtenerConfiguracion(),
        EquipoComercialService.getComerciales(),
      ]);
      // El backend siempre devuelve los 7 días (config guardada o la de por
      // defecto), pero se normaliza por si un documento viejo trae menos.
      const porDia = new Map(config.dias.map((d) => [d.dia_semana, d]));
      setDias(
        DIAS_SEMANA.map(
          ({ valor }) =>
            porDia.get(valor) ?? {
              dia_semana: valor,
              activo: valor !== 7,
              hora_inicio: "09:00",
              hora_fin: "17:00",
              duracion_slot_minutos: 60,
              comerciales_visitas: [],
              comerciales_whatsapp: [],
            },
        ),
      );
      setComerciales(listaComerciales);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo cargar la configuración",
      );
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const actualizarDia = (diaSemana: number, cambios: Partial<HorarioDia>) => {
    setDias((prev) =>
      prev.map((d) => (d.dia_semana === diaSemana ? { ...d, ...cambios } : d)),
    );
  };

  const alternarComercial = (
    diaSemana: number,
    campo: "comerciales_visitas" | "comerciales_whatsapp",
    ci: string,
  ) => {
    setDias((prev) =>
      prev.map((d) => {
        if (d.dia_semana !== diaSemana) return d;
        const actual = d[campo];
        return {
          ...d,
          [campo]: actual.includes(ci)
            ? actual.filter((x) => x !== ci)
            : [...actual, ci],
        };
      }),
    );
  };

  const guardar = async () => {
    setGuardando(true);
    setError(null);
    try {
      await CitasService.guardarConfiguracion(dias);
      toast({
        title: "Configuración guardada",
        description: "La distribución se aplicará a partir de ahora.",
      });
      onGuardado?.();
    } catch (e) {
      const mensaje =
        e instanceof Error ? e.message : "No se pudo guardar la configuración";
      setError(mensaje);
      toast({
        title: "No se pudo guardar",
        description: mensaje,
        variant: "destructive",
      });
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Cargando configuración...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-l-4 border-l-blue-500 bg-blue-50/50">
        <CardContent className="p-4 text-sm text-blue-900">
          Esta distribución se repite <strong>todas las semanas</strong>. Por cada
          día define el horario, cuánto dura cada cita, qué comerciales reciben
          visitas agendadas y cuáles atienden WhatsApp (estas últimas son las que
          atienden a quien llega sin cita).
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 text-sm text-red-800">{error}</CardContent>
        </Card>
      )}

      {comerciales.length === 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 text-sm text-amber-900">
            No hay comerciales registrados. Se listan los trabajadores con cargo
            &quot;Comercial Instaladora&quot; o &quot;Comercial Ventas&quot;.
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {dias.map((dia) => {
          const meta = DIAS_SEMANA.find((d) => d.valor === dia.dia_semana)!;
          return (
            <Card
              key={dia.dia_semana}
              className={cn(!dia.activo && "bg-slate-50 opacity-75")}
            >
              <CardContent className="space-y-4 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={dia.activo}
                      onCheckedChange={(v) =>
                        actualizarDia(dia.dia_semana, { activo: v })
                      }
                      disabled={!puedeEditar}
                      id={`dia-activo-${dia.dia_semana}`}
                    />
                    <Label
                      htmlFor={`dia-activo-${dia.dia_semana}`}
                      className="text-base font-semibold"
                    >
                      {meta.nombre}
                    </Label>
                    {!dia.activo && (
                      <Badge variant="outline" className="text-slate-500">
                        No laborable
                      </Badge>
                    )}
                  </div>

                  {dia.activo && (
                    <div className="flex flex-wrap items-end gap-2">
                      <div className="space-y-1">
                        <Label
                          htmlFor={`inicio-${dia.dia_semana}`}
                          className="text-xs"
                        >
                          Desde
                        </Label>
                        <Input
                          id={`inicio-${dia.dia_semana}`}
                          type="time"
                          value={dia.hora_inicio}
                          onChange={(e) =>
                            actualizarDia(dia.dia_semana, {
                              hora_inicio: e.target.value,
                            })
                          }
                          disabled={!puedeEditar}
                          className="w-28"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label
                          htmlFor={`fin-${dia.dia_semana}`}
                          className="text-xs"
                        >
                          Hasta
                        </Label>
                        <Input
                          id={`fin-${dia.dia_semana}`}
                          type="time"
                          value={dia.hora_fin}
                          onChange={(e) =>
                            actualizarDia(dia.dia_semana, {
                              hora_fin: e.target.value,
                            })
                          }
                          disabled={!puedeEditar}
                          className="w-28"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label
                          htmlFor={`slot-${dia.dia_semana}`}
                          className="text-xs"
                        >
                          Minutos por cita
                        </Label>
                        <Input
                          id={`slot-${dia.dia_semana}`}
                          type="number"
                          min={15}
                          max={480}
                          step={15}
                          value={dia.duracion_slot_minutos}
                          onChange={(e) =>
                            actualizarDia(dia.dia_semana, {
                              duracion_slot_minutos: Number(e.target.value) || 60,
                            })
                          }
                          disabled={!puedeEditar}
                          className="w-24"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {dia.activo && comerciales.length > 0 && (
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <div className="space-y-2 rounded-lg border border-slate-200 p-3">
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <Users className="h-4 w-4 text-emerald-600" />
                        Reciben visitas agendadas
                        <Badge variant="outline" className="ml-auto">
                          {dia.comerciales_visitas.length}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                        {comerciales.map((c) => (
                          <label
                            key={`v-${dia.dia_semana}-${c.CI}`}
                            className="flex items-center gap-2 text-sm text-slate-700"
                          >
                            <Checkbox
                              checked={dia.comerciales_visitas.includes(c.CI)}
                              onCheckedChange={() =>
                                alternarComercial(
                                  dia.dia_semana,
                                  "comerciales_visitas",
                                  c.CI,
                                )
                              }
                              disabled={!puedeEditar}
                            />
                            <span className="truncate">{c.nombre}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2 rounded-lg border border-slate-200 p-3">
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <MessageCircle className="h-4 w-4 text-green-600" />
                        Atienden WhatsApp
                        <Badge variant="outline" className="ml-auto">
                          {dia.comerciales_whatsapp.length}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                        {comerciales.map((c) => (
                          <label
                            key={`w-${dia.dia_semana}-${c.CI}`}
                            className="flex items-center gap-2 text-sm text-slate-700"
                          >
                            <Checkbox
                              checked={dia.comerciales_whatsapp.includes(c.CI)}
                              onCheckedChange={() =>
                                alternarComercial(
                                  dia.dia_semana,
                                  "comerciales_whatsapp",
                                  c.CI,
                                )
                              }
                              disabled={!puedeEditar}
                            />
                            <span className="truncate">{c.nombre}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {puedeEditar && (
        <div className="flex justify-end">
          <Button onClick={guardar} disabled={guardando}>
            {guardando ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Guardar configuración
          </Button>
        </div>
      )}
    </div>
  );
}
