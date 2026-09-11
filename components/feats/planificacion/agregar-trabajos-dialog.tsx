"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
import { Button } from "@/components/shared/atom/button";
import { Input } from "@/components/shared/atom/input";
import { Label } from "@/components/shared/atom/label";
import { Badge } from "@/components/shared/atom/badge";
import { Checkbox } from "@/components/shared/molecule/checkbox";
import { SearchableSelect } from "@/components/shared/molecule/searchable-select";
import { Loader2, Search } from "lucide-react";
import { PlanificacionService } from "@/lib/services/feats/planificacion/planificacion-service";
import { ClienteService } from "@/lib/services/feats/customer/cliente-service";
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
  abierto: boolean;
  onCerrar: () => void;
  brigadas: OpcionAsignable[];
  trabajadores: OpcionAsignable[];
  /** Ya en el plan: se marcan para no meterlos dos veces el mismo día. */
  yaPlanificados: Set<string>;
  onAgregar: (trabajos: TrabajoPlanificado[]) => void;
}

/** Clave estable de un candidato, sea cliente o lead. */
function claveDe(c: CandidatoPlanificacion): string {
  return c.tipo_entidad === "lead" ? `lead:${c.lead_id}` : `cliente:${c.cliente_numero}`;
}

export function AgregarTrabajosDialog({
  abierto,
  onCerrar,
  brigadas,
  trabajadores,
  yaPlanificados,
  onAgregar,
}: Props) {
  const [tipo, setTipo] = useState<TipoTrabajo>("visita");
  const [candidatos, setCandidatos] = useState<CandidatoPlanificacion[]>([]);
  const [cargando, setCargando] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [asignadoA, setAsignadoA] = useState("");
  const [nota, setNota] = useState("");

  // "actualizacion" no sale de ningun estado del cliente, asi que no hay lista
  // que traer: ahi se busca el cliente por nombre.
  const seBuscaAMano = tipo === "actualizacion";

  useEffect(() => {
    if (!abierto) return;
    setMarcados(new Set());
    setBusqueda("");
    if (seBuscaAMano) {
      setCandidatos([]);
      return;
    }
    let cancelado = false;
    setCargando(true);
    PlanificacionService.candidatos(tipo)
      .then((data) => {
        if (!cancelado) setCandidatos(data);
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [abierto, tipo, seBuscaAMano]);

  // Para actualizacion se consulta al escribir, no al abrir.
  useEffect(() => {
    if (!abierto || !seBuscaAMano) return;
    const texto = busqueda.trim();
    if (texto.length < 3) {
      setCandidatos([]);
      return;
    }
    let cancelado = false;
    setCargando(true);
    const id = setTimeout(() => {
      ClienteService.getClientes({ nombre: texto, limit: 30 })
        .then((res) => {
          if (cancelado) return;
          setCandidatos(
            (res.clients || []).map((c: any) => ({
              tipo_entidad: "cliente" as const,
              lead_id: null,
              cliente_numero: c.numero ?? "",
              nombre: c.nombre ?? "",
              telefono: c.telefono ?? "",
              direccion: c.direccion ?? "",
              municipio: c.municipio ?? "",
              estado: c.estado ?? "",
            })),
          );
        })
        .finally(() => {
          if (!cancelado) setCargando(false);
        });
    }, 350);
    return () => {
      cancelado = true;
      clearTimeout(id);
    };
  }, [abierto, seBuscaAMano, busqueda]);

  const visibles = useMemo(() => {
    if (seBuscaAMano) return candidatos;
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return candidatos;
    return candidatos.filter((c) =>
      `${c.nombre} ${c.direccion} ${c.municipio}`.toLowerCase().includes(texto),
    );
  }, [candidatos, busqueda, seBuscaAMano]);

  const opcionesAsignables = useMemo(() => {
    const admiteTrabajador = TIPOS_QUE_ADMITEN_TRABAJADOR.includes(tipo);
    const lista = [
      ...brigadas.map((b) => ({
        value: `brigada:${b.id}`,
        label: `Brigada · ${b.nombre}`,
      })),
      ...(admiteTrabajador
        ? trabajadores.map((t) => ({
            value: `trabajador:${t.id}`,
            label: `Trabajador · ${t.nombre}`,
          }))
        : []),
    ];
    return lista;
  }, [brigadas, trabajadores, tipo]);

  // Al cambiar de tipo, una asignacion a trabajador puede dejar de valer.
  useEffect(() => {
    if (!asignadoA) return;
    if (!opcionesAsignables.some((o) => o.value === asignadoA)) setAsignadoA("");
  }, [opcionesAsignables, asignadoA]);

  function alternar(clave: string) {
    setMarcados((previos) => {
      const copia = new Set(previos);
      if (copia.has(clave)) copia.delete(clave);
      else copia.add(clave);
      return copia;
    });
  }

  function agregar() {
    const [tipoAsignado, idAsignado] = asignadoA.split(":");
    const origen = tipoAsignado === "brigada" ? brigadas : trabajadores;
    const encontrado = origen.find((o) => o.id === idAsignado);
    if (!encontrado) return;

    const asignado: Asignado = {
      tipo: tipoAsignado as "brigada" | "trabajador",
      id: idAsignado,
      nombre: encontrado.nombre,
    };

    const nuevos: TrabajoPlanificado[] = candidatos
      .filter((c) => marcados.has(claveDe(c)))
      .map((c) => ({
        // El id definitivo lo pone el servidor al guardar; aqui basta con que
        // sea distinto para cada fila de la pantalla.
        id: "",
        tipo,
        cliente_numero: c.cliente_numero,
        lead_id: c.lead_id,
        nombre: c.nombre,
        direccion: c.direccion,
        asignado,
        nota: nota.trim() || null,
        estado: "planificado" as const,
      }));

    onAgregar(nuevos);
    setNota("");
    onCerrar();
  }

  const puedeAgregar = marcados.size > 0 && asignadoA !== "";

  return (
    <Dialog open={abierto} onOpenChange={(v) => !v && onCerrar()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Añadir trabajos al plan</DialogTitle>
          <DialogDescription>
            Elige el tipo, marca a quién se le hace y a quién se le asigna.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
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

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder={
                seBuscaAMano
                  ? "Escribe el nombre del cliente (mínimo 3 letras)"
                  : "Filtrar por nombre, dirección o municipio"
              }
              className="pl-9"
            />
          </div>

          <div className="rounded-md border max-h-72 overflow-y-auto divide-y">
            {cargando ? (
              <div className="flex items-center justify-center gap-2 p-8 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando…
              </div>
            ) : visibles.length === 0 ? (
              <p className="p-8 text-center text-sm text-gray-500">
                {seBuscaAMano
                  ? "Busca el cliente por su nombre. Las actualizaciones no salen de ningún estado, así que no hay lista automática."
                  : "No hay nadie en ese estado ahora mismo."}
              </p>
            ) : (
              visibles.map((c) => {
                const clave = claveDe(c);
                const yaEsta = yaPlanificados.has(`${tipo}|${clave}`);
                return (
                  <label
                    key={clave}
                    className={`flex items-start gap-3 p-3 ${
                      yaEsta ? "opacity-50" : "cursor-pointer hover:bg-gray-50"
                    }`}
                  >
                    <Checkbox
                      className="mt-0.5"
                      checked={marcados.has(clave)}
                      disabled={yaEsta}
                      onCheckedChange={() => alternar(clave)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{c.nombre || "Sin nombre"}</span>
                        {c.tipo_entidad === "lead" && (
                          <Badge variant="secondary" className="text-[10px]">
                            Lead
                          </Badge>
                        )}
                        {yaEsta && (
                          <Badge variant="outline" className="text-[10px]">
                            Ya está en el plan
                          </Badge>
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

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Se lo asignamos a</Label>
              <SearchableSelect
                options={opcionesAsignables}
                value={asignadoA}
                onValueChange={setAsignadoA}
                placeholder="Elige brigada o trabajador"
                searchPlaceholder="Buscar…"
              />
              {!TIPOS_QUE_ADMITEN_TRABAJADOR.includes(tipo) && (
                <p className="text-xs text-gray-500">
                  Una instalación la hace una brigada entera, no un trabajador suelto.
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Nota (opcional)</Label>
              <Input
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                placeholder="Llevar escalera, ir temprano…"
              />
            </div>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between gap-3 border-t pt-4">
          <span className="text-sm text-gray-500">
            {marcados.size === 0
              ? "Nada marcado todavía"
              : `${marcados.size} marcado${marcados.size === 1 ? "" : "s"}`}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCerrar}>
              Cancelar
            </Button>
            <Button onClick={agregar} disabled={!puedeAgregar}>
              Añadir al plan
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
