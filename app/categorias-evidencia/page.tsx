"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { RouteGuard } from "@/components/auth/route-guard";
import { ModuleHeader } from "@/components/shared/organism/module-header";
import { Button } from "@/components/shared/atom/button";
import { Input } from "@/components/shared/atom/input";
import { Checkbox } from "@/components/shared/molecule/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { CategoriasEvidenciaService } from "@/lib/services/feats/categorias-evidencia/categorias-evidencia-service";
import {
  TIPOS_EVIDENCIA,
  type CategoriaEvidencia,
  type TipoTrabajoEvidencia,
} from "@/lib/types/feats/categorias-evidencia/categorias-evidencia-types";

const VACIA: CategoriaEvidencia = {
  nombre: "",
  descripcion: "",
  tipos_trabajo: [],
  obligatoria: false,
  orden: 0,
  activa: true,
};

const etiquetaTipo = (t: TipoTrabajoEvidencia) => TIPOS_EVIDENCIA.find((x) => x.valor === t)?.etiqueta ?? t;

export default function CategoriasEvidenciaPage() {
  return (
    <RouteGuard requiredModule="categorias-evidencia">
      <Contenido />
    </RouteGuard>
  );
}

function Contenido() {
  const { toast } = useToast();
  const [categorias, setCategorias] = useState<CategoriaEvidencia[] | null>(null);
  const [error, setError] = useState(false);
  const [editando, setEditando] = useState<CategoriaEvidencia | null>(null);
  const [aBorrar, setABorrar] = useState<CategoriaEvidencia | null>(null);

  const cargar = useCallback(async () => {
    try {
      setCategorias(await CategoriasEvidenciaService.listar());
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function borrar(c: CategoriaEvidencia) {
    if (!c.id) return;
    try {
      await CategoriasEvidenciaService.eliminar(c.id);
      setABorrar(null);
      await cargar();
    } catch {
      toast({ title: "No se pudo eliminar", variant: "destructive" });
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ModuleHeader
        title="Evidencias de trabajos"
        subtitle="Qué fotos o vídeos hay que subir en cada tipo de trabajo diario"
        actions={
          <Button onClick={() => setEditando({ ...VACIA, orden: (categorias?.length ?? 0) + 1 })}>
            <Plus className="mr-2 h-4 w-4" aria-hidden />
            Nueva categoría
          </Button>
        }
      />
      <main className="content-with-fixed-header mx-auto max-w-3xl px-4 pb-12 sm:px-6">
        <p className="mb-4 text-sm text-gray-600">
          En la app, cada trabajo diario muestra un bloque por cada categoría de su tipo. Se pueden subir varias fotos
          o vídeos en cada una, y las obligatorias piden al menos una para poder cerrar el trabajo. Mientras un tipo no
          tenga categorías, la app mantiene las evidencias de inicio y fin de siempre.
        </p>

        {categorias === null && !error ? (
          <p className="flex items-center gap-2 py-10 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Cargando…
          </p>
        ) : error ? (
          <div className="py-10 text-center text-sm text-gray-600">
            No se pudieron cargar.{" "}
            <button className="font-medium text-emerald-700 underline" onClick={() => void cargar()}>
              Reintentar
            </button>
          </div>
        ) : categorias!.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white px-4 py-10 text-center text-sm text-gray-600">
            Todavía no hay categorías. Crea la primera con “Nueva categoría”.
          </div>
        ) : (
          <ul className="space-y-2">
            {categorias!.map((c) => (
              <li
                key={c.id}
                className={cn(
                  "flex items-start gap-3 rounded-lg border bg-white px-4 py-3",
                  c.activa ? "border-gray-200" : "border-gray-200 opacity-60",
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900">{c.nombre}</p>
                    {c.obligatoria && (
                      <span className="rounded bg-amber-50 px-1.5 py-0.5 text-xs font-semibold text-amber-800">
                        Obligatoria
                      </span>
                    )}
                    {!c.activa && <span className="text-xs font-medium text-gray-500">Desactivada</span>}
                  </div>
                  {c.descripcion && <p className="mt-0.5 text-xs text-gray-600">{c.descripcion}</p>}
                  <p className="mt-1 text-xs text-gray-500">
                    {c.tipos_trabajo.length ? c.tipos_trabajo.map(etiquetaTipo).join(" · ") : "No se pide en ningún tipo"}
                  </p>
                </div>
                <Button variant="ghost" size="icon" aria-label={`Editar ${c.nombre}`} onClick={() => setEditando(c)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" aria-label={`Eliminar ${c.nombre}`} onClick={() => setABorrar(c)}>
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </main>

      <FormularioCategoria
        categoria={editando}
        onCerrar={() => setEditando(null)}
        onGuardada={async () => {
          setEditando(null);
          await cargar();
        }}
      />

      <Dialog open={!!aBorrar} onOpenChange={(abierto) => !abierto && setABorrar(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar “{aBorrar?.nombre}”?</DialogTitle>
            <DialogDescription>
              Los trabajos ya guardados conservan sus fotos con el nombre de esta categoría. Si solo quieres dejar de
              pedirla, desactívala en vez de eliminarla.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setABorrar(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={() => aBorrar && void borrar(aBorrar)}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FormularioCategoria({
  categoria,
  onCerrar,
  onGuardada,
}: {
  categoria: CategoriaEvidencia | null;
  onCerrar: () => void;
  onGuardada: () => Promise<void>;
}) {
  const { toast } = useToast();
  const [datos, setDatos] = useState<CategoriaEvidencia>(VACIA);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (categoria) setDatos(categoria);
  }, [categoria]);

  const alternarTipo = (t: TipoTrabajoEvidencia) =>
    setDatos((d) => ({
      ...d,
      tipos_trabajo: d.tipos_trabajo.includes(t) ? d.tipos_trabajo.filter((x) => x !== t) : [...d.tipos_trabajo, t],
    }));

  async function guardar() {
    if (!datos.nombre.trim()) {
      toast({ title: "Ponle un nombre a la categoría", variant: "destructive" });
      return;
    }
    setGuardando(true);
    try {
      const limpia = { ...datos, nombre: datos.nombre.trim(), descripcion: datos.descripcion?.trim() || null };
      if (datos.id) await CategoriasEvidenciaService.editar(datos.id, limpia);
      else await CategoriasEvidenciaService.crear(limpia);
      await onGuardada();
    } catch {
      toast({ title: "No se pudo guardar", variant: "destructive" });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Dialog open={!!categoria} onOpenChange={(abierto) => !abierto && onCerrar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{datos.id ? "Editar categoría" : "Nueva categoría"}</DialogTitle>
          <DialogDescription>Lo que verá quien sube las fotos en la app.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-900" htmlFor="cat-nombre">
              Nombre
            </label>
            <Input
              id="cat-nombre"
              value={datos.nombre}
              onChange={(e) => setDatos({ ...datos, nombre: e.target.value })}
              placeholder="Inversor instalado"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-900" htmlFor="cat-desc">
              Qué debe verse <span className="font-normal text-gray-500">(opcional)</span>
            </label>
            <Input
              id="cat-desc"
              value={datos.descripcion ?? ""}
              onChange={(e) => setDatos({ ...datos, descripcion: e.target.value })}
              placeholder="El inversor completo con su etiqueta legible"
            />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-gray-900">Se pide en</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {TIPOS_EVIDENCIA.map(({ valor, etiqueta }) => (
                <label key={valor} className="flex items-center gap-2 text-sm text-gray-800">
                  <Checkbox checked={datos.tipos_trabajo.includes(valor)} onCheckedChange={() => alternarTipo(valor)} />
                  {etiqueta}
                </label>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-800">
            <Checkbox
              checked={datos.obligatoria}
              onCheckedChange={(v) => setDatos({ ...datos, obligatoria: v === true })}
            />
            Obligatoria: hay que subir al menos una foto o vídeo
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-800">
            <Checkbox checked={datos.activa} onCheckedChange={(v) => setDatos({ ...datos, activa: v === true })} />
            Activa: se pide en la app
          </label>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-900" htmlFor="cat-orden">
              Orden
            </label>
            <Input
              id="cat-orden"
              type="number"
              className="w-24"
              value={datos.orden}
              onChange={(e) => setDatos({ ...datos, orden: Number(e.target.value) || 0 })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button onClick={() => void guardar()} disabled={guardando}>
            {guardando && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
