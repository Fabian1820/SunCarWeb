"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Info,
  Calculator,
  Coins,
  GitMerge,
  Loader2,
  Star,
  Menu,
  Cake,
} from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/shared/atom/button";
import { ModuleCard as SharedModuleCard } from "@/components/shared/molecule/module-card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/shared/molecule/sheet";
import {
  TasaCambioService,
  TrabajadorService,
} from "@/lib/api-services";
import type { TrabajadorBirthdayInfo } from "@/lib/types/feats/trabajador/birthday-types";
import { WorkerAvatar } from "@/components/feats/worker/worker-avatar";
import ContactosDashboard from "@/components/feats/contactos/contactos-dashboard";
import { TicketManualDialog } from "@/components/feats/dashboard/ticket-manual-dialog";
import { SystemUpdatesPanel } from "@/components/feats/dashboard/system-updates-panel";
import { ConfigurarEquipoOficinaButton } from "@/components/feats/equipos-felicity/configurar-equipo-oficina-button";
import { Toaster } from "@/components/shared/molecule/toaster";
import { useAuth } from "@/contexts/auth-context";
import { BirthdayChecker } from "@/components/shared/molecule/birthday-checker";
import type { TasaCambio } from "@/lib/types/feats/tasa-cambio/tasa-cambio-types";
import { CrearSolineraDialog } from "@/components/feats/solineras/crear-solinera-dialog";
import { BarraLateralContenido } from "@/components/shared/organism/barra-lateral";
import {
  type ModuloNav,
  metaArea,
  useModulosNavegacion,
} from "@/hooks/use-modulos-navegacion";

type DashboardModule = ModuloNav;

const FAVORITES_STORAGE_KEY = "suncar_dashboard_favorites";

