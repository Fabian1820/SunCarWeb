"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  Check,
  FileDown,
  Loader2,
  Minus,
  Plus,
  Printer,
  Undo2,
} from "lucide-react";
import { RouteGuard } from "@/components/auth/route-guard";
import { ModuleHeader } from "@/components/shared/organism/module-header";
import { Button } from "@/components/shared/atom/button";
import { Label } from "@/components/shared/atom/label";
import { Input } from "@/components/shared/molecule/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/shared/molecule/dropdown-menu";
import { Toaster } from "@/components/shared/molecule/toaster";
import { useToast } from "@/hooks/use-toast";
import {
  OrganigramaEditor,
  type ControlEditorOrganigrama,
} from "@/components/feats/organigramas/organigrama-editor";
import {
  OrganigramaLienzo,
  type SeleccionOrganigrama,
} from "@/components/feats/organigramas/organigrama-lienzo";
import { OrganigramaService } from "@/lib/api-services";
import type { NodoOrganigrama } from "@/lib/api-types";
import {
  contarAreas,
  plazasDeNodo,
} from "@/lib/services/feats/organigramas/organigrama-arbol";
import {
  exportarOrganigramaPdf,
  type FormatoPdfOrganigrama,
} from "@/lib/services/feats/organigramas/export-organigrama-pdf-service";
import { cn } from "@/lib/utils";

const MAX_HISTORIAL = 60;
const ESPERA_AUTOGUARDADO_MS = 1500;
/** Lo escrito seguido en un mismo campo cuenta como un solo paso de deshacer. */
const VENTANA_AGRUPAR_MS = 1500;
const ZOOMS = [0.5, 0.75, 1, 1.25, 1.5, 2];

const firmaDe = (nombre: string, raiz: NodoOrganigrama) => JSON.stringify([nombre.trim(), raiz]);

export default function OrganigramaEditorPage() {
  return (
    <RouteGuard requiredModule="organigramas">
      <EditorOrganigrama />
    </RouteGuard>
  );
}

