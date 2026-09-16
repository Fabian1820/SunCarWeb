"use client";

import { useId, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Input } from "@/components/shared/molecule/input";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/shared/molecule/popover";
import { normalizeSearchText } from "@/lib/utils/string-utils";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onValueChange: (value: string) => void;
  sugerencias: string[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Texto del desplegable cuando no hay ninguna sugerencia cargada. */
  vacioLabel?: string;
}

/**
 * Campo de texto libre CON desplegable de sugerencias.
 *
 * No es un select: lo escrito manda siempre y se puede guardar algo que no
 * esté en la lista. El desplegable solo ahorra tecleo y mantiene consistente
 * lo que se repite mes a mes.
 *
 * Se usa un Popover (que va por portal) en vez de un dropdown posicionado a
 * mano porque estos campos viven dentro de una tabla con `overflow-x-auto` y
 * de un diálogo con `overflow-y-auto`: cualquier capa absoluta quedaría
 * recortada por esos dos contenedores.
 *
 * El `<datalist>` nativo que había antes aquí quedaba invisible: sin ninguna
 * marca en el campo, nadie sabía que existían sugerencias.
 */
export function InputConSugerencias({
  value,
  onValueChange,
  sugerencias,
  placeholder,
  disabled = false,
  className,
  vacioLabel = "Sin sugerencias todavía",
}: Props) {
  const [abierto, setAbierto] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();

  const filtradas = useMemo(() => {
    const termino = normalizeSearchText(value.trim());
    if (!termino) return sugerencias.slice(0, 50);
    return sugerencias
      .filter((s) => normalizeSearchText(s).includes(termino))
      .slice(0, 50);
  }, [sugerencias, value]);

  const elegir = (sugerencia: string) => {
    onValueChange(sugerencia);
    setAbierto(false);
    inputRef.current?.focus();
  };

  return (
    <Popover open={abierto && !disabled} onOpenChange={setAbierto}>
      <PopoverAnchor asChild>
        <div className={cn("relative", className)}>
          <Input
            ref={inputRef}
            value={value}
            disabled={disabled}
            placeholder={placeholder}
            className="h-8 pr-7"
            role="combobox"
            aria-expanded={abierto}
            aria-controls={id}
            autoComplete="off"
            onChange={(e) => {
              onValueChange(e.target.value);
              if (!abierto) setAbierto(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape" && abierto) {
                e.preventDefault();
                setAbierto(false);
              }
              if (e.key === "ArrowDown" && !abierto) {
                e.preventDefault();
                setAbierto(true);
              }
            }}
          />
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            aria-label="Ver sugerencias"
            className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40"
            onClick={() => setAbierto((v) => !v)}
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>
      </PopoverAnchor>

      <PopoverContent
        id={id}
        align="start"
        sideOffset={2}
        className="max-h-56 w-[var(--radix-popover-trigger-width)] min-w-[220px] overflow-y-auto p-1"
        // El foco se queda en el input: se sigue escribiendo con el desplegable abierto.
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {filtradas.length === 0 ? (
          <p className="px-2 py-3 text-center text-xs text-slate-400">
            {sugerencias.length === 0 ? vacioLabel : "Ninguna coincide — se guarda lo escrito"}
          </p>
        ) : (
          filtradas.map((sugerencia) => (
            <button
              key={sugerencia}
              type="button"
              className="block w-full truncate rounded px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-900"
              onClick={() => elegir(sugerencia)}
            >
              {sugerencia}
            </button>
          ))
        )}
      </PopoverContent>
    </Popover>
  );
}
