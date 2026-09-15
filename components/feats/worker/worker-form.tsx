"use client";

import type React from "react";
import { useState } from "react";
import { Button } from "@/components/shared/atom/button";
import { Input } from "@/components/shared/molecule/input";
import { Label } from "@/components/shared/atom/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select";
import { SearchableSelect } from "@/components/shared/molecule/searchable-select";
import { Save, X } from "lucide-react";
import type { Brigade } from "@/lib/brigade-types";
import type { Trabajador } from "@/lib/api-types";

interface WorkerFormSubmitData {
  ci: string;
  name: string;
  mode: "trabajador" | "trabajador_asignar" | "jefe" | "jefe_brigada";
  brigadeId?: string;
  integrantes?: string[];
  // true = el CI ya existe en `trabajadores` (venía de RRHH sin ser instalador);
  // no se debe volver a crear el documento, solo actualizarlo.
  existente?: boolean;
}

interface WorkerFormProps {
  onSubmit: (worker: WorkerFormSubmitData) => void;
  onCancel: () => void;
  brigades: Brigade[];
  workers: Trabajador[];
}

export function WorkerForm({
  onSubmit,
  onCancel,
  brigades,
  workers,
}: WorkerFormProps) {
  const trabajadoresDisponibles = workers.filter((w) => w.is_brigadista !== true);

  const [formData, setFormData] = useState({
    origen: (trabajadoresDisponibles.length > 0 ? "existente" : "nuevo") as
      | "existente"
      | "nuevo",
    workerId: "",
    name: "",
    ci: "",
    brigadeId: "",
    esJefe: false,
    integrantes: [] as string[],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const seleccionarTrabajadorExistente = (worker: Trabajador) => {
    setFormData({
      ...formData,
      workerId: worker.id || worker.CI,
      ci: worker.CI,
      name: worker.nombre,
    });
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (formData.origen === "existente" && !formData.workerId) {
      newErrors.workerId = "Seleccione un trabajador";
    }

    if (!formData.name.trim()) {
      newErrors.name = "El nombre es requerido";
    }

    if (!formData.ci.trim()) {
      newErrors.ci = "El CI es requerido";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    const existente = formData.origen === "existente";

    if (!formData.esJefe) {
      // Trabajador normal
      if (formData.brigadeId) {
        onSubmit({
          ci: formData.ci,
          name: formData.name,
          brigadeId: formData.brigadeId,
          mode: "trabajador_asignar",
          existente,
        });
      } else {
        onSubmit({
          ci: formData.ci,
          name: formData.name,
          mode: "trabajador",
          existente,
        });
      }
    } else {
      // Jefe (sin contraseña: es_jefe_brigada + brigada_id se asignan en el backend)
      if (formData.integrantes.length > 0) {
        onSubmit({
          ci: formData.ci,
          name: formData.name,
          integrantes: formData.integrantes,
          mode: "jefe_brigada",
          existente,
        });
      } else {
        onSubmit({
          ci: formData.ci,
          name: formData.name,
          mode: "jefe",
          existente,
        });
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-3">
        <div>
          <Label className="text-sm font-medium text-gray-700 mb-2 block">
            Trabajador
          </Label>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <button
              type="button"
              onClick={() =>
                setFormData({
                  ...formData,
                  origen: "existente",
                  ci: "",
                  name: "",
                  workerId: "",
                })
              }
              className={`p-2 rounded-lg border text-sm font-medium ${
                formData.origen === "existente"
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              Trabajador existente
            </button>
            <button
              type="button"
              onClick={() =>
                setFormData({
                  ...formData,
                  origen: "nuevo",
                  ci: "",
                  name: "",
                  workerId: "",
                })
              }
              className={`p-2 rounded-lg border text-sm font-medium ${
                formData.origen === "nuevo"
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              Persona nueva
            </button>
          </div>

          {formData.origen === "existente" ? (
            <>
              {trabajadoresDisponibles.length === 0 ? (
                <div className="px-2 py-4 text-sm text-gray-500 text-center border rounded-md">
                  No hay trabajadores sin asignar. Use "Persona nueva".
                </div>
              ) : (
                <SearchableSelect
                  value={formData.workerId}
                  onValueChange={(value) => {
                    const worker = trabajadoresDisponibles.find(
                      (w) => (w.id || w.CI) === value,
                    );
                    if (worker) seleccionarTrabajadorExistente(worker);
                  }}
                  options={trabajadoresDisponibles.map((w) => ({
                    value: w.id || w.CI,
                    label: `${w.nombre} (CI: ${w.CI})`,
                  }))}
                  placeholder="Seleccione un trabajador"
                  searchPlaceholder="Buscar por nombre o CI..."
                  disablePortal
                  className={errors.workerId ? "border-red-300" : ""}
                />
              )}
              {errors.workerId && (
                <p className="text-red-600 text-sm mt-1">{errors.workerId}</p>
              )}
            </>
          ) : (
            <div className="space-y-3">
              <div>
                <Label
                  htmlFor="worker-name"
                  className="text-sm font-medium text-gray-700 mb-2 block"
                >
                  Nombre Completo *
                </Label>
                <Input
                  id="worker-name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Ej: Juan Pérez García"
                  className={errors.name ? "border-red-300" : ""}
                />
                {errors.name && (
                  <p className="text-red-600 text-sm mt-1">{errors.name}</p>
                )}
              </div>
              <div>
                <Label
                  htmlFor="worker-ci"
                  className="text-sm font-medium text-gray-700 mb-2 block"
                >
                  Carnet de Identidad (CI) *
                </Label>
                <Input
                  id="worker-ci"
                  value={formData.ci}
                  onChange={(e) =>
                    setFormData({ ...formData, ci: e.target.value })
                  }
                  placeholder="Ej: 12345678"
                  className={errors.ci ? "border-red-300" : ""}
                />
                {errors.ci && (
                  <p className="text-red-600 text-sm mt-1">{errors.ci}</p>
                )}
              </div>
            </div>
          )}
        </div>
        <div>
          <Label className="text-sm font-medium text-gray-700 mb-2 block">
            Rol del Instalador
          </Label>
          <div className="space-y-2">
            <div className="flex items-center space-x-3 p-2 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="radio"
                id="role-worker"
                name="role"
                checked={!formData.esJefe}
                onChange={() =>
                  setFormData({ ...formData, esJefe: false, integrantes: [] })
                }
              />
              <label htmlFor="role-worker" className="flex-1 cursor-pointer">
                <span className="font-medium text-gray-900 text-sm">
                  Instalador Regular
                </span>
                <span className="text-xs text-gray-500 ml-2">
                  Sin permisos de jefe
                </span>
              </label>
            </div>
            <div className="flex items-center space-x-3 p-2 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="radio"
                id="role-leader"
                name="role"
                checked={formData.esJefe}
                onChange={() =>
                  setFormData({ ...formData, esJefe: true, brigadeId: "" })
                }
              />
              <label htmlFor="role-leader" className="flex-1 cursor-pointer">
                <span className="font-medium text-gray-900 text-sm">
                  Jefe de Brigada
                </span>
                <span className="text-xs text-gray-500 ml-2">
                  Lidera su propia brigada
                </span>
              </label>
            </div>
          </div>
        </div>
        {!formData.esJefe && (
          <div>
            <Label
              htmlFor="brigade-select"
              className="text-sm font-medium text-gray-700 mb-2 block"
            >
              Asignar a Brigada (opcional)
            </Label>
            <Select
              value={formData.brigadeId}
              onValueChange={(value) =>
                setFormData({ ...formData, brigadeId: value })
              }
            >
              <SelectTrigger
                className={errors.brigadeId ? "border-red-300" : ""}
              >
                <SelectValue placeholder="Sin asignar a brigada" />
              </SelectTrigger>
              <SelectContent>
                {brigades.map((brigade) => (
                  <SelectItem
                    key={brigade.id || brigade.leader.ci}
                    value={brigade.id || brigade.leader.ci}
                  >
                    Jefe: {brigade.leader.name} (CI: {brigade.leader.ci})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {formData.esJefe && (
          <div>
            <Label
              htmlFor="integrantes-select"
              className="text-sm font-medium text-gray-700 mb-2 block"
            >
              Integrantes de la brigada (opcional)
            </Label>
            <div className="border rounded p-3 max-h-48 overflow-y-auto">
              {workers.filter(
                (w) => !w.es_jefe_brigada && w.is_brigadista === true,
              ).length > 0 ? (
                <div className="grid grid-cols-1 gap-2">
                  {workers
                    .filter(
                      (w) => !w.es_jefe_brigada && w.is_brigadista === true,
                    )
                    .map((w) => (
                      <label
                        key={w.id || w.CI}
                        className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                      >
                        <input
                          type="checkbox"
                          checked={formData.integrantes.includes(w.CI)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                integrantes: [...formData.integrantes, w.CI],
                              });
                            } else {
                              setFormData({
                                ...formData,
                                integrantes: formData.integrantes.filter(
                                  (ci) => ci !== w.CI,
                                ),
                              });
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm">
                          <span className="font-medium">{w.nombre}</span>
                          <span className="text-gray-500 ml-1">({w.CI})</span>
                        </span>
                      </label>
                    ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm text-center py-4">
                  No hay instaladores disponibles para asignar
                </p>
              )}
            </div>
            {formData.integrantes.length > 0 && (
              <p className="text-xs text-gray-600 mt-1">
                Seleccionados: {formData.integrantes.length} instalador
                {formData.integrantes.length !== 1 ? "es" : ""}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="mr-2 h-4 w-4" />
          Cancelar
        </Button>
        <Button
          type="submit"
          className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
        >
          <Save className="mr-2 h-4 w-4" />
          {formData.origen === "existente" ? "Asignar como Instalador" : "Crear Instalador"}
        </Button>
      </div>
    </form>
  );
}
