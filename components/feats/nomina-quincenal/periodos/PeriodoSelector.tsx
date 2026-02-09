"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/shared/atom/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/shared/molecule/dropdown-menu";
import { Calendar, ChevronDown, Plus, Clock, CheckCircle2 } from "lucide-react";
import type { PeriodoNomina, Quincena } from "@/lib/types/feats/nomina-quincenal";

interface PeriodoSelectorProps {
  periodoActual: PeriodoNomina | null;
  periodosDisponibles: PeriodoNomina[];
  onChange: (periodo: PeriodoNomina) => void;
  onCrearPeriodo: () => void;
  disabled?: boolean;
}

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

export function PeriodoSelector({
  periodoActual,
  periodosDisponibles,
  onChange,
  onCrearPeriodo,
  disabled = false,
}: PeriodoSelectorProps) {
  const [open, setOpen] = useState(false);

  const formatearPeriodo = (periodo: PeriodoNomina) => {
    return `${MESES[periodo.mes - 1]} ${periodo.anio} - Q${periodo.quincena}`;
  };

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case "abierto":
        return <div className="w-2 h-2 rounded-full bg-blue-500" />;
      case "en_calculo":
        return <div className="w-2 h-2 rounded-full bg-yellow-500" />;
      case "cerrado":
        return <div className="w-2 h-2 rounded-full bg-green-500" />;
      case "pagado":
        return <CheckCircle2 className="w-4 h-4 text-purple-500" />;
      default:
        return <div className="w-2 h-2 rounded-full bg-gray-400" />;
    }
  };

  const getEstadoLabel = (estado: string) => {
    const labels: Record<string, string> = {
      abierto: "Abierto",
      en_calculo: "En cálculo",
      cerrado: "Cerrado",
      pagado: "Pagado",
      archivado: "Archivado",
    };
    return labels[estado] || estado;
  };

  // Agrupar períodos por mes
  const periodosAgrupados = periodosDisponibles.reduce((acc, periodo) => {
    const key = `${periodo.anio}-${periodo.mes}`;
    if (!acc[key]) {
      acc[key] = {
        anio: periodo.anio,
        mes: periodo.mes,
        periodos: [],
      };
    }
    acc[key].periodos.push(periodo);
    return acc;
  }, {} as Record<string, { anio: number; mes: number; periodos: PeriodoNomina[] }>);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-between bg-white",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          disabled={disabled}
        >
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            {periodoActual ? (
              <span className="font-medium">
                {formatearPeriodo(periodoActual)}
              </span>
            ) : (
              <span className="text-gray-500">Seleccionar período...</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {periodoActual && (
              <span className="text-xs text-gray-500">
                Pago: {new Date(periodoActual.fechaPago).toLocaleDateString("es-ES")}
              </span>
            )}
            <ChevronDown className="w-4 h-4 text-gray-500" />
          </div>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-80 max-h-96 overflow-y-auto" align="start">
        {periodoActual && (
          <>
            <div className="px-3 py-2 bg-purple-50 border-b border-purple-100">
              <p className="text-xs font-medium text-purple-700">PERÍODO ACTUAL</p>
              <div className="flex items-center justify-between mt-1">
                <span className="font-semibold text-gray-900">
                  {formatearPeriodo(periodoActual)}
                </span>
                <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                  {getEstadoLabel(periodoActual.estado)}
                </span>
              </div>
            </div>
            <DropdownMenuSeparator />
          </>
        )}

        <div className="px-3 py-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Períodos disponibles
          </p>
        </div>

        {Object.values(periodosAgrupados)
          .sort((a, b) => {
            if (a.anio !== b.anio) return b.anio - a.anio;
            return b.mes - a.mes;
          })
          .map((grupo) => (
            <div key={`${grupo.anio}-${grupo.mes}`}>
              <div className="px-3 py-1.5 text-xs font-medium text-gray-500 bg-gray-50">
                {MESES[grupo.mes - 1]} {grupo.anio}
              </div>
              {grupo.periodos
                .sort((a, b) => b.quincena - a.quincena)
                .map((periodo) => (
                  <DropdownMenuItem
                    key={periodo.id}
                    onClick={() => {
                      onChange(periodo);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex items-center justify-between cursor-pointer",
                      periodoActual?.id === periodo.id && "bg-purple-50"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {getEstadoIcon(periodo.estado)}
                      <span>Quincena {periodo.quincena}</span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(periodo.fechaPago).toLocaleDateString("es-ES", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </span>
                  </DropdownMenuItem>
                ))}
            </div>
          ))}

        {periodosDisponibles.length === 0 && (
          <div className="px-3 py-4 text-center text-sm text-gray-500">
            No hay períodos disponibles
          </div>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => {
            onCrearPeriodo();
            setOpen(false);
          }}
          className="cursor-pointer text-purple-700 focus:text-purple-700 focus:bg-purple-50"
        >
          <Plus className="w-4 h-4 mr-2" />
          Crear nuevo período
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
