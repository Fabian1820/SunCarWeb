"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, Check, ChevronLeft, ClipboardList, Loader2, Plus } from "lucide-react";
import { ModuleHeader } from "@/components/shared/organism/module-header";
import { RouteGuard } from "@/components/auth/route-guard";
import { Button } from "@/components/shared/atom/button";
import { SearchableSelect } from "@/components/shared/molecule/searchable-select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { PlanificacionService } from "@/lib/services/feats/planificacion/planificacion-service";
import { BrigadaService } from "@/lib/services/feats/brigade/brigada-service";
import { CarrilBrigada } from "@/components/feats/planificacion/carril-brigada";
import { InicioPlanificacion } from "@/components/feats/planificacion/inicio-planificacion";
import { MenuDia } from "@/components/feats/planificacion/menu-dia";
import { NuevoTrabajoDialog } from "@/components/feats/planificacion/nuevo-trabajo-dialog";
import {
  PlanificarPorMapa,
  type Seleccionado,
} from "@/components/feats/planificacion/planificar-por-mapa";
import {
  SelectorTrabajos,
  claveCandidato,
  claveTrabajo,
} from "@/components/feats/planificacion/selector-trabajos";
import {
  delDia,
  desplazar,
  diaCorto,
  esFechaIso,
  isoLocal,
  nombreDia,
} from "@/components/feats/planificacion/fechas";
import type {
  Asignado,
  CandidatoPlanificacion,
  TipoTrabajo,
  TrabajoPlanificado,
} from "@/lib/types/feats/planificacion/planificacion-types";

type EstadoGuardado = "guardado" | "pendiente" | "guardando" | "error";

interface Brigada {
  asignado: Asignado;
  /** El _id de la colección: planes viejos se guardaron con él. */
  idViejo: string;
  /** Los demás integrantes, sin el líder. */
  integrantes: string[];
}

/** Lo que se planifica desde el menú del día. Actualización va por el buscador del plan. */
const TIPOS_DEL_MENU: TipoTrabajo[] = ["visita", "instalacion_nueva", "instalacion_en_proceso", "averia"];

const TITULO_TIPO: Record<TipoTrabajo, string> = {
  visita: "Visitas",
  instalacion_nueva: "Instalaciones nuevas",
  instalacion_en_proceso: "Instalaciones en proceso",
  averia: "Averías",
  actualizacion: "Actualizaciones",
};

type Paso = { en: "inicio" } | { en: "dia" } | { en: "pendientes"; tipo: TipoTrabajo } | { en: "plan" };

/** "Ana", "Ana y Luis", "Ana, Luis y Pedro". */
function unirNombres(nombres: string[]): string {
  if (nombres.length <= 1) return nombres[0] ?? "";
  return `${nombres.slice(0, -1).join(", ")} y ${nombres[nombres.length - 1]}`;
}

function mismoAsignado(a: Asignado, b: Asignado): boolean {
  return a.tipo === b.tipo && a.id === b.id;
}

function mismoTrabajo(a: TrabajoPlanificado, b: TrabajoPlanificado): boolean {
  return a.id ? a.id === b.id : a === b;
}

function nuevoId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Cada paso vive en la dirección (?dia=…&tipo=…): el botón Atrás del
 * navegador vuelve al paso anterior y recargar no saca de donde se estaba.
 */
function irA(destino: { dia?: string; tipo?: TipoTrabajo; ver?: "plan" }) {
  const q = new URLSearchParams();
  if (destino.dia) q.set("dia", destino.dia);
  if (destino.tipo) q.set("tipo", destino.tipo);
  if (destino.ver) q.set("ver", destino.ver);
  const texto = q.toString();
  window.history.pushState(null, "", texto ? `?${texto}` : window.location.pathname);
}

