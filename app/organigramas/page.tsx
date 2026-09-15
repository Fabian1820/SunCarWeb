"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Copy,
  FileDown,
  Loader2,
  MoreHorizontal,
  Network,
  Plus,
  Printer,
  Trash2,
} from "lucide-react";
import { RouteGuard } from "@/components/auth/route-guard";
import { ModuleHeader } from "@/components/shared/organism/module-header";
import { Button } from "@/components/shared/atom/button";
import { Label } from "@/components/shared/atom/label";
import { Input } from "@/components/shared/molecule/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/shared/atom/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/shared/molecule/dropdown-menu";
import { Toaster } from "@/components/shared/molecule/toaster";
import { useToast } from "@/hooks/use-toast";
import { OrganigramaLienzo } from "@/components/feats/organigramas/organigrama-lienzo";
import { OrganigramaService } from "@/lib/api-services";
import type { Organigrama } from "@/lib/api-types";
import {
  contarAreas,
  plazasDeNodo,
} from "@/lib/services/feats/organigramas/organigrama-arbol";
import {
  exportarOrganigramaPdf,
  type FormatoPdfOrganigrama,
} from "@/lib/services/feats/organigramas/export-organigrama-pdf-service";

const mensajeDe = (error: unknown, porDefecto: string) =>
  error instanceof Error ? error.message : porDefecto;

function fechaCorta(iso: string | null): string | null {
  if (!iso) return null;
  const fecha = new Date(iso);
  return Number.isNaN(fecha.getTime())
    ? null
    : fecha.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
}

export default function OrganigramasPage() {
  return (
    <RouteGuard requiredModule="organigramas">
      <OrganigramasContenido />
    </RouteGuard>
  );
}

