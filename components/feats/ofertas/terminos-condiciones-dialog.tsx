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
import { Switch } from "@/components/shared/molecule/switch";
import { Textarea } from "@/components/shared/molecule/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, FileText, AlertCircle, Plus, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select";
import {
  actualizarTerminos,
  agregarSeccionPersonalizada,
  agregarVarianteSeccion,
  agregarVarianteSeccionFija,
  alternarSeccionFija,
  crearTerminos,
  editarSeccionPersonalizada,
  editarVarianteSeccion,
  editarVarianteSeccionFija,
  eliminarSeccionPersonalizada,
  eliminarVarianteSeccion,
  eliminarVarianteSeccionFija,
  etiquetaDeClaveSeccion,
  obtenerTerminosActivosCompletos,
  SECCIONES_FIJAS_KEYS,
  SECCIONES_TERMINOS,
  type SeccionFijaKey,
  type SeccionPersonalizada,
  type SeccionTerminosKey,
  type TerminosCondiciones,
  type TerminosCondicionesEditables,
  type TipoNegocioTerminos,
  type VarianteSeccionPersonalizada,
} from "@/lib/services/feats/terminos-service";

/** Sentinel de UI para "insertar al final"; el backend lo entiende como
 * `insertar_despues` sin pasar (undefined), que ya es su default. */
const INSERTAR_AL_FINAL = "__fin__";
// Radix Select prohíbe value="" en un Item (lo reserva para "sin selección"),
// así que "al principio" también necesita su propio sentinel no vacío.
const INSERTAR_AL_PRINCIPIO = "__inicio__";

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

interface VarianteEditorProps {
  terminosId: string;
  seccionId: string;
  identificadorOriginal: string;
  texto: string;
  puedeEliminar: boolean;
  onCambio: (terminos: TerminosCondiciones) => void;
}

/**
 * Una variante de una sección personalizada. El identificador es a la vez la
 * etiqueta que ve el comercial al exportar Y la clave con la que el backend
 * la referencia — por eso se edita y se guarda junto con el texto, en el
 * mismo botón, y no hay autosave por blur: cambiarlo a mitad de escribir
 * dispararía guardados con un identificador a medio terminar.
 */
