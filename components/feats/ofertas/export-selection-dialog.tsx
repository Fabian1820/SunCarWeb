"use client";

/**
 * ExportSelectionDialog - Versión con checkboxes expandibles
 * IMPORTANTE: Este componente SIEMPRE debe mostrar checkboxes al lado de cada categoría
 * con flechitas expandibles para ver los materiales. NO usar versión con select.
 * Versión: 2.0 - Expandible con checkboxes
 */

import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/shared/molecule/dialog";
import { Button } from "@/components/shared/atom/button";
import { Checkbox } from "@/components/shared/molecule/checkbox";
import { Separator } from "@/components/shared/molecule/separator";
import { ExportButtons } from "@/components/shared/molecule/export-buttons";
import { apiRequest } from "@/lib/api-config";
import type { generarOpcionesExportacionOferta } from "@/lib/services/feats/ofertas/generar-opciones-exportacion-oferta";
import { useToast } from "@/hooks/use-toast";
import { EsquemaPagoSelector } from "@/components/feats/ofertas/esquema-pago-selector";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select";
import type { TipoNegocioTerminos } from "@/lib/services/feats/terminos-service";
import {
  ESQUEMA_PAGO_PERSONALIZADO,
  ESQUEMA_PAGO_POR_DEFECTO,
  ESQUEMAS_PAGO_PRESETS,
  esEsquemaPagoValido,
  identificarEsquemaPago,
  normalizarEsquemaPago,
  type EsquemaPago,
} from "@/lib/utils/esquema-pago";
import {
  ChevronDown,
  ChevronRight,
} from "lucide-react";

interface ExportSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  oferta: any;
  /**
   * Opciones ya construidas por `generarOpcionesExportacionOferta`. Es
   * obligatorio a propósito: aquí vivía una copia simplificada como respaldo
   * que había divergido de la buena (salía siempre en USD y sin fotos) y a la
   * que no llegaba ningún llamador, porque los tres pasan esto siempre.
   */
  exportOptions: ReturnType<typeof generarOpcionesExportacionOferta>;
  /**
   * Se llama tras guardar el esquema de pago (o el tipo de términos) en la
   * oferta. El padre debe refrescar su copia para que el PDF se regenere y
   * para que al reabrir el diálogo no se vea el valor viejo.
   */
  onOfertaActualizada?: (oferta: any) => void;
  /**
   * HTML de términos y condiciones BTB/BTC ya construidos (via
   * buildTerminosCondicionesHtml) por el padre. Si alguno falta, se usa el
   * que ya venía en `exportOptions` (comportamiento anterior).
   */
  terminosHtmlBTB?: string | null;
  terminosHtmlBTC?: string | null;
  /**
   * tipo_negocio del cliente/lead asociado a esta oferta. Es el valor por
   * defecto quisiera cuando la oferta todavía no tiene un override propio.
   */
  tipoNegocioCliente?: string | null;
}

