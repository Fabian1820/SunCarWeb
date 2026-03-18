"use client";

import type React from "react";
import { useEffect, useState } from "react";
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
import { Save, X, Eye, EyeOff, Loader2 } from "lucide-react";
import type { Brigade } from "@/lib/brigade-types";
import { DepartamentoService, SedeService } from "@/lib/api-services";
import type { Departamento, Sede, Trabajador } from "@/lib/api-types";
import { isValidObjectId } from "@/lib/utils/object-id";

interface WorkerFormSubmitData {
  ci: string;
  name: string;
  mode: "trabajador" | "trabajador_asignar" | "jefe" | "jefe_brigada";
  brigadeId?: string;
  password?: string;
  integrantes?: string[];
  sede_id?: string | null;
  departamento_id?: string | null;
}

interface WorkerFormProps {
  onSubmit: (worker: WorkerFormSubmitData) => void;
  onCancel: () => void;
  brigades: Brigade[];
  workers: Trabajador[];
}

const NONE_OPTION = "__none__";

export function WorkerForm({
  onSubmit,
  onCancel,
  brigades,
  workers,
}: WorkerFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    ci: "",
    brigadeId: "",
    sedeId: "",
    departamentoId: "",
    password: "",
    integrantes: [] as string[],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [loadingCatalogos, setLoadingCatalogos] = useState(false);

  useEffect(() => {
    const loadCatalogos = async () => {
      setLoadingCatalogos(true);
      try {
        const [sedesData, departamentosData] = await Promise.all([
          SedeService.getSedes(true),
          DepartamentoService.getDepartamentos(true),
        ]);
        setSedes(sedesData);
        setDepartamentos(departamentosData);
      } catch (error) {
        console.error("Error loading sede/departamento catalogs:", error);
      } finally {
        setLoadingCatalogos(false);
      }
    };

    loadCatalogos();
  }, []);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "El nombre es requerido";
    }

    if (!formData.ci.trim()) {
      newErrors.ci = "El CI es requerido";
    }

    if (formData.sedeId && !isValidObjectId(formData.sedeId)) {
      newErrors.sedeId = "La sede seleccionada es inválida";
    }

    if (formData.departamentoId && !isValidObjectId(formData.departamentoId)) {
      newErrors.departamentoId = "El departamento seleccionado es inválido";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    if (!formData.password) {
      // Trabajador normal
      if (formData.brigadeId) {
        onSubmit({
          ci: formData.ci,
          name: formData.name,
          brigadeId: formData.brigadeId,
          sede_id: formData.sedeId || null,
          departamento_id: formData.departamentoId || null,
          mode: "trabajador_asignar",
        });
      } else {
        onSubmit({
          ci: formData.ci,
          name: formData.name,
          sede_id: formData.sedeId || null,
          departamento_id: formData.departamentoId || null,
          mode: "trabajador",
        });
      }
    } else {
      // Jefe
      if (formData.integrantes.length > 0) {
        onSubmit({
          ci: formData.ci,
          name: formData.name,
          password: formData.password,
          integrantes: formData.integrantes,
          sede_id: formData.sedeId || null,
          departamento_id: formData.departamentoId || null,
          mode: "jefe_brigada",
        });
      } else {
        onSubmit({
          ci: formData.ci,
          name: formData.name,
          password: formData.password,
          sede_id: formData.sedeId || null,
          departamento_id: formData.departamentoId || null,
          mode: "jefe",
        });
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
            onChange={(e) => setFormData({ ...formData, ci: e.target.value })}
            placeholder="Ej: 12345678"
            className={errors.ci ? "border-red-300" : ""}
          />
          {errors.ci && (
            <p className="text-red-600 text-sm mt-1">{errors.ci}</p>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">
              Sede
            </Label>
            <Select
              value={formData.sedeId || NONE_OPTION}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  sedeId: value === NONE_OPTION ? "" : value,
                })
              }
            >
              <SelectTrigger className={errors.sedeId ? "border-red-300" : ""}>
                <SelectValue placeholder="Sin sede" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_OPTION}>Sin sede</SelectItem>
                {sedes.map((sede) => (
                  <SelectItem key={sede.id} value={sede.id}>
                    {sede.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {loadingCatalogos && (
              <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Cargando sedes...
              </p>
            )}
            {errors.sedeId && (
              <p className="text-red-600 text-sm mt-1">{errors.sedeId}</p>
            )}
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">
              Departamento
            </Label>
            <Select
              value={formData.departamentoId || NONE_OPTION}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  departamentoId: value === NONE_OPTION ? "" : value,
                })
              }
            >
              <SelectTrigger className={errors.departamentoId ? "border-red-300" : ""}>
                <SelectValue placeholder="Sin departamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_OPTION}>Sin departamento</SelectItem>
                {departamentos.map((departamento) => (
                  <SelectItem key={departamento.id} value={departamento.id}>
                    {departamento.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {loadingCatalogos && (
              <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Cargando departamentos...
              </p>
            )}
            {errors.departamentoId && (
              <p className="text-red-600 text-sm mt-1">{errors.departamentoId}</p>
            )}
          </div>
        </div>
        <div>
          <Label
            htmlFor="worker-password"
            className="text-sm font-medium text-gray-700 mb-2 block"
          >
            Rol del Instalador
          </Label>
          <div className="space-y-2">
            <div className="flex items-center space-x-3 p-2 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="radio"
                id="role-worker"
                name="role"
                checked={!formData.password}
                onChange={() =>
                  setFormData({ ...formData, password: "", integrantes: [] })
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
                checked={!!formData.password}
                onChange={() =>
                  setFormData({ ...formData, password: " ", brigadeId: "" })
                }
              />
              <label htmlFor="role-leader" className="flex-1 cursor-pointer">
                <span className="font-medium text-gray-900 text-sm">
                  Jefe de Brigada
                </span>
                <span className="text-xs text-gray-500 ml-2">
                  Con contraseña y brigada
                </span>
              </label>
            </div>
          </div>
        </div>
        {formData.password && (
          <div>
            <Label
              htmlFor="worker-password-input"
              className="text-sm font-medium text-gray-700 mb-2 block"
            >
              Contraseña para Jefe de Brigada *
            </Label>
            <div className="relative">
              <Input
                id="worker-password-input"
                type={showPassword ? "text" : "password"}
                value={formData.password.trim()}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                placeholder="Ingrese contraseña"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400" />
                )}
              </button>
            </div>
          </div>
        )}
        {!formData.password && (
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
        {formData.password && (
          <div>
            <Label
              htmlFor="integrantes-select"
              className="text-sm font-medium text-gray-700 mb-2 block"
            >
              Integrantes de la brigada (opcional)
            </Label>
            <div className="border rounded p-3 max-h-48 overflow-y-auto">
              {workers.filter(
                (w) => !w.tiene_contraseña && w.is_brigadista === true,
              ).length > 0 ? (
                <div className="grid grid-cols-1 gap-2">
                  {workers
                    .filter(
                      (w) => !w.tiene_contraseña && w.is_brigadista === true,
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
          Crear Instalador
        </Button>
      </div>
    </form>
  );
}
