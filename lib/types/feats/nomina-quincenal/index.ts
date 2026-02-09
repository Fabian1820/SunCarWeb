// ============================================================
// SISTEMA DE NÓMINA QUINCENAL - TIPOS
// ============================================================
// Este módulo reemplaza el sistema mensual anterior de RRHH
// con un sistema basado en quincenas que respeta:
// - Salario a mes vencido
// - Estímulos a mes vencido
// - Alimentación por adelantado
// ============================================================

// ============================================
// PERÍODO DE NÓMINA
// ============================================

export type EstadoPeriodo = 'abierto' | 'en_calculo' | 'cerrado' | 'pagado' | 'archivado';
export type Quincena = 1 | 2;

export interface PeriodoNomina {
  id: string;
  anio: number;
  mes: number;
  quincena: Quincena;
  
  // Fechas clave
  fechaInicio: string;  // ISO date
  fechaFin: string;     // ISO date
  fechaPago: string;    // ISO date
  
  // Estado
  estado: EstadoPeriodo;
  
  // Metadatos
  diasHabiles: number;
  creadoPor: string;
  cerradoPor?: string;
  fechaCierre?: string;
  
  // Timestamps
  creadoEn: string;
  actualizadoEn: string;
}

// ============================================
// INGRESO MENSUAL (para cálculo de estímulos)
// ============================================

export interface IngresoMensualNomina {
  id: string;
  anio: number;
  mes: number;
  monto: number;
  moneda: 'CUP' | 'USD' | 'EUR';
  
  // Distribución
  porcentajeFijoTotal: number;      // 75% del ingreso
  porcentajeVariableTotal: number;  // 25% del ingreso
  
  // Referencias
  nominaQuincena1Id?: string;
  nominaQuincena2Id?: string;
  
  creadoEn: string;
  actualizadoEn: string;
}

// ============================================
// TRABAJADOR (versión simplificada para nómina)
// ============================================

export interface TrabajadorNomina {
  CI: string;
  nombre: string;
  cargo: string;
  
  // Configuración salarial
  salarioBaseMensual: number;
  montoAlimentacionDiaria: number;
  
  // Estímulo fijo (constante)
  porcentajeEstimuloFijo: number;
  
  // Flags
  isBrigadista: boolean;
  activo: boolean;
  fechaIngreso: string;
  
  // Última actualización
  actualizadoEn: string;
}

// ============================================
// NÓMINA QUINCENAL
// ============================================

export type EstadoNomina = 'borrador' | 'calculada' | 'revisada' | 'aprobada' | 'pagada';

export interface TotalesNomina {
  totalSalarios: number;
  totalEstimulosFijos: number;
  totalEstimulosVariables: number;
  totalAlimentacion: number;
  totalDescuentosSalario: number;
  totalAjustesAlimentacion: number;
  totalNeto: number;
}

export interface NominaQuincenal {
  id: string;
  periodoId: string;
  
  // Referencias
  ingresoMensualId?: string;  // Ingreso del mes vencido (para estímulos)
  
  // Estado
  estado: EstadoNomina;
  
  // Totales
  totales: TotalesNomina;
  
  // Metadatos
  calculadaPor?: string;
  fechaCalculo?: string;
  aprobadaPor?: string;
  fechaAprobacion?: string;
  pagadaPor?: string;
  fechaPago?: string;
  
  // Líneas
  lineas: LineaNomina[];
  
  // Timestamps
  creadaEn: string;
  actualizadaEn: string;
}

// ============================================
// LÍNEA DE NÓMINA (por trabajador)
// ============================================

// ----- Sección Salario -----
export interface SalarioLineaNomina {
  // Días
  diasDelPeriodo: number;
  diasTrabajados: number;
  diasNoTrabajados: number[];  // Array de números de día (1-31)
  
  // Cálculo
  salarioDiario: number;
  montoPorDiasTrabajados: number;
  
  // Descuentos
  descuentoDiasNoTrabajados: number;
  
  // Total
  totalSalario: number;
}

// ----- Sección Estímulos -----
export interface EstimuloFijoLineaNomina {
  montoBaseQuincena: number;   // (ingreso * 0.75) / 2
  porcentajeAsignado: number;
  montoEstimulo: number;
}

export interface EstimuloVariableLineaNomina {
  montoBaseQuincena: number;   // (ingreso * 0.25) / 2
  porcentajeAsignado: number;
  montoEstimulo: number;
}

export interface IngresoReferencia {
  anio: number;
  mes: number;
  montoTotal: number;
}

export interface EstimulosLineaNomina {
  ingresoReferencia: IngresoReferencia;
  fijo: EstimuloFijoLineaNomina;
  variable: EstimuloVariableLineaNomina;
  totalEstimulos: number;
}

// ----- Sección Alimentación -----
export interface PeriodoCubierto {
  anio: number;
  mes: number;
  quincena: Quincena;
}

