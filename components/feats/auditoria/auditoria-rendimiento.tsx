"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shared/molecule/table";
import { Button } from "@/components/shared/atom/button";
import { Label } from "@/components/shared/atom/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select";
import { Gauge, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { AuditoriaService } from "@/lib/services/feats/auditoria/auditoria-service";
import type { AuditoriaRendimiento } from "@/lib/types/feats/auditoria/auditoria-types";
import {
  UMBRALES_DURACION,
  colorDuracion,
  formatearDuracion,
} from "@/lib/types/feats/auditoria/auditoria-types";

const RANGOS = [
  { horas: 24, etiqueta: "Últimas 24 h" },
  { horas: 24 * 7, etiqueta: "Últimos 7 días" },
  { horas: 24 * 30, etiqueta: "Últimos 30 días" },
];

interface Props {
  /** Lleva a la pestaña de actividad con las lentas de ese módulo ya filtradas. */
  onVerLentas: (grupo: string, umbralMs: number, agruparPor: "recurso" | "ruta") => void;
}

/**
 * Dónde se va el tiempo.
 *
 * El backend hace la cuenta con una agregación; aquí solo se elige el periodo,
 * el umbral de "lenta" y si se mira por módulo o por endpoint.
 */
export function AuditoriaRendimiento({ onVerLentas }: Props) {
  const [filas, setFilas] = useState<AuditoriaRendimiento[]>([]);
  const [horas, setHoras] = useState(24 * 7);
  const [umbral, setUmbral] = useState(2000);
  const [agruparPor, setAgruparPor] = useState<"recurso" | "ruta">("recurso");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const desde = new Date(Date.now() - horas * 3600_000).toISOString();
      setFilas(
        await AuditoriaService.rendimiento({ desde, umbralMs: umbral, agruparPor }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo calcular el rendimiento");
      setFilas([]);
    } finally {
      setCargando(false);
    }
  }, [horas, umbral, agruparPor]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label className="text-xs text-gray-500">Periodo</Label>
          <Select value={String(horas)} onValueChange={(v) => setHoras(Number(v))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RANGOS.map((rango) => (
                <SelectItem key={rango.horas} value={String(rango.horas)}>
                  {rango.etiqueta}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs text-gray-500">Se considera lenta</Label>
          <Select value={String(umbral)} onValueChange={(v) => setUmbral(Number(v))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {UMBRALES_DURACION.map((u) => (
                <SelectItem key={u.valor} value={String(u.valor)}>
                  {u.etiqueta}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs text-gray-500">Agrupar por</Label>
          <Select
            value={agruparPor}
            onValueChange={(v) => setAgruparPor(v as "recurso" | "ruta")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recurso">Módulo</SelectItem>
              <SelectItem value="ruta">Endpoint</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      {cargando && filas.length === 0 ? (
        <div className="flex items-center justify-center gap-2 py-16 text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          Calculando...
        </div>
      ) : filas.length === 0 ? (
        <div className="py-16 text-center text-gray-500">
          <Gauge className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          No hay peticiones registradas en ese periodo.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{agruparPor === "ruta" ? "Endpoint" : "Módulo"}</TableHead>
                <TableHead className="text-right">Peticiones</TableHead>
                <TableHead className="text-right">Media</TableHead>
                <TableHead className="text-right">La peor</TableHead>
                <TableHead className="text-right">Lentas</TableHead>
                <TableHead>Dónde se atasca</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filas.map((fila) => (
                <TableRow
                  key={fila.grupo}
                  className="cursor-pointer"
                  onClick={() => onVerLentas(fila.grupo, umbral, agruparPor)}
                >
                  <TableCell className="font-medium text-gray-900">{fila.grupo}</TableCell>
                  <TableCell className="text-right tabular-nums text-gray-600">
                    {fila.total.toLocaleString("es-ES")}
                  </TableCell>
                  <TableCell
                    className={cn("text-right tabular-nums", colorDuracion(fila.media_ms))}
                  >
                    {formatearDuracion(fila.media_ms)}
                  </TableCell>
                  <TableCell
                    className={cn("text-right tabular-nums", colorDuracion(fila.maxima_ms))}
                  >
                    {formatearDuracion(fila.maxima_ms)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    <span
                      className={cn(
                        "rounded px-2 py-1 text-xs font-medium",
                        fila.lentas > 0
                          ? "bg-rose-100 text-rose-700"
                          : "bg-emerald-100 text-emerald-700",
                      )}
                    >
                      {fila.lentas}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-gray-500">
                    {fila.peor?.metodo} {fila.peor?.ruta}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={cargar} disabled={cargando}>
          Recalcular
        </Button>
      </div>
    </div>
  );
}
