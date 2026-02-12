"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/shared/atom/button";
import { Input } from "@/components/shared/molecule/input";
import { Label } from "@/components/shared/atom/label";
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
import { Loader2, MapPin } from "lucide-react";
import { MaterialSearchSelector } from "@/components/feats/materials/material-search-selector";
import type { Cliente, ClienteUpdateData } from "@/lib/api-types";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest } from "@/lib/api-config";
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

  // Cargar fuentes personalizadas desde localStorage y combinar con la fuente del cliente
  const [fuentesDisponibles, setFuentesDisponibles] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("fuentes_personalizadas");
      let todasLasFuentes = [...fuentesBase];

      if (stored) {
        const personalizadas = JSON.parse(stored) as string[];
        todasLasFuentes = [...new Set([...fuentesBase, ...personalizadas])];
      }

      // Si el cliente tiene una fuente que no está en la lista, agregarla
      if (client.fuente && !todasLasFuentes.includes(client.fuente)) {
        todasLasFuentes.push(client.fuente);
      }

      return todasLasFuentes;
    } catch (error) {
      console.error("Error al cargar fuentes personalizadas:", error);
      // Si hay error, al menos incluir la fuente del cliente si existe
      if (client.fuente && !fuentesBase.includes(client.fuente)) {
        return [...fuentesBase, client.fuente];
      }
      return fuentesBase;
    }
  });

  const [usandoFuentePersonalizada, setUsandoFuentePersonalizada] = useState(
    () => {
      // Si la fuente del cliente no está en las opciones base, usar input personalizado
      return client.fuente ? !fuentesBase.includes(client.fuente) : false;
    },
  );

  // Escuchar cambios en las fuentes desde otros componentes
  useEffect(() => {
    const handleFuentesUpdate = () => {
      try {
        const stored = localStorage.getItem("fuentes_personalizadas");
        let todasLasFuentes = [...fuentesBase];

        if (stored) {
          const personalizadas = JSON.parse(stored) as string[];
          todasLasFuentes = [...new Set([...fuentesBase, ...personalizadas])];
        }

        // Si el cliente tiene una fuente que no está en la lista, agregarla
        if (client.fuente && !todasLasFuentes.includes(client.fuente)) {
          todasLasFuentes.push(client.fuente);
        }

        setFuentesDisponibles(todasLasFuentes);
      } catch (error) {
        console.error("Error al actualizar fuentes:", error);
      }
    };

    window.addEventListener("fuentes_updated", handleFuentesUpdate);
    return () =>
      window.removeEventListener("fuentes_updated", handleFuentesUpdate);
  }, [client.fuente]);

  const [clientLatLng, setClientLatLng] = useState<{
    lat: string;
    lng: string;
  }>({
    lat: "",
    lng: "",
  });

  // Estados para la oferta (inicializar con la primera oferta del cliente si existe)
  const [oferta, setOferta] = useState({
    inversor_codigo: client.ofertas?.[0]?.inversor_codigo || "",
    inversor_cantidad: client.ofertas?.[0]?.inversor_cantidad || 1,
    bateria_codigo: client.ofertas?.[0]?.bateria_codigo || "",
    bateria_cantidad: client.ofertas?.[0]?.bateria_cantidad || 1,
    panel_codigo: client.ofertas?.[0]?.panel_codigo || "",
    panel_cantidad: client.ofertas?.[0]?.panel_cantidad || 1,
    elementos_personalizados:
      client.ofertas?.[0]?.elementos_personalizados || "",
    aprobada: client.ofertas?.[0]?.aprobada || false,
    pagada: client.ofertas?.[0]?.pagada || false,
    costo_oferta: client.ofertas?.[0]?.costo_oferta || 0,
    costo_extra: client.ofertas?.[0]?.costo_extra || 0,
    costo_transporte: client.ofertas?.[0]?.costo_transporte || 0,
    razon_costo_extra: client.ofertas?.[0]?.razon_costo_extra || "",
  });

  // Calcular costo final automáticamente (incluye costo de transporte)
  const costoFinal =
    oferta.costo_oferta + oferta.costo_extra + oferta.costo_transporte;

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

  const [formData, setFormData] = useState({
    numero: client.numero || "",
    fecha_contacto: convertToDateInput(client.fecha_contacto || ""),
    nombre: client.nombre || "",
    telefono: client.telefono || "",
    telefono_adicional: client.telefono_adicional || "",
    estado: normalizeEstado(client.estado || ""),
    fuente: client.fuente || "",
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
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

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
      });

      // Actualizar el estado de fuente personalizada
      const esFuentePersonalizada = client.fuente
        ? !fuentesBase.includes(client.fuente)
        : false;
      setUsandoFuentePersonalizada(esFuentePersonalizada);

      // Si es una fuente personalizada, agregarla a la lista si no está
      if (
        client.fuente &&
        !fuentesBase.includes(client.fuente) &&
        !fuentesDisponibles.includes(client.fuente)
      ) {
        setFuentesDisponibles((prev) => [...prev, client.fuente]);
      }

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

  // Resetear oferta DESPUÉS de que los materiales se hayan cargado
  useEffect(() => {
    if (
      open &&
      !loadingMateriales &&
      (inversores.length > 0 || baterias.length > 0 || paneles.length > 0)
    ) {
      console.log(
        "🔄 Reseteando oferta con datos del cliente:",
        client.ofertas?.[0],
      );
      setOferta({
        inversor_codigo: client.ofertas?.[0]?.inversor_codigo || "",
        inversor_cantidad: client.ofertas?.[0]?.inversor_cantidad || 1,
        bateria_codigo: client.ofertas?.[0]?.bateria_codigo || "",
        bateria_cantidad: client.ofertas?.[0]?.bateria_cantidad || 1,
        panel_codigo: client.ofertas?.[0]?.panel_codigo || "",
        panel_cantidad: client.ofertas?.[0]?.panel_cantidad || 1,
        elementos_personalizados:
          client.ofertas?.[0]?.elementos_personalizados || "",
        aprobada: client.ofertas?.[0]?.aprobada || false,
        pagada: client.ofertas?.[0]?.pagada || false,
        costo_oferta: client.ofertas?.[0]?.costo_oferta || 0,
        costo_extra: client.ofertas?.[0]?.costo_extra || 0,
        costo_transporte: client.ofertas?.[0]?.costo_transporte || 0,
        razon_costo_extra: client.ofertas?.[0]?.razon_costo_extra || "",
      });
    }
  }, [
    open,
    loadingMateriales,
    inversores.length,
    baterias.length,
    paneles.length,
    client,
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

  // Cargar materiales cuando se abre el diálogo
  useEffect(() => {
    if (!open) return;

    const fetchMateriales = async () => {
      setLoadingMateriales(true);
      try {
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

        if (!response.success) {
          return;
        }

        const productos = response.data || [];

        const inversoresCategoria = productos.find(
          (p) => p.categoria === "INVERSORES",
        );
        if (
          inversoresCategoria?.materiales &&
          inversoresCategoria.materiales.length > 0
        ) {
          setInversores(inversoresCategoria.materiales);
        }

        const bateriasCategoria = productos.find(
          (p) => p.categoria === "BATERÍAS",
        );
        if (
          bateriasCategoria?.materiales &&
          bateriasCategoria.materiales.length > 0
        ) {
          setBaterias(bateriasCategoria.materiales);
        }

        const panelesCategoria = productos.find(
          (p) => p.categoria === "PANELES",
        );
        if (
          panelesCategoria?.materiales &&
          panelesCategoria.materiales.length > 0
        ) {
          setPaneles(panelesCategoria.materiales);
        }
      } catch (error) {
        console.error("Error al cargar materiales:", error);
      } finally {
        setLoadingMateriales(false);
      }
    };

    fetchMateriales();
  }, [open]);

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
      const API_BASE_URL =
        process.env.NEXT_PUBLIC_BACKEND_URL || "https://api.suncarsrl.com";
      const url = `${API_BASE_URL}/api/phone/country?phone_number=${encodeURIComponent(cleanedNumber)}`;

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      // Buscar las descripciones de los productos seleccionados
      console.log("🔍 Buscando inversor con código:", oferta.inversor_codigo);
      console.log(
        "📦 Inversores disponibles:",
        inversores.map((inv) => ({
          codigo: inv.codigo,
          descripcion: inv.descripcion,
        })),
      );

      const inversorSeleccionado = inversores.find(
        (inv) => String(inv.codigo) === String(oferta.inversor_codigo),
      );
      const bateriaSeleccionada = baterias.find(
        (bat) => String(bat.codigo) === String(oferta.bateria_codigo),
      );
      const panelSeleccionado = paneles.find(
        (pan) => String(pan.codigo) === String(oferta.panel_codigo),
      );

      console.log("✅ Inversor encontrado:", inversorSeleccionado);
      console.log("✅ Batería encontrada:", bateriaSeleccionada);
      console.log("✅ Panel encontrado:", panelSeleccionado);

      // Construir el objeto de oferta incluyendo las descripciones
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

      console.log("📦 Oferta a enviar:", ofertaToSend);

      // Crear el clientData con la oferta incluida
      const clientDataWithOferta: ClienteUpdateData = {
        ...formData,
        latitud: clientLatLng.lat || undefined,
        longitud: clientLatLng.lng || undefined,
        ofertas: [ofertaToSend] as any,
      };

      if (clientDataWithOferta.estado !== "Pendiente de visita") {
        delete (clientDataWithOferta as Record<string, unknown>).motivo_visita;
      } else if (typeof clientDataWithOferta.motivo_visita === "string") {
        clientDataWithOferta.motivo_visita =
          clientDataWithOferta.motivo_visita.trim();
      }

      console.log("📤 Actualizando cliente con oferta:", clientDataWithOferta);

      await onSubmit(clientDataWithOferta);
      onOpenChange(false);
    } catch (error) {
      console.error("Error al actualizar cliente:", error);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Editar Cliente - {client.nombre}</DialogTitle>
          </DialogHeader>

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
                      Carnet de identidad
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      </SelectContent>
                    </Select>
                  </div>
                  {formData.estado === "Pendiente de visita" && (
                    <div className="md:col-span-2">
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
                                  localStorage.getItem("fuentes_excluidas") ||
                                    "[]",
                                ) as string[];
                                const nuevasExcluidas = excluidas.filter(
                                  (f) => f !== formData.fuente,
                                );
                                if (
                                  nuevasExcluidas.length !== excluidas.length
                                ) {
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

                {/* Prioridad */}
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
                        Detectando pais...
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

            {/* Sección 2: Oferta */}
            <div className="border-2 border-gray-300 rounded-lg p-6 bg-white shadow-sm">
              <div className="pb-4 mb-4 border-b-2 border-gray-200">
                <h3 className="text-xl font-bold text-gray-900">Oferta</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Detalles de productos y costos
                </p>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <MaterialSearchSelector
                      label="Inversor"
                      materials={inversores}
                      value={oferta.inversor_codigo}
                      onChange={(value) =>
                        setOferta((prev) => ({
                          ...prev,
                          inversor_codigo: value,
                        }))
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <MaterialSearchSelector
                      label="Batería"
                      materials={baterias}
                      value={oferta.bateria_codigo}
                      onChange={(value) =>
                        setOferta((prev) => ({
                          ...prev,
                          bateria_codigo: value,
                        }))
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2 p-3 border rounded-md">
                    <input
                      type="checkbox"
                      id="aprobada"
                      checked={oferta.aprobada}
                      onChange={(e) =>
                        setOferta((prev) => ({
                          ...prev,
                          aprobada: e.target.checked,
                        }))
                      }
                      className="h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <Label
                      htmlFor="aprobada"
                      className="cursor-pointer font-medium"
                    >
                      Oferta Aprobada
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 border rounded-md">
                    <input
                      type="checkbox"
                      id="pagada"
                      checked={oferta.pagada}
                      onChange={(e) =>
                        setOferta((prev) => ({
                          ...prev,
                          pagada: e.target.checked,
                        }))
                      }
                      className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <Label
                      htmlFor="pagada"
                      className="cursor-pointer font-medium"
                    >
                      Oferta Pagada
                    </Label>
                  </div>
                </div>
              </div>
            </div>

            {/* Sección 3: Costos y Pago */}
            <div className="border-2 border-gray-300 rounded-lg p-6 bg-white shadow-sm">
              <div className="pb-4 mb-4 border-b-2 border-gray-200">
                <h3 className="text-xl font-bold text-gray-900">
                  Costos y Pago
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Información financiera de la oferta
                </p>
              </div>
              <div className="space-y-4">
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
                  {formData.provincia_montaje &&
                  formData.provincia_montaje !== "La Habana" ? (
                    <div>
                      <Label htmlFor="costo_transporte">
                        Costo de Transporte
                      </Label>
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
                      onChange={(e) =>
                        handleInputChange("moneda", e.target.value)
                      }
                      className="text-gray-900 placeholder:text-gray-400"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="razon_costo_extra">
                    Razón del Costo Extra
                  </Label>
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
                onChange={(e) =>
                  handleInputChange("comentario", e.target.value)
                }
                rows={3}
                className="text-gray-900 placeholder:text-gray-400"
              />
            </div>

            {/* Botones */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
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
                  "Guardar Cambios"
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
    </>
  );
}