export default function Dashboard() {
  const router = useRouter();
  const { user, loadModulosPermitidos, updateUserFoto } = useAuth();
  const [creandoSolinera, setCreandoSolinera] = useState(false);
  // Áreas y módulos visibles para este usuario. Es la misma lógica que usa la
  // barra lateral de los módulos (hooks/use-modulos-navegacion.ts).
  const {
    areas: groupedAvailableModules,
    modulosPorId: availableModuleMap,
    abrirModulo,
    solineras,
    cargandoSolineras,
    errorSolineras,
    recargarSolineras,
    puedeCrearSolinera,
  } = useModulosNavegacion({ onNuevaSolinera: () => setCreandoSolinera(true) });

  const [isContactosDialogOpen, setIsContactosDialogOpen] = useState(false);
  const [isTasaCambioDialogOpen, setIsTasaCambioDialogOpen] = useState(false);
  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false);
  const [tasaCambioHoy, setTasaCambioHoy] = useState<TasaCambio | null>(null);
  const [loadingTasaCambio, setLoadingTasaCambio] = useState(false);
  const [errorTasaCambio, setErrorTasaCambio] = useState<string | null>(null);
  const [mergingTarget, setMergingTarget] = useState<
    "frontend" | "backend" | null
  >(null);
  const [mergeResult, setMergeResult] = useState<{
    target: string;
    message: string;
    ok: boolean;
  } | null>(null);

  // Vista activa sincronizada con ?area= en la URL para que el botón atrás funcione.
  const [activeKey, setActiveKey] = useState<string>("home");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    const sync = () => {
      const area = new URLSearchParams(window.location.search).get("area");
      setActiveKey(area ?? "home");
    };
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  // Favoritos persistidos en localStorage.
  const [favorites, setFavorites] = useState<string[]>([]);
  const favLoaded = useRef(false);
  const [now, setNow] = useState<Date | null>(null);

  // Datos de la pantalla de bienvenida (livianos, una llamada cada uno).
  const [cumpleSemana, setCumpleSemana] = useState<TrabajadorBirthdayInfo[]>([]);

  const showDevTools =
    typeof window !== "undefined"
      ? Boolean((window as unknown as Record<string, unknown>).__SHOW_DEV_TOOLS__)
      : process.env.NEXT_PUBLIC_SHOW_DEV_TOOLS === "true";

  // Cargar módulos permitidos cada vez que se monta el dashboard.
  useEffect(() => {
    loadModulosPermitidos();
  }, [user]);

  // Reloj para el saludo de bienvenida (cliente, evita mismatch de hidratación).
  useEffect(() => {
    setNow(new Date());
  }, []);

  // Datos de bienvenida: cumpleaños de la semana + total de instalaciones.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cumple = await TrabajadorService.getCumpleanosSemana();
      if (cancelled) return;
      setCumpleSemana(cumple.success ? cumple.data : []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Hidratar la foto de perfil del usuario logueado desde su registro de trabajador.
  useEffect(() => {
    if (!user?.ci) return;
    let cancelled = false;
    (async () => {
      try {
        const trabajador = await TrabajadorService.getTrabajadorByCI(user.ci);
        if (cancelled) return;
        const foto = trabajador?.foto_perfil ?? null;
        if ((foto ?? null) !== (user.foto_perfil ?? null)) {
          updateUserFoto(foto);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.ci]);

  // Cargar favoritos guardados.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
      if (raw) setFavorites(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    favLoaded.current = true;
  }, []);

  // Persistir favoritos al cambiar.
  useEffect(() => {
    if (!favLoaded.current) return;
    try {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
    } catch {
      /* ignore */
    }
  }, [favorites]);

  const toggleFavorite = (id: string) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const favoriteModules = favorites
    .map((id) => availableModuleMap.get(id))
    .filter((m): m is DashboardModule => Boolean(m));

  const hasModules = groupedAvailableModules.length > 0;

  // ───────── Saludo de bienvenida ─────────
  const firstName = user?.nombre?.trim().split(/\s+/)[0] ?? "";
  const greeting = (() => {
    if (!now) return "Bienvenido";
    const h = now.getHours();
    if (h < 12) return "Buenos días";
    if (h < 19) return "Buenas tardes";
    return "Buenas noches";
  })();
  const dateStr = now
    ? now.toLocaleDateString("es-ES", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  // Etiqueta corta para un cumpleaños de la semana ("Hoy", "mañana", "vie 6").
  const cumpleLabel = (info: TrabajadorBirthdayInfo): string => {
    if (info.es_hoy) return "Hoy";
    if (!info.fecha) return "";
    const [y, m, d] = info.fecha.split("-").map(Number);
    const fecha = new Date(y, m - 1, d);
    const hoy = new Date();
    const diff = Math.round(
      (new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()).getTime() -
        new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime()) /
        86400000,
    );
    if (diff === 1) return "Mañana";
    return fecha.toLocaleDateString("es-ES", { weekday: "short", day: "numeric" });
  };

  // ───────── Formato tasa de cambio ─────────
  const formatExchangeRate = (value: number) => Number(value || 0).toFixed(4);
  const formatInverseExchangeRate = (value: number) => {
    const parsed = Number(value || 0);
    if (!Number.isFinite(parsed) || parsed <= 0) return "-";
    return (1 / parsed).toFixed(4);
  };

  const handleMerge = async (target: "frontend" | "backend") => {
    setMergingTarget(target);
    setMergeResult(null);
    try {
      const res = await fetch("/api/dev-tools/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target }),
      });
      const data = await res.json();
      setMergeResult({ target, message: data.message, ok: data.success });
    } catch {
      setMergeResult({
        target,
        message: "Error de red al intentar el merge",
        ok: false,
      });
    } finally {
      setMergingTarget(null);
    }
  };

  const handleOpenTasaCambioDialog = async () => {
    setIsTasaCambioDialogOpen(true);
    setLoadingTasaCambio(true);
    setErrorTasaCambio(null);
    try {
      const tasa = await TasaCambioService.getTasaCambioHoy();
      setTasaCambioHoy(tasa);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo cargar la tasa de cambio de hoy.";
      setErrorTasaCambio(message);
      setTasaCambioHoy(null);
    } finally {
      setLoadingTasaCambio(false);
    }
  };

  // ───────── Navegación de la barra lateral ─────────
  const goTo = (key: string) => {
    const url = key === "home" ? "/" : `/?area=${encodeURIComponent(key)}`;
    window.history.pushState({}, "", url);
    setActiveKey(key);
    setMobileSidebarOpen(false);
  };

  const activeGroup =
    activeKey !== "home" && activeKey !== "favorites"
      ? groupedAvailableModules.find((g) => g.id === activeKey)
      : undefined;

  const activeTitle =
    activeKey === "home"
      ? "Inicio"
      : activeKey === "favorites"
        ? "Favoritos"
        : metaArea(activeKey).label;

  // ───────── Tarjeta de módulo (con estrella de favorito) ─────────
  const ModuleCard = ({ module }: { module: DashboardModule }) => {
    const isFav = favorites.includes(module.id);

    return (
      <SharedModuleCard
        title={module.title}
        description={module.description}
        icon={module.icon}
        iconClass={module.iconClass}
        onClick={() => abrirModulo(module)}
        tieneSubmodulos={module.tieneSubmodulos}
        cornerAction={
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(module.id);
            }}
            aria-label={isFav ? "Quitar de favoritos" : "Agregar a favoritos"}
            className="rounded-full p-1.5 text-gray-300 transition-colors hover:bg-amber-50 hover:text-amber-400"
          >
            <Star
              className={`h-4 w-4 ${isFav ? "fill-amber-400 text-amber-400" : ""}`}
            />
          </button>
        }
      />
    );
  };

  // ───────── Barra lateral (la misma que acompaña a los módulos) ─────────
  const barraLateral = (interaccion: "flotante" | "simple") => (
    <BarraLateralContenido
      areas={groupedAvailableModules}
      abrirModulo={abrirModulo}
      interaccion={interaccion}
      itemActivo={activeKey}
      onIr={goTo}
      favoritosCount={favoriteModules.length}
      mostrarEstadoOficina
    />
  );

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-gradient-to-br from-[#f4f9f6] via-white to-[#e8f4ee]">
      {/* Sidebar desktop */}
      <aside className="relative z-30 hidden w-72 flex-shrink-0 border-r border-gray-200/70 bg-white/80 backdrop-blur-xl lg:block">
        {barraLateral("flotante")}
      </aside>

      {/* Sidebar móvil */}
      <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Navegación</SheetTitle>
          {barraLateral("simple")}
        </SheetContent>
      </Sheet>

      {/* Columna principal */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="flex flex-shrink-0 items-center gap-3 border-b border-gray-200/70 bg-white/70 px-4 py-3 backdrop-blur-xl sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileSidebarOpen(true)}
            aria-label="Abrir menú"
            className="lg:hidden"
          >
            <Menu className="h-5 w-5 text-gray-700" />
          </Button>

          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-semibold text-gray-900 sm:text-lg">
              {activeTitle}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/calculadora" className="flex">
              <Button
                variant="outline"
                size="sm"
                aria-label="Abrir calculadora"
                className="flex h-9 items-center justify-center rounded-full border-emerald-200 bg-white px-3 hover:border-emerald-300 hover:bg-emerald-50 sm:rounded-md sm:px-4"
              >
                <Calculator className="h-4 w-4 text-emerald-600 sm:mr-2" />
                <span className="hidden sm:inline">Calculadora</span>
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                handleOpenTasaCambioDialog().catch(() => null);
              }}
              aria-label="Ver tasa de cambio diaria"
              className="flex h-9 items-center justify-center rounded-full border-emerald-200 bg-white px-3 hover:border-emerald-300 hover:bg-emerald-50 sm:rounded-md sm:px-4"
            >
              <Coins className="h-4 w-4 text-emerald-600 sm:mr-2" />
              <span className="hidden sm:inline">Tasa de cambio</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsContactosDialogOpen(true)}
              aria-label="Ver información de contacto"
              className="flex h-9 items-center justify-center rounded-full border-emerald-200 bg-white px-3 hover:border-emerald-300 hover:bg-gray-50 sm:rounded-md sm:px-4"
            >
              <Info className="h-4 w-4 text-blue-600 sm:mr-2" />
              <span className="hidden sm:inline">Información</span>
            </Button>
          </div>
        </header>

        {/* Contenido */}
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
          <div className="mx-auto max-w-7xl">
            {mergeResult && (
              <div
                className={`mb-6 flex items-center justify-between rounded-xl border px-4 py-3 text-sm ${
                  mergeResult.ok
                    ? "border-green-200 bg-green-50 text-green-800"
                    : "border-red-200 bg-red-50 text-red-800"
                }`}
              >
                <span>{mergeResult.message}</span>
                <button
                  onClick={() => setMergeResult(null)}
                  className="ml-4 opacity-60 hover:opacity-100"
                >
                  ✕
                </button>
              </div>
            )}

            {!hasModules ? (
              <div className="py-16 text-center">
                <p className="text-gray-600">
                  No tiene permisos de acceso aun o ha ocurrido algun cambio.
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  Contacte con el equipo de informaticos para resolver el
                  problema.
                </p>
              </div>
            ) : activeKey === "home" ? (
              /* ───────── Pantalla de bienvenida (minimalista) ───────── */
              <div className="space-y-8">
                {/* Saludo */}
                <section className="flex flex-col gap-1">
                  {dateStr && (
                    <p className="text-sm capitalize text-gray-400">
                      {dateStr}
                    </p>
                  )}
                  <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                    {greeting}
                    {firstName ? `, ${firstName}` : ""}.
                  </h1>
                  <p className="mt-1 max-w-xl text-sm text-gray-500">
                    Este es el resumen de tu actividad. Navega por tus áreas
                    desde la barra lateral.
                  </p>
                </section>

                {/* Actualizaciones del sistema (hoy y ayer) */}
                <SystemUpdatesPanel />

                {/* Favoritos (acceso rápido, compacto) */}
                {favoriteModules.length > 0 && (
                  <section className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                        Acceso rápido
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {favoriteModules.map((module) => (
                        <ModuleCard key={module.id} module={module} />
                      ))}
                    </div>
                  </section>
                )}

                {/* Cumpleaños de la semana (scroll horizontal) */}
                {cumpleSemana.length > 0 && (
                  <section className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Cake className="h-4 w-4 text-pink-500" />
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                        Cumpleaños de la semana
                      </h3>
                    </div>
                    <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
                      {cumpleSemana.map((p) => (
                        <div
                          key={p.CI}
                          className={`flex w-44 flex-shrink-0 flex-col items-center gap-2 rounded-2xl border p-4 text-center shadow-sm backdrop-blur-sm ${
                            p.es_hoy
                              ? "border-pink-200 bg-pink-50/80"
                              : "border-gray-200/70 bg-white/80"
                          }`}
                        >
                          <WorkerAvatar
                            src={p.foto_perfil}
                            nombre={p.nombre}
                            className="h-14 w-14 flex-shrink-0"
                          />
                          <p
                            className="line-clamp-2 text-sm font-semibold leading-tight text-gray-900"
                            title={p.nombre}
                          >
                            {p.nombre}
                          </p>
                          <p
                            className="line-clamp-1 text-xs text-gray-500"
                            title={p.cargo}
                          >
                            {p.cargo}
                          </p>
                          <span
                            className={`mt-1 flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${
                              p.es_hoy
                                ? "bg-pink-500 text-white"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {p.es_hoy && <Cake className="h-3 w-3" />}
                            {cumpleLabel(p)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Solo superAdmin: define el equipo Felicity que representa la oficina */}
                <ConfigurarEquipoOficinaButton />
              </div>
            ) : activeKey === "favorites" ? (
              /* ───────── Vista de favoritos ───────── */
              <div className="space-y-6">
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
                    Favoritos
                  </h1>
                  <p className="mt-1 text-sm text-gray-500">
                    Tus módulos marcados para acceso rápido.
                  </p>
                </div>
                {favoriteModules.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-300 bg-white/60 py-16 text-center">
                    <Star className="mx-auto mb-3 h-8 w-8 text-gray-300" />
                    <p className="text-gray-600">
                      Aún no tienes favoritos.
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      Pulsa la estrella en cualquier módulo para añadirlo aquí.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {favoriteModules.map((module) => (
                      <ModuleCard key={module.id} module={module} />
                    ))}
                  </div>
                )}
              </div>
            ) : activeGroup ? (
              /* ───────── Vista de grupo ───────── */
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {activeGroup.modules.map((module) => (
                    <ModuleCard key={module.id} module={module} />
                  ))}
                </div>
                {activeGroup.id === "solineras" && errorSolineras && (
                  <div
                    role="alert"
                    className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
                  >
                    <span>No se pudieron cargar las solineras: {errorSolineras}</span>
                    <Button variant="outline" size="sm" onClick={() => void recargarSolineras()}>
                      Reintentar
                    </Button>
                  </div>
                )}
                {activeGroup.id === "solineras" && !errorSolineras && cargandoSolineras && (
                  <p role="status" className="text-sm text-gray-500">
                    Cargando solineras…
                  </p>
                )}
                {activeGroup.id === "solineras" &&
                  !errorSolineras &&
                  !cargandoSolineras &&
                  (solineras ?? []).length === 0 && (
                    <p className="text-sm text-gray-600">
                      {puedeCrearSolinera
                        ? "Aún no hay solineras. Crea la primera con «Nueva solinera»."
                        : "Aún no hay solineras. Cuando alguien con permiso de red cree una, aparecerá aquí."}
                    </p>
                  )}
              </div>
            ) : null}
          </div>
        </main>
      </div>

      <CrearSolineraDialog
        open={creandoSolinera}
        onOpenChange={setCreandoSolinera}
        onCreada={(nueva) => {
          void recargarSolineras();
          router.push(`/solineras/${nueva.id}`);
        }}
      />

      {/* Contactos Dialog */}
      <Dialog
        open={isContactosDialogOpen}
        onOpenChange={setIsContactosDialogOpen}
      >
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Info className="h-5 w-5 text-blue-600" />
              <span>Información de Contacto</span>
            </DialogTitle>
          </DialogHeader>
          <ContactosDashboard />
        </DialogContent>
      </Dialog>

      <Dialog
        open={isTasaCambioDialogOpen}
        onOpenChange={setIsTasaCambioDialogOpen}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Coins className="h-5 w-5 text-emerald-600" />
              <span>Tasa de Cambio diaria</span>
            </DialogTitle>
            <DialogDescription>
              Tasa registrada para 1 USD en el día de hoy.
            </DialogDescription>
          </DialogHeader>

          {loadingTasaCambio ? (
            <p className="text-sm text-gray-600">Cargando tasa de cambio...</p>
          ) : errorTasaCambio ? (
            <p className="text-sm text-red-600">{errorTasaCambio}</p>
          ) : tasaCambioHoy ? (
            <div className="space-y-2 rounded-md border border-emerald-100 bg-emerald-50 p-4">
              <p className="text-sm text-gray-700">
                <span className="font-semibold">Fecha:</span>{" "}
                {tasaCambioHoy.fecha || "Hoy"}
              </p>
              <p className="text-base text-gray-800">
                <span className="font-semibold">1 USD = </span>
                {formatExchangeRate(tasaCambioHoy.usd_a_eur)} EUR
              </p>
              <p className="text-base text-gray-800">
                <span className="font-semibold">1 EUR = </span>
                {formatInverseExchangeRate(tasaCambioHoy.usd_a_eur)} USD
              </p>
              <p className="text-base text-gray-800">
                <span className="font-semibold">1 USD = </span>
                {formatExchangeRate(tasaCambioHoy.usd_a_cup)} CUP
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-600">
              No hay tasa de cambio registrada para hoy.
            </p>
          )}
        </DialogContent>
      </Dialog>

      {/* Ticket / Vale Manual Dialog */}
      <TicketManualDialog
        open={isTicketDialogOpen}
        onOpenChange={setIsTicketDialogOpen}
      />

      {/* Birthday Notification Checker */}
      <BirthdayChecker />

      {/* Dev Tools FAB */}
      {showDevTools && user?.is_superAdmin && (
        <div className="pointer-events-auto fixed bottom-6 right-6 z-40 flex flex-col gap-3">
          <Button
            onClick={() => handleMerge("backend")}
            disabled={mergingTarget !== null}
            className="flex h-14 w-14 items-center gap-2 rounded-full bg-amber-500 text-white shadow-lg transition-all hover:bg-amber-600 hover:shadow-xl sm:w-auto sm:px-4"
            title="Merge dev → master (Backend)"
          >
            {mergingTarget === "backend" ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <GitMerge className="h-5 w-5" />
            )}
            <span className="hidden text-sm font-medium sm:inline">Backend</span>
          </Button>

          <Button
            onClick={() => handleMerge("frontend")}
            disabled={mergingTarget !== null}
            className="flex h-14 w-14 items-center gap-2 rounded-full bg-violet-500 text-white shadow-lg transition-all hover:bg-violet-600 hover:shadow-xl sm:w-auto sm:px-4"
            title="Merge dev → main (Frontend)"
          >
            {mergingTarget === "frontend" ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <GitMerge className="h-5 w-5" />
            )}
            <span className="hidden text-sm font-medium sm:inline">
              Frontend
            </span>
          </Button>
        </div>
      )}

      <Toaster />
    </div>
  );
}
