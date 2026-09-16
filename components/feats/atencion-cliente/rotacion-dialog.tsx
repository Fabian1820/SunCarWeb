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
import { Loader2 } from "lucide-react";
import { AtencionClienteService } from "@/lib/services/feats/atencion-cliente/atencion-cliente-service";
import { useToast } from "@/hooks/use-toast";
import type {
  ComercialAtencion,
  ResultadoRotacion,
} from "@/lib/types/feats/atencion-cliente/atencion-cliente-types";

interface Props {
  open: boolean;
  onOpenChange: (abierto: boolean) => void;
  comerciales: ComercialAtencion[];
  desdeInicial: string;
  hastaInicial: string;
  onGenerado: () => void;
}

/**
 * Rotación asistida: reparte la guardia del periodo entre los seleccionados
 * dando a cada uno la misma cantidad de mañanas y de tardes. Por defecto NO
 * pisa los días ya planificados — lo que ya se decidió a mano se respeta salvo
 * que se pida lo contrario.
 */
export function RotacionDialog({
  open,
  onOpenChange,
  comerciales,
  desdeInicial,
  hastaInicial,
  onGenerado,
}: Props) {
  const { toast } = useToast();
  const [desde, setDesde] = useState(desdeInicial);
  const [hasta, setHasta] = useState(hastaInicial);
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [porTurno, setPorTurno] = useState(1);
  const [sobrescribir, setSobrescribir] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoRotacion | null>(null);

  useEffect(() => {
    if (!open) return;
    setDesde(desdeInicial);
    setHasta(hastaInicial);
    setResultado(null);
  }, [open, desdeInicial, hastaInicial]);

  const alternar = (ci: string) => {
    setSeleccionados((previos) =>
      previos.includes(ci) ? previos.filter((x) => x !== ci) : [...previos, ci],
    );
  };

  const generar = async () => {
    setGenerando(true);
    try {
      const salida = await AtencionClienteService.generarRotacion({
        desde,
        hasta,
        comerciales: seleccionados,
        personasPorTurno: porTurno,
        sobrescribir,
      });
      setResultado(salida);
      toast({
        title: "Rotación generada",
        description: `${salida.dias_generados} día(s) planificados.`,
      });
      onGenerado();
    } catch (error) {
      toast({
        title: "No se pudo generar",
        description: error instanceof Error ? error.message : "Error",
        variant: "destructive",
      });
    } finally {
      setGenerando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generar rotación</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
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
            <div>
              <Label className="text-xs text-gray-500">Personas por turno</Label>
              <Input
                type="number"
                min={1}
                max={20}
                value={porTurno}
                onChange={(e) => setPorTurno(Number(e.target.value) || 1)}
                className="h-9 w-24"
              />
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium">
              Quiénes entran en la rotación
            </Label>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1 max-h-56 overflow-y-auto">
              {comerciales.map((comercial) => (
                <label
                  key={comercial.CI}
                  className="flex items-center gap-2 rounded px-2 py-1 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Checkbox
                    checked={seleccionados.includes(comercial.CI)}
                    onCheckedChange={() => alternar(comercial.CI)}
                  />
                  <span>{comercial.nombre}</span>
                  <span className="text-xs text-gray-400">{comercial.cargo}</span>
                </label>
              ))}
            </div>
          </div>

          <label className="flex items-start gap-2 text-sm">
            <Checkbox
              checked={sobrescribir}
              onCheckedChange={(v) => setSobrescribir(v === true)}
            />
            <span>
              Sobrescribir los días que ya estén planificados
              <span className="block text-xs text-gray-500">
                Sin marcar, esos días se dejan tal como están y solo se rellenan
                los huecos.
              </span>
            </span>
          </label>

          {resultado && (
            <div className="rounded-lg border border-gray-200 p-3 space-y-2">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">
                  {resultado.dias_generados} día(s) generados
                </Badge>
                {resultado.dias_respetados.length > 0 && (
                  <Badge variant="outline">
                    {resultado.dias_respetados.length} respetados
                  </Badge>
                )}
              </div>
              <div className="text-sm text-gray-700 space-y-1">
                {resultado.resumen_por_comercial.map((fila) => (
                  <div key={fila.CI} className="flex justify-between">
                    <span>{fila.nombre}</span>
                    <span className="text-gray-500">
                      {fila.total} guardia(s) ·{" "}
                      {Object.entries(fila.por_turno)
                        .map(([turno, veces]) => `${turno}: ${veces}`)
                        .join(" · ") || "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
            <Button
              onClick={generar}
              disabled={generando || seleccionados.length === 0}
            >
              {generando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Generar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
