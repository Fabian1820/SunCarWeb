"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/shared/molecule/input";
import { Label } from "@/components/shared/atom/label";
import { Badge } from "@/components/shared/atom/badge";
import { Search, User, X } from "lucide-react";
import type { Trabajador } from "@/lib/api-types";
import { normalizeSearchText } from "@/lib/utils/string-utils";

interface TrabajadoresMultiSelectorProps {
  label: string;
  trabajadores: Trabajador[];
  /** CIs seleccionados. */
  value: string[];
  onChange: (cis: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
}

/**
 * Variante multi-select de TrabajadorSearchSelector: buscar y elegir varios
 * trabajadores a la vez, con chips para los ya seleccionados.
 */
export function TrabajadoresMultiSelector({
  label,
  trabajadores,
  value,
  onChange,
  placeholder = "Buscar trabajador...",
  disabled = false,
  loading = false,
}: TrabajadoresMultiSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showResults, setShowResults] = useState(false);

  const seleccionados = useMemo(
    () => trabajadores.filter((t) => value.includes(t.CI)),
    [trabajadores, value],
  );

  const filteredTrabajadores = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = normalizeSearchText(searchTerm);
    return trabajadores.filter(
      (t) =>
        !value.includes(t.CI) &&
        (normalizeSearchText(t.nombre || "").includes(term) ||
          normalizeSearchText(t.CI || "").includes(term) ||
          normalizeSearchText(t.telefono || "").includes(term) ||
          normalizeSearchText(t.email || "").includes(term)),
    );
  }, [trabajadores, searchTerm, value]);

  const agregar = (ci: string) => {
    onChange([...value, ci]);
    setSearchTerm("");
  };

  const quitar = (ci: string) => {
    onChange(value.filter((v) => v !== ci));
  };

  return (
    <div className="relative">
      <Label>{label}</Label>

      {seleccionados.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {seleccionados.map((t) => (
            <Badge
              key={t.CI}
              variant="outline"
              className="flex items-center gap-1 bg-blue-50 text-blue-900 border-blue-200"
            >
              {t.nombre || t.CI}
              <button
                type="button"
                onClick={() => quitar(t.CI)}
                disabled={disabled}
                className="rounded-full hover:bg-blue-200/60"
                aria-label={`Quitar a ${t.nombre || t.CI}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <div className="relative mt-1.5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder={loading ? "Cargando..." : placeholder}
          value={searchTerm}
          onChange={(event) => {
            setSearchTerm(event.target.value);
            setShowResults(true);
          }}
          onFocus={() => setShowResults(true)}
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
              {filteredTrabajadores.slice(0, 20).map((t) => (
                <button
                  key={t.CI}
                  type="button"
                  onClick={() => agregar(t.CI)}
                  className="w-full text-left px-4 py-2.5 hover:bg-blue-50 transition-colors focus:bg-blue-50 focus:outline-none"
                >
                  <p className="font-medium text-gray-900 text-sm">
                    {t.nombre || "Sin nombre"}
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {t.CI || "Sin CI"}
                    {t.telefono ? ` - Tel: ${t.telefono}` : ""}
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
                {searchTerm.trim() && trabajadores.some((t) => value.includes(t.CI))
                  ? "Ya está seleccionado o no se encontró"
                  : "No se encontraron trabajadores"}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
