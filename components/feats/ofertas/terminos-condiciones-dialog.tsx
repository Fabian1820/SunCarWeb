"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/shared/molecule/tabs";
import { Button } from "@/components/shared/atom/button";
import { Input } from "@/components/shared/atom/input";
import { Label } from "@/components/shared/atom/label";
import { Textarea } from "@/components/shared/molecule/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, FileText, AlertCircle } from "lucide-react";
import {
  actualizarTerminos,
  crearTerminos,
  obtenerTerminosActivosCompletos,
  SECCIONES_TERMINOS,
  type SeccionTerminosKey,
  type TerminosCondicionesEditables,
  type TipoNegocioTerminos,
} from "@/lib/services/feats/terminos-service";

/**
 * Secciones tal y como salen impresas al final del PDF de la oferta.
 * El orden de este array es el orden en que se muestran en el formulario.
 */
const CAMPOS: {
  key: SeccionTerminosKey;
  label: string;
  ayuda: string;
  multilinea: boolean;
  filas?: number;
}[] = [
  {
    key: "titulo",
    label: "Título",
    ayuda: "Encabeza la sección de términos en la oferta exportada.",
    multilinea: false,
  },
  {
    key: "formas_pago",
    label: "Formas de pago",
    ayuda: "Porcentajes, momentos de cobro y monedas aceptadas.",
    multilinea: true,
    filas: 5,
  },
  {
    key: "reserva_equipos",
    label: "Reserva de equipos",
    ayuda: "Qué condiciona la reserva del material y la disponibilidad de stock.",
    multilinea: true,
    filas: 4,
  },
  {
    key: "garantia",
    label: "Garantía",
    ayuda: "Cobertura sobre la instalación y los equipos, y sus ampliaciones.",
    multilinea: true,
    filas: 4,
  },
  {
    key: "validez_presupuesto",
    label: "Validez del presupuesto",
    ayuda: "Días de vigencia y margen de reajuste por desviación técnica.",
    multilinea: true,
    filas: 4,
  },
  {
    key: "servicio_atencion_cliente",
    label: "Servicio de atención al cliente",
    ayuda: "Disponibilidad del soporte y compromiso de respuesta.",
    multilinea: true,
    filas: 4,
  },
  {
    key: "sobre_nosotros",
    label: "Sobre nosotros",
    ayuda: "Experiencia y capacidades de la empresa.",
    multilinea: true,
    filas: 4,
  },
];

const VACIO: TerminosCondicionesEditables = SECCIONES_TERMINOS.reduce(
  (acc, k) => ({ ...acc, [k]: "" }),
  {} as TerminosCondicionesEditables,
);

const ETIQUETA_TIPO: Record<TipoNegocioTerminos, string> = {
  BTB: "BTB",
  BTC: "BTC",
};

interface TerminosTabFormProps {
  tipoNegocio: TipoNegocioTerminos;
  /** El padre solo carga la pestaña activa la primera vez que se muestra. */
  activo: boolean;
  onDirtyChange: (dirty: boolean) => void;
}

/**
 * Formulario de una sola pestaña (BTB o BTC). Cada una tiene su propio
 * documento activo en el backend, independiente de la otra: cargar,
 * editar o guardar en una no afecta a la otra.
 */
