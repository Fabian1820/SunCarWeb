"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/shared/molecule/input";
import { Checkbox } from "@/components/shared/molecule/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select";
import { normalizeString } from "@/lib/utils/string-utils";

/**
 * Selector de "qué falta" para la instalación.
 *
 * A nivel de UI se comporta como un select con 2 opciones (Aterramiento / Otro),
 * pero el valor que emite es siempre un `string` que se guarda tal cual en el
 * campo `falta_instalacion` del cliente (no se cambia ningún atributo/backend).
 *
 * Formato del string emitido:
 *   - "Aterramiento (pica)" | "Aterramiento (grapa)" | "Aterramiento (pica y grapa)"
 *   - "Aterramiento"  (si eligen aterramiento sin marcar pica/grapa)
 *   - texto libre      (opción "Otro")
 *   - ""               (nada seleccionado)
 *
 * Cualquier valor legacy que no empiece por "Aterramiento" se interpreta como
 * "Otro" con su texto precargado, así no se pierde información previa.
 */

export type FaltaTipo = "" | "aterramiento" | "otro";

export interface ParsedFalta {
  tipo: FaltaTipo;
  pica: boolean;
  grapa: boolean;
  otroTexto: string;
}

export function parseFalta(value?: string | null): ParsedFalta {
  const raw = (value ?? "").trim();
  if (!raw) return { tipo: "", pica: false, grapa: false, otroTexto: "" };

  const norm = normalizeString(raw); // p.ej. "Aterramiento (pica y grapa)" -> "aterramientopicaygrapa"
  if (norm.startsWith("aterramiento")) {
    return {
      tipo: "aterramiento",
      pica: norm.includes("pica"),
      grapa: norm.includes("grapa"),
      otroTexto: "",
    };
  }

  return { tipo: "otro", pica: false, grapa: false, otroTexto: raw };
}

export function formatFalta(p: ParsedFalta): string {
  if (p.tipo === "aterramiento") {
    const partes: string[] = [];
    if (p.pica) partes.push("pica");
    if (p.grapa) partes.push("grapa");
    return partes.length ? `Aterramiento (${partes.join(" y ")})` : "Aterramiento";
  }
  if (p.tipo === "otro") {
    return p.otroTexto.trim();
  }
  return "";
}

interface FaltaInstalacionSelectProps {
  value?: string | null;
  onChange: (value: string) => void;
  id?: string;
  disabled?: boolean;
}

export function FaltaInstalacionSelect({
  value,
  onChange,
  id,
  disabled,
}: FaltaInstalacionSelectProps) {
  const inicial = parseFalta(value);
  const [tipo, setTipo] = useState<FaltaTipo>(inicial.tipo);
  const [pica, setPica] = useState<boolean>(inicial.pica);
  const [grapa, setGrapa] = useState<boolean>(inicial.grapa);
  const [otroTexto, setOtroTexto] = useState<string>(inicial.otroTexto);

  // Resincroniza cuando `value` cambia desde afuera (p.ej. al abrir con otro
  // cliente), sin pisar lo que el usuario esté editando en este momento.
  useEffect(() => {
    const externo = formatFalta(parseFalta(value));
    const actual = formatFalta({ tipo, pica, grapa, otroTexto });
    if (externo !== actual) {
      const p = parseFalta(value);
      setTipo(p.tipo);
      setPica(p.pica);
      setGrapa(p.grapa);
      setOtroTexto(p.otroTexto);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const emit = (next: ParsedFalta) => onChange(formatFalta(next));

  const handleTipo = (nuevoTipo: FaltaTipo) => {
    setTipo(nuevoTipo);
    emit({ tipo: nuevoTipo, pica, grapa, otroTexto });
  };

  const handlePica = (checked: boolean) => {
    setPica(checked);
    emit({ tipo, pica: checked, grapa, otroTexto });
  };

  const handleGrapa = (checked: boolean) => {
    setGrapa(checked);
    emit({ tipo, pica, grapa: checked, otroTexto });
  };

  const handleOtroTexto = (texto: string) => {
    setOtroTexto(texto);
    emit({ tipo, pica, grapa, otroTexto: texto });
  };

  return (
    <div className="space-y-3">
      <Select
        value={tipo}
        onValueChange={(v) => handleTipo(v as FaltaTipo)}
        disabled={disabled}
      >
        <SelectTrigger id={id} className="text-gray-900">
          <SelectValue placeholder="Seleccionar qué falta" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="aterramiento">Aterramiento</SelectItem>
          <SelectItem value="otro">Otro</SelectItem>
        </SelectContent>
      </Select>

      {tipo === "aterramiento" && (
        <div className="flex items-center gap-6 pl-1">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <Checkbox
              checked={pica}
              onCheckedChange={(c) => handlePica(c === true)}
              disabled={disabled}
            />
            Pica
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <Checkbox
              checked={grapa}
              onCheckedChange={(c) => handleGrapa(c === true)}
              disabled={disabled}
            />
            Grapa
          </label>
        </div>
      )}

      {tipo === "otro" && (
        <Input
          value={otroTexto}
          onChange={(e) => handleOtroTexto(e.target.value)}
          placeholder="Describe qué falta..."
          disabled={disabled}
          className="text-gray-900 placeholder:text-gray-400"
        />
      )}
    </div>
  );
}