export function ExportSelectionDialog({
  open,
  onOpenChange,
  oferta,
  exportOptions,
  onOfertaActualizada,
  terminosHtmlBTB,
  terminosHtmlBTC,
  tipoNegocioCliente,
}: ExportSelectionDialogProps) {
  const { toast } = useToast();

  // --- Tipo de términos y condiciones (BTB/BTC) -----------------------------
  // Se guarda en la oferta (igual que esquema_pago): así no hay que
  // reseleccionarlo cada vez que se exporta. Por defecto usa el override ya
  // guardado en la oferta, y si no tiene, el tipo_negocio del cliente/lead.
  const normalizarTipoNegocio = (
    valor: unknown,
  ): TipoNegocioTerminos | null => {
    if (typeof valor !== "string") return null;
    const tipo = valor.trim().toUpperCase();
    return tipo === "BTB" || tipo === "BTC" ? (tipo as TipoNegocioTerminos) : null;
  };
  const [tipoNegocioTerminos, setTipoNegocioTerminos] =
    useState<TipoNegocioTerminos>("BTC");
  const [guardandoTipoNegocioTerminos, setGuardandoTipoNegocioTerminos] =
    useState(false);

  useEffect(() => {
    if (!open) return;
    const sugerido =
      normalizarTipoNegocio(oferta?.tipo_negocio_terminos) ||
      normalizarTipoNegocio(tipoNegocioCliente) ||
      "BTC";
    setTipoNegocioTerminos(sugerido);
  }, [open, oferta?.id, oferta?.tipo_negocio_terminos, tipoNegocioCliente]);

  const guardarTipoNegocioTerminos = async (tipo: TipoNegocioTerminos) => {
    const anterior = tipoNegocioTerminos;
    setTipoNegocioTerminos(tipo);
    const ofertaId = oferta?.id || oferta?._id;
    if (!ofertaId) return;

    setGuardandoTipoNegocioTerminos(true);
    try {
      const response = await apiRequest<{
        success?: boolean;
        message?: string;
      }>(`/ofertas/confeccion/${ofertaId}`, {
        method: "PATCH",
        body: JSON.stringify({ tipo_negocio_terminos: tipo }),
      });

      if (response?.success === false) {
        throw new Error(
          response.message || "No se pudo guardar el tipo de términos",
        );
      }

      onOfertaActualizada?.({ ...oferta, tipo_negocio_terminos: tipo });
      toast({
        title: "Términos y condiciones actualizados",
        description: `Esta oferta usará el texto de ${tipo}.`,
      });
    } catch (error) {
      console.error("Error guardando tipo_negocio_terminos de la oferta", error);
      setTipoNegocioTerminos(anterior);
      toast({
        title: "No se pudo guardar el tipo de términos",
        description:
          error instanceof Error
            ? error.message
            : "Revisa la conexión e inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setGuardandoTipoNegocioTerminos(false);
    }
  };

  const terminosHtmlSeleccionado =
    tipoNegocioTerminos === "BTB" ? terminosHtmlBTB : terminosHtmlBTC;

  // --- Esquema de pago -----------------------------------------------------
  // Los porcentajes se guardan en la oferta, no solo en esta exportación: al
  // volver a exportar desde aquí, desde Clientes o desde Leads salen los mismos.
  const esquemaPagoOferta = normalizarEsquemaPago(oferta?.esquema_pago);
  const [esquemaPagoId, setEsquemaPagoId] = useState<string>(
    ESQUEMA_PAGO_POR_DEFECTO,
  );
  const [esquemaPagoPersonalizado, setEsquemaPagoPersonalizado] =
    useState<EsquemaPago>({
      anticipo: 50,
      entrega_suministros: 30,
      puesta_marcha: 20,
    });
  const [guardandoEsquemaPago, setGuardandoEsquemaPago] = useState(false);

  // Al abrir (o al cambiar de oferta) se parte de lo que tiene guardado.
  useEffect(() => {
    if (!open) return;
    const guardado = normalizarEsquemaPago(oferta?.esquema_pago);
    setEsquemaPagoId(identificarEsquemaPago(guardado));
    if (guardado) setEsquemaPagoPersonalizado(guardado);
  }, [open, oferta?.id, oferta?.esquema_pago]);

  const guardarEsquemaPago = async (esquema: EsquemaPago | null) => {
    const ofertaId = oferta?.id || oferta?._id;
    if (!ofertaId) return;

    setGuardandoEsquemaPago(true);
    try {
      const response = await apiRequest<{
        success?: boolean;
        message?: string;
      }>(`/ofertas/confeccion/${ofertaId}`, {
        method: "PATCH",
        body: JSON.stringify({ esquema_pago: esquema }),
      });

      if (response?.success === false) {
        throw new Error(response.message || "No se pudo guardar el esquema");
      }

      // Se parchea la oferta que ya tiene el padre en vez de usar la respuesta:
      // el backend devuelve el documento crudo (nombre_automatico, ...) y el
      // padre trabaja con la forma normalizada (nombre, ...).
      onOfertaActualizada?.({ ...oferta, esquema_pago: esquema });
      toast({
        title: "Esquema de pago guardado",
        description: esquema
          ? `La oferta usará ${esquema.anticipo} / ${esquema.entrega_suministros} / ${esquema.puesta_marcha}.`
          : "La oferta vuelve a usar el esquema de los términos y condiciones.",
      });
    } catch (error) {
      console.error("Error guardando esquema de pago de la oferta", error);
      // Se revierte el select para no dejarlo mostrando algo que no se guardó.
      setEsquemaPagoId(identificarEsquemaPago(esquemaPagoOferta));
      toast({
        title: "No se pudo guardar el esquema de pago",
        description:
          error instanceof Error
            ? error.message
            : "Revisa la conexión e inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setGuardandoEsquemaPago(false);
    }
  };

  const handleEsquemaPagoChange = (value: string) => {
    setEsquemaPagoId(value);
    if (value === ESQUEMA_PAGO_POR_DEFECTO) {
      void guardarEsquemaPago(null);
      return;
    }
    if (value === ESQUEMA_PAGO_PERSONALIZADO) {
      // El personalizado se guarda al confirmar, no en cada tecla.
      return;
    }
    const preset = ESQUEMAS_PAGO_PRESETS.find((p) => p.id === value);
    if (preset) void guardarEsquemaPago(preset.esquema);
  };

  // Agrupar items por sección
  const itemsPorSeccion = useMemo(() => {
    if (!oferta) return new Map<string, any[]>();
    const grupos = new Map<string, any[]>();

    oferta.items?.forEach((item: any) => {
      const seccion = item.seccion || "SIN_CATEGORIA";
      if (!grupos.has(seccion)) {
        grupos.set(seccion, []);
      }
      grupos.get(seccion)!.push(item);
    });

    return grupos;
  }, [oferta]);

  // Crear secciones especiales (secciones personalizadas y servicio de instalación)
  const seccionesEspeciales = useMemo(() => {
    if (!oferta) return [];
    const secciones: Array<{
      id: string;
      label: string;
      tipo: "personalizada" | "servicio";
    }> = [];

    // Agregar secciones personalizadas
    oferta.secciones_personalizadas?.forEach((s: any) => {
      secciones.push({
        id: s.id,
        label: s.label,
        tipo: "personalizada",
      });
    });

    // Agregar servicio de instalación si existe
    if (oferta.margen_instalacion && oferta.margen_instalacion > 0) {
      secciones.push({
        id: "SERVICIO_INSTALACION",
        label: "Servicio de Instalación",
        tipo: "servicio",
      });
    }

    return secciones;
  }, [oferta]);

  // Obtener labels de secciones
  const seccionLabels = useMemo(() => {
    if (!oferta) return new Map<string, string>();
    const labels = new Map<string, string>();
    const seccionesEstandar = [
      { id: "INVERSORES", label: "Inversores" },
      { id: "BATERIAS", label: "Baterías" },
      { id: "PANELES", label: "Paneles" },
      { id: "MPPT", label: "MPPT" },
      { id: "ESTRUCTURAS", label: "Estructuras" },
      { id: "CABLEADO_DC", label: "Cableado DC" },
      { id: "CABLEADO_AC", label: "Cableado AC" },
      { id: "CANALIZACION", label: "Canalización" },
      { id: "TIERRA", label: "Tierra" },
      {
        id: "PROTECCIONES_ELECTRICAS",
        label: "Protecciones Eléctricas y Gabinetes",
      },
      {
        id: "TRANSFORMADORES_MEDIDORES",
        label: "Transformadores y Medidores",
      },
      { id: "MATERIAL_VARIO", label: "Material vario" },
    ];

    seccionesEstandar.forEach((s) => labels.set(s.id, s.label));

    // Agregar secciones personalizadas
    oferta.secciones_personalizadas?.forEach((s: any) => {
      labels.set(s.id, s.label);
    });

    return labels;
  }, [oferta]);

  // Estado de selección
  const [seccionesSeleccionadas, setSeccionesSeleccionadas] = useState<
    Set<string>
  >(new Set(Array.from(itemsPorSeccion.keys())));
  const [materialesSeleccionados, setMaterialesSeleccionados] = useState<
    Set<string>
  >(
    new Set(
      oferta?.items?.map((item: any) => item.material_codigo?.toString()) || [],
    ),
  );
  const [
    seccionesEspecialesSeleccionadas,
    setSeccionesEspecialesSeleccionadas,
  ] = useState<Set<string>>(new Set(seccionesEspeciales.map((s) => s.id)));
  const [seccionesExpandidas, setSeccionesExpandidas] = useState<Set<string>>(
    new Set(),
  );

  // Actualizar selección cuando cambie la oferta
  useEffect(() => {
    if (!oferta) return;

    console.log("🔄 Actualizando selección por cambio de oferta:", {
      items_count: oferta.items?.length || 0,
      secciones_count: itemsPorSeccion.size,
      secciones_especiales_count: seccionesEspeciales.length,
    });

    setSeccionesSeleccionadas(new Set(Array.from(itemsPorSeccion.keys())));
    setMaterialesSeleccionados(
      new Set(
        oferta.items?.map((item: any) => item.material_codigo?.toString()) ||
          [],
      ),
    );
    setSeccionesEspecialesSeleccionadas(
      new Set(seccionesEspeciales.map((s) => s.id)),
    );
  }, [oferta?.id, itemsPorSeccion, seccionesEspeciales, oferta?.items]);

  // Toggle sección
  const toggleSeccion = (seccionId: string) => {
    const nuevasSeleccionadas = new Set(seccionesSeleccionadas);
    const items = itemsPorSeccion.get(seccionId) || [];

    if (nuevasSeleccionadas.has(seccionId)) {
      nuevasSeleccionadas.delete(seccionId);
      // Deseleccionar todos los materiales de esta sección
      const nuevosMateriales = new Set(materialesSeleccionados);
      items.forEach((item) =>
        nuevosMateriales.delete(item.material_codigo?.toString()),
      );
      setMaterialesSeleccionados(nuevosMateriales);
    } else {
      nuevasSeleccionadas.add(seccionId);
      // Seleccionar todos los materiales de esta sección
      const nuevosMateriales = new Set(materialesSeleccionados);
      items.forEach((item) =>
        nuevosMateriales.add(item.material_codigo?.toString()),
      );
      setMaterialesSeleccionados(nuevosMateriales);
    }

    setSeccionesSeleccionadas(nuevasSeleccionadas);
  };

  // Toggle material
  const toggleMaterial = (materialCodigo: string, seccionId: string) => {
    const nuevosMateriales = new Set(materialesSeleccionados);

    if (nuevosMateriales.has(materialCodigo)) {
      nuevosMateriales.delete(materialCodigo);
    } else {
      nuevosMateriales.add(materialCodigo);
    }

    setMaterialesSeleccionados(nuevosMateriales);

    // Actualizar estado de la sección
    const items = itemsPorSeccion.get(seccionId) || [];
    const todosSeleccionados = items.every((item) =>
      nuevosMateriales.has(item.material_codigo?.toString()),
    );

    const nuevasSeleccionadas = new Set(seccionesSeleccionadas);
    if (todosSeleccionados) {
      nuevasSeleccionadas.add(seccionId);
    } else {
      nuevasSeleccionadas.delete(seccionId);
    }
    setSeccionesSeleccionadas(nuevasSeleccionadas);
  };

  // Toggle expandir sección
  const toggleExpandir = (seccionId: string) => {
    const nuevasExpandidas = new Set(seccionesExpandidas);
    if (nuevasExpandidas.has(seccionId)) {
      nuevasExpandidas.delete(seccionId);
    } else {
      nuevasExpandidas.add(seccionId);
    }
    setSeccionesExpandidas(nuevasExpandidas);
  };

  // Seleccionar/Deseleccionar todo
  const seleccionarTodo = () => {
    setSeccionesSeleccionadas(new Set(Array.from(itemsPorSeccion.keys())));
    setMaterialesSeleccionados(
      new Set(
        oferta?.items?.map((item: any) => item.material_codigo?.toString()) ||
          [],
      ),
    );
    setSeccionesEspecialesSeleccionadas(
      new Set(seccionesEspeciales.map((s) => s.id)),
    );
  };

  const deseleccionarTodo = () => {
    setSeccionesSeleccionadas(new Set());
    setMaterialesSeleccionados(new Set());
    setSeccionesEspecialesSeleccionadas(new Set());
  };

  // Generar opciones de exportación filtradas
  const opcionesFiltradas = useMemo(() => {
    const filtrarItems = (items: any[]) => {
      console.log("🔍 Filtrando items:", {
        total_items: items.length,
        materiales_seleccionados: materialesSeleccionados.size,
        secciones_especiales_seleccionadas:
          seccionesEspecialesSeleccionadas.size,
      });

      const itemsFiltrados = items.filter((item) => {
        // Si es un item de material, verificar si está seleccionado
        if (item.material_codigo) {
          const seleccionado = materialesSeleccionados.has(
            item.material_codigo?.toString(),
          );
          if (!seleccionado) {
            console.log(
              "❌ Material NO seleccionado:",
              item.material_codigo,
              item.descripcion,
            );
          }
          return seleccionado;
        }

        // Si es servicio de instalación, verificar si está seleccionado
        if (
          item.tipo === "Servicio" ||
          item.descripcion?.includes("Servicio de instalación") ||
          item.descripcion?.includes("instalación y puesta en marcha")
        ) {
          return seccionesEspecialesSeleccionadas.has("SERVICIO_INSTALACION");
        }

        // Si es subtotal de materiales, siempre mantenerlo
        if (
          item.tipo === "Subtotal" &&
          item.descripcion?.includes("Total de materiales")
        ) {
          return true;
        }

        // Si es contribución, siempre mantenerla
        if (item.tipo === "Contribucion") {
          return true;
        }

        // Si es una sección personalizada, verificar si está seleccionada
        const seccionPersonalizada = oferta?.secciones_personalizadas?.find(
          (s: any) =>
            item.seccion === s.label || item.descripcion?.includes(s.label),
        );
        if (seccionPersonalizada) {
          return seccionesEspecialesSeleccionadas.has(seccionPersonalizada.id);
        }

        // Mantener items que no son materiales ni secciones especiales (totales, transportación, descuento, etc.)
        console.log(
          "✅ Manteniendo item no-material:",
          item.tipo,
          item.descripcion,
        );
        return true;
      });

      console.log("✅ Items después de filtrar:", itemsFiltrados.length);
      return itemsFiltrados;
    };

    console.log("🔍 DEBUG exportOptions:", {
      sinPrecios_original: exportOptions.exportOptionsSinPrecios?.sinPrecios,
      conPreciosCliente_original:
        exportOptions.exportOptionsClienteConPrecios?.conPreciosCliente,
      columns_sinPrecios: exportOptions.exportOptionsSinPrecios?.columns,
      columns_conPrecios: exportOptions.exportOptionsClienteConPrecios?.columns,
    });

    // Si el padre pasó el HTML del tipo seleccionado, sustituye al que ya
    // traía exportOptions; si no (props no provistas), se respeta el
    // original tal cual venía antes de este selector.
    const overrideTerminos = terminosHtmlSeleccionado != null
      ? { terminosCondiciones: terminosHtmlSeleccionado }
      : {};

    return {
      exportOptionsCompleto: {
        ...exportOptions.exportOptionsCompleto,
        data: filtrarItems(exportOptions.exportOptionsCompleto?.data || []),
        ...overrideTerminos,
      },
      exportOptionsSinPrecios: {
        ...exportOptions.exportOptionsSinPrecios,
        data: filtrarItems(exportOptions.exportOptionsSinPrecios?.data || []),
        ...overrideTerminos,
      },
      exportOptionsClienteConPrecios: {
        ...exportOptions.exportOptionsClienteConPrecios,
        data: filtrarItems(
          exportOptions.exportOptionsClienteConPrecios?.data || [],
        ),
        ...overrideTerminos,
      },
    };
  }, [
    exportOptions,
    materialesSeleccionados,
    seccionesEspecialesSeleccionadas,
    oferta,
    terminosHtmlSeleccionado,
  ]);

  // Debug: verificar que los términos se están pasando
  console.log("🔍 ExportSelectionDialog - Términos en exportOptions:", {
    completo: exportOptions.exportOptionsCompleto?.terminosCondiciones
      ? "SÍ"
      : "NO",
    sinPrecios: exportOptions.exportOptionsSinPrecios?.terminosCondiciones
      ? "SÍ"
      : "NO",
    clienteConPrecios: exportOptions.exportOptionsClienteConPrecios
      ?.terminosCondiciones
      ? "SÍ"
      : "NO",
  });

  // Moneda con la que se guardó la oferta. Solo se aplica si además hay tasa:
  // sin ella no se puede convertir y todo sale en USD, así que conviene decirlo
  // en vez de dejar al comercial descubrirlo al abrir el PDF.
  const monedaOferta: string = oferta?.moneda_pago || "USD";
  const tieneTasaGuardada = Number(oferta?.tasa_cambio || 0) > 0;

  const totalMaterialesSeleccionados = materialesSeleccionados.size;
  const totalMateriales = oferta?.items?.length || 0;
  const totalSeccionesEspecialesSeleccionadas =
    seccionesEspecialesSeleccionadas.size;
  const totalSeccionesEspeciales = seccionesEspeciales.length;

  // Si no hay oferta, mostrar mensaje de error
  if (!oferta) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Error</DialogTitle>
            <DialogDescription>
              No se pudo cargar la información de la oferta.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-6xl h-[85vh] flex flex-col"
        data-version="expandable-v2"
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Exportar Oferta
          </DialogTitle>
          <DialogDescription>
            Selecciona las categorías y materiales que deseas incluir en la
            exportación
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-4 pr-2">
          {/* Esquema de pago: se guarda en la oferta, no solo en este export */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <EsquemaPagoSelector
              value={esquemaPagoId}
              onValueChange={handleEsquemaPagoChange}
              personalizado={esquemaPagoPersonalizado}
              onPersonalizadoChange={setEsquemaPagoPersonalizado}
              disabled={guardandoEsquemaPago}
              hayPagosAcordados={Boolean(oferta?.formas_pago_acordadas)}
              idPrefix="export-esquema-pago"
            />
            {esquemaPagoId === ESQUEMA_PAGO_PERSONALIZADO && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-2 h-8"
                disabled={
                  guardandoEsquemaPago ||
                  !esEsquemaPagoValido(esquemaPagoPersonalizado)
                }
                onClick={() => void guardarEsquemaPago(esquemaPagoPersonalizado)}
              >
                {guardandoEsquemaPago
                  ? "Guardando..."
                  : "Guardar esquema personalizado"}
              </Button>
            )}
          </div>

          {/* Tipo de términos y condiciones: se guarda en la oferta, no solo en este export */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <label
              htmlFor="export-tipo-negocio-terminos"
              className="text-sm font-medium text-slate-700 mb-1.5 block"
            >
              Términos y condiciones a imprimir
            </label>
            <Select
              value={tipoNegocioTerminos}
              onValueChange={(value) =>
                void guardarTipoNegocioTerminos(value as TipoNegocioTerminos)
              }
              disabled={guardandoTipoNegocioTerminos}
            >
              <SelectTrigger
                id="export-tipo-negocio-terminos"
                className="h-9 bg-white"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BTC">BTC</SelectItem>
                <SelectItem value="BTB">BTB</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500 mt-1.5">
              Se guarda en la oferta: no hay que volver a elegirlo en cada
              exportación.
            </p>
          </div>

          {/* Controles de selección */}
          <div className="flex items-center justify-between gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={seleccionarTodo}
                className="h-8"
              >
                Seleccionar todo
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={deseleccionarTodo}
                className="h-8"
              >
                Deseleccionar todo
              </Button>
            </div>
            <div className="text-sm font-medium text-slate-700">
              {totalMaterialesSeleccionados} de {totalMateriales} materiales
              seleccionados
              {totalSeccionesEspeciales > 0 && (
                <span className="ml-2 text-blue-600">
                  + {totalSeccionesEspecialesSeleccionadas} de{" "}
                  {totalSeccionesEspeciales} secciones adicionales
                </span>
              )}
            </div>
          </div>

          {/* Lista de categorías y materiales */}
            <div className="space-y-2">
              {Array.from(itemsPorSeccion.entries()).map(
                ([seccionId, items]) => {
                  const seccionLabel =
                    seccionLabels.get(seccionId) || seccionId;
                  const isExpanded = seccionesExpandidas.has(seccionId);
                  const isSelected = seccionesSeleccionadas.has(seccionId);
                  const materialesEnSeccion = items.filter((item) =>
                    materialesSeleccionados.has(
                      item.material_codigo?.toString(),
                    ),
                  ).length;

                  return (
                    <div
                      key={seccionId}
                      className="border border-slate-200 rounded-lg overflow-hidden"
                    >
                      {/* Header de sección */}
                      <div className="bg-white hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3 p-3">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSeccion(seccionId)}
                            className="mt-0.5"
                          />
                          <button
                            onClick={() => toggleExpandir(seccionId)}
                            className="flex-1 flex items-center gap-2 text-left"
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-slate-500" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-slate-500" />
                            )}
                            <span className="font-semibold text-slate-900">
                              {seccionLabel}
                            </span>
                            <span className="text-sm text-slate-500">
                              ({materialesEnSeccion}/{items.length})
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* Lista de materiales */}
                      {isExpanded && (
                        <div className="bg-slate-50 border-t border-slate-200">
                          <div className="p-3 space-y-2">
                            {items.map((item) => {
                              const materialCodigo =
                                item.material_codigo?.toString();
                              const isChecked =
                                materialesSeleccionados.has(materialCodigo);

                              return (
                                <div
                                  key={materialCodigo}
                                  className="flex items-start gap-3 p-2 bg-white rounded border border-slate-200 hover:border-slate-300 transition-colors"
                                >
                                  <Checkbox
                                    checked={isChecked}
                                    onCheckedChange={() =>
                                      toggleMaterial(materialCodigo, seccionId)
                                    }
                                    className="mt-0.5"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm text-slate-900 truncate">
                                      {item.descripcion}
                                    </div>
                                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                                      <span>Código: {materialCodigo}</span>
                                      <span>•</span>
                                      <span>Cantidad: {item.cantidad}</span>
                                      <span>•</span>
                                      <span>
                                        Precio: ${item.precio.toFixed(2)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                },
              )}

              {/* Secciones especiales (personalizadas y servicio de instalación) */}
              {seccionesEspeciales.length > 0 && (
                <>
                  <div className="pt-4 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="h-px flex-1 bg-slate-200" />
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Secciones Adicionales
                      </span>
                      <div className="h-px flex-1 bg-slate-200" />
                    </div>
                  </div>

                  {seccionesEspeciales.map((seccion) => {
                    const isSelected = seccionesEspecialesSeleccionadas.has(
                      seccion.id,
                    );

                    // Obtener información específica según el tipo
                    let contenido = null;
                    let icono = null;

                    if (seccion.tipo === "servicio") {
                      const margenInstalacion = oferta.margen_instalacion || 0;
                      icono = <span className="text-lg">🔧</span>;
                      contenido = (
                        <div className="text-xs text-slate-600 mt-1">
                          <div>Precio: ${margenInstalacion.toFixed(2)}</div>
                          <div className="text-slate-500 mt-0.5">
                            Costo de instalación y puesta en marcha
                          </div>
                        </div>
                      );
                    } else if (seccion.tipo === "personalizada") {
                      const seccionData = oferta.secciones_personalizadas?.find(
                        (s: any) => s.id === seccion.id,
                      );
                      icono = <span className="text-lg">📦</span>;
                      if (
                        seccionData?.elementos &&
                        seccionData.elementos.length > 0
                      ) {
                        contenido = (
                          <div className="text-xs text-slate-600 mt-1">
                            <div>
                              {seccionData.elementos.length} elemento(s)
                            </div>
                            <div className="text-slate-500 mt-0.5">
                              Total: $
                              {seccionData.elementos
                                .reduce(
                                  (sum: number, el: any) =>
                                    sum + el.precio_unitario * el.cantidad,
                                  0,
                                )
                                .toFixed(2)}
                            </div>
                          </div>
                        );
                      }
                    }

                    return (
                      <div
                        key={seccion.id}
                        className="border border-slate-200 rounded-lg overflow-hidden bg-gradient-to-r from-blue-50 to-indigo-50"
                      >
                        <div className="bg-white/80 hover:bg-white transition-colors">
                          <div className="flex items-start gap-3 p-3">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => {
                                const nuevas = new Set(
                                  seccionesEspecialesSeleccionadas,
                                );
                                if (nuevas.has(seccion.id)) {
                                  nuevas.delete(seccion.id);
                                } else {
                                  nuevas.add(seccion.id);
                                }
                                setSeccionesEspecialesSeleccionadas(nuevas);
                              }}
                              className="mt-0.5"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                {icono}
                                <span className="font-semibold text-slate-900">
                                  {seccion.label}
                                </span>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                                  {seccion.tipo === "servicio"
                                    ? "Servicio"
                                    : "Personalizada"}
                                </span>
                              </div>
                              {contenido}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>

          <Separator />

          {/* Botones de exportación */}
          {opcionesFiltradas && (
            <div className="space-y-3">
              <div className="text-sm font-semibold text-slate-700">
                Selecciona el tipo de exportación:
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {/* Opción 1: Completo */}
                <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4 space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold">
                        1
                      </div>
                      <h4 className="text-sm font-bold text-blue-900">
                        Completo
                      </h4>
                    </div>
                    <p className="text-xs text-blue-700 leading-relaxed">
                      Incluye todos los detalles: precios unitarios, márgenes,
                      servicios y totales.
                    </p>
                  </div>
                  <ExportButtons
                    exportOptions={opcionesFiltradas.exportOptionsCompleto}
                    baseFilename={exportOptions.baseFilename || "oferta"}
                    variant="compact"
                  />
                </div>

                {/* Opción 2: Sin precios */}
                <div className="rounded-lg border-2 border-green-200 bg-green-50 p-4 space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold">
                        2
                      </div>
                      <h4 className="text-sm font-bold text-green-900">
                        Sin precios
                      </h4>
                    </div>
                    <p className="text-xs text-green-700 leading-relaxed">
                      Solo materiales y cantidades. El precio final del bloque de
                      pago va en la moneda de la oferta. Ideal para presupuestos
                      preliminares.
                    </p>
                  </div>
                  <ExportButtons
                    exportOptions={opcionesFiltradas.exportOptionsSinPrecios}
                    baseFilename={exportOptions.baseFilename || "oferta"}
                    variant="compact"
                  />
                </div>

                {/* Opción 3: Cliente con precios */}
                <div className="rounded-lg border-2 border-purple-200 bg-purple-50 p-4 space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-bold">
                        3
                      </div>
                      <h4 className="text-sm font-bold text-purple-900">
                        Cliente con precios
                      </h4>
                    </div>
                    <p className="text-xs text-purple-700 leading-relaxed">
                      Materiales con precios finales, en la moneda con la que se
                      guardó la oferta y sin mostrar la tasa. Perfecto para
                      enviar al cliente.
                    </p>
                  </div>
                  <ExportButtons
                    exportOptions={
                      opcionesFiltradas.exportOptionsClienteConPrecios
                    }
                    baseFilename={exportOptions.baseFilename || "oferta"}
                    variant="compact"
                  />
                </div>

              </div>

              {monedaOferta !== "USD" &&
                (tieneTasaGuardada ? (
                  <p className="text-xs text-slate-600 leading-relaxed rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                    Esta oferta está guardada en{" "}
                    <strong>{monedaOferta}</strong>: las dos exportaciones de
                    cliente muestran el precio final en {monedaOferta}, sin la
                    tasa de cambio. La exportación completa se mantiene en USD
                    porque es la de uso interno. Antes esto era una cuarta
                    opción aparte; ya no hace falta.
                  </p>
                ) : (
                  <p className="text-xs text-amber-800 leading-relaxed rounded-md border border-amber-300 bg-amber-50 px-3 py-2">
                    Esta oferta está en <strong>{monedaOferta}</strong> pero no
                    tiene tasa de cambio guardada, así que todo se exporta en
                    USD. Ábrela en edición, escribe la tasa y guarda para que
                    los precios salgan en {monedaOferta}.
                  </p>
                ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
