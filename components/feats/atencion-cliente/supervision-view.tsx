"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/shared/molecule/card";
import { Input } from "@/components/shared/atom/input";
import { Label } from "@/components/shared/atom/label";
import { Badge } from "@/components/shared/atom/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shared/molecule/table";
import { BarChart3, Loader2 } from "lucide-react";
import { AtencionClienteService } from "@/lib/services/feats/atencion-cliente/atencion-cliente-service";
import { useToast } from "@/hooks/use-toast";
import type { SupervisionResumen } from "@/lib/types/feats/atencion-cliente/atencion-cliente-types";

function iso(fecha: Date): string {
  return fecha.toLocaleDateString("en-CA");
}

export function SupervisionView() {
  const { toast } = useToast();
  const haceUnaSemana = new Date();
  haceUnaSemana.setDate(haceUnaSemana.getDate() - 6);

  const [desde, setDesde] = useState(iso(haceUnaSemana));
  const [hasta, setHasta] = useState(iso(new Date()));
  const [resumen, setResumen] = useState<SupervisionResumen | null>(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setResumen(await AtencionClienteService.getSupervision(desde, hasta));
    } catch (error) {
      toast({
        title: "No se pudo cargar la supervisión",
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
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-emerald-600" />
            Trabajo de atención al cliente
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
          </div>
        </div>
        <p className="text-xs text-gray-500">
          Cuenta los leads por el momento en que se registraron en el sistema, no
          por la fecha de contacto que se teclea en el formulario. Los leads
          anteriores a esta función y los que entran por el asistente no tienen
          registrador y no aparecen aquí.
        </p>
      </CardHeader>
      <CardContent>
        {cargando ? (
          <div className="flex items-center justify-center py-10 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Cargando…
          </div>
        ) : !resumen || resumen.por_persona.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">
            No hay actividad registrada en este periodo.
          </p>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap gap-2">
              <Badge variant="outline">
                {resumen.totales.registrados} leads registrados
              </Badge>
              <Badge variant="outline">
                {resumen.totales.repartidos} repartidos
              </Badge>
              {resumen.totales.sin_repartir > 0 && (
                <Badge className="bg-amber-500 text-white">
                  {resumen.totales.sin_repartir} sin repartir
                </Badge>
              )}
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Persona</TableHead>
                    <TableHead className="text-right">Días de guardia</TableHead>
                    <TableHead className="text-right">Registrados</TableHead>
                    <TableHead className="text-right">Repartidos</TableHead>
                    <TableHead className="text-right">Sin repartir</TableHead>
                    <TableHead className="text-right">Fuera de turno</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resumen.por_persona.map((fila) => (
                    <TableRow key={fila.CI}>
                      <TableCell className="font-medium">{fila.nombre}</TableCell>
                      <TableCell className="text-right">
                        {fila.dias_de_guardia}
                      </TableCell>
                      <TableCell className="text-right">
                        {fila.registrados}
                      </TableCell>
                      <TableCell className="text-right">
                        {fila.repartidos}
                      </TableCell>
                      <TableCell className="text-right">
                        {fila.sin_repartir > 0 ? (
                          <span className="text-amber-700">
                            {fila.sin_repartir}
                          </span>
                        ) : (
                          0
                        )}
                      </TableCell>
                      <TableCell className="text-right text-gray-500">
                        {fila.fuera_de_turno}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
