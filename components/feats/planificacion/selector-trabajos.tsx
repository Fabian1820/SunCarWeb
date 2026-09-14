"use client";

import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { Check, Loader2, Plus, Search } from "lucide-react";
import { Button } from "@/components/shared/atom/button";
import { Input } from "@/components/shared/atom/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/shared/molecule/sheet";
import { cn } from "@/lib/utils";
import { PlanificacionService } from "@/lib/services/feats/planificacion/planificacion-service";
import { ClienteService } from "@/lib/services/feats/customer/cliente-service";
import { LeadService } from "@/lib/services/feats/leads/lead-service";
import {
  ETIQUETA_TIPO,
  TIPOS_QUE_ADMITEN_TRABAJADOR,
  type Asignado,
  type CandidatoPlanificacion,
  type TipoTrabajo,
  type TrabajoPlanificado,
} from "@/lib/types/feats/planificacion/planificacion-types";

const TIPOS: TipoTrabajo[] = [
  "visita",
  "instalacion_nueva",
  "instalacion_en_proceso",
  "averia",
  "actualizacion",
];

const ETIQUETA_SUGERIDOS: Record<TipoTrabajo, string> = {
  visita: "Pendientes de visita",
  instalacion_nueva: "Pendientes de instalación",
  instalacion_en_proceso: "Instalaciones en proceso",
  averia: "Con averías pendientes",
  actualizacion: "",
};

export function claveCandidato(c: CandidatoPlanificacion): string {
  return c.tipo_entidad === "lead" ? `lead:${c.lead_id}` : `cliente:${c.cliente_numero}`;
}

export function claveTrabajo(t: Pick<TrabajoPlanificado, "lead_id" | "cliente_numero">): string {
  return t.lead_id ? `lead:${t.lead_id}` : `cliente:${t.cliente_numero}`;
}

function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

const SIN_ZONA = "Sin especificar";

function zona(valor?: string | null): string {
  return (valor || "").trim() || SIN_ZONA;
}

/** Valores distintos con cuántos hay de cada uno, en orden alfabético y "Sin especificar" al final. */
function contar(valores: string[]): { valor: string; cuantos: number }[] {
  const mapa = new Map<string, number>();
  for (const v of valores) mapa.set(v, (mapa.get(v) ?? 0) + 1);
  return [...mapa.entries()]
    .map(([valor, cuantos]) => ({ valor, cuantos }))
    .sort((a, b) =>
      a.valor === SIN_ZONA ? 1 : b.valor === SIN_ZONA ? -1 : a.valor.localeCompare(b.valor),
    );
}

const CLASE_SELECT =
  "h-9 w-full min-w-0 rounded-md border border-input bg-background px-2 text-sm text-gray-900 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600";

interface Props {
  /** A quién se le añade. Con null el panel está cerrado. */
  destino: Asignado | null;
  /** Quiénes van en esa brigada, para tenerlo presente al elegir. */
  detalleDestino?: string;
  trabajos: TrabajoPlanificado[];
  /** Lo ya traído de cada tipo: volver a uno es instantáneo. */
  cache: MutableRefObject<Map<TipoTrabajo, CandidatoPlanificacion[]>>;
  onAlternar: (tipo: TipoTrabajo, candidato: CandidatoPlanificacion) => void;
  onCerrar: () => void;
}

/**
 * Añadir trabajos a una brigada o a un trabajador concreto.
 *
 * Se abre desde la tarjeta de esa brigada, así que "para quién" ya está
 * decidido. Tocar a una persona la añade al momento y tocarla otra vez la
 * quita: sin casillas ni botón de confirmar, y el plan sigue a la vista.
 *
 * Un solo buscador. Vacío enseña a quien está en el estado de ese tipo; al
 * escribir busca además a cualquier cliente o lead, con los sugeridos primero.
 */
