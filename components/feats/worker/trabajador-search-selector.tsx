"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/shared/molecule/input";
import { Label } from "@/components/shared/atom/label";
import { Button } from "@/components/shared/atom/button";
import { Search, User, X } from "lucide-react";
import type { Trabajador } from "@/lib/api-types";

interface TrabajadorSearchSelectorProps {
  label: string;
  trabajadores: Trabajador[];
  value: string;
  onChange: (ci: string) => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
}

export function TrabajadorSearchSelector({
  label,
  trabajadores,
  value,
  onChange,
  placeholder = "Buscar trabajador...",
  disabled = false,
  loading = false,
}: TrabajadorSearchSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showResults, setShowResults] = useState(false);

  const selectedTrabajador = trabajadores.find(
    (trabajador) => trabajador.CI === value,
  );

  const filteredTrabajadores = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.toLowerCase();
    return trabajadores.filter(
      (trabajador) =>
        (trabajador.nombre || "").toLowerCase().includes(term) ||
        (trabajador.CI || "").toLowerCase().includes(term) ||
        (trabajador.telefono || "").toLowerCase().includes(term) ||
        (trabajador.email || "").toLowerCase().includes(term),
    );
  }, [trabajadores, searchTerm]);

  const handleSelect = (ci: string) => {
    onChange(ci);
    setSearchTerm("");
    setShowResults(false);
  };

  const handleClear = () => {
    onChange("");
    setSearchTerm("");
    setShowResults(false);
  };

  const handleSearchFocus = () => {
    if (!selectedTrabajador) {
      setShowResults(true);
    }
  };

  return (
    <div className="relative">
      <Label>{label}</Label>

      {selectedTrabajador && !showResults ? (
        <div className="mt-1 h-10 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg flex items-center">
          <div className="flex items-center justify-between gap-2 w-full">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-blue-900 truncate text-sm leading-tight">
                {selectedTrabajador.nombre || "Sin nombre"}
              </p>
              <p className="text-xs text-blue-700">
                {selectedTrabajador.CI
                  ? `CI: ${selectedTrabajador.CI}`
                  : "Sin CI"}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              disabled={disabled}
              className="text-blue-700 hover:text-blue-900 hover:bg-blue-100 flex-shrink-0 h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="relative mt-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder={loading ? "Cargando..." : placeholder}
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setShowResults(true);
              }}
              onFocus={handleSearchFocus}
              className="pl-10"
              disabled={disabled || loading}
            />
          </div>

          {showResults && searchTerm && (
            <div className="absolute z-10 left-0 right-0 mt-1 border rounded-lg max-h-[180px] overflow-y-auto bg-white shadow-lg">
              {loading ? (
                <div className="px-4 py-6 text-center text-gray-500">
                  Cargando trabajadores...
                </div>
              ) : filteredTrabajadores.length > 0 ? (
                <div className="divide-y">
                  {filteredTrabajadores.slice(0, 20).map((trabajador) => (
                    <button
                      key={trabajador.CI}
                      type="button"
                      onClick={() => handleSelect(trabajador.CI)}
                      className="w-full text-left px-4 py-2.5 hover:bg-blue-50 transition-colors focus:bg-blue-50 focus:outline-none"
                    >
                      <p className="font-medium text-gray-900 text-sm">
                        {trabajador.nombre || "Sin nombre"}
                      </p>
                      <p className="text-xs text-gray-600 mt-0.5">
                        {trabajador.CI || "Sin CI"}
                        {trabajador.telefono
                          ? ` - Tel: ${trabajador.telefono}`
                          : ""}
                      </p>
                    </button>
                  ))}
                  {filteredTrabajadores.length > 20 && (
                    <div className="px-4 py-2 text-xs text-gray-500 text-center bg-gray-50">
                      Mostrando 20 de {filteredTrabajadores.length} resultados
                    </div>
                  )}
                </div>
              ) : (
                <div className="px-4 py-6 text-center">
                  <User className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">
                    No se encontraron trabajadores
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Intenta con otro termino
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
