"use client";

import { ChevronLeft, ChevronRight, Loader2, MessageCircle, Plus } from "lucide-react";

import { Badge } from "@/components/shared/atom/badge";
import { Button } from "@/components/shared/atom/button";
import { Input } from "@/components/shared/atom/input";
import { Card, CardContent } from "@/components/shared/molecule/card";
import { hoyISO, sumarDias } from "@/hooks/use-citas";
import {
  CLASE_ESTADO,
  ETIQUETA_ESTADO,
  type Cita,
  type Disponibilidad,
} from "@/lib/types/feats/citas/citas-types";
import { cn } from "@/lib/utils";

interface AgendaDiaProps {
  fecha: string;
  onFechaChange: (fecha: string) => void;
  agenda: Disponibilidad | null;
  loading: boolean;
  error: string | null;
  /** Agendar en un hueco libre concreto. */
  onAgendar: (comercialCi: string, horaInicio: string) => void;
  /** Abrir el detalle de una cita ya existente. */
  onAbrirCita: (cita: Cita) => void;
  puedeAgendar: boolean;
}

export function AgendaDia({
  fecha,
  onFechaChange,
  agenda,
  loading,
  error,
  onAgendar,
  onAbrirCita,
  puedeAgendar,
}: AgendaDiaProps) {
  const esHoy = fecha === hoyISO();

  return (
    <div className="space-y-4">
      {/* Navegación de fecha */}
      <Card className="border-l-4 border-l-emerald-600">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-3 sm:p-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onFechaChange(sumarDias(fecha, -1))}
              aria-label="Día anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Input
              type="date"
              value={fecha}
              onChange={(e) => e.target.value && onFechaChange(e.target.value)}
              className="w-auto"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => onFechaChange(sumarDias(fecha, 1))}
              aria-label="Día siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            {!esHoy && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onFechaChange(hoyISO())}
              >
                Hoy
              </Button>
            )}
          </div>

          {agenda && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant="outline" className="bg-white">
                {agenda.dia_nombre}
              </Badge>
              {agenda.laborable ? (
                <>
                  <span className="text-slate-600">
                    {agenda.hora_inicio}–{agenda.hora_fin} ·{" "}
                    {agenda.duracion_slot_minutos} min
                  </span>
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                    {agenda.comerciales.reduce((n, c) => n + c.libres, 0)} libres
                  </Badge>
                  <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                    {agenda.comerciales.reduce((n, c) => n + c.ocupados, 0)} ocupados
                  </Badge>
                </>
              ) : (
                <Badge variant="outline" className="bg-slate-100 text-slate-600">
                  No laborable
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comerciales de WhatsApp del día: son quienes atienden a los que
          llegan sin cita, así que conviene tenerlas a la vista. */}
      {agenda && agenda.comerciales_whatsapp.length > 0 && (
        <Card className="border-l-4 border-l-green-500 bg-green-50/50">
          <CardContent className="flex flex-wrap items-center gap-2 p-3">
            <MessageCircle className="h-4 w-4 text-green-700" />
            <span className="text-sm font-medium text-green-900">
              Atienden WhatsApp hoy:
            </span>
            {agenda.comerciales_whatsapp.map((c) => (
              <Badge
                key={c.comercial_ci}
                variant="outline"
                className="bg-white text-green-800"
              >
                {c.comercial_nombre}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 text-sm text-red-800">{error}</CardContent>
        </Card>
      )}

      {loading && (
        <div className="flex items-center justify-center py-16 text-slate-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Cargando agenda...
        </div>
      )}

      {!loading && agenda && !agenda.laborable && (
        <Card>
          <CardContent className="py-12 text-center text-slate-500">
            <p className="font-medium">
              El {agenda.dia_nombre.toLowerCase()} no es día laborable.
            </p>
            <p className="mt-1 text-sm">
              Puedes cambiarlo en la pestaña de Configuración.
            </p>
          </CardContent>
        </Card>
      )}

      {!loading && agenda?.laborable && agenda.comerciales.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-slate-500">
            <p className="font-medium">
              Ningún comercial recibe visitas los {agenda.dia_nombre.toLowerCase()}.
            </p>
            <p className="mt-1 text-sm">
              Asigna comerciales a ese día en la pestaña de Configuración.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Rejilla comerciales × slots. Scroll horizontal propio: con 5-6
          comerciales no cabe en una laptop y el body no debe desplazarse. */}
      {!loading && agenda?.laborable && agenda.comerciales.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="sticky left-0 z-10 w-24 bg-slate-50 px-3 py-2 text-left text-xs font-semibold text-slate-600">
                  Hora
                </th>
                {agenda.comerciales.map((c) => (
                  <th
                    key={c.comercial_ci}
                    className="min-w-[180px] px-3 py-2 text-left text-xs font-semibold text-slate-700"
                  >
                    <div className="truncate">{c.comercial_nombre}</div>
                    <div className="font-normal text-slate-500">
                      {c.ocupados}/{c.slots.length} ocupados
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {agenda.slots.map((slot, fila) => (
                <tr
                  key={slot.hora_inicio}
                  className="border-b border-slate-100 last:border-b-0"
                >
                  <td className="sticky left-0 z-10 bg-white px-3 py-2 align-top text-xs font-medium text-slate-600">
                    {slot.hora_inicio}
                    <div className="text-slate-400">{slot.hora_fin}</div>
                  </td>
                  {agenda.comerciales.map((c) => {
                    const celda = c.slots[fila];
                    const cita = celda?.cita ?? null;

                    if (!cita) {
                      return (
                        <td key={c.comercial_ci} className="p-1.5 align-top">
                          <button
                            type="button"
                            disabled={!puedeAgendar}
                            onClick={() =>
                              onAgendar(c.comercial_ci, slot.hora_inicio)
                            }
                            className={cn(
                              "flex h-full min-h-[3.25rem] w-full items-center justify-center rounded-md border border-dashed border-slate-200 text-xs text-slate-400 transition-colors",
                              puedeAgendar
                                ? "hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700"
                                : "cursor-default",
                            )}
                          >
                            {puedeAgendar ? (
                              <span className="flex items-center gap-1">
                                <Plus className="h-3 w-3" /> Libre
                              </span>
                            ) : (
                              "Libre"
                            )}
                          </button>
                        </td>
                      );
                    }

                    return (
                      <td key={c.comercial_ci} className="p-1.5 align-top">
                        <button
                          type="button"
                          onClick={() => onAbrirCita(cita)}
                          className={cn(
                            "min-h-[3.25rem] w-full rounded-md border p-2 text-left transition-shadow hover:shadow-md",
                            CLASE_ESTADO[cita.estado],
                          )}
                        >
                          <p className="truncate text-xs font-semibold">
                            {cita.contacto_nombre}
                          </p>
                          {cita.motivo && (
                            <p className="truncate text-[11px] opacity-80">
                              {cita.motivo}
                            </p>
                          )}
                          <p className="mt-0.5 text-[11px] opacity-80">
                            {ETIQUETA_ESTADO[cita.estado]}
                            {cita.veces_pospuesta > 0 &&
                              ` · pospuesta ${cita.veces_pospuesta}×`}
                          </p>
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
