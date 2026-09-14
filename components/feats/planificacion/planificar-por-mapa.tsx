"use client";

import { useEffect, useMemo, useState, type MutableRefObject } from "react";
import {
  Check,
  ChevronRight,
  Clock,
  Eye,
  FileText,
  List,
  Loader2,
  Map as IconoMapa,
  Maximize2,
  Minimize2,
  Plus,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { apiRequest } from "@/lib/api-config";
import { useToast } from "@/hooks/use-toast";
import { normalizeOfertaConfeccion, type OfertaConfeccion } from "@/hooks/use-ofertas-confeccion";
import { VerOfertaClienteDialog } from "@/components/feats/ofertas/ver-oferta-cliente-dialog";
import { Button } from "@/components/shared/atom/button";
import { SearchableSelect } from "@/components/shared/molecule/searchable-select";
import { cn } from "@/lib/utils";
import { PlanificacionService } from "@/lib/services/feats/planificacion/planificacion-service";
import { MapaCubaSvg, colorZona } from "@/components/feats/planificacion/mapa-cuba";
import { claveCandidato, claveTrabajo } from "@/components/feats/planificacion/selector-trabajos";
import {
  cargarMapa,
  ubicar,
  type MapaCuba,
  type MunicipioMapa,
  type ProvinciaMapa,
} from "@/components/feats/planificacion/zonas";
import {
  TIPOS_QUE_ADMITEN_TRABAJADOR,
  type Asignado,
  type CandidatoPlanificacion,
  type TipoTrabajo,
  type TrabajoPlanificado,
} from "@/lib/types/feats/planificacion/planificacion-types";

const QUE_ES: Record<TipoTrabajo, [string, string]> = {
  visita: ["pendiente de visita", "pendientes de visita"],
  instalacion_nueva: ["pendiente de instalación", "pendientes de instalación"],
  instalacion_en_proceso: ["instalación en proceso", "instalaciones en proceso"],
  averia: ["con avería pendiente", "con averías pendientes"],
  actualizacion: ["actualización", "actualizaciones"],
};

const PUNTO_TIPO: Record<TipoTrabajo, string> = {
  visita: "bg-blue-600",
  instalacion_nueva: "bg-emerald-600",
  instalacion_en_proceso: "bg-white ring-2 ring-inset ring-emerald-700",
  averia: "bg-red-600",
  actualizacion: "bg-amber-500",
};

const SIN_MUNICIPIO = "__sin_municipio__";
const CLAVE_MODO = "planificacion:modo";

const CLASE_SELECT =
  "h-10 w-full min-w-0 rounded-md border border-input bg-white px-2.5 text-sm text-gray-900 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600";
const SELECT_ACTIVO = "border-emerald-700 bg-emerald-50 font-medium";

type Modo = "lista" | "mapa";

export interface Seleccionado {
  tipo: TipoTrabajo;
  candidato: CandidatoPlanificacion;
  /** Id del municipio, o clave de la provincia si no se sabe más. */
  zona: string;
  nombreZona: string;
}

export interface OpcionBrigada {
  asignado: Asignado;
  detalle: string;
}

interface Ubicado {
  c: CandidatoPlanificacion;
  provincia?: ProvinciaMapa;
  municipio?: MunicipioMapa;
}

interface Props {
  /** Qué se planifica: esta pantalla es de un solo tipo. */
  tipo: TipoTrabajo;
  /** "de mañana", "del martes 15": para "Añadir al plan de mañana". */
  delDia: string;
  trabajos: TrabajoPlanificado[];
  brigadas: OpcionBrigada[];
  trabajadores: Asignado[];
  cache: MutableRefObject<Map<TipoTrabajo, CandidatoPlanificacion[]>>;
  onAgregar: (items: Seleccionado[], quien: Asignado) => void;
}

function clave(tipo: TipoTrabajo, c: CandidatoPlanificacion) {
  return `${tipo}|${claveCandidato(c)}`;
}

function cuantos(n: number, [uno, varios]: [string, string]) {
  return `${n} ${n === 1 ? uno : varios}`;
}

/** Días desde una fecha "YYYY-MM-DD" hasta hoy. */
function diasEsperando(iso?: string | null): number | null {
  if (!iso) return null;
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((hoy.getTime() - new Date(y, m - 1, d).getTime()) / 86_400_000));
}

function textoEspera(dias: number): string {
  if (dias === 0) return "desde hoy";
  if (dias < 60) return `${dias} día${dias === 1 ? "" : "s"}`;
  if (dias < 730) return `${Math.floor(dias / 30)} meses`;
  return `${Math.floor(dias / 365)} años`;
}

/** A partir de aquí la espera se marca: son dos meses. */
const ESPERA_LARGA = 60;

