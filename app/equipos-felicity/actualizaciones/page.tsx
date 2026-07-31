"use client";

import { useCallback, useEffect, useState } from "react";
import { RouteGuard } from "@/components/auth/route-guard";
import { ModuleHeader } from "@/components/shared/organism/module-header";
import { Button } from "@/components/shared/atom/button";
import { Badge } from "@/components/shared/atom/badge";
import { Input } from "@/components/shared/atom/input";
import { Card, CardContent } from "@/components/shared/molecule/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
import { Toaster } from "@/components/shared/molecule/toaster";
import { useToast } from "@/hooks/use-toast";
import { MaterialBuscador } from "@/components/feats/actualizaciones-felicity/material-buscador";
import { ActualizacionesFelicityService } from "@/lib/services/feats/actualizaciones-felicity/actualizaciones-felicity-service";
import type {
  ActualizacionFelicity,
  CasoActualizacionFelicity,
  MaterialBusqueda,
} from "@/lib/types/feats/actualizaciones-felicity/actualizaciones-felicity-types";
import { Download, History, Loader2, Search, UploadCloud } from "lucide-react";

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

function HistorialDialog({
  caso,
  onOpenChange,
}: {
  caso: CasoActualizacionFelicity | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [historial, setHistorial] = useState<ActualizacionFelicity[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!caso) return;
    setLoading(true);
    ActualizacionesFelicityService.listarHistorial(caso.material_codigo, caso.cantidad, caso.configuracion)
      .then(setHistorial)
      .finally(() => setLoading(false));
  }, [caso]);

  return (
    <Dialog open={Boolean(caso)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Historial de versiones</DialogTitle>
        </DialogHeader>
        {caso && (
          <p className="text-sm text-gray-500 -mt-2">
            {caso.material_descripcion} · {caso.cantidad}x · {caso.configuracion}
          </p>
        )}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-teal-500" />
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {historial.map((h, i) => (
              <div key={h.id || i} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm text-gray-800 truncate">{h.archivo_nombre}</p>
                  <p className="text-xs text-gray-400">
                    {fechaLarga(h.creado_en)}
                    {h.version ? ` · v${h.version}` : ""}
                    {h.subido_por ? ` · ${h.subido_por}` : ""}
                  </p>
                </div>
                <a href={h.archivo_url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                  <Button variant="outline" size="sm">
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </a>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ActualizacionesFelicityContent() {
  const { toast } = useToast();
  const [material, setMaterial] = useState<MaterialBusqueda | null>(null);
  const [q, setQ] = useState("");
  const [casos, setCasos] = useState<CasoActualizacionFelicity[]>([]);
  const [loading, setLoading] = useState(true);
  const [casoHistorial, setCasoHistorial] = useState<CasoActualizacionFelicity | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await ActualizacionesFelicityService.listarCasos({
        material_codigo: material?.id,
        q: q.trim() || undefined,
      });
      setCasos(data);
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "No se pudieron cargar las actualizaciones",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [material, q, toast]);

  useEffect(() => {
    const handler = setTimeout(cargar, 300);
    return () => clearTimeout(handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [material, q]);

  return (
    <div className="min-h-screen bg-gray-50">
      <ModuleHeader
        title="Actualizaciones de equipos"
        subtitle="Busca la actualización correcta por equipo, cantidad conectada y configuración."
        backButton={{ href: "/equipos-felicity", label: "Equipos Felicity" }}
      />

      <main className="content-with-fixed-header max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 space-y-4 pt-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <MaterialBuscador value={material} onChange={setMaterial} placeholder="Filtrar por equipo..." />
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar en la configuración..."
              className="pl-9 bg-white"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-teal-500" />
          </div>
        ) : casos.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 flex flex-col items-center gap-3 text-gray-400">
              <UploadCloud className="h-10 w-10 opacity-40" />
              <p className="text-sm">No hay actualizaciones que coincidan con la búsqueda.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {casos.map((caso) => (
              <Card key={`${caso.material_codigo}-${caso.cantidad}-${caso.configuracion}`}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-gray-900">{caso.material_descripcion}</p>
                        {caso.material_categoria && (
                          <Badge variant="outline" className="border-gray-200 text-gray-600">
                            {caso.material_categoria}
                          </Badge>
                        )}
                        <Badge variant="outline" className="border-teal-200 text-teal-700">
                          {caso.cantidad}x conectados
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{caso.configuracion}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Última actualización: {fechaLarga(caso.ultima_actualizacion)}
                        {caso.total_versiones > 1 && ` · ${caso.total_versiones} versiones`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {caso.total_versiones > 1 && (
                        <Button variant="outline" size="sm" onClick={() => setCasoHistorial(caso)}>
                          <History className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <a href={caso.archivo_url} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" className="bg-teal-600 hover:bg-teal-700">
                          <Download className="h-3.5 w-3.5 mr-1.5" />
                          Descargar
                        </Button>
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <HistorialDialog caso={casoHistorial} onOpenChange={(open) => !open && setCasoHistorial(null)} />
      <Toaster />
    </div>
  );
}

export default function ActualizacionesFelicityPage() {
  return (
    <RouteGuard requiredModule="equipos-felicity">
      <ActualizacionesFelicityContent />
    </RouteGuard>
  );
}
