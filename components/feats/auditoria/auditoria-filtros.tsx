"use client";

import { Button } from "@/components/shared/atom/button";
import { Input } from "@/components/shared/atom/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select";
import { Label } from "@/components/shared/atom/label";
import { Search, X } from "lucide-react";
import type {
  AuditoriaFacetas,
  AuditoriaFiltros,
} from "@/lib/types/feats/auditoria/auditoria-types";
import { etiquetaAccion } from "@/lib/types/feats/auditoria/auditoria-types";

const TODOS = "__todos__";

interface Props {
  filtros: AuditoriaFiltros;
  facetas: AuditoriaFacetas;
  onCambiar: (parcial: Partial<AuditoriaFiltros>) => void;
  onLimpiar: () => void;
}

/**
 * Convierte lo que escribe el usuario en un `datetime-local` (hora de Cuba) a
 * ISO con zona. El backend guarda en UTC; mandar la hora local sin zona movería
 * el rango cuatro horas y el evento que se busca quedaría fuera.
 */
function aISO(valor: string): string | undefined {
  if (!valor) return undefined;
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? undefined : fecha.toISOString();
}

/** Camino inverso, para repintar el valor en el input. */
function aLocal(iso?: string): string {
  if (!iso) return "";
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return "";
  const desfase = fecha.getTimezoneOffset() * 60000;
  return new Date(fecha.getTime() - desfase).toISOString().slice(0, 16);
}

export function AuditoriaFiltrosBar({ filtros, facetas, onCambiar, onLimpiar }: Props) {
  const hayFiltros = Boolean(
    filtros.texto ||
      filtros.recurso ||
      filtros.accion ||
      filtros.usuarioNombre ||
      filtros.desde ||
      filtros.hasta ||
      filtros.soloFallidos,
  );

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="lg:col-span-2">
        <Label className="text-xs text-gray-500">Buscar</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            className="pl-9"
            placeholder="Descripción, ruta, nombre o ID de la entidad"
            value={filtros.texto ?? ""}
            onChange={(e) => onCambiar({ texto: e.target.value || undefined })}
          />
        </div>
      </div>

      <div>
        <Label className="text-xs text-gray-500">Usuario</Label>
        <Select
          value={filtros.usuarioNombre ?? TODOS}
          onValueChange={(v) =>
            onCambiar({ usuarioNombre: v === TODOS ? undefined : v })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todos</SelectItem>
            {facetas.usuarios.map((usuario) => (
              <SelectItem key={usuario} value={usuario}>
                {usuario}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs text-gray-500">Módulo</Label>
        <Select
          value={filtros.recurso ?? TODOS}
          onValueChange={(v) => onCambiar({ recurso: v === TODOS ? undefined : v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todos</SelectItem>
            {facetas.recursos.map((recurso) => (
              <SelectItem key={recurso} value={recurso}>
                {recurso}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs text-gray-500">Acción</Label>
        <Select
          value={filtros.accion ?? TODOS}
          onValueChange={(v) => onCambiar({ accion: v === TODOS ? undefined : v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Todas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todas</SelectItem>
            {facetas.acciones.map((accion) => (
              <SelectItem key={accion} value={accion}>
                {etiquetaAccion(accion)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs text-gray-500">Desde</Label>
        <Input
          type="datetime-local"
          value={aLocal(filtros.desde)}
          onChange={(e) => onCambiar({ desde: aISO(e.target.value) })}
        />
      </div>

      <div>
        <Label className="text-xs text-gray-500">Hasta</Label>
        <Input
          type="datetime-local"
          value={aLocal(filtros.hasta)}
          onChange={(e) => onCambiar({ hasta: aISO(e.target.value) })}
        />
      </div>

      <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-2">
        <Button
          type="button"
          variant={filtros.soloFallidos ? "default" : "outline"}
          onClick={() => onCambiar({ soloFallidos: !filtros.soloFallidos })}
        >
          Solo fallidas
        </Button>
        {hayFiltros && (
          <Button type="button" variant="ghost" onClick={onLimpiar}>
            <X className="mr-1 h-4 w-4" />
            Limpiar
          </Button>
        )}
      </div>
    </div>
  );
}
