"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/shared/molecule/card";
import { Button } from "@/components/shared/atom/button";
import { Badge } from "@/components/shared/atom/badge";
import { Input } from "@/components/shared/atom/input";
import { Label } from "@/components/shared/atom/label";
import { CalendarDays, Loader2, Settings, Shuffle } from "lucide-react";
import { AtencionClienteService } from "@/lib/services/feats/atencion-cliente/atencion-cliente-service";
import { ConfiguracionDialog } from "./configuracion-dialog";
import { DiaFormDialog } from "./dia-form-dialog";
import { RotacionDialog } from "./rotacion-dialog";
import { useToast } from "@/hooks/use-toast";
import type {
  ComercialAtencion,
  DiaPlanificado,
} from "@/lib/types/feats/atencion-cliente/atencion-cliente-types";

function iso(fecha: Date): string {
  return fecha.toLocaleDateString("en-CA");
}

/** Lunes de la semana en curso: es como se mira una planificación de guardias. */
function lunesDeEstaSemana(): Date {
  const hoy = new Date();
  const desplazamiento = (hoy.getDay() + 6) % 7;
  hoy.setDate(hoy.getDate() - desplazamiento);
  return hoy;
}

export function PlanificacionView() {
  const { toast } = useToast();
  const inicioSemana = lunesDeEstaSemana();
  const finQuincena = new Date(inicioSemana);
  finQuincena.setDate(finQuincena.getDate() + 13);

  const [desde, setDesde] = useState(iso(inicioSemana));
  const [hasta, setHasta] = useState(iso(finQuincena));
  const [dias, setDias] = useState<DiaPlanificado[]>([]);
  const [comerciales, setComerciales] = useState<ComercialAtencion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [diaEditando, setDiaEditando] = useState<DiaPlanificado | null>(null);
  const [configAbierta, setConfigAbierta] = useState(false);
  const [rotacionAbierta, setRotacionAbierta] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [planificacion, lista] = await Promise.all([
        AtencionClienteService.getPlanificacion(desde, hasta),
        AtencionClienteService.getComerciales(),
      ]);
      setDias(planificacion);
      setComerciales(lista);
    } catch (error) {
      toast({
        title: "No se pudo cargar la planificación",
        description: error instanceof Error ? error.message : "Error",
        variant: "destructive",
      });
    } finally {
      setCargando(false);
    }
  }, [desde, hasta, toast]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-emerald-600" />
              Planificación de guardias
            </CardTitle>
            <div className="flex flex-wrap items-end gap-2">
              <div>
                <Label className="text-xs text-gray-500">Desde</Label>
                <Input
                  type="date"
                  value={desde}
                  onChange={(e) => setDesde(e.target.value)}
                  className="h-9 w-[10.5rem]"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Hasta</Label>
                <Input
                  type="date"
                  value={hasta}
                  onChange={(e) => setHasta(e.target.value)}
                  className="h-9 w-[10.5rem]"
                />
              </div>
              <Button
                variant="outline"
                className="h-9"
                onClick={() => setRotacionAbierta(true)}
              >
                <Shuffle className="h-4 w-4 mr-2" />
                Generar rotación
              </Button>
              <Button
                variant="outline"
                className="h-9"
                onClick={() => setConfigAbierta(true)}
              >
                <Settings className="h-4 w-4 mr-2" />
                Horarios
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {cargando ? (
            <div className="flex items-center justify-center py-10 text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Cargando…
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {dias.map((dia) => {
                const sinTurnos = dia.turnos.length === 0;
                const huecos = dia.turnos.some(
                  (t) => t.comerciales.length === 0,
                );
                return (
                  <button
                    key={dia.fecha}
                    onClick={() => setDiaEditando(dia)}
                    className={`text-left rounded-lg border p-3 transition hover:border-emerald-300 hover:bg-emerald-50/40 ${
                      dia.planificado
                        ? "border-gray-200 bg-white"
                        : "border-dashed border-gray-300 bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">
                        {dia.fecha}
                      </span>
                      <span className="text-xs text-gray-500 capitalize">
                        {dia.dia_semana}
                      </span>
                    </div>

                    {sinTurnos ? (
                      <p className="mt-2 text-xs text-gray-500">Sin guardia</p>
                    ) : (
                      <div className="mt-2 space-y-1">
                        {dia.turnos.map((turno) => (
                          <div key={turno.clave} className="text-xs">
                            <span className="text-gray-500">
                              {turno.nombre} {turno.inicio}–{turno.fin}:
                            </span>{" "}
                            <span className="text-gray-800">
                              {turno.comerciales.length === 0
                                ? "—"
                                : turno.comerciales
                                    .map((c) => c.nombre)
                                    .join(", ")}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-2 flex flex-wrap gap-1">
                      {!dia.planificado && !sinTurnos && (
                        <Badge variant="outline" className="text-xs">
                          Sin planificar
                        </Badge>
                      )}
                      {dia.planificado && huecos && (
                        <Badge className="bg-amber-500 text-white text-xs">
                          Turno vacío
                        </Badge>
                      )}
                      {dia.turnos.some((t) => t.suplencias.length > 0) && (
                        <Badge variant="outline" className="text-xs">
                          Con suplencia
                        </Badge>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <DiaFormDialog
        open={diaEditando !== null}
        onOpenChange={(abierto) => !abierto && setDiaEditando(null)}
        dia={diaEditando}
        comerciales={comerciales}
        onGuardado={cargar}
      />
      <ConfiguracionDialog
        open={configAbierta}
        onOpenChange={setConfigAbierta}
        onGuardado={cargar}
      />
      <RotacionDialog
        open={rotacionAbierta}
        onOpenChange={setRotacionAbierta}
        comerciales={comerciales}
        desdeInicial={desde}
        hastaInicial={hasta}
        onGenerado={cargar}
      />
    </div>
  );
}