export interface AjusteAlimentacion {
  diasNoTrabajadosQuincenaAnterior: number;
  montoDescuento: number;
  nominaAnteriorId?: string;
}

export interface AlimentacionLineaNomina {
  periodoCubierto: PeriodoCubierto;
  diasCubiertos: number;
  montoDiario: number;
  montoBase: number;
  ajuste: AjusteAlimentacion | null;
  montoNeto: number;
}

// ----- Línea completa -----
export interface LineaNomina {
  id: string;
  nominaId: string;
  trabajadorCI: string;
  
  // Secciones
  salario: SalarioLineaNomina;
  estimulos: EstimulosLineaNomina | null;  // null si no hay ingreso asignado
  alimentacion: AlimentacionLineaNomina;
  
  // Resumen
  totalDevengado: number;
  totalDescuentos: number;
  totalNeto: number;
  
  // Estado individual
  pagado: boolean;
  fechaPago?: string;
  
  // Auditoría
  calculadoEn: string;
  modificadoEn: string;
}

// ============================================
// REQUESTS / RESPONSES
// ============================================

// Crear período
export interface CrearPeriodoRequest {
  anio: number;
  mes: number;
  quincena: Quincena;
  fechaPago: string;
}

// Crear nómina
export interface CrearNominaRequest {
  periodoId: string;
  ingresoMensualId?: string;
}

// Calcular líneas
export interface CalcularLineasRequest {
  nominaId: string;
  trabajadoresCI?: string[];  // Si no se especifica, todos
}

// Actualizar porcentajes variables
export interface ActualizarPorcentajesVariablesRequest {
  nominaId: string;
  porcentajes: Record<string, number>;  // CI -> porcentaje
}

// Actualizar días no trabajados
export interface ActualizarDiasNoTrabajadosRequest {
  lineaId: string;
  diasNoTrabajados: number[];
}

// Cambiar estado de nómina
export interface CambiarEstadoNominaRequest {
  nominaId: string;
  nuevoEstado: EstadoNomina;
  observaciones?: string;
}

// ============================================
// RESUMENES Y ESTADÍSTICAS
// ============================================

export interface ResumenNomina {
  periodo: PeriodoNomina;
  nomina: NominaQuincenal;
  trabajadoresCount: number;
  progresoCalculo: number;  // 0-100
}

export interface ComparativaQuincenas {
  periodoActual: PeriodoNomina;
  periodoAnterior: PeriodoNomina | null;
  variacionSalarios: number;  // Porcentaje
  variacionEstimulos: number;
  variacionAlimentacion: number;
  variacionTotal: number;
}

export interface EstadisticasNomina {
  totalNominasAnio: number;
  totalPagadoAnio: number;
  promedioTrabajadoresPorNomina: number;
  distribucionPorCargo: Record<string, number>;
}

// ============================================
// FILTROS Y BÚSQUEDA
// ============================================

export interface FiltrosNomina {
  anio?: number;
  mes?: number;
  quincena?: Quincena;
  estado?: EstadoNomina;
  searchTerm?: string;
}

export interface FiltrosLineasNomina {
  cargo?: string;
  tieneEstimuloVariable?: boolean;
  tieneDiasNoTrabajados?: boolean;
  searchTerm?: string;
}

// ============================================
// EXPORTACIÓN
// ============================================

export interface ExportarNominaOptions {
  nominaId: string;
  formato: 'excel' | 'pdf' | 'csv';
  incluirDetalle?: boolean;
  incluirResumen?: boolean;
}

// ============================================
// UTILIDADES DE TIPO
// ============================================

// Helper para crear una línea vacía
export function crearLineaNominaVacia(
  nominaId: string,
  trabajadorCI: string,
  periodo: PeriodoNomina
): LineaNomina {
  const ahora = new Date().toISOString();
  
  return {
    id: '',  // Se genera en backend
    nominaId,
    trabajadorCI,
    salario: {
      diasDelPeriodo: periodo.diasHabiles,
      diasTrabajados: periodo.diasHabiles,
      diasNoTrabajados: [],
      salarioDiario: 0,
      montoPorDiasTrabajados: 0,
      descuentoDiasNoTrabajados: 0,
      totalSalario: 0,
    },
    estimulos: null,
    alimentacion: {
      periodoCubierto: {
        anio: periodo.anio,
        mes: periodo.mes,
        quincena: periodo.quincena,
      },
      diasCubiertos: 15,
      montoDiario: 0,
      montoBase: 0,
      ajuste: null,
      montoNeto: 0,
    },
    totalDevengado: 0,
    totalDescuentos: 0,
    totalNeto: 0,
    pagado: false,
    calculadoEn: ahora,
    modificadoEn: ahora,
  };
}

// Helper para calcular totales
export function calcularTotalesNomina(lineas: LineaNomina[]): TotalesNomina {
  return lineas.reduce(
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
}
