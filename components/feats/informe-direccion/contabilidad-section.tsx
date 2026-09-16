"use client";

import { useCallback, useState } from "react";
import { CalendarRange, FileDown, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/shared/atom/button";
import { Input } from "@/components/shared/molecule/input";
import { Label } from "@/components/shared/atom/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/shared/molecule/card";
import { useToast } from "@/hooks/use-toast";
import { ContabilidadFinancieraService } from "@/lib/api-services";
import type { ContabilidadResumen } from "@/lib/api-types";
import { exportListToPDF } from "@/lib/export-list-pdf";

const formatoMoneda = new Intl.NumberFormat("es-CU", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

function primerYUltimoDiaDelMesActual(): { desde: string; hasta: string } {
  const hoy = new Date();
  const desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const hasta = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { desde: iso(desde), hasta: iso(hasta) };
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function ContabilidadSection() {
  const [{ desde, hasta }, setRango] = useState(primerYUltimoDiaDelMesActual);
  const [resumen, setResumen] = useState<ContabilidadResumen | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const cargar = useCallback(async () => {
    if (!desde || !hasta) return;
    setLoading(true);
    try {
      const data = await ContabilidadFinancieraService.obtenerResumen(desde, hasta);
      setResumen(data);
    } catch (error: unknown) {
      toast({
        title: "Error al cargar Contabilidad",
        description: getErrorMessage(error, "No se pudo calcular el resumen de Contabilidad."),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [desde, hasta, toast]);

  const exportarPdf = async () => {
    if (!resumen) return;
    const filas = [
      {
        categoria: "General (todo)",
        ingresos: formatoMoneda.format(resumen.general.ingresos),
        gastos: formatoMoneda.format(resumen.general.gastos),
        saldo: formatoMoneda.format(resumen.general.saldo),
      },
      ...resumen.por_categoria.map((c) => ({
        categoria: c.label,
        ingresos: formatoMoneda.format(c.ingresos),
        gastos: formatoMoneda.format(c.gastos),
        saldo: formatoMoneda.format(c.saldo),
      })),
      {
        categoria: "Sin categoría asignada",
        ingresos: formatoMoneda.format(resumen.sin_categoria.ingresos),
        gastos: formatoMoneda.format(resumen.sin_categoria.gastos),
        saldo: formatoMoneda.format(resumen.sin_categoria.saldo),
      },
    ];
    await exportListToPDF({
      title: "Contabilidad",
      subtitle: `Del ${resumen.inicio.slice(0, 10)} al ${resumen.fin.slice(0, 10)}`,
      filename: `contabilidad_${desde}_${hasta}`,
      columns: [
        { header: "Categoría", key: "categoria", width: 60 },
        { header: "Ingresos", key: "ingresos", width: 40 },
        { header: "Gastos", key: "gastos", width: 40 },
        { header: "Saldo", key: "saldo", width: 40 },
      ],
      data: filas,
      logoUrl: "/brand/suncar-v1-iso.png",
    });
  };

  return (
    <Card className="border-l-4 border-l-emerald-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarRange className="h-5 w-5 text-emerald-800" />
          Contabilidad
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto_auto] gap-3 items-end">
          <div>
            <Label htmlFor="contabilidad-desde">Desde</Label>
            <Input
              id="contabilidad-desde"
              type="date"
              value={desde}
              max={hasta}
              onChange={(e) => setRango((r) => ({ ...r, desde: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="contabilidad-hasta">Hasta</Label>
            <Input
              id="contabilidad-hasta"
              type="date"
              value={hasta}
              min={desde}
              onChange={(e) => setRango((r) => ({ ...r, hasta: e.target.value }))}
            />
          </div>
          <Button onClick={cargar} disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Calcular
          </Button>
          <Button variant="outline" onClick={exportarPdf} disabled={!resumen}>
            <FileDown className="h-4 w-4 mr-2" />
            PDF
          </Button>
        </div>

        {resumen ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-lg border bg-emerald-50/60 p-4">
                <p className="text-xs font-medium text-emerald-800">Ingresos totales</p>
                <p className="text-xl font-semibold text-emerald-900">
                  {formatoMoneda.format(resumen.general.ingresos)}
                </p>
              </div>
              <div className="rounded-lg border bg-rose-50/60 p-4">
                <p className="text-xs font-medium text-rose-800">Gastos totales</p>
                <p className="text-xl font-semibold text-rose-900">
                  {formatoMoneda.format(resumen.general.gastos)}
                </p>
              </div>
              <div className="rounded-lg border bg-teal-50/60 p-4">
                <p className="text-xs font-medium text-teal-800">Saldo disponible</p>
                <p className="text-xl font-semibold text-teal-900">
                  {formatoMoneda.format(resumen.general.saldo)}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3">Categoría</th>
                    <th className="text-right py-2 px-3">Ingresos</th>
                    <th className="text-right py-2 px-3">Gastos</th>
                    <th className="text-right py-2 px-3">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {resumen.por_categoria.map((c) => (
                    <tr key={c.categoria} className="border-b border-gray-100">
                      <td className="py-2 px-3">{c.label}</td>
                      <td className="py-2 px-3 text-right">{formatoMoneda.format(c.ingresos)}</td>
                      <td className="py-2 px-3 text-right">{formatoMoneda.format(c.gastos)}</td>
                      <td className="py-2 px-3 text-right font-medium">
                        {formatoMoneda.format(c.saldo)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-amber-50/60">
                    <td className="py-2 px-3 font-medium">
                      Sin categoría asignada
                      {resumen.sin_categoria.personas.length > 0 && (
                        <p className="text-xs font-normal text-amber-800 mt-0.5">
                          {resumen.sin_categoria.personas.join(", ")}
                        </p>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right">
                      {formatoMoneda.format(resumen.sin_categoria.ingresos)}
                    </td>
                    <td className="py-2 px-3 text-right">
                      {formatoMoneda.format(resumen.sin_categoria.gastos)}
                    </td>
                    <td className="py-2 px-3 text-right font-medium">
                      {formatoMoneda.format(resumen.sin_categoria.saldo)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-600">
            Elige un rango de fechas y pulsa &quot;Calcular&quot; para ver el resumen.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
