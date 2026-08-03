"use client";

import { useState } from "react";
import { RouteGuard } from "@/components/auth/route-guard";
import { ModuleHeader } from "@/components/shared/organism/module-header";
import { Button } from "@/components/shared/atom/button";
import { Label } from "@/components/shared/atom/label";
import { MonthPicker } from "@/components/shared/molecule/month-picker";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/shared/molecule/card";
import { Toaster } from "@/components/shared/molecule/toaster";
import { useToast } from "@/hooks/use-toast";
import { FileDown, Loader2 } from "lucide-react";
import { InformeDireccionService } from "@/lib/services/feats/informe-direccion/informe-direccion-service";
import { generarInformeDireccionPdf } from "@/lib/services/feats/informe-direccion/export-informe-direccion-service";

function primerYUltimoDiaDeMes(mesInput: string): { desde: string; hasta: string } | null {
  if (!mesInput) return null;
  const [anioStr, mesStr] = mesInput.split("-");
  const anio = Number(anioStr);
  const mes = Number(mesStr);
  if (!anio || !mes) return null;
  const desde = `${anioStr}-${mesStr}-01`;
  const ultimoDia = new Date(anio, mes, 0).getDate();
  const hasta = `${anioStr}-${mesStr}-${String(ultimoDia).padStart(2, "0")}`;
  return { desde, hasta };
}

function InformeDireccionContent() {
  const { toast } = useToast();
  const [mesA, setMesA] = useState("");
  const [mesB, setMesB] = useState("");
  const [generando, setGenerando] = useState(false);

  const handleGenerar = async () => {
    const rangoA = primerYUltimoDiaDeMes(mesA);
    const rangoB = primerYUltimoDiaDeMes(mesB);
    if (!rangoA || !rangoB) {
      toast({
        title: "Faltan meses",
        description: "Selecciona los dos meses que quieres comparar.",
        variant: "destructive",
      });
      return;
    }

    setGenerando(true);
    try {
      const informe = await InformeDireccionService.obtenerComparativo({
        periodoADesde: rangoA.desde,
        periodoAHasta: rangoA.hasta,
        periodoBDesde: rangoB.desde,
        periodoBHasta: rangoB.hasta,
      });
      generarInformeDireccionPdf(informe);
      toast({ title: "Informe generado", description: "El PDF se descargó correctamente." });
    } catch (error) {
      console.error("[InformeDireccion] Error al generar informe:", error);
      toast({
        title: "Error al generar el informe",
        description: error instanceof Error ? error.message : "Intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setGenerando(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <ModuleHeader
        title="Informe de Dirección"
        subtitle="Genera un informe comparativo de desempeño entre dos meses cualesquiera."
      />

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-base">Elegir los dos periodos a comparar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="mes-a">Periodo A</Label>
              <MonthPicker id="mes-a" value={mesA} onChange={setMesA} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mes-b">Periodo B</Label>
              <MonthPicker id="mes-b" value={mesB} onChange={setMesB} />
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            El informe incluye Instaladora General, Comercial de Instaladora, Ventas y
            Comercial de Ventas para ambos periodos, calculados en el momento a partir de
            la base de datos.
          </p>

          <Button onClick={handleGenerar} disabled={generando || !mesA || !mesB}>
            {generando ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generando informe...
              </>
            ) : (
              <>
                <FileDown className="mr-2 h-4 w-4" />
                Generar PDF
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Toaster />
    </div>
  );
}

export default function InformeDireccionPage() {
  return (
    <RouteGuard requiredModule="informe-direccion">
      <InformeDireccionContent />
    </RouteGuard>
  );
}
