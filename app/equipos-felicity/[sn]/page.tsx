"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { RouteGuard } from "@/components/auth/route-guard";
import { ModuleHeader } from "@/components/shared/organism/module-header";
import { Button } from "@/components/shared/atom/button";
import { Toaster } from "@/components/shared/molecule/toaster";
import { useToast } from "@/hooks/use-toast";
import { useDispositivoDetalle } from "@/hooks/use-equipos-felicity";
import { EstadoRapidoPanel } from "@/components/feats/equipos-felicity/estado-rapido-panel";
import { DispositivoAvanzadoPanel } from "@/components/feats/equipos-felicity/dispositivo-avanzado-panel";
import { ZonaPeligro } from "@/components/feats/equipos-felicity/zona-peligro";
import type { UnidadMedida } from "@/lib/types/feats/equipos-felicity/equipos-felicity-types";
import { ChevronDown, ChevronUp } from "lucide-react";

const REFRESCO_MS = 15_000;

function DispositivoFelicityContent({ sn }: { sn: string }) {
  const { toast } = useToast();
  const {
    estadoRapido,
    dispositivo,
    parametros,
    auditoria,
    loadingEstado,
    loadingAvanzado,
    error,
    cargarEstadoRapido,
    cargarAvanzado,
  } = useDispositivoDetalle(sn);

  const [unidad, setUnidad] = useState<UnidadMedida>("kw");
  const [avanzadoAbierto, setAvanzadoAbierto] = useState(false);
  const [avanzadoCargado, setAvanzadoCargado] = useState(false);

  useEffect(() => {
    const id = setInterval(() => cargarEstadoRapido(unidad), REFRESCO_MS);
    return () => clearInterval(id);
  }, [cargarEstadoRapido, unidad]);

  useEffect(() => {
    if (error) toast({ title: "Error", description: error, variant: "destructive" });
  }, [error, toast]);

  const handleUnidadChange = (u: UnidadMedida) => {
    setUnidad(u);
    cargarEstadoRapido(u);
  };

  const handleToggleAvanzado = () => {
    const abrir = !avanzadoAbierto;
    setAvanzadoAbierto(abrir);
    if (abrir && !avanzadoCargado) {
      cargarAvanzado();
      setAvanzadoCargado(true);
    }
  };

  const handleOperacionEjecutada = () => {
    cargarEstadoRapido(unidad);
    if (avanzadoCargado) cargarAvanzado();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <ModuleHeader
        title={estadoRapido?.modelo || sn}
        subtitle={estadoRapido?.planta_nombre ? `${sn} · ${estadoRapido.planta_nombre}` : sn}
        backButton={{ href: "/equipos-felicity", label: "Equipos Felicity" }}
      />

      <main className="content-with-fixed-header max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 space-y-6 pt-4">
        <EstadoRapidoPanel
          estado={estadoRapido}
          loading={loadingEstado}
          unidad={unidad}
          onUnidadChange={handleUnidadChange}
          onRefrescar={() => cargarEstadoRapido(unidad)}
        />

        <div>
          <Button variant="outline" size="sm" onClick={handleToggleAvanzado}>
            {avanzadoAbierto ? (
              <>
                <ChevronUp className="h-3.5 w-3.5 mr-1.5" /> Ocultar avanzado
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5 mr-1.5" /> Ver información avanzada
              </>
            )}
          </Button>
        </div>

        {avanzadoAbierto && (
          <DispositivoAvanzadoPanel
            dispositivo={dispositivo}
            parametros={parametros}
            auditoria={auditoria}
            loading={loadingAvanzado}
          />
        )}

        <ZonaPeligro sn={sn} onEjecutado={handleOperacionEjecutada} />
      </main>

      <Toaster />
    </div>
  );
}

export default function DispositivoFelicityPage() {
  const params = useParams<{ sn: string }>();
  const sn = decodeURIComponent(String(params.sn || ""));

  return (
    <RouteGuard requiredModule="equipos-felicity">
      <DispositivoFelicityContent sn={sn} />
    </RouteGuard>
  );
}
