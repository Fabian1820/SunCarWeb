"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CalendarDays, Check, ChevronLeft, ChevronRight, Loader2, Map as IconoMapa, Users } from "lucide-react";
import { ModuleHeader } from "@/components/shared/organism/module-header";
import { Button } from "@/components/shared/atom/button";
import { SearchableSelect } from "@/components/shared/molecule/searchable-select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { PlanificacionService } from "@/lib/services/feats/planificacion/planificacion-service";
import { BrigadaService } from "@/lib/services/feats/brigade/brigada-service";
import { CarrilBrigada } from "@/components/feats/planificacion/carril-brigada";
import {
  PlanificarPorMapa,
  type Seleccionado,
} from "@/components/feats/planificacion/planificar-por-mapa";
import {
  SelectorTrabajos,
  claveCandidato,
  claveTrabajo,
} from "@/components/feats/planificacion/selector-trabajos";
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

/** "Ana", "Ana y Luis", "Ana, Luis y Pedro". */
function unirNombres(nombres: string[]): string {
  if (nombres.length <= 1) return nombres[0] ?? "";
  return `${nombres.slice(0, -1).join(", ")} y ${nombres[nombres.length - 1]}`;
}

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** Fechas en hora local: con toISOString, a partir de las 8 de la noche "mañana" era pasado. */
function isoLocal(d: Date): string {
  const dd = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${dd(d.getMonth() + 1)}-${dd(d.getDate())}`;
}

function aFecha(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function desplazar(iso: string, dias: number): string {
  const f = aFecha(iso);
  f.setDate(f.getDate() + dias);
  return isoLocal(f);
}

function nombreDia(iso: string, hoy: string): string {
  const f = aFecha(iso);
  const largo = `${DIAS[f.getDay()]} ${f.getDate()} de ${MESES[f.getMonth()]}`;
  const relativo =
    iso === hoy ? "Hoy" : iso === desplazar(hoy, 1) ? "Mañana" : iso === desplazar(hoy, -1) ? "Ayer" : null;
  return relativo ? `${relativo}, ${largo}` : largo.charAt(0).toUpperCase() + largo.slice(1);
}

/** "hoy", "mañana" o "el martes 15": para "Añadir al plan de …". */
function diaCorto(iso: string, hoy: string): string {
  if (iso === hoy) return "hoy";
  if (iso === desplazar(hoy, 1)) return "mañana";
  if (iso === desplazar(hoy, -1)) return "ayer";
  const f = aFecha(iso);
  return `el ${DIAS[f.getDay()]} ${f.getDate()}`;
}

type VistaPlan = "mapa" | "brigadas";
const CLAVE_VISTA = "planificacion:vista";

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
 * El plan de un día, brigada por brigada.
 *
 * La pantalla es el propio plan: una tarjeta por brigada con lo que tiene. Se
 * añade desde la tarjeta de la brigada, así que "para quién" nunca se elige
 * aparte. Todo se guarda solo según se hace: no hay botón de guardar que
 * olvidar, ni borradores, ni avisos de cambios perdidos.
 */
export default function PlanificacionPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const hoy = useMemo(() => isoLocal(new Date()), []);
  // Mañana: es el día que se planifica cuando uno se sienta a hacerlo.
  const [fecha, setFecha] = useState(() => desplazar(isoLocal(new Date()), 1));
  const [trabajos, setTrabajos] = useState<TrabajoPlanificado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(false);
  const [recarga, setRecarga] = useState(0);
  const [estado, setEstado] = useState<EstadoGuardado>("guardado");
  const [brigadas, setBrigadas] = useState<Brigada[]>([]);
  const [trabajadores, setTrabajadores] = useState<Asignado[]>([]);
  const [sueltos, setSueltos] = useState<Asignado[]>([]);
  const [destino, setDestino] = useState<Asignado | null>(null);
  const cache = useRef(new Map<TipoTrabajo, CandidatoPlanificacion[]>());
  // Se abre en la última forma que se usó.
  const [vista, setVista] = useState<VistaPlan>("mapa");
  useEffect(() => {
    try {
      const guardada = localStorage.getItem(CLAVE_VISTA);
      if (guardada === "mapa" || guardada === "brigadas") setVista(guardada);
    } catch {
      /* sin almacenamiento, el mapa */
    }
  }, []);
  function cambiarVista(v: VistaPlan) {
    setVista(v);
    try {
      localStorage.setItem(CLAVE_VISTA, v);
    } catch {
      /* no pasa nada */
    }
  }

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
      (t) => t.asignado.tipo === "brigada" && porIdViejo.has(t.asignado.id) && !brigadas.some((b) => b.asignado.id === t.asignado.id),
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

  async function irA(nueva: string) {
    if (!nueva || nueva === fecha || cargando) return;
    if (!(await guardarAhora())) {
      toast({
        title: "No se pudo guardar el plan",
        description: "Sigues en este día hasta que vuelva la conexión.",
        variant: "destructive",
      });
      return;
    }
    fechaRef.current = nueva;
    setSueltos([]);
    setDestino(null);
    setFecha(nueva);
  }

  function alternar(tipo: TipoTrabajo, c: CandidatoPlanificacion) {
    if (!destino) return;
    const clave = claveCandidato(c);
    const existente = trabajosRef.current.find((t) => t.tipo === tipo && claveTrabajo(t) === clave);
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

  /** Lo marcado en el mapa, de una vez y para la misma persona o brigada. */
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

  // Las brigadas siempre en el mismo sitio, tengan trabajo o no. Detrás, las
  // personas sueltas que se hayan planificado.
  const carriles = useMemo(() => {
    const lista: { quien: Asignado; subtitulo: string }[] = brigadas.map((b) => ({
      quien: b.asignado,
      subtitulo: b.integrantes.length ? `Con ${unirNombres(b.integrantes)}` : "Sin más integrantes",
    }));
    const vistos = new Set(lista.map((c) => `${c.quien.tipo}:${c.quien.id}`));
    for (const a of [...sueltos, ...trabajos.map((t) => t.asignado)]) {
      const clave = `${a.tipo}:${a.id}`;
      if (vistos.has(clave)) continue;
      vistos.add(clave);
      lista.push({ quien: a, subtitulo: a.tipo === "trabajador" ? "Solo" : "Brigada" });
    }
    return lista;
  }, [brigadas, sueltos, trabajos]);

  const conTrabajo = new Set(trabajos.map((t) => `${t.asignado.tipo}:${t.asignado.id}`)).size;

  return (
    <div className="min-h-screen bg-gray-50">
      <ModuleHeader
        title="Planificación"
        subtitle="Qué hace cada brigada cada día"
        actions={<IndicadorGuardado estado={estado} />}
      />

      <main className="content-with-fixed-header px-4 pb-12 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => irA(desplazar(fecha, -1))}
              disabled={cargando}
              aria-label="Día anterior"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <label className="relative flex min-w-[17rem] cursor-pointer flex-col items-center rounded-md px-3 py-1 hover:bg-gray-100">
              <span className="text-lg font-semibold text-gray-900">{nombreDia(fecha, hoy)}</span>
              <span className="flex items-center gap-1 text-xs font-medium text-emerald-800">
                <CalendarDays className="h-3.5 w-3.5" />
                Cambiar día
              </span>
              {/* El calendario del navegador, invisible encima del título. */}
              <input
                type="date"
                value={fecha}
                onChange={(e) => irA(e.target.value)}
                onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker?.()}
                className="absolute inset-0 cursor-pointer opacity-0"
                aria-label="Elegir día"
              />
            </label>
            <Button
              variant="outline"
              size="icon"
              onClick={() => irA(desplazar(fecha, 1))}
              disabled={cargando}
              aria-label="Día siguiente"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          {!cargando && !errorCarga && (
            <p className="text-sm text-gray-600">
              {trabajos.length === 0
                ? vista === "mapa"
                  ? "Nada planificado todavía. Elige una zona y marca los pendientes."
                  : "Nada planificado todavía. Pulsa Añadir en la brigada que quieras."
                : `${trabajos.length} trabajo${trabajos.length === 1 ? "" : "s"}` +
                  (brigadas.length ? ` · ${conTrabajo} de ${brigadas.length} brigadas con trabajo` : "")}
            </p>
          )}

          <div className="ml-auto inline-flex rounded-lg bg-gray-200/70 p-1" role="tablist" aria-label="Cómo planificar">
            {(
              [
                ["mapa", "Por zonas", IconoMapa],
                ["brigadas", "Por brigadas", Users],
              ] as const
            ).map(([v, texto, Icono]) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={vista === v}
                onClick={() => cambiarVista(v)}
                className={
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors " +
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 " +
                  (vista === v ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900")
                }
              >
                <Icono className="h-4 w-4" />
                {texto}
              </button>
            ))}
          </div>
        </div>

        {cargando ? (
          <div className="flex items-center justify-center gap-2 py-24 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando el plan…
          </div>
        ) : errorCarga ? (
          <div className="flex flex-col items-center gap-3 py-24 text-center">
            <p className="font-medium text-gray-900">No se pudo cargar el plan</p>
            <p className="text-sm text-gray-500">Revisa la conexión e inténtalo otra vez.</p>
            <Button variant="outline" onClick={() => setRecarga((n) => n + 1)}>
              Reintentar
            </Button>
          </div>
        ) : vista === "mapa" ? (
          <PlanificarPorMapa
            key={fecha}
            dia={diaCorto(fecha, hoy)}
            trabajos={trabajos}
            brigadas={carriles
              .filter((c) => c.quien.tipo === "brigada")
              .map((c) => ({ asignado: c.quien, detalle: c.subtitulo }))}
            trabajadores={trabajadores}
            cache={cache}
            onAgregar={agregarVarios}
          />
        ) : (
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
        )}
      </main>

      <SelectorTrabajos
        destino={destino}
        detalleDestino={
          destino ? carriles.find((c) => mismoAsignado(c.quien, destino))?.subtitulo : undefined
        }
        trabajos={trabajos}
        cache={cache}
        onAlternar={alternar}
        onCerrar={() => setDestino(null)}
      />
    </div>
  );
}

/** Qué pasa con el guardado, discreto, donde antes estaba el botón. */
function IndicadorGuardado({ estado }: { estado: EstadoGuardado }) {
  if (estado === "error") {
    return (
      <span className="flex items-center gap-1.5 text-sm font-medium text-amber-800" role="status">
        <AlertTriangle className="h-4 w-4" />
        Sin conexión, reintentando…
      </span>
    );
  }
  if (estado === "guardado") {
    return (
      <span className="flex items-center gap-1.5 text-sm text-gray-600" role="status">
        <Check className="h-4 w-4 text-emerald-700" />
        Guardado
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-sm text-gray-600" role="status">
      <Loader2 className="h-4 w-4 animate-spin" />
      Guardando…
    </span>
  );
}
