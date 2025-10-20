import { useState, useEffect, useCallback } from 'react'
import { RecursosHumanosService, IngresoMensualService, TrabajadorService } from '@/lib/api-services'
import type {
  TrabajadorRRHH,
  IngresoMensual,
  ActualizarTrabajadorRRHHRequest,
  CrearTrabajadorRRHHRequest,
  CargosResumen
} from '@/lib/recursos-humanos-types'

export function useRecursosHumanos() {
  const [trabajadores, setTrabajadores] = useState<TrabajadorRRHH[]>([])
  const [ultimoIngreso, setUltimoIngreso] = useState<IngresoMensual | null>(null)
  const [cargos, setCargos] = useState<CargosResumen[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingCargos, setLoadingCargos] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Cargar datos iniciales
  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await RecursosHumanosService.getRecursosHumanos()
      setTrabajadores(data.trabajadores || [])
      setUltimoIngreso(data.ultimo_ingreso_mensual)
    } catch (err: any) {
      console.error('Error al cargar datos de recursos humanos:', err)
      setError(err.message || 'Error al cargar los datos')
    } finally {
      setLoading(false)
    }
  }, [])

  // Cargar datos al montar el componente
  useEffect(() => {
    loadData()
  }, [loadData])

  // Actualizar campo individual de un trabajador
  const actualizarCampoTrabajador = useCallback(async (
    ci: string,
    campo: keyof ActualizarTrabajadorRRHHRequest,
    valor: any
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const data: ActualizarTrabajadorRRHHRequest = { [campo]: valor }
      console.log(`Actualizando ${campo} del trabajador ${ci}:`, valor, 'tipo:', typeof valor)

      await RecursosHumanosService.actualizarTrabajadorRRHH(ci, data)

      // Actualizar estado local inmediatamente
      setTrabajadores(prev =>
        prev.map(t => t.CI === ci ? { ...t, [campo]: valor } : t)
      )

      return { success: true, message: 'Campo actualizado correctamente' }
    } catch (err: any) {
      console.error(`❌ Error al actualizar ${campo} del trabajador:`, err)

      // Mensaje de error más específico
      let errorMsg = 'Error al actualizar el campo'
      if (err.message?.includes('422') || err.message?.includes('validación')) {
        errorMsg = `Valor inválido para ${campo}. Verifica el formato del dato.`
      } else if (err.message?.includes('404') || err.message?.includes('no encontrado')) {
        errorMsg = 'No se detectaron cambios o el trabajador no existe.'
      }

      return { success: false, message: errorMsg }
    }
  }, [])

  // Actualizar días no trabajados de un trabajador
  const actualizarDiasNoTrabajados = useCallback(async (
    ci: string,
    dias: number[]
  ): Promise<{ success: boolean; message: string }> => {
    return actualizarCampoTrabajador(ci, 'dias_no_trabajados', dias)
  }, [actualizarCampoTrabajador])

  // Actualizar múltiples campos de un trabajador
  const actualizarTrabajador = useCallback(async (
    ci: string,
    data: ActualizarTrabajadorRRHHRequest
  ): Promise<{ success: boolean; message: string }> => {
    try {
      await RecursosHumanosService.actualizarTrabajadorRRHH(ci, data)

      // Actualizar estado local inmediatamente
      setTrabajadores(prev =>
        prev.map(t => t.CI === ci ? { ...t, ...data } : t)
      )

      return { success: true, message: 'Trabajador actualizado correctamente' }
    } catch (err: any) {
      console.error('Error al actualizar trabajador:', err)
      return { success: false, message: err.message || 'Error al actualizar el trabajador' }
    }
  }, [])

  // Crear o actualizar ingreso mensual
  const guardarIngresoMensual = useCallback(async (
    monto: number,
    mes: number,
    anio: number,
    moneda: 'CUP' | 'USD' | 'EUR' = 'CUP'
  ): Promise<{ success: boolean; message: string }> => {
    try {
      // Primero, obtener todos los ingresos para verificar si existe uno para este mes/año
      const todosIngresos = await IngresoMensualService.getAllIngresos()
      const ingresoExistente = todosIngresos.find(
        (ing: any) => ing.mes === mes && ing.anio === anio
      )

      if (ingresoExistente?.id) {
        // Actualizar ingreso existente para este mes/año
        await IngresoMensualService.updateIngreso(ingresoExistente.id, {
          monto,
          moneda
        })

        // Si es el más reciente, actualizar el estado local
        if (ultimoIngreso?.id === ingresoExistente.id) {
          setUltimoIngreso({ ...ingresoExistente, monto, moneda })
        } else {
          // Recargar el último ingreso
          const nuevoUltimo = await IngresoMensualService.getUltimoIngreso()
          setUltimoIngreso(nuevoUltimo)
        }

        return { success: true, message: 'Ingreso mensual actualizado correctamente' }
      } else {
        // Crear nuevo ingreso (no existe para este mes/año)
        await IngresoMensualService.createIngreso({
          mes,
          anio,
          monto,
          moneda
        })

        // Recargar el último ingreso
        const nuevoUltimo = await IngresoMensualService.getUltimoIngreso()
        setUltimoIngreso(nuevoUltimo)

        return { success: true, message: 'Ingreso mensual creado correctamente' }
      }
    } catch (err: any) {
      console.error('Error al guardar ingreso mensual:', err)
      return { success: false, message: err.message || 'Error al guardar el ingreso mensual' }
    }
  }, [ultimoIngreso])

  // Crear nuevo trabajador
  const crearTrabajador = useCallback(async (
    data: CrearTrabajadorRRHHRequest
  ): Promise<{ success: boolean; message: string; trabajador_id?: string }> => {
    try {
      console.log('Creando trabajador desde RRHH con datos:', data)

      // Primero crear el trabajador
      const trabajador_id = await TrabajadorService.crearTrabajador(
        data.ci,
        data.nombre,
        data.contrasena
      )

      console.log('Trabajador creado con ID:', trabajador_id)

      // Si se proporcionaron datos adicionales de RRHH, actualizarlos
      const rrhhData: ActualizarTrabajadorRRHHRequest = {}
      if (data.cargo) rrhhData.cargo = data.cargo
      if (data.salario_fijo !== undefined) rrhhData.salario_fijo = data.salario_fijo
      if (data.porcentaje_fijo_estimulo !== undefined) rrhhData.porcentaje_fijo_estimulo = data.porcentaje_fijo_estimulo
      if (data.porcentaje_variable_estimulo !== undefined) rrhhData.porcentaje_variable_estimulo = data.porcentaje_variable_estimulo
      if (data.alimentacion !== undefined) rrhhData.alimentacion = data.alimentacion
      if (data.dias_trabajables !== undefined) rrhhData.dias_trabajables = data.dias_trabajables

      if (Object.keys(rrhhData).length > 0) {
        console.log('Actualizando datos de RRHH:', rrhhData)
        await RecursosHumanosService.actualizarTrabajadorRRHH(data.ci, rrhhData)
      }

      // Recargar lista de trabajadores
      await loadData()

      return {
        success: true,
        message: 'Trabajador creado exitosamente',
        trabajador_id
      }
    } catch (err: any) {
      console.error('Error al crear trabajador:', err)
      return {
        success: false,
        message: err.message || 'Error al crear el trabajador'
      }
    }
  }, [loadData])

  // Eliminar trabajador
  const eliminarTrabajador = useCallback(async (
    ci: string
  ): Promise<{ success: boolean; message: string }> => {
    try {
      console.log('Eliminando trabajador con CI:', ci)
      const result = await TrabajadorService.eliminarTrabajador(ci)

      if (result) {
        // Actualizar estado local inmediatamente
        setTrabajadores(prev => prev.filter(t => t.CI !== ci))

        return {
          success: true,
          message: 'Trabajador eliminado exitosamente'
        }
      } else {
        return {
          success: false,
          message: 'No se pudo eliminar el trabajador'
        }
      }
    } catch (err: any) {
      console.error('Error al eliminar trabajador:', err)
      return {
        success: false,
        message: err.message || 'Error al eliminar el trabajador'
      }
    }
  }, [])

  // Cargar resumen de cargos
  const loadCargos = useCallback(async () => {
    setLoadingCargos(true)
    try {
      const data = await RecursosHumanosService.getCargosResumen()
      setCargos(data.cargos || [])
    } catch (err: any) {
      console.error('Error al cargar resumen de cargos:', err)
      // No establecer error global, solo loguear
    } finally {
      setLoadingCargos(false)
    }
  }, [])

  // Refrescar datos
  const refresh = useCallback(async () => {
    await loadData()
  }, [loadData])

  return {
    trabajadores,
    ultimoIngreso,
    cargos,
    loading,
    loadingCargos,
    error,
    actualizarCampoTrabajador,
    actualizarDiasNoTrabajados,
    actualizarTrabajador,
    guardarIngresoMensual,
    crearTrabajador,
    eliminarTrabajador,
    loadCargos,
    refresh
  }
}
