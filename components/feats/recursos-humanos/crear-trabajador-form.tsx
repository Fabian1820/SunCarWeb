"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, Plus } from "lucide-react"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { Checkbox } from "@/components/shared/molecule/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select"
import { DepartamentoForm } from "@/components/feats/departamentos/departamento-form"
import { SedeForm } from "@/components/feats/sedes/sede-form"
import { DepartamentoService, SedeService } from "@/lib/api-services"
import type {
  Departamento,
  Sede,
  DepartamentoUpsertRequest,
  SedeUpsertRequest,
} from "@/lib/api-types"
import type { CrearTrabajadorRRHHRequest } from "@/lib/recursos-humanos-types"
import { isValidObjectId } from "@/lib/utils/object-id"

interface CrearTrabajadorFormProps {
  onSubmit: (data: CrearTrabajadorRRHHRequest) => Promise<void>
  onCancel: () => void
  isSubmitting?: boolean
  sedes?: Sede[]
  departamentos?: Departamento[]
}

const NONE_OPTION = "__none__"

export function CrearTrabajadorForm({
  onSubmit,
  onCancel,
  isSubmitting = false,
  sedes,
  departamentos,
}: CrearTrabajadorFormProps) {
  const [formData, setFormData] = useState<CrearTrabajadorRRHHRequest>({
    ci: "",
    nombre: "",
    cargo: "Técnico",
    salario_fijo: 0,
    porcentaje_fijo_estimulo: 0,
    porcentaje_variable_estimulo: 0,
    alimentacion: 0,
    dias_trabajables: 24,
    is_brigadista: false,
    contrasena: undefined,
    sede_id: null,
    departamento_id: null,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [asignarContrasena, setAsignarContrasena] = useState(false)
  const [loadingCatalogos, setLoadingCatalogos] = useState(false)
  const [submittingCatalogo, setSubmittingCatalogo] = useState(false)
  const [localSedes, setLocalSedes] = useState<Sede[]>(sedes || [])
  const [localDepartamentos, setLocalDepartamentos] = useState<Departamento[]>(departamentos || [])
  const [isSedeRapidaOpen, setIsSedeRapidaOpen] = useState(false)
  const [isDepartamentoRapidoOpen, setIsDepartamentoRapidoOpen] = useState(false)

  useEffect(() => {
    if (Array.isArray(sedes)) {
      setLocalSedes(sedes)
    }
  }, [sedes])

  useEffect(() => {
    if (Array.isArray(departamentos)) {
      setLocalDepartamentos(departamentos)
    }
  }, [departamentos])

  useEffect(() => {
    const shouldLoad = localSedes.length === 0 || localDepartamentos.length === 0
    if (!shouldLoad) return

    const loadCatalogos = async () => {
      setLoadingCatalogos(true)
      try {
        const [sedesData, departamentosData] = await Promise.all([
          SedeService.getSedes(true),
          DepartamentoService.getDepartamentos(true),
        ])

        if (!sedes || sedes.length === 0) {
          setLocalSedes(sedesData)
        }

        if (!departamentos || departamentos.length === 0) {
          setLocalDepartamentos(departamentosData)
        }
      } catch (error) {
        console.error("Error cargando catálogos para trabajador:", error)
      } finally {
        setLoadingCatalogos(false)
      }
    }

    loadCatalogos()
  }, [departamentos, localDepartamentos.length, localSedes.length, sedes])

  const sedesDisponibles = useMemo(() => localSedes, [localSedes])
  const departamentosDisponibles = useMemo(() => localDepartamentos, [localDepartamentos])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.ci.trim()) {
      newErrors.ci = "El CI es obligatorio"
    } else if (!/^\d{11}$/.test(formData.ci.replace(/-/g, ""))) {
      newErrors.ci = "El CI debe tener 11 dígitos"
    }

    if (!formData.nombre.trim()) {
      newErrors.nombre = "El nombre es obligatorio"
    } else if (formData.nombre.trim().length < 3) {
      newErrors.nombre = "El nombre debe tener al menos 3 caracteres"
    }

    if (asignarContrasena) {
      if (!formData.contrasena || formData.contrasena.trim() === "") {
        newErrors.contrasena = "Debe ingresar una contraseña si desea asignarla"
      } else if (formData.contrasena.length < 4) {
        newErrors.contrasena = "La contraseña debe tener al menos 4 caracteres"
      }
    }

    if (formData.porcentaje_fijo_estimulo !== undefined) {
      if (formData.porcentaje_fijo_estimulo < 0 || formData.porcentaje_fijo_estimulo > 100) {
        newErrors.porcentaje_fijo_estimulo = "Debe estar entre 0 y 100"
      }
    }

    if (formData.porcentaje_variable_estimulo !== undefined) {
      if (formData.porcentaje_variable_estimulo < 0 || formData.porcentaje_variable_estimulo > 100) {
        newErrors.porcentaje_variable_estimulo = "Debe estar entre 0 y 100"
      }
    }

    if (formData.dias_trabajables !== undefined) {
      if (formData.dias_trabajables < 1 || formData.dias_trabajables > 31) {
        newErrors.dias_trabajables = "Debe estar entre 1 y 31"
      }
    }

    if (formData.sede_id && !isValidObjectId(formData.sede_id)) {
      newErrors.sede_id = "La sede seleccionada tiene un ID inválido"
    }

    if (formData.departamento_id && !isValidObjectId(formData.departamento_id)) {
      newErrors.departamento_id = "El departamento seleccionado tiene un ID inválido"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    const dataToSubmit: CrearTrabajadorRRHHRequest = {
      ...formData,
      contrasena: asignarContrasena ? formData.contrasena : undefined,
      sede_id: formData.sede_id || null,
      departamento_id: formData.departamento_id || null,
    }

    await onSubmit(dataToSubmit)
  }

  const handleCrearSedeRapida = async (payload: SedeUpsertRequest) => {
    setSubmittingCatalogo(true)
    try {
      const nuevaSede = await SedeService.createSede(payload)
      setLocalSedes((prev) => {
        const exists = prev.some((item) => item.id === nuevaSede.id)
        return exists ? prev : [...prev, nuevaSede]
      })
      setFormData((prev) => ({ ...prev, sede_id: nuevaSede.id }))
      setIsSedeRapidaOpen(false)
    } finally {
      setSubmittingCatalogo(false)
    }
  }

  const handleCrearDepartamentoRapido = async (payload: DepartamentoUpsertRequest) => {
    setSubmittingCatalogo(true)
    try {
      const nuevoDepartamento = await DepartamentoService.createDepartamento(payload)
      setLocalDepartamentos((prev) => {
        const exists = prev.some((item) => item.id === nuevoDepartamento.id)
        return exists ? prev : [...prev, nuevoDepartamento]
      })
      setFormData((prev) => ({ ...prev, departamento_id: nuevoDepartamento.id }))
      setIsDepartamentoRapidoOpen(false)
    } finally {
      setSubmittingCatalogo(false)
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">Información Básica</h3>

          <div>
            <Label htmlFor="ci">Cédula de Identidad *</Label>
            <Input
              id="ci"
              type="text"
              value={formData.ci}
              onChange={(e) => setFormData({ ...formData, ci: e.target.value })}
              placeholder="02091968281"
              maxLength={11}
              disabled={isSubmitting}
              className={errors.ci ? "border-red-500" : ""}
            />
            {errors.ci && <p className="text-red-600 text-sm mt-1">{errors.ci}</p>}
          </div>

          <div>
            <Label htmlFor="nombre">Nombre Completo *</Label>
            <Input
              id="nombre"
              type="text"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              placeholder="Juan Pérez García"
              disabled={isSubmitting}
              className={errors.nombre ? "border-red-500" : ""}
            />
            {errors.nombre && <p className="text-red-600 text-sm mt-1">{errors.nombre}</p>}
          </div>

          <div>
            <Label htmlFor="cargo">Cargo</Label>
            <Input
              id="cargo"
              type="text"
              value={formData.cargo}
              onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
              placeholder="Técnico"
              disabled={isSubmitting}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>Sede</Label>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={() => setIsSedeRapidaOpen(true)}
                  disabled={isSubmitting || submittingCatalogo}
                  aria-label="Crear sede rápida"
                  title="Crear sede rápida"
                  className="h-7 w-7"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
              <Select
                value={formData.sede_id || NONE_OPTION}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    sede_id: value === NONE_OPTION ? null : value,
                  }))
                }
                disabled={isSubmitting || loadingCatalogos}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin sede" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_OPTION}>Sin sede</SelectItem>
                  {sedesDisponibles.map((sede) => (
                    <SelectItem key={sede.id} value={sede.id}>
                      {sede.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {loadingCatalogos ? (
                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Cargando sedes...
                </p>
              ) : null}
              {errors.sede_id ? <p className="text-red-600 text-sm mt-1">{errors.sede_id}</p> : null}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>Departamento</Label>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={() => setIsDepartamentoRapidoOpen(true)}
                  disabled={isSubmitting || submittingCatalogo}
                  aria-label="Crear departamento rápido"
                  title="Crear departamento rápido"
                  className="h-7 w-7"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
              <Select
                value={formData.departamento_id || NONE_OPTION}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    departamento_id: value === NONE_OPTION ? null : value,
                  }))
                }
                disabled={isSubmitting || loadingCatalogos}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin departamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_OPTION}>Sin departamento</SelectItem>
                  {departamentosDisponibles.map((departamento) => (
                    <SelectItem key={departamento.id} value={departamento.id}>
                      {departamento.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {loadingCatalogos ? (
                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Cargando departamentos...
                </p>
              ) : null}
              {errors.departamento_id ? (
                <p className="text-red-600 text-sm mt-1">{errors.departamento_id}</p>
              ) : null}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_brigadista"
              checked={formData.is_brigadista || false}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, is_brigadista: checked as boolean })
              }
              disabled={isSubmitting}
            />
            <Label htmlFor="is_brigadista" className="font-normal cursor-pointer">
              Es brigadista (puede asignarse a brigadas)
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="asignar_contrasena"
              checked={asignarContrasena}
              onCheckedChange={(checked) => {
                setAsignarContrasena(checked as boolean)
                if (!checked) {
                  setFormData({ ...formData, contrasena: undefined })
                }
              }}
              disabled={isSubmitting}
            />
            <Label htmlFor="asignar_contrasena" className="font-normal cursor-pointer">
              Asignar contraseña (para jefe de brigada)
            </Label>
          </div>

          {asignarContrasena && (
            <div>
              <Label htmlFor="contrasena">Contraseña</Label>
              <Input
                id="contrasena"
                type="password"
                value={formData.contrasena || ""}
                onChange={(e) => setFormData({ ...formData, contrasena: e.target.value })}
                placeholder="Mínimo 4 caracteres"
                disabled={isSubmitting}
                className={errors.contrasena ? "border-red-500" : ""}
              />
              {errors.contrasena && <p className="text-red-600 text-sm mt-1">{errors.contrasena}</p>}
            </div>
          )}
        </div>

        <div className="space-y-3 p-4 bg-purple-50 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">Datos de Nómina</h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="salario_fijo">Salario Fijo (CUP)</Label>
              <Input
                id="salario_fijo"
                type="number"
                value={formData.salario_fijo}
                onChange={(e) => setFormData({ ...formData, salario_fijo: parseFloat(e.target.value) || 0 })}
                min={0}
                step={1000}
                disabled={isSubmitting}
              />
            </div>

            <div>
              <Label htmlFor="alimentacion">Alimentación (CUP)</Label>
              <Input
                id="alimentacion"
                type="number"
                value={formData.alimentacion}
                onChange={(e) => setFormData({ ...formData, alimentacion: parseFloat(e.target.value) || 0 })}
                min={0}
                step={100}
                disabled={isSubmitting}
              />
            </div>

            <div>
              <Label htmlFor="porcentaje_fijo_estimulo">% Estímulo Fijo (0-100)</Label>
              <Input
                id="porcentaje_fijo_estimulo"
                type="number"
                value={formData.porcentaje_fijo_estimulo}
                onChange={(e) => setFormData({ ...formData, porcentaje_fijo_estimulo: parseFloat(e.target.value) || 0 })}
                min={0}
                max={100}
                step={1}
                disabled={isSubmitting}
                className={errors.porcentaje_fijo_estimulo ? "border-red-500" : ""}
              />
              {errors.porcentaje_fijo_estimulo && <p className="text-red-600 text-sm mt-1">{errors.porcentaje_fijo_estimulo}</p>}
            </div>

            <div>
              <Label htmlFor="porcentaje_variable_estimulo">% Estímulo Variable (0-100)</Label>
              <Input
                id="porcentaje_variable_estimulo"
                type="number"
                value={formData.porcentaje_variable_estimulo}
                onChange={(e) => setFormData({ ...formData, porcentaje_variable_estimulo: parseFloat(e.target.value) || 0 })}
                min={0}
                max={100}
                step={1}
                disabled={isSubmitting}
                className={errors.porcentaje_variable_estimulo ? "border-red-500" : ""}
              />
              {errors.porcentaje_variable_estimulo && <p className="text-red-600 text-sm mt-1">{errors.porcentaje_variable_estimulo}</p>}
            </div>

            <div>
              <Label htmlFor="dias_trabajables">Días Trabajables (1-31)</Label>
              <Input
                id="dias_trabajables"
                type="number"
                value={formData.dias_trabajables}
                onChange={(e) => setFormData({ ...formData, dias_trabajables: parseInt(e.target.value) || 24 })}
                min={1}
                max={31}
                step={1}
                disabled={isSubmitting}
                className={errors.dias_trabajables ? "border-red-500" : ""}
              />
              {errors.dias_trabajables && <p className="text-red-600 text-sm mt-1">{errors.dias_trabajables}</p>}
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
          >
            {isSubmitting ? "Creando..." : "Crear Trabajador"}
          </Button>
        </div>
      </form>

      <Dialog open={isSedeRapidaOpen} onOpenChange={setIsSedeRapidaOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Crear sede rápida</DialogTitle>
          </DialogHeader>
          <SedeForm
            onSubmit={handleCrearSedeRapida}
            onCancel={() => setIsSedeRapidaOpen(false)}
            isSubmitting={submittingCatalogo}
            submitText="Crear y seleccionar"
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isDepartamentoRapidoOpen} onOpenChange={setIsDepartamentoRapidoOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Crear departamento rápido</DialogTitle>
          </DialogHeader>
          <DepartamentoForm
            onSubmit={handleCrearDepartamentoRapido}
            onCancel={() => setIsDepartamentoRapidoOpen(false)}
            isSubmitting={submittingCatalogo}
            submitText="Crear y seleccionar"
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
