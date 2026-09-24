"use client";

import { useEffect, useState } from "react";

import { Input } from "@/components/shared/atom/input";

interface Props {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  placeholder?: string;
  "aria-label"?: string;
}

/**
 * Cantidad numérica que se puede vaciar mientras se escribe. Con
 * `value={numero}` directo, borrar dejaba un "0" pegado y al teclear salía "07".
 */
export function CantidadInput({ value, onChange, ...rest }: Props) {
  const [texto, setTexto] = useState(String(value));

  useEffect(() => {
    // Solo se sincroniza si el número cambió desde fuera; así el campo vacío
    // (que vale 0) no se vuelve a llenar con "0" mientras se escribe.
    setTexto((actual) => (Number(actual || 0) === value ? actual : String(value)));
  }, [value]);

  return (
    <Input
      type="number"
      inputMode="decimal"
      min={0}
      step="0.01"
      value={texto}
      onChange={(e) => {
        setTexto(e.target.value);
        onChange(e.target.value === "" ? 0 : Number(e.target.value));
      }}
      {...rest}
    />
  );
}