function VarianteEditor({
  terminosId,
  seccionId,
  identificadorOriginal,
  texto: textoOriginal,
  puedeEliminar,
  onCambio,
}: VarianteEditorProps) {
  const { toast } = useToast();
  const [identificador, setIdentificador] = useState(identificadorOriginal);
  const [texto, setTexto] = useState(textoOriginal);
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  useEffect(() => {
    setIdentificador(identificadorOriginal);
    setTexto(textoOriginal);
  }, [identificadorOriginal, textoOriginal]);

  const hayCambios =
    identificador.trim() !== identificadorOriginal || texto.trim() !== textoOriginal;

  const guardar = async () => {
    const nuevoId = identificador.trim();
    const nuevoTexto = texto.trim();
    if (!nuevoId || !nuevoTexto) return;
    setGuardando(true);
    try {
      const actualizado = await editarVarianteSeccion(terminosId, seccionId, identificadorOriginal, {
        identificador: nuevoId !== identificadorOriginal ? nuevoId : undefined,
        texto: nuevoTexto !== textoOriginal ? nuevoTexto : undefined,
      });
      onCambio(actualizado);
    } catch (e: any) {
      toast({
        title: "No se pudo guardar la variante",
        description: e?.message ?? "Inténtalo de nuevo.",
        variant: "destructive",
      });
      setIdentificador(identificadorOriginal);
      setTexto(textoOriginal);
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async () => {
    if (!window.confirm(`¿Eliminar la variante "${identificadorOriginal}"?`)) return;
    setEliminando(true);
    try {
      const actualizado = await eliminarVarianteSeccion(terminosId, seccionId, identificadorOriginal);
      onCambio(actualizado);
    } catch (e: any) {
      toast({
        title: "No se pudo eliminar la variante",
        description: e?.message ?? "Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setEliminando(false);
    }
  };

  return (
    <div className="space-y-1.5 rounded border border-gray-200 bg-white p-2">
      <div className="flex items-center gap-2">
        <Input
          className="h-8 text-sm"
          value={identificador}
          onChange={(e) => setIdentificador(e.target.value)}
          placeholder="Identificador (ej. Estándar, Zona oriental)"
          disabled={guardando}
        />
        {puedeEliminar && (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 shrink-0 p-0 text-red-600 hover:bg-red-50"
            onClick={eliminar}
            disabled={eliminando || guardando}
            aria-label={`Eliminar variante ${identificadorOriginal}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      <Textarea
        className="resize-y text-sm"
        rows={3}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        disabled={guardando}
      />
      {hayCambios && (
        <Button size="sm" className="h-7 text-xs" onClick={guardar} disabled={guardando}>
          {guardando && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />}
          Guardar variante
        </Button>
      )}
    </div>
  );
}

interface SeccionPersonalizadaCardProps {
  terminosId: string;
  seccion: SeccionPersonalizada;
  onCambio: (terminos: TerminosCondiciones) => void;
}

function SeccionPersonalizadaCard({
  terminosId,
  seccion,
  onCambio,
}: SeccionPersonalizadaCardProps) {
  const { toast } = useToast();
  const [titulo, setTitulo] = useState(seccion.titulo);
  const [guardandoTitulo, setGuardandoTitulo] = useState(false);
  const [guardandoActiva, setGuardandoActiva] = useState(false);
  const [eliminandoSeccion, setEliminandoSeccion] = useState(false);
  const [nuevaVarianteAbierta, setNuevaVarianteAbierta] = useState(false);
  const [nuevoIdentificador, setNuevoIdentificador] = useState("");
  const [nuevoTexto, setNuevoTexto] = useState("");
  const [guardandoVariante, setGuardandoVariante] = useState(false);

  useEffect(() => setTitulo(seccion.titulo), [seccion.titulo]);

  const guardarTitulo = async () => {
    const nuevo = titulo.trim();
    if (!nuevo || nuevo === seccion.titulo) return;
    setGuardandoTitulo(true);
    try {
      const actualizado = await editarSeccionPersonalizada(terminosId, seccion.id, {
        titulo: nuevo,
      });
      onCambio(actualizado);
    } catch (e: any) {
      toast({
        title: "No se pudo renombrar la sección",
        description: e?.message ?? "Inténtalo de nuevo.",
        variant: "destructive",
      });
      setTitulo(seccion.titulo);
    } finally {
      setGuardandoTitulo(false);
    }
  };

  const alternarActiva = async () => {
    setGuardandoActiva(true);
    try {
      const actualizado = await editarSeccionPersonalizada(terminosId, seccion.id, {
        activa: !seccion.activa,
      });
      onCambio(actualizado);
    } catch (e: any) {
      toast({
        title: "No se pudo cambiar el estado de la sección",
        description: e?.message ?? "Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setGuardandoActiva(false);
    }
  };

  const eliminarSeccion = async () => {
    if (
      !window.confirm(
        `¿Eliminar la sección "${seccion.titulo}" con todas sus variantes? No se puede deshacer.`,
      )
    )
      return;
    setEliminandoSeccion(true);
    try {
      const actualizado = await eliminarSeccionPersonalizada(terminosId, seccion.id);
      onCambio(actualizado);
    } catch (e: any) {
      toast({
        title: "No se pudo eliminar la sección",
        description: e?.message ?? "Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setEliminandoSeccion(false);
    }
  };

  const agregarVariante = async () => {
    const identificador = nuevoIdentificador.trim();
    const texto = nuevoTexto.trim();
    if (!identificador || !texto) return;
    setGuardandoVariante(true);
    try {
      const actualizado = await agregarVarianteSeccion(
        terminosId,
        seccion.id,
        identificador,
        texto,
      );
      onCambio(actualizado);
      setNuevoIdentificador("");
      setNuevoTexto("");
      setNuevaVarianteAbierta(false);
    } catch (e: any) {
      toast({
        title: "No se pudo agregar la variante",
        description: e?.message ?? "Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setGuardandoVariante(false);
    }
  };

  return (
    <div className="space-y-3 rounded-md border border-gray-200 bg-gray-50/60 p-3">
      <div className="flex items-start gap-2">
        <Input
          className="flex-1"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          onBlur={guardarTitulo}
          disabled={guardandoTitulo}
        />
        <div className="flex shrink-0 items-center gap-1.5 pt-2">
          <Switch
            checked={seccion.activa}
            onCheckedChange={alternarActiva}
            disabled={guardandoActiva}
            aria-label={seccion.activa ? "Sección activa" : "Sección apagada"}
          />
          <span className="text-xs text-gray-500">
            {seccion.activa ? "Activa" : "Apagada"}
          </span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 shrink-0 p-0 text-red-600 hover:bg-red-50"
          onClick={eliminarSeccion}
          disabled={eliminandoSeccion}
          aria-label={`Eliminar sección ${seccion.titulo}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2 pl-1">
        {seccion.variantes.map((variante) => (
          <VarianteEditor
            key={variante.identificador}
            terminosId={terminosId}
            seccionId={seccion.id}
            identificadorOriginal={variante.identificador}
            texto={variante.texto}
            puedeEliminar={seccion.variantes.length > 1}
            onCambio={onCambio}
          />
        ))}
      </div>

      {nuevaVarianteAbierta ? (
        <div className="space-y-2 rounded border border-dashed border-gray-300 p-2">
          <Input
            className="h-8 text-sm"
            placeholder="Identificador (ej. Zona oriental)"
            value={nuevoIdentificador}
            onChange={(e) => setNuevoIdentificador(e.target.value)}
            disabled={guardandoVariante}
          />
          <Textarea
            className="text-sm"
            rows={3}
            placeholder="Texto de esta variante"
            value={nuevoTexto}
            onChange={(e) => setNuevoTexto(e.target.value)}
            disabled={guardandoVariante}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={agregarVariante}
              disabled={guardandoVariante || !nuevoIdentificador.trim() || !nuevoTexto.trim()}
            >
              {guardandoVariante && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />}
              Guardar variante
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => setNuevaVarianteAbierta(false)}
              disabled={guardandoVariante}
            >
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          onClick={() => setNuevaVarianteAbierta(true)}
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          Agregar variante
        </Button>
      )}
    </div>
  );
}

interface VarianteEditorFijaProps {
  terminosId: string;
  clave: SeccionFijaKey;
  identificadorOriginal: string;
  texto: string;
  puedeEliminar: boolean;
  onCambio: (terminos: TerminosCondiciones) => void;
}

/** Igual que VarianteEditor, pero para una de las 6 secciones fijas. */
function VarianteEditorFija({
  terminosId,
  clave,
  identificadorOriginal,
  texto: textoOriginal,
  puedeEliminar,
  onCambio,
}: VarianteEditorFijaProps) {
  const { toast } = useToast();
  const [identificador, setIdentificador] = useState(identificadorOriginal);
  const [texto, setTexto] = useState(textoOriginal);
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  useEffect(() => {
    setIdentificador(identificadorOriginal);
    setTexto(textoOriginal);
  }, [identificadorOriginal, textoOriginal]);

  const hayCambios =
    identificador.trim() !== identificadorOriginal || texto.trim() !== textoOriginal;

  const guardar = async () => {
    const nuevoId = identificador.trim();
    const nuevoTexto = texto.trim();
    if (!nuevoId || !nuevoTexto) return;
    setGuardando(true);
    try {
      const actualizado = await editarVarianteSeccionFija(terminosId, clave, identificadorOriginal, {
        identificador: nuevoId !== identificadorOriginal ? nuevoId : undefined,
        texto: nuevoTexto !== textoOriginal ? nuevoTexto : undefined,
      });
      onCambio(actualizado);
    } catch (e: any) {
      toast({
        title: "No se pudo guardar la variante",
        description: e?.message ?? "Inténtalo de nuevo.",
        variant: "destructive",
      });
      setIdentificador(identificadorOriginal);
      setTexto(textoOriginal);
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async () => {
    if (!window.confirm(`¿Eliminar la variante "${identificadorOriginal}"?`)) return;
    setEliminando(true);
    try {
      const actualizado = await eliminarVarianteSeccionFija(terminosId, clave, identificadorOriginal);
      onCambio(actualizado);
    } catch (e: any) {
      toast({
        title: "No se pudo eliminar la variante",
        description: e?.message ?? "Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setEliminando(false);
    }
  };

  return (
    <div className="space-y-1.5 rounded border border-gray-200 bg-white p-2">
      <div className="flex items-center gap-2">
        <Input
          className="h-8 text-sm"
          value={identificador}
          onChange={(e) => setIdentificador(e.target.value)}
          placeholder="Identificador (ej. Estándar, Zona oriental)"
          disabled={guardando}
        />
        {puedeEliminar && (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 shrink-0 p-0 text-red-600 hover:bg-red-50"
            onClick={eliminar}
            disabled={eliminando || guardando}
            aria-label={`Eliminar variante ${identificadorOriginal}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      <Textarea
        className="resize-y text-sm"
        rows={3}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        disabled={guardando}
      />
      {hayCambios && (
        <Button size="sm" className="h-7 text-xs" onClick={guardar} disabled={guardando}>
          {guardando && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />}
          Guardar variante
        </Button>
      )}
    </div>
  );
}

interface VariantesSeccionFijaProps {
  terminosId: string;
  clave: SeccionFijaKey;
  variantes: VarianteSeccionPersonalizada[];
  onCambio: (terminos: TerminosCondiciones) => void;
}

/**
 * Bloque de variantes de una sección fija (formas_pago, garantia...), para
 * mostrar debajo de su Textarea de siempre. Sin variantes agregadas, solo
 * muestra el botón "Agregar variante"; la primera vez que se agrega una, el
 * backend preserva el texto que ya tenía como variante "Estándar".
 */
function VariantesSeccionFija({
  terminosId,
  clave,
  variantes,
  onCambio,
}: VariantesSeccionFijaProps) {
  const { toast } = useToast();
  const [abierta, setAbierta] = useState(false);
  const [identificador, setIdentificador] = useState("");
  const [texto, setTexto] = useState("");
  const [guardando, setGuardando] = useState(false);

  const agregar = async () => {
    const id = identificador.trim();
    const txt = texto.trim();
    if (!id || !txt) return;
    setGuardando(true);
    try {
      const actualizado = await agregarVarianteSeccionFija(terminosId, clave, id, txt);
      onCambio(actualizado);
      setIdentificador("");
      setTexto("");
      setAbierta(false);
    } catch (e: any) {
      toast({
        title: "No se pudo agregar la variante",
        description: e?.message ?? "Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-2 rounded-md border border-dashed border-gray-200 bg-gray-50/60 p-2">
      {variantes.length > 0 && (
        <div className="space-y-2">
          {variantes.map((variante) => (
            <VarianteEditorFija
              key={variante.identificador}
              terminosId={terminosId}
              clave={clave}
              identificadorOriginal={variante.identificador}
              texto={variante.texto}
              puedeEliminar={variantes.length > 1}
              onCambio={onCambio}
            />
          ))}
        </div>
      )}

      {abierta ? (
        <div className="space-y-2">
          <Input
            className="h-8 text-sm"
            placeholder="Identificador (ej. Zona oriental)"
            value={identificador}
            onChange={(e) => setIdentificador(e.target.value)}
            disabled={guardando}
          />
          <Textarea
            className="text-sm"
            rows={3}
            placeholder="Texto de esta variante"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            disabled={guardando}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={agregar}
              disabled={guardando || !identificador.trim() || !texto.trim()}
            >
              {guardando && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />}
              Guardar variante
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => setAbierta(false)}
              disabled={guardando}
            >
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setAbierta(true)}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          {variantes.length > 0 ? "Agregar otra variante" : "Agregar variante"}
        </Button>
      )}
    </div>
  );
}

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
  const [seccionesPersonalizadas, setSeccionesPersonalizadas] = useState<
    SeccionPersonalizada[]
  >([]);
  const [ordenSecciones, setOrdenSecciones] = useState<string[]>([]);
  const [seccionesFijasDesactivadas, setSeccionesFijasDesactivadas] = useState<
    string[]
  >([]);
  const [variantesSeccionesFijas, setVariantesSeccionesFijas] = useState<
    Record<string, VarianteSeccionPersonalizada[]>
  >({});
  const [guardandoSeccionFija, setGuardandoSeccionFija] = useState<string | null>(
    null,
  );
  const [nuevaSeccionAbierta, setNuevaSeccionAbierta] = useState(false);
  const [nuevoTituloSeccion, setNuevoTituloSeccion] = useState("");
  const [nuevoTextoSeccion, setNuevoTextoSeccion] = useState("");
  const [nuevaSeccionInsertarDespues, setNuevaSeccionInsertarDespues] =
    useState<string>(INSERTAR_AL_FINAL);
  const [guardandoNuevaSeccion, setGuardandoNuevaSeccion] = useState(false);

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
        setSeccionesPersonalizadas([]);
        setOrdenSecciones([]);
        setSeccionesFijasDesactivadas([]);
        setVariantesSeccionesFijas({});
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
      setSeccionesPersonalizadas(data.secciones_personalizadas ?? []);
      setOrdenSecciones(data.orden_secciones ?? []);
      setSeccionesFijasDesactivadas(data.secciones_fijas_desactivadas ?? []);
      setVariantesSeccionesFijas(data.variantes_secciones_fijas ?? {});
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
            {CAMPOS.map((campo) => {
              const esFijaAlternable = SECCIONES_FIJAS_KEYS.includes(
                campo.key as SeccionFijaKey,
              );
              const desactivada = seccionesFijasDesactivadas.includes(campo.key);
              return (
              <div key={campo.key} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor={`terminos-${tipoNegocio}-${campo.key}`}>
                    {campo.label}
                  </Label>
                  {esFijaAlternable && (
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Switch
                        checked={!desactivada}
                        onCheckedChange={async (checked) => {
                          if (!terminosId) return;
                          setGuardandoSeccionFija(campo.key);
                          try {
                            const actualizado = await alternarSeccionFija(
                              terminosId,
                              campo.key as SeccionFijaKey,
                              checked,
                            );
                            setSeccionesFijasDesactivadas(
                              actualizado.secciones_fijas_desactivadas,
                            );
                          } catch (e: any) {
                            toast({
                              title: "No se pudo cambiar el estado de la sección",
                              description: e?.message ?? "Inténtalo de nuevo.",
                              variant: "destructive",
                            });
                          } finally {
                            setGuardandoSeccionFija(null);
                          }
                        }}
                        disabled={!terminosId || guardandoSeccionFija === campo.key}
                        aria-label={desactivada ? "Sección apagada" : "Sección activa"}
                      />
                      <span className="text-xs text-gray-500">
                        {desactivada ? "Apagada" : "Activa"}
                      </span>
                    </div>
                  )}
                </div>
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
                {esFijaAlternable && terminosId && (
                  <VariantesSeccionFija
                    terminosId={terminosId}
                    clave={campo.key as SeccionFijaKey}
                    variantes={variantesSeccionesFijas[campo.key] ?? []}
                    onCambio={(terminos) => {
                      setVariantesSeccionesFijas(terminos.variantes_secciones_fijas);
                      setValores((v) => ({
                        ...v,
                        [campo.key]: terminos[campo.key as SeccionFijaKey] ?? v[campo.key],
                      }));
                      setIniciales((v) => ({
                        ...v,
                        [campo.key]: terminos[campo.key as SeccionFijaKey] ?? v[campo.key],
                      }));
                    }}
                  />
                )}
              </div>
              );
            })}

            <div className="space-y-3 border-t pt-4">
              <div>
                <Label className="text-sm font-medium text-gray-800">
                  Secciones adicionales
                </Label>
                <p className="text-xs text-gray-500">
                  Además de las 7 de arriba. Cada una puede tener varias variantes
                  de texto (con un identificador cada una) para elegir cuál
                  imprimir al exportar la oferta.
                </p>
              </div>

              {!terminosId ? (
                <p className="text-xs text-amber-700">
                  Guarda primero los campos de arriba: hace falta crear la versión
                  {` ${ETIQUETA_TIPO[tipoNegocio]}`} antes de poder agregar secciones.
                </p>
              ) : (
                <>
                  {/* En el orden real de impresión, no el de creación: si no,
                      "insertar después de X" quedaría visualmente inconsistente
                      con dónde termina apareciendo la sección en el export. */}
                  {[...seccionesPersonalizadas]
                    .sort(
                      (a, b) =>
                        ordenSecciones.indexOf(a.id) - ordenSecciones.indexOf(b.id),
                    )
                    .map((seccion) => (
                    <SeccionPersonalizadaCard
                      key={seccion.id}
                      terminosId={terminosId}
                      seccion={seccion}
                      onCambio={(terminos) => {
                        setSeccionesPersonalizadas(terminos.secciones_personalizadas);
                        setOrdenSecciones(terminos.orden_secciones);
                      }}
                    />
                  ))}

                  {nuevaSeccionAbierta ? (
                    <div className="space-y-2 rounded-md border border-dashed border-gray-300 p-3">
                      <div className="space-y-1.5">
                        <Label htmlFor={`nueva-seccion-titulo-${tipoNegocio}`}>
                          Título de la sección
                        </Label>
                        <Input
                          id={`nueva-seccion-titulo-${tipoNegocio}`}
                          value={nuevoTituloSeccion}
                          onChange={(e) => setNuevoTituloSeccion(e.target.value)}
                          placeholder="Ej: Transporte del equipo"
                          disabled={guardandoNuevaSeccion}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`nueva-seccion-texto-${tipoNegocio}`}>
                          Texto
                        </Label>
                        <Textarea
                          id={`nueva-seccion-texto-${tipoNegocio}`}
                          rows={4}
                          value={nuevoTextoSeccion}
                          onChange={(e) => setNuevoTextoSeccion(e.target.value)}
                          className="resize-y"
                          disabled={guardandoNuevaSeccion}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`nueva-seccion-ubicacion-${tipoNegocio}`}>
                          Ubicación
                        </Label>
                        <Select
                          value={nuevaSeccionInsertarDespues}
                          onValueChange={setNuevaSeccionInsertarDespues}
                          disabled={guardandoNuevaSeccion}
                        >
                          <SelectTrigger id={`nueva-seccion-ubicacion-${tipoNegocio}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={INSERTAR_AL_PRINCIPIO}>Al principio</SelectItem>
                            {ordenSecciones.map((clave) => (
                              <SelectItem key={clave} value={clave}>
                                Después de: {etiquetaDeClaveSeccion(clave, {
                                  secciones_personalizadas: seccionesPersonalizadas,
                                })}
                              </SelectItem>
                            ))}
                            <SelectItem value={INSERTAR_AL_FINAL}>Al final</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          disabled={
                            guardandoNuevaSeccion ||
                            !nuevoTituloSeccion.trim() ||
                            !nuevoTextoSeccion.trim()
                          }
                          onClick={async () => {
                            setGuardandoNuevaSeccion(true);
                            try {
                              const actualizado = await agregarSeccionPersonalizada(
                                terminosId,
                                nuevoTituloSeccion.trim(),
                                nuevoTextoSeccion.trim(),
                                nuevaSeccionInsertarDespues === INSERTAR_AL_FINAL
                                  ? undefined
                                  : nuevaSeccionInsertarDespues === INSERTAR_AL_PRINCIPIO
                                    ? ""
                                    : nuevaSeccionInsertarDespues,
                              );
                              setSeccionesPersonalizadas(
                                actualizado.secciones_personalizadas,
                              );
                              setOrdenSecciones(actualizado.orden_secciones);
                              setNuevoTituloSeccion("");
                              setNuevoTextoSeccion("");
                              setNuevaSeccionInsertarDespues(INSERTAR_AL_FINAL);
                              setNuevaSeccionAbierta(false);
                            } catch (e: any) {
                              toast({
                                title: "No se pudo agregar la sección",
                                description: e?.message ?? "Inténtalo de nuevo.",
                                variant: "destructive",
                              });
                            } finally {
                              setGuardandoNuevaSeccion(false);
                            }
                          }}
                        >
                          {guardandoNuevaSeccion && (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          )}
                          Guardar sección
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setNuevaSeccionAbierta(false);
                            setNuevaSeccionInsertarDespues(INSERTAR_AL_FINAL);
                          }}
                          disabled={guardandoNuevaSeccion}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setNuevaSeccionAbierta(true)}
                    >
                      <Plus className="mr-1.5 h-4 w-4" />
                      Agregar sección
                    </Button>
                  )}
                </>
              )}
            </div>
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
