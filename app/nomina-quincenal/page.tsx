"use client";

import { useState } from "react";
import { NominaLayout } from "@/components/feats/nomina-quincenal/layout/NominaLayout";
import { NominaDashboard } from "@/components/feats/nomina-quincenal/dashboard/NominaDashboard";
import { SalariosCalculator } from "@/components/feats/nomina-quincenal/salarios/SalariosCalculator";
import { EstimulosAsignador } from "@/components/feats/nomina-quincenal/estimulos/EstimulosAsignador";
import { AlimentacionManager } from "@/components/feats/nomina-quincenal/alimentacion/AlimentacionManager";
import type {
  PeriodoNomina,
  NominaQuincenal,
  LineaNomina,
  TrabajadorNomina,
  IngresoMensualNomina,
} from "@/lib/types/feats/nomina-quincenal";

// ============================================================
// DATOS DE EJEMPLO PARA VISUALIZACIÓN
// ============================================================

const PERIODOS_EJEMPLO: PeriodoNomina[] = [
  {
    id: "per-2025-02-1",
    anio: 2025,
    mes: 2,
    quincena: 1,
    fechaInicio: "2025-02-01",
    fechaFin: "2025-02-15",
    fechaPago: "2025-02-16",
    estado: "en_calculo",
    diasHabiles: 12,
    creadoPor: "admin",
    creadoEn: "2025-02-01T00:00:00Z",
    actualizadoEn: "2025-02-01T00:00:00Z",
  },
  {
    id: "per-2025-01-2",
    anio: 2025,
    mes: 1,
    quincena: 2,
    fechaInicio: "2025-01-16",
    fechaFin: "2025-01-31",
    fechaPago: "2025-02-01",
    estado: "pagado",
    diasHabiles: 12,
    creadoPor: "admin",
    cerradoPor: "admin",
    fechaCierre: "2025-02-01T00:00:00Z",
    creadoEn: "2025-01-15T00:00:00Z",
    actualizadoEn: "2025-02-01T00:00:00Z",
  },
  {
    id: "per-2025-01-1",
    anio: 2025,
    mes: 1,
    quincena: 1,
    fechaInicio: "2025-01-01",
    fechaFin: "2025-01-15",
    fechaPago: "2025-01-16",
    estado: "pagado",
    diasHabiles: 12,
    creadoPor: "admin",
    cerradoPor: "admin",
    fechaCierre: "2025-01-16T00:00:00Z",
    creadoEn: "2025-01-01T00:00:00Z",
    actualizadoEn: "2025-01-16T00:00:00Z",
  },
];

const TRABAJADORES_EJEMPLO: TrabajadorNomina[] = [
  {
    CI: "89012345678",
    nombre: "Juan Pérez García",
    cargo: "Vendedor",
    salarioBaseMensual: 25000,
    montoAlimentacionDiaria: 1000,
    porcentajeEstimuloFijo: 5.0,
    isBrigadista: false,
    activo: true,
    fechaIngreso: "2019-03-15",
    actualizadoEn: "2025-01-01T00:00:00Z",
  },
  {
    CI: "90023456789",
    nombre: "María García López",
    cargo: "Vendedora",
    salarioBaseMensual: 25000,
    montoAlimentacionDiaria: 1000,
    porcentajeEstimuloFijo: 5.0,
    isBrigadista: false,
    activo: true,
    fechaIngreso: "2020-06-20",
    actualizadoEn: "2025-01-01T00:00:00Z",
  },
  {
    CI: "91034567890",
    nombre: "Carlos López Martínez",
    cargo: "Técnico",
    salarioBaseMensual: 28000,
    montoAlimentacionDiaria: 1000,
    porcentajeEstimuloFijo: 4.5,
    isBrigadista: false,
    activo: true,
    fechaIngreso: "2018-01-10",
    actualizadoEn: "2025-01-01T00:00:00Z",
  },
  {
    CI: "92045678901",
    nombre: "Ana Martínez Sánchez",
    cargo: "Administradora",
    salarioBaseMensual: 30000,
    montoAlimentacionDiaria: 1000,
    porcentajeEstimuloFijo: 6.0,
    isBrigadista: false,
    activo: true,
    fechaIngreso: "2017-09-05",
    actualizadoEn: "2025-01-01T00:00:00Z",
  },
  {
    CI: "93056789012",
    nombre: "Pedro Sánchez Ruiz",
    cargo: "Almacenista",
    salarioBaseMensual: 24000,
    montoAlimentacionDiaria: 1000,
    porcentajeEstimuloFijo: 4.0,
    isBrigadista: false,
    activo: true,
    fechaIngreso: "2021-02-14",
    actualizadoEn: "2025-01-01T00:00:00Z",
  },
];

const INGRESO_ENERO: IngresoMensualNomina = {
  id: "ing-2025-01",
  anio: 2025,
  mes: 1,
  monto: 2500000,
  moneda: "CUP",
  porcentajeFijoTotal: 1875000, // 75%
  porcentajeVariableTotal: 625000, // 25%
  creadoEn: "2025-02-01T00:00:00Z",
  actualizadoEn: "2025-02-01T00:00:00Z",
};

