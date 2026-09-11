"use client";

import { useMemo } from "react";
import { Badge } from "@/components/shared/atom/badge";
import { Button } from "@/components/shared/atom/button";
import { Input } from "@/components/shared/atom/input";
import { Trash2, Users, User } from "lucide-react";
import {
  ETIQUETA_TIPO,
  type TrabajoPlanificado,
} from "@/lib/types/feats/planificacion/planificacion-types";

interface Props {
  trabajos: TrabajoPlanificado[];
  onQuitar: (trabajo: TrabajoPlanificado) => void;
  onCambiarNota: (trabajo: TrabajoPlanificado, nota: string) => void;
}

export function PanelPlan({ trabajos, onQuitar, onCambiarNota }: Props) {
  // Agrupado por quién lo hace: es como se lee un plan, "mañana la brigada de
  // Daniel hace estas cuatro cosas".
  const grupos = useMemo(() => {
    const mapa = new Map<
      string,
      { nombre: string; tipo: string; trabajos: TrabajoPlanificado[] }
    >();
    for (const t of trabajos) {
      const clave = `${t.asignado.tipo}:${t.asignado.id}`;
      if (!mapa.has(clave)) {
        mapa.set(clave, { nombre: t.asignado.nombre, tipo: t.asignado.tipo, trabajos: [] });
      }
      mapa.get(clave)!.trabajos.push(t);
    }
    return [...mapa.values()].sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [trabajos]);

  if (grupos.length === 0) {
    return (
      <div className="flex min-h-[18rem] flex-col items-center justify-center rounded-lg border border-dashed bg-white p-8 text-center">
        <p className="font-medium text-gray-900">El plan está vacío</p>
        <p className="mt-1 max-w-xs text-sm text-gray-500">
          Marca clientes en la lista de la izquierda y asígnalos a una brigada.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {grupos.map((grupo) => (
        <section
          key={`${grupo.tipo}:${grupo.nombre}`}
          className="overflow-hidden rounded-lg border bg-white"
        >
          <header className="flex items-center gap-2 border-b bg-gray-50 px-4 py-2.5">
            {grupo.tipo === "brigada" ? (
              <Users className="h-4 w-4 text-gray-500" />
            ) : (
              <User className="h-4 w-4 text-gray-500" />
            )}
            <h3 className="min-w-0 flex-1 truncate font-semibold text-gray-900">
              {grupo.nombre}
            </h3>
            <Badge variant="secondary">{grupo.trabajos.length}</Badge>
          </header>
          <ul className="divide-y">
            {grupo.trabajos.map((t, i) => (
              <li key={`${t.id || "nuevo"}-${i}`} className="px-4 py-2.5">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-gray-900">
                      {t.nombre || "Sin nombre"}
                    </p>
                    <p className="truncate text-xs text-gray-500">
                      {t.direccion || "Sin dirección"}
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0 text-[11px]">
                    {ETIQUETA_TIPO[t.tipo]}
                  </Badge>
                  {t.estado !== "planificado" && (
                    <Badge
                      variant={t.estado === "cumplido" ? "default" : "destructive"}
                      className="shrink-0 text-[11px]"
                    >
                      {t.estado === "cumplido" ? "Cumplido" : "No realizado"}
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="-mr-2 h-8 shrink-0 px-2"
                    onClick={() => onQuitar(t)}
                    aria-label={`Quitar ${t.nombre} del plan`}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
                <Input
                  value={t.nota ?? ""}
                  onChange={(e) => onCambiarNota(t, e.target.value)}
                  placeholder="Nota"
                  className="mt-2 h-8 text-xs"
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
