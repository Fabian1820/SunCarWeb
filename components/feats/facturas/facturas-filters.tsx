"use client";

import { useState } from "react";
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
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import type {
  FacturaFilters,
  EstadoFactura,
} from "@/lib/types/feats/facturas/factura-types";

interface FacturasFiltersProps {
  filters: FacturaFilters;
  onApplyFilters: (filters: FacturaFilters) => void;
  onClearFilters: () => void;
}

export function FacturasFilters({
  filters,
  onApplyFilters,
  onClearFilters,
}: FacturasFiltersProps) {
  const [localFilters, setLocalFilters] = useState<FacturaFilters>(filters);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    filters.fecha_especifica ? new Date(filters.fecha_especifica) : undefined,
  );

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

  const handleApply = () => {
    const filtersToApply: FacturaFilters = { ...localFilters };

    // Si hay fecha específica, remover mes y año
    if (selectedDate) {
      filtersToApply.fecha_especifica = format(selectedDate, "yyyy-MM-dd");
      delete filtersToApply.mes;
      delete filtersToApply.anio;
    } else {
      delete filtersToApply.fecha_especifica;
    }

    onApplyFilters(filtersToApply);
  };

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
              value={localFilters.mes?.toString()}
              onValueChange={(value) =>
                setLocalFilters({
                  ...localFilters,
                  mes: value ? parseInt(value) : undefined,
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
              value={localFilters.anio?.toString()}
              onValueChange={(value) =>
                setLocalFilters({
                  ...localFilters,
                  anio: value ? parseInt(value) : undefined,
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
                      fecha_especifica: value,
                      mes: undefined,
                      anio: undefined,
                    });
                  } else {
                    setSelectedDate(undefined);
                    setLocalFilters({
                      ...localFilters,
                      fecha_especifica: undefined,
                    });
                  }
                }}
                disabled={!!(localFilters.mes || localFilters.anio)}
              />
              <CalendarIcon className="h-4 w-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div className="w-full sm:w-auto min-w-[170px] space-y-1">
            <Label>Estado</Label>
            <Select
              value={localFilters.estado}
              onValueChange={(value) =>
                setLocalFilters({
                  ...localFilters,
                  estado: value as EstadoFactura,
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

          <div className="flex items-center gap-2 ml-auto">
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <X className="h-4 w-4" />
                Limpiar
              </Button>
            )}
            <Button
              onClick={handleApply}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Aplicar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