function EditorOrganigrama() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id ?? "");
  const router = useRouter();
  const { toast } = useToast();

  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState<string | null>(null);
  const [raiz, setRaiz] = useState<NodoOrganigrama | null>(null);
  const [firmaGuardada, setFirmaGuardada] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);
  const [historial, setHistorial] = useState<NodoOrganigrama[]>([]);
  const [seleccion, setSeleccion] = useState<SeleccionOrganigrama | null>(null);
  const [zoom, setZoom] = useState<number | null>(null);
  const [vista, setVista] = useState<"editar" | "previa">("editar");

  const ultimoCambio = useRef<{ clave?: string; en: number }>({ en: 0 });
  const guardandoRef = useRef(false);
  const controlEditor = useRef<ControlEditorOrganigrama | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setErrorCarga(null);
    try {
      const organigrama = await OrganigramaService.getOrganigrama(id);
      setNombre(organigrama.nombre);
      setDescripcion(organigrama.descripcion);
      setRaiz(organigrama.raiz);
      setFirmaGuardada(firmaDe(organigrama.nombre, organigrama.raiz));
      setHistorial([]);
    } catch (error: unknown) {
      setErrorCarga(error instanceof Error ? error.message : "No se pudo cargar el organigrama.");
    } finally {
      setCargando(false);
    }
  }, [id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const firmaActual = useMemo(() => (raiz ? firmaDe(nombre, raiz) : ""), [nombre, raiz]);
  const hayCambios = raiz !== null && firmaActual !== firmaGuardada;
  const sinNombre = !nombre.trim();

  const guardar = useCallback(async () => {
    if (!raiz || guardandoRef.current || firmaActual === firmaGuardada || !nombre.trim()) return;
    guardandoRef.current = true;
    setGuardando(true);
    const enviada = firmaActual;
    try {
      await OrganigramaService.updateOrganigrama(id, {
        nombre: nombre.trim(),
        descripcion,
        raiz,
      });
      setFirmaGuardada(enviada);
      setErrorGuardado(null);
    } catch (error: unknown) {
      setErrorGuardado(error instanceof Error ? error.message : "No se pudo guardar.");
    } finally {
      guardandoRef.current = false;
      setGuardando(false);
    }
  }, [id, nombre, descripcion, raiz, firmaActual, firmaGuardada]);

  const guardarRef = useRef(guardar);
  const hayCambiosRef = useRef(false);
  useEffect(() => {
    guardarRef.current = guardar;
    hayCambiosRef.current = hayCambios;
  }, [guardar, hayCambios]);

  // Autoguardado: poco después del último cambio. Si al terminar un guardado
  // quedaron cambios hechos mientras tanto, el cambio de firmaGuardada vuelve
  // a programarlo.
  useEffect(() => {
    if (!hayCambios || sinNombre) return;
    const temporizador = window.setTimeout(() => void guardarRef.current(), ESPERA_AUTOGUARDADO_MS);
    return () => window.clearTimeout(temporizador);
  }, [firmaActual, firmaGuardada, hayCambios, sinNombre]);

  // Al salir con "Volver" no se espera al temporizador.
  useEffect(
    () => () => {
      if (hayCambiosRef.current) void guardarRef.current();
    },
    [],
  );

  useEffect(() => {
    if (!hayCambios) return;
    const avisar = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [hayCambios]);

  const cambiarRaiz = (nueva: NodoOrganigrama, clave?: string) => {
    if (!raiz || nueva === raiz) return;
    const ahora = Date.now();
    const seguido =
      !!clave &&
      clave === ultimoCambio.current.clave &&
      ahora - ultimoCambio.current.en < VENTANA_AGRUPAR_MS;
    if (!seguido) setHistorial((h) => [...h.slice(-(MAX_HISTORIAL - 1)), raiz]);
    ultimoCambio.current = { clave, en: ahora };
    setRaiz(nueva);
  };

  const deshacer = () => {
    if (!historial.length) return;
    setRaiz(historial[historial.length - 1]);
    setHistorial(historial.slice(0, -1));
    ultimoCambio.current = { en: 0 };
  };

  const deshacerRef = useRef(deshacer);
  useEffect(() => {
    deshacerRef.current = deshacer;
  });

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
      const tecla = e.key.toLowerCase();
      if (tecla === "s") {
        e.preventDefault();
        void guardarRef.current();
        return;
      }
      if (tecla === "z" && !e.shiftKey) {
        // Dentro de un campo, Ctrl+Z deshace lo escrito, como en cualquier formulario.
        const objetivo = e.target as HTMLElement | null;
        if (objetivo?.closest?.("input, textarea, [contenteditable='true']")) return;
        e.preventDefault();
        deshacerRef.current();
      }
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, []);

  const exportar = (formato: FormatoPdfOrganigrama) => {
    if (!raiz) return;
    try {
      exportarOrganigramaPdf({ nombre: nombre.trim() || "Organigrama", raiz }, formato);
    } catch (error: unknown) {
      toast({
        title: "No se pudo exportar el PDF",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    }
  };

  const irAElemento = (destino: SeleccionOrganigrama) => {
    setSeleccion(destino);
    setVista("editar");
    controlEditor.current?.enfocar(destino);
  };

  const cambiarZoom = (sentido: 1 | -1) =>
    setZoom((actual) => {
      if (actual === null) return sentido > 0 ? 1 : 0.75;
      const i = ZOOMS.indexOf(actual);
      return ZOOMS[Math.min(ZOOMS.length - 1, Math.max(0, i + sentido))];
    });

  const estado = sinNombre
    ? { Icono: AlertCircle, texto: "Ponle nombre para guardar", clase: "text-amber-700", gira: false }
    : errorGuardado
      ? { Icono: AlertCircle, texto: "No se guardó", clase: "text-red-600", gira: false }
      : guardando || hayCambios
        ? { Icono: Loader2, texto: "Guardando…", clase: "text-gray-500", gira: true }
        : { Icono: Check, texto: "Guardado", clase: "text-green-700", gira: false };

  return (
    <div className="min-h-screen bg-gray-50">
      <ModuleHeader
        title={nombre.trim() || "Organigrama"}
        subtitle="Organigramas por área"
        backHref="/organigramas"
        backLabel="Volver a Organigramas"
        actions={
          raiz ? (
            <>
              <Button
                variant="outline"
                onClick={deshacer}
                disabled={!historial.length}
                title="Deshacer (Ctrl+Z)"
                aria-label="Deshacer"
              >
                <Undo2 className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Deshacer</span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button aria-label="Exportar a PDF">
                    <FileDown className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Exportar PDF</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => exportar("presentacion")}>
                    <FileDown className="mr-2 h-4 w-4" />
                    Presentación 16:9
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => exportar("carta")}>
                    <Printer className="mr-2 h-4 w-4" />
                    Carta horizontal, para imprimir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : null
        }
      />

      <main className="content-with-fixed-header mx-auto max-w-[1600px] px-4 pb-10 sm:px-6 lg:px-8">
        {cargando ? (
          <div className="py-24 text-center">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-gray-500" />
            <p className="mt-3 text-sm text-gray-600">Cargando organigrama…</p>
          </div>
        ) : errorCarga || !raiz ? (
          <div className="mx-auto max-w-md py-24 text-center">
            <p className="font-medium text-gray-900">No se pudo abrir el organigrama</p>
            <p className="mt-1 text-sm text-gray-600">{errorCarga}</p>
            <div className="mt-4 flex justify-center gap-2">
              <Button variant="outline" onClick={() => router.push("/organigramas")}>
                Volver
              </Button>
              <Button onClick={cargar}>Reintentar</Button>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <Label htmlFor="organigrama-nombre" className="text-xs font-medium text-gray-600">
                  Nombre del organigrama
                </Label>
                <Input
                  id="organigrama-nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej.: Ventas, Instaladora"
                  maxLength={120}
                  className="mt-1 h-10 text-base font-semibold"
                />
              </div>
              <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
                <Dato etiqueta="Áreas" valor={contarAreas(raiz)} />
                <Dato etiqueta="Plazas" valor={plazasDeNodo(raiz)} />
                <p
                  role="status"
                  aria-live="polite"
                  className={cn("flex items-center gap-1.5 pb-1 text-sm", estado.clase)}
                  title={errorGuardado ?? undefined}
                >
                  <estado.Icono className={cn("h-4 w-4", estado.gira && "animate-spin")} />
                  {estado.texto}
                  {errorGuardado && !sinNombre && (
                    <button
                      type="button"
                      onClick={() => void guardar()}
                      className="font-medium underline underline-offset-2"
                    >
                      Reintentar
                    </button>
                  )}
                </p>
              </div>
            </div>

            <div className="mb-3 grid grid-cols-2 gap-1 rounded-lg bg-gray-200/70 p-1 lg:hidden" role="tablist">
              {(["editar", "previa"] as const).map((opcion) => (
                <button
                  key={opcion}
                  type="button"
                  role="tab"
                  aria-selected={vista === opcion}
                  onClick={() => setVista(opcion)}
                  className={cn(
                    "rounded-md py-1.5 text-sm font-medium",
                    vista === opcion ? "bg-white text-gray-900 shadow-sm" : "text-gray-600",
                  )}
                >
                  {opcion === "editar" ? "Editar" : "Vista previa"}
                </button>
              ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(360px,440px)_minmax(0,1fr)] lg:items-start">
              <div className={cn(vista !== "editar" && "hidden lg:block")}>
                <p className="mb-2 text-xs text-gray-500">
                  Enter en un cargo crea el siguiente. Toca una caja de la vista previa para ir a
                  ella.
                </p>
                <OrganigramaEditor
                  raiz={raiz}
                  onChange={cambiarRaiz}
                  onEnfocar={setSeleccion}
                  controlRef={controlEditor}
                />
              </div>

              <section
                aria-label="Vista previa"
                className={cn(
                  "rounded-lg border border-gray-200 bg-white lg:sticky",
                  vista !== "previa" && "hidden lg:block",
                )}
                style={{ top: "calc(var(--module-header-height, 80px) + 16px)" }}
              >
                <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-3 py-2">
                  <span className="text-sm font-medium text-gray-700">Vista previa</span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => cambiarZoom(-1)}
                      disabled={zoom === ZOOMS[0]}
                      aria-label="Alejar"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 min-w-[4.5rem] tabular-nums"
                      onClick={() => setZoom(null)}
                      title="Ajustar al ancho"
                    >
                      {zoom === null ? "Ajustar" : `${Math.round(zoom * 100)} %`}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => cambiarZoom(1)}
                      disabled={zoom === ZOOMS[ZOOMS.length - 1]}
                      aria-label="Acercar"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div
                  className="overflow-auto p-3"
                  style={{ maxHeight: "calc(100vh - var(--module-header-height, 80px) - 96px)" }}
                >
                  <OrganigramaLienzo
                    raiz={raiz}
                    titulo={nombre}
                    escala={zoom ?? undefined}
                    className={zoom === null ? "block h-auto w-full" : "block max-w-none"}
                    seleccion={seleccion}
                    onSeleccionar={irAElemento}
                  />
                </div>
              </section>
            </div>
          </>
        )}
      </main>

      <Toaster />
    </div>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: number }) {
  return (
    <div>
      <div className="text-xs text-gray-500">{etiqueta}</div>
      <div className="text-lg font-semibold tabular-nums text-gray-900">{valor}</div>
    </div>
  );
}
