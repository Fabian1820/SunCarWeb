"use client";

import {
  useEffect,
  useState,
  type ComponentProps,
  type KeyboardEvent,
  type MutableRefObject,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  MoreHorizontal,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/shared/atom/button";
import { Input } from "@/components/shared/molecule/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/shared/molecule/dropdown-menu";
import { cn } from "@/lib/utils";
import type {
  CargoOrganigrama,
  NodoOrganigrama,
} from "@/lib/types/feats/organigramas/organigrama-types";
import {
  actualizarNodo,
  eliminarNodo,
  entero,
  moverEnLista,
  moverNodo,
  nuevaArea,
  nuevoCargo,
  plazasDeNodo,
  rutaHasta,
} from "@/lib/services/feats/organigramas/organigrama-arbol";
import type { SeleccionOrganigrama } from "./organigrama-lienzo";

export const idCampoNodo = (id: string) => `organigrama-nodo-${id}`;
export const idCampoCargo = (id: string) => `organigrama-cargo-${id}`;

export interface ControlEditorOrganigrama {
  /** Despliega las áreas que hagan falta y pone el foco en el campo. */
  enfocar: (seleccion: SeleccionOrganigrama) => void;
}

interface Acciones {
  cambiar: (
    id: string,
    cambio: (nodo: NodoOrganigrama) => NodoOrganigrama,
    clave?: string,
  ) => void;
  eliminar: (id: string) => void;
  mover: (id: string, delta: number) => void;
  enfocarCampo: (idCampo: string) => void;
  alternarPlegada: (id: string) => void;
  plegadas: Set<string>;
  onEnfocar?: (seleccion: SeleccionOrganigrama) => void;
}

interface OrganigramaEditorProps {
  raiz: NodoOrganigrama;
  /** `clave` agrupa en un solo paso de deshacer lo que se escribe seguido en un campo. */
  onChange: (raiz: NodoOrganigrama, clave?: string) => void;
  onEnfocar?: (seleccion: SeleccionOrganigrama) => void;
  controlRef?: MutableRefObject<ControlEditorOrganigrama | null>;
}

export function OrganigramaEditor({
  raiz,
  onChange,
  onEnfocar,
  controlRef,
}: OrganigramaEditorProps) {
  const [plegadas, setPlegadas] = useState<Set<string>>(() => new Set());
  const [campoPendiente, setCampoPendiente] = useState<string | null>(null);

  // El foco se pone después de pintar: el campo nuevo aún no existe cuando se
  // pide (fila recién añadida, área que se acaba de desplegar).
  useEffect(() => {
    if (!campoPendiente) return;
    const campo = document.getElementById(campoPendiente);
    setCampoPendiente(null);
    if (!campo) return;
    campo.scrollIntoView({ block: "center", behavior: "smooth" });
    campo.focus({ preventScroll: true });
  }, [campoPendiente, raiz, plegadas]);

  useEffect(() => {
    if (!controlRef) return;
    controlRef.current = {
      enfocar: ({ nodoId, cargoId }) => {
        const ruta = rutaHasta(raiz, nodoId) ?? [];
        setPlegadas((actual) => {
          if (!ruta.some((id) => actual.has(id))) return actual;
          const nuevo = new Set(actual);
          ruta.forEach((id) => nuevo.delete(id));
          return nuevo;
        });
        setCampoPendiente(cargoId ? idCampoCargo(cargoId) : idCampoNodo(nodoId));
      },
    };
  }, [controlRef, raiz]);

  const acciones: Acciones = {
    cambiar: (id, cambio, clave) => onChange(actualizarNodo(raiz, id, cambio), clave),
    eliminar: (id) => onChange(eliminarNodo(raiz, id)),
    mover: (id, delta) => onChange(moverNodo(raiz, id, delta)),
    enfocarCampo: setCampoPendiente,
    alternarPlegada: (id) =>
      setPlegadas((actual) => {
        const nuevo = new Set(actual);
        if (nuevo.has(id)) nuevo.delete(id);
        else nuevo.add(id);
        return nuevo;
      }),
    plegadas,
    onEnfocar,
  };

  const agregarArea = () => {
    const area = nuevaArea();
    onChange({ ...raiz, hijos: [...raiz.hijos, area] });
    setCampoPendiente(idCampoNodo(area.id));
  };

  return (
    <div className="space-y-4">
      <AreaEditor nodo={raiz} esRaiz indice={0} hermanos={1} acciones={acciones} />

      <section aria-labelledby="organigrama-areas" className="space-y-2">
        <h2 id="organigrama-areas" className="text-sm font-semibold text-gray-700">
          Áreas <span className="font-normal text-gray-500">({raiz.hijos.length})</span>
        </h2>
        {raiz.hijos.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-300 bg-white px-3 py-4 text-sm text-gray-500">
            Añade las áreas o departamentos que dependen de dirección: Compras, Comercial,
            Tiendas…
          </p>
        ) : (
          raiz.hijos.map((hijo, i) => (
            <AreaEditor
              key={hijo.id}
              nodo={hijo}
              indice={i}
              hermanos={raiz.hijos.length}
              acciones={acciones}
            />
          ))
        )}
        <Button
          type="button"
          variant="outline"
          onClick={agregarArea}
          className="w-full border-dashed"
        >
          <Plus className="mr-1 h-4 w-4" />
          Añadir área
        </Button>
      </section>
    </div>
  );
}

