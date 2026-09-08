"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/shared/atom/button";
import { Eraser } from "lucide-react";

interface PadFirmaProps {
  titulo: string;
  valor?: string | null;
  onChange: (dataUrl: string | null) => void;
  disabled?: boolean;
}

/**
 * Lienzo para firmar con el ratón o el dedo. Al levantar el puntero entrega la
 * firma completa como data URI PNG, que es lo que guarda el backend y lo que
 * sale al final del informe PDF de la visita.
 */
export function PadFirma({ titulo, valor, onChange, disabled }: PadFirmaProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dibujando = useRef(false);
  const [tieneTrazo, setTieneTrazo] = useState(Boolean(valor));

  // El canvas se dimensiona en píxeles reales para que la firma no salga
  // pixelada en pantallas con densidad alta.
  const prepararLienzo = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0) return;
    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(rect.height * ratio);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0a052d";
  }, []);

  useEffect(() => {
    prepararLienzo();
  }, [prepararLienzo]);

  const posicion = (evento: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: evento.clientX - rect.left, y: evento.clientY - rect.top };
  };

  const alPresionar = (evento: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    dibujando.current = true;
    canvasRef.current?.setPointerCapture(evento.pointerId);
    const { x, y } = posicion(evento);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const alMover = (evento: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dibujando.current || disabled) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = posicion(evento);
    ctx.lineTo(x, y);
    ctx.stroke();
    setTieneTrazo(true);
  };

  const alSoltar = (evento: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dibujando.current) return;
    dibujando.current = false;
    canvasRef.current?.releasePointerCapture(evento.pointerId);
    const canvas = canvasRef.current;
    if (!canvas) return;
    onChange(tieneTrazo ? canvas.toDataURL("image/png") : null);
  };

  const limpiar = () => {
    prepararLienzo();
    setTieneTrazo(false);
    onChange(null);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700">{titulo}</p>
        {tieneTrazo ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={limpiar}
            disabled={disabled}
          >
            <Eraser className="h-3.5 w-3.5 mr-1" />
            Borrar
          </Button>
        ) : null}
      </div>
      <div className="relative rounded-lg border border-slate-300 bg-white">
        <canvas
          ref={canvasRef}
          className="h-40 w-full touch-none rounded-lg"
          onPointerDown={alPresionar}
          onPointerMove={alMover}
          onPointerUp={alSoltar}
          onPointerLeave={alSoltar}
        />
        {!tieneTrazo ? (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-slate-400">
            Firma aquí
          </p>
        ) : null}
      </div>
    </div>
  );
}
