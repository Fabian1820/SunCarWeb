"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Loader2, Search } from "lucide-react";
import { Button } from "@/components/shared/atom/button";
import { Input } from "@/components/shared/atom/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/api-config";
import { ClienteService } from "@/lib/services/feats/customer/cliente-service";
import { PlanificacionService } from "@/lib/services/feats/planificacion/planificacion-service";
import { claveCandidato, claveTrabajo } from "@/components/feats/planificacion/selector-trabajos";
import type { OpcionBrigada } from "@/components/feats/planificacion/planificar-por-mapa";
import {
  ETIQUETA_TIPO,
  TIPOS_QUE_ADMITEN_TRABAJADOR,
  type Asignado,
  type CandidatoPlanificacion,
  type TipoTrabajo,
  type TrabajoPlanificado,
} from "@/lib/types/feats/planificacion/planificacion-types";

const TIPOS: TipoTrabajo[] = ["instalacion_nueva", "instalacion_en_proceso", "averia", "actualizacion"];

const TITULO_SECCION = "mb-2 text-sm font-semibold text-gray-900";

const CLASE_CAMPO =
  "w-full rounded-md border border-input bg-white px-3 text-sm text-gray-900 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600";

function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Lo que toca según el estado del cliente. Solo propone: se cambia con un toque. */
function tipoSugerido(estado?: string): TipoTrabajo | null {
  const e = normalizar(estado ?? "");
  if (e.includes("pendiente de instalacion")) return "instalacion_nueva";
  if (e.includes("instalacion en proceso")) return "instalacion_en_proceso";
  return null;
}

interface OfertaResumen {
  id: string;
  numero: string;
  nombre: string;
}

interface Props {
  open: boolean;
  onOpenChange: (abierto: boolean) => void;
  /** "de mañana", "del martes 15". */
  delDia: string;
  trabajos: TrabajoPlanificado[];
  brigadas: OpcionBrigada[];
  trabajadores: Asignado[];
  onGuardar: (
    cliente: CandidatoPlanificacion,
    tipo: TipoTrabajo,
    quien: Asignado,
    nota: string,
    oferta: OfertaResumen | null,
  ) => void;
  /** Tipo con el que se abre (Actualizaciones desde el menú del día). */
  tipoInicial?: TipoTrabajo | null;
}

/**
 * Añadir un trabajo a mano: cliente, qué hay que hacer, quién va y un comentario.
 *
 * Para cuando ya se sabe lo que se quiere y buscarlo en las listas es dar un
 * rodeo. Cualquier cliente, esté en el estado que esté. Leads no: sin número
 * de cliente no hay vale ni materiales al cerrar el trabajo.
 */
