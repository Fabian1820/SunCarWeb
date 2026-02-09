"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/shared/molecule/card";
import { Button } from "@/components/shared/atom/button";
import { Input } from "@/components/shared/molecule/input";
import { Badge } from "@/components/shared/atom/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shared/molecule/table";
import {
  Utensils,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Save,
  ArrowUpCircle,
  Info,
  Search,
  Calendar,
} from "lucide-react";
import type { PeriodoNomina, NominaQuincenal, LineaNomina, TrabajadorNomina } from "@/lib/types/feats/nomina-quincenal";

interface AlimentacionManagerProps {
  periodo: PeriodoNomina;
  nomina: NominaQuincenal;
  lineas: LineaNomina[];
  trabajadores: TrabajadorNomina[];
  nominaAnterior: NominaQuincenal | null;
  onGuardar: () => Promise<void>;
  onConfirmarPago: () => Promise<void>;
}

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

export function AlimentacionManager({
  periodo,
  nomina,
  lineas,
  trabajadores,
  nominaAnterior,
  onGuardar,
  onConfirmarPago,
}: AlimentacionManagerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [guardando, setGuardando] = useState(false);

  // Calcular período cubierto (siempre la siguiente quincena)
  const periodoCubierto = useMemo(() => {
    if (periodo.quincena === 1) {
      // Q1 paga alimentación de Q2 del mismo mes
      return {
        anio: periodo.anio,
        mes: periodo.mes,
        quincena: 2 as const,
        descripcion: `Días 16-${new Date(periodo.anio, periodo.mes, 0).getDate()} de ${MESES[periodo.mes - 1]}`,
      };
    } else {
      // Q2 paga alimentación de Q1 del mes siguiente
      const siguienteMes = periodo.mes === 12 ? 1 : periodo.mes + 1;
      const siguienteAnio = periodo.mes === 12 ? periodo.anio + 1 : periodo.anio;
      return {
        anio: siguienteAnio,
        mes: siguienteMes,
        quincena: 1 as const,
        descripcion: `Días 1-15 de ${MESES[siguienteMes - 1]}`,
      };
    }
  }, [periodo]);

  // Obtener ajustes de la quincena anterior
  const ajustesQuincenaAnterior = useMemo(() => {
    if (!nominaAnterior) return {};
    
    const ajustes: Record<string, { dias: number; monto: number }> = {};
    nominaAnterior.lineas.forEach((linea) => {
      if (linea.salario.diasNoTrabajados.length > 0) {
        const trabajador = trabajadores.find((t) => t.CI === linea.trabajadorCI);
        if (trabajador) {
          const montoPorDia = trabajador.montoAlimentacionDiaria;
          ajustes[linea.trabajadorCI] = {
            dias: linea.salario.diasNoTrabajados.length,
            monto: linea.salario.diasNoTrabajados.length * montoPorDia,
          };
        }
      }
    });
    return ajustes;
  }, [nominaAnterior, trabajadores]);

  // Filtrar trabajadores
  const trabajadoresFiltrados = trabajadores.filter((t) => {
    return (
      t.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.CI.includes(searchTerm) ||
      t.cargo.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // Calcular totales
  const totales = useMemo(() => {
    return trabajadoresFiltrados.reduce(
      (acc, trabajador) => {
        const diasCubiertos = 15;
        const montoBase = diasCubiertos * trabajador.montoAlimentacionDiaria;
        const ajuste = ajustesQuincenaAnterior[trabajador.CI]?.monto || 0;
        
        return {
          base: acc.base + montoBase,
          ajustes: acc.ajustes + ajuste,
          neto: acc.neto + montoBase - ajuste,
        };
      },
      { base: 0, ajustes: 0, neto: 0 }
    );
  }, [trabajadoresFiltrados, ajustesQuincenaAnterior]);

  const formatearPeriodo = () => {
    return `${MESES[periodo.mes - 1]} ${periodo.anio} - Quincena ${periodo.quincena}`;
  };

  const handleGuardar = async () => {
    setGuardando(true);
    await onGuardar();
    setGuardando(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Utensils className="w-6 h-6 text-orange-600" />
            Pago de Alimentación
          </h1>
          <p className="text-gray-500 mt-1">
            {formatearPeriodo()}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleGuardar} disabled={guardando}>
            <Save className="w-4 h-4 mr-2" />
            Guardar
          </Button>
          <Button onClick={onConfirmarPago} disabled={guardando}>
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Confirmar Pago
          </Button>
        </div>
      </div>

      {/* Info importante */}
      <Card className="bg-orange-50 border-orange-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-orange-600 mt-0.5" />
            <div>
              <p className="font-medium text-orange-900">
                Pago por adelantado
              </p>
              <p className="text-sm text-orange-700 mt-1">
                En esta quincena se paga la alimentación correspondiente a: {" "}
                <strong>{periodoCubierto.descripcion}</strong>
              </p>
              <p className="text-sm text-orange-600 mt-2">
                <ArrowUpCircle className="w-4 h-4 inline mr-1" />
                Los ajustes por días no trabajados se descuentan de la alimentación de la siguiente quincena
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Alimentación Base</p>
            <p className="text-2xl font-bold text-gray-900">${totales.base.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-1">
              {trabajadoresFiltrados.length} trabajadores × 15 días
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Ajustes (Q anterior)</p>
            <p className={cn(
              "text-2xl font-bold",
              totales.ajustes > 0 ? "text-red-600" : "text-gray-400"
            )}>
              -${totales.ajustes.toLocaleString()}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Días no trabajados quincena pasada
            </p>
          </CardContent>
        </Card>

        <Card className="border-orange-200">
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Total Neto a Pagar</p>
            <p className="text-2xl font-bold text-orange-600">${totales.neto.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-1">
              Base - Ajustes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alerta de ajustes */}
      {totales.ajustes > 0 && (
        <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <TrendingDown className="w-5 h-5 text-yellow-600" />
          <div>
            <p className="font-medium text-yellow-800">
              Hay ajustes por días no trabajados en la quincena anterior
            </p>
            <p className="text-sm text-yellow-700">
              Total de ajustes: ${totales.ajustes.toLocaleString()}. 
              Estos descuentos corresponden a días no trabajados que ya se pagaron en la quincena pasada.
            </p>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar trabajador..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Tabla de alimentación */}
      <Card>
        <CardHeader>
          <CardTitle>Detalle por Trabajador</CardTitle>
          <CardDescription>
            Alimentación para {periodoCubierto.descripcion}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trabajador</TableHead>
                  <TableHead className="text-right">Monto Diario</TableHead>
                  <TableHead className="text-center">Días Cubiertos</TableHead>
                  <TableHead className="text-right">Base</TableHead>
                  <TableHead className="text-center">Ajuste Q Ant.</TableHead>
                  <TableHead className="text-right">Neto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trabajadoresFiltrados.map((trabajador) => {
                  const diasCubiertos = 15;
                  const montoBase = diasCubiertos * trabajador.montoAlimentacionDiaria;
                  const ajuste = ajustesQuincenaAnterior[trabajador.CI];
                  const montoAjuste = ajuste?.monto || 0;
                  const montoNeto = montoBase - montoAjuste;
                  const tieneAjuste = montoAjuste > 0;

                  return (
                    <TableRow key={trabajador.CI} className={tieneAjuste ? "bg-yellow-50/50" : ""}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{trabajador.nombre}</p>
                          <p className="text-xs text-gray-500">{trabajador.cargo}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        ${trabajador.montoAlimentacionDiaria.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{diasCubiertos} días</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        ${montoBase.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center">
                        {tieneAjuste ? (
                          <div className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-sm">
                            <TrendingDown className="w-3 h-3" />
                            -{ajuste.dias} días
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={cn("font-semibold", tieneAjuste ? "text-orange-600" : "text-gray-900")}>
                          ${montoNeto.toLocaleString()}
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
                <p className="text-sm text-gray-500">Base</p>
                <p className="text-lg font-semibold">${totales.base.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Ajustes</p>
                <p className="text-lg font-semibold text-red-600">
                  -${totales.ajustes.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Neto</p>
                <p className="text-xl font-bold text-orange-600">${totales.neto.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info adicional sobre flujo de alimentación */}
      <Card className="bg-gray-50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Cómo funciona el flujo de alimentación
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 text-sm font-medium text-blue-700">
              1
            </div>
            <p className="text-sm text-gray-600">
              <strong>Pago adelantado:</strong> En cada quincena se paga la alimentación correspondiente a los próximos 15 días.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 text-sm font-medium text-red-700">
              2
            </div>
            <p className="text-sm text-gray-600">
              <strong>Descuento posterior:</strong> Si un trabajador no trabaja algún día, ese descuento se aplica en la siguiente quincena (sobre la alimentación que se paga por adelantado).
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 text-sm font-medium text-green-700">
              3
            </div>
            <p className="text-sm text-gray-600">
              <strong>Ejemplo:</strong> Si Juan falta el día 5 de febrero (Q1), su alimentación de la Q2 (que se paga el 16 de febrero) se reduce en 1 día.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
