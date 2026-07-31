"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { RouteGuard } from "@/components/auth/route-guard";
import { ModuleHeader } from "@/components/shared/organism/module-header";
import { Button } from "@/components/shared/atom/button";
import { Badge } from "@/components/shared/atom/badge";
import { Input } from "@/components/shared/atom/input";
import { Card, CardContent } from "@/components/shared/molecule/card";
import { PageLoader } from "@/components/shared/atom/page-loader";
import { Toaster } from "@/components/shared/molecule/toaster";
import { useToast } from "@/hooks/use-toast";
import { VincularCuentaForm } from "@/components/feats/equipos-felicity/vincular-cuenta-form";
import {
  useCuentaFelicity,
  useDispositivosFelicity,
} from "@/hooks/use-equipos-felicity";
import {
  ETIQUETA_TIPO_DISPOSITIVO,
} from "@/lib/types/feats/equipos-felicity/equipos-felicity-types";
import {
  Battery,
  Loader2,
  RefreshCw,
  Search,
  Signal,
  Unplug,
  UploadCloud,
  Wifi,
  WifiOff,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

function EstadoDot({ estado }: { estado?: string | null }) {
  const normal = estado === "NM";
  const alarma = estado === "AL";
  return (
    <span
      className={cn(
        "inline-block h-2 w-2 rounded-full shrink-0",
        normal ? "bg-emerald-500" : alarma ? "bg-rose-500" : "bg-gray-300",
      )}
    />
  );
}

function EquiposFelicityContent() {
  const { toast } = useToast();
  const { cuenta, vinculada, loading: cargandoCuenta, vinculando, error: errorCuenta, vincular, desvincular } =
    useCuentaFelicity();
  const {
    dispositivos,
    estados,
    loading,
    refrescando,
    error: errorDispositivos,
    cargar,
    cargarEstados,
  } = useDispositivosFelicity();

  const [busqueda, setBusqueda] = useState("");
  const [desvinculando, setDesvinculando] = useState(false);

  useEffect(() => {
    if (vinculada) {
      cargar(false);
      cargarEstados("kw");
    }
  }, [vinculada, cargar, cargarEstados]);

  useEffect(() => {
    if (errorDispositivos) {
      toast({ title: "Error", description: errorDispositivos, variant: "destructive" });
    }
  }, [errorDispositivos, toast]);

  const grupos = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const filtrados = q
      ? dispositivos.filter(
          (d) =>
            d.sn.toLowerCase().includes(q) ||
            (d.alias || "").toLowerCase().includes(q) ||
            (d.modelo || "").toLowerCase().includes(q) ||
            (d.planta_nombre || "").toLowerCase().includes(q),
        )
      : dispositivos;

    const mapa = new Map<string, typeof dispositivos>();
    for (const d of filtrados) {
      const clave = d.planta_nombre || "Sin planta";
      if (!mapa.has(clave)) mapa.set(clave, []);
      mapa.get(clave)!.push(d);
    }
    return Array.from(mapa.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [dispositivos, busqueda]);

  const handleVincular = async (payload: {
    fsolar_user: string;
    password: string;
    region: string;
    password_comandos?: string | null;
  }) => {
    const ok = await vincular(payload);
    if (ok) {
      toast({ title: "Cuenta vinculada", description: "Ya puedes ver tus equipos." });
    }
    return ok;
  };

  const handleDesvincular = async () => {
    if (!confirm("¿Desvincular la cuenta de FSolar? El histórico no se borra, solo el acceso.")) return;
    setDesvinculando(true);
    const ok = await desvincular();
    setDesvinculando(false);
    if (ok) {
      toast({ title: "Cuenta desvinculada" });
    }
  };

  if (cargandoCuenta) {
    return <PageLoader moduleName="Equipos Felicity" />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ModuleHeader
        title="Equipos Felicity"
        subtitle={
          vinculada
            ? `Cuenta FSolar: ${cuenta?.fsolar_user ?? "—"}`
            : "Monitoreo y administración de inversores y baterías FSolar"
        }
        actions={
          <>
            <Link href="/equipos-felicity/actualizaciones">
              <Button variant="outline" size="sm">
                <UploadCloud className="h-3.5 w-3.5 sm:mr-1.5" />
                <span className="hidden sm:inline">Actualizaciones</span>
              </Button>
            </Link>
            {vinculada ? (
              <>
                <Button variant="outline" size="sm" onClick={() => cargar(true)} disabled={refrescando}>
                  {refrescando ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin sm:mr-1.5" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5 sm:mr-1.5" />
                  )}
                  <span className="hidden sm:inline">Refrescar</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDesvincular}
                  disabled={desvinculando}
                  className="text-rose-600 border-rose-200 hover:bg-rose-50"
                >
                  {desvinculando ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin sm:mr-1.5" />
                  ) : (
                    <Unplug className="h-3.5 w-3.5 sm:mr-1.5" />
                  )}
                  <span className="hidden sm:inline">Desvincular</span>
                </Button>
              </>
            ) : null}
          </>
        }
      />

      <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
        {!vinculada ? (
          <div className="py-10">
            <VincularCuentaForm vinculando={vinculando} error={errorCuenta} onVincular={handleVincular} />
          </div>
        ) : (
          <div className="space-y-6 pt-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por SN, alias, modelo o planta..."
                className="pl-9 bg-white"
              />
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-teal-500" />
              </div>
            ) : dispositivos.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-16 flex flex-col items-center gap-3 text-gray-400">
                  <Zap className="h-10 w-10 opacity-40" />
                  <p className="text-sm">No hay equipos en esta cuenta de FSolar.</p>
                </CardContent>
              </Card>
            ) : (
              grupos.map(([planta, equipos]) => (
                <div key={planta} className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-700">{planta}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {equipos.map((d) => {
                      const estado = estados[d.sn];
                      return (
                        <Link key={d.sn} href={`/equipos-felicity/${encodeURIComponent(d.sn)}`}>
                          <Card className="hover:border-teal-300 hover:shadow-sm transition-all cursor-pointer h-full">
                            <CardContent className="p-4 space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <EstadoDot estado={d.estado} />
                                    <p className="font-medium text-gray-900 truncate">
                                      {d.alias || d.modelo || d.sn}
                                    </p>
                                  </div>
                                  <p className="text-xs text-gray-500 truncate">{d.sn}</p>
                                </div>
                                <Badge variant="outline" className="shrink-0 border-gray-200 text-gray-600">
                                  {ETIQUETA_TIPO_DISPOSITIVO[d.tipo] || d.tipo}
                                </Badge>
                              </div>

                              <div className="flex items-center justify-between text-xs text-gray-500 pt-1 border-t">
                                <span className="flex items-center gap-1">
                                  {typeof d.senal_wifi === "number" ? (
                                    d.senal_wifi < -80 ? (
                                      <WifiOff className="h-3.5 w-3.5 text-rose-400" />
                                    ) : (
                                      <Wifi className="h-3.5 w-3.5 text-emerald-500" />
                                    )
                                  ) : (
                                    <Signal className="h-3.5 w-3.5 text-gray-300" />
                                  )}
                                  {typeof d.senal_wifi === "number" ? `${d.senal_wifi} dBm` : "—"}
                                </span>
                                {estado?.bateria?.soc !== undefined && estado?.bateria?.soc !== null && (
                                  <span className="flex items-center gap-1">
                                    <Battery className="h-3.5 w-3.5 text-emerald-600" />
                                    {estado.bateria.soc.toFixed(0)}%
                                  </span>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      <Toaster />
    </div>
  );
}

export default function EquiposFelicityPage() {
  return (
    <RouteGuard requiredModule="equipos-felicity">
      <EquiposFelicityContent />
    </RouteGuard>
  );
}