// Generar líneas de nómina de ejemplo
const generarLineasEjemplo = (
  nominaId: string,
  trabajadores: TrabajadorNomina[],
  periodo: PeriodoNomina,
  conEstimulos: boolean = false
): LineaNomina[] => {
  const ahora = new Date().toISOString();
  
  return trabajadores.map((trabajador, index) => {
    const diasDelPeriodo = periodo.diasHabiles;
    // Simular que Carlos tuvo 2 días no trabajados
    const diasNoTrabajados = trabajador.CI === "91034567890" ? [5, 12] : [];
    const diasTrabajados = diasDelPeriodo - diasNoTrabajados.length;
    const salarioDiario = trabajador.salarioBaseMensual / 24; // 24 días laborables al mes
    const montoPorDiasTrabajados = salarioDiario * diasTrabajados;
    const descuento = salarioDiario * diasNoTrabajados.length;
    
    // Alimentación
    const diasCubiertos = 15;
    const montoAlimentacionBase = diasCubiertos * trabajador.montoAlimentacionDiaria;
    const ajusteAlimentacion = diasNoTrabajados.length * trabajador.montoAlimentacionDiaria;
    
    // Estímulos (si aplica)
    let estimulos = null;
    if (conEstimulos && INGRESO_ENERO) {
      const montoBaseFijo = (INGRESO_ENERO.monto * 0.75) / 2;
      const montoBaseVariable = (INGRESO_ENERO.monto * 0.25) / 2;
      
      const montoEstimuloFijo = (montoBaseFijo * trabajador.porcentajeEstimuloFijo) / 100;
      
      // Variables asignados a algunos trabajadores
      const porcentajeVariable = index === 0 ? 8 : index === 1 ? 5 : index === 3 ? 12 : 0;
      const montoEstimuloVariable = (montoBaseVariable * porcentajeVariable) / 100;
      
      estimulos = {
        ingresoReferencia: {
          anio: INGRESO_ENERO.anio,
          mes: INGRESO_ENERO.mes,
          montoTotal: INGRESO_ENERO.monto,
        },
        fijo: {
          montoBaseQuincena: montoBaseFijo,
          porcentajeAsignado: trabajador.porcentajeEstimuloFijo,
          montoEstimulo: montoEstimuloFijo,
        },
        variable: {
          montoBaseQuincena: montoBaseVariable,
          porcentajeAsignado: porcentajeVariable,
          montoEstimulo: montoEstimuloVariable,
        },
        totalEstimulos: montoEstimuloFijo + montoEstimuloVariable,
      };
    }
    
    const totalEstimulos = estimulos?.totalEstimulos || 0;
    const totalAlimentacion = montoAlimentacionBase - ajusteAlimentacion;
    const totalDevengado = montoPorDiasTrabajados + totalEstimulos + totalAlimentacion;
    const totalDescuentos = descuento + ajusteAlimentacion;
    const totalNeto = totalDevengado - totalDescuentos;
    
    return {
      id: `linea-${nominaId}-${trabajador.CI}`,
      nominaId,
      trabajadorCI: trabajador.CI,
      salario: {
        diasDelPeriodo,
        diasTrabajados,
        diasNoTrabajados,
        salarioDiario,
        montoPorDiasTrabajados,
        descuentoDiasNoTrabajados: descuento,
        totalSalario: montoPorDiasTrabajados,
      },
      estimulos,
      alimentacion: {
        periodoCubierto: {
          anio: periodo.anio,
          mes: periodo.mes,
          quincena: periodo.quincena === 1 ? 2 : 1,
        },
        diasCubiertos,
        montoDiario: trabajador.montoAlimentacionDiaria,
        montoBase: montoAlimentacionBase,
        ajuste: ajusteAlimentacion > 0 ? {
          diasNoTrabajadosQuincenaAnterior: diasNoTrabajados.length,
          montoDescuento: ajusteAlimentacion,
          nominaAnteriorId: undefined,
        } : null,
        montoNeto: totalAlimentacion,
      },
      totalDevengado,
      totalDescuentos,
      totalNeto,
      pagado: false,
      calculadoEn: ahora,
      modificadoEn: ahora,
    };
  });
};

const NOMINA_ACTUAL: NominaQuincenal = {
  id: "nom-2025-02-1",
  periodoId: "per-2025-02-1",
  ingresoMensualId: "ing-2025-01",
  estado: "calculada",
  totales: {
    totalSalarios: 0,
    totalEstimulosFijos: 0,
    totalEstimulosVariables: 0,
    totalAlimentacion: 0,
    totalDescuentosSalario: 0,
    totalAjustesAlimentacion: 0,
    totalNeto: 0,
  },
  lineas: [],
  creadaEn: "2025-02-01T00:00:00Z",
  actualizadaEn: "2025-02-01T00:00:00Z",
};

// Calcular líneas con estimulos
NOMINA_ACTUAL.lineas = generarLineasEjemplo(
  NOMINA_ACTUAL.id,
  TRABAJADORES_EJEMPLO,
  PERIODOS_EJEMPLO[0],
  true
);

