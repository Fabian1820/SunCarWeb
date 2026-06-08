"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Plus, RefreshCw } from "lucide-react";
import { ModuleHeader } from "@/components/shared/organism/module-header";
import { OfertasConfeccionadasView } from "@/components/feats/ofertas/ofertas-confeccionadas-view";
import { Button } from "@/components/shared/atom/button";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { actualizarPreciosOfertasGenericas } from "@/lib/services/feats/ofertas/actualizar-precios-ofertas-service";

export default function OfertasGestionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [refreshKey, setRefreshKey] = useState(0);
  const [actualizando, setActualizando] = useState(false);
  const { toast } = useToast();

  // Detectar cuando volvemos de crear una oferta
  useEffect(() => {
    const refresh = searchParams.get("refresh");
    if (refresh === "true") {
      setRefreshKey((prev) => prev + 1);
      // Limpiar el parámetro de la URL
      router.replace("/ofertas-gestion");
    }
  }, [searchParams, router]);

  const handleActualizarPrecios = async () => {
    setActualizando(true);
    try {
      const resultado = await actualizarPreciosOfertasGenericas();
      const { total_evaluadas, actualizadas, sin_cambios, errores } = resultado;

      if (errores.length > 0) {
        toast({
          title: "Actualización con errores",
          description: `Evaluadas: ${total_evaluadas}. Actualizadas: ${actualizadas}, sin cambios: ${sin_cambios}. Errores: ${errores.slice(0, 2).join("; ")}`,
          variant: "destructive",
        });
      } else if (total_evaluadas === 0) {
        toast({
          title: "Sin ofertas para evaluar",
          description: "No hay ofertas genéricas aprobadas en este momento.",
        });
      } else if (actualizadas === 0) {
        toast({
          title: "Precios ya vigentes",
          description: `Evaluadas ${total_evaluadas} oferta${total_evaluadas !== 1 ? "s" : ""}. Todas tenían los precios actuales del catálogo.`,
        });
      } else {
        toast({
          title: "Precios actualizados",
          description: `Evaluadas ${total_evaluadas}. ${actualizadas} actualizada${actualizadas !== 1 ? "s" : ""}, ${sin_cambios} sin cambios.`,
        });
      }
      if (actualizadas > 0) setRefreshKey((prev) => prev + 1);
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.message ?? "No se pudo actualizar los precios.",
        variant: "destructive",
      });
    } finally {
      setActualizando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f4f9f6] via-white to-[#e8f4ee]">
      <ModuleHeader
        title="Gestionar Ofertas"
        subtitle="Consulta las ofertas confeccionadas en formato de cards."
        badge={{ text: "Ventas", className: "bg-amber-100 text-amber-800" }}
        actions={
          <div className="flex gap-2">
            <Button
              onClick={handleActualizarPrecios}
              disabled={actualizando}
              variant="outline"
              className="border-emerald-600 text-emerald-700 hover:bg-emerald-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${actualizando ? "animate-spin" : ""}`} />
              {actualizando ? "Actualizando..." : "Actualizar Precios"}
            </Button>
            <Button
              onClick={() => router.push("/ofertas-gestion/confeccion")}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Crear Oferta
            </Button>
          </div>
        }
      />

      <main className="content-with-fixed-header max-w-[96rem] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pb-8">
        <OfertasConfeccionadasView key={refreshKey} />
      </main>
    </div>
  );
}
