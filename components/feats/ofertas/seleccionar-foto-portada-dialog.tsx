"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
import { AlertCircle, Check, ImageIcon, Loader2 } from "lucide-react";

interface FotoPortadaDisponible {
  url: string;
  numeroOferta: string;
  nombre: string;
}

interface SeleccionarFotoPortadaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSeleccionar: (url: string) => void;
}

/**
 * Catálogo de fotos de portada ya en nuestro S3, para elegir una en vez de
 * subir una nueva. De momento se alimenta de las fotos que ya tienen las
 * ofertas genéricas aprobadas (son las que un superAdmin dejó listas como
 * plantilla, así que su foto ya está pensada para representar esa
 * combinación de materiales) — no lista el bucket completo porque ahí
 * también viven fotos de otras cosas (averías, trabajadores...) sin ninguna
 * carpeta que las separe.
 */
export function SeleccionarFotoPortadaDialog({
  open,
  onOpenChange,
  onSeleccionar,
}: SeleccionarFotoPortadaDialogProps) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fotos, setFotos] = useState<FotoPortadaDisponible[]>([]);
  const [cargadoAlMenosUnaVez, setCargadoAlMenosUnaVez] = useState(false);

  useEffect(() => {
    if (!open || cargadoAlMenosUnaVez) return;

    const cargar = async () => {
      setCargando(true);
      setError(null);
      try {
        const { apiRequest } = await import("@/lib/api-config");
        const response = await apiRequest<any>(
          "/ofertas/confeccion/genericas/aprobadas",
          { method: "GET" },
        );
        const crudas: any[] = Array.isArray(response)
          ? response
          : (response?.data ?? response?.ofertas ?? response?.results ?? []);

        const vistas = new Set<string>();
        const disponibles: FotoPortadaDisponible[] = [];
        for (const oferta of crudas) {
          const url = oferta?.foto_portada;
          if (!url || vistas.has(url)) continue;
          vistas.add(url);
          disponibles.push({
            url,
            numeroOferta: oferta?.numero_oferta ?? "",
            nombre: oferta?.nombre_automatico ?? oferta?.nombre_completo ?? "",
          });
        }
        setFotos(disponibles);
      } catch (e: any) {
        setError(e?.message ?? "No se pudieron cargar las fotos disponibles.");
      } finally {
        setCargando(false);
        setCargadoAlMenosUnaVez(true);
      }
    };
    cargar();
  }, [open, cargadoAlMenosUnaVez]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-emerald-600" />
            Elegir foto de portada
          </DialogTitle>
          <DialogDescription>
            Fotos ya guardadas en nuestro almacenamiento: las de las ofertas
            genéricas aprobadas, pensadas para representar cada combinación de
            equipos.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {cargando ? (
            <div className="flex items-center justify-center py-16 text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Cargando fotos disponibles...
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center text-sm text-gray-600">
              <AlertCircle className="h-6 w-6 text-red-500" />
              {error}
            </div>
          ) : fotos.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-500">
              Todavía no hay ofertas genéricas aprobadas con foto de portada.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-1">
              {fotos.map((foto) => (
                <button
                  key={foto.url}
                  type="button"
                  onClick={() => {
                    onSeleccionar(foto.url);
                    onOpenChange(false);
                  }}
                  className="group relative rounded-md border border-slate-200 overflow-hidden hover:border-emerald-400 hover:ring-2 hover:ring-emerald-200 transition-all text-left"
                >
                  <div className="aspect-video bg-slate-100">
                    <img
                      src={foto.url}
                      alt={foto.nombre || foto.numeroOferta}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 bg-emerald-600 text-white rounded-full p-1.5 transition-opacity">
                      <Check className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="px-2 py-1 bg-white">
                    <p className="text-xs font-medium text-slate-700 truncate">
                      {foto.nombre || foto.numeroOferta}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