// Calcular totales
NOMINA_ACTUAL.totales = NOMINA_ACTUAL.lineas.reduce(
  (acc, linea) => ({
    totalSalarios: acc.totalSalarios + linea.salario.totalSalario,
    totalEstimulosFijos: acc.totalEstimulosFijos + (linea.estimulos?.fijo.montoEstimulo || 0),
    totalEstimulosVariables: acc.totalEstimulosVariables + (linea.estimulos?.variable.montoEstimulo || 0),
    totalAlimentacion: acc.totalAlimentacion + linea.alimentacion.montoNeto,
    totalDescuentosSalario: acc.totalDescuentosSalario + linea.salario.descuentoDiasNoTrabajados,
    totalAjustesAlimentacion: acc.totalAjustesAlimentacion + (linea.alimentacion.ajuste?.montoDescuento || 0),
    totalNeto: acc.totalNeto + linea.totalNeto,
  }),
  {
    totalSalarios: 0,
    totalEstimulosFijos: 0,
    totalEstimulosVariables: 0,
    totalAlimentacion: 0,
    totalDescuentosSalario: 0,
    totalAjustesAlimentacion: 0,
    totalNeto: 0,
  }
);

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export default function NominaQuincenalPage() {
  const [periodoActual, setPeriodoActual] = useState<PeriodoNomina>(PERIODOS_EJEMPLO[0]);
  const [nominaActual] = useState<NominaQuincenal>(NOMINA_ACTUAL);
  const [vistaActual, setVistaActual] = useState<"dashboard" | "salarios" | "estimulos" | "alimentacion">("dashboard");

  const handlePeriodoChange = (periodo: PeriodoNomina) => {
    setPeriodoActual(periodo);
  };

  const handleCrearPeriodo = () => {
    alert("Abrir diálogo para crear nuevo período");
  };

  const handleCalcularSalarios = () => {
    setVistaActual("salarios");
  };

  const handleAsignarEstimulos = () => {
    setVistaActual("estimulos");
  };

  const handlePagarAlimentacion = () => {
    setVistaActual("alimentacion");
  };

  const handleVerDetalle = () => {
    setVistaActual("dashboard");
  };

  const handleGuardarSalarios = async () => {
    alert("Salarios guardados");
  };

  const handleFinalizarSalarios = async () => {
    alert("Salarios finalizados");
    setVistaActual("dashboard");
  };

  const handleActualizarDias = async (lineaId: string, dias: number[]) => {
    alert(`Días actualizados para línea ${lineaId}: ${dias.join(", ")}`);
  };

  const handleGuardarEstimulos = async (porcentajes: Record<string, number>) => {
    alert("Estímulos guardados: " + JSON.stringify(porcentajes));
  };

  const handleFinalizarEstimulos = async () => {
    alert("Estímulos finalizados");
    setVistaActual("dashboard");
  };

  const handleGuardarAlimentacion = async () => {
    alert("Alimentación guardada");
  };

  const handleConfirmarPagoAlimentacion = async () => {
    alert("Pago de alimentación confirmado");
    setVistaActual("dashboard");
  };

  const renderContenido = () => {
    switch (vistaActual) {
      case "salarios":
        return (
          <SalariosCalculator
            periodo={periodoActual}
            nomina={nominaActual}
            lineas={nominaActual.lineas}
            trabajadores={TRABAJADORES_EJEMPLO}
            onGuardar={handleGuardarSalarios}
            onFinalizar={handleFinalizarSalarios}
            onActualizarDiasNoTrabajados={handleActualizarDias}
          />
        );
      case "estimulos":
        return (
          <EstimulosAsignador
            periodo={periodoActual}
            nomina={nominaActual}
            lineas={nominaActual.lineas}
            trabajadores={TRABAJADORES_EJEMPLO}
            ingresoReferencia={INGRESO_ENERO}
            onGuardar={handleGuardarEstimulos}
            onFinalizar={handleFinalizarEstimulos}
          />
        );
      case "alimentacion":
        return (
          <AlimentacionManager
            periodo={periodoActual}
            nomina={nominaActual}
            lineas={nominaActual.lineas}
            trabajadores={TRABAJADORES_EJEMPLO}
            nominaAnterior={null}
            onGuardar={handleGuardarAlimentacion}
            onConfirmarPago={handleConfirmarPagoAlimentacion}
          />
        );
      default:
        return (
          <NominaDashboard
            periodo={periodoActual}
            nomina={nominaActual}
            lineas={nominaActual.lineas}
            onCalcularSalarios={handleCalcularSalarios}
            onAsignarEstimulos={handleAsignarEstimulos}
            onPagarAlimentacion={handlePagarAlimentacion}
            onVerDetalle={handleVerDetalle}
          />
        );
    }
  };

  return (
    <NominaLayout
      periodoActual={periodoActual}
      nominaActual={nominaActual}
      periodosDisponibles={PERIODOS_EJEMPLO}
      onPeriodoChange={handlePeriodoChange}
      onCrearPeriodo={handleCrearPeriodo}
    >
      {renderContenido()}
    </NominaLayout>
  );
}