function resumenArea(nodo: NodoOrganigrama): string {
  const partes = [
    `${nodo.cargos.length} ${nodo.cargos.length === 1 ? "cargo" : "cargos"}`,
    `${plazasDeNodo(nodo)} plazas`,
  ];
  if (nodo.hijos.length) {
    partes.push(`${nodo.hijos.length} ${nodo.hijos.length === 1 ? "subárea" : "subáreas"}`);
  }
  if (nodo.unidades > 1) partes.push(`× ${nodo.unidades} unidades`);
  return partes.join(" · ");
}

function AreaEditor({
  nodo,
  esRaiz = false,
  indice,
  hermanos,
  acciones,
}: {
  nodo: NodoOrganigrama;
  esRaiz?: boolean;
  indice: number;
  hermanos: number;
  acciones: Acciones;
}) {
  const plegada = !esRaiz && acciones.plegadas.has(nodo.id);
  const tieneSubareas = nodo.hijos.length > 0;

  const cambiar = (cambio: (n: NodoOrganigrama) => NodoOrganigrama, clave?: string) =>
    acciones.cambiar(nodo.id, cambio, clave);
  const enfocarNodo = () => acciones.onEnfocar?.({ nodoId: nodo.id });

  const agregarCargo = (despuesDe?: number) => {
    const cargo = nuevoCargo();
    const referencia =
      despuesDe === undefined ? nodo.cargos[nodo.cargos.length - 1] : nodo.cargos[despuesDe];
    if (referencia) cargo.lado = referencia.lado;
    const posicion = despuesDe === undefined ? nodo.cargos.length : despuesDe + 1;
    cambiar((n) => {
      const cargos = [...n.cargos];
      cargos.splice(posicion, 0, cargo);
      return { ...n, cargos };
    });
    acciones.enfocarCampo(idCampoCargo(cargo.id));
  };

  const agregarSubarea = () => {
    const area = nuevaArea();
    cambiar((n) => ({ ...n, hijos: [...n.hijos, area] }));
    if (plegada) acciones.alternarPlegada(nodo.id);
    acciones.enfocarCampo(idCampoNodo(area.id));
  };

  const cambiarCargo = (cargoId: string, parcial: Partial<CargoOrganigrama>, clave?: string) =>
    cambiar(
      (n) => ({
        ...n,
        cargos: n.cargos.map((c) => (c.id === cargoId ? { ...c, ...parcial } : c)),
      }),
      clave,
    );

  const eliminarCargo = (i: number) => {
    const vecino = nodo.cargos[i - 1] ?? nodo.cargos[i + 1];
    cambiar((n) => ({ ...n, cargos: n.cargos.filter((_, j) => j !== i) }));
    if (vecino) acciones.enfocarCampo(idCampoCargo(vecino.id));
  };

  return (
    <section
      className={cn(
        "rounded-lg border bg-white",
        esRaiz ? "border-[#2E5E1E]/40 shadow-sm" : "border-gray-200",
      )}
    >
      <div className="flex items-center gap-1.5 p-2">
        {esRaiz ? (
          <span className="ml-1 mr-0.5 h-3 w-3 shrink-0 rounded-sm bg-[#2E5E1E]" aria-hidden />
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => acciones.alternarPlegada(nodo.id)}
            aria-expanded={!plegada}
            aria-label={plegada ? "Desplegar área" : "Plegar área"}
          >
            {plegada ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        )}

        <Input
          id={idCampoNodo(nodo.id)}
          value={nodo.nombre}
          onChange={(e) =>
            cambiar((n) => ({ ...n, nombre: e.target.value }), `nombre:${nodo.id}`)
          }
          onFocus={enfocarNodo}
          maxLength={120}
          placeholder={esRaiz ? "Cargo principal, p. ej. Directora de Ventas" : "Nombre del área"}
          aria-label={esRaiz ? "Cargo principal" : "Nombre del área"}
          className="h-9 min-w-0 flex-1 font-semibold"
        />

        {esRaiz ? (
          <CampoNumero
            valor={nodo.cantidad ?? 0}
            min={0}
            max={9999}
            onCambiar={(v) => cambiar((n) => ({ ...n, cantidad: v }), `cantidad:${nodo.id}`)}
            onFocus={enfocarNodo}
            etiqueta="Plazas del cargo principal"
          />
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                aria-label={`Acciones del área ${nodo.nombre || "sin nombre"}`}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            {/* Sin devolver el foco al botón: a veces lo pide un campo recién creado. */}
            <DropdownMenuContent align="end" onCloseAutoFocus={(e) => e.preventDefault()}>
              <DropdownMenuItem disabled={indice === 0} onSelect={() => acciones.mover(nodo.id, -1)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Mover a la izquierda
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={indice === hermanos - 1}
                onSelect={() => acciones.mover(nodo.id, 1)}
              >
                <ArrowRight className="mr-2 h-4 w-4" />
                Mover a la derecha
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => acciones.eliminar(nodo.id)}
                className="text-red-600 focus:text-red-700"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar área
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <p className="-mt-1 px-3 pb-2 text-xs text-gray-500">{resumenArea(nodo)}</p>

      {!plegada && (
        <div className="space-y-3 border-t border-gray-100 p-2 pt-3">
          {!esRaiz && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-1">
              <label
                htmlFor={`organigrama-unidades-${nodo.id}`}
                className="text-xs font-medium text-gray-600"
              >
                Unidades
              </label>
              <CampoNumero
                id={`organigrama-unidades-${nodo.id}`}
                valor={nodo.unidades}
                min={1}
                max={50}
                onCambiar={(v) => cambiar((n) => ({ ...n, unidades: v }), `unidades:${nodo.id}`)}
                onFocus={enfocarNodo}
                etiqueta="Unidades iguales"
              />
              <span className="text-xs text-gray-400">Más de 1 si se repite igual, como 3 tiendas</span>
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between px-1">
              <h3 className="text-xs font-medium uppercase tracking-wide text-gray-500">
                {tieneSubareas ? "Cargos de apoyo" : "Cargos"}
              </h3>
              {nodo.cargos.length > 0 && (
                <span className="text-[11px] text-gray-400">Plazas · Cargo</span>
              )}
            </div>
            {tieneSubareas && nodo.cargos.length > 0 && (
              <p className="px-1 text-xs text-gray-500">
                Cuelgan a un lado del tronco; la flecha cambia el lado.
              </p>
            )}
            {nodo.cargos.map((cargo, i) => (
              <FilaCargo
                key={cargo.id}
                cargo={cargo}
                indice={i}
                total={nodo.cargos.length}
                mostrarLado={tieneSubareas}
                onCambiar={(parcial, clave) => cambiarCargo(cargo.id, parcial, clave)}
                onEliminar={() => eliminarCargo(i)}
                onMover={(delta) =>
                  cambiar((n) => ({ ...n, cargos: moverEnLista(n.cargos, i, delta) }))
                }
                onSiguiente={() => agregarCargo(i)}
                onFocus={() => acciones.onEnfocar?.({ nodoId: nodo.id, cargoId: cargo.id })}
              />
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => agregarCargo()}
              className="h-8 text-[#3B6B1B] hover:bg-green-50 hover:text-[#2E5E1E]"
            >
              <Plus className="mr-1 h-4 w-4" />
              Añadir cargo
            </Button>
          </div>

          {!esRaiz && (
            <>
              {tieneSubareas && (
                <div className="space-y-2 border-l-2 border-gray-100 pl-2">
                  {nodo.hijos.map((hijo, i) => (
                    <AreaEditor
                      key={hijo.id}
                      nodo={hijo}
                      indice={i}
                      hermanos={nodo.hijos.length}
                      acciones={acciones}
                    />
                  ))}
                </div>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={agregarSubarea}
                className="h-8 text-gray-600"
              >
                <Plus className="mr-1 h-4 w-4" />
                Añadir subárea
              </Button>
            </>
          )}
        </div>
      )}
    </section>
  );
}

function FilaCargo({
  cargo,
  indice,
  total,
  mostrarLado,
  onCambiar,
  onEliminar,
  onMover,
  onSiguiente,
  onFocus,
}: {
  cargo: CargoOrganigrama;
  indice: number;
  total: number;
  mostrarLado: boolean;
  onCambiar: (parcial: Partial<CargoOrganigrama>, clave?: string) => void;
  onEliminar: () => void;
  onMover: (delta: number) => void;
  onSiguiente: () => void;
  onFocus: () => void;
}) {
  const alTeclear = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onSiguiente();
      return;
    }
    // Borrar con la fila ya vacía la quita. Sin `repeat`: mantener pulsada la
    // tecla no debe llevarse también las filas de arriba.
    if (e.key === "Backspace" && !e.repeat && cargo.nombre === "") {
      e.preventDefault();
      onEliminar();
    }
  };
  const izquierda = cargo.lado === "izquierda";

  return (
    <div className="flex items-center gap-1">
      <CampoNumero
        valor={cargo.cantidad}
        min={0}
        max={9999}
        onCambiar={(v) => onCambiar({ cantidad: v }, `cantidad:${cargo.id}`)}
        onFocus={onFocus}
        etiqueta={`Plazas de ${cargo.nombre || "cargo sin nombre"}`}
      />
      <Input
        id={idCampoCargo(cargo.id)}
        value={cargo.nombre}
        onChange={(e) => onCambiar({ nombre: e.target.value }, `nombre:${cargo.id}`)}
        onKeyDown={alTeclear}
        onFocus={onFocus}
        maxLength={120}
        placeholder="Nombre del cargo"
        aria-label="Nombre del cargo"
        className="h-8 min-w-0 flex-1 text-sm"
      />
      {mostrarLado && (
        <BotonIcono
          etiqueta={
            izquierda
              ? "A la izquierda del tronco. Pasar a la derecha"
              : "A la derecha del tronco. Pasar a la izquierda"
          }
          onClick={() => onCambiar({ lado: izquierda ? "derecha" : "izquierda" })}
        >
          {izquierda ? <ArrowLeft /> : <ArrowRight />}
        </BotonIcono>
      )}
      <BotonIcono etiqueta="Subir cargo" disabled={indice === 0} onClick={() => onMover(-1)}>
        <ChevronUp />
      </BotonIcono>
      <BotonIcono etiqueta="Bajar cargo" disabled={indice === total - 1} onClick={() => onMover(1)}>
        <ChevronDown />
      </BotonIcono>
      <BotonIcono etiqueta="Eliminar cargo" onClick={onEliminar} className="hover:text-red-600">
        <Trash2 />
      </BotonIcono>
    </div>
  );
}

function BotonIcono({
  etiqueta,
  className,
  children,
  ...props
}: { etiqueta: string } & ComponentProps<typeof Button>) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      title={etiqueta}
      aria-label={etiqueta}
      className={cn("h-7 w-7 shrink-0 text-gray-500 [&_svg]:h-4 [&_svg]:w-4", className)}
      {...props}
    >
      {children}
    </Button>
  );
}

function CampoNumero({
  id,
  valor,
  min,
  max,
  onCambiar,
  onFocus,
  etiqueta,
}: {
  id?: string;
  valor: number;
  min: number;
  max: number;
  onCambiar: (valor: number) => void;
  onFocus?: () => void;
  etiqueta: string;
}) {
  return (
    <Input
      id={id}
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      value={String(valor)}
      onChange={(e) => onCambiar(entero(e.target.value, min, max, min))}
      onFocus={(e) => {
        e.currentTarget.select();
        onFocus?.();
      }}
      aria-label={etiqueta}
      title={etiqueta}
      className="h-8 w-14 shrink-0 px-1 text-center font-semibold tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
    />
  );
}
