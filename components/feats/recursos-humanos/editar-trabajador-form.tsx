"use client"

import { useState } from "react"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select"
import { CalendarDiasSelector } from "./calendar-dias-selector"
import type { TrabajadorRRHH, ActualizarTrabajadorRRHHRequest } from "@/lib/recursos-humanos-types"
import type { Sede, Departamento } from "@/lib/api-types"

interface EditarTrabajadorFormProps {
  trabajador: TrabajadorRRHH
  sedes: Sede[]
  departamentos: Departamento[]
  mes: number
  anio: number
  onSave: (ci: string, data: ActualizarTrabajadorRRHHRequest) => Promise<{ success: boolean; message: string }>
  onCancel: () => void
  isSubmitting?: boolean
}

const NONE = "__none__"

export function EditarTrabajadorForm({
  trabajador,
  sedes,
  departamentos,
  mes,
  anio,
  onSave,
  onCancel,
  isSubmitting = false,
}: EditarTrabajadorFormProps) {
  const [form, setForm] = useState<ActualizarTrabajadorRRHHRequest>({
    cargo: trabajador.cargo,
    telefono: trabajador.telefono ?? "",
    sede_id: trabajador.sede_id ?? null,
    departamento_id: trabajador.departamento_id ?? null,
    salario_fijo: trabajador.salario_fijo,
    porcentaje_fijo_estimulo: trabajador.porcentaje_fijo_estimulo,
    porcentaje_variable_estimulo: trabajador.porcentaje_variable_estimulo,
    alimentacion: trabajador.alimentacion,
    dias_trabajables: trabajador.dias_trabajables,
    dias_no_trabajados: trabajador.dias_no_trabajados ?? [],
  })

  const num = (v: string, fallback = 0) => {
    const n = parseFloat(v)
    return isNaN(n) ? fallback : n
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSave(trabajador.CI, form)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Info de referencia */}
      <div className="bg-purple-50 rounded-lg px-4 py-2 flex items-center gap-4">
        <div>
          <p className="text-xs text-gray-500">Trabajador</p>
          <p className="font-semibold text-gray-900">{trabajador.nombre}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">CI</p>
          <p className="font-mono text-gray-700">{trabajador.CI}</p>
        </div>
      </div>

      {/* Datos básicos */}
      <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold text-gray-900 text-sm">Información Básica</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="edit-cargo">Cargo</Label>
            <Input
              id="edit-cargo"
              value={form.cargo ?? ""}
              onChange={(e) => setForm({ ...form, cargo: e.target.value })}
              placeholder="Técnico"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <Label htmlFor="edit-telefono">Teléfono</Label>
            <Input
              id="edit-telefono"
              value={form.telefono ?? ""}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })}
              placeholder="53412345"
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label>Sede</Label>
            <Select
              value={form.sede_id ?? NONE}
              onValueChange={(v) => setForm({ ...form, sede_id: v === NONE ? null : v })}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sin sede" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Sin sede</SelectItem>
                {sedes.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Departamento</Label>
            <Select
              value={form.departamento_id ?? NONE}
              onValueChange={(v) => setForm({ ...form, departamento_id: v === NONE ? null : v })}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sin departamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Sin departamento</SelectItem>
                {departamentos.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Datos de nómina */}
      <div className="space-y-3 p-4 bg-purple-50 rounded-lg">
        <h3 className="font-semibold text-gray-900 text-sm">Datos de Nómina</h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div>
            <Label htmlFor="edit-salario">Salario Fijo (CUP)</Label>
            <Input
              id="edit-salario"
              type="number"
              min={0}
              step={1000}
              value={form.salario_fijo ?? 0}
              onChange={(e) => setForm({ ...form, salario_fijo: num(e.target.value) })}
              disabled={isSubmitting}
            />
          </div>

          <div>
            <Label htmlFor="edit-alimentacion">Alimentación (CUP)</Label>
            <Input
              id="edit-alimentacion"
              type="number"
              min={0}
              step={100}
              value={form.alimentacion ?? 0}
              onChange={(e) => setForm({ ...form, alimentacion: num(e.target.value) })}
              disabled={isSubmitting}
            />
          </div>

          <div>
            <Label htmlFor="edit-dias-t">Días Trabajables</Label>
            <Input
              id="edit-dias-t"
              type="number"
              min={1}
              max={31}
              step={1}
              value={form.dias_trabajables ?? 24}
              onChange={(e) => setForm({ ...form, dias_trabajables: num(e.target.value, 24) })}
              disabled={isSubmitting}
            />
          </div>

          <div>
            <Label htmlFor="edit-pct-fijo">% Estímulo Fijo (0-100)</Label>
            <Input
              id="edit-pct-fijo"
              type="number"
              min={0}
              max={100}
              step={1}
              value={form.porcentaje_fijo_estimulo ?? 0}
              onChange={(e) => setForm({ ...form, porcentaje_fijo_estimulo: num(e.target.value) })}
              disabled={isSubmitting}
            />
          </div>

          <div>
            <Label htmlFor="edit-pct-var">% Estímulo Variable (0-100)</Label>
            <Input
              id="edit-pct-var"
              type="number"
              min={0}
              max={100}
              step={1}
              value={form.porcentaje_variable_estimulo ?? 0}
              onChange={(e) => setForm({ ...form, porcentaje_variable_estimulo: num(e.target.value) })}
              disabled={isSubmitting}
            />
          </div>
        </div>
      </div>

      {/* Días no trabajados */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold text-gray-900 text-sm mb-3">
          Días No Trabajados — {form.dias_no_trabajados?.length ?? 0} día(s)
        </h3>
        <CalendarDiasSelector
          diasSeleccionados={form.dias_no_trabajados ?? []}
          mes={mes}
          anio={anio}
          onDiasChange={(dias) => setForm({ ...form, dias_no_trabajados: dias })}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
        >
          {isSubmitting ? "Guardando..." : "Guardar cambios"}
        </Button>
      </div>
    </form>
  )
}
