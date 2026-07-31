"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/shared/atom/input";
import { Loader2, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { MaterialBusquedaService } from "@/lib/services/feats/actualizaciones-felicity/actualizaciones-felicity-service";
import type { MaterialBusqueda } from "@/lib/types/feats/actualizaciones-felicity/actualizaciones-felicity-types";

interface MaterialBuscadorProps {
  value: MaterialBusqueda | null;
  onChange: (material: MaterialBusqueda | null) => void;
  placeholder?: string;
  sinResultadosLabel?: string;
  categoria?: string;
  className?: string;
}

export function MaterialBuscador({
  value,
  onChange,
  placeholder = "Buscar por modelo, marca o código...",
  sinResultadosLabel = "Sin resultados",
  categoria,
  className,
}: MaterialBuscadorProps) {
  const [query, setQuery] = useState(value?.modelo || "");
  const [resultados, setResultados] = useState<MaterialBusqueda[]>([]);
  const [cargando, setCargando] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value?.modelo || "");
  }, [value]);

  useEffect(() => {
    if (value && query === value.modelo) {
      setResultados([]);
      setAbierto(false);
      return;
    }
    const termino = query.trim();
    if (!termino) {
      setResultados([]);
      setAbierto(false);
      return;
    }
    const handler = setTimeout(async () => {
      setCargando(true);
      try {
        const data = await MaterialBusquedaService.buscar(termino, categoria);
        setResultados(data);
        setAbierto(true);
      } catch {
        setResultados([]);
      } finally {
        setCargando(false);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, 300);
    return () => clearTimeout(handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, categoria]);

  useEffect(() => {
    const handleClickFuera = (e: MouseEvent) => {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    };
    document.addEventListener("mousedown", handleClickFuera);
    return () => document.removeEventListener("mousedown", handleClickFuera);
  }, []);

  const seleccionar = (material: MaterialBusqueda) => {
    onChange(material);
    setQuery(material.modelo);
    setAbierto(false);
  };

  const limpiar = () => {
    onChange(null);
    setQuery("");
    setResultados([]);
  };

  return (
    <div className={cn("relative", className)} ref={contenedorRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (value) onChange(null);
          }}
          onFocus={() => resultados.length > 0 && setAbierto(true)}
          placeholder={placeholder}
          className="pl-9 pr-8"
        />
        {cargando ? (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
        ) : query ? (
          <button
            type="button"
            onClick={limpiar}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {abierto && (
        <div className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto rounded-md border bg-white shadow-lg">
          {resultados.length === 0 ? (
            <p className="px-3 py-3 text-sm text-gray-400 text-center">{sinResultadosLabel}</p>
          ) : (
            resultados.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => seleccionar(m)}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b last:border-b-0"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-gray-800 truncate">{m.modelo}</span>
                  <span className="text-[10px] uppercase tracking-wide text-gray-400 shrink-0">
                    {m.categoria}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  {m.marca_nombre || "—"}
                  {m.potenciaKW ? ` · ${m.potenciaKW}kW` : ""} · {m.id}
                </p>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
