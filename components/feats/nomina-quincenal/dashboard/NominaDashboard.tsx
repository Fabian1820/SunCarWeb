"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/shared/molecule/card";
import { Button } from "@/components/shared/atom/button";
import { Badge } from "@/components/shared/atom/badge";
import {
  DollarSign,
  Target,
  Utensils,
  Users,
  Calendar,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Calculator,
} from "lucide-react";
import type { PeriodoNomina, NominaQuincenal, LineaNomina } from "@/lib/types/feats/nomina-quincenal";

interface NominaDashboardProps {
  periodo: PeriodoNomina | null;
  nomina: NominaQuincenal | null;
  lineas: LineaNomina[];
  onCalcularSalarios: () => void;
  onAsignarEstimulos: () => void;
  onPagarAlimentacion: () => void;
  onVerDetalle: () => void;
}

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

export function NominaDashboard({
  periodo,
  nomina,
  lineas,
  onCalcularSalarios,
  onAsignarEstimulos,
  onPagarAlimentacion,
  onVerDetalle,
}: NominaDashboardProps) {
  if (!periodo) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <Calendar className="w-12 h-12 text-gray-400" />
        </div>
        <h2 className="text-xl font-semibold text-gray-700 mb-2">
          No hay período seleccionado
        </h2>
        <p className="text-gray-500 text-center max-w-md">
          Seleccione o cree un período de nómina para comenzar a trabajar
        </p>
      </div>
    );
  }

  const formatearFecha = (fechaStr: string) => {
    return new Date(fechaStr).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatearPeriodo = () => {
    return `${MESES[periodo.mes - 1]} ${periodo.anio} - Quincena ${periodo.quincena}`;
  };

  const getQuincenaDescripcion = () => {
    if (periodo.quincena === 1) {
      return `Días 1-15 de ${MESES[periodo.mes - 1]}`;
    } else {
      return `Días 16-${new Date(periodo.anio, periodo.mes, 0).getDate()} de ${MESES[periodo.mes - 1]}`;
    }
  };

  const getEstadoInfo = (estado: string) => {
    const estados: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
      borrador: {
        label: "Borrador",
        color: "bg-gray-100 text-gray-700",
        icon: <Clock className="w-4 h-4" />,
      },
      calculada: {
        label: "Calculada",
        color: "bg-blue-100 text-blue-700",
        icon: <Calculator className="w-4 h-4" />,
      },
      revisada: {
        label: "En Revisión",
        color: "bg-yellow-100 text-yellow-700",
        icon: <AlertCircle className="w-4 h-4" />,
      },
      aprobada: {
        label: "Aprobada",
        color: "bg-green-100 text-green-700",
        icon: <CheckCircle2 className="w-4 h-4" />,
      },
      pagada: {
        label: "Pagada",
        color: "bg-purple-100 text-purple-700",
        icon: <CheckCircle2 className="w-4 h-4" />,
      },
    };
    return estados[estado] || { label: estado, color: "bg-gray-100", icon: null };
  };

  const estadoInfo = nomina ? getEstadoInfo(nomina.estado) : null;

  // Determinar qué secciones están completas
  const salariosCalculados = (nomina?.totales.totalSalarios ?? 0) > 0;
  const estimulosAsignados = (nomina?.totales.totalEstimulosFijos ?? 0) > 0;
  const alimentacionCalculada = (nomina?.totales.totalAlimentacion ?? 0) > 0;

  return (
    <div className="space-y-6">
      {/* Header del período */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">{formatearPeriodo()}</h1>
            {estadoInfo && (
              <Badge className={cn("flex items-center gap-1", estadoInfo.color)}>
                {estadoInfo.icon}
                {estadoInfo.label}
              </Badge>
            )}
          </div>
          <p className="text-gray-500">
            {getQuincenaDescripcion()} • Pago programado: {" "}
            <span className="font-medium text-gray-700">{formatearFecha(periodo.fechaPago)}</span>
          </p>
        </div>

        {nomina && (
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onVerDetalle}>
              Ver Detalle Completo
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}
      </div>

      {/* Cards de resumen */}
      {nomina ? (
        <>
          {/* Indicadores de progreso */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ResumenCard
              titulo="Salarios"
              subtitulo={`Período trabajado: ${getQuincenaDescripcion()}`}
              monto={nomina.totales.totalSalarios}
              estado={salariosCalculados ? "completo" : "pendiente"}
              icono={<DollarSign className="w-6 h-6" />}
              color="blue"
              accion={!salariosCalculados ? {
                label: "Calcular",
                onClick: onCalcularSalarios,
              } : undefined}
            />

            <ResumenCard
              titulo="Estímulos"
              subtitulo="Basado en ingresos del mes anterior"
              monto={nomina.totales.totalEstimulosFijos + nomina.totales.totalEstimulosVariables}
              estado={estimulosAsignados ? "completo" : "pendiente"}
              icono={<Target className="w-6 h-6" />}
              color="green"
              desglose={[
                { label: "Fijos", monto: nomina.totales.totalEstimulosFijos },
                { label: "Variables", monto: nomina.totales.totalEstimulosVariables },
              ]}
              accion={!estimulosAsignados && salariosCalculados ? {
                label: "Asignar %",
                onClick: onAsignarEstimulos,
              } : undefined}
            />

            <ResumenCard
              titulo="Alimentación"
              subtitulo="Pago por adelantado"
              monto={nomina.totales.totalAlimentacion}
              estado={alimentacionCalculada ? "completo" : "pendiente"}
              icono={<Utensils className="w-6 h-6" />}
              color="orange"
              ajuste={nomina.totales.totalAjustesAlimentacion > 0 ? {
                monto: -nomina.totales.totalAjustesAlimentacion,
                descripcion: "Ajustes por días no trabajados Q anterior",
              } : undefined}
              accion={!alimentacionCalculada && salariosCalculados ? {
                label: "Calcular",
                onClick: onPagarAlimentacion,
              } : undefined}
            />
          </div>

          {/* Resumen general */}
          <Card className="border-l-4 border-l-purple-600">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-600" />
                Resumen General
              </CardTitle>
              <CardDescription>
                Total de la nómina con {lineas.length} trabajadores
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Salarios</p>
                  <p className="text-xl font-bold text-gray-900">
                    ${nomina.totales.totalSalarios.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Estímulos</p>
                  <p className="text-xl font-bold text-gray-900">
                    ${(nomina.totales.totalEstimulosFijos + nomina.totales.totalEstimulosVariables).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Alimentación</p>
                  <p className="text-xl font-bold text-gray-900">
                    ${nomina.totales.totalAlimentacion.toLocaleString()}
                  </p>
                </div>
                <div className="border-l pl-6">
                  <p className="text-sm text-gray-500 mb-1">Total Neto</p>
                  <p className="text-2xl font-bold text-purple-600">
                    ${nomina.totales.totalNeto.toLocaleString()}
                  </p>
                </div>
              </div>

              {nomina.totales.totalDescuentosSalario > 0 && (
                <div className="mt-4 p-3 bg-red-50 rounded-lg flex items-center gap-3">
                  <TrendingDown className="w-5 h-5 text-red-600" />
                  <div>
                    <p className="text-sm font-medium text-red-800">
                      Descuentos por días no trabajados
                    </p>
                    <p className="text-sm text-red-600">
                      Total: ${nomina.totales.totalDescuentosSalario.toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Lista de trabajadores */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Trabajadores
                  </CardTitle>
                  <CardDescription>
                    Resumen por trabajador de esta quincena
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  Ver Todos
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Trabajador</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700">Salario</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700">Estímulos</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700">Alimentación</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {lineas.slice(0, 5).map((linea) => (
                      <tr key={linea.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-gray-900">{linea.trabajadorCI}</p>
                            <p className="text-xs text-gray-500">Trabajador</p>
                          </div>
                        </td>
                        <td className="text-right py-3 px-4">
                          ${linea.salario.totalSalario.toLocaleString()}
                        </td>
                        <td className="text-right py-3 px-4">
                          ${(linea.estimulos?.totalEstimulos || 0).toLocaleString()}
                        </td>
                        <td className="text-right py-3 px-4">
                          ${linea.alimentacion.montoNeto.toLocaleString()}
                        </td>
                        <td className="text-right py-3 px-4 font-semibold text-purple-600">
                          ${linea.totalNeto.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {lineas.length > 5 && (
                  <div className="py-3 text-center text-sm text-gray-500">
                    Y {lineas.length - 5} trabajadores más...
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="p-12 text-center">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calculator className="w-8 h-8 text-purple-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Nómina no creada
          </h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Este período aún no tiene una nómina creada. Comience calculando los salarios de los trabajadores.
          </p>
          <Button onClick={onCalcularSalarios} size="lg">
            <Calculator className="w-5 h-5 mr-2" />
            Crear y Calcular Nómina
          </Button>
        </Card>
      )}
    </div>
  );
}

// Componente auxiliar para las cards de resumen
interface ResumenCardProps {
  titulo: string;
  subtitulo: string;
  monto: number;
  estado: "completo" | "pendiente";
  icono: React.ReactNode;
  color: "blue" | "green" | "orange";
  desglose?: { label: string; monto: number }[];
  ajuste?: { monto: number; descripcion: string };
  accion?: { label: string; onClick: () => void };
}

function ResumenCard({
  titulo,
  subtitulo,
  monto,
  estado,
  icono,
  color,
  desglose,
  ajuste,
  accion,
}: ResumenCardProps) {
  const colors = {
    blue: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      icon: "text-blue-600",
      text: "text-blue-900",
      badge: "bg-blue-100 text-blue-700",
    },
    green: {
      bg: "bg-green-50",
      border: "border-green-200",
      icon: "text-green-600",
      text: "text-green-900",
      badge: "bg-green-100 text-green-700",
    },
    orange: {
      bg: "bg-orange-50",
      border: "border-orange-200",
      icon: "text-orange-600",
      text: "text-orange-900",
      badge: "bg-orange-100 text-orange-700",
    },
  };

  const theme = colors[color];

  return (
    <Card className={cn("border-2", estado === "completo" ? theme.border : "border-gray-200")}>
      <CardContent className={cn("p-6", estado === "completo" && theme.bg)}>
        <div className="flex items-start justify-between mb-4">
          <div className={cn("p-3 rounded-lg bg-white", theme.icon)}>{icono}</div>
          <Badge
            variant={estado === "completo" ? "default" : "outline"}
            className={estado === "completo" ? theme.badge : ""}
          >
            {estado === "completo" ? "✓ Completado" : "Pendiente"}
          </Badge>
        </div>

        <h3 className={cn("text-lg font-semibold mb-1", theme.text)}>{titulo}</h3>
        <p className="text-sm text-gray-500 mb-3">{subtitulo}</p>

        <p className={cn("text-2xl font-bold", theme.text)}>
          ${monto.toLocaleString()}
        </p>

        {desglose && desglose.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-200 space-y-1">
            {desglose.map((item) => (
              <div key={item.label} className="flex justify-between text-sm">
                <span className="text-gray-500">{item.label}</span>
                <span className="font-medium">${item.monto.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}

        {ajuste && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{ajuste.descripcion}</span>
              <span className="font-medium text-red-600">
                ${ajuste.monto.toLocaleString()}
              </span>
            </div>
          </div>
        )}

        {accion && estado !== "completo" && (
          <Button
            onClick={accion.onClick}
            variant="outline"
            className="w-full mt-4"
            size="sm"
          >
            {accion.label}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