// Todavía a prueba: solo entra quien tenga el permiso "planificacion" (o sea superadmin).
export default function PlanificacionPage() {
  return (
    <RouteGuard requiredModule="planificacion">
      <Suspense fallback={null}>
        <PlanificacionContenido />
      </Suspense>
    </RouteGuard>
  );
}

/**
 * Planificar va por pasos, uno cada vez:
 *
 * 1. Qué día.
 * 2. Qué se planifica: visitas, instalaciones nuevas, en proceso o averías.
 * 3. Los pendientes de eso, en lista (o en el mapa), para marcar y decir quién va.
 *
 * El plan del día, brigada por brigada, está a un botón desde los pasos 2 y 3.
 * Nada se descarga hasta que hace falta y todo se guarda solo.
 */
function PlanificacionContenido() {
  const { toast } = useToast();
  const { user } = useAuth();
  const params = useSearchParams();
  const hoy = useMemo(() => isoLocal(new Date()), []);

  const diaEnDireccion = params.get("dia");
  const dia = diaEnDireccion && esFechaIso(diaEnDireccion) ? diaEnDireccion : null;
  const tipoEnDireccion = params.get("tipo") as TipoTrabajo | null;
  const paso: Paso = !dia
    ? { en: "inicio" }
    : tipoEnDireccion && TIPOS_DEL_MENU.includes(tipoEnDireccion)
      ? { en: "pendientes", tipo: tipoEnDireccion }
      : params.get("ver") === "plan"
        ? { en: "plan" }
        : { en: "dia" };

  const [fecha, setFecha] = useState(() => dia ?? desplazar(isoLocal(new Date()), 1));
  const [trabajos, setTrabajos] = useState<TrabajoPlanificado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(false);
  const [recarga, setRecarga] = useState(0);
  const [estado, setEstado] = useState<EstadoGuardado>("guardado");
  const [brigadas, setBrigadas] = useState<Brigada[]>([]);
  const [trabajadores, setTrabajadores] = useState<Asignado[]>([]);
  const [sueltos, setSueltos] = useState<Asignado[]>([]);
  const [destino, setDestino] = useState<Asignado | null>(null);
  const [nuevoAbierto, setNuevoAbierto] = useState(false);
  const cache = useRef(new Map<TipoTrabajo, CandidatoPlanificacion[]>());

  // Lo que se guarda se lee de refs: el guardado corre fuera del render y
  // tiene que llevarse siempre lo último.
  const trabajosRef = useRef<TrabajoPlanificado[]>([]);
  const fechaRef = useRef(fecha);
  const sucio = useRef(false);
  const enCurso = useRef<Promise<boolean> | null>(null);
  const temporizador = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const ciRef = useRef<string | undefined>(user?.ci);
  ciRef.current = user?.ci;

  /** Guarda ya lo pendiente. Nunca hay dos guardados a la vez. */
  const guardarAhora = useCallback(async (): Promise<boolean> => {
    clearTimeout(temporizador.current);
    while (enCurso.current) await enCurso.current;
    if (!sucio.current) return true;
    sucio.current = false;
    setEstado("guardando");
    const peticion = PlanificacionService.guardar(fechaRef.current, trabajosRef.current, ciRef.current)
      .then(() => true)
      .catch(() => false);
    enCurso.current = peticion;
    const ok = await peticion;
    enCurso.current = null;
    if (!ok) {
      sucio.current = true;
      setEstado("error");
      return false;
    }
    setEstado(sucio.current ? "pendiente" : "guardado");
    return true;
  }, []);

  const editar = useCallback(
    (cambio: (lista: TrabajoPlanificado[]) => TrabajoPlanificado[]) => {
      trabajosRef.current = cambio(trabajosRef.current);
      setTrabajos(trabajosRef.current);
      sucio.current = true;
      setEstado("pendiente");
      clearTimeout(temporizador.current);
      temporizador.current = setTimeout(() => void guardarAhora(), 800);
    },
    [guardarAhora],
  );

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    PlanificacionService.obtener(fecha)
      .then((plan) => {
        if (cancelado) return;
        trabajosRef.current = plan.trabajos || [];
        setTrabajos(trabajosRef.current);
        setErrorCarga(false);
        setEstado("guardado");
      })
      .catch(() => !cancelado && setErrorCarga(true))
      .finally(() => !cancelado && setCargando(false));
    return () => {
      cancelado = true;
    };
  }, [fecha, recarga]);

  // Cambiar de día (elegido o con Atrás): primero se guarda el que se deja.
  useEffect(() => {
    if (!dia || dia === fechaRef.current) return;
    let cancelado = false;
    void guardarAhora().then((ok) => {
      if (cancelado) return;
      if (!ok) {
        toast({
          title: "No se pudo guardar el plan",
          description: "Sigues en el día anterior hasta que vuelva la conexión.",
          variant: "destructive",
        });
        window.history.replaceState(null, "", `?dia=${fechaRef.current}`);
        return;
      }
      fechaRef.current = dia;
      setSueltos([]);
      setDestino(null);
      setFecha(dia);
    });
    return () => {
      cancelado = true;
    };
  }, [dia, guardarAhora, toast]);

  // Cada paso empieza arriba.
  const clavePaso = paso.en === "pendientes" ? `pendientes:${paso.tipo}` : paso.en;
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [clavePaso]);

  useEffect(() => {
    BrigadaService.getAllBrigadas()
      .then((datos: any[]) => {
        const bs: Brigada[] = [];
        const personas = new Map<string, Asignado>();
        for (const b of datos || []) {
          const lider = b.lider || {};
          const ciLider = String(lider.CI ?? "");
          // El carné del líder identifica a la brigada: es con lo que el
          // backend encuentra los trabajos de cada brigadista.
          if (ciLider) {
            bs.push({
              asignado: { tipo: "brigada", id: ciLider, nombre: lider.nombre || ciLider },
              idViejo: String(b.id ?? b._id ?? ""),
              integrantes: (b.integrantes || [])
                .filter((p: any) => p && String(p.CI ?? "") !== ciLider)
                .map((p: any) => p.nombre || String(p.CI ?? ""))
                .filter(Boolean),
            });
          }
          for (const p of [lider, ...(b.integrantes || [])]) {
            const ci = String(p?.CI ?? "");
            if (ci) personas.set(ci, { tipo: "trabajador", id: ci, nombre: p?.nombre || ci });
          }
        }
        setBrigadas(bs.sort((a, b) => a.asignado.nombre.localeCompare(b.asignado.nombre)));
        setTrabajadores([...personas.values()].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      })
      .catch(() =>
        toast({
          title: "No se pudieron cargar las brigadas",
          description: "Recarga la página para intentarlo otra vez.",
          variant: "destructive",
        }),
      );
  }, [toast]);

  // Planes guardados con el _id de la brigada en vez del carné del líder: se
  // corrigen solos para que los brigadistas lleguen a ver sus trabajos.
  useEffect(() => {
    if (cargando || brigadas.length === 0) return;
    const porIdViejo = new Map(brigadas.map((b) => [b.idViejo, b.asignado]));
    const hayViejos = trabajosRef.current.some(
      (t) =>
        t.asignado.tipo === "brigada" &&
        porIdViejo.has(t.asignado.id) &&
        !brigadas.some((b) => b.asignado.id === t.asignado.id),
    );
    if (!hayViejos) return;
    editar((lista) =>
      lista.map((t) => {
        const nuevo = t.asignado.tipo === "brigada" ? porIdViejo.get(t.asignado.id) : undefined;
        return nuevo ? { ...t, asignado: nuevo } : t;
      }),
    );
  }, [brigadas, cargando, editar]);

  // Sin conexión se reintenta solo.
  useEffect(() => {
    if (estado !== "error") return;
    const id = setTimeout(() => void guardarAhora(), 5000);
    return () => clearTimeout(id);
  }, [estado, guardarAhora]);

  // Cerrar la pestaña con algo sin guardar sí avisa; es el único caso.
  useEffect(() => {
    if (estado === "guardado") return;
    const alSalir = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", alSalir);
    return () => window.removeEventListener("beforeunload", alSalir);
  }, [estado]);

  // Irse a otro módulo de la web guarda lo pendiente por el camino.
  useEffect(() => () => void guardarAhora(), [guardarAhora]);

  function alternar(tipo: TipoTrabajo, c: CandidatoPlanificacion) {
    if (!destino) return;
    const claveEntidad = claveCandidato(c);
    const existente = trabajosRef.current.find((t) => t.tipo === tipo && claveTrabajo(t) === claveEntidad);
    if (!existente) {
      editar((lista) => [
        ...lista,
        {
          id: nuevoId(),
          tipo,
          cliente_numero: c.cliente_numero,
          lead_id: c.lead_id,
          nombre: c.nombre,
          direccion: c.direccion,
          asignado: destino,
          nota: null,
          estado: "planificado",
        },
      ]);
    } else if (existente.estado === "planificado" && mismoAsignado(existente.asignado, destino)) {
      editar((lista) => lista.filter((t) => t !== existente));
    }
  }

  /** Lo marcado en la lista o el mapa, de una vez y para la misma persona o brigada. */
  function agregarVarios(items: Seleccionado[], quien: Asignado) {
    const existentes = new Set(trabajosRef.current.map((t) => `${t.tipo}|${claveTrabajo(t)}`));
    const nuevos = items.filter((i) => !existentes.has(`${i.tipo}|${claveCandidato(i.candidato)}`));
    if (nuevos.length === 0) return;
    editar((lista) => [
      ...lista,
      ...nuevos.map((i) => ({
        id: nuevoId(),
        tipo: i.tipo,
        cliente_numero: i.candidato.cliente_numero,
        lead_id: i.candidato.lead_id,
        nombre: i.candidato.nombre,
        direccion: i.candidato.direccion,
        asignado: quien,
        nota: null,
        estado: "planificado" as const,
      })),
    ]);
    toast({
      title: `${nuevos.length} trabajo${nuevos.length === 1 ? "" : "s"} añadido${nuevos.length === 1 ? "" : "s"} al plan`,
      description: quien.tipo === "brigada" ? `Con la brigada de ${quien.nombre}.` : `Con ${quien.nombre}.`,
    });
  }

  /** Un trabajo puesto a mano desde "Añadir un trabajo". */
  function agregarUno(c: CandidatoPlanificacion, tipo: TipoTrabajo, quien: Asignado, nota: string) {
    if (trabajosRef.current.some((t) => t.tipo === tipo && claveTrabajo(t) === claveCandidato(c))) return;
    editar((lista) => [
      ...lista,
      {
        id: nuevoId(),
        tipo,
        cliente_numero: c.cliente_numero,
        lead_id: c.lead_id,
        nombre: c.nombre,
        direccion: c.direccion,
        asignado: quien,
        nota: nota.trim() || null,
        estado: "planificado",
      },
    ]);
    toast({
      title: "Trabajo añadido al plan",
      description: `${c.nombre || "Sin nombre"} · ${quien.tipo === "brigada" ? `brigada de ${quien.nombre}` : quien.nombre}`,
    });
  }

  // Las brigadas siempre en el mismo sitio, tengan trabajo o no. Detrás, las
  // personas sueltas que se hayan planificado.
  const carriles = useMemo(() => {
    const lista: { quien: Asignado; subtitulo: string }[] = brigadas.map((b) => ({
      quien: b.asignado,
      subtitulo: b.integrantes.length ? `Con ${unirNombres(b.integrantes)}` : "Sin más integrantes",
    }));
    const vistos = new Set(lista.map((c) => `${c.quien.tipo}:${c.quien.id}`));
    for (const a of [...sueltos, ...trabajos.map((t) => t.asignado)]) {
      const claveQuien = `${a.tipo}:${a.id}`;
      if (vistos.has(claveQuien)) continue;
      vistos.add(claveQuien);
      lista.push({ quien: a, subtitulo: a.tipo === "trabajador" ? "Solo" : "Brigada" });
    }
    return lista;
  }, [brigadas, sueltos, trabajos]);

  const conTrabajo = new Set(trabajos.map((t) => `${t.asignado.tipo}:${t.asignado.id}`)).size;
  /** El plan que se ve es el del día de la dirección y ya terminó de cargar. */
  const listo = !!dia && dia === fecha && !cargando && !errorCarga;

  const botonVerPlan =
    trabajos.length > 0 ? (
      <Button variant="outline" onClick={() => irA({ dia: fecha, ver: "plan" })}>
        <ClipboardList className="mr-2 h-4 w-4" aria-hidden />
        Ver el plan del día ({trabajos.length})
      </Button>
    ) : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <ModuleHeader
        title="Planificación"
        subtitle={dia ? nombreDia(dia, hoy) : "Qué hace cada brigada cada día"}
        actions={paso.en === "inicio" ? undefined : <IndicadorGuardado estado={estado} />}
      />

      <main className="content-with-fixed-header px-4 pb-12 sm:px-6 lg:px-8">
        {paso.en === "inicio" ? (
          <InicioPlanificacion hoy={hoy} onElegir={(f) => irA({ dia: f })} />
        ) : errorCarga && dia === fecha ? (
          <div className="flex flex-col items-center gap-3 py-24 text-center">
            <p className="font-medium text-gray-900">No se pudo cargar el plan</p>
            <p className="text-sm text-gray-500">Revisa la conexión e inténtalo otra vez.</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => irA({})}>
                Elegir otro día
              </Button>
              <Button onClick={() => setRecarga((n) => n + 1)}>Reintentar</Button>
            </div>
          </div>
        ) : paso.en === "dia" ? (
          <MenuDia
            titulo={nombreDia(dia!, hoy)}
            cargando={!listo}
            trabajos={listo ? trabajos : []}
            onCambiarDia={() => irA({})}
            onTipo={(tipo) => irA({ dia: dia!, tipo })}
            onVerPlan={() => irA({ dia: dia!, ver: "plan" })}
            onNuevo={() => setNuevoAbierto(true)}
          />
        ) : !listo ? (
          <div className="flex items-center justify-center gap-2 py-24 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Cargando el plan…
          </div>
        ) : paso.en === "pendientes" ? (
          <>
            <Encabezado
              onVolver={() => irA({ dia: fecha })}
              titulo={`${TITULO_TIPO[paso.tipo]} para ${diaCorto(fecha, hoy)}`}
              subtitulo="Marca los que quieras y abajo elige quién va."
            >
              {botonVerPlan}
            </Encabezado>
            <PlanificarPorMapa
              key={`${fecha}:${paso.tipo}`}
              tipo={paso.tipo}
              delDia={delDia(fecha, hoy)}
              trabajos={trabajos}
              brigadas={carriles
                .filter((c) => c.quien.tipo === "brigada")
                .map((c) => ({ asignado: c.quien, detalle: c.subtitulo }))}
              trabajadores={trabajadores}
              cache={cache}
              onAgregar={agregarVarios}
            />
          </>
        ) : (
          <>
            <Encabezado
              onVolver={() => irA({ dia: fecha })}
              titulo={`Plan ${delDia(fecha, hoy)}`}
              subtitulo={
                trabajos.length === 0
                  ? "Nada planificado todavía. Pulsa Añadir en la brigada que quieras."
                  : `${trabajos.length} trabajo${trabajos.length === 1 ? "" : "s"}` +
                    (brigadas.length ? ` · ${conTrabajo} de ${brigadas.length} brigadas con trabajo` : "")
              }
            >
              <Button onClick={() => setNuevoAbierto(true)}>
                <Plus className="mr-2 h-4 w-4" aria-hidden />
                Añadir un trabajo
              </Button>
            </Encabezado>
            <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {carriles.map(({ quien, subtitulo }) => (
                <CarrilBrigada
                  key={`${quien.tipo}:${quien.id}`}
                  quien={quien}
                  subtitulo={subtitulo}
                  trabajos={trabajos.filter((t) => mismoAsignado(t.asignado, quien))}
                  onAgregar={() => setDestino(quien)}
                  onQuitar={(t) => editar((lista) => lista.filter((x) => !mismoTrabajo(x, t)))}
                  onCambiarNota={(t, nota) =>
                    editar((lista) => lista.map((x) => (mismoTrabajo(x, t) ? { ...x, nota: nota || null } : x)))
                  }
                />
              ))}

              {trabajadores.length > 0 && (
                <section className="rounded-lg border border-dashed border-gray-300 px-4 py-3">
                  <h2 className="text-sm font-medium text-gray-900">¿Un trabajo para una sola persona?</h2>
                  <p className="mb-2 text-xs text-gray-500">Visitas, averías y actualizaciones.</p>
                  <SearchableSelect
                    options={trabajadores.map((t) => ({ value: t.id, label: t.nombre }))}
                    value=""
                    onValueChange={(ci) => {
                      const persona = trabajadores.find((t) => t.id === ci);
                      if (!persona) return;
                      setSueltos((previos) => (previos.some((p) => p.id === ci) ? previos : [...previos, persona]));
                      setDestino(persona);
                    }}
                    placeholder="Elegir trabajador"
                    searchPlaceholder="Buscar por nombre"
                  />
                </section>
              )}
            </div>
          </>
        )}
      </main>

      <NuevoTrabajoDialog
        open={nuevoAbierto && !!dia}
        onOpenChange={setNuevoAbierto}
        delDia={delDia(fecha, hoy)}
        trabajos={trabajos}
        brigadas={carriles
          .filter((c) => c.quien.tipo === "brigada")
          .map((c) => ({ asignado: c.quien, detalle: c.subtitulo }))}
        trabajadores={trabajadores}
        onGuardar={agregarUno}
      />

      <SelectorTrabajos
        destino={destino}
        detalleDestino={destino ? carriles.find((c) => mismoAsignado(c.quien, destino))?.subtitulo : undefined}
        trabajos={trabajos}
        cache={cache}
        onAlternar={alternar}
        onCerrar={() => setDestino(null)}
      />
    </div>
  );
}

function Encabezado({
  onVolver,
  titulo,
  subtitulo,
  children,
}: {
  onVolver: () => void;
  titulo: string;
  subtitulo?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end gap-3">
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={onVolver}
          className="inline-flex items-center gap-1 rounded text-sm font-medium text-emerald-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Volver
        </button>
        <h2 className="mt-1 text-2xl font-semibold text-gray-900">{titulo}</h2>
        {subtitulo && <p className="text-sm text-gray-600">{subtitulo}</p>}
      </div>
      {children}
    </div>
  );
}

/** Qué pasa con el guardado, discreto, donde antes estaba el botón. */
function IndicadorGuardado({ estado }: { estado: EstadoGuardado }) {
  if (estado === "error") {
    return (
      <span className="flex items-center gap-1.5 text-sm font-medium text-amber-800" role="status">
        <AlertTriangle className="h-4 w-4" aria-hidden />
        Sin conexión, reintentando…
      </span>
    );
  }
  if (estado === "guardado") {
    return (
      <span className="flex items-center gap-1.5 text-sm text-gray-600" role="status">
        <Check className="h-4 w-4 text-emerald-700" aria-hidden />
        Guardado
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-sm text-gray-600" role="status">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      Guardando…
    </span>
  );
}
