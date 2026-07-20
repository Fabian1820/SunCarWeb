"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/shared/atom/button";
import { Input } from "@/components/shared/molecule/input";
import { Label } from "@/components/shared/atom/label";
import { Checkbox } from "@/components/shared/molecule/checkbox";
import { Textarea } from "@/components/shared/molecule/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select";
import { PrioritySelect } from "@/components/shared/molecule/priority-select";
import { FaltaInstalacionSelect } from "@/components/shared/molecule/falta-instalacion-select";
import { FuenteSelector } from "@/components/feats/leads/fuente-selector";
import { Loader2, MapPin } from "lucide-react";
import { FechaInstalacionDialog } from "@/components/shared/molecule/fecha-instalacion-dialog";
import { compareStrings } from "@/lib/utils/string-utils";
import type { Cliente, ClienteUpdateData } from "@/lib/api-types";
import { useAuth } from "@/contexts/auth-context";
import { API_BASE_URL, apiRequest } from "@/lib/api-config";
import MapPicker from "@/components/shared/organism/MapPickerNoSSR";

interface Provincia {
  codigo: string;
  nombre: string;
}

interface Municipio {
  codigo: string;
  nombre: string;
}

interface EditClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Cliente;
  onSubmit: (data: ClienteUpdateData) => Promise<void>;
  isLoading?: boolean;
}

interface PhoneCountryResponse {
  success: boolean;
  message: string;
  data: {
    phone_number: string;
    formatted_number: string;
    e164_format: string;
    country_code: string;
    country_iso: string;
    country_name: string;
    carrier: string | null;
    is_valid: boolean;
  };
}

