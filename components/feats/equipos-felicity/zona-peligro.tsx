"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/molecule/card";
import { Badge } from "@/components/shared/atom/badge";
import { Button } from "@/components/shared/atom/button";
import { Loader2, ShieldAlert } from "lucide-react";
import { useOperacionesCatalogo } from "@/hooks/use-equipos-felicity";
import { OperacionDialog } from "@/components/feats/equipos-felicity/operacion-dialog";
import {
  CLASE_NIVEL_RIESGO,
  ETIQUETA_NIVEL_RIESGO,
  type OperacionCatalogoItem,
} from "@/lib/types/feats/equipos-felicity/equipos-felicity-types";

const ORDEN_RIESGO: Record<string, number> = { SEGURO: 0, PRECAUCION: 1, CRITICO: 2 };

interface ZonaPeligroProps {
  sn: string;
  onEjecutado: () => void;
}

export function ZonaPeligro({ sn, onEjecutado }: ZonaPeligroProps) {
  const { catalogo, loading, error } = useOperacionesCatalogo();
  const [seleccionada, setSeleccionada] = useState<OperacionCatalogoItem | null>(null);

  const ordenado = [...catalogo].sort(
    (a, b) => (ORDEN_RIESGO[a.nivel_riesgo] ?? 9) - (ORDEN_RIESGO[b.nivel_riesgo] ?? 9),
  );

  return (
    <Card className="border-l-4 border-l-rose-500">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2 text-rose-700">
          <ShieldAlert className="h-5 w-5" />
          Zona de peligro
        </CardTitle>
        <p className="text-sm text-gray-500">
          Estas acciones modifican el equipo real en producción. Revisa el riesgo de cada una antes de
          continuar.
        </p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando catálogo de operaciones...
          </div>
        ) : error ? (
          <p className="text-sm text-rose-600">{error}</p>
        ) : (
          <div className="space-y-2">
            {ordenado.map((op) => (
              <div
                key={op.operacion}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-gray-100 px-3 py-2.5 hover:bg-gray-50"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-800">{op.operacion}</span>
                    <Badge variant="outline" className={CLASE_NIVEL_RIESGO[op.nivel_riesgo]}>
                      {ETIQUETA_NIVEL_RIESGO[op.nivel_riesgo]}
                    </Badge>
                    {!op.reversible && (
                      <Badge variant="outline" className="border-rose-200 text-rose-600">
                        Irreversible
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 max-w-xl">{op.advertencia}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSeleccionada(op)}
                  className="shrink-0 border-rose-200 text-rose-700 hover:bg-rose-50"
                >
                  Ejecutar
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <OperacionDialog
        sn={sn}
        item={seleccionada}
        onOpenChange={(open) => !open && setSeleccionada(null)}
        onEjecutado={onEjecutado}
      />
    </Card>
  );
}
