"use client";

import { useState } from "react";
import { Button } from "@/components/shared/atom/button";
import { Input } from "@/components/shared/atom/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shared/molecule/table";
import { Plus, Trash2 } from "lucide-react";
import {
  MONEDA_TODAS,
  TIPOS_ALERTA,
  etiquetaMoneda,
  etiquetaTipo,
} from "@/lib/types/feats/wallet-alertas/wallet-alertas-types";
import type {
  AlertaTipo,
  UmbralAlerta,
} from "@/lib/types/feats/wallet-alertas/wallet-alertas-types";

interface Props {
  umbrales: UmbralAlerta[];
  /** Códigos de moneda reales del sistema, para el desplegable. */
  monedas: string[];
  onChange: (umbrales: UmbralAlerta[]) => void;
  disabled?: boolean;
}

const claseSelect =
  "h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

export function UmbralesEditor({ umbrales, monedas, onChange, disabled }: Props) {
  const [tipo, setTipo] = useState<AlertaTipo>("gasto");
  const [moneda, setMoneda] = useState<string>(MONEDA_TODAS);
  const [monto, setMonto] = useState("");
  const [error, setError] = useState<string | null>(null);

  const agregar = () => {
    const valor = Number(monto);
    if (!Number.isFinite(valor) || valor <= 0) {
      setError("El monto debe ser un número mayor que cero");
      return;
    }
    if (umbrales.some((u) => u.tipo === tipo && u.moneda === moneda)) {
      setError(`Ya hay una regla para ${etiquetaTipo(tipo)} en ${etiquetaMoneda(moneda)}`);
      return;
    }
    onChange([...umbrales, { tipo, moneda, monto: valor }]);
    setMonto("");
    setError(null);
  };

  const quitar = (indice: number) =>
    onChange(umbrales.filter((_, i) => i !== indice));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
        <select
          className={claseSelect}
          value={tipo}
          disabled={disabled}
          onChange={(e) => {
            setTipo(e.target.value as AlertaTipo);
            setError(null);
          }}
          aria-label="Tipo de movimiento"
        >
          {TIPOS_ALERTA.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>

        <select
          className={claseSelect}
          value={moneda}
          disabled={disabled}
          onChange={(e) => {
            setMoneda(e.target.value);
            setError(null);
          }}
          aria-label="Moneda"
        >
          <option value={MONEDA_TODAS}>Todas las monedas</option>
          {monedas.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>

        <Input
          type="number"
          min="0"
          step="any"
          value={monto}
          disabled={disabled}
          placeholder="Monto mínimo"
          onChange={(e) => {
            setMonto(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              agregar();
            }
          }}
          aria-label="Monto mínimo"
        />

        <Button type="button" onClick={agregar} disabled={disabled || !monto.trim()}>
          <Plus className="h-4 w-4 mr-1" />
          Agregar
        </Button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {umbrales.length === 0 ? (
        <p className="text-sm text-gray-500">
          Sin reglas. Un tipo de movimiento sin regla nunca genera alertas.
        </p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Movimiento</TableHead>
                <TableHead>Moneda</TableHead>
                <TableHead className="text-right">Avisar desde</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {umbrales.map((u, i) => (
                <TableRow key={`${u.tipo}-${u.moneda}`}>
                  <TableCell className="font-medium">{etiquetaTipo(u.tipo)}</TableCell>
                  <TableCell>
                    {u.moneda === MONEDA_TODAS ? (
                      <span className="text-gray-500">Todas las monedas</span>
                    ) : (
                      u.moneda
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {u.monto.toLocaleString("es-ES", { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={disabled}
                      onClick={() => quitar(i)}
                      aria-label="Quitar regla"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <p className="text-xs text-gray-500">
        Una regla para una moneda concreta manda sobre la de todas las monedas. Así
        puedes avisar desde 500 en dólares y desde 200000 en pesos.
      </p>
    </div>
  );
}
