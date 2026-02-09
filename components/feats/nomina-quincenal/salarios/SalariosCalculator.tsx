"use client";

import { useState } from "react";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
import {
  Calculator,
  Calendar,
  Save,
  CheckCircle2,
  AlertCircle,
  TrendingDown,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { PeriodoNomina, NominaQuincenal, LineaNomina, TrabajadorNomina } from "@/lib/types/feats/nomina-quincenal";

interface SalariosCalculatorProps {
  periodo: PeriodoNomina;
  nomina: NominaQuincenal | null;
  lineas: LineaNomina[];
  trabajadores: TrabajadorNomina[];
  onGuardar: (lineasActualizadas: LineaNomina[]) => Promise<void>;
  onFinalizar: () => Promise<void>;
  onActualizarDiasNoTrabajados: (lineaId: string, dias: number[]) => Promise<void>;
}

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

export function SalariosCalculator({
  periodo,
  nomina,
  lineas,
  trabajadores,
  onGuardar,
  onFinalizar,
  onActualizarDiasNoTrabajados,
}: SalariosCalculatorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [lineasEditadas, setLineasEditadas] = useState<LineaNomina[]>(lineas);
  const [guardando, setGuardando] = useState(false);
  const [dialogoDiasAbierto, setDialogoDiasAbierto] = useState(false);
  const [lineaSeleccionada, setLineaSeleccionada] = useState<LineaNomina | null>(null);
  const [diasSeleccionados, setDiasSeleccionados] = useState<number[]>([]);

  // Filtrar líneas por búsqueda
  const lineasFiltradas = lineasEditadas.filter((linea) => {
    const trabajador = trabajadores.find((t) => t.CI === linea.trabajadorCI);
    if (!trabajador) return false;
    return (
      trabajador.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trabajador.CI.includes(searchTerm) ||
      trabajador.cargo.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // Calcular totales
  const totales = lineasFiltradas.reduce(
    (acc, linea) => ({
      diasTrabajados: acc.diasTrabajados + linea.salario.diasTrabajados,
      diasNoTrabajados: acc.diasNoTrabajados + linea.salario.diasNoTrabajados.length,
      descuentos: acc.descuentos + linea.salario.descuentoDiasNoTrabajados,
      salarios: acc.salarios + linea.salario.totalSalario,
    }),
    { diasTrabajados: 0, diasNoTrabajados: 0, descuentos: 0, salarios: 0 }
  );

  const formatearPeriodo = () => {
    return `${MESES[periodo.mes - 1]} ${periodo.anio} - Quincena ${periodo.quincena}`;
  };

  const getDescripcionPeriodo = () => {
    if (periodo.quincena === 1) {
      return `Días 1-15 de ${MESES[periodo.mes - 1]}`;
    }
    const ultimoDia = new Date(periodo.anio, periodo.mes, 0).getDate();
    return `Días 16-${ultimoDia} de ${MESES[periodo.mes - 1]}`;
  };

  const abrirDialogoDias = (linea: LineaNomina) => {
    setLineaSeleccionada(linea);
    setDiasSeleccionados([...linea.salario.diasNoTrabajados]);
    setDialogoDiasAbierto(true);
  };

  const guardarDiasNoTrabajados = async () => {
    if (!lineaSeleccionada) return;
    
    await onActualizarDiasNoTrabajados(lineaSeleccionada.id, diasSeleccionados);
    
    // Actualizar línea local
    const nuevasLineas = lineasEditadas.map((l) => {
      if (l.id === lineaSeleccionada.id) {
        const diasNoTrabajados = diasSeleccionados.length;
        const diasTrabajados = l.salario.diasDelPeriodo - diasNoTrabajados;
        const salarioDiario = l.salario.salarioDiario;
        const montoPorDiasTrabajados = salarioDiario * diasTrabajados;
        const descuento = salarioDiario * diasNoTrabajados;
        
        return {
          ...l,
          salario: {
            ...l.salario,
            diasNoTrabajados: diasSeleccionados,
            diasTrabajados,
            montoPorDiasTrabajados,
            descuentoDiasNoTrabajados: descuento,
            totalSalario: montoPorDiasTrabajados,
          },
          totalDevengado: montoPorDiasTrabajados + (l.estimulos?.totalEstimulos || 0) + l.alimentacion.montoNeto,
          totalDescuentos: descuento + (l.alimentacion.ajuste?.montoDescuento || 0),
          totalNeto: montoPorDiasTrabajados + (l.estimulos?.totalEstimulos || 0) + l.alimentacion.montoNeto - descuento,
        };
      }
      return l;
    });
    
    setLineasEditadas(nuevasLineas);
    setDialogoDiasAbierto(false);
    setLineaSeleccionada(null);
  };

  const handleGuardar = async () => {
    setGuardando(true);
    await onGuardar(lineasEditadas);
    setGuardando(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calculator className="w-6 h-6 text-blue-600" />
            Cálculo de Salarios
          </h1>
          <p className="text-gray-500 mt-1">
            {formatearPeriodo()} • {getDescripcionPeriodo()}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleGuardar} disabled={guardando}>
            <Save className="w-4 h-4 mr-2" />
            Guardar Borrador
          </Button>
          <Button onClick={onFinalizar} disabled={guardando}>
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Finalizar Salarios
          </Button>
        </div>
      </div>

      {/* Info del período */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900">
                Período de trabajo: {getDescripcionPeriodo()}
              </p>
              <p className="text-sm text-blue-700 mt-1">
                El salario se calcula sobre los días efectivamente trabajados según convenio.
                Los descuentos por días no trabajados se aplican en esta quincena.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Trabajadores</p>
            <p className="text-2xl font-bold text-gray-900">{lineasFiltradas.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Días Trabajados</p>
            <p className="text-2xl font-bold text-green-600">{totales.diasTrabajados}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Días No Trabajados</p>
            <p className="text-2xl font-bold text-red-600">{totales.diasNoTrabajados}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Total Salarios</p>
            <p className="text-2xl font-bold text-blue-600">${totales.salarios.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerta de descuentos */}
      {totales.descuentos > 0 && (
        <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <TrendingDown className="w-5 h-5 text-yellow-600" />
          <div>
            <p className="font-medium text-yellow-800">
              Hay descuentos por días no trabajados
            </p>
            <p className="text-sm text-yellow-700">
              Total de descuentos: ${totales.descuentos.toLocaleString()}. 
              Recuerda que estos días también afectarán la alimentación de la siguiente quincena.
            </p>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar trabajador por nombre, CI o cargo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline">
          <Filter className="w-4 h-4 mr-2" />
          Filtros
        </Button>
      </div>

      {/* Tabla de salarios */}
      <Card>
        <CardHeader>
          <CardTitle>Detalle por Trabajador</CardTitle>
          <CardDescription>
            Haga clic en el número de días no trabajados para editar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trabajador</TableHead>
                  <TableHead className="text-center">Días Período</TableHead>
                  <TableHead className="text-center">Días Trab.</TableHead>
                  <TableHead className="text-center">Días No Trab.</TableHead>
                  <TableHead className="text-right">Salario Diario</TableHead>
                  <TableHead className="text-right">Descuento</TableHead>
                  <TableHead className="text-right">Total Salario</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineasFiltradas.map((linea) => {
                  const trabajador = trabajadores.find((t) => t.CI === linea.trabajadorCI);
                  const tieneDiasNoTrabajados = linea.salario.diasNoTrabajados.length > 0;
                  
                  return (
                    <TableRow key={linea.id} className={tieneDiasNoTrabajados ? "bg-yellow-50/50" : ""}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{trabajador?.nombre || linea.trabajadorCI}</p>
                          <p className="text-xs text-gray-500">{trabajador?.cargo}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {linea.salario.diasDelPeriodo}
                      </TableCell>
                      <TableCell className="text-center font-medium text-green-600">
                        {linea.salario.diasTrabajados}
                      </TableCell>
                      <TableCell className="text-center">
                        <button
                          onClick={() => abrirDialogoDias(linea)}
                          className={cn(
                            "px-3 py-1 rounded-full text-sm font-medium transition-colors",
                            tieneDiasNoTrabajados
                              ? "bg-red-100 text-red-700 hover:bg-red-200"
                              : "bg-green-100 text-green-700 hover:bg-green-200"
                          )}
                        >
                          {linea.salario.diasNoTrabajados.length}
                        </button>
                      </TableCell>
                      <TableCell className="text-right">
                        ${linea.salario.salarioDiario.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {linea.salario.descuentoDiasNoTrabajados > 0 ? (
                          <span className="text-red-600 font-medium">
                            -${linea.salario.descuentoDiasNoTrabajados.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        ${linea.salario.totalSalario.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Diálogo para seleccionar días no trabajados */}
      <Dialog open={dialogoDiasAbierto} onOpenChange={setDialogoDiasAbierto}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Días No Trabajados
            </DialogTitle>
          </DialogHeader>

          {lineaSeleccionada && (
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium">
                  {trabajadores.find((t) => t.CI === lineaSeleccionada.trabajadorCI)?.nombre}
                </p>
                <p className="text-sm text-gray-500">
                  Período: {getDescripcionPeriodo()}
                </p>
              </div>

              <CalendarioDiasSelector
                anio={periodo.anio}
                mes={periodo.mes}
                quincena={periodo.quincena}
                diasSeleccionados={diasSeleccionados}
                onChange={setDiasSeleccionados}
              />

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-sm text-gray-500">
                  Días seleccionados: {" "}
                  <span className="font-bold text-gray-900">{diasSeleccionados.length}</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setDialogoDiasAbierto(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={guardarDiasNoTrabajados}>
                    Guardar Cambios
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Componente de calendario para seleccionar días
interface CalendarioDiasSelectorProps {
  anio: number;
  mes: number;
  quincena: 1 | 2;
  diasSeleccionados: number[];
  onChange: (dias: number[]) => void;
}

function CalendarioDiasSelector({
  anio,
  mes,
  quincena,
  diasSeleccionados,
  onChange,
}: CalendarioDiasSelectorProps) {
  // Obtener días del período
  const primerDia = quincena === 1 ? 1 : 16;
  const ultimoDia = quincena === 1 
    ? 15 
    : new Date(anio, mes, 0).getDate();
  
  // Generar array de días
  const diasDelPeriodo = Array.from(
    { length: ultimoDia - primerDia + 1 },
    (_, i) => primerDia + i
  );

  // Agrupar en semanas para mostrar
  const semanas: number[][] = [];
  let semanaActual: number[] = [];
  
  // Calcular día de la semana del primer día del período
  const primerDiaSemana = new Date(anio, mes - 1, primerDia).getDay();
  
  // Rellenar inicio de semana si es necesario
  for (let i = 0; i < primerDiaSemana; i++) {
    semanaActual.push(0); // 0 representa día vacío
  }
  
  diasDelPeriodo.forEach((dia) => {
    semanaActual.push(dia);
    if (semanaActual.length === 7) {
      semanas.push(semanaActual);
      semanaActual = [];
    }
  });
  
  if (semanaActual.length > 0) {
    semanas.push(semanaActual);
  }

  const toggleDia = (dia: number) => {
    if (dia === 0) return;
    
    if (diasSeleccionados.includes(dia)) {
      onChange(diasSeleccionados.filter((d) => d !== dia));
    } else {
      onChange([...diasSeleccionados, dia].sort((a, b) => a - b));
    }
  };

  const nombresDias = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {nombresDias.map((nombre) => (
          <div key={nombre} className="text-center text-xs font-medium text-gray-500 py-2">
            {nombre}
          </div>
        ))}
      </div>
      
      <div className="space-y-1">
        {semanas.map((semana, semanaIndex) => (
          <div key={semanaIndex} className="grid grid-cols-7 gap-1">
            {semana.map((dia, diaIndex) => {
              if (dia === 0) {
                return <div key={diaIndex} className="h-10" />;
              }
              
              const estaSeleccionado = diasSeleccionados.includes(dia);
              const fecha = new Date(anio, mes - 1, dia);
              const esFinDeSemana = fecha.getDay() === 0 || fecha.getDay() === 6;
              
              return (
                <button
                  key={dia}
                  onClick={() => toggleDia(dia)}
                  className={cn(
                    "h-10 rounded-lg text-sm font-medium transition-colors",
                    estaSeleccionado
                      ? "bg-red-500 text-white hover:bg-red-600"
                      : esFinDeSemana
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-white border border-gray-200 hover:bg-gray-50"
                  )}
                  disabled={esFinDeSemana}
                  title={esFinDeSemana ? "Fin de semana (no laborable)" : undefined}
                >
                  {dia}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      
      <div className="flex items-center gap-4 mt-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-white border border-gray-200 rounded" />
          <span className="text-gray-600">Laborable</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-100 rounded" />
          <span className="text-gray-600">Fin de semana</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded" />
          <span className="text-gray-600">No trabajado</span>
        </div>
      </div>
    </div>
  );
}
