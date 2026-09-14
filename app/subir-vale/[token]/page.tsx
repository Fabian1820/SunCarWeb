"use client";

/**
 * Pagina publica para adjuntar el vale firmado desde el telefono.
 *
 * Se llega aqui escaneando el QR que sale del dialogo de adjuntos del vale. No
 * hay login: el token de la URL es la credencial, dura 15 minutos y solo deja
 * escribir en ese vale. Por eso la ruta esta en RUTAS_PUBLICAS del AuthGuard.
 *
 * Diseñada para una pantalla de movil y para datos moviles: las fotos se
 * reescalan en el telefono antes de salir.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/shared/atom/button";
import {
  AlertTriangle,
  Camera,
  Check,
  CheckCircle2,
  FileText,
  Loader2,
  Paperclip,
  Upload,
} from "lucide-react";
import { SubidaMovilValeService } from "@/lib/services/feats/vales-salida/subida-movil-vale-service";
import {
  comprimirImagenSiAplica,
  formatearTamano,
} from "@/lib/utils/comprimir-imagen";
import type { ContextoSubidaMovilVale } from "@/lib/api-types";

export default function SubirValePage() {
  const params = useParams();
  const token = (params?.token as string) || "";

  const camaraRef = useRef<HTMLInputElement>(null);
  const archivoRef = useRef<HTMLInputElement>(null);

  const [contexto, setContexto] = useState<ContextoSubidaMovilVale | null>(null);
  const [cargando, setCargando] = useState(true);
  const [errorEnlace, setErrorEnlace] = useState<string | null>(null);

  const [subiendo, setSubiendo] = useState(false);
  const [errorSubida, setErrorSubida] = useState<string | null>(null);
  const [subidos, setSubidos] = useState<{ nombre: string; tamano: number }[]>(
    [],
  );

  const cargarContexto = useCallback(async () => {
    if (!token) {
      setErrorEnlace("El enlace esta incompleto");
      setCargando(false);
      return;
    }
    setCargando(true);
    try {
      setContexto(await SubidaMovilValeService.getContexto(token));
      setErrorEnlace(null);
    } catch (e) {
      setErrorEnlace(
        e instanceof Error ? e.message : "El enlace no es valido o ya caduco",
      );
    } finally {
      setCargando(false);
    }
  }, [token]);

  useEffect(() => {
    void cargarContexto();
  }, [cargarContexto]);

  const subir = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setSubiendo(true);
    setErrorSubida(null);
    try {
      const preparados = await Promise.all(
        Array.from(files).map((f) => comprimirImagenSiAplica(f)),
      );
      const resultado = await SubidaMovilValeService.subir(token, preparados);
      setSubidos((prev) => [
        ...prev,
        ...resultado.map((a) => ({ nombre: a.nombre, tamano: a.tamano })),
      ]);
    } catch (e) {
      setErrorSubida(
        e instanceof Error ? e.message : "No se pudo subir el documento",
      );
    } finally {
      setSubiendo(false);
      if (camaraRef.current) camaraRef.current.value = "";
      if (archivoRef.current) archivoRef.current.value = "";
    }
  };

  if (cargando) {
    return (
      <Pantalla>
        <div className="flex flex-col items-center gap-3 py-16 text-gray-500">
          <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
          <p className="text-sm">Abriendo el vale...</p>
        </div>
      </Pantalla>
    );
  }

  if (errorEnlace || !contexto) {
    return (
      <Pantalla>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-center">
          <AlertTriangle className="h-9 w-9 text-amber-500 mx-auto mb-3" />
          <h2 className="text-base font-semibold text-amber-900">
            Enlace no valido
          </h2>
          <p className="mt-2 text-sm text-amber-800">{errorEnlace}</p>
          <p className="mt-3 text-xs text-amber-700">
            Los enlaces duran 15 minutos. Vuelve al vale en la computadora y
            genera un codigo QR nuevo.
          </p>
        </div>
      </Pantalla>
    );
  }

  return (
    <Pantalla>
      {/* Que vale es: quien sube tiene que poder confirmarlo antes de disparar */}
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex items-center gap-2 text-emerald-800">
          <Paperclip className="h-4 w-4" />
          <span className="text-xs font-medium uppercase tracking-wide">
            Vale de salida
          </span>
        </div>
        <p className="mt-1 font-mono text-xl font-bold text-emerald-900">
          {contexto.codigo}
        </p>
        {contexto.cliente_nombre ? (
          <p className="mt-1 text-sm text-emerald-800">
            {contexto.cliente_nombre}
          </p>
        ) : null}
        <p className="mt-1 text-xs text-emerald-700">
          {contexto.total_materiales} material(es)
          {contexto.adjuntos_count > 0
            ? ` · ${contexto.adjuntos_count} documento(s) ya adjunto(s)`
            : ""}
        </p>
      </div>

      <p className="text-sm text-gray-600">
        Toma la foto del vale ya firmado. Procura que se lean la firma y el
        codigo del vale.
      </p>

      <input
        ref={camaraRef}
        type="file"
        className="hidden"
        accept="image/*"
        capture="environment"
        onChange={(e) => void subir(e.target.files)}
      />
      <input
        ref={archivoRef}
        type="file"
        multiple
        className="hidden"
        accept="image/*,.pdf,.heic,.heif"
        onChange={(e) => void subir(e.target.files)}
      />

      <div className="space-y-2">
        <Button
          onClick={() => camaraRef.current?.click()}
          disabled={subiendo}
          className="w-full h-14 text-base bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {subiendo ? (
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
          ) : (
            <Camera className="h-5 w-5 mr-2" />
          )}
          {subiendo ? "Subiendo..." : "Tomar foto del vale"}
        </Button>

        <Button
          variant="outline"
          onClick={() => archivoRef.current?.click()}
          disabled={subiendo}
          className="w-full h-12 border-gray-300 text-gray-700"
        >
          <Upload className="h-4 w-4 mr-2" />
          Elegir de la galeria
        </Button>
      </div>

      {errorSubida ? (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{errorSubida}</span>
        </div>
      ) : null}

      {subidos.length > 0 ? (
        <div className="rounded-xl border border-emerald-200 bg-white p-4">
          <div className="flex items-center gap-2 text-emerald-700">
            <CheckCircle2 className="h-5 w-5" />
            <p className="text-sm font-semibold">
              {subidos.length} documento(s) subido(s)
            </p>
          </div>
          <ul className="mt-3 space-y-2">
            {subidos.map((a, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span className="truncate flex-1 text-gray-800">{a.nombre}</span>
                <span className="text-xs text-gray-500">
                  {formatearTamano(a.tamano)}
                </span>
                <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-gray-500">
            Ya aparecen en el vale. Puedes cerrar esta pagina, o seguir
            adjuntando mas.
          </p>
        </div>
      ) : null}
    </Pantalla>
  );
}

function Pantalla({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f4f9f6] via-white to-[#e8f4ee] px-4 py-6">
      <div className="mx-auto w-full max-w-md space-y-4">
        <header className="text-center">
          <h1 className="text-lg font-bold text-gray-900">
            Adjuntar vale firmado
          </h1>
          <p className="text-xs text-gray-500">SunCar · Almacen</p>
        </header>
        {children}
      </div>
    </div>
  );
}
