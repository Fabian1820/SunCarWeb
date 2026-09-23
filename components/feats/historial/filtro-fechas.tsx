"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { FiltroFechas } from "@/lib/types/feats/historial/historial-types";

type Modo = "este_mes" | "mes" | "rango";
type Rango = { desde?: string; hasta?: string };

const CLASE_CAMPO =
  "h-10 w-full rounded-md border border-gray-300 bg-white px-2 text-sm text-gray-900 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600";

const pad = (n: number) => String(n).padStart(2, "0");

function rangoDeMes(anio: number, mes: number): Rango {
  const ultimo = new Date(anio, mes, 0).getDate();
  return {
    desde: `${anio}-${pad(mes)}-01`,
    hasta: `${anio}-${pad(mes)}-${pad(ultimo)}`,
  };
}

function rangoEsteMes(): Rango {
  const hoy = new Date();
  return rangoDeMes(hoy.getFullYear(), hoy.getMonth() + 1);
}

function modoDe(r: Rango): Modo | null {
  if (!r.desde && !r.hasta) return null;
  const este = rangoEsteMes();
  if (r.desde === este.desde && r.hasta === este.hasta) return "este_mes";
  if (r.desde && r.hasta && r.desde.endsWith("-01")) {
    const [a, m] = r.desde.split("-").map(Number);
    if (rangoDeMes(a, m).hasta === r.hasta) return "mes";
  }
  return "rango";
}

function GrupoFecha({
  titulo,
  valor,
  onChange,
}: {
  titulo: string;
  valor: Rango;
  onChange: (r: Rango) => void;
}) {
  const [elegido, setElegido] = useState<Modo | null>(() => modoDe(valor));
  // «Este mes» sin fechas es que alguien quitó el filtro desde fuera.
  const modo =
    elegido === "este_mes" && !valor.desde ? null : (elegido ?? modoDe(valor));

  function elegir(m: Modo) {
    setElegido(m);
    if (m === "este_mes") onChange(rangoEsteMes());
    else if (m === "mes")
      onChange(valor.desde && modoDe(valor) === "mes" ? valor : {});
    else onChange(valor);
  }

  function quitar() {
    setElegido(null);
    onChange({});
  }

  const hayValor = Boolean(valor.desde || valor.hasta);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
          {titulo}
        </span>
        {(
          [
            ["este_mes", "Este mes"],
            ["mes", "Un mes"],
            ["rango", "Rango"],
          ] as const
        ).map(([clave, texto]) => (
          <button
            key={clave}
            type="button"
            aria-pressed={modo === clave}
            onClick={() => elegir(clave)}
            className={cn(
              "min-h-8 rounded-full border px-3 text-xs font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600",
              modo === clave
                ? "border-emerald-800 bg-emerald-800 text-white"
                : "border-gray-300 bg-white text-gray-700 hover:border-gray-400",
            )}
          >
            {texto}
          </button>
        ))}
        {(hayValor || modo) && (
          <button
            type="button"
            onClick={quitar}
            className="min-h-8 px-2 text-xs font-medium text-emerald-800 hover:underline"
          >
            Quitar
          </button>
        )}
      </div>

      {modo === "mes" && (
        <label className="mt-1.5 block text-xs font-medium text-gray-600">
          <span className="sr-only">Mes de {titulo.toLowerCase()}</span>
          <input
            type="month"
            value={valor.desde ? valor.desde.slice(0, 7) : ""}
            onChange={(e) => {
              const [a, m] = e.target.value.split("-").map(Number);
              onChange(a && m ? rangoDeMes(a, m) : {});
            }}
            className={CLASE_CAMPO}
          />
        </label>
      )}

      {modo === "rango" && (
        <div className="mt-1.5 grid grid-cols-2 gap-2">
          <label className="text-xs font-medium text-gray-600">
            Desde
            <input
              type="date"
              value={valor.desde ?? ""}
              max={valor.hasta}
              onChange={(e) =>
                onChange({ ...valor, desde: e.target.value || undefined })
              }
              className={cn(CLASE_CAMPO, "mt-1")}
            />
          </label>
          <label className="text-xs font-medium text-gray-600">
            Hasta
            <input
              type="date"
              value={valor.hasta ?? ""}
              min={valor.desde}
              onChange={(e) =>
                onChange({ ...valor, hasta: e.target.value || undefined })
              }
              className={cn(CLASE_CAMPO, "mt-1")}
            />
          </label>
        </div>
      )}

      {modo === "este_mes" && valor.desde && valor.hasta && (
        <p className="mt-1 text-xs text-gray-500">
          Del {valor.desde.split("-").reverse().join("/")} al{" "}
          {valor.hasta.split("-").reverse().join("/")}
        </p>
      )}
    </div>
  );
}

/**
 * Dos filtros de fecha: cuándo se creó el cliente y cuándo quedó instalado.
 * Cada uno, por «este mes», por un mes concreto o por un rango de días.
 */
export function FiltroFechasCliente({
  valor,
  onChange,
  className,
}: {
  valor: FiltroFechas;
  onChange: (v: FiltroFechas) => void;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      <GrupoFecha
        titulo="Creado"
        valor={{ desde: valor.desde, hasta: valor.hasta }}
        onChange={(r) => onChange({ ...valor, desde: r.desde, hasta: r.hasta })}
      />
      <GrupoFecha
        titulo="Instalado"
        valor={{ desde: valor.instalado_desde, hasta: valor.instalado_hasta }}
        onChange={(r) =>
          onChange({
            ...valor,
            instalado_desde: r.desde,
            instalado_hasta: r.hasta,
          })
        }
      />
    </div>
  );
}

export function contarFiltrosFecha(v: FiltroFechas): number {
  return (
    (v.desde || v.hasta ? 1 : 0) +
    (v.instalado_desde || v.instalado_hasta ? 1 : 0)
  );
}
