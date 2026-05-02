"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/shared/atom/button";
import { Input } from "@/components/shared/molecule/input";
import { Label } from "@/components/shared/atom/label";
import { Textarea } from "@/components/shared/molecule/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select";
import { PrioritySelect } from "@/components/shared/molecule/priority-select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
import { Loader2, MapPin } from "lucide-react";
import type { ClienteCreateData } from "@/lib/api-types";
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

interface CreateClientDialogProps {
  onSubmit: (data: ClienteCreateData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function CreateClientDialog({
  onSubmit,
  onCancel,
  isLoading,
}: CreateClientDialogProps) {
  const { user } = useAuth();

  const [provincias, setProvincias] = useState<Provincia[]>([]);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [loadingProvincias, setLoadingProvincias] = useState(false);
  const [loadingMunicipios, setLoadingMunicipios] = useState(false);
  const [selectedProvinciaCodigo, setSelectedProvinciaCodigo] =
    useState<string>("");
  const [detectingCountry, setDetectingCountry] = useState(false);

  // Estado para controlar si se está usando fuente personalizada
  const fuentesBase = [
    "Página Web",
    "Instagram",
    "Facebook",
    "Directo",
    "Mensaje de Whatsapp",
    "Visita",
  ];

  // Cargar fuentes personalizadas desde localStorage
  const [fuentesDisponibles, setFuentesDisponibles] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("fuentes_personalizadas");
      if (stored) {
        const personalizadas = JSON.parse(stored) as string[];
        // Combinar fuentes base con personalizadas, eliminando duplicados
        return [...new Set([...fuentesBase, ...personalizadas])];
      }
    } catch (error) {
      console.error("Error al cargar fuentes personalizadas:", error);
    }
    return fuentesBase;
  });

  const [usandoFuentePersonalizada, setUsandoFuentePersonalizada] =
    useState(false);

  // Escuchar cambios en las fuentes desde otros componentes
  useEffect(() => {
    const handleFuentesUpdate = () => {
      try {
        const stored = localStorage.getItem("fuentes_personalizadas");
        if (stored) {
          const personalizadas = JSON.parse(stored) as string[];
          setFuentesDisponibles([
            ...new Set([...fuentesBase, ...personalizadas]),
          ]);
        } else {
          setFuentesDisponibles(fuentesBase);
        }
      } catch (error) {
        console.error("Error al actualizar fuentes:", error);
      }
    };

    window.addEventListener("fuentes_updated", handleFuentesUpdate);
    return () =>
      window.removeEventListener("fuentes_updated", handleFuentesUpdate);
  }, []);

  const [showMapModal, setShowMapModal] = useState(false);
  const [clientLatLng, setClientLatLng] = useState<{
    lat: string;
    lng: string;
  }>({ lat: "", lng: "" });

  // Función para convertir fecha DD/MM/YYYY a YYYY-MM-DD (para input date)
  const convertToDateInput = (ddmmyyyy: string): string => {
    if (!ddmmyyyy) return "";
    if (ddmmyyyy.match(/^\d{4}-\d{2}-\d{2}$/)) return ddmmyyyy; // Ya está en formato ISO
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

  // Obtener fecha actual en formato DD/MM/YYYY
  const getCurrentDateDDMMYYYY = (): string => {
    const today = new Date();
    const day = today.getDate().toString().padStart(2, "0");
    const month = (today.getMonth() + 1).toString().padStart(2, "0");
    const year = today.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const [formData, setFormData] = useState<ClienteCreateData>({
    numero: "",
    fecha_contacto: getCurrentDateDDMMYYYY(), // Fecha actual en formato DD/MM/YYYY
    nombre: "",
    telefono: "",
    telefono_adicional: "",
    estado: "Pendiente de instalación",
    fuente: "",
    referencia: "",
    direccion: "",
    pais_contacto: "",
    comentario: "",
    provincia_montaje: "",
    municipio: "",
    comercial: user?.nombre || "", // Asignar automáticamente el nombre del usuario actual
    ofertas: [],
    elementos_personalizados: [],
    metodo_pago: "",
    moneda: "",
    carnet_identidad: "",
    fecha_montaje: "",
    fecha_instalacion: "",
    falta_instalacion: "",
    prioridad: "Baja", // Valor por defecto según documentación
    motivo_visita: "",
    tipo_persona: "",
  });

  const [generandoCodigo, setGenerandoCodigo] = useState(false);
  const [errorCodigo, setErrorCodigo] = useState("");
  const leadTemporalDraftRef = useRef({
    nombre: "",
    telefono: "",
    direccion: "",
    comercial: "Sistema",
  });
  const hasDatosBasicosParaCodigo = Boolean(
    formData.nombre.trim() && formData.telefono.trim(),
  );

  // Actualizar el comercial cuando el usuario cambie (por si acaso)
  useEffect(() => {
    if (user?.nombre) {
      setFormData((prev) => ({
        ...prev,
        comercial: user.nombre,
      }));
    }
  }, [user]);

  // Mantiene los datos más recientes para crear lead temporal sin disparar
  // regeneración de código por cada cambio de nombre/teléfono/dirección.
  useEffect(() => {
    leadTemporalDraftRef.current = {
      nombre: formData.nombre,
      telefono: formData.telefono,
      direccion: formData.direccion,
      comercial: user?.nombre || "Sistema",
    };
  }, [formData.nombre, formData.telefono, formData.direccion, user?.nombre]);

  // Asignar prioridad automática cuando cambia la fuente
  useEffect(() => {
    const fuentesAlta = ["Fernando", "Kelly", "Ale", "Andy"];
    if (formData.fuente && fuentesAlta.includes(formData.fuente)) {
      setFormData((prev) => ({ ...prev, prioridad: "Alta" }));
    }
  }, [formData.fuente]);

  // Generar código automáticamente cuando se tengan provincia y municipio
  useEffect(() => {
    const generarCodigoAutomatico = async () => {
      if (!selectedProvinciaCodigo || !formData.municipio) {
        setFormData((prev) => (prev.numero ? { ...prev, numero: "" } : prev));
        return;
      }

      const { nombre, telefono, direccion, comercial } =
        leadTemporalDraftRef.current;
      const nombreNormalizado = nombre.trim();
      const telefonoNormalizado = telefono.trim();

      if (
        !hasDatosBasicosParaCodigo ||
        !nombreNormalizado ||
        !telefonoNormalizado
      ) {
        setErrorCodigo(
          "Completa nombre y teléfono para generar el código del cliente",
        );
        setFormData((prev) => (prev.numero ? { ...prev, numero: "" } : prev));
        return;
      }

      const leadTemporal = {
        fecha_contacto: new Date().toISOString().split("T")[0],
        nombre: nombreNormalizado,
        telefono: telefonoNormalizado,
        estado: "nuevo",
        fuente: "Sistema",
        direccion: direccion || "Generación temporal de código",
        provincia_montaje: formData.provincia_montaje,
        municipio: formData.municipio,
        comercial,
        comentario: "__TEMP_LEAD_GENERAR_CODIGO_CLIENTE__",
        ofertas: [],
      };

      setGenerandoCodigo(true);
      setErrorCodigo("");

      let leadId: string | null = null;
      try {
        const responseCrear = await apiRequest<{
          success: boolean;
          message: string;
          data: { id: string };
        }>("/leads/", {
          method: "POST",
          body: JSON.stringify(leadTemporal),
        });

        if (!responseCrear.success || !responseCrear.data?.id) {
          throw new Error("Error al crear lead temporal");
        }

        leadId = responseCrear.data.id;

        const responseGenerar = await apiRequest<{
          success: boolean;
          message: string;
          codigo_generado: string;
        }>(`/leads/${leadId}/generar-codigo-cliente?equipo_propio=true`);

        if (!responseGenerar.success || !responseGenerar.codigo_generado) {
          throw new Error(
            responseGenerar.message || "Error al generar el código",
          );
        }

        const codigoGenerado = responseGenerar.codigo_generado;

        if (
          codigoGenerado.length !== 10 ||
          !/^P\d{9}$/.test(codigoGenerado)
        ) {
          throw new Error(
            `El código generado tiene un formato incorrecto: "${codigoGenerado}". ` +
              `Debe ser P seguido de 9 dígitos.`,
          );
        }

        setFormData((prev) => ({
          ...prev,
          numero: codigoGenerado,
        }));
      } catch (error) {
        console.error("❌ Error al generar código:", error);
        const mensaje =
          error instanceof Error
            ? error.message
            : "Error al generar el código de cliente";
        setErrorCodigo(mensaje);
        setFormData((prev) => ({ ...prev, numero: "" }));
      } finally {
        if (leadId) {
          try {
            await apiRequest(`/leads/${leadId}`, { method: "DELETE" });
          } catch (error) {
            console.warn("⚠️ No se pudo eliminar el lead temporal:", error);
          }
        }
        setGenerandoCodigo(false);
      }
    };

    generarCodigoAutomatico();
  }, [
    selectedProvinciaCodigo,
    formData.municipio,
    formData.provincia_montaje,
    hasDatosBasicosParaCodigo,
  ]);

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

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: keyof ClienteCreateData, value: string) => {
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

    // Limpiar error del campo cuando el usuario empiece a escribir
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  // Función para detectar país desde el número de teléfono
  const detectCountryFromPhone = async (phoneNumber: string) => {
    // Solo intentar detectar si el número tiene formato internacional (empieza con +)
    if (!phoneNumber || !phoneNumber.trim().startsWith("+")) {
      return;
    }

    // Validar que tenga al menos 10 dígitos (sin contar el +)
    // Esto evita llamadas al API con números incompletos
    const digitsOnly = phoneNumber.replace(/[^\d]/g, "");
    if (digitsOnly.length < 10) {
      console.log(
        "⏳ Número muy corto, esperando más dígitos...",
        digitsOnly.length,
        "de 10 mínimo",
      );
      return;
    }

    setDetectingCountry(true);
    try {
      // Limpiar el número: remover espacios y caracteres especiales excepto el +
      const cleanedNumber = phoneNumber.replace(/[^\d+]/g, "");

      console.log("🔍 Detectando país para número:", phoneNumber);
      console.log("🧹 Número limpio enviado:", cleanedNumber);

      // Obtener token de autenticación
      const authToken = localStorage.getItem("auth_token") || "";

      const url = `${API_BASE_URL}/phone/country?phone_number=${encodeURIComponent(cleanedNumber)}`;

      console.log("📡 URL completa:", url);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
      });

      console.log("📨 Status de respuesta:", response.status);

      if (!response.ok) {
        // Intentar obtener el mensaje de error del servidor
        const errorData = await response
          .json()
          .catch(() => ({ detail: "Error desconocido" }));
        console.error(
          "❌ Respuesta no exitosa:",
          response.status,
          response.statusText,
        );
        console.error(
          "❌ Detalle del error:",
          errorData.detail || errorData.message || "Sin detalles",
        );

        // Si no se pudo detectar, dejar el campo vacío
        setFormData((prev) => ({
          ...prev,
          pais_contacto: "",
        }));
        return;
      }

      const data: PhoneCountryResponse = await response.json();
      console.log("✅ Respuesta del servidor:", data);

      if (data.success && data.data && data.data.is_valid) {
        console.log("✅ País detectado:", data.data.country_name);
        console.log("📱 Operador:", data.data.carrier || "No disponible");
        console.log("🌍 Código ISO:", data.data.country_iso);

        // Actualizar el país de contacto con el país detectado
        setFormData((prev) => ({
          ...prev,
          pais_contacto: data.data.country_name,
        }));
      } else {
        console.warn("⚠️ Número no válido, dejando país vacío");
        // Si el número no es válido, dejar vacío
        setFormData((prev) => ({
          ...prev,
          pais_contacto: "",
        }));
      }
    } catch (error) {
      // Mostrar más detalles del error
      console.error("❌ Error completo al detectar país:", error);
      if (error instanceof Error) {
        console.error("❌ Mensaje de error:", error.message);
      }
      // En caso de error, dejar vacío
      setFormData((prev) => ({
        ...prev,
        pais_contacto: "",
      }));
    } finally {
      setDetectingCountry(false);
    }
  };

  // Handler especial para el campo teléfono que detecta el país
  const handleTelefonoChange = (value: string) => {
    handleInputChange("telefono", value);
  };

  // Efecto para detectar país automáticamente con debounce
  useEffect(() => {
    // Solo detectar si el número tiene formato internacional y longitud mínima realista
    // Mínimo: + (1) + código país (1-3) + número (7-15) = al menos 10 caracteres
    if (
      formData.telefono &&
      formData.telefono.trim().startsWith("+") &&
      formData.telefono.replace(/[^\d]/g, "").length >= 10
    ) {
      // Al menos 10 dígitos (sin contar el +)

      const timeoutId = setTimeout(() => {
        detectCountryFromPhone(formData.telefono);
      }, 800); // Aumentado a 800ms para dar más tiempo al usuario

      return () => clearTimeout(timeoutId);
    }
  }, [formData.telefono]);

  const handleProvinciaChange = (provinciaNombre: string) => {
    // Encontrar el código de la provincia seleccionada
    const provincia = provincias.find((p) => p.nombre === provinciaNombre);

    if (provincia) {
      setSelectedProvinciaCodigo(provincia.codigo);
      setFormData((prev) => ({
        ...prev,
        provincia_montaje: provinciaNombre,
        municipio: "", // Limpiar municipio cuando cambia la provincia
      }));
      // Limpiar error si existe
      if (errors.provincia_montaje) {
        setErrors((prev) => ({
          ...prev,
          provincia_montaje: "",
        }));
      }
    }
  };

  const sanitizeClientData = (data: ClienteCreateData): ClienteCreateData => {
    const cleaned: Record<string, unknown> = { ...data };

    Object.entries(cleaned).forEach(([key, value]) => {
      // No eliminar el array de ofertas, lo necesitamos siempre
      if (key === "ofertas") {
        return;
      }

      if (typeof value === "string" && value.trim() === "") {
        delete cleaned[key];
        return;
      }

      if (Array.isArray(value) && value.length === 0) {
        delete cleaned[key];
      }
    });

    if (cleaned.estado !== "Pendiente de visita") {
      delete cleaned.motivo_visita;
    } else if (typeof cleaned.motivo_visita === "string") {
      cleaned.motivo_visita = cleaned.motivo_visita.trim();
    }

    return cleaned as unknown as ClienteCreateData;
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Campos obligatorios
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const clientDataToSubmit: ClienteCreateData = {
        ...formData,
        fecha_contacto: getCurrentDateDDMMYYYY(),
        latitud: clientLatLng.lat || undefined,
        longitud: clientLatLng.lng || undefined,
        ofertas: [],
        equipo_propio: true,
      };

      await onSubmit(sanitizeClientData(clientDataToSubmit));
    } catch (error) {
      console.error("Error al crear cliente:", error);
    }
  };

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="space-y-6 max-h-[80vh] overflow-y-auto pr-2 overflow-x-hidden"
      >
        {/* Sección 1: Datos Personales */}
        <div className="border-2 border-gray-300 rounded-lg p-6 bg-white shadow-sm">
          <div className="pb-4 mb-4 border-b-2 border-gray-200">
            <h3 className="text-xl font-bold text-gray-900">
              Datos Personales
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Información básica del contacto
            </p>
          </div>
          <div className="space-y-4">
            {/* 1. Nombre y Referencia */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nombre">
                  Nombre <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => handleInputChange("nombre", e.target.value)}
                  className={`text-gray-900 placeholder:text-gray-400 ${errors.nombre ? "border-red-500" : ""}`}
                />
                {errors.nombre && (
                  <p className="text-sm text-red-500 mt-1">{errors.nombre}</p>
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

            {/* 2. Codigo y Carnet */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="numero">
                  Código de cliente <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="numero"
                    value={formData.numero}
                    readOnly
                    disabled
                    className={`text-gray-900 bg-gray-50 ${errors.numero ? "border-red-500" : ""}`}
                    placeholder={
                      generandoCodigo
                        ? "Generando código..."
                        : "Seleccione provincia y municipio para generar el código"
                    }
                  />
                  {generandoCodigo && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                    </div>
                  )}
                </div>
                {errorCodigo && (
                  <p className="text-sm text-red-500 mt-1">{errorCodigo}</p>
                )}
                {!errorCodigo && !generandoCodigo && formData.numero && (
                  <p className="text-sm text-green-600 mt-1">
                    ✓ Código generado automáticamente
                  </p>
                )}
                {!errorCodigo && !generandoCodigo && !formData.numero && (
                  <p className="text-sm text-gray-500 mt-1">
                    El código se generará automáticamente al seleccionar
                    provincia y municipio
                  </p>
                )}
                {errors.numero && (
                  <p className="text-sm text-red-500 mt-1">{errors.numero}</p>
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

            {/* 3. Estado y Fuente */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="estado">Estado</Label>
                <Select
                  value={formData.estado}
                  onValueChange={(value) => handleInputChange("estado", value)}
                >
                  <SelectTrigger id="estado" className="text-gray-900">
                    <SelectValue placeholder="Seleccionar estado" />
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
                <div className="md:col-span-3">
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
              <div>
                <Label htmlFor="fuente">Fuente</Label>
                {!usandoFuentePersonalizada ? (
                  <Select
                    value={formData.fuente}
                    onValueChange={(value) => {
                      if (value === "__custom__") {
                        setUsandoFuentePersonalizada(true);
                        handleInputChange("fuente", "");
                      } else {
                        handleInputChange("fuente", value);
                      }
                    }}
                  >
                    <SelectTrigger id="fuente" className="text-gray-900">
                      <SelectValue placeholder="Seleccionar fuente" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px] overflow-y-auto">
                      {fuentesDisponibles.map((fuente) => (
                        <SelectItem key={fuente} value={fuente}>
                          {fuente}
                        </SelectItem>
                      ))}
                      <SelectItem value="__custom__">
                        ✏️ Otra (escribir manualmente)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="space-y-2">
                    <Input
                      id="fuente-custom"
                      type="text"
                      value={formData.fuente}
                      onChange={(e) =>
                        handleInputChange("fuente", e.target.value)
                      }
                      placeholder="Escribe la fuente personalizada..."
                      className="text-gray-900 placeholder:text-gray-400"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Si hay una fuente personalizada escrita, agregarla a la lista
                        if (
                          formData.fuente &&
                          formData.fuente.trim() !== "" &&
                          !fuentesDisponibles.includes(formData.fuente)
                        ) {
                          const nuevasFuentes = [
                            ...fuentesDisponibles,
                            formData.fuente,
                          ];
                          setFuentesDisponibles(nuevasFuentes);
                          // Guardar en localStorage solo las personalizadas (sin las base)
                          const personalizadas = nuevasFuentes.filter(
                            (f) => !fuentesBase.includes(f),
                          );
                          localStorage.setItem(
                            "fuentes_personalizadas",
                            JSON.stringify(personalizadas),
                          );

                          // Quitar de la lista de excluidas si estaba ahí
                          try {
                            const excluidas = JSON.parse(
                              localStorage.getItem("fuentes_excluidas") || "[]",
                            ) as string[];
                            const nuevasExcluidas = excluidas.filter(
                              (f) => f !== formData.fuente,
                            );
                            if (nuevasExcluidas.length !== excluidas.length) {
                              localStorage.setItem(
                                "fuentes_excluidas",
                                JSON.stringify(nuevasExcluidas),
                              );
                            }
                          } catch (error) {
                            console.error(
                              "Error al actualizar fuentes excluidas:",
                              error,
                            );
                          }

                          window.dispatchEvent(
                            new CustomEvent("fuentes_updated"),
                          );
                        }
                        setUsandoFuentePersonalizada(false);
                      }}
                      className="text-xs"
                    >
                      ← Volver a opciones predefinidas
                    </Button>
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="tipo_persona">Tipo de Persona</Label>
                <Select
                  value={formData.tipo_persona || ""}
                  onValueChange={(value) =>
                    handleInputChange("tipo_persona", value)
                  }
                >
                  <SelectTrigger id="tipo_persona" className="text-gray-900">
                    <SelectValue placeholder="Seleccionar tipo de persona" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Natural">Natural</SelectItem>
                    <SelectItem value="Jurídica">Jurídica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 4. Prioridad */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <PrioritySelect
                value={formData.prioridad}
                onChange={(value) => handleInputChange("prioridad", value)}
              />
            </div>

            {/* Campo condicional: Falta Instalación */}
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

            {/* 4. Dirección */}
            <div>
              <Label htmlFor="direccion">Dirección</Label>
              <Input
                id="direccion"
                value={formData.direccion}
                onChange={(e) => handleInputChange("direccion", e.target.value)}
                className="text-gray-900 placeholder:text-gray-400"
              />
              {errors.direccion && (
                <p className="text-sm text-red-500 mt-1">{errors.direccion}</p>
              )}
            </div>

            {/* 5. Provincia y Municipio */}
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

            {/* 6. Ubicación en el mapa */}
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
                  <span className="hidden sm:inline">Seleccionar en mapa</span>
                </Button>
              </div>
            </div>

            {/* 7. Telefono y Pais */}
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
                  <p className="text-sm text-red-500 mt-1">{errors.telefono}</p>
                )}
                {detectingCountry && (
                  <p className="text-sm text-blue-500 mt-1">
                    Detectando pais...
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="telefono_adicional">Teléfono Adicional</Label>
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
        </div>

        <div className="border-2 border-gray-300 rounded-lg p-6 bg-white shadow-sm">
          <div className="pb-4 mb-4 border-b-2 border-gray-200">
            <h3 className="text-xl font-bold text-gray-900">
              Fechas de Instalacion
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Inicio y fin de la instalacion
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fecha_montaje">
                Fecha de inicio de instalación
              </Label>
              <Input
                id="fecha_montaje"
                type="date"
                value={convertToDateInput(formData.fecha_montaje || "")}
                onChange={(e) =>
                  handleInputChange("fecha_montaje", e.target.value)
                }
                className="text-gray-900"
              />
            </div>
            <div>
              <Label htmlFor="fecha_instalacion">
                Fecha de fin de instalación
              </Label>
              <Input
                id="fecha_instalacion"
                type="date"
                value={convertToDateInput(formData.fecha_instalacion || "")}
                onChange={(e) =>
                  handleInputChange("fecha_instalacion", e.target.value)
                }
                className="text-gray-900"
              />
            </div>
          </div>
        </div>

        {/* Comentarios */}
        <div className="space-y-2">
          <Label htmlFor="comentario">Comentario</Label>
          <Textarea
            id="comentario"
            value={formData.comentario || ""}
            onChange={(e) => handleInputChange("comentario", e.target.value)}
            rows={3}
            className="text-gray-900 placeholder:text-gray-400"
          />
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              "Crear Cliente"
            )}
          </Button>
        </div>
      </form>

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
    </>
  );
}