export function SelectorTrabajos({ destino, detalleDestino, trabajos, cache, onAlternar, onCerrar }: Props) {
  const esTrabajador = destino?.tipo === "trabajador";
  // Instalar es cosa de una brigada entera: a una sola persona ni se le ofrece.
  const tipos = esTrabajador ? TIPOS.filter((t) => TIPOS_QUE_ADMITEN_TRABAJADOR.includes(t)) : TIPOS;
  const [tipo, setTipo] = useState<TipoTrabajo>("visita");
  const [consulta, setConsulta] = useState("");
  const [sugeridos, setSugeridos] = useState<CandidatoPlanificacion[]>([]);
  const [cargandoSugeridos, setCargandoSugeridos] = useState(false);
  const [errorSugeridos, setErrorSugeridos] = useState(false);
  const [otros, setOtros] = useState<CandidatoPlanificacion[]>([]);
  const [buscando, setBuscando] = useState(false);
  // La zona se mantiene al cambiar de tipo: se suele planificar por zona
  // ("todo lo de Artemisa para esta brigada"), no tipo por tipo.
  const [provincia, setProvincia] = useState("");
  const [municipio, setMunicipio] = useState("");
  const buscador = useRef<HTMLInputElement>(null);

  // Cada vez que se abre para otra brigada se empieza limpio.
  const claveDestino = destino ? `${destino.tipo}:${destino.id}` : null;
  useEffect(() => {
    if (!claveDestino) return;
    setTipo("visita");
    setConsulta("");
    setProvincia("");
    setMunicipio("");
  }, [claveDestino]);

  useEffect(() => {
    if (!destino) return;
    setConsulta("");
    setOtros([]);
    setErrorSugeridos(false);
    if (tipo === "actualizacion") {
      setSugeridos([]);
      return;
    }
    const enCache = cache.current.get(tipo);
    if (enCache) {
      setSugeridos(enCache);
      setCargandoSugeridos(false);
      return;
    }
    let cancelado = false;
    setSugeridos([]);
    setCargandoSugeridos(true);
    PlanificacionService.candidatos(tipo)
      .then((data) => {
        cache.current.set(tipo, data);
        if (!cancelado) setSugeridos(data);
      })
      .catch(() => !cancelado && setErrorSugeridos(true))
      .finally(() => !cancelado && setCargandoSugeridos(false));
    return () => {
      cancelado = true;
    };
    // `destino` solo importa para saber si está abierto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo, claveDestino, cache]);

  // Buscar a cualquiera a partir de tres letras, cuando se deja de teclear.
  useEffect(() => {
    const texto = consulta.trim();
    if (texto.length < 3) {
      setOtros([]);
      setBuscando(false);
      return;
    }
    let cancelado = false;
    setBuscando(true);
    const id = setTimeout(() => {
      Promise.all([
        ClienteService.getClientes({ nombre: texto, limit: 25 }).catch(() => ({ clients: [] })),
        LeadService.getLeads({ nombre: texto, limit: 25 }).catch(() => ({ leads: [] })),
      ])
        .then(([resClientes, resLeads]: any[]) => {
          if (cancelado) return;
          setOtros([
            ...(resClientes.clients || []).map((c: any) => ({
              tipo_entidad: "cliente" as const,
              lead_id: null,
              cliente_numero: c.numero ?? "",
              nombre: c.nombre ?? "",
              telefono: c.telefono ?? "",
              direccion: c.direccion ?? "",
              municipio: c.municipio ?? "",
              provincia: c.provincia_montaje ?? "",
              estado: c.estado ?? "",
            })),
            ...(resLeads.leads || []).map((l: any) => ({
              tipo_entidad: "lead" as const,
              lead_id: String(l.id ?? l._id ?? ""),
              cliente_numero: null,
              nombre: l.nombre ?? "",
              telefono: l.telefono ?? "",
              direccion: l.direccion ?? "",
              municipio: l.municipio ?? "",
              provincia: l.provincia_montaje ?? "",
              estado: l.estado ?? "",
            })),
          ]);
        })
        .finally(() => !cancelado && setBuscando(false));
    }, 350);
    return () => {
      cancelado = true;
      clearTimeout(id);
    };
  }, [consulta]);

  const texto = normalizar(consulta.trim());
  const buscaATodos = consulta.trim().length >= 3;

  // Las opciones salen de lo que hay en pantalla: solo zonas con alguien.
  const cargados = useMemo(
    () => (buscaATodos ? [...sugeridos, ...otros] : sugeridos),
    [sugeridos, otros, buscaATodos],
  );
  const provincias = useMemo(() => {
    const lista = contar(cargados.map((c) => zona(c.provincia)));
    if (provincia && !lista.some((p) => p.valor === provincia)) lista.push({ valor: provincia, cuantos: 0 });
    return lista;
  }, [cargados, provincia]);
  const municipios = useMemo(() => {
    const deLaProvincia = provincia ? cargados.filter((c) => zona(c.provincia) === provincia) : cargados;
    const lista = contar(deLaProvincia.map((c) => zona(c.municipio)));
    if (municipio && !lista.some((m) => m.valor === municipio)) lista.push({ valor: municipio, cuantos: 0 });
    return lista;
  }, [cargados, provincia, municipio]);

  const filtrandoZona = provincia !== "" || municipio !== "";
  const enZona = (c: CandidatoPlanificacion) =>
    (!provincia || zona(c.provincia) === provincia) && (!municipio || zona(c.municipio) === municipio);

  const sugeridosVisibles = useMemo(
    () =>
      sugeridos.filter(
        (c) =>
          enZona(c) &&
          (!texto || normalizar(`${c.nombre} ${c.direccion} ${c.municipio}`).includes(texto)),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sugeridos, texto, provincia, municipio],
  );

  const otrosVisibles = useMemo(() => {
    if (!buscaATodos) return [];
    const yaSugeridos = new Set(sugeridosVisibles.map(claveCandidato));
    return otros.filter((c) => enZona(c) && !yaSugeridos.has(claveCandidato(c)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otros, sugeridosVisibles, buscaATodos, provincia, municipio]);

  /** Dónde está ya esa persona para este tipo de trabajo, si está. */
  const porClave = useMemo(() => {
    const mapa = new Map<string, TrabajoPlanificado>();
    for (const t of trabajos) if (t.tipo === tipo) mapa.set(claveTrabajo(t), t);
    return mapa;
  }, [trabajos, tipo]);

  const deEste = destino
    ? trabajos.filter((t) => t.asignado.tipo === destino.tipo && t.asignado.id === destino.id).length
    : 0;

  function fila(c: CandidatoPlanificacion, mostrarEstado: boolean) {
    const existente = porClave.get(claveCandidato(c));
    const aqui =
      !!existente &&
      !!destino &&
      existente.asignado.tipo === destino.tipo &&
      existente.asignado.id === destino.id;
    const conOtro = !!existente && !aqui;
    const cerrado = !!existente && existente.estado !== "planificado";
    const tocable = !conOtro && !cerrado;
    const linea = [c.direccion, c.municipio, mostrarEstado ? c.estado : ""]
      .filter(Boolean)
      .join(" · ");

    return (
      <li key={claveCandidato(c)}>
        <button
          type="button"
          disabled={!tocable}
          aria-pressed={aqui}
          onClick={() => onAlternar(tipo, c)}
          className={cn(
            "flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600",
            aqui ? "bg-emerald-50 hover:bg-emerald-100" : "hover:bg-gray-100",
            !tocable && "cursor-not-allowed hover:bg-transparent",
          )}
        >
          <span
            className={cn(
              "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
              aqui ? "bg-emerald-700 text-white" : "bg-gray-100 text-gray-600",
            )}
          >
            {aqui ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          </span>
          <span className="min-w-0 flex-1">
            <span
              className={cn(
                "block truncate text-sm",
                aqui ? "font-semibold text-gray-900" : "text-gray-900",
                !tocable && "text-gray-500",
              )}
            >
              {c.nombre || "Sin nombre"}
              {c.tipo_entidad === "lead" && (
                <span className="ml-1.5 font-normal text-gray-500">· lead</span>
              )}
            </span>
            {/* Qué está roto va antes que la dirección: decide a quién mandar. */}
            {c.detalle && <span className="block text-xs text-amber-800">{c.detalle}</span>}
            {linea && <span className="block truncate text-xs text-gray-500">{linea}</span>}
            {conOtro && (
              <span className="block text-xs font-medium text-gray-600">
                Ya va con {existente!.asignado.nombre}
              </span>
            )}
            {!conOtro && cerrado && (
              <span className="block text-xs font-medium text-gray-600">Ya está cerrado</span>
            )}
          </span>
        </button>
      </li>
    );
  }

  return (
    <Sheet open={destino !== null} onOpenChange={(abierto) => !abierto && onCerrar()}>
      <SheetContent
        className="flex w-full flex-col gap-0 p-0 sm:max-w-lg"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          buscador.current?.focus();
        }}
      >
        <SheetHeader className="space-y-1 border-b px-5 pb-4 pt-5 text-left">
          <SheetTitle className="pr-8">
            {esTrabajador ? `Añadir a ${destino?.nombre}` : `Añadir a la brigada de ${destino?.nombre}`}
          </SheetTitle>
          {detalleDestino && <p className="text-sm text-gray-700">{detalleDestino}</p>}
          <SheetDescription>
            {deEste === 0
              ? "Toca a una persona para añadirla. Otra vez, para quitarla."
              : `${deEste} trabajo${deEste === 1 ? "" : "s"} para este día. Toca otra vez para quitar.`}
          </SheetDescription>

          <div className="flex flex-wrap gap-1.5 pt-3" role="tablist" aria-label="Tipo de trabajo">
            {tipos.map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tipo === t}
                onClick={() => setTipo(t)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600",
                  tipo === t
                    ? "bg-emerald-800 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200",
                )}
              >
                {ETIQUETA_TIPO[t]}
              </button>
            ))}
          </div>

          <div className="relative pt-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 mt-1 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              ref={buscador}
              value={consulta}
              onChange={(e) => setConsulta(e.target.value)}
              placeholder="Buscar por nombre del cliente o lead"
              className="pl-9"
              aria-label="Buscar cliente o lead"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <select
              value={provincia}
              onChange={(e) => {
                setProvincia(e.target.value);
                setMunicipio("");
              }}
              aria-label="Filtrar por provincia"
              className={cn(CLASE_SELECT, provincia && "border-emerald-700 bg-emerald-50 font-medium")}
            >
              <option value="">Todas las provincias</option>
              {provincias.map((p) => (
                <option key={p.valor} value={p.valor}>
                  {p.valor} ({p.cuantos})
                </option>
              ))}
            </select>
            <select
              value={municipio}
              onChange={(e) => setMunicipio(e.target.value)}
              aria-label="Filtrar por municipio"
              className={cn(CLASE_SELECT, municipio && "border-emerald-700 bg-emerald-50 font-medium")}
            >
              <option value="">Todos los municipios</option>
              {municipios.map((m) => (
                <option key={m.valor} value={m.valor}>
                  {m.valor} ({m.cuantos})
                </option>
              ))}
            </select>
          </div>
          {filtrandoZona && (
            <button
              type="button"
              onClick={() => {
                setProvincia("");
                setMunicipio("");
              }}
              className="self-start text-xs font-medium text-emerald-800 hover:underline"
            >
              Quitar filtro de zona
            </button>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-2 py-3">
          {cargandoSugeridos ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando…
            </div>
          ) : (
            <>
              {tipo !== "actualizacion" && (
                <section>
                  <h3 className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {ETIQUETA_SUGERIDOS[tipo]} · {sugeridosVisibles.length}
                  </h3>
                  {errorSugeridos ? (
                    <p className="px-3 py-2 text-sm text-red-700">
                      No se pudo cargar la lista. Puedes buscar por nombre igualmente.
                    </p>
                  ) : sugeridosVisibles.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-gray-500">
                      {filtrandoZona && !consulta.trim()
                        ? "Nadie de esta lista en esa zona."
                        : consulta.trim()
                        ? "Nadie de esta lista se llama así."
                        : "Nadie en ese estado ahora mismo. Escribe un nombre para buscar a cualquiera."}
                    </p>
                  ) : (
                    <ul>{sugeridosVisibles.map((c) => fila(c, false))}</ul>
                  )}
                </section>
              )}

              {buscaATodos ? (
                <section className={cn(tipo !== "actualizacion" && "mt-5")}>
                  <h3 className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {tipo === "actualizacion" ? "Clientes y leads" : "Otros clientes y leads"}
                  </h3>
                  {buscando ? (
                    <p className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Buscando…
                    </p>
                  ) : otrosVisibles.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-gray-500">
                      {filtrandoZona ? "Nadie más con ese nombre en esa zona." : "Nadie más con ese nombre."}
                    </p>
                  ) : (
                    <ul>{otrosVisibles.map((c) => fila(c, true))}</ul>
                  )}
                </section>
              ) : (
                tipo === "actualizacion" && (
                  <p className="px-3 py-2 text-sm text-gray-500">
                    Las actualizaciones no salen de ningún estado. Escribe al menos tres letras del
                    nombre.
                  </p>
                )
              )}
            </>
          )}
        </div>

        <div className="border-t px-5 py-3">
          <Button className="w-full" onClick={onCerrar}>
            Listo
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
