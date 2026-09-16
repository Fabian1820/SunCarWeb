"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/shared/molecule/popover";
import { Button } from "@/components/shared/atom/button";
import { Input } from "@/components/shared/molecule/input";
import { Switch } from "@/components/shared/molecule/switch";
import { Loader2, MapPin, Save } from "lucide-react";
import {
  DisponibilidadWebService,
  type ProvinciaDisponibilidad,
} from "@/lib/services/feats/materials/disponibilidad-web-service";

interface Props {
  materialId: string;
  /** Precio base del material: se muestra como placeholder de cada provincia. */
  precioBase: number;
  /** Provincias activas conocidas por la tarjeta, para pintar el contador sin abrir. */
  totalActivas: number;
  /** El padre refresca su resumen cuando esto cambia. */
  onGuardado?: (totalActivas: number) => void;
  disabled?: boolean;
}

export function DisponibilidadProvinciasPopover({
  materialId,
  precioBase,
  totalActivas,
  onGuardado,
  disabled,
}: Props) {
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filas, setFilas] = useState<ProvinciaDisponibilidad[]>([]);

  // Se carga al abrir, no al montar: hay decenas de tarjetas en pantalla y no
  // tiene sentido pedir la matriz de todas.
  useEffect(() => {
    if (!abierto) return;
    let cancelado = false;
    setCargando(true);
    setError(null);
    DisponibilidadWebService.getMatriz(materialId)
      .then((data) => {
        if (!cancelado) setFilas(data);
      })
      .catch((e) => {
        if (!cancelado) setError(e?.message ?? "No se pudo cargar la disponibilidad");
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [abierto, materialId]);

  const activas = useMemo(() => filas.filter((f) => f.activo).length, [filas]);

  const setFila = (codigo: string, cambios: Partial<ProvinciaDisponibilidad>) =>
    setFilas((prev) =>
      prev.map((f) =>
        f.provincia_codigo === codigo ? { ...f, ...cambios } : f,
      ),
    );

  const marcarTodas = (activo: boolean) =>
    setFilas((prev) => prev.map((f) => ({ ...f, activo })));

  const guardar = async () => {
    setGuardando(true);
    setError(null);
    try {
      const payload = filas
        .filter((f) => f.activo)
        .map((f) => ({
          provincia_codigo: f.provincia_codigo,
          activo: true,
          precio: f.precio,
        }));
      const actualizado = await DisponibilidadWebService.guardarMatriz(
        materialId,
        payload,
      );
      setFilas(actualizado);
      onGuardado?.(actualizado.filter((f) => f.activo).length);
      setAbierto(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverTrigger asChild>
        <button
          disabled={disabled}
          className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
            totalActivas > 0
              ? "bg-sky-50 text-sky-700 hover:bg-sky-100"
              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
          title={
            disabled
              ? "Habilita la venta web para elegir provincias"
              : "Provincias donde se vende"
          }
        >
          <MapPin className="h-3.5 w-3.5" />
          {totalActivas > 0 ? `${totalActivas} prov.` : "Provincias"}
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-80 p-0" align="start">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <span className="text-sm font-semibold">Disponible en</span>
          <span className="text-xs text-gray-500">{activas}/16</span>
        </div>

        <div className="flex gap-2 px-3 py-2 border-b bg-gray-50">
          <Button size="sm" variant="outline" className="h-7 text-xs"
                  onClick={() => marcarTodas(true)} disabled={cargando || guardando}>
            Todas
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs"
                  onClick={() => marcarTodas(false)} disabled={cargando || guardando}>
            Ninguna
          </Button>
        </div>

        {cargando ? (
          <div className="flex items-center justify-center py-8 text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Cargando…
          </div>
        ) : (
          <div className="max-h-72 overflow-y-auto divide-y">
            {filas.map((f) => (
              <div key={f.provincia_codigo} className="flex items-center gap-2 px-3 py-2">
                <Switch
                  checked={f.activo}
                  onCheckedChange={(v) =>
                    setFila(f.provincia_codigo, { activo: Boolean(v) })
                  }
                />
                <span className="flex-1 text-sm truncate" title={f.provincia_nombre ?? ""}>
                  {f.provincia_nombre ?? f.provincia_codigo}
                </span>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  disabled={!f.activo}
                  value={f.precio ?? ""}
                  // Vacío = hereda el precio base. Por eso el placeholder muestra
                  // el base: sin él, un campo en blanco parece "precio 0".
                  placeholder={String(precioBase ?? 0)}
                  onChange={(e) =>
                    setFila(f.provincia_codigo, {
                      precio: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                  className="w-24 h-7 text-xs"
                />
              </div>
            ))}
          </div>
        )}

        {error && (
          <p className="px-3 py-2 text-xs text-red-600 border-t">{error}</p>
        )}

        <div className="flex items-center justify-between px-3 py-2 border-t bg-gray-50">
          <span className="text-[11px] text-gray-500">
            Precio vacío = usa el base ({precioBase ?? 0})
          </span>
          <Button size="sm" className="h-7 text-xs" onClick={guardar}
                  disabled={cargando || guardando}>
            {guardando ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <><Save className="h-3.5 w-3.5 mr-1" /> Guardar</>
            )}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