const FILTROS_ESPERA: { dias: number; texto: string }[] = [
  { dias: 0, texto: "Cualquier espera" },
  { dias: 30, texto: "Más de 1 mes" },
  { dias: 90, texto: "Más de 3 meses" },
  { dias: 180, texto: "Más de 6 meses" },
  { dias: 365, texto: "Más de 1 año" },
];

/**
 * Los pendientes de un tipo, para marcarlos y decir quién va.
 *
 * Se abre en lista, que es lo que entiende todo el mundo; el mapa está a un
 * toque para quien quiera ver dónde caen. Los filtros quedan recogidos detrás
 * de un botón y lo que está filtrado se ve siempre como etiquetas que se
 * quitan con una X. Lo marcado se queda abajo hasta decidir quién va.
 */
export function PlanificarPorMapa({ tipo, delDia, trabajos, brigadas, trabajadores, cache, onAgregar }: Props) {
  const [mapa, setMapa] = useState<MapaCuba | null>(null);
  const [errorMapa, setErrorMapa] = useState(false);
  const [lista, setLista] = useState<CandidatoPlanificacion[] | null>(() => cache.current.get(tipo) ?? null);
  const [fallo, setFallo] = useState(false);
  const [modo, setModo] = useState<Modo>("lista");
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);
  const [provincia, setProvincia] = useState<string | null>(null);
  const [municipio, setMunicipio] = useState<string | null>(null);
  const [verSinZona, setVerSinZona] = useState(false);
  const [seleccion, setSeleccion] = useState<Map<string, Seleccionado>>(new Map());
  const [quien, setQuien] = useState("");
  const [pantallaCompleta, setPantallaCompleta] = useState(false);
  /** Solo los que llevan esperando al menos estos días; 0 es todos. */
  const [esperaMinima, setEsperaMinima] = useState(0);
  /** En instalaciones salen los que ya tienen visita; los otros, con un botón. */
  const [verSinVisita, setVerSinVisita] = useState(false);
  const separaPorVisita = tipo === "instalacion_nueva" || tipo === "instalacion_en_proceso";
  const [ofertaAbierta, setOfertaAbierta] = useState<OfertaConfeccion | null>(null);
  const [abriendoOferta, setAbriendoOferta] = useState<string | null>(null);
  const [abriendoVisita, setAbriendoVisita] = useState<string | null>(null);
  const { toast } = useToast();

  // Se abre como se dejó la última vez: lista o mapa.
  useEffect(() => {
    try {
      const guardado = localStorage.getItem(CLAVE_MODO);
      if (guardado === "lista" || guardado === "mapa") setModo(guardado);
    } catch {
      /* sin almacenamiento, en lista */
    }
  }, []);

  function cambiarModo(m: Modo) {
    setModo(m);
    if (m === "lista") setPantallaCompleta(false);
    try {
      localStorage.setItem(CLAVE_MODO, m);
    } catch {
      /* no pasa nada */
    }
  }

  // A pantalla completa: Escape sale y la página de detrás no se desplaza.
  useEffect(() => {
    if (!pantallaCompleta) return;
    const alPulsar = (e: KeyboardEvent) => e.key === "Escape" && setPantallaCompleta(false);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", alPulsar);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", alPulsar);
    };
  }, [pantallaCompleta]);

  async function verOferta(id: string) {
    if (abriendoOferta) return;
    setAbriendoOferta(id);
    try {
      const res = await apiRequest<{ data?: unknown }>(`/ofertas/confeccion/${encodeURIComponent(id)}`);
      if (!res?.data) throw new Error("Sin datos");
      setOfertaAbierta(normalizeOfertaConfeccion(res.data));
    } catch {
      toast({ title: "No se pudo abrir la oferta", description: "Inténtalo otra vez.", variant: "destructive" });
    } finally {
      setAbriendoOferta(null);
    }
  }

  /** El informe de la visita en PDF, con sus fotos, en otra pestaña: para planificar se mira el techo y el sitio. */
  async function verVisita(id: string) {
    if (abriendoVisita) return;
    // La pestaña se abre ya, con el clic: abierta después de la descarga, el navegador la bloquea.
    const pestana = window.open("", "_blank");
    setAbriendoVisita(id);
    try {
      const blob = await apiRequest<Blob>(`/visitas/${encodeURIComponent(id)}/informe?incluir_imagenes=true`, {
        responseType: "blob",
      });
      const url = URL.createObjectURL(blob);
      if (pestana) pestana.location.href = url;
      else window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      pestana?.close();
      toast({ title: "No se pudo abrir la visita", description: "Inténtalo otra vez.", variant: "destructive" });
    } finally {
      setAbriendoVisita(null);
    }
  }

  // El mapa también sirve en la lista: es lo que dice en qué municipio cae cada uno.
  useEffect(() => {
    cargarMapa()
      .then(setMapa)
      .catch(() => setErrorMapa(true));
  }, []);

  // Solo los pendientes de este tipo: nada más se descarga al entrar.
  useEffect(() => {
    const enCache = cache.current.get(tipo);
    if (enCache) {
      setLista(enCache);
      return;
    }
    let cancelado = false;
    setFallo(false);
    PlanificacionService.candidatos(tipo)
      .then((l) => {
        cache.current.set(tipo, l);
        if (!cancelado) setLista(l);
      })
      .catch(() => !cancelado && setFallo(true));
    return () => {
      cancelado = true;
    };
  }, [cache, tipo]);

  const enPlan = useMemo(() => {
    const m = new Map<string, TrabajoPlanificado>();
    for (const t of trabajos) m.set(`${t.tipo}|${claveTrabajo(t)}`, t);
    return m;
  }, [trabajos]);

  // Lo que ya está en el plan sale de la selección: se añadió o se añadió desde otro sitio.
  useEffect(() => {
    setSeleccion((previa) => {
      let cambia = false;
      const nueva = new Map(previa);
      for (const k of previa.keys()) {
        if (enPlan.has(k)) {
          nueva.delete(k);
          cambia = true;
        }
      }
      return cambia ? nueva : previa;
    });
  }, [enPlan]);

  // Sin fecha no se sabe cuánto espera: con el filtro puesto, no entra.
  const cumpleEspera = (c: CandidatoPlanificacion) =>
    esperaMinima === 0 || (diasEsperando(c.esperando_desde) ?? -1) >= esperaMinima;
  const cumpleResto = (c: CandidatoPlanificacion) =>
    cumpleEspera(c);
  const cumpleFiltros = (c: CandidatoPlanificacion) =>
    cumpleResto(c) && (!separaPorVisita || !!c.visita_id !== verSinVisita);
  // Los que quedan del otro lado del botón de visita, para decir cuántos son.
  const otrosPorVisita = separaPorVisita
    ? (lista ?? []).filter((c) => cumpleResto(c) && !!c.visita_id === verSinVisita).length
    : 0;

  const ubicados = useMemo<Ubicado[]>(() => {
    if (!lista) return [];
    return lista.filter(cumpleFiltros).map((c) => (mapa ? { c, ...ubicar(c, mapa) } : { c }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapa, lista, esperaMinima, verSinVisita]);

  const libres = useMemo(() => ubicados.filter((u) => !enPlan.has(clave(tipo, u.c))), [ubicados, enPlan, tipo]);

  const conteoProvincia = useMemo(() => {
    const m = new Map<string, number>();
    for (const u of libres) if (u.provincia) m.set(u.provincia.k, (m.get(u.provincia.k) ?? 0) + 1);
    return m;
  }, [libres]);

  const conteoMunicipio = useMemo(() => {
    const m = new Map<string, number>();
    for (const u of libres) if (u.municipio) m.set(u.municipio.id, (m.get(u.municipio.id) ?? 0) + 1);
    return m;
  }, [libres]);

  const seleccionPorZona = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of seleccion.values()) {
      m.set(s.zona, (m.get(s.zona) ?? 0) + 1);
      const provinciaDeZona = s.zona.split("/")[0];
      if (s.zona.includes("/")) m.set(provinciaDeZona, (m.get(provinciaDeZona) ?? 0) + 1);
    }
    return m;
  }, [seleccion]);

  // Sin municipio reconocible, dentro de la provincia elegida si hay una.
  const sinZona = ubicados.filter((u) => !u.municipio && (!provincia || u.provincia?.k === provincia));
  const sinZonaLibres = sinZona.filter((u) => !enPlan.has(clave(tipo, u.c))).length;

  const provinciaActual = mapa?.provincias.find((p) => p.k === provincia) ?? null;
  const municipioActual = mapa?.municipios.find((m) => m.id === municipio) ?? null;

  function elegirProvincia(k: string | null) {
    setVerSinZona(false);
    setMunicipio(null);
    setProvincia(k);
  }

  function elegirMunicipio(id: string) {
    setVerSinZona(false);
    setMunicipio((actual) => (actual === id ? null : id));
  }

  /** Desde el desplegable: elegir un municipio lleva también a su provincia. */
  function filtrarMunicipio(valor: string) {
    if (valor === SIN_MUNICIPIO) {
      setVerSinZona(true);
      setMunicipio(null);
      return;
    }
    setVerSinZona(false);
    const m = mapa?.municipios.find((x) => x.id === valor);
    if (!m) {
      setMunicipio(null);
      return;
    }
    setProvincia(m.pk);
    setMunicipio(m.id);
  }

  const opcionesMunicipio = !mapa
    ? []
    : (provincia
        ? mapa.municipios.filter((m) => m.pk === provincia)
        : mapa.municipios.filter((m) => (conteoMunicipio.get(m.id) ?? 0) > 0)
      ).sort((a, b) => a.n.localeCompare(b.n));

  // Lo filtrado, siempre a la vista y con su X para quitarlo.
  const activos: { clave: string; texto: string; quitar: () => void }[] = [];
  if (provinciaActual) activos.push({ clave: "provincia", texto: provinciaActual.n, quitar: () => elegirProvincia(null) });
  if (municipioActual) activos.push({ clave: "municipio", texto: municipioActual.n, quitar: () => setMunicipio(null) });
  if (verSinZona) activos.push({ clave: "sin-municipio", texto: "Sin municipio", quitar: () => setVerSinZona(false) });
  if (esperaMinima > 0)
    activos.push({
      clave: "espera",
      texto: FILTROS_ESPERA.find((f) => f.dias === esperaMinima)?.texto ?? "",
      quitar: () => setEsperaMinima(0),
    });

  function quitarFiltros() {
    elegirProvincia(null);
    setEsperaMinima(0);
  }

  function seleccionadoDe(u: Ubicado): Seleccionado {
    return {
      tipo,
      candidato: u.c,
      zona: u.municipio?.id ?? u.provincia?.k ?? "",
      nombreZona: u.municipio?.n ?? u.provincia?.n ?? "Sin zona",
    };
  }

  function alternar(u: Ubicado) {
    const k = clave(tipo, u.c);
    setSeleccion((previa) => {
      const nueva = new Map(previa);
      if (nueva.has(k)) nueva.delete(k);
      else nueva.set(k, seleccionadoDe(u));
      return nueva;
    });
  }

  function marcarGrupo(grupo: Ubicado[], marcar: boolean) {
    setSeleccion((previa) => {
      const nueva = new Map(previa);
      for (const u of grupo) {
        const k = clave(tipo, u.c);
        if (enPlan.has(k)) continue;
        if (marcar) nueva.set(k, seleccionadoDe(u));
        else nueva.delete(k);
      }
      return nueva;
    });
  }

  // Lo que se lista, agrupado por municipio. En el mapa hace falta elegir zona;
  // en la lista sale todo lo que cumple los filtros.
  const grupos = useMemo(() => {
    let visibles: Ubicado[];
    if (verSinZona) visibles = sinZona;
    else if (municipio) visibles = ubicados.filter((u) => u.municipio?.id === municipio);
    else if (provincia) visibles = ubicados.filter((u) => u.provincia?.k === provincia);
    else if (modo === "lista") visibles = ubicados;
    else return [];
    const mapaGrupos = new Map<string, { nombre: string; items: Ubicado[] }>();
    for (const u of visibles) {
      const id = u.municipio?.id ?? "sin-municipio";
      if (!mapaGrupos.has(id)) {
        const nombre = u.municipio ? (provincia ? u.municipio.n : `${u.municipio.n} · ${u.municipio.p}`) : "Sin municipio";
        mapaGrupos.set(id, { nombre, items: [] });
      }
      mapaGrupos.get(id)!.items.push(u);
    }
    const orden = (u: Ubicado) => (enPlan.has(clave(tipo, u.c)) ? 1 : 0);
    return [...mapaGrupos.entries()]
      .map(([id, g]) => ({
        id,
        nombre: g.nombre,
        // Quien más lleva esperando, arriba.
        items: g.items.sort(
          (a, b) =>
            orden(a) - orden(b) ||
            (a.c.esperando_desde ?? "9999").localeCompare(b.c.esperando_desde ?? "9999") ||
            a.c.nombre.localeCompare(b.c.nombre),
        ),
        libres: g.items.filter((u) => !enPlan.has(clave(tipo, u.c))).length,
      }))
      .sort((a, b) =>
        a.id === "sin-municipio"
          ? 1
          : b.id === "sin-municipio"
            ? -1
            : b.libres - a.libres || a.nombre.localeCompare(b.nombre),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verSinZona, sinZona, municipio, provincia, modo, ubicados, enPlan, tipo]);

  const seleccionados = [...seleccion.values()];
  const soloParaBrigada = seleccionados.some((s) => !TIPOS_QUE_ADMITEN_TRABAJADOR.includes(s.tipo));
  const opciones = [
    ...brigadas.map((b) => ({
      value: `brigada:${b.asignado.id}`,
      label: `Brigada de ${b.asignado.nombre}${b.detalle ? ` · ${b.detalle}` : ""}`,
    })),
    ...(soloParaBrigada ? [] : trabajadores.map((t) => ({ value: `trabajador:${t.id}`, label: t.nombre }))),
  ];
  const quienElegido = (() => {
    const [t, id] = [quien.slice(0, quien.indexOf(":")), quien.slice(quien.indexOf(":") + 1)];
    if (t === "brigada") return brigadas.find((b) => b.asignado.id === id)?.asignado ?? null;
    if (t === "trabajador" && !soloParaBrigada) return trabajadores.find((p) => p.id === id) ?? null;
    return null;
  })();

  const resumenZonas = (() => {
    const m = new Map<string, number>();
    for (const s of seleccionados) m.set(s.nombreZona, (m.get(s.nombreZona) ?? 0) + 1);
    return [...m.entries()].map(([z, n]) => `${z} ${n}`).join(" · ");
  })();

  const cargandoTipo = lista === null && !fallo;

  const listaPendientes = (
    <>
      <header className="border-b px-4 py-3">
        <h2 className="text-base font-semibold text-gray-900">
          {verSinZona ? "Sin municipio reconocible" : municipioActual?.n ?? provinciaActual?.n ?? "Toda Cuba"}
        </h2>
        <p className="text-sm text-gray-600">
          {cuantos(
            grupos.reduce((s, g) => s + g.libres, 0),
            QUE_ES[tipo],
          )}
          {modo === "mapa" && !municipio && !verSinZona && " · toca un municipio en el mapa para ver solo ese"}
        </p>
      </header>
      {cargandoTipo ? (
        <p className="flex items-center gap-2 px-4 py-10 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Cargando…
        </p>
      ) : fallo ? (
        <p className="px-4 py-10 text-sm text-red-700">No se pudo cargar esta lista. Recarga la página.</p>
      ) : grupos.length === 0 ? (
        <div className="px-4 py-10 text-sm text-gray-500">
          {activos.length > 0 ? (
            <>
              Nadie cumple estos filtros.{" "}
              <button type="button" onClick={quitarFiltros} className="font-medium text-emerald-800 hover:underline">
                Quitar filtros
              </button>
            </>
          ) : (
            `Nadie ${QUE_ES[tipo][0]} ahora mismo.`
          )}
        </div>
      ) : (
        <div className="divide-y">
          {grupos.map((g) => {
            const marcables = g.items.filter((u) => !enPlan.has(clave(tipo, u.c)));
            const todosMarcados = marcables.length > 0 && marcables.every((u) => seleccion.has(clave(tipo, u.c)));
            return (
              <div key={g.id} className="py-2">
                <div className="flex items-center justify-between gap-3 px-4 pb-1 pt-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {g.nombre} · {g.libres}
                  </span>
                  {marcables.length > 1 && (
                    <button
                      type="button"
                      onClick={() => marcarGrupo(marcables, !todosMarcados)}
                      className="shrink-0 text-xs font-medium text-emerald-800 hover:underline"
                    >
                      {todosMarcados ? "Desmarcar" : `Marcar los ${marcables.length}`}
                    </button>
                  )}
                </div>
                <ul className="px-2">
                  {g.items.map((u) => (
                    <FilaPendiente
                      key={claveCandidato(u.c)}
                      u={u}
                      marcado={seleccion.has(clave(tipo, u.c))}
                      enPlan={enPlan.get(clave(tipo, u.c))}
                      tipo={tipo}
                      abriendoOferta={!!abriendoOferta && abriendoOferta === u.c.oferta_confirmada?.id}
                      abriendoVisita={!!abriendoVisita && abriendoVisita === u.c.visita_id}
                      onAlternar={() => alternar(u)}
                      onVerOferta={verOferta}
                      onVerVisita={verVisita}
                    />
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </>
  );

  return (
    <>
      {/* Barra: cómo verlos, filtros y cuántos hay. */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg bg-gray-200/70 p-1" role="tablist" aria-label="Cómo verlos">
          {(
            [
              ["lista", "Lista", List],
              ["mapa", "Mapa", IconoMapa],
            ] as const
          ).map(([m, texto, Icono]) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={modo === m}
              onClick={() => cambiarModo(m)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600",
                modo === m ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900",
              )}
            >
              <Icono className="h-4 w-4" aria-hidden />
              {texto}
            </button>
          ))}
        </div>

        <Button
          variant="outline"
          onClick={() => setFiltrosAbiertos((v) => !v)}
          aria-expanded={filtrosAbiertos}
          className={cn(filtrosAbiertos && "border-emerald-700")}
        >
          <SlidersHorizontal className="mr-2 h-4 w-4" aria-hidden />
          Filtros
          {activos.length > 0 && (
            <span className="ml-2 rounded-full bg-emerald-800 px-1.5 text-xs font-semibold leading-5 text-white">
              {activos.length}
            </span>
          )}
        </Button>

        {separaPorVisita && (
          <Button
            variant="outline"
            onClick={() => setVerSinVisita((v) => !v)}
            aria-pressed={verSinVisita}
            className={cn(verSinVisita && "border-emerald-700")}
          >
            {verSinVisita ? `Ver con visita (${otrosPorVisita})` : `Ver sin visita (${otrosPorVisita})`}
          </Button>
        )}

        {activos.map((a) => (
          <button
            key={a.clave}
            type="button"
            onClick={a.quitar}
            aria-label={`Quitar el filtro ${a.texto}`}
            className="inline-flex items-center gap-1 rounded-full bg-emerald-50 py-1 pl-2.5 pr-1.5 text-xs font-medium text-emerald-900 hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
          >
            {a.texto}
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        ))}

        <p className="ml-auto text-sm text-gray-600">
          {cargandoTipo ? "Cargando…" : cuantos(libres.length, QUE_ES[tipo])}
        </p>
      </div>

      {filtrosAbiertos && (
        <div className="mb-4 rounded-lg border bg-white p-4">
          {/* Dos arriba y dos abajo, del mismo ancho y alto. */}
          <div className="grid grid-cols-2 gap-3">
            <label className="flex min-w-0 flex-col gap-1">
              <span className="text-xs font-medium text-gray-600">Provincia</span>
              <select
                value={provincia ?? ""}
                onChange={(e) => elegirProvincia(e.target.value || null)}
                className={cn(CLASE_SELECT, provincia && SELECT_ACTIVO)}
              >
                <option value="">Toda Cuba ({libres.length})</option>
                {(mapa?.provincias ?? []).map((p) => (
                  <option key={p.k} value={p.k}>
                    {p.n} ({conteoProvincia.get(p.k) ?? 0})
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-w-0 flex-col gap-1">
              <span className="text-xs font-medium text-gray-600">Municipio</span>
              <select
                value={verSinZona ? SIN_MUNICIPIO : municipio ?? ""}
                onChange={(e) => filtrarMunicipio(e.target.value)}
                className={cn(CLASE_SELECT, (municipio || verSinZona) && SELECT_ACTIVO)}
              >
                <option value="">{provincia ? "Todos los municipios" : "Todos"}</option>
                {opcionesMunicipio.map((m) => (
                  <option key={m.id} value={m.id}>
                    {provincia ? m.n : `${m.n} · ${m.p}`} ({conteoMunicipio.get(m.id) ?? 0})
                  </option>
                ))}
                {sinZona.length > 0 && <option value={SIN_MUNICIPIO}>Sin municipio ({sinZonaLibres})</option>}
              </select>
            </label>
            <label className="col-span-2 flex min-w-0 flex-col gap-1">
              <span className="text-xs font-medium text-gray-600">Tiempo esperando</span>
              <select
                value={esperaMinima}
                onChange={(e) => setEsperaMinima(Number(e.target.value))}
                className={cn(CLASE_SELECT, esperaMinima > 0 && SELECT_ACTIVO)}
              >
                {FILTROS_ESPERA.map((f) => (
                  <option key={f.dias} value={f.dias}>
                    {f.texto}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            {activos.length > 0 && (
              <Button variant="ghost" onClick={quitarFiltros}>
                Quitar filtros
              </Button>
            )}
            <Button onClick={() => setFiltrosAbiertos(false)}>Listo</Button>
          </div>
        </div>
      )}

      {modo === "lista" ? (
        <section className="mx-auto max-w-4xl rounded-lg border bg-white">{listaPendientes}</section>
      ) : errorMapa ? (
        <div className="rounded-lg border bg-white py-16 text-center">
          <p className="font-medium text-gray-900">No se pudo cargar el mapa</p>
          <p className="text-sm text-gray-500">Recarga la página, o usa la lista.</p>
        </div>
      ) : (
        <div
          className={
            pantallaCompleta
              ? "fixed inset-0 z-40 grid grid-rows-[minmax(0,3fr)_minmax(0,2fr)] gap-3 bg-gray-50 p-3 sm:p-4 lg:grid-cols-[minmax(0,1fr)_28rem] lg:grid-rows-1"
              : "grid items-start gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]"
          }
        >
          <section
            className={cn(
              "rounded-lg border bg-white",
              pantallaCompleta
                ? "flex min-h-0 flex-col overflow-hidden"
                : "lg:sticky lg:top-[var(--content-with-fixed-header-padding,144px)]",
            )}
          >
            <div className={cn("relative px-2 pb-2 pt-2", pantallaCompleta && "min-h-0 flex-1")}>
              {mapa ? (
                <MapaCubaSvg
                  mapa={mapa}
                  provincia={provincia}
                  municipio={municipio}
                  conteoProvincia={conteoProvincia}
                  conteoMunicipio={conteoMunicipio}
                  seleccion={seleccionPorZona}
                  onProvincia={elegirProvincia}
                  onMunicipio={elegirMunicipio}
                  llenar={pantallaCompleta}
                />
              ) : (
                <div className="flex aspect-[2/1] items-center justify-center gap-2 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Cargando el mapa…
                </div>
              )}
              {mapa && (
                <button
                  type="button"
                  onClick={() => setPantallaCompleta((v) => !v)}
                  aria-label={pantallaCompleta ? "Salir de pantalla completa" : "Ver el mapa a pantalla completa"}
                  title={pantallaCompleta ? "Salir de pantalla completa (Esc)" : "Pantalla completa"}
                  className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-gray-50 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                >
                  {pantallaCompleta ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </button>
              )}
              {cargandoTipo && mapa && (
                <span className="absolute left-4 top-4 flex items-center gap-1.5 rounded bg-white/90 px-2 py-1 text-xs text-gray-600">
                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                  Contando pendientes…
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 border-t px-4 py-2 text-xs text-gray-600">
              <span>Pendientes sin planificar:</span>
              {[
                [0, "0"],
                [1, "1–2"],
                [3, "3–5"],
                [6, "6–10"],
                [11, "11 o más"],
              ].map(([n, texto]) => (
                <span key={texto} className="flex items-center gap-1">
                  <span className="h-3 w-4 rounded-sm" style={{ background: colorZona(n as number) }} aria-hidden />
                  {texto}
                </span>
              ))}
            </div>
          </section>

          <section className={cn("rounded-lg border bg-white", pantallaCompleta && "min-h-0 overflow-y-auto")}>
            {!provincia && !verSinZona ? (
              <ListaProvincias
                provincias={mapa?.provincias ?? []}
                conteo={conteoProvincia}
                seleccion={seleccionPorZona}
                que={QUE_ES[tipo]}
                onElegir={elegirProvincia}
              />
            ) : (
              listaPendientes
            )}
          </section>
        </div>
      )}

      <VerOfertaClienteDialog
        open={ofertaAbierta !== null}
        onOpenChange={(abierto) => !abierto && setOfertaAbierta(null)}
        oferta={ofertaAbierta}
        ofertas={ofertaAbierta ? [ofertaAbierta] : []}
      />

      {seleccionados.length > 0 && (
        <>
          {/* Hueco para que la bandeja no tape el final de la lista. */}
          <div className="h-44 lg:h-28" aria-hidden />
          <div className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 bg-white shadow-[0_-6px_20px_rgba(15,23,42,0.08)]">
            <div className="flex flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:px-8">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900">
                  {seleccionados.length} marcado{seleccionados.length === 1 ? "" : "s"}
                  <span className="ml-2 font-normal text-gray-500">{resumenZonas}</span>
                </p>
                <ul className="mt-1.5 flex max-h-[4.25rem] flex-wrap gap-1.5 overflow-y-auto">
                  {seleccionados.map((s) => (
                    <li
                      key={`${s.tipo}|${claveCandidato(s.candidato)}`}
                      className="flex items-center gap-1.5 rounded-full bg-gray-100 py-0.5 pl-2 pr-0.5 text-xs text-gray-800"
                    >
                      <span className={cn("h-2 w-2 shrink-0 rounded-full", PUNTO_TIPO[s.tipo])} aria-hidden />
                      <span className="max-w-[12rem] truncate">{s.candidato.nombre || "Sin nombre"}</span>
                      <span className="text-gray-500">{s.nombreZona}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setSeleccion((p) => {
                            const n = new Map(p);
                            n.delete(`${s.tipo}|${claveCandidato(s.candidato)}`);
                            return n;
                          })
                        }
                        aria-label={`Quitar ${s.candidato.nombre} de lo marcado`}
                        className="flex h-5 w-5 items-center justify-center rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-900"
                      >
                        <X className="h-3 w-3" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-wrap items-center gap-2 lg:w-[36rem] lg:flex-nowrap">
                <div className="min-w-[15rem] flex-1">
                  <SearchableSelect
                    options={opciones}
                    value={quienElegido ? quien : ""}
                    onValueChange={setQuien}
                    placeholder="¿Quién va?"
                    searchPlaceholder="Buscar brigada o persona"
                  />
                </div>
                <Button
                  onClick={() => {
                    if (!quienElegido) return;
                    onAgregar(seleccionados, quienElegido);
                    setSeleccion(new Map());
                  }}
                  disabled={!quienElegido}
                >
                  <Plus className="mr-1 h-4 w-4" aria-hidden />
                  Añadir al plan {delDia}
                </Button>
                <Button variant="ghost" onClick={() => setSeleccion(new Map())}>
                  Vaciar
                </Button>
              </div>
            </div>
            {soloParaBrigada && quien.startsWith("trabajador:") && (
              <p className="px-4 pb-2 text-xs text-amber-800 sm:px-6 lg:px-8">
                Las instalaciones tienen que ir con una brigada.
              </p>
            )}
          </div>
        </>
      )}
    </>
  );
}

function ListaProvincias({
  provincias,
  conteo,
  seleccion,
  que,
  onElegir,
}: {
  provincias: ProvinciaMapa[];
  conteo: Map<string, number>;
  seleccion: Map<string, number>;
  que: [string, string];
  onElegir: (k: string) => void;
}) {
  const con = provincias
    .map((p) => ({ p, n: conteo.get(p.k) ?? 0 }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n);
  const total = con.reduce((s, x) => s + x.n, 0);
  return (
    <>
      <header className="border-b px-4 py-3">
        <h2 className="text-base font-semibold text-gray-900">Toda Cuba</h2>
        <p className="text-sm text-gray-600">{cuantos(total, que)} · elige una provincia</p>
      </header>
      {con.length === 0 ? (
        <p className="px-4 py-10 text-sm text-gray-500">Nadie {que[0]} ahora mismo.</p>
      ) : (
        <ul className="p-2">
          {con.map(({ p, n }) => (
            <li key={p.k}>
              <button
                type="button"
                onClick={() => onElegir(p.k)}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
              >
                <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: colorZona(n) }} aria-hidden />
                <span className="flex-1 text-sm font-medium text-gray-900">{p.n}</span>
                {(seleccion.get(p.k) ?? 0) > 0 && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                    {seleccion.get(p.k)} marcados
                  </span>
                )}
                <span className="text-sm tabular-nums text-gray-600">{n}</span>
                <ChevronRight className="h-4 w-4 text-gray-400" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function FilaPendiente({
  u,
  tipo,
  marcado,
  enPlan,
  abriendoOferta,
  abriendoVisita,
  onAlternar,
  onVerOferta,
  onVerVisita,
}: {
  u: Ubicado;
  tipo: TipoTrabajo;
  marcado: boolean;
  enPlan?: TrabajoPlanificado;
  abriendoOferta: boolean;
  abriendoVisita: boolean;
  onAlternar: () => void;
  onVerOferta: (id: string) => void;
  onVerVisita: (id: string) => void;
}) {
  const c = u.c;
  const bloqueado = !!enPlan;
  const oferta = c.oferta_confirmada;
  const [, mes, dia] = (c.visita_fecha ?? "").slice(0, 10).split("-");
  const fecha = dia && mes ? ` · ${dia}/${mes}` : "";
  // Lo que se mira para planificar: cuánto espera, qué equipo lleva y si ya hay visita.
  const dias = diasEsperando(c.esperando_desde);
  const conExtras = dias !== null || !!oferta || !!c.visita_id || tipo !== "visita";
  return (
    <li className={cn("rounded-md", marcado && "bg-amber-50")}>
      <button
        type="button"
        disabled={bloqueado}
        aria-pressed={marcado}
        onClick={onAlternar}
        className={cn(
          "flex w-full items-start gap-3 rounded-md px-2.5 py-2 text-left transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600",
          marcado ? "hover:bg-amber-100" : "hover:bg-gray-100",
          bloqueado && "cursor-default hover:bg-transparent",
        )}
      >
        <span
          className={cn(
            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2",
            marcado ? "border-amber-500 bg-amber-500 text-white" : "border-gray-300 bg-white",
            bloqueado && "border-gray-200 bg-gray-100",
          )}
          aria-hidden
        >
          {marcado && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn("block truncate text-sm", bloqueado ? "text-gray-500" : "font-medium text-gray-900")}>
            {c.nombre || "Sin nombre"}
            {c.tipo_entidad === "lead" && <span className="ml-1.5 font-normal text-gray-500">· lead</span>}
          </span>
          {c.detalle && <span className="block text-xs text-amber-800">{c.detalle}</span>}
          {c.direccion && <span className="block truncate text-xs text-gray-500">{c.direccion}</span>}
          {enPlan && (
            <span className="block text-xs font-medium text-emerald-800">
              En el plan ·{" "}
              {enPlan.asignado.tipo === "brigada" ? `brigada de ${enPlan.asignado.nombre}` : enPlan.asignado.nombre}
            </span>
          )}
        </span>
      </button>
      {conExtras && (
        <div className="flex flex-wrap items-center gap-1.5 pb-2 pl-[2.625rem] pr-2.5">
          {dias !== null && (
            <span
              className={cn(
                "mr-1 inline-flex items-center gap-1 text-xs",
                dias >= ESPERA_LARGA ? "font-semibold text-amber-800" : "text-gray-600",
              )}
              title={`Esperando desde el ${c.esperando_desde!.split("-").reverse().join("/")}`}
            >
              <Clock className="h-3.5 w-3.5" aria-hidden />
              Esperando {textoEspera(dias)}
            </span>
          )}
          {oferta && (
            <button
              type="button"
              onClick={() => onVerOferta(oferta.id)}
              title={`Oferta confirmada ${oferta.numero}`}
              className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
            >
              {abriendoOferta ? (
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
              ) : (
                <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden />
              )}
              <span className="truncate">{oferta.nombre || oferta.numero || "Oferta confirmada"}</span>
            </button>
          )}
          {c.visita_id ? (
            <button
              type="button"
              onClick={() => onVerVisita(c.visita_id!)}
              className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
            >
              {abriendoVisita ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <Eye className="h-3.5 w-3.5" aria-hidden />
              )}
              {abriendoVisita ? "Abriendo…" : `Ver visita${fecha}`}
            </button>
          ) : (
            tipo !== "visita" && <span className="text-xs text-gray-500">Sin visita</span>
          )}
        </div>
      )}
    </li>
  );
}
