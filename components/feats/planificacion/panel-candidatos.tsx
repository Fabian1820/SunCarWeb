"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/shared/atom/button";
import { Input } from "@/components/shared/atom/input";
import { Badge } from "@/components/shared/atom/badge";
import { Checkbox } from "@/components/shared/molecule/checkbox";
import { SearchableSelect } from "@/components/shared/molecule/searchable-select";
import { Loader2, Search, ArrowRight } from "lucide-react";
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

export interface OpcionAsignable {
  tipo: "brigada" | "trabajador";
  id: string;
  nombre: string;
}

interface Props {
  brigadas: OpcionAsignable[];
  trabajadores: OpcionAsignable[];
  yaPlanificados: Set<string>;
  onAgregar: (trabajos: TrabajoPlanificado[]) => void;
}

function claveDe(c: CandidatoPlanificacion): string {
  return c.tipo_entidad === "lead" ? `lead:${c.lead_id}` : `cliente:${c.cliente_numero}`;
}

export function PanelCandidatos({
  brigadas,
  trabajadores,
  yaPlanificados,
  onAgregar,
}: Props) {
  const [tipo, setTipo] = useState<TipoTrabajo>("visita");
  // El estado del cliente sugiere, no manda: se puede planificar una visita a
  // quien no está pendiente de visita, y eso pasa a menudo.
  const [origen, setOrigen] = useState<"sugeridos" | "buscar">("sugeridos");
  const [candidatos, setCandidatos] = useState<CandidatoPlanificacion[]>([]);
  const [cargando, setCargando] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [asignadoA, setAsignadoA] = useState("");
  const [nota, setNota] = useState("");

  // Actualización no sale de ningún estado, así que ahí no hay sugeridos.
  const sinSugeridos = tipo === "actualizacion";
  const buscandoLibre = sinSugeridos || origen === "buscar";

  useEffect(() => {
    setMarcados(new Set());
    setBusqueda("");
    if (sinSugeridos) setOrigen("buscar");
  }, [tipo, sinSugeridos]);

  useEffect(() => {
    if (buscandoLibre) return;
    let cancelado = false;
    setCargando(true);
    PlanificacionService.candidatos(tipo)
      .then((data) => !cancelado && setCandidatos(data))
      .finally(() => !cancelado && setCargando(false));
    return () => {
      cancelado = true;
    };
  }, [tipo, buscandoLibre]);

  useEffect(() => {
    if (!buscandoLibre) return;
    const texto = busqueda.trim();
    if (texto.length < 3) {
      setCandidatos([]);
      return;
    }
    let cancelado = false;
    setCargando(true);
    const id = setTimeout(() => {
      // Clientes y leads: un trabajo puede ser para cualquiera de los dos.
      Promise.all([
        ClienteService.getClientes({ nombre: texto, limit: 25 }).catch(() => ({ clients: [] })),
        LeadService.getLeads({ nombre: texto, limit: 25 }).catch(() => ({ leads: [] })),
      ])
        .then(([resClientes, resLeads]: any[]) => {
          if (cancelado) return;
          setCandidatos([
            ...(resClientes.clients || []).map((c: any) => ({
              tipo_entidad: "cliente" as const,
              lead_id: null,
              cliente_numero: c.numero ?? "",
              nombre: c.nombre ?? "",
              telefono: c.telefono ?? "",
              direccion: c.direccion ?? "",
              municipio: c.municipio ?? "",
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
              estado: l.estado ?? "",
            })),
          ]);
        })
        .finally(() => !cancelado && setCargando(false));
    }, 350);
    return () => {
      cancelado = true;
      clearTimeout(id);
    };
  }, [buscandoLibre, busqueda]);

  const visibles = useMemo(() => {
    if (buscandoLibre) return candidatos;
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return candidatos;
    return candidatos.filter((c) =>
      `${c.nombre} ${c.direccion} ${c.municipio}`.toLowerCase().includes(texto),
    );
  }, [candidatos, busqueda, buscandoLibre]);

  const disponibles = useMemo(
    () => visibles.filter((c) => !yaPlanificados.has(`${tipo}|${claveDe(c)}`)),
    [visibles, yaPlanificados, tipo],
  );

  const opcionesAsignables = useMemo(() => {
    const admiteTrabajador = TIPOS_QUE_ADMITEN_TRABAJADOR.includes(tipo);
    return [
      ...brigadas.map((b) => ({ value: `brigada:${b.id}`, label: `Brigada · ${b.nombre}` })),
      ...(admiteTrabajador
        ? trabajadores.map((t) => ({ value: `trabajador:${t.id}`, label: `Trabajador · ${t.nombre}` }))
        : []),
    ];
  }, [brigadas, trabajadores, tipo]);

  useEffect(() => {
    if (asignadoA && !opcionesAsignables.some((o) => o.value === asignadoA)) setAsignadoA("");
  }, [opcionesAsignables, asignadoA]);

  function alternar(clave: string) {
    setMarcados((previos) => {
      const copia = new Set(previos);
      copia.has(clave) ? copia.delete(clave) : copia.add(clave);
      return copia;
    });
  }

  const clavesVisibles = useMemo(() => disponibles.map(claveDe), [disponibles]);
  const todosVisiblesMarcados =
    clavesVisibles.length > 0 && clavesVisibles.every((k) => marcados.has(k));

  /**
   * Marca o desmarca solo lo que se ve, sin tocar lo marcado fuera del filtro.
   *
   * Antes comparaba cantidades: con 120 marcados y el filtro dejando 2 a la
   * vista, el boton decia "marcar todos" y al tocarlo cambiaba los 120 por
   * esos 2. Se perdia la seleccion sin avisar.
   */
  function alternarVisibles() {
    setMarcados((previos) => {
      const copia = new Set(previos);
      if (todosVisiblesMarcados) clavesVisibles.forEach((k) => copia.delete(k));
      else clavesVisibles.forEach((k) => copia.add(k));
      return copia;
    });
  }

  function asignar() {
    const [tipoAsignado, idAsignado] = asignadoA.split(":");
    const origenLista = tipoAsignado === "brigada" ? brigadas : trabajadores;
    const encontrado = origenLista.find((o) => o.id === idAsignado);
    if (!encontrado) return;

    const asignado: Asignado = {
      tipo: tipoAsignado as "brigada" | "trabajador",
      id: idAsignado,
      nombre: encontrado.nombre,
    };

    onAgregar(
      candidatos
        .filter((c) => marcados.has(claveDe(c)))
        .map((c) => ({
          // El id definitivo lo pone el servidor al guardar.
          id: "",
          tipo,
          cliente_numero: c.cliente_numero,
          lead_id: c.lead_id,
          nombre: c.nombre,
          direccion: c.direccion,
          asignado,
          nota: nota.trim() || null,
          estado: "planificado" as const,
        })),
    );
    setMarcados(new Set());
    setNota("");
  }

  const puedeAsignar = marcados.size > 0 && asignadoA !== "";

  return (
    <section className="flex min-h-0 flex-col rounded-lg border bg-white">
      <header className="space-y-3 border-b p-4">
        <div className="flex flex-wrap gap-1.5">
          {TIPOS.map((t) => (
            <Button
              key={t}
              type="button"
              size="sm"
              variant={tipo === t ? "default" : "outline"}
              onClick={() => setTipo(t)}
            >
              {ETIQUETA_TIPO[t]}
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!sinSugeridos && (
            <div className="flex items-center gap-1 rounded-md border p-0.5">
              <Button
                type="button"
                size="sm"
                variant={origen === "sugeridos" ? "secondary" : "ghost"}
                onClick={() => setOrigen("sugeridos")}
              >
                Por su estado
              </Button>
              <Button
                type="button"
                size="sm"
                variant={origen === "buscar" ? "secondary" : "ghost"}
                onClick={() => setOrigen("buscar")}
              >
                Buscar cualquiera
              </Button>
            </div>
          )}
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder={
                buscandoLibre
                  ? "Nombre del cliente o lead (mínimo 3 letras)"
                  : "Filtrar por nombre, dirección o municipio"
              }
              className="pl-9"
            />
          </div>
        </div>
      </header>

      <div className="flex items-center justify-between border-b bg-gray-50 px-4 py-2 text-sm">
        <span className="text-gray-600">
          {cargando
            ? "Buscando…"
            : `${disponibles.length} disponible${disponibles.length === 1 ? "" : "s"}`}
          {!cargando && marcados.size > clavesVisibles.filter((k) => marcados.has(k)).length && (
            <span className="ml-2 text-gray-500">
              ({marcados.size} marcados en total, incluidos los que oculta el filtro)
            </span>
          )}
        </span>
        {disponibles.length > 0 && (
          <button
            type="button"
            onClick={alternarVisibles}
            className="font-medium text-teal-700 hover:underline"
          >
            {todosVisiblesMarcados
              ? `Quitar los ${clavesVisibles.length} de la lista`
              : `Marcar los ${clavesVisibles.length} de la lista`}
          </button>
        )}
      </div>

      <div className="min-h-[18rem] flex-1 divide-y overflow-y-auto">
        {cargando ? (
          <div className="flex items-center justify-center gap-2 p-10 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando…
          </div>
        ) : visibles.length === 0 ? (
          <p className="p-10 text-center text-sm text-gray-500">
            {sinSugeridos
              ? "Las actualizaciones no salen de ningún estado: busca el cliente o el lead por su nombre."
              : buscandoLibre
                ? "Escribe al menos tres letras. Aquí sale cualquier cliente o lead, esté en el estado que esté."
                : "No hay nadie en ese estado ahora mismo. Prueba a buscar cualquiera."}
          </p>
        ) : (
          visibles.map((c) => {
            const clave = claveDe(c);
            const yaEsta = yaPlanificados.has(`${tipo}|${clave}`);
            return (
              <label
                key={clave}
                className={`flex items-start gap-3 px-4 py-2.5 ${
                  yaEsta ? "opacity-45" : "cursor-pointer hover:bg-gray-50"
                }`}
              >
                <Checkbox
                  className="mt-0.5"
                  checked={marcados.has(clave)}
                  disabled={yaEsta}
                  onCheckedChange={() => alternar(clave)}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-medium text-gray-900">{c.nombre || "Sin nombre"}</span>
                    {c.tipo_entidad === "lead" && (
                      <Badge variant="secondary" className="text-[10px]">Lead</Badge>
                    )}
                    {buscandoLibre && c.estado && (
                      <Badge variant="outline" className="text-[10px] font-normal">{c.estado}</Badge>
                    )}
                    {yaEsta && (
                      <Badge variant="outline" className="text-[10px]">Ya está en el plan</Badge>
                    )}
                  </span>
                  <span className="block truncate text-xs text-gray-500">
                    {[c.direccion, c.municipio].filter(Boolean).join(" · ") || "Sin dirección"}
                  </span>
                </span>
              </label>
            );
          })
        )}
      </div>

      <footer className="space-y-3 border-t bg-gray-50 p-4">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <SearchableSelect
            options={opcionesAsignables}
            value={asignadoA}
            onValueChange={setAsignadoA}
            placeholder="Asignar a brigada o trabajador"
            searchPlaceholder="Buscar…"
          />
          <Input
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Nota para estos trabajos (opcional)"
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-600">
            {marcados.size === 0
              ? TIPOS_QUE_ADMITEN_TRABAJADOR.includes(tipo)
                ? "Marca a quién visitar y elige quién va"
                : "Una instalación la hace una brigada entera, no un trabajador suelto"
              : `${marcados.size} marcado${marcados.size === 1 ? "" : "s"}`}
          </p>
          <Button onClick={asignar} disabled={!puedeAsignar}>
            Añadir al plan
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </footer>
    </section>
  );
}
