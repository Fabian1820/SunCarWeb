"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
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
import { Loader2, UserRoundPlus } from "lucide-react";
import { apiRequest } from "@/lib/api-config";
import type {
  ClienteVenta,
  ClienteVentaCreateData,
  ClienteVentaUpdateData,
} from "@/lib/api-types";

interface Provincia {
  codigo: string;
  nombre: string;
}

interface Municipio {
  codigo: string;
  nombre: string;
}

interface UpsertClienteVentaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (
    data: ClienteVentaCreateData | ClienteVentaUpdateData,
  ) => Promise<void>;
  cliente?: ClienteVenta | null;
  isLoading?: boolean;
}

export function UpsertClienteVentaDialog({
  open,
  onOpenChange,
  onSubmit,
  cliente,
  isLoading = false,
}: UpsertClienteVentaDialogProps) {
  const [nombre, setNombre] = useState("");
  const [direccion, setDireccion] = useState("");
  const [telefono, setTelefono] = useState("");
  const [ci, setCi] = useState("");
  const [provincia, setProvincia] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [comercial, setComercial] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // Error devuelto por el backend. Se muestra pegado al campo CI cuando se
  // trata de una CI ya registrada, que es el caso que generaba clientes
  // duplicados.
  const [submitError, setSubmitError] = useState("");

  const [provincias, setProvincias] = useState<Provincia[]>([]);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [loadingProvincias, setLoadingProvincias] = useState(false);
  const [loadingMunicipios, setLoadingMunicipios] = useState(false);
  const [selectedProvinciaCodigo, setSelectedProvinciaCodigo] = useState("");

  const [comerciales, setComerciales] = useState<{ CI: string; nombre: string }[]>([]);
  const [loadingComerciales, setLoadingComerciales] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNombre(cliente?.nombre || "");
    setDireccion(cliente?.direccion || "");
    setTelefono(cliente?.telefono || "");
    setCi(cliente?.ci || "");
    setProvincia(cliente?.provincia || "");
    setMunicipio(cliente?.municipio || "");
    setComercial(cliente?.comercial || "");
    setSelectedProvinciaCodigo("");
    setSubmitError("");
  }, [open, cliente]);

  // Cargar provincias al abrir el dialog
  useEffect(() => {
    if (!open) return;
    setLoadingProvincias(true);
    apiRequest<{ success: boolean; data: Provincia[] }>("/provincias/")
      .then((res) => {
        if (res.success && res.data) setProvincias(res.data);
      })
      .catch(() => {})
      .finally(() => setLoadingProvincias(false));
  }, [open]);

  // Cargar trabajadores con cargo Comercial Ventas
  useEffect(() => {
    if (!open) return;
    setLoadingComerciales(true);
    apiRequest<{ data: { CI: string; nombre: string; cargo?: string }[] }>("/trabajadores/")
      .then((res) => {
        const lista = (res.data || []).filter(
          (t) => t.cargo === "Comercial Ventas",
        );
        setComerciales(lista);
      })
      .catch(() => setComerciales([]))
      .finally(() => setLoadingComerciales(false));
  }, [open]);

  // Cuando se carga la lista de provincias y hay una provincia guardada, buscar su código
  useEffect(() => {
    if (!provincia || provincias.length === 0) return;
    const found = provincias.find((p) => p.nombre === provincia);
    if (found) setSelectedProvinciaCodigo(found.codigo);
  }, [provincias, provincia]);

  // Cargar municipios cuando cambia el código de provincia
  useEffect(() => {
    if (!selectedProvinciaCodigo) {
      setMunicipios([]);
      return;
    }
    setLoadingMunicipios(true);
    apiRequest<{ success: boolean; data: Municipio[] }>(
      `/provincias/provincia/${selectedProvinciaCodigo}/municipios`,
    )
      .then((res) => {
        if (res.success && res.data) setMunicipios(res.data);
      })
      .catch(() => setMunicipios([]))
      .finally(() => setLoadingMunicipios(false));
  }, [selectedProvinciaCodigo]);

  const handleProvinciaChange = (nombre: string) => {
    const found = provincias.find((p) => p.nombre === nombre);
    setProvincia(nombre);
    setMunicipio("");
    setSelectedProvinciaCodigo(found?.codigo || "");
  };

  const isEdit = Boolean(cliente?.id);

  const canSubmit = useMemo(() => {
    if (!nombre.trim()) return false;
    if (isLoading || submitting) return false;
    return true;
  }, [nombre, isLoading, submitting]);

  const handleSubmit = async () => {
    if (!canSubmit) return;

    const payload = {
      nombre: nombre.trim(),
      direccion: direccion.trim() || undefined,
      telefono: telefono.trim() || undefined,
      ci: ci.trim() || undefined,
      provincia: provincia.trim() || undefined,
      municipio: municipio.trim() || undefined,
      comercial: comercial && comercial !== "sin-asignar" ? comercial.trim() : null,
    };

    console.log("🧾 [UpsertClienteVenta] payload a enviar:", JSON.stringify(payload, null, 2));
    setSubmitting(true);
    setSubmitError("");
    try {
      await onSubmit(payload);
      onOpenChange(false);
    } catch (error) {
      // El padre tambien muestra un toast, pero el mensaje del backend
      // (p. ej. "La CI ya esta registrada en el cliente CV-...") se queda aqui
      // para que quede junto al campo que hay que corregir.
      setSubmitError(
        error instanceof Error ? error.message : "No se pudo guardar el cliente",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const errorEsDeCi = /\bci\b/i.test(submitError);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserRoundPlus className="h-5 w-5 text-teal-600" />
            {isEdit ? "Editar cliente venta" : "Nuevo cliente venta"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="cliente-venta-nombre">
              Nombre <span className="text-red-500">*</span>
            </Label>
            <Input
              id="cliente-venta-nombre"
              value={nombre}
              onChange={(event) => setNombre(event.target.value)}
              placeholder="Nombre del cliente"
              maxLength={120}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cliente-venta-direccion">Direccion</Label>
            <Input
              id="cliente-venta-direccion"
              value={direccion}
              onChange={(event) => setDireccion(event.target.value)}
              placeholder="Direccion del cliente"
              maxLength={200}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cliente-venta-provincia">Provincia</Label>
              <Select
                value={provincia}
                onValueChange={handleProvinciaChange}
                disabled={loadingProvincias}
              >
                <SelectTrigger id="cliente-venta-provincia">
                  <SelectValue
                    placeholder={
                      loadingProvincias ? "Cargando..." : "Seleccionar provincia"
                    }
                  />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] overflow-y-auto">
                  {provincias.map((p, i) => (
                    <SelectItem key={`prov-${p.codigo}-${i}`} value={p.nombre}>
                      {p.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cliente-venta-municipio">Municipio</Label>
              <Select
                value={municipio}
                onValueChange={setMunicipio}
                disabled={!selectedProvinciaCodigo || loadingMunicipios}
              >
                <SelectTrigger id="cliente-venta-municipio">
                  <SelectValue
                    placeholder={
                      !selectedProvinciaCodigo
                        ? "Seleccione una provincia primero"
                        : loadingMunicipios
                          ? "Cargando..."
                          : "Seleccionar municipio"
                    }
                  />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] overflow-y-auto">
                  {municipios.map((m, i) => (
                    <SelectItem key={`mun-${m.codigo}-${i}`} value={m.nombre}>
                      {m.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cliente-venta-telefono">Telefono</Label>
              <Input
                id="cliente-venta-telefono"
                value={telefono}
                onChange={(event) => setTelefono(event.target.value)}
                placeholder="Ej: 5551234"
                maxLength={40}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cliente-venta-ci">CI</Label>
              <Input
                id="cliente-venta-ci"
                value={ci}
                onChange={(event) => {
                  setCi(event.target.value);
                  if (errorEsDeCi) setSubmitError("");
                }}
                placeholder="Carnet de identidad"
                maxLength={40}
                aria-invalid={errorEsDeCi || undefined}
                className={
                  errorEsDeCi
                    ? "border-red-500 focus-visible:ring-red-500"
                    : undefined
                }
              />
            </div>
          </div>

          {submitError ? (
            <p
              role="alert"
              className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2"
            >
              {submitError}
            </p>
          ) : null}

          {/* Comercial */}
          <div className="space-y-2">
            <Label htmlFor="cliente-venta-comercial">Comercial</Label>
            <Select
              value={comercial}
              onValueChange={setComercial}
              disabled={loadingComerciales}
            >
              <SelectTrigger id="cliente-venta-comercial">
                <SelectValue
                  placeholder={
                    loadingComerciales ? "Cargando..." : "Seleccionar comercial"
                  }
                />
              </SelectTrigger>
              <SelectContent className="max-h-[300px] overflow-y-auto">
                <SelectItem value="sin-asignar">SunCar (predeterminado)</SelectItem>
                {comerciales.map((c) => (
                  <SelectItem key={c.CI} value={c.nombre}>
                    {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t mt-6">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : isEdit ? (
                "Guardar cambios"
              ) : (
                "Crear cliente"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
