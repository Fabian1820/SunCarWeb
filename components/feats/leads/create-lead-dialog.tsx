"use client";

import { useState, useEffect } from "react";
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
import { Loader2 } from "lucide-react";
import { MaterialSearchSelector } from "@/components/feats/materials/material-search-selector";
import type { LeadCreateData } from "@/lib/api-types";
import { useAuth } from "@/contexts/auth-context";
import { API_BASE_URL, apiRequest } from "@/lib/api-config";

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

interface CreateLeadDialogProps {
  onSubmit: (data: LeadCreateData) => Promise<void>;
  onCancel: () => void;
  availableSources?: string[];
  isLoading?: boolean;
}

export function CreateLeadDialog({
  onSubmit,
  onCancel,
  availableSources = [],
  isLoading,
}: CreateLeadDialogProps) {
  const { user } = useAuth();

  const [provincias, setProvincias] = useState<Provincia[]>([]);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [loadingProvincias, setLoadingProvincias] = useState(false);
  const [loadingMunicipios, setLoadingMunicipios] = useState(false);
  const [selectedProvinciaCodigo, setSelectedProvinciaCodigo] =
    useState<string>("");
  const [detectingCountry, setDetectingCountry] = useState(false);

  // Estados para materiales de oferta
  const [inversores, setInversores] = useState<
    Array<{ codigo: string | number; descripcion: string; precio?: number }>
  >([]);
  const [baterias, setBaterias] = useState<
    Array<{ codigo: string | number; descripcion: string; precio?: number }>
  >([]);
  const [paneles, setPaneles] = useState<
    Array<{ codigo: string | number; descripcion: string; precio?: number }>
  >([]);
  const [loadingMateriales, setLoadingMateriales] = useState(false);

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

  // Estados para la oferta
  const [oferta, setOferta] = useState({
    inversor_codigo: "",
    inversor_cantidad: 1,
    bateria_codigo: "",
    bateria_cantidad: 1,
    panel_codigo: "",
    panel_cantidad: 1,
    elementos_personalizados: "",
    aprobada: false,
    pagada: false,
    costo_oferta: 0,
    costo_extra: 0,
    costo_transporte: 0,
    razon_costo_extra: "",
  });

  // Calcular costo final automáticamente (incluye costo de transporte)
  const costoFinal =
    oferta.costo_oferta + oferta.costo_extra + oferta.costo_transporte;

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

  const [formData, setFormData] = useState<LeadCreateData>({
    fecha_contacto: getCurrentDateDDMMYYYY(), // Fecha actual en formato DD/MM/YYYY
    nombre: "",
    telefono: "",
    telefono_adicional: "",
    estado: "",
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
    prioridad: "Baja", // Valor por defecto según documentación
    motivo_visita: "",
  });

  // Actualizar el comercial cuando el usuario cambie (por si acaso)
  useEffect(() => {
    if (user?.nombre) {
      setFormData((prev) => ({
        ...prev,
        comercial: user.nombre,
      }));
    }
  }, [user]);

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

  // Cargar materiales (inversores, baterías, paneles) al montar el componente
  useEffect(() => {
    const fetchMateriales = async () => {
      setLoadingMateriales(true);
      try {
        console.log("🔄 Iniciando carga de materiales desde /productos/");

        // Obtener todos los productos/categorías de una vez
        const response = await apiRequest<{
          success: boolean;
          message: string;
          data: Array<{
            id: string;
            categoria: string;
            foto?: string;
            esVendible?: boolean;
            materiales?: Array<{
              codigo: string | number;
              descripcion: string;
              um?: string;
              precio?: number;
            }>;
          }>;
        }>("/productos/", {
          method: "GET",
        });

        console.log("📦 Respuesta completa del servidor:", response);

        if (!response.success) {
          console.error("❌ La respuesta no fue exitosa:", response.message);
          return;
        }

        const productos = response.data || [];
        console.log("📋 Total de categorías recibidas:", productos.length);
        console.log(
          "📋 Categorías disponibles:",
          productos.map((p) => p.categoria),
        );

        // Buscar inversores
        const inversoresCategoria = productos.find(
          (p) => p.categoria === "INVERSORES",
        );
        if (
          inversoresCategoria?.materiales &&
          inversoresCategoria.materiales.length > 0
        ) {
          console.log(
            "✅ Inversores encontrados:",
            inversoresCategoria.materiales.length,
          );
          console.log("📝 Primer inversor:", inversoresCategoria.materiales[0]);
          setInversores(inversoresCategoria.materiales);
        } else {
          console.warn(
            "⚠️ No se encontró la categoría INVERSORES o no tiene materiales",
          );
          setInversores([]);
        }

        // Buscar baterías (con tilde)
        const bateriasCategoria = productos.find(
          (p) => p.categoria === "BATERÍAS",
        );
        if (
          bateriasCategoria?.materiales &&
          bateriasCategoria.materiales.length > 0
        ) {
          console.log(
            "✅ Baterías encontradas:",
            bateriasCategoria.materiales.length,
          );
          console.log("📝 Primera batería:", bateriasCategoria.materiales[0]);
          setBaterias(bateriasCategoria.materiales);
        } else {
          console.warn(
            "⚠️ No se encontró la categoría BATERÍAS o no tiene materiales",
          );
          setBaterias([]);
        }

        // Buscar paneles
        const panelesCategoria = productos.find(
          (p) => p.categoria === "PANELES",
        );
        if (
          panelesCategoria?.materiales &&
          panelesCategoria.materiales.length > 0
        ) {
          console.log(
            "✅ Paneles encontrados:",
            panelesCategoria.materiales.length,
          );
          console.log("📝 Primer panel:", panelesCategoria.materiales[0]);
          setPaneles(panelesCategoria.materiales);
        } else {
          console.warn(
            "⚠️ No se encontró la categoría PANELES o no tiene materiales",
          );
          setPaneles([]);
        }
      } catch (error) {
        console.error("❌ Error al cargar materiales:", error);
        if (error instanceof Error) {
          console.error("❌ Mensaje de error:", error.message);
          console.error("❌ Stack:", error.stack);
        }
      } finally {
        setLoadingMateriales(false);
      }
    };

    fetchMateriales();
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

  const estadosDisponibles = [
    "Esperando equipo",
    "No interesado",
    "Pendiente de instalación",
    "Pendiente de presupuesto",
    "Pendiente de visita",
    "Pendiente de visitarnos",
    "Proximamente",
    "Revisando ofertas",
    "Sin respuesta",
  ];

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: keyof LeadCreateData, value: string) => {
    let processedValue = value;

    // Convertir fecha de input date (YYYY-MM-DD) a formato DD/MM/YYYY
    if (field === "fecha_contacto") {
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

  const sanitizeLeadData = (data: LeadCreateData): LeadCreateData => {
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

    return cleaned as unknown as LeadCreateData;
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Campos obligatorios
    if (!formData.fecha_contacto.trim()) {
      newErrors.fecha_contacto = "La fecha de contacto es obligatoria";
    }
    if (!formData.nombre.trim()) {
      newErrors.nombre = "El nombre es obligatorio";
    }
    if (!formData.telefono.trim()) {
      newErrors.telefono = "El teléfono es obligatorio";
    }
    if (!formData.estado.trim()) {
      newErrors.estado = "El estado es obligatorio";
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
      // Buscar las descripciones de los productos seleccionados
      const inversorSeleccionado = inversores.find(
        (inv) => String(inv.codigo) === oferta.inversor_codigo,
      );
      const bateriaSeleccionada = baterias.find(
        (bat) => String(bat.codigo) === oferta.bateria_codigo,
      );
      const panelSeleccionado = paneles.find(
        (pan) => String(pan.codigo) === oferta.panel_codigo,
      );

      // Construir el objeto de oferta desde el estado 'oferta' incluyendo las descripciones
      const ofertaToSend = {
        inversor_codigo: oferta.inversor_codigo || "",
        inversor_nombre: inversorSeleccionado?.descripcion || "",
        inversor_cantidad: oferta.inversor_cantidad,
        bateria_codigo: oferta.bateria_codigo || "",
        bateria_nombre: bateriaSeleccionada?.descripcion || "",
        bateria_cantidad: oferta.bateria_cantidad,
        panel_codigo: oferta.panel_codigo || "",
        panel_nombre: panelSeleccionado?.descripcion || "",
        panel_cantidad: oferta.panel_cantidad,
        elementos_personalizados: oferta.elementos_personalizados || "",
        aprobada: oferta.aprobada,
        pagada: oferta.pagada,
        costo_oferta: oferta.costo_oferta,
        costo_extra: oferta.costo_extra,
        costo_transporte: oferta.costo_transporte,
        razon_costo_extra: oferta.razon_costo_extra || "",
      };

      // Crear el leadData con la oferta incluida
      const leadDataWithOferta = {
        ...formData,
        ofertas: [ofertaToSend], // ← Agregar la oferta al array
      };

      console.log("📤 Enviando lead con oferta:", leadDataWithOferta);
      console.log("📦 Oferta a enviar:", ofertaToSend);

      await onSubmit(sanitizeLeadData(leadDataWithOferta));
    } catch (error) {
      console.error("Error al crear lead:", error);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 max-h-[80vh] overflow-y-auto pr-2 overflow-x-hidden"
    >
      {/* Sección 1: Datos Personales */}
      <div className="border-2 border-gray-300 rounded-lg p-6 bg-white shadow-sm">
        <div className="pb-4 mb-4 border-b-2 border-gray-200">
          <h3 className="text-xl font-bold text-gray-900">Datos Personales</h3>
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
          {/* 2. Teléfono y Teléfono Adicional */}
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
                <p className="text-sm text-blue-500 mt-1">Detectando país...</p>
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
          {/* 3. Estado y Fuente */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="estado">
                Estado <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.estado}
                onValueChange={(value) => handleInputChange("estado", value)}
              >
                <SelectTrigger
                  id="estado"
                  className={`text-gray-900 ${errors.estado ? "border-red-500" : ""}`}
                >
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] overflow-y-auto">
                  {estadosDisponibles.map((estado) => (
                    <SelectItem key={estado} value={estado}>
                      {estado}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.estado && (
                <p className="text-sm text-red-500 mt-1">{errors.estado}</p>
              )}
            </div>

            {/* Motivo de Visita - Solo visible cuando estado es "Pendiente de visita" */}
            {formData.estado === "Pendiente de visita" && (
              <div className="md:col-span-2">
                <Label htmlFor="motivo_visita">Motivo de Visita</Label>
                <Textarea
                  id="motivo_visita"
                  value={formData.motivo_visita || ""}
                  onChange={(e) =>
                    handleInputChange("motivo_visita", e.target.value)
                  }
                  placeholder="Ej: Primera evaluación técnica, verificar consumo actual, revisar estado del techo..."
                  rows={3}
                  className="text-gray-900"
                />
                {errors.motivo_visita && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.motivo_visita}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Describe el motivo o propósito de la visita programada
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>
          {/* 4. Prioridad */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PrioritySelect
              value={formData.prioridad}
              onChange={(value) => handleInputChange("prioridad", value)}
            />
          </div>
          {/* 5. Dirección (a lo largo) */}
          <div>
            <Label htmlFor="direccion">Dirección</Label>
            <Input
              id="direccion"
              value={formData.direccion}
              onChange={(e) => handleInputChange("direccion", e.target.value)}
              className="text-gray-900 placeholder:text-gray-400"
            />
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
                <SelectTrigger id="provincia_montaje" className="text-gray-900">
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
                onValueChange={(value) => handleInputChange("municipio", value)}
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
        </div>
      </div>

      {/* Sección 2: Oferta */}
      <div className="border-2 border-gray-300 rounded-lg p-6 bg-white shadow-sm">
        <div className="pb-4 mb-4 border-b-2 border-gray-200">
          <h3 className="text-xl font-bold text-gray-900">Oferta</h3>
          <p className="text-sm text-gray-500 mt-1">
            Detalles de productos y costos
          </p>
        </div>
        <div className="space-y-4">
          {/* Fila 1: Inversor y Cantidad */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <MaterialSearchSelector
                label="Inversor"
                materials={inversores}
                value={oferta.inversor_codigo}
                onChange={(value) =>
                  setOferta((prev) => ({ ...prev, inversor_codigo: value }))
                }
                placeholder="Buscar inversor por nombre o código..."
                disabled={loadingMateriales}
                loading={loadingMateriales}
              />
            </div>
            <div>
              <Label htmlFor="inversor_cantidad">Cantidad</Label>
              <Input
                id="inversor_cantidad"
                type="number"
                min="1"
                value={oferta.inversor_cantidad}
                onChange={(e) =>
                  setOferta((prev) => ({
                    ...prev,
                    inversor_cantidad: parseInt(e.target.value) || 1,
                  }))
                }
                className="text-gray-900"
              />
            </div>
          </div>

          {/* Fila 2: Batería y Cantidad */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <MaterialSearchSelector
                label="Batería"
                materials={baterias}
                value={oferta.bateria_codigo}
                onChange={(value) =>
                  setOferta((prev) => ({ ...prev, bateria_codigo: value }))
                }
                placeholder="Buscar batería por nombre o código..."
                disabled={loadingMateriales}
                loading={loadingMateriales}
              />
            </div>
            <div>
              <Label htmlFor="bateria_cantidad">Cantidad</Label>
              <Input
                id="bateria_cantidad"
                type="number"
                min="1"
                value={oferta.bateria_cantidad}
                onChange={(e) =>
                  setOferta((prev) => ({
                    ...prev,
                    bateria_cantidad: parseInt(e.target.value) || 1,
                  }))
                }
                className="text-gray-900"
              />
            </div>
          </div>

          {/* Fila 3: Panel y Cantidad */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <MaterialSearchSelector
                label="Panel"
                materials={paneles}
                value={oferta.panel_codigo}
                onChange={(value) =>
                  setOferta((prev) => ({ ...prev, panel_codigo: value }))
                }
                placeholder="Buscar panel por nombre o código..."
                disabled={loadingMateriales}
                loading={loadingMateriales}
              />
            </div>
            <div>
              <Label htmlFor="panel_cantidad">Cantidad</Label>
              <Input
                id="panel_cantidad"
                type="number"
                min="1"
                value={oferta.panel_cantidad}
                onChange={(e) =>
                  setOferta((prev) => ({
                    ...prev,
                    panel_cantidad: parseInt(e.target.value) || 1,
                  }))
                }
                className="text-gray-900"
              />
            </div>
          </div>

          {/* Fila 4: Elementos Personalizados */}
          <div>
            <Label htmlFor="elementos_personalizados">
              Elementos Personalizados (Comentario)
            </Label>
            <Textarea
              id="elementos_personalizados"
              value={oferta.elementos_personalizados}
              onChange={(e) =>
                setOferta((prev) => ({
                  ...prev,
                  elementos_personalizados: e.target.value,
                }))
              }
              rows={2}
              className="text-gray-900 placeholder:text-gray-400"
              placeholder="Describe elementos adicionales o personalizados..."
            />
          </div>

          {/* Fila 5: Estado de la Oferta */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-2 p-3 border rounded-md">
              <input
                type="checkbox"
                id="aprobada"
                checked={oferta.aprobada}
                onChange={(e) =>
                  setOferta((prev) => ({ ...prev, aprobada: e.target.checked }))
                }
                className="h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <Label htmlFor="aprobada" className="cursor-pointer font-medium">
                Oferta Aprobada
              </Label>
            </div>
            <div className="flex items-center space-x-2 p-3 border rounded-md">
              <input
                type="checkbox"
                id="pagada"
                checked={oferta.pagada}
                onChange={(e) =>
                  setOferta((prev) => ({ ...prev, pagada: e.target.checked }))
                }
                className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <Label htmlFor="pagada" className="cursor-pointer font-medium">
                Oferta Pagada
              </Label>
            </div>
          </div>
        </div>
      </div>

      {/* Sección 3: Costos y Pago */}
      <div className="border-2 border-gray-300 rounded-lg p-6 bg-white shadow-sm">
        <div className="pb-4 mb-4 border-b-2 border-gray-200">
          <h3 className="text-xl font-bold text-gray-900">Costos y Pago</h3>
          <p className="text-sm text-gray-500 mt-1">
            Información financiera de la oferta
          </p>
        </div>
        <div className="space-y-4">
          {/* Fila 1: Costos - Primera fila */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="costo_oferta">Costo de Oferta</Label>
              <Input
                id="costo_oferta"
                type="number"
                min="0"
                step="0.01"
                value={oferta.costo_oferta}
                onChange={(e) =>
                  setOferta((prev) => ({
                    ...prev,
                    costo_oferta: parseFloat(e.target.value) || 0,
                  }))
                }
                className="text-gray-900"
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="costo_extra">Costo Extra</Label>
              <Input
                id="costo_extra"
                type="number"
                min="0"
                step="0.01"
                value={oferta.costo_extra}
                onChange={(e) =>
                  setOferta((prev) => ({
                    ...prev,
                    costo_extra: parseFloat(e.target.value) || 0,
                  }))
                }
                className="text-gray-900"
                placeholder="0.00"
              />
            </div>
            {/* Costo de Transporte (solo si provincia != La Habana) */}
            {formData.provincia_montaje &&
            formData.provincia_montaje !== "La Habana" ? (
              <div>
                <Label htmlFor="costo_transporte">Costo de Transporte</Label>
                <Input
                  id="costo_transporte"
                  type="number"
                  min="0"
                  step="0.01"
                  value={oferta.costo_transporte || 0}
                  onChange={(e) =>
                    setOferta((prev) => ({
                      ...prev,
                      costo_transporte: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="text-gray-900"
                  placeholder="0.00"
                />
              </div>
            ) : (
              <div></div>
            )}
          </div>

          {/* Fila 2: Costo Final, Método de Pago y Moneda */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="costo_final_2">Costo Final</Label>
              <Input
                id="costo_final_2"
                type="number"
                value={costoFinal.toFixed(2)}
                disabled
                className="text-gray-900 bg-gray-100"
              />
            </div>
            <div>
              <Label htmlFor="metodo_pago">Método de Pago</Label>
              <Input
                id="metodo_pago"
                value={formData.metodo_pago || ""}
                onChange={(e) =>
                  handleInputChange("metodo_pago", e.target.value)
                }
                className="text-gray-900 placeholder:text-gray-400"
              />
            </div>
            <div>
              <Label htmlFor="moneda">Moneda</Label>
              <Input
                id="moneda"
                value={formData.moneda || ""}
                onChange={(e) => handleInputChange("moneda", e.target.value)}
                className="text-gray-900 placeholder:text-gray-400"
              />
            </div>
          </div>

          {/* Fila 3: Razón del Costo Extra */}
          <div>
            <Label htmlFor="razon_costo_extra">Razón del Costo Extra</Label>
            <Input
              id="razon_costo_extra"
              value={oferta.razon_costo_extra}
              onChange={(e) =>
                setOferta((prev) => ({
                  ...prev,
                  razon_costo_extra: e.target.value,
                }))
              }
              className="text-gray-900 placeholder:text-gray-400"
              placeholder="Ej: Transporte, instalación especial, materiales adicionales..."
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
            "Crear Lead"
          )}
        </Button>
      </div>
    </form>
  );
}
