"use client";

import { useState } from "react";
import { Button } from "@/components/shared/atom/button";
import { Input } from "@/components/shared/atom/input";
import { Plus, Trash2, Phone } from "lucide-react";
import {
  normalizarTelefono,
  telefonoValido,
} from "@/lib/types/feats/wallet-alertas/wallet-alertas-types";

interface Props {
  destinatarios: string[];
  onChange: (destinatarios: string[]) => void;
  disabled?: boolean;
}

export function DestinatariosEditor({ destinatarios, onChange, disabled }: Props) {
  const [nuevo, setNuevo] = useState("");
  const [error, setError] = useState<string | null>(null);

  const agregar = () => {
    const numero = normalizarTelefono(nuevo);
    if (!numero) return;
    if (!telefonoValido(numero)) {
      setError("Debe ser un número internacional, por ejemplo +5355512345");
      return;
    }
    if (destinatarios.includes(numero)) {
      setError("Ese número ya está en la lista");
      return;
    }
    onChange([...destinatarios, numero]);
    setNuevo("");
    setError(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          value={nuevo}
          onChange={(e) => {
            setNuevo(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              agregar();
            }
          }}
          placeholder="+5355512345"
          disabled={disabled}
          aria-label="Número de teléfono"
        />
        <Button type="button" onClick={agregar} disabled={disabled || !nuevo.trim()}>
          <Plus className="h-4 w-4 mr-1" />
          Agregar
        </Button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {destinatarios.length === 0 ? (
        <p className="text-sm text-gray-500">
          Sin destinatarios. Mientras la lista esté vacía no se enviará ninguna alerta.
        </p>
      ) : (
        <ul className="divide-y rounded-md border">
          {destinatarios.map((numero) => (
            <li key={numero} className="flex items-center justify-between px-3 py-2">
              <span className="flex items-center gap-2 font-mono text-sm">
                <Phone className="h-4 w-4 text-gray-400" />
                {numero}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={() => onChange(destinatarios.filter((n) => n !== numero))}
                aria-label={`Quitar ${numero}`}
              >
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
