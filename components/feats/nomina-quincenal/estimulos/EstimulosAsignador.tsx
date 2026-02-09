"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/shared/molecule/card";
import { Button } from "@/components/shared/atom/button";
import { Input } from "@/components/shared/molecule/input";
import { Badge } from "@/components/shared/atom/badge";
import { Slider } from "@/components/shared/molecule/slider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shared/molecule/table";
import {
  Target,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Save,
  RotateCcw,
  Calculator,
  Info,
  Search,
  Filter,
} from "lucide-react";
import type { PeriodoNomina, NominaQuincenal, LineaNomina, TrabajadorNomina, IngresoMensualNomina } from "@/lib/types/feats/nomina-quincenal";

interface EstimulosAsignadorProps {
  periodo: PeriodoNomina;
  nomina: NominaQuincenal;
  lineas: LineaNomina[];
  trabajadores: TrabajadorNomina[];
  ingresoReferencia: IngresoMensualNomina | null;
  onGuardar: (porcentajesVariables: Record<string, number>) => Promise<void>;
  onFinalizar: () => Promise<void>;
}

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

export function EstimulosAsignador({
  periodo,
  nomina,
  lineas,
  trabajadores,
  ingresoReferencia,
  onGuardar,
  onFinalizar,
}: EstimulosAsignadorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [porcentajesVariables, setPorcentajesVariables] = useState<Record<string, number>>(() => {
    // Inicializar con los valores actuales de las líneas
    const inicial: Record<string, number> = {};
    lineas.forEach((linea) => {
      inicial[linea.trabajadorCI] = linea.estimulos?.variable.porcentajeAsignado || 0;
    });
    return inicial;
  });
  const [guardando, setGuardando] = useState(false);

  // Calcular montos base para estímulos
  const montoBaseFijo = ingresoReferencia 
    ? (ingresoReferencia.monto * 0.75) / 2 // 75% dividido en 2 quincenas
    : 0;
  const montoBaseVariable = ingresoReferencia
    ? (ingresoReferencia.monto * 0.25) / 2 // 25% dividido en 2 quincenas
    : 0;

  // Calcular suma de porcentajes
  const sumaPorcentajesFijos = useMemo(() => {
    return trabajadores.reduce((sum, t) => sum + (t.porcentajeEstimuloFijo || 0), 0);
  }, [trabajadores]);

  const sumaPorcentajesVariables = useMemo(() => {
    return Object.values(porcentajesVariables).reduce((sum, p) => sum + p, 0);
  }, [porcentajesVariables]);

  // Filtrar trabajadores
  const trabajadoresFiltrados = trabajadores.filter((t) => {
    return (
      t.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.CI.includes(searchTerm) ||
      t.cargo.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const actualizarPorcentajeVariable = (ci: string, valor: number) => {
    setPorcentajesVariables((prev) => ({
      ...prev,
      [ci]: valor,
    }));
  };

  const reiniciarVariables = () => {
    setPorcentajesVariables(() => {
      const vacio: Record<string, number> = {};
      trabajadores.forEach((t) => {
        vacio[t.CI] = 0;
      });
      return vacio;
    });
  };

  const handleGuardar = async () => {
    setGuardando(true);
    await onGuardar(porcentajesVariables);
    setGuardando(false);
  };

  const getEstimuloFijo = (porcentaje: number) => {
    return (montoBaseFijo * porcentaje) / 100;
  };

  const getEstimuloVariable = (porcentaje: number) => {
    return (montoBaseVariable * porcentaje) / 100;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Target className="w-6 h-6 text-green-600" />
            Asignación de Estímulos
          </h1>
          <p className="text-gray-500 mt-1">
            {MESES[periodo.mes - 1]} {periodo.anio} - Quincena {periodo.quincena}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleGuardar} disabled={guardando}>
            <Save className="w-4 h-4 mr-2" />
            Guardar
          </Button>
          <Button onClick={onFinalizar} disabled={guardando}>
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Finalizar Estímulos
          </Button>
        </div>
      </div>

      {/* Info del ingreso */}
      {ingresoReferencia ? (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-green-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-green-900">
                  Ingreso de referencia: {MESES[ingresoReferencia.mes - 1]} {ingresoReferencia.anio}
                </p>
                <p className="text-sm text-green-700 mt-1">
                  Monto total: ${ingresoReferencia.monto.toLocaleString()} • 
                  Estímulos reparten: ${(ingresoReferencia.monto * 0.75).toLocaleString()} (fijos) + 
                  ${(ingresoReferencia.monto * 0.25).toLocaleString()} (variables)
                </p>
                <div className="flex gap-6 mt-3 pt-3 border-t border-green-200">
                  <div>
                    <p className="text-xs text-green-600">Base Fijo (75% / 2)</p>
                    <p className="text-lg font-bold text-green-800">${montoBaseFijo.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-green-600">Base Variable (25% / 2)</p>
                    <p className="text-lg font-bold text-green-800">${montoBaseVariable.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-900">
                  No hay ingreso mensual asignado
                </p>
                <p className="text-sm text-yellow-700 mt-1">
                  Debe seleccionar un ingreso mensual para poder calcular los estímulos.
                  Los estímulos corresponden al mes anterior (mes vencido).
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alertas de validación */}
      <div className="space-y-3">
        {sumaPorcentajesFijos > 100 && (
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <div>
              <p className="font-medium text-red-800">
                Suma de porcentajes fijos excede el 100%
              </p>
              <p className="text-sm text-red-700">
                Total actual: {sumaPorcentajesFijos.toFixed(1)}% • Ajuste los porcentajes fijos en la configuración de trabajadores
              </p>
            </div>
          </div>
        )}

        {sumaPorcentajesVariables > 100 && (
          <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            <div>
              <p className="font-medium text-yellow-800">
                Suma de porcentajes variables excede el 100%
              </p>
              <p className="text-sm text-yellow-700">
                Total actual: {sumaPorcentajesVariables.toFixed(1)}% • 
                El sistema normalizará automáticamente los montos
              </p>
            </div>
          </div>
        )}

        {sumaPorcentajesVariables < 100 && sumaPorcentajesVariables > 0 && (
          <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <Info className="w-5 h-5 text-blue-600" />
            <div>
              <p className="font-medium text-blue-800">
                Queda por asignar: {(100 - sumaPorcentajesVariables).toFixed(1)}%
              </p>
              <p className="text-sm text-blue-700">
                Puede asignar este porcentaje adicional a trabajadores destacados
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Resumen de distribución */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500 mb-1">% Fijos Asignados</p>
            <div className="flex items-center gap-2">
              <p className={cn(
                "text-2xl font-bold",
                sumaPorcentajesFijos > 100 ? "text-red-600" : "text-green-600"
              )}>
                {sumaPorcentajesFijos.toFixed(1)}%
              </p>
              {sumaPorcentajesFijos > 100 && (
                <AlertCircle className="w-5 h-5 text-red-500" />
              )}
            </div>
            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all",
                  sumaPorcentajesFijos > 100 ? "bg-red-500" : "bg-green-500"
                )}
                style={{ width: `${Math.min(sumaPorcentajesFijos, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500 mb-1">% Variables Asignados</p>
            <div className="flex items-center gap-2">
              <p className={cn(
                "text-2xl font-bold",
                sumaPorcentajesVariables > 100 ? "text-yellow-600" : "text-blue-600"
              )}>
                {sumaPorcentajesVariables.toFixed(1)}%
              </p>
              {sumaPorcentajesVariables > 100 && (
                <AlertCircle className="w-5 h-5 text-yellow-500" />
              )}
            </div>
            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all",
                  sumaPorcentajesVariables > 100 ? "bg-yellow-500" : "bg-blue-500"
                )}
                style={{ width: `${Math.min(sumaPorcentajesVariables, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500 mb-1">Total Estímulos a Repartir</p>
            <p className="text-2xl font-bold text-purple-600">
              ${(montoBaseFijo + montoBaseVariable).toLocaleString()}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Por quincena (50% del mes)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Acciones masivas */}
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar trabajador..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" onClick={reiniciarVariables}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Reiniciar Variables
        </Button>
      </div>

      {/* Tabla de asignación */}
      <Card>
        <CardHeader>
          <CardTitle>Asignación por Trabajador</CardTitle>
          <CardDescription>
            Ajuste los porcentajes variables para cada trabajador. Los fijos son constantes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trabajador</TableHead>
                  <TableHead className="text-center">% Fijo</TableHead>
                  <TableHead className="text-right">Monto Fijo</TableHead>
                  <TableHead className="text-center">% Variable</TableHead>
                  <TableHead className="text-right">Monto Variable</TableHead>
                  <TableHead className="text-right">Total Estímulo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trabajadoresFiltrados.map((trabajador) => {
                  const porcentajeVariable = porcentajesVariables[trabajador.CI] || 0;
                  const estimuloFijo = getEstimuloFijo(trabajador.porcentajeEstimuloFijo);
                  const estimuloVariable = getEstimuloVariable(porcentajeVariable);
                  const totalEstimulo = estimuloFijo + estimuloVariable;
                  const tieneVariable = porcentajeVariable > 0;

                  return (
                    <TableRow key={trabajador.CI} className={tieneVariable ? "bg-blue-50/50" : ""}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{trabajador.nombre}</p>
                          <p className="text-xs text-gray-500">{trabajador.cargo}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-medium text-green-600">
                          {trabajador.porcentajeEstimuloFijo.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        ${estimuloFijo.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min="0"
                            max="50"
                            step="0.5"
                            value={porcentajeVariable}
                            onChange={(e) =>
                              actualizarPorcentajeVariable(trabajador.CI, parseFloat(e.target.value))
                            }
                            className="w-24"
                          />
                          <Input
                            type="number"
                            min="0"
                            max="50"
                            step="0.5"
                            value={porcentajeVariable}
                            onChange={(e) =>
                              actualizarPorcentajeVariable(
                                trabajador.CI,
                                Math.min(50, Math.max(0, parseFloat(e.target.value) || 0))
                              )
                            }
                            className="w-20 text-center"
                          />
                          <span className="text-gray-500">%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={tieneVariable ? "font-medium text-blue-600" : "text-gray-400"}>
                          ${estimuloVariable.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-semibold text-green-700">
                          ${totalEstimulo.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Totales */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-3 gap-4 text-right">
              <div>
                <p className="text-sm text-gray-500">Total Fijos</p>
                <p className="text-lg font-semibold">
                  ${trabajadoresFiltrados
                    .reduce((sum, t) => sum + getEstimuloFijo(t.porcentajeEstimuloFijo), 0)
                    .toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Variables</p>
                <p className="text-lg font-semibold">
                  ${trabajadoresFiltrados
                    .reduce((sum, t) => sum + getEstimuloVariable(porcentajesVariables[t.CI] || 0), 0)
                    .toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Estímulos</p>
                <p className="text-xl font-bold text-green-700">
                  ${trabajadoresFiltrados
                    .reduce((sum, t) => {
                      const fijo = getEstimuloFijo(t.porcentajeEstimuloFijo);
                      const variable = getEstimuloVariable(porcentajesVariables[t.CI] || 0);
                      return sum + fijo + variable;
                    }, 0)
                    .toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