export function NuevoTrabajoDialog({
  open,
  onOpenChange,
  delDia,
  trabajos,
  brigadas,
  trabajadores,
  onGuardar,
  tipoInicial,
}: Props) {
  const [consulta, setConsulta] = useState("");
  const [resultados, setResultados] = useState<CandidatoPlanificacion[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [cliente, setCliente] = useState<CandidatoPlanificacion | null>(null);
  const [tipo, setTipo] = useState<TipoTrabajo | null>(null);
  const [quien, setQuien] = useState("");
  const [nota, setNota] = useState("");
  const [ofertas, setOfertas] = useState<OfertaResumen[]>([]);
  const [ofertaId, setOfertaId] = useState<string | null>(null);
  const [buscandoOfertas, setBuscandoOfertas] = useState(false);
  /** La última nota propuesta: si la nota sigue siendo esa, se puede cambiar por otra. */
  const notaSugeridaRef = useRef("");

  // Cada vez que se abre, en blanco.
  useEffect(() => {
    if (!open) return;
    setConsulta("");
    setResultados([]);
    setCliente(null);
    setTipo(tipoInicial ?? null);
    setQuien("");
    setNota("");
    setOfertas([]);
    setOfertaId(null);
    notaSugeridaRef.current = "";
  }, [open, tipoInicial]);

  // Al elegir cliente, sus ofertas confirmadas, para saber cuál se va a montar.
  useEffect(() => {
    setOfertas([]);
    setOfertaId(null);
    if (!cliente?.cliente_numero) return;
    let cancelado = false;
    setBuscandoOfertas(true);
    apiRequest<{ data?: any[] }>(
      `/ofertas/confeccion/?cliente_numero=${encodeURIComponent(cliente.cliente_numero)}&estado=confirmada_por_cliente`,
    )
      .then((res) => {
        if (cancelado) return;
        const lista: OfertaResumen[] = (res.data || []).map((o) => ({
          id: String(o.id ?? o._id ?? ""),
          numero: o.numero_oferta || "",
          nombre: o.nombre_automatico || o.nombre || "",
        }));
        setOfertas(lista);
        setOfertaId(lista[0]?.id ?? null);
      })
      .catch(() => !cancelado && setOfertas([]))
      .finally(() => !cancelado && setBuscandoOfertas(false));
    return () => {
      cancelado = true;
    };
  }, [cliente?.cliente_numero]);

  // Buscar a partir de tres letras, cuando se deja de teclear.
  useEffect(() => {
    const texto = consulta.trim();
    if (texto.length < 3) {
      setResultados([]);
      setBuscando(false);
      return;
    }
    let cancelado = false;
    setBuscando(true);
    const id = setTimeout(() => {
      ClienteService.getClientes({ nombre: texto, limit: 20 })
        .catch(() => ({ clients: [] }))
        .then((resClientes: any) => {
          if (cancelado) return;
          setResultados(
            (resClientes.clients || []).map((c: any) => ({
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
          );
        })
        .finally(() => !cancelado && setBuscando(false));
    }, 350);
    return () => {
      cancelado = true;
      clearTimeout(id);
    };
  }, [consulta]);

  // La nota arranca con lo que ya se sabe: en una avería qué está roto, en una
  // instalación lo que se anotó en la visita. Si se escribió otra cosa, no se toca.
  useEffect(() => {
    if (!cliente || !tipo) return;
    let vigente = true;
    PlanificacionService.notaSugerida(tipo, cliente.cliente_numero, cliente.lead_id)
      .catch(() => null)
      .then((sugerida) => {
        if (!vigente) return;
        const nueva = sugerida?.trim() ?? "";
        const anterior = notaSugeridaRef.current;
        setNota((actual) => (actual.trim() === "" || actual === anterior ? nueva : actual));
        notaSugeridaRef.current = nueva;
      });
    return () => {
      vigente = false;
    };
  }, [cliente, tipo]);

  function elegir(c: CandidatoPlanificacion) {
    setCliente(c);
    setConsulta("");
    setResultados([]);
    if (!tipo) setTipo(tipoSugerido(c.estado));
  }

  const admitePersona = !tipo || TIPOS_QUE_ADMITEN_TRABAJADOR.includes(tipo);
  const quienElegido = (() => {
    const corte = quien.indexOf(":");
    const [t, id] = [quien.slice(0, corte), quien.slice(corte + 1)];
    if (t === "brigada") return brigadas.find((b) => b.asignado.id === id)?.asignado ?? null;
    if (t === "trabajador" && admitePersona) return trabajadores.find((p) => p.id === id) ?? null;
    return null;
  })();
  const yaEnPlan =
    cliente && tipo
      ? trabajos.find((t) => t.tipo === tipo && claveTrabajo(t) === claveCandidato(cliente))
      : undefined;
  const faltan = [!cliente && "el cliente", !tipo && "qué hay que hacer", !quienElegido && "quién va"].filter(
    Boolean,
  ) as string[];
  const valido = faltan.length === 0 && !yaEnPlan;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Añadir un trabajo</DialogTitle>
          <DialogDescription>Al plan {delDia}.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <section>
            <h3 className={TITULO_SECCION}>Cliente</h3>
            {cliente ? (
              <div className="flex items-start gap-3 rounded-lg border border-emerald-700 bg-emerald-50 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900">
                    {cliente.nombre || "Sin nombre"}
                    {cliente.tipo_entidad === "lead" && <span className="ml-1.5 font-normal text-gray-600">· lead</span>}
                  </p>
                  <p className="truncate text-xs text-gray-700">
                    {[cliente.direccion, cliente.municipio, cliente.estado].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setCliente(null)}>
                  Cambiar
                </Button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    autoFocus
                    value={consulta}
                    onChange={(e) => setConsulta(e.target.value)}
                    placeholder="Escribe el nombre (al menos 3 letras)"
                    className="pl-9"
                    aria-label="Buscar cliente"
                  />
                </div>
                {buscando ? (
                  <p className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Buscando…
                  </p>
                ) : consulta.trim().length >= 3 && resultados.length === 0 ? (
                  <p className="mt-2 text-sm text-gray-500">No hay nadie con ese nombre.</p>
                ) : (
                  resultados.length > 0 && (
                    <ul className="mt-2 max-h-60 divide-y overflow-y-auto rounded-lg border">
                      {resultados.map((c) => (
                        <li key={claveCandidato(c)}>
                          <button
                            type="button"
                            onClick={() => elegir(c)}
                            className="w-full px-3 py-2 text-left hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-600"
                          >
                            <span className="block text-sm font-medium text-gray-900">
                              {c.nombre || "Sin nombre"}
                              {c.tipo_entidad === "lead" && <span className="ml-1.5 font-normal text-gray-500">· lead</span>}
                            </span>
                            <span className="block truncate text-xs text-gray-500">
                              {[c.direccion, c.municipio, c.estado].filter(Boolean).join(" · ")}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )
                )}
              </>
            )}
          </section>

          {cliente && (buscandoOfertas || ofertas.length > 0) && (
            <section>
              <h3 className={TITULO_SECCION}>Oferta a montar</h3>
              {buscandoOfertas ? (
                <p className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Buscando ofertas confirmadas…
                </p>
              ) : (
                <select
                  value={ofertaId ?? ""}
                  onChange={(e) => setOfertaId(e.target.value || null)}
                  className={cn(CLASE_CAMPO, "h-10")}
                  aria-label="Oferta a montar"
                >
                  {ofertas.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.nombre || o.numero || "Oferta confirmada"}
                    </option>
                  ))}
                </select>
              )}
              {ofertas.length > 1 && (
                <p className="mt-1 text-xs text-gray-500">Este cliente tiene {ofertas.length} ofertas confirmadas.</p>
              )}
            </section>
          )}

          <section>
            <h3 className={TITULO_SECCION}>Qué hay que hacer</h3>
            <div className="grid grid-cols-2 gap-2">
              {TIPOS.map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={tipo === t}
                  onClick={() => setTipo(t)}
                  className={cn(
                    "rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600",
                    tipo === t
                      ? "border-emerald-800 bg-emerald-800 text-white"
                      : "border-gray-200 bg-white text-gray-800 hover:border-emerald-600",
                  )}
                >
                  {ETIQUETA_TIPO[t]}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3 className={TITULO_SECCION}>Quién va</h3>
            <select
              value={quienElegido ? quien : ""}
              onChange={(e) => setQuien(e.target.value)}
              className={cn(CLASE_CAMPO, "h-10")}
              aria-label="Quién va"
            >
              <option value="">Elegir brigada o persona</option>
              <optgroup label="Brigadas">
                {brigadas.map((b) => (
                  <option key={b.asignado.id} value={`brigada:${b.asignado.id}`}>
                    Brigada de {b.asignado.nombre}
                    {b.detalle ? ` · ${b.detalle}` : ""}
                  </option>
                ))}
              </optgroup>
              {admitePersona && (
                <optgroup label="Una sola persona">
                  {trabajadores.map((p) => (
                    <option key={p.id} value={`trabajador:${p.id}`}>
                      {p.nombre}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            {!admitePersona && <p className="mt-1 text-xs text-gray-500">Las instalaciones van con una brigada.</p>}
          </section>

          <section>
            <h3 className={TITULO_SECCION}>
              Comentario <span className="font-normal text-gray-500">(opcional)</span>
            </h3>
            <textarea
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              rows={3}
              placeholder="Llevar escalera, llamar antes de ir…"
              className={cn(CLASE_CAMPO, "resize-y py-2")}
              aria-label="Comentario"
            />
          </section>

          {yaEnPlan && (
            <p className="flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              Ya está en el plan como {ETIQUETA_TIPO[yaEnPlan.tipo].toLowerCase()}, con{" "}
              {yaEnPlan.asignado.tipo === "brigada" ? `la brigada de ${yaEnPlan.asignado.nombre}` : yaEnPlan.asignado.nombre}.
            </p>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
          {!valido && !yaEnPlan && (
            <p className="text-xs text-gray-500 sm:mr-auto">Falta {faltan.join(", ")}.</p>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            disabled={!valido}
            onClick={() => {
              if (!valido || !cliente || !tipo || !quienElegido) return;
              const oferta = ofertas.find((o) => o.id === ofertaId) ?? null;
              onGuardar(cliente, tipo, quienElegido, nota, oferta);
              onOpenChange(false);
            }}
          >
            Añadir al plan {delDia}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
