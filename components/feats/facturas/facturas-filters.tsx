"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/shared/atom/button";
import { Input } from "@/components/shared/molecule/input";
import { Label } from "@/components/shared/atom/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select";
import { Card, CardContent } from "@/components/shared/molecule/card";
import { CalendarIcon, X, ArrowUpDown } from "lucide-react";
import { format } from "date-fns";
import type {
  FacturaFilters,
  EstadoFactura,
  FacturaTipo,
  FacturaSubTipo,
} from "@/lib/types/feats/facturas/factura-types";

interface FacturasFiltersProps {
  filters: FacturaFilters;
  onApplyFilters: (filters: FacturaFilters) => void;
  onClearFilters: () => void;
  reversed?: boolean;
  onToggleReversed?: () => void;
  hideEstado?: boolean;
  hideTipo?: boolean;
  hideSubtipo?: boolean;
}

export function FacturasFilters({
  filters,
  onApplyFilters,
  onClearFilters,
  reversed = false,
  onToggleReversed,
  hideEstado = false,
  hideTipo = false,
  hideSubtipo = false,
}: FacturasFiltersProps) {
  const [localFilters, setLocalFilters] = useState<FacturaFilters>(filters);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    filters.fecha_vale ? new Date(filters.fecha_vale) : undefined,
  );

  // Aplicar filtros automáticamente cuando cambian
  useEffect(() => {
    const filtersToApply: FacturaFilters = { ...localFilters };

    // Si hay fecha específica, remover mes y año
    if (selectedDate) {
      filtersToApply.fecha_vale = format(selectedDate, "yyyy-MM-dd");
      delete filtersToApply.mes_vale;
      delete filtersToApply.anio_vale;
    } else {
      delete filtersToApply.fecha_vale;
    }

    onApplyFilters(filtersToApply);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localFilters, selectedDate]);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const months = [
    { value: 1, label: "Enero" },
    { value: 2, label: "Febrero" },
    { value: 3, label: "Marzo" },
    { value: 4, label: "Abril" },
    { value: 5, label: "Mayo" },
    { value: 6, label: "Junio" },
    { value: 7, label: "Julio" },
    { value: 8, label: "Agosto" },
    { value: 9, label: "Septiembre" },
    { value: 10, label: "Octubre" },
    { value: 11, label: "Noviembre" },
    { value: 12, label: "Diciembre" },
  ];

  const estados: { value: EstadoFactura; label: string }[] = [
    { value: "terminada_pagada", label: "Terminada y Pagada" },
    { value: "terminada_no_pagada", label: "Terminada - No Pagada" },
    { value: "no_terminada", label: "No Terminada" },
  ];

  const tipos: { value: FacturaTipo; label: string }[] = [
    { value: "instaladora", label: "Instaladora" },
    { value: "cliente_directo", label: "Cliente Directo" },
  ];

  const subtipos: { value: FacturaSubTipo; label: string }[] = [
    { value: "cliente", label: "Cliente" },
    { value: "brigada", label: "Brigada" },
  ];

  const handleClear = () => {
    setLocalFilters({});
    setSelectedDate(undefined);
    onClearFilters();
  };

  const hasActiveFilters = Object.keys(filters).length > 0;

  return (
    <Card className="mb-6">
      <CardContent className="pt-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-full sm:w-auto min-w-[140px] space-y-1">
            <Label>Mes</Label>
            <Select
              value={localFilters.mes_vale?.toString() || "0"}
              onValueChange={(value) =>
                setLocalFilters({
                  ...localFilters,
                  mes_vale: value === "0" ? undefined : parseInt(value),
                })
              }
              disabled={!!selectedDate}
            >
              <SelectTrigger>
                <SelectValue placeholder="Mes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Todos</SelectItem>
                {months.map((month) => (
                  <SelectItem key={month.value} value={month.value.toString()}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full sm:w-auto min-w-[120px] space-y-1">
            <Label>Año</Label>
            <Select
              value={localFilters.anio_vale?.toString() || "0"}
              onValueChange={(value) =>
                setLocalFilters({
                  ...localFilters,
                  anio_vale: value === "0" ? undefined : parseInt(value),
                })
              }
              disabled={!!selectedDate}
            >
              <SelectTrigger>
                <SelectValue placeholder="Año" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Todos</SelectItem>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full sm:w-auto min-w-[170px] space-y-1">
            <Label>Fecha específica</Label>
            <div className="relative">
              <Input
                type="date"
                value={selectedDate ? format(selectedDate, "yyyy-MM-dd") : ""}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value) {
                    const date = new Date(value);
                    setSelectedDate(date);
                    setLocalFilters({
                      ...localFilters,
                      fecha_vale: value,
                      mes_vale: undefined,
                      anio_vale: undefined,
                    });
                  } else {
                    setSelectedDate(undefined);
                    setLocalFilters({
                      ...localFilters,
                      fecha_vale: undefined,
                    });
                  }
                }}
                disabled={!!(localFilters.mes_vale || localFilters.anio_vale)}
              />
              <CalendarIcon className="h-4 w-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {!hideEstado && (
          <div className="w-full sm:w-auto min-w-[170px] space-y-1">
            <Label>Estado</Label>
            <Select
              value={localFilters.estado}
              onValueChange={(value) =>
                setLocalFilters({
                  ...localFilters,
                  estado: value === "all" ? undefined : (value as EstadoFactura),
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                {estados.map((estado) => (
                  <SelectItem key={estado.value} value={estado.value}>
                    {estado.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          )}

          {!hideTipo && (
          <div className="w-full sm:w-auto min-w-[150px] space-y-1">
            <Label>Tipo</Label>
            <Select
              value={localFilters.tipo}
              onValueChange={(value) =>
                setLocalFilters({
                  ...localFilters,
                  tipo: value === "all" ? undefined : (value as FacturaTipo),
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos los tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {tipos.map((tipo) => (
                  <SelectItem key={tipo.value} value={tipo.value}>
                    {tipo.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          )}

          {!hideSubtipo && (
          <div className="w-full sm:w-auto min-w-[150px] space-y-1">
            <Label>Subtipo</Label>
            <Select
              value={localFilters.subtipo}
              onValueChange={(value) =>
                setLocalFilters({
                  ...localFilters,
                  subtipo: value === "all" ? undefined : (value as FacturaSubTipo),
                })
              }
              disabled={localFilters.tipo === "cliente_directo"}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos los subtipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los subtipos</SelectItem>
                {subtipos.map((subtipo) => (
                  <SelectItem key={subtipo.value} value={subtipo.value}>
                    {subtipo.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          )}

          <div className="flex-1 min-w-[220px] space-y-1">
            <Label>Buscador</Label>
            <Input
              placeholder="Buscar por cliente o número de factura..."
              value={localFilters.nombre_cliente || ""}
              onChange={(e) =>
                setLocalFilters({
                  ...localFilters,
                  nombre_cliente: e.target.value,
                })
              }
            />
          </div>

          {hasActiveFilters && (
            <div className="flex items-center gap-2 ml-auto">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <X className="h-4 w-4" />
                Limpiar
              </Button>
            </div>
          )}
          
          {onToggleReversed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleReversed}
              className="h-9 w-9 text-gray-600 hover:text-gray-700 hover:bg-gray-100"
              title={reversed ? "Más antiguas primero" : "Más recientes primero"}
            >
              <ArrowUpDown className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