function OrganigramasContenido() {
  const router = useRouter();
  const { toast } = useToast();
  const [organigramas, setOrganigramas] = useState<Organigrama[]>([]);
  const [cargando, setCargando] = useState(true);
  const [dialogoNuevo, setDialogoNuevo] = useState(false);
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [aEliminar, setAEliminar] = useState<Organigrama | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setOrganigramas(await OrganigramaService.getOrganigramas());
    } catch (error: unknown) {
      toast({
        title: "Error al cargar organigramas",
        description: mensajeDe(error, "No se pudieron cargar los organigramas."),
        variant: "destructive",
      });
    } finally {
      setCargando(false);
    }
  }, [toast]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const abrir = (organigrama: Organigrama) => router.push(`/organigramas/${organigrama.id}`);

  const crear = async (e: FormEvent) => {
    e.preventDefault();
    if (!nombreNuevo.trim() || enviando) return;
    setEnviando(true);
    try {
      const nuevo = await OrganigramaService.createOrganigrama({ nombre: nombreNuevo });
      router.push(`/organigramas/${nuevo.id}`);
    } catch (error: unknown) {
      toast({
        title: "Error al crear el organigrama",
        description: mensajeDe(error, "No se pudo crear el organigrama."),
        variant: "destructive",
      });
      setEnviando(false);
    }
  };

  const duplicar = async (organigrama: Organigrama) => {
    try {
      const copia = await OrganigramaService.duplicarOrganigrama(organigrama.id);
      toast({ title: "Organigrama duplicado", description: `Se creó «${copia.nombre}».` });
      await cargar();
    } catch (error: unknown) {
      toast({
        title: "Error al duplicar",
        description: mensajeDe(error, "No se pudo duplicar el organigrama."),
        variant: "destructive",
      });
    }
  };

  const eliminar = async () => {
    if (!aEliminar) return;
    setEnviando(true);
    try {
      await OrganigramaService.deleteOrganigrama(aEliminar.id);
      toast({ title: "Organigrama eliminado", description: `«${aEliminar.nombre}» ya no existe.` });
      setAEliminar(null);
      await cargar();
    } catch (error: unknown) {
      toast({
        title: "Error al eliminar",
        description: mensajeDe(error, "No se pudo eliminar el organigrama."),
        variant: "destructive",
      });
    } finally {
      setEnviando(false);
    }
  };

  const exportar = (organigrama: Organigrama, formato: FormatoPdfOrganigrama) => {
    try {
      exportarOrganigramaPdf(organigrama, formato);
    } catch (error: unknown) {
      toast({
        title: "No se pudo exportar el PDF",
        description: mensajeDe(error, "Inténtalo de nuevo."),
        variant: "destructive",
      });
    }
  };

  const abrirDialogoNuevo = () => {
    setNombreNuevo("");
    setDialogoNuevo(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <ModuleHeader
        title="Organigramas"
        subtitle="Organigramas por área, con sus cargos y plazas"
        actions={
          <Button onClick={abrirDialogoNuevo} aria-label="Nuevo organigrama">
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Nuevo organigrama</span>
          </Button>
        }
      />

      <main className="content-with-fixed-header mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
        {cargando ? (
          <div className="py-24 text-center">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-gray-500" />
            <p className="mt-3 text-sm text-gray-600">Cargando organigramas…</p>
          </div>
        ) : organigramas.length === 0 ? (
          <div className="mx-auto max-w-md py-20 text-center">
            <Network className="mx-auto h-10 w-10 text-gray-400" aria-hidden />
            <h2 className="mt-4 text-lg font-semibold text-gray-900">Todavía no hay organigramas</h2>
            <p className="mt-2 text-sm text-gray-600">
              Empieza por el cargo de dirección, añade las áreas y, en cada una, sus cargos con
              las plazas. Se exporta a PDF con el estilo de los organigramas de siempre.
            </p>
            <Button className="mt-5" onClick={abrirDialogoNuevo}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo organigrama
            </Button>
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {organigramas.map((organigrama) => {
              const editado = fechaCorta(organigrama.actualizado_en);
              return (
                <li
                  key={organigrama.id}
                  className="flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white"
                >
                  <button
                    type="button"
                    onClick={() => abrir(organigrama)}
                    className="block aspect-[16/9] w-full bg-white p-3 transition-colors hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-emerald-600"
                    aria-label={`Abrir organigrama ${organigrama.nombre}`}
                  >
                    <OrganigramaLienzo
                      raiz={organigrama.raiz}
                      titulo={organigrama.nombre}
                      className="h-full w-full"
                    />
                  </button>
                  <div className="flex items-center gap-2 border-t border-gray-100 p-3">
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate font-semibold text-gray-900">{organigrama.nombre}</h2>
                      <p className="truncate text-xs text-gray-500">
                        {contarAreas(organigrama.raiz)} áreas · {plazasDeNodo(organigrama.raiz)}{" "}
                        plazas
                        {editado ? ` · Editado ${editado}` : ""}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => abrir(organigrama)}>
                      Editar
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9"
                          aria-label={`Más acciones de ${organigrama.nombre}`}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => exportar(organigrama, "presentacion")}>
                          <FileDown className="mr-2 h-4 w-4" />
                          PDF presentación 16:9
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => exportar(organigrama, "carta")}>
                          <Printer className="mr-2 h-4 w-4" />
                          PDF Carta, para imprimir
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => void duplicar(organigrama)}>
                          <Copy className="mr-2 h-4 w-4" />
                          Duplicar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onSelect={() => setAEliminar(organigrama)}
                          className="text-red-600 focus:text-red-700"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>

      <Dialog open={dialogoNuevo} onOpenChange={(abierto) => !enviando && setDialogoNuevo(abierto)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo organigrama</DialogTitle>
            <DialogDescription>
              Arranca con la caja de dirección. Después añades las áreas y sus cargos.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={crear} className="space-y-4">
            <div>
              <Label htmlFor="organigrama-nuevo-nombre">Nombre</Label>
              <Input
                id="organigrama-nuevo-nombre"
                value={nombreNuevo}
                onChange={(e) => setNombreNuevo(e.target.value)}
                placeholder="Ej.: Ventas, Instaladora"
                maxLength={120}
                autoFocus
                className="mt-1"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogoNuevo(false)}
                disabled={enviando}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={!nombreNuevo.trim() || enviando}>
                {enviando ? "Creando…" : "Crear y editar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!aEliminar} onOpenChange={(abierto) => !abierto && !enviando && setAEliminar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar «{aEliminar?.nombre}»?</AlertDialogTitle>
            <AlertDialogDescription>
              Se borra el organigrama con todas sus áreas y cargos. No se puede deshacer; si
              quieres conservar una copia, duplícalo o expórtalo a PDF antes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={enviando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void eliminar();
              }}
              disabled={enviando}
              className="bg-red-600 hover:bg-red-700"
            >
              {enviando ? "Eliminando…" : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Toaster />
    </div>
  );
}