export function EditClientDialog({
  open,
  onOpenChange,
  client,
  onSubmit,
  isLoading,
}: EditClientDialogProps) {
  const { user } = useAuth();

  const [provincias, setProvincias] = useState<Provincia[]>([]);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [loadingProvincias, setLoadingProvincias] = useState(false);
  const [loadingMunicipios, setLoadingMunicipios] = useState(false);
  const [selectedProvinciaCodigo, setSelectedProvinciaCodigo] =
    useState<string>("");
  const [detectingCountry, setDetectingCountry] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);

  const [clientLatLng, setClientLatLng] = useState<{
    lat: string;
    lng: string;
  }>({
    lat: "",
    lng: "",
  });

  // Función para convertir fecha DD/MM/YYYY a YYYY-MM-DD (para input date)
  const convertToDateInput = (ddmmyyyy: string): string => {
    if (!ddmmyyyy) return "";
    if (ddmmyyyy.match(/^\d{4}-\d{2}-\d{2}$/)) return ddmmyyyy;
    if (ddmmyyyy.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const [day, month, year] = ddmmyyyy.split("/");
      return `${year}-${month}-${day}`;
    }
    return "";
  };

  // Función para convertir fecha YYYY-MM-DD a DD/MM/YYYY (para enviar al backend)
  const convertFromDateInput = (yyyymmdd: string): string => {
    if (!yyyymmdd) return "";
    const [year, month, day] = yyyymmdd.split("-");
    return `${day}/${month}/${year}`;
  };

  // Función auxiliar para normalizar estados
  const normalizeEstado = (estado: string): string => {
    if (!estado) return "";

    const estadosMap: Record<string, string> = {
      "Instalacion en proceso": "Instalación en Proceso",
      "Instalación en proceso": "Instalación en Proceso",
      "instalacion en proceso": "Instalación en Proceso",
      "Pendiente de instalacion": "Pendiente de instalación",
      "pendiente de instalacion": "Pendiente de instalación",
      "Equipo instalado con éxito": "Equipo instalado con éxito",
      "equipo instalado con éxito": "Equipo instalado con éxito",
    };

    return estadosMap[estado] || estado;
  };

  const normalizeTipoPersona = (tipoPersona: string): string => {
    if (!tipoPersona) return "";
    const normalized = tipoPersona.trim().toLowerCase();
    if (normalized === "natural") return "Natural";
    if (normalized === "juridica" || normalized === "jurídica") {
      return "Jurídica";
    }
    return tipoPersona;
  };

  const [formData, setFormData] = useState({
    numero: client.numero || "",
    fecha_contacto: convertToDateInput(client.fecha_contacto || ""),
    nombre: client.nombre || "",
    telefono: client.telefono || "",
    telefono_adicional: client.telefono_adicional || "",
    estado: normalizeEstado(client.estado || ""),
    fuente: client.fuente || "",
    fuente_referencia: client.fuente_referencia || "",
    referencia: client.referencia || "",
    direccion: client.direccion || "",
    pais_contacto: client.pais_contacto || "",
    comentario: client.comentario || "",
    provincia_montaje: client.provincia_montaje || "",
    municipio: client.municipio || "",
    comercial: client.comercial || user?.nombre || "",
    metodo_pago: client.metodo_pago || "",
    moneda: client.moneda || "",
    carnet_identidad: client.carnet_identidad || "",
    fecha_montaje: client.fecha_montaje || "",
    fecha_instalacion: client.fecha_instalacion || "",
    falta_instalacion: client.falta_instalacion || "",
    prioridad: client.prioridad || "Baja",
    motivo_visita: client.motivo_visita || "",
    tipo_persona: normalizeTipoPersona(client.tipo_persona || ""),
    es_trabajador_suncar: client.es_trabajador_suncar ?? false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [fechaInstalacionOpen, setFechaInstalacionOpen] = useState(false);
  const [pendingSubmitData, setPendingSubmitData] = useState<ClienteUpdateData | null>(null);

  // Reset cuando se abre el diálogo con un cliente diferente
  useEffect(() => {
    if (open) {
      console.log("🔄 Reseteando formulario con cliente:", client);
      console.log("📊 Estado del cliente:", client.estado);
      console.log("📊 Tipo de estado:", typeof client.estado);

      // Normalizar el estado para compatibilidad con versiones anteriores
      let estadoNormalizado = client.estado || "";

      // Mapeo de estados antiguos a nuevos
      const estadosMap: Record<string, string> = {
        "Instalacion en proceso": "Instalación en Proceso",
        "Instalación en proceso": "Instalación en Proceso",
        "instalacion en proceso": "Instalación en Proceso",
        "Pendiente de instalacion": "Pendiente de instalación",
        "pendiente de instalacion": "Pendiente de instalación",
        "Equipo instalado con éxito": "Equipo instalado con éxito",
        "equipo instalado con éxito": "Equipo instalado con éxito",
      };

      // Normalizar usando el mapa
      if (estadoNormalizado && estadosMap[estadoNormalizado]) {
        estadoNormalizado = estadosMap[estadoNormalizado];
      }

      console.log("✅ Estado normalizado:", estadoNormalizado);

      setFormData({
        numero: client.numero || "",
        fecha_contacto: convertToDateInput(client.fecha_contacto || ""),
        nombre: client.nombre || "",
        telefono: client.telefono || "",
        telefono_adicional: client.telefono_adicional || "",
        estado: estadoNormalizado,
        fuente: client.fuente || "",
        fuente_referencia: client.fuente_referencia || "",
        referencia: client.referencia || "",
        direccion: client.direccion || "",
        pais_contacto: client.pais_contacto || "",
        comentario: client.comentario || "",
        provincia_montaje: client.provincia_montaje || "",
        municipio: client.municipio || "",
        comercial: client.comercial || user?.nombre || "",
        metodo_pago: client.metodo_pago || "",
        moneda: client.moneda || "",
        carnet_identidad: client.carnet_identidad || "",
        fecha_montaje: client.fecha_montaje || "",
        fecha_instalacion: client.fecha_instalacion || "",
        falta_instalacion: client.falta_instalacion || "",
        prioridad: client.prioridad || "Baja",
        motivo_visita: client.motivo_visita || "",
        tipo_persona: normalizeTipoPersona(client.tipo_persona || ""),
        es_trabajador_suncar: client.es_trabajador_suncar ?? false,
      });

      console.log("✅ FormData actualizado con estado:", estadoNormalizado);

      // Actualizar coordenadas del mapa
      setClientLatLng({
        lat: client.latitud ? String(client.latitud) : "",
        lng: client.longitud ? String(client.longitud) : "",
      });

      // Si el cliente tiene provincia, buscar su código para cargar municipios
      if (client.provincia_montaje && provincias.length > 0) {
        const provincia = provincias.find(
          (p) => p.nombre === client.provincia_montaje,
        );
        if (provincia) {
          console.log(
            "🗺️ Provincia encontrada, estableciendo código:",
            provincia.codigo,
          );
          setSelectedProvinciaCodigo(provincia.codigo);
        }
      } else {
        setSelectedProvinciaCodigo("");
      }
    }
  }, [open, client, user, provincias]);

  // Asignar prioridad automática cuando cambia la fuente
  useEffect(() => {
    const fuentesAlta = ["Fernando", "Kelly", "Ale", "Andy"];
    if (formData.fuente && fuentesAlta.includes(formData.fuente)) {
      setFormData((prev) => ({ ...prev, prioridad: "Alta" }));
    }
  }, [formData.fuente]);

  // Cargar provincias al montar el componente
  useEffect(() => {
    const fetchProvincias = async () => {
      setLoadingProvincias(true);
      try {
        const response = await apiRequest<{
          success: boolean;
          message: string;
          data: Provincia[];
          total: number;
        }>("/provincias/", {
          method: "GET",
        });

        if (response.success && response.data) {
          setProvincias(response.data);
        }
      } catch (error) {
        console.error("Error al cargar provincias:", error);
      } finally {
        setLoadingProvincias(false);
      }
    };

    fetchProvincias();
  }, []);

  // Cargar municipios cuando se selecciona una provincia
  useEffect(() => {
    const fetchMunicipios = async () => {
      if (!selectedProvinciaCodigo) {
        setMunicipios([]);
        return;
      }

      setLoadingMunicipios(true);
      try {
        const response = await apiRequest<{
          success: boolean;
          message: string;
          data: Municipio[];
          total: number;
        }>(`/provincias/provincia/${selectedProvinciaCodigo}/municipios`, {
          method: "GET",
        });

        if (response.success && response.data) {
          setMunicipios(response.data);
        }
      } catch (error) {
        console.error("Error al cargar municipios:", error);
        setMunicipios([]);
      } finally {
        setLoadingMunicipios(false);
      }
    };

    fetchMunicipios();
  }, [selectedProvinciaCodigo]);

  const handleInputChange = (field: string, value: string) => {
    let processedValue = value;

    // Convertir fecha de input date (YYYY-MM-DD) a formato DD/MM/YYYY
    if (
      field === "fecha_contacto" ||
      field === "fecha_montaje" ||
      field === "fecha_instalacion"
    ) {
      processedValue = convertFromDateInput(value);
    }

    setFormData((prev) => {
      const nextData = {
        ...prev,
        [field]: processedValue,
      };

      if (field === "estado" && processedValue !== "Pendiente de visita") {
        nextData.motivo_visita = "";
      }

      return nextData;
    });

    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  // Función para detectar país desde el número de teléfono
  const detectCountryFromPhone = async (phoneNumber: string) => {
    if (!phoneNumber || !phoneNumber.trim().startsWith("+")) {
      return;
    }

    const digitsOnly = phoneNumber.replace(/[^\d]/g, "");
    if (digitsOnly.length < 10) {
      return;
    }

    setDetectingCountry(true);
    try {
      const cleanedNumber = phoneNumber.replace(/[^\d+]/g, "");
      const authToken = localStorage.getItem("auth_token") || "";
      const url = `${API_BASE_URL}/phone/country?phone_number=${encodeURIComponent(cleanedNumber)}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        setFormData((prev) => ({
          ...prev,
          pais_contacto: "",
        }));
        return;
      }

      const data: PhoneCountryResponse = await response.json();

      if (data.success && data.data && data.data.is_valid) {
        setFormData((prev) => ({
          ...prev,
          pais_contacto: data.data.country_name,
        }));
      } else {
        setFormData((prev) => ({
          ...prev,
          pais_contacto: "",
        }));
      }
    } catch (error) {
      console.error("Error al detectar país:", error);
      setFormData((prev) => ({
        ...prev,
        pais_contacto: "",
      }));
    } finally {
      setDetectingCountry(false);
    }
  };

  const handleTelefonoChange = (value: string) => {
    handleInputChange("telefono", value);
  };

  useEffect(() => {
    if (
      formData.telefono &&
      formData.telefono.trim().startsWith("+") &&
      formData.telefono.replace(/[^\d]/g, "").length >= 10
    ) {
      const timeoutId = setTimeout(() => {
        detectCountryFromPhone(formData.telefono);
      }, 800);

      return () => clearTimeout(timeoutId);
    }
  }, [formData.telefono]);

  const handleProvinciaChange = (provinciaNombre: string) => {
    const provincia = provincias.find((p) => p.nombre === provinciaNombre);

    if (provincia) {
      setSelectedProvinciaCodigo(provincia.codigo);
      setFormData((prev) => ({
        ...prev,
        provincia_montaje: provinciaNombre,
        municipio: "",
      }));
      if (errors.provincia_montaje) {
        setErrors((prev) => ({
          ...prev,
          provincia_montaje: "",
        }));
      }
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.numero.trim()) {
      newErrors.numero = "El código de cliente es obligatorio";
    }
    if (!formData.nombre.trim()) {
      newErrors.nombre = "El nombre es obligatorio";
    }
    if (!formData.telefono.trim()) {
      newErrors.telefono = "El teléfono es obligatorio";
    }
    if (!formData.direccion.trim()) {
      newErrors.direccion = "La dirección es obligatoria";
    }
    if (
      formData.estado === "Pendiente de visita" &&
      !formData.motivo_visita?.trim()
    ) {
      newErrors.motivo_visita =
        'El motivo de visita es obligatorio cuando el estado es "Pendiente de visita"';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const esInstalado = (estado?: string) =>
    (estado ?? "").toLowerCase().includes("equipo instalado");

  const handleConfirmarFecha = async (fechaISO: string) => {
    setFechaInstalacionOpen(false);
    if (!pendingSubmitData) return;
    try {
      await onSubmit({ ...pendingSubmitData, fecha_equipo_instalado: fechaISO });
      onOpenChange(false);
    } catch (error) {
      console.error("Error al actualizar cliente:", error);
    } finally {
      setPendingSubmitData(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const clientDataToSubmit: ClienteUpdateData = {
        ...formData,
        latitud: clientLatLng.lat || undefined,
        longitud: clientLatLng.lng || undefined,
      };

      if (clientDataToSubmit.estado !== "Pendiente de visita") {
        delete (clientDataToSubmit as Record<string, unknown>).motivo_visita;
      } else if (typeof clientDataToSubmit.motivo_visita === "string") {
        clientDataToSubmit.motivo_visita =
          clientDataToSubmit.motivo_visita.trim();
      }

      // Si el estado cambia a "Equipo instalado con éxito", preguntar fecha
      if (
        esInstalado(clientDataToSubmit.estado) &&
        !esInstalado(client.estado)
      ) {
        setPendingSubmitData(clientDataToSubmit);
        setFechaInstalacionOpen(true);
        return;
      }

      await onSubmit(clientDataToSubmit);
      onOpenChange(false);
    } catch (error) {
      console.error("Error al actualizar cliente:", error);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-w-xl max-h-[85vh] overflow-hidden p-0 gap-0 flex flex-col"
          onPointerDownOutside={(e) => { if (fechaInstalacionOpen) e.preventDefault(); }}
          onInteractOutside={(e) => { if (fechaInstalacionOpen) e.preventDefault(); }}
        >
          <DialogHeader className="shrink-0 border-b border-gray-100 px-5 py-4">
            <DialogTitle className="text-base font-semibold text-gray-900">
              Editar cliente · {client.nombre}
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={handleSubmit}
            className="flex flex-1 flex-col overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <div className="space-y-5">
                {/* Contacto */}
                <section>
                  <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    Contacto
                  </h4>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="fecha_contacto">Fecha de Contacto</Label>
                        <Input
                          id="fecha_contacto"
                          type="date"
                          value={convertToDateInput(formData.fecha_contacto)}
                          onChange={(e) =>
                            handleInputChange("fecha_contacto", e.target.value)
                          }
                          className="text-gray-900"
                        />
                      </div>
                      <div>
                        <Label htmlFor="comercial">Comercial</Label>
                        <Input
                          id="comercial"
                          value={formData.comercial}
                          onChange={(e) =>
                            handleInputChange("comercial", e.target.value)
                          }
                          className="text-gray-900 placeholder:text-gray-400"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="nombre">
                          Nombre <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="nombre"
                          value={formData.nombre}
                          onChange={(e) =>
                            handleInputChange("nombre", e.target.value)
                          }
                          className={`text-gray-900 placeholder:text-gray-400 ${errors.nombre ? "border-red-500" : ""}`}
                        />
                        {errors.nombre && (
                          <p className="text-sm text-red-500 mt-1">
                            {errors.nombre}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="referencia">Referencia</Label>
                        <Input
                          id="referencia"
                          value={formData.referencia}
                          onChange={(e) =>
                            handleInputChange("referencia", e.target.value)
                          }
                          className="text-gray-900 placeholder:text-gray-400"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="telefono">
                          Teléfono <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="telefono"
                          value={formData.telefono}
                          onChange={(e) => handleTelefonoChange(e.target.value)}
                          placeholder="+53 5 1234567"
                          className={`text-gray-900 placeholder:text-gray-400 ${errors.telefono ? "border-red-500" : ""}`}
                        />
                        {errors.telefono && (
                          <p className="text-sm text-red-500 mt-1">
                            {errors.telefono}
                          </p>
                        )}
                        {detectingCountry && (
                          <p className="text-sm text-blue-500 mt-1">
                            Detectando país...
                          </p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="telefono_adicional">
                          Teléfono Adicional
                        </Label>
                        <Input
                          id="telefono_adicional"
                          value={formData.telefono_adicional || ""}
                          onChange={(e) =>
                            handleInputChange("telefono_adicional", e.target.value)
                          }
                          placeholder="+53 5 1234567"
                          className="text-gray-900 placeholder:text-gray-400"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="pais_contacto">País de contacto</Label>
                      <Input
                        id="pais_contacto"
                        value={formData.pais_contacto || ""}
                        onChange={(e) =>
                          handleInputChange("pais_contacto", e.target.value)
                        }
                        className="text-gray-900 placeholder:text-gray-400"
                      />
                    </div>
                  </div>
                </section>

                {/* Identificación */}
                <section className="border-t border-gray-100 pt-5">
                  <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    Identificación
                  </h4>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="numero">
                          Código de cliente <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="numero"
                          value={formData.numero}
                          onChange={(e) =>
                            handleInputChange("numero", e.target.value)
                          }
                          className={`text-gray-900 placeholder:text-gray-400 ${errors.numero ? "border-red-500" : ""}`}
                        />
                        {errors.numero && (
                          <p className="text-sm text-red-500 mt-1">
                            {errors.numero}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="carnet_identidad">
                          {formData.tipo_persona === "Jurídica"
                            ? "NIT Empresa"
                            : "Carnet de identidad"}
                        </Label>
                        <Input
                          id="carnet_identidad"
                          value={formData.carnet_identidad || ""}
                          onChange={(e) =>
                            handleInputChange("carnet_identidad", e.target.value)
                          }
                          className="text-gray-900 placeholder:text-gray-400"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="tipo_persona">Tipo de Persona</Label>
                      <Select
                        value={formData.tipo_persona || ""}
                        onValueChange={(value) =>
                          handleInputChange("tipo_persona", value)
                        }
                      >
                        <SelectTrigger
                          id="tipo_persona"
                          className="text-gray-900"
                        >
                          <SelectValue placeholder="Seleccionar tipo de persona" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Natural">Natural</SelectItem>
                          <SelectItem value="Jurídica">Jurídica</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="es_trabajador_suncar-edit"
                        checked={formData.es_trabajador_suncar ?? false}
                        onCheckedChange={(checked) =>
                          setFormData((prev) => ({
                            ...prev,
                            es_trabajador_suncar: checked === true,
                          }))
                        }
                      />
                      <Label htmlFor="es_trabajador_suncar-edit" className="cursor-pointer">
                        Es trabajador de SunCar
                      </Label>
                    </div>
                  </div>
                </section>

                {/* Ubicación */}
                <section className="border-t border-gray-100 pt-5">
                  <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    Ubicación
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="direccion">
                        Dirección <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="direccion"
                        value={formData.direccion}
                        onChange={(e) =>
                          handleInputChange("direccion", e.target.value)
                        }
                        className={`text-gray-900 placeholder:text-gray-400 ${errors.direccion ? "border-red-500" : ""}`}
                      />
                      {errors.direccion && (
                        <p className="text-sm text-red-500 mt-1">
                          {errors.direccion}
                        </p>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="provincia_montaje">Provincia</Label>
                        <Select
                          value={formData.provincia_montaje}
                          onValueChange={handleProvinciaChange}
                          disabled={loadingProvincias}
                        >
                          <SelectTrigger
                            id="provincia_montaje"
                            className="text-gray-900"
                          >
                            <SelectValue
                              placeholder={
                                loadingProvincias
                                  ? "Cargando..."
                                  : "Seleccionar provincia"
                              }
                            />
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px] overflow-y-auto">
                            {provincias.map((provincia, index) => (
                              <SelectItem
                                key={`provincia-${provincia.codigo}-${index}`}
                                value={provincia.nombre}
                              >
                                {provincia.nombre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="municipio">Municipio</Label>
                        <Select
                          value={formData.municipio || ""}
                          onValueChange={(value) =>
                            handleInputChange("municipio", value)
                          }
                          disabled={!selectedProvinciaCodigo || loadingMunicipios}
                        >
                          <SelectTrigger id="municipio" className="text-gray-900">
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
                            {municipios.map((municipio, index) => (
                              <SelectItem
                                key={`municipio-${municipio.codigo}-${index}`}
                                value={municipio.nombre}
                              >
                                {municipio.nombre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label>Ubicación en el mapa</Label>
                      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                        <div className="flex gap-2 flex-1">
                          <Input
                            value={clientLatLng.lat}
                            readOnly
                            className="flex-1 sm:w-32 text-gray-600 bg-gray-50 text-xs sm:text-sm"
                          />
                          <Input
                            value={clientLatLng.lng}
                            readOnly
                            className="flex-1 sm:w-32 text-gray-600 bg-gray-50 text-xs sm:text-sm"
                          />
                        </div>
                        <Button
                          type="button"
                          className="bg-purple-600 hover:bg-purple-700 text-white shrink-0"
                          size="sm"
                          onClick={() => setShowMapModal(true)}
                        >
                          <MapPin className="h-4 w-4 sm:mr-1" />
                          <span className="hidden sm:inline">
                            Seleccionar en mapa
                          </span>
                        </Button>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Origen y prioridad */}
                <section className="border-t border-gray-100 pt-5">
                  <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    Origen y prioridad
                  </h4>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FuenteSelector
                        fuente={formData.fuente}
                        fuenteReferencia={formData.fuente_referencia}
                        onChange={(fuente, fuenteReferencia) => {
                          handleInputChange("fuente", fuente);
                          handleInputChange("fuente_referencia", fuenteReferencia);
                        }}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <PrioritySelect
                        value={formData.prioridad}
                        onChange={(value) => handleInputChange("prioridad", value)}
                      />
                    </div>
                  </div>
                </section>

                {/* Estado y seguimiento */}
                <section className="border-t border-gray-100 pt-5">
                  <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    Estado y seguimiento
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="estado">Estado</Label>
                      <Select
                        value={formData.estado}
                        onValueChange={(value) =>
                          handleInputChange("estado", value)
                        }
                      >
                        <SelectTrigger id="estado" className="text-gray-900">
                          <SelectValue placeholder="Seleccionar estado">
                            {formData.estado || "Seleccionar estado"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Equipo instalado con éxito">
                            Equipo instalado con éxito
                          </SelectItem>
                          <SelectItem value="Esperando equipo">
                            Esperando equipo
                          </SelectItem>
                          <SelectItem value="Pendiente de instalación">
                            Pendiente de instalación
                          </SelectItem>
                          <SelectItem value="Instalación en Proceso">
                            Instalación en Proceso
                          </SelectItem>
                          <SelectItem value="Pendiente de visita">
                            Pendiente de visita
                          </SelectItem>
                          <SelectItem value="No interesado">
                            No interesado
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {formData.estado === "Pendiente de visita" && (
                      <div>
                        <Label htmlFor="motivo_visita">Motivo de Visita</Label>
                        <Textarea
                          id="motivo_visita"
                          value={formData.motivo_visita || ""}
                          onChange={(e) =>
                            handleInputChange("motivo_visita", e.target.value)
                          }
                          placeholder="Ej: Primera evaluación técnica, revisar condiciones del sitio..."
                          rows={3}
                          className="text-gray-900"
                        />
                        {errors.motivo_visita && (
                          <p className="text-sm text-red-500 mt-1">
                            {errors.motivo_visita}
                          </p>
                        )}
                      </div>
                    )}

                    {formData.estado === "Instalación en Proceso" && (
                      <div>
                        <Label htmlFor="falta_instalacion">
                          ¿Qué le falta a la instalación?
                        </Label>
                        <Textarea
                          id="falta_instalacion"
                          value={formData.falta_instalacion || ""}
                          onChange={(e) =>
                            handleInputChange("falta_instalacion", e.target.value)
                          }
                          rows={2}
                          className="text-gray-900 placeholder:text-gray-400"
                          placeholder="Describe qué le falta para completar la instalación..."
                        />
                      </div>
                    )}

                    {compareStrings(
                      formData.estado || "",
                      "Equipo instalado con éxito"
                    ) && (
                      <div>
                        <Label htmlFor="falta_instalacion_instalado">
                          ¿Queda algo pendiente?
                        </Label>
                        <FaltaInstalacionSelect
                          id="falta_instalacion_instalado"
                          value={formData.falta_instalacion}
                          onChange={(v) =>
                            handleInputChange("falta_instalacion", v)
                          }
                        />
                      </div>
                    )}

                    <div>
                      <Label htmlFor="comentario">Comentario</Label>
                      <Textarea
                        id="comentario"
                        value={formData.comentario || ""}
                        onChange={(e) =>
                          handleInputChange("comentario", e.target.value)
                        }
                        rows={3}
                        className="text-gray-900 placeholder:text-gray-400"
                      />
                    </div>
                  </div>
                </section>
              </div>
            </div>

            {/* Botones */}
            <div className="flex shrink-0 justify-end gap-2 border-t border-gray-100 px-5 py-3.5">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  "Guardar cambios"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showMapModal} onOpenChange={setShowMapModal}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Seleccionar ubicación en el mapa</DialogTitle>
          </DialogHeader>
          <div className="mb-4 text-gray-700">
            Haz click en el mapa para seleccionar la ubicación. Solo se
            guardarán latitud y longitud.
          </div>
          <MapPicker
            initialLat={
              clientLatLng.lat ? parseFloat(clientLatLng.lat) : 23.1136
            }
            initialLng={
              clientLatLng.lng ? parseFloat(clientLatLng.lng) : -82.3666
            }
            onSelect={(lat: number, lng: number) => {
              setClientLatLng({ lat: String(lat), lng: String(lng) });
            }}
          />
          <div className="flex justify-end pt-4">
            <Button
              type="button"
              className="bg-purple-600 hover:bg-purple-700 text-white"
              onClick={() => setShowMapModal(false)}
            >
              Confirmar ubicación
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <FechaInstalacionDialog
        open={fechaInstalacionOpen}
        onOpenChange={(v) => {
          setFechaInstalacionOpen(v);
          if (!v) setPendingSubmitData(null);
        }}
        onConfirm={handleConfirmarFecha}
      />
    </>
  );
}
