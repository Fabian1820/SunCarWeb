"use client";

import { Badge } from "@/components/shared/atom/badge";
import { Card, CardContent } from "@/components/shared/molecule/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/shared/molecule/tabs";
import { Loader2 } from "lucide-react";
import type {
  ComandoFelicity,
  DispositivoFelicity,
  ParametroConfigurable,
} from "@/lib/types/feats/equipos-felicity/equipos-felicity-types";
import { CLASE_NIVEL_RIESGO, ETIQUETA_NIVEL_RIESGO } from "@/lib/types/feats/equipos-felicity/equipos-felicity-types";
import { cn } from "@/lib/utils";

function fechaLarga(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function Campo({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold">{label}</p>
      <p className="text-sm text-gray-800">{value === null || value === undefined || value === "" ? "—" : value}</p>
    </div>
  );
}

const ESTADO_COMANDO_CLASE: Record<string, string> = {
  APLICADO: "bg-emerald-100 text-emerald-700",
  ENVIADO: "bg-sky-100 text-sky-700",
  SIMULADO: "bg-gray-100 text-gray-600",
  RECHAZADO: "bg-rose-100 text-rose-700",
  FALLIDO: "bg-rose-100 text-rose-700",
};

interface DispositivoAvanzadoPanelProps {
  dispositivo: DispositivoFelicity | null;
  parametros: ParametroConfigurable[];
  auditoria: ComandoFelicity[];
  loading: boolean;
}

export function DispositivoAvanzadoPanel({
  dispositivo,
  parametros,
  auditoria,
  loading,
}: DispositivoAvanzadoPanelProps) {
  if (loading && !dispositivo) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-teal-500" />
      </div>
    );
  }

  return (
    <Tabs defaultValue="ficha" className="w-full">
      <TabsList>
        <TabsTrigger value="ficha">Ficha técnica</TabsTrigger>
        <TabsTrigger value="parametros">Parámetros ({parametros.length})</TabsTrigger>
        <TabsTrigger value="auditoria">Actividad ({auditoria.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="ficha">
        {!dispositivo ? (
          <p className="text-sm text-gray-400 py-6">No se pudo cargar la ficha del equipo.</p>
        ) : (
          <Card>
            <CardContent className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Campo label="Modelo" value={dispositivo.modelo} />
              <Campo label="Alias" value={dispositivo.alias} />
              <Campo label="Planta" value={dispositivo.planta_nombre} />
              <Campo label="Estado" value={dispositivo.estado_descripcion || dispositivo.estado} />
              <Campo label="Señal WiFi" value={dispositivo.senal_wifi ? `${dispositivo.senal_wifi} dBm` : null} />
              <Campo
                label="Frecuencia de reporte"
                value={dispositivo.frecuencia_reporte ? `${dispositivo.frecuencia_reporte} s` : null}
              />
              <Campo label="Datalogger (colector)" value={dispositivo.colector_sn} />
              <Campo label="Inversor asociado" value={dispositivo.inversor_sn} />
              <Campo label="Zona horaria" value={dispositivo.zona_horaria} />
              <Campo label="Versión firmware" value={dispositivo.version_firmware} />
              <Campo label="Versión módulo WiFi" value={dispositivo.version_modulo} />
              <Campo label="Potencia nominal" value={dispositivo.potencia_nominal} />
              <Campo label="Última sincronización" value={fechaLarga(dispositivo.actualizado_en)} />
              {dispositivo.permisos.length > 0 && (
                <div className="col-span-full">
                  <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold mb-1">
                    Permisos de la cuenta
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {dispositivo.permisos.map((p) => (
                      <Badge key={p} variant="outline" className="border-gray-200 text-gray-600">
                        {p}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="parametros">
        {parametros.length === 0 ? (
          <p className="text-sm text-gray-400 py-6">
            La plataforma no declara parámetros configurables para este modelo.
          </p>
        ) : (
          <div className="space-y-2">
            {parametros.map((p) => (
              <Card key={p.codigo}>
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{p.nombre || p.codigo}</p>
                    <p className="text-xs text-gray-400">{p.codigo}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-gray-900">
                      {p.valor_actual === null || p.valor_actual === undefined ? "—" : String(p.valor_actual)}
                      {p.unidad ? ` ${p.unidad}` : ""}
                    </p>
                    {(p.minimo !== null && p.minimo !== undefined) ||
                    (p.maximo !== null && p.maximo !== undefined) ? (
                      <p className="text-[11px] text-gray-400">
                        rango {p.minimo ?? "—"} – {p.maximo ?? "—"}
                      </p>
                    ) : null}
                    {p.solo_lectura && (
                      <Badge variant="outline" className="mt-1 border-gray-200 text-gray-500 text-[10px]">
                        Solo lectura
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="auditoria">
        {auditoria.length === 0 ? (
          <p className="text-sm text-gray-400 py-6">Sin operaciones registradas para este equipo.</p>
        ) : (
          <div className="space-y-2">
            {auditoria.map((a) => (
              <Card key={a.id || `${a.operacion}-${a.creado_en}`}>
                <CardContent className="p-4 space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-800">{a.operacion}</span>
                      <Badge variant="outline" className={CLASE_NIVEL_RIESGO[a.nivel_riesgo]}>
                        {ETIQUETA_NIVEL_RIESGO[a.nivel_riesgo]}
                      </Badge>
                      <span
                        className={cn(
                          "text-[11px] font-semibold px-2 py-0.5 rounded-full",
                          ESTADO_COMANDO_CLASE[a.estado] || "bg-gray-100 text-gray-600",
                        )}
                      >
                        {a.estado}
                      </span>
                      {a.simulado && (
                        <Badge variant="outline" className="border-gray-200 text-gray-500 text-[10px]">
                          Simulado
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-gray-400">{fechaLarga(a.creado_en)}</span>
                  </div>
                  {a.motivo && <p className="text-sm text-gray-600">{a.motivo}</p>}
                  {a.error && <p className="text-sm text-rose-600">{a.error}</p>}
                  <p className="text-[11px] text-gray-400">
                    {a.usuario ? `Por ${a.usuario}` : "Usuario desconocido"}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
