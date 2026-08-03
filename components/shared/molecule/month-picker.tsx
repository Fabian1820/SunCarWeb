"use client";

import { useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/shared/atom/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/shared/molecule/popover";
import { cn } from "@/lib/utils";

const MESES_CORTO = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

const MESES_LARGO = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function capitalizar(texto: string) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

interface MonthPickerProps {
  /** Formato "YYYY-MM", igual que <input type="month"> */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}

export function MonthPicker({
  value,
  onChange,
  placeholder = "Selecciona un mes",
  className,
  id,
}: MonthPickerProps) {
  const [open, setOpen] = useState(false);
  const [anioStr, mesStr] = value ? value.split("-") : [undefined, undefined];
  const selectedYear = anioStr ? Number(anioStr) : undefined;
  const selectedMonth = mesStr ? Number(mesStr) - 1 : undefined;

  const anioActual = new Date().getFullYear();
  const [viewYear, setViewYear] = useState(selectedYear ?? anioActual);

  const label =
    selectedYear !== undefined && selectedMonth !== undefined
      ? `${capitalizar(MESES_LARGO[selectedMonth])} ${selectedYear}`
      : placeholder;

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      setViewYear(selectedYear ?? anioActual);
    }
  }

  function handleSelect(monthIndex: number) {
    const mm = String(monthIndex + 1).padStart(2, "0");
    onChange(`${viewYear}-${mm}`);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          className={cn(
            "w-full justify-start font-normal",
            selectedYear === undefined && "text-muted-foreground",
            className,
          )}
        >
          <CalendarDays className="mr-2 h-4 w-4 shrink-0" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-60 p-3" align="start">
        <div className="mb-2 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setViewYear((y) => y - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">{viewYear}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setViewYear((y) => y + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {MESES_CORTO.map((mes, i) => {
            const isSelected = selectedYear === viewYear && selectedMonth === i;
            return (
              <button
                key={mes}
                type="button"
                onClick={() => handleSelect(i)}
                className={cn(
                  "rounded-md py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                  isSelected &&
                    "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                )}
              >
                {mes}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