function TerminosTabForm({
  tipoNegocio,
  activo,
  onDirtyChange,
}: TerminosTabFormProps) {
  const { toast } = useToast();
  const [cargando, setCargando] = useState(false);
  const [cargadoAlMenosUnaVez, setCargadoAlMenosUnaVez] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [terminosId, setTerminosId] = useState<string | null>(null);
  const [version, setVersion] = useState<number | null>(null);
  const [actualizadoEn, setActualizadoEn] = useState<string | null>(null);
  const [valores, setValores] = useState<TerminosCondicionesEditables>(VACIO);
  const [iniciales, setIniciales] = useState<TerminosCondicionesEditables>(VACIO);

  const cargar = useCallback(async () => {
    setCargando(true);
    setErrorCarga(null);
    try {
      const data = await obtenerTerminosActivosCompletos(tipoNegocio);
      if (!data) {
        // Aún no hay ninguna versión para este tipo: el formulario arranca
        // vacío y al guardar se crea la primera.
        setTerminosId(null);
        setVersion(null);
        setActualizadoEn(null);
        setValores(VACIO);
        setIniciales(VACIO);
        return;
      }
      const cargados = SECCIONES_TERMINOS.reduce(
        (acc, k) => ({ ...acc, [k]: data[k] ?? "" }),
        {} as TerminosCondicionesEditables,
      );
      setTerminosId(data.id);
      setVersion(data.version ?? null);
      setActualizadoEn(data.fecha_actualizacion ?? data.fecha_creacion ?? null);
      setValores(cargados);
      setIniciales(cargados);
    } catch (e: any) {
      setErrorCarga(e?.message ?? "No se pudieron cargar los términos y condiciones.");
    } finally {
      setCargando(false);
      setCargadoAlMenosUnaVez(true);
    }
  }, [tipoNegocio]);

  // Carga perezosa: solo la primera vez que esta pestaña se muestra.
  useEffect(() => {
    if (activo && !cargadoAlMenosUnaVez && !cargando) cargar();
  }, [activo, cargadoAlMenosUnaVez, cargando, cargar]);

  const vacios = SECCIONES_TERMINOS.filter((k) => !valores[k].trim());
  const hayCambios = SECCIONES_TERMINOS.some((k) => valores[k] !== iniciales[k]);
  const puedeGuardar = !cargando && !guardando && hayCambios && vacios.length === 0;

  useEffect(() => {
    onDirtyChange(hayCambios);
  }, [hayCambios, onDirtyChange]);

  const handleGuardar = useCallback(async (): Promise<boolean> => {
    if (!hayCambios || vacios.length > 0) return true; // nada que guardar, no bloquea el cierre
    setGuardando(true);
    try {
      const limpios = SECCIONES_TERMINOS.reduce(
        (acc, k) => ({ ...acc, [k]: valores[k].trim() }),
        {} as TerminosCondicionesEditables,
      );

      if (terminosId) {
        await actualizarTerminos(terminosId, limpios);
      } else {
        await crearTerminos(tipoNegocio, limpios);
      }

      toast({
        title: `Términos ${ETIQUETA_TIPO[tipoNegocio]} actualizados`,
        description:
          "Las próximas ofertas de este tipo que exportes ya salen con este texto. Las exportadas antes no cambian.",
      });
      setIniciales(limpios);
      setValores(limpios);
      // Recarga silenciosa: refresca versión/fecha con lo que devolvió el backend.
      await cargar();
      return true;
    } catch (e: any) {
      toast({
        title: "No se pudo guardar",
        description: e?.message ?? "Inténtalo de nuevo.",
        variant: "destructive",
      });
      return false;
    } finally {
      setGuardando(false);
    }
  }, [hayCambios, vacios.length, valores, terminosId, tipoNegocio, toast, cargar]);

  const fechaLegible = actualizadoEn
    ? new Date(actualizadoEn).toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="space-y-4">
      {version !== null && fechaLegible && (
        <p className="text-xs text-gray-500">
          Versión {version} · actualizada el {fechaLegible}
        </p>
      )}

      <div className="max-h-[52vh] overflow-y-auto pr-1 space-y-5">
        {cargando ? (
          <div className="flex items-center justify-center py-16 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Cargando términos {ETIQUETA_TIPO[tipoNegocio]}...
          </div>
        ) : errorCarga ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <p className="text-sm text-gray-600">{errorCarga}</p>
            <Button variant="outline" onClick={cargar}>
              Reintentar
            </Button>
          </div>
        ) : (
          <>
            {!terminosId && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Todavía no hay términos {ETIQUETA_TIPO[tipoNegocio]} configurados. Al
                guardar se creará la primera versión.
              </div>
            )}
            {CAMPOS.map((campo) => (
              <div key={campo.key} className="space-y-1.5">
                <Label htmlFor={`terminos-${tipoNegocio}-${campo.key}`}>
                  {campo.label}
                </Label>
                {campo.multilinea ? (
                  <Textarea
                    id={`terminos-${tipoNegocio}-${campo.key}`}
                    rows={campo.filas ?? 4}
                    value={valores[campo.key]}
                    onChange={(e) =>
                      setValores((v) => ({ ...v, [campo.key]: e.target.value }))
                    }
                    className="resize-y"
                  />
                ) : (
                  <Input
                    id={`terminos-${tipoNegocio}-${campo.key}`}
                    value={valores[campo.key]}
                    onChange={(e) =>
                      setValores((v) => ({ ...v, [campo.key]: e.target.value }))
                    }
                  />
                )}
                <p className="text-xs text-gray-500">{campo.ayuda}</p>
              </div>
            ))}
          </>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-t pt-3">
        <span className="text-xs text-gray-500">
          {vacios.length > 0
            ? `Faltan ${vacios.length} ${vacios.length === 1 ? "sección" : "secciones"} por rellenar.`
            : hayCambios
              ? "Hay cambios sin guardar en esta pestaña."
              : "Sin cambios."}
        </span>
        <Button
          onClick={handleGuardar}
          disabled={!puedeGuardar}
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {guardando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {guardando ? "Guardando..." : `Guardar ${ETIQUETA_TIPO[tipoNegocio]}`}
        </Button>
      </div>
    </div>
  );
}

