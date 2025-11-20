"use client"

import { useState, useMemo } from "react"
import { Save, AlertCircle, Calendar, DollarSign, Users, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/shared/atom/button"
import { DialogFooter } from "@/components/shared/molecule/dialog"
import { Alert, AlertDescription } from "@/components/shared/atom/alert"
import type { TrabajadorRRHH, IngresoMensual } from "@/lib/recursos-humanos-types"
import type { CrearArchivoNominaRequest, TrabajadorArchivoRH } from "@/lib/types/feats/recursos-humanos/archivo-rh-types"

interface GuardarNominaDialogProps {
  trabajadores: TrabajadorRRHH[]
  ingresosDisponibles: IngresoMensual[]  // Lista de ingresos mensuales
  nominasExistentes: Set<string>         // Set de ingreso_mensual_id que ya tienen nómina
  onGuardar: (data: CrearArchivoNominaRequest) => Promise<{ success: boolean; message: string }>
  onCancel: () => void
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

export function GuardarNominaDialog({
  trabajadores,
  ingresosDisponibles,
  nominasExistentes,
  onGuardar,
  onCancel,
}: GuardarNominaDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [resetearTrabajadores, setResetearTrabajadores] = useState(true)
  const [crearSiguienteIngreso, setCrearSiguienteIngreso] = useState(true)

  // Usar siempre el ingreso más reciente (último mes configurado) como seleccionado
  const ingresoActual = useMemo(() => {
    // Ordenar por año y mes descendente para obtener el más reciente
    const sorted = [...ingresosDisponibles].sort((a, b) => {
      if (a.anio !== b.anio) return b.anio - a.anio
      return b.mes - a.mes
    })
    return sorted[0] || null
  }, [ingresosDisponibles])

  const [ingresoSeleccionado, setIngresoSeleccionado] = useState<IngresoMensual | null>(ingresoActual)

  // Calcular salario de un trabajador
  const calcularSalario = (trabajador: TrabajadorRRHH): number => {
    if (!trabajador.salario_fijo || !trabajador.dias_trabajables || !ingresoSeleccionado) return 0

    const montoTotal = ingresoSeleccionado.monto
    const diasTrabajados = trabajador.dias_trabajables - (trabajador.dias_no_trabajados?.length || 0)
    const salarioProporcional = (trabajador.salario_fijo / trabajador.dias_trabajables) * diasTrabajados

    // Estímulo fijo: 75% del total × porcentaje individual del trabajador
    const estimuloFijo = montoTotal * 0.75 * ((trabajador.porcentaje_fijo_estimulo || 0) / 100)

    // Estímulo variable: 25% del total × porcentaje individual del trabajador
    const estimuloVariable = trabajador.porcentaje_variable_estimulo > 0
      ? montoTotal * 0.25 * ((trabajador.porcentaje_variable_estimulo || 0) / 100)
      : 0

    const salarioTotal = salarioProporcional + estimuloFijo + estimuloVariable + (trabajador.alimentacion || 0)

    return salarioTotal
  }

  // Preparar datos para guardar
  const datos = useMemo((): CrearArchivoNominaRequest | null => {
    if (!ingresoSeleccionado) return null

    // Convertir trabajadores actuales a formato de archivo
    const trabajadoresArchivo: TrabajadorArchivoRH[] = trabajadores.map(t => {
      const salarioCalculado = calcularSalario(t)

      return {
        CI: t.CI,
        nombre: t.nombre,
        cargo: t.cargo || '',
        porcentaje_fijo_estimulo: Number(t.porcentaje_fijo_estimulo || 0),
        porcentaje_variable_estimulo: Number(t.porcentaje_variable_estimulo || 0),
        salario_fijo: Number(t.salario_fijo || 0),
        alimentacion: Number(t.alimentacion || 0),
        dias_trabajables: Number(t.dias_trabajables || 0),
        dias_no_trabajados: t.dias_no_trabajados || [],
        salario_calculado: Number(salarioCalculado)
      }
    })

    // Calcular totales
    const total_salario_fijo = Number(trabajadores.reduce((sum, t) => sum + (t.salario_fijo || 0), 0))
    const total_alimentacion = Number(trabajadores.reduce((sum, t) => sum + (t.alimentacion || 0), 0))
    const total_salario_calculado = Number(trabajadoresArchivo.reduce((sum, t) => sum + t.salario_calculado, 0))

    return {
      ingreso_mensual_id: ingresoSeleccionado.id,
      total_salario_fijo,
      total_alimentacion,
      total_salario_calculado,
      resetear_trabajadores: resetearTrabajadores,
      crear_siguiente_ingreso: crearSiguienteIngreso,
      trabajadores: trabajadoresArchivo
    }
  }, [ingresoSeleccionado, trabajadores, resetearTrabajadores, crearSiguienteIngreso])

  const handleGuardar = async () => {
    if (!datos) {
      console.error('❌ No hay datos para guardar')
      return
    }

    setIsSubmitting(true)
    try {
      console.log('📤 Datos de nómina a enviar:', JSON.stringify(datos, null, 2))
      await onGuardar(datos)
    } finally {
      setIsSubmitting(false)
    }
  }

  const tieneNomina = ingresoSeleccionado ? nominasExistentes.has(ingresoSeleccionado.id) : false
  const mesNombre = ingresoSeleccionado ? MESES[ingresoSeleccionado.mes - 1] : ''

  if (ingresosDisponibles.length === 0) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No hay ingresos mensuales disponibles. Cree un ingreso mensual primero antes de guardar una nómina.
          </AlertDescription>
        </Alert>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cerrar
          </Button>
        </DialogFooter>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Alerta informativa */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Se creará una copia permanente de la nómina para el período seleccionado.
          Una vez guardada, <strong>no podrá ser modificada ni eliminada</strong>.
        </AlertDescription>
      </Alert>

      {/* Información del período (no editable) */}
      <div className="space-y-3">
        <label className="text-sm font-semibold text-gray-900">
          Período Actual a Guardar
        </label>
        <div className="w-full px-4 py-3 rounded-lg border-2 border-purple-300 bg-purple-50">
          <p className="text-base font-bold text-purple-900">
            {ingresoSeleccionado
              ? `${MESES[ingresoSeleccionado.mes - 1]} ${ingresoSeleccionado.anio} - $${ingresoSeleccionado.monto.toLocaleString()} ${ingresoSeleccionado.moneda}`
              : 'No hay período disponible'}
          </p>
          <p className="text-xs text-purple-700 mt-1">
            Solo se puede guardar la nómina del período más reciente configurado
          </p>
        </div>
      </div>

      {/* Advertencia si ya tiene nómina */}
      {tieneNomina && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Este periodo ya tiene una nómina guardada.</strong> No se puede crear una nómina duplicada.
            Seleccione otro periodo.
          </AlertDescription>
        </Alert>
      )}

      {/* Información del período */}
      {datos && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
              <div className="flex items-center space-x-3">
                <Calendar className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-sm text-purple-600 font-medium">Período</p>
                  <p className="text-lg font-bold text-purple-900">
                    {mesNombre} {ingresoSeleccionado?.anio}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <div className="flex items-center space-x-3">
                <DollarSign className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-sm text-green-600 font-medium">Ingreso Mensual</p>
                  <p className="text-lg font-bold text-green-900">
                    ${ingresoSeleccionado?.monto.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-center space-x-3">
                <Users className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-sm text-blue-600 font-medium">Trabajadores</p>
                  <p className="text-lg font-bold text-blue-900">
                    {trabajadores.length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Resumen de totales */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Resumen de Totales</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-600">Total Salario Fijo</p>
                <p className="text-lg font-bold text-gray-900">
                  ${datos.total_salario_fijo.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Total Alimentación</p>
                <p className="text-lg font-bold text-gray-900">
                  ${datos.total_alimentacion.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Total Salario Calculado</p>
                <p className="text-lg font-bold text-purple-700">
                  ${datos.total_salario_calculado.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Opciones */}
      <div className="space-y-3">
        {/* Opción de reseteo */}
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="resetear"
              checked={resetearTrabajadores}
              onChange={(e) => setResetearTrabajadores(e.target.checked)}
              className="mt-1 h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
            />
            <div className="flex-1">
              <label htmlFor="resetear" className="text-sm font-semibold text-orange-900 cursor-pointer">
                Resetear datos para el siguiente mes
              </label>
              <p className="text-xs text-orange-800 mt-1">
                Todos los trabajadores tendrán sus <strong>días no trabajados</strong> y <strong>% estímulo variable</strong> restablecidos a 0 automáticamente.
              </p>
            </div>
            {resetearTrabajadores && <CheckCircle2 className="h-5 w-5 text-orange-600 flex-shrink-0" />}
          </div>
        </div>

        {/* Opción de crear siguiente ingreso */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="crearSiguiente"
              checked={crearSiguienteIngreso}
              onChange={(e) => setCrearSiguienteIngreso(e.target.checked)}
              className="mt-1 h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
            />
            <div className="flex-1">
              <label htmlFor="crearSiguiente" className="text-sm font-semibold text-blue-900 cursor-pointer">
                Crear automáticamente el siguiente ingreso mensual
              </label>
              <p className="text-xs text-blue-800 mt-1">
                Se creará automáticamente el ingreso del siguiente mes con <strong>monto 0</strong> listo para configurar.
              </p>
            </div>
            {crearSiguienteIngreso && <CheckCircle2 className="h-5 w-5 text-blue-600 flex-shrink-0" />}
          </div>
        </div>
      </div>

      {/* Validaciones */}
      {trabajadores.length === 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No hay trabajadores para guardar. Agregue al menos un trabajador antes de continuar.
          </AlertDescription>
        </Alert>
      )}

      {/* Footer con acciones */}
      <DialogFooter>
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
        <Button
          onClick={handleGuardar}
          disabled={isSubmitting || trabajadores.length === 0 || !ingresoSeleccionado || tieneNomina}
          className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Guardar Nómina
            </>
          )}
        </Button>
      </DialogFooter>
    </div>
  )
}
