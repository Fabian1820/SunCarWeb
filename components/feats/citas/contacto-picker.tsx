"use client";

import { useEffect, useState } from "react";
import { Loader2, Search, UserPlus, X } from "lucide-react";

import { Button } from "@/components/shared/atom/button";
import { Input } from "@/components/shared/atom/input";
import { Label } from "@/components/shared/atom/label";
import { Badge } from "@/components/shared/atom/badge";
import { ClienteService } from "@/lib/services/feats/customer/cliente-service";
import { LeadService } from "@/lib/services/feats/leads/lead-service";

export interface ContactoSeleccionado {
  cliente_numero?: string | null;
  lead_id?: string | null;
  contacto_nombre: string;
  contacto_telefono?: string | null;
}

interface Resultado {
  tipo: "cliente" | "lead";
  id: string;
  nombre: string;
  telefono?: string | null;
}

interface ContactoPickerProps {
  value: ContactoSeleccionado;
  onChange: (contacto: ContactoSeleccionado) => void;
  disabled?: boolean;
}

/**
 * Elige a quién es la cita: busca entre clientes y leads, o permite escribir
 * el nombre a mano para quien todavía no está registrado.
 */
export function ContactoPicker({
  value,
  onChange,
  disabled,
}: ContactoPickerProps) {
  const [termino, setTermino] = useState("");
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [buscado, setBuscado] = useState(false);

  const vinculado = Boolean(value.cliente_numero || value.lead_id);

  // Se busca con debounce y solo a partir de 3 caracteres: con menos, la
  // consulta devuelve medio padrón y no ayuda a nadie.
  useEffect(() => {
    if (vinculado) return;
    const texto = termino.trim();
    if (texto.length < 3) {
      setResultados([]);
      setBuscado(false);
      return;
    }

    let cancelado = false;
    const timer = setTimeout(async () => {
      setBuscando(true);
      try {
        const [clientesRes, leadsRes] = await Promise.all([
          ClienteService.getClientes({ q: texto, limit: 8 }).catch(() => null),
          LeadService.getLeads({ q: texto, limit: 8 }).catch(() => null),
        ]);
        if (cancelado) return;

        const encontrados: Resultado[] = [];
        (clientesRes?.clients || []).forEach((c) => {
          if (c.numero) {
            encontrados.push({
              tipo: "cliente",
              id: c.numero,
              nombre: c.nombre || c.numero,
              telefono: c.telefono,
            });
          }
        });
        (leadsRes?.leads || []).forEach((l) => {
          if (l.id) {
            encontrados.push({
              tipo: "lead",
              id: l.id,
              nombre: l.nombre || "(sin nombre)",
              telefono: l.telefono,
            });
          }
        });
        setResultados(encontrados);
        setBuscado(true);
      } finally {
        if (!cancelado) setBuscando(false);
      }
    }, 350);

    return () => {
      cancelado = true;
      clearTimeout(timer);
    };
  }, [termino, vinculado]);

  const seleccionar = (r: Resultado) => {
    onChange({
      cliente_numero: r.tipo === "cliente" ? r.id : null,
      lead_id: r.tipo === "lead" ? r.id : null,
      contacto_nombre: r.nombre,
      contacto_telefono: r.telefono ?? null,
    });
    setTermino("");
    setResultados([]);
    setBuscado(false);
  };

  const desvincular = () => {
    onChange({
      cliente_numero: null,
      lead_id: null,
      contacto_nombre: value.contacto_nombre,
      contacto_telefono: value.contacto_telefono,
    });
  };

  if (vinculado) {
    return (
      <div className="space-y-2">
        <Label>Cita para</Label>
        <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate font-medium text-slate-900">
                {value.contacto_nombre}
              </span>
              <Badge variant="outline" className="shrink-0 bg-white">
                {value.cliente_numero ? "Cliente" : "Lead"}
              </Badge>
            </div>
            <p className="truncate text-sm text-slate-600">
              {value.contacto_telefono || "Sin teléfono"}
              {value.cliente_numero ? ` · Nº ${value.cliente_numero}` : ""}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={desvincular}
            disabled={disabled}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="cita-buscar-contacto">Cita para</Label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          id="cita-buscar-contacto"
          value={termino}
          onChange={(e) => setTermino(e.target.value)}
          placeholder="Buscar cliente o lead por nombre o teléfono..."
          className="pl-10"
          disabled={disabled}
          autoComplete="off"
        />
        {buscando && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
        )}
      </div>

      {resultados.length > 0 && (
        <div className="max-h-52 overflow-y-auto rounded-lg border border-slate-200 bg-white">
          {resultados.map((r) => (
            <button
              key={`${r.tipo}-${r.id}`}
              type="button"
              onClick={() => seleccionar(r)}
              className="flex w-full items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 text-left last:border-b-0 hover:bg-slate-50"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">
                  {r.nombre}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {r.telefono || "Sin teléfono"}
                </p>
              </div>
              <Badge variant="outline" className="shrink-0 text-xs">
                {r.tipo === "cliente" ? "Cliente" : "Lead"}
              </Badge>
            </button>
          ))}
        </div>
      )}

      {buscado && !buscando && resultados.length === 0 && (
        <p className="text-sm text-slate-500">
          Sin resultados. Escribe el nombre abajo para agendar igual.
        </p>
      )}

      {/* Escape hatch: alguien que llama por primera vez y aún no está
          registrado como lead tiene que poder tener cita igual. */}
      <div className="grid grid-cols-1 gap-3 rounded-lg border border-dashed border-slate-300 p-3 sm:grid-cols-2">
        <div className="sm:col-span-2 flex items-center gap-2 text-sm text-slate-600">
          <UserPlus className="h-4 w-4" />
          <span>O escribe los datos si no está registrado</span>
        </div>
        <div className="space-y-1">
          <Label htmlFor="cita-contacto-nombre" className="text-xs">
            Nombre
          </Label>
          <Input
            id="cita-contacto-nombre"
            value={value.contacto_nombre}
            onChange={(e) =>
              onChange({ ...value, contacto_nombre: e.target.value })
            }
            placeholder="Nombre y apellidos"
            disabled={disabled}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cita-contacto-telefono" className="text-xs">
            Teléfono
          </Label>
          <Input
            id="cita-contacto-telefono"
            value={value.contacto_telefono || ""}
            onChange={(e) =>
              onChange({ ...value, contacto_telefono: e.target.value })
            }
            placeholder="5xxxxxxx"
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
}