interface TerminosCondicionesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TerminosCondicionesDialog({
  open,
  onOpenChange,
}: TerminosCondicionesDialogProps) {
  const [tab, setTab] = useState<TipoNegocioTerminos>("BTC");
  const [dirtyBTB, setDirtyBTB] = useState(false);
  const [dirtyBTC, setDirtyBTC] = useState(false);

  // Al abrir, siempre se empieza en BTC (la pestaña que ya existía).
  useEffect(() => {
    if (open) setTab("BTC");
  }, [open]);

  const hayCambiosSinGuardar = dirtyBTB || dirtyBTC;

  const handleCerrar = async (abierto: boolean) => {
    if (abierto) {
      onOpenChange(true);
      return;
    }
    if (hayCambiosSinGuardar) {
      const confirmar = window.confirm(
        "Tienes cambios sin guardar en los términos y condiciones. ¿Cerrar y descartarlos?",
      );
      if (!confirmar) return;
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleCerrar}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-emerald-600" />
            Términos y condiciones
          </DialogTitle>
          <DialogDescription>
            Es el texto que se imprime al final de cada oferta exportada. BTB y BTC
            tienen su propio texto: cada oferta usa el de su tipo de negocio (o el que
            se elija manualmente al exportar).
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as TipoNegocioTerminos)} className="flex-1 min-h-0 flex flex-col">
          <TabsList>
            <TabsTrigger value="BTC">
              BTC {dirtyBTC && <span className="ml-1 text-amber-500">●</span>}
            </TabsTrigger>
            <TabsTrigger value="BTB">
              BTB {dirtyBTB && <span className="ml-1 text-amber-500">●</span>}
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 min-h-0 overflow-y-auto pt-3">
            {/*
              forceMount + ocultar por CSS (en vez de dejar que Radix desmonte
              la pestaña inactiva): si no, cambiar de pestaña con ediciones sin
              guardar las perdía, porque el formulario se remonta desde cero
              cada vez que su TabsContent vuelve a activarse.
            */}
            <TabsContent value="BTC" forceMount className="mt-0 data-[state=inactive]:hidden">
              <TerminosTabForm
                tipoNegocio="BTC"
                activo={tab === "BTC"}
                onDirtyChange={setDirtyBTC}
              />
            </TabsContent>
            <TabsContent value="BTB" forceMount className="mt-0 data-[state=inactive]:hidden">
              <TerminosTabForm
                tipoNegocio="BTB"
                activo={tab === "BTB"}
                onDirtyChange={setDirtyBTB}
              />
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="border-t pt-3">
          <Button variant="outline" onClick={() => handleCerrar(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
