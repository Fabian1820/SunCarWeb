"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/molecule/card";
import { Badge } from "@/components/shared/atom/badge";
import { Button } from "@/components/shared/atom/button";
import {
  Battery,
  BatteryCharging,
  Sun,
  Plug,
  House,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  BloqueBateria,
  BloqueEnergia,
  EstadoRapido,
  UnidadMedida,
} from "@/lib/types/feats/equipos-felicity/equipos-felicity-types";

function num(v?: number | null, digits = 2): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return v.toFixed(digits);
}

function fechaCorta(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("es-ES", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function BloqueEnergiaCard({
  titulo,
  icon: Icon,
  bloque,
  iconClass,
}: {
  titulo: string;
  icon: typeof Sun;
  bloque: BloqueEnergia;
  iconClass: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-600 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Icon className={cn("h-4 w-4", iconClass)} />
            {titulo}
          </span>
          {bloque.disponible !== null && bloque.disponible !== undefined && (
            <Badge
              variant="outline"
              className={
                bloque.disponible
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-rose-200 bg-rose-50 text-rose-700"
              }
            >
              {bloque.disponible ? "Con tensión" : "Sin tensión"}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold text-gray-900">
          {num(bloque.potencia_kw)} <span className="text-sm font-normal text-gray-400">kW</span>
        </p>
        {bloque.lineas.length > 0 && (
          <div className="mt-3 space-y-1 border-t pt-2">
            {bloque.lineas.map((linea) => (
              <div key={linea.nombre} className="flex items-center justify-between text-xs text-gray-500">
                <span className="font-medium text-gray-600">{linea.nombre}</span>
                <span>
                  {num(linea.voltaje, 1)} V · {num(linea.corriente, 1)} A · {num(linea.potencia_kw)} kW
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function BateriaCard({ bateria }: { bateria: BloqueBateria }) {
  const flujoLabel =
    bateria.flujo === "cargando"
      ? "Cargando"
      : bateria.flujo === "descargando"
        ? "Descargando"
        : bateria.flujo === "reposo"
          ? "En reposo"
          : null;

  const flujoClass =
    bateria.flujo === "cargando"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : bateria.flujo === "descargando"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-gray-200 bg-gray-50 text-gray-600";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-600 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            {bateria.flujo === "cargando" ? (
              <BatteryCharging className="h-4 w-4 text-emerald-600" />
            ) : (
              <Battery className="h-4 w-4 text-emerald-600" />
            )}
            Batería
          </span>
          {flujoLabel && (
            <Badge variant="outline" className={flujoClass}>
              {flujoLabel}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-end gap-2">
          <p className="text-2xl font-bold text-gray-900">{num(bateria.soc, 0)}%</p>
          <span className="text-xs text-gray-400 mb-1">SOC</span>
        </div>
        <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all"
            style={{ width: `${Math.max(0, Math.min(100, bateria.soc ?? 0))}%` }}
          />
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-500 pt-1">
          <span>SOH: {num(bateria.soh, 0)}%</span>
          <span>Potencia: {num(bateria.potencia_kw)} kW</span>
          <span>Energía: {num(bateria.energia_restante_kwh, 1)} kWh</span>
          <span>
            {num(bateria.voltaje, 1)} V · {num(bateria.corriente, 1)} A
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

interface EstadoRapidoPanelProps {
  estado: EstadoRapido | null;
  loading: boolean;
  unidad: UnidadMedida;
  onUnidadChange: (unidad: UnidadMedida) => void;
  onRefrescar: () => void;
}

export function EstadoRapidoPanel({
  estado,
  loading,
  unidad,
  onUnidadChange,
  onRefrescar,
}: EstadoRapidoPanelProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Estado en vivo</h2>
          <p className="text-xs text-gray-500">
            {estado ? `Último dato: ${fechaCorta(estado.momento)}` : "Sin datos aún"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md border overflow-hidden">
            <button
              type="button"
              onClick={() => onUnidadChange("kw")}
              className={cn(
                "px-3 py-1.5 text-xs font-medium",
                unidad === "kw" ? "bg-teal-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50",
              )}
            >
              kW
            </button>
            <button
              type="button"
              onClick={() => onUnidadChange("va")}
              className={cn(
                "px-3 py-1.5 text-xs font-medium border-l",
                unidad === "va" ? "bg-teal-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50",
              )}
            >
              V/A por línea
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={onRefrescar} disabled={loading}>
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>

      {loading && !estado ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-teal-500" />
        </div>
      ) : !estado ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-sm text-gray-400">
            No se pudo obtener el estado del equipo.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <BateriaCard bateria={estado.bateria} />
          <BloqueEnergiaCard titulo="Paneles" icon={Sun} iconClass="text-amber-500" bloque={estado.paneles} />
          <BloqueEnergiaCard titulo="Red" icon={Plug} iconClass="text-sky-600" bloque={estado.red} />
          <BloqueEnergiaCard titulo="Consumo" icon={House} iconClass="text-violet-600" bloque={estado.consumo} />
        </div>
      )}
    </div>
  );
}
