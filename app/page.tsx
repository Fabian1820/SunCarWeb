"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  type LucideIcon,
  Info,
  Shield,
  Calculator,
  Wallet,
  Coins,
  GitMerge,
  Loader2,
  Star,
  Menu,
  Home,
  ChevronRight,
  LayoutDashboard,
  Briefcase,
  ShoppingBag,
  Wrench,
  Receipt,
  Package,
  Users,
  Megaphone,
  Cake,
} from "lucide-react";
import {
  MODULOS_CATALOGO,
  MODULO_GRUPOS,
  type ModuloCatalogo,
} from "@/lib/modulos-catalogo";
import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/shared/atom/button";
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
  ClienteService,
} from "@/lib/api-services";
import type { TrabajadorBirthdayInfo } from "@/lib/types/feats/trabajador/birthday-types";
import { WorkerAvatar } from "@/components/feats/worker/worker-avatar";
import ContactosDashboard from "@/components/feats/contactos/contactos-dashboard";
import { TicketManualDialog } from "@/components/feats/dashboard/ticket-manual-dialog";
import { WeatherWidget } from "@/components/feats/dashboard/weather-widget";
import { DirectorioTelefonicoCard } from "@/components/feats/dashboard/directorio-telefonico-card";
import { Toaster } from "@/components/shared/molecule/toaster";
import { useAuth } from "@/contexts/auth-context";
import { UserMenu } from "@/components/auth/user-menu";
import { BirthdayChecker } from "@/components/shared/molecule/birthday-checker";
import type { TasaCambio } from "@/lib/types/feats/tasa-cambio/tasa-cambio-types";
import { useMyWalletPermiso } from "@/hooks/use-wallet-permisos";

type DashboardModule = {
  id: string;
  permission?: string;
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
  iconClass: string;
  alwaysVisible?: boolean;
  childKeys?: string[];
};

type GroupMeta = {
  label: string;
  icon: LucideIcon;
  chip: string;
  bar: string;
};

// Metadatos visuales por grupo (icono + acentos de color). El label sirve de
// fallback cuando el grupo no define título en MODULO_GRUPOS.
const GROUP_META: Record<string, GroupMeta> = {
  "resultados-empresa": {
    label: "General",
    icon: LayoutDashboard,
    chip: "bg-emerald-50 text-emerald-700",
    bar: "from-emerald-400 to-emerald-600",
  },
  "comercial-instaladora": {
    label: "Comercial Instaladora",
    icon: Briefcase,
    chip: "bg-emerald-50 text-emerald-700",
    bar: "from-emerald-400 to-emerald-600",
  },
  "comercial-ventas": {
    label: "Comercial Ventas",
    icon: ShoppingBag,
    chip: "bg-indigo-50 text-indigo-700",
    bar: "from-indigo-400 to-indigo-600",
  },
  operaciones: {
    label: "Operaciones",
    icon: Wrench,
    chip: "bg-teal-50 text-teal-700",
    bar: "from-teal-400 to-teal-600",
  },
  economia: {
    label: "Economía",
    icon: Receipt,
    chip: "bg-amber-50 text-amber-700",
    bar: "from-amber-400 to-amber-600",
  },
  "gestion-almacenes": {
    label: "Gestión de Almacenes",
    icon: Package,
    chip: "bg-sky-50 text-sky-700",
    bar: "from-sky-400 to-sky-600",
  },
  "recursos-humanos": {
    label: "Recursos Humanos",
    icon: Users,
    chip: "bg-violet-50 text-violet-700",
    bar: "from-violet-400 to-violet-600",
  },
  "area-direccion": {
    label: "Área de Dirección",
    icon: Shield,
    chip: "bg-emerald-50 text-emerald-800",
    bar: "from-emerald-500 to-teal-700",
  },
  web: {
    label: "Marketing",
    icon: Megaphone,
    chip: "bg-rose-50 text-rose-600",
    bar: "from-rose-400 to-rose-600",
  },
};

const groupMetaFor = (id: string): GroupMeta =>
  GROUP_META[id] ?? {
    label: id,
    icon: LayoutDashboard,
    chip: "bg-gray-100 text-gray-700",
    bar: "from-gray-400 to-gray-600",
  };

const FAVORITES_STORAGE_KEY = "suncar_dashboard_favorites";

export default function Dashboard() {
  const router = useRouter();
  const { hasPermission, user, loadModulosPermitidos, updateUserFoto, getAuthHeader } = useAuth();
  const { permiso: myWalletPermiso } = useMyWalletPermiso();

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
  const [totalInstalaciones, setTotalInstalaciones] = useState<number | null>(
    null,
  );

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
      const [cumple, total] = await Promise.all([
        TrabajadorService.getCumpleanosSemana(),
        ClienteService.getTotalInstalaciones(),
      ]);
      if (cancelled) return;
      setCumpleSemana(cumple.success ? cumple.data : []);
      setTotalInstalaciones(total);
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

  // ───────── Construcción de módulos disponibles (lógica de permisos) ─────────
  const catalogoToDashboard = (m: ModuloCatalogo): DashboardModule => ({
    id: m.dashboardId ?? m.key,
    permission: m.permission ?? m.key,
    href: m.href,
    icon: m.icon,
    title: m.label,
    description: m.descripcion,
    iconClass: m.iconClass,
    alwaysVisible: m.alwaysVisible,
    childKeys: m.childKeys,
  });

  const allModules: DashboardModule[] = MODULOS_CATALOGO.filter(
    (m) => !m.hideFromDashboard,
  ).map(catalogoToDashboard);

  type ModuleGroup = {
    id: string;
    title: string;
    subtitle: string;
    moduleIds: string[];
  };

  const moduleGroups: ModuleGroup[] = MODULO_GRUPOS.map((grupo) => ({
    id: grupo.key,
    title: grupo.title,
    subtitle: grupo.subtitle,
    moduleIds:
      grupo.key === "area-direccion"
        ? [
            ...MODULOS_CATALOGO.filter(
              (m) => m.grupo === grupo.key && !m.hideFromDashboard,
            ).map((m) => m.dashboardId ?? m.key),
            "wallet-manager",
            "permisos",
          ]
        : MODULOS_CATALOGO.filter(
            (m) => m.grupo === grupo.key && !m.hideFromDashboard,
          ).map((m) => m.dashboardId ?? m.key),
  }));

  const superAdminModules: DashboardModule[] = user?.is_superAdmin
    ? [
        {
          id: "permisos",
          href: "/permisos",
          icon: Shield,
          title: "Gestión de Permisos",
          description: "Administrar módulos y permisos de trabajadores.",
          iconClass: "text-red-600",
        },
      ]
    : [];

  const isWalletAdmin = !!user?.is_superAdmin || !!myWalletPermiso?.esAdmin;
  const walletAdminModules: DashboardModule[] = isWalletAdmin
    ? [
        {
          id: "wallet-manager",
          href: "/wallet-manager",
          icon: Wallet,
          title: "Gestión de Wallet",
          description: "Administrar permisos de billetera de trabajadores.",
          iconClass: "text-blue-600",
        },
      ]
    : [];

  const availableModules = [
    ...allModules.filter((module) => {
      if (module.alwaysVisible) return true;
      if (hasPermission(module.permission ?? module.id)) return true;
      if (module.childKeys?.some((k) => hasPermission(k))) return true;
      return false;
    }),
    ...superAdminModules,
    ...walletAdminModules,
  ];

  const availableModuleMap = new globalThis.Map(
    availableModules.map((module) => [module.id, module]),
  );

  const groupedAvailableModules = moduleGroups
    .map((group) => ({
      ...group,
      modules: group.moduleIds
        .map((moduleId) => availableModuleMap.get(moduleId))
        .filter((module): module is DashboardModule => Boolean(module)),
    }))
    .filter((group) => group.modules.length > 0);

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
        : groupMetaFor(activeKey).label;

  // ───────── Tarjeta de módulo (con estrella de favorito) ─────────
  const ModuleCard = ({ module }: { module: DashboardModule }) => {
    const isFav = favorites.includes(module.id);

    // Módulos cuyo href es una API route (no una página interna) abren un
    // destino externo (ej. Suncar Whatsapp/Chatwoot) en pestaña nueva, vía
    // un link de SSO pedido al momento. La pestaña se abre YA, dentro del
    // gesto de click, para que el navegador no la bloquee como popup cuando
    // la URL real llegue después de forma asíncrona.
    const openExternalModule = async () => {
      const win = window.open("about:blank", "_blank");
      try {
        const res = await fetch(module.href, {
          method: "POST",
          headers: { ...getAuthHeader(), "Content-Type": "application/json" },
          body: JSON.stringify({
            ci: user?.ci,
            nombre: user?.nombre,
            foto_perfil: user?.foto_perfil,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.url) {
          throw new Error(data.message || "No se pudo abrir el módulo");
        }
        if (win) win.location.href = data.url;
      } catch (error) {
        win?.close();
        console.error("Error abriendo módulo externo:", error);
      }
    };

    const handleActivate = () => {
      if (module.href.startsWith("/api/")) {
        openExternalModule();
      } else {
        router.push(module.href);
      }
    };

    return (
      <div
        role="button"
        tabIndex={0}
        onClick={handleActivate}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleActivate();
          }
        }}
        className="group relative flex cursor-pointer flex-col items-center rounded-2xl border border-gray-200/70 bg-white/80 p-5 text-center shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(module.id);
          }}
          aria-label={isFav ? "Quitar de favoritos" : "Agregar a favoritos"}
          className="absolute right-3 top-3 rounded-full p-1.5 text-gray-300 transition-colors hover:bg-amber-50 hover:text-amber-400"
        >
          <Star
            className={`h-4 w-4 ${isFav ? "fill-amber-400 text-amber-400" : ""}`}
          />
        </button>

        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50 ring-1 ring-gray-100 transition-colors group-hover:bg-emerald-50/60">
          <module.icon className={`h-6 w-6 ${module.iconClass}`} />
        </div>
        <h4 className="mb-1 text-base font-semibold text-gray-900">
          {module.title}
        </h4>
        <p className="text-sm leading-relaxed text-gray-500">
          {module.description}
        </p>
      </div>
    );
  };

  // ───────── Barra lateral (reutilizada en desktop y móvil) ─────────
  const SidebarNav = () => {
    const navItem = (
      key: string,
      label: string,
      Icon: LucideIcon,
      opts?: { count?: number; chip?: string },
    ) => {
      const active = activeKey === key;
      return (
        <button
          key={key}
          type="button"
          onClick={() => goTo(key)}
          className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all ${
            active
              ? "bg-emerald-50 text-emerald-900 shadow-sm ring-1 ring-emerald-100"
              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
          }`}
        >
          <span
            className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${
              opts?.chip ?? (active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500 group-hover:text-gray-700")
            }`}
          >
            <Icon className="h-4 w-4" />
          </span>
          <span className="flex-1 truncate">{label}</span>
          {typeof opts?.count === "number" && (
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                active
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {opts.count}
            </span>
          )}
        </button>
      );
    };

    return (
      <div className="flex h-full flex-col">
        {/* Marca */}
        <div className="flex items-center gap-2 px-5 py-5">
          <img
            src="/brand/suncar-v2-iso.png"
            alt="Logo Suncar"
            className="h-10 w-10 flex-shrink-0 object-contain"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold tracking-tight text-gray-900">
              SUNCAR
            </p>
            <p className="truncate text-xs text-gray-500">Gestión empresarial</p>
          </div>
        </div>

        <div className="mx-5 h-px bg-gray-100" />

        {/* Navegación */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItem("home", "Inicio", Home)}
          {navItem("favorites", "Favoritos", Star, {
            count: favoriteModules.length,
            chip:
              activeKey === "favorites"
                ? "bg-amber-100 text-amber-600"
                : "bg-amber-50 text-amber-500",
          })}

          <p className="px-3 pb-1 pt-5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            Áreas
          </p>
          {groupedAvailableModules.map((group) => {
            const meta = groupMetaFor(group.id);
            return navItem(group.id, group.title || meta.label, meta.icon);
          })}
        </nav>

        {/* Usuario — fila única clicable que abre el menú de perfil */}
        <div className="mt-auto border-t border-gray-100 px-3 py-3">
          {user && (
            <UserMenu
              align="start"
              trigger={
                <button
                  type="button"
                  aria-label="Abrir perfil"
                  className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-gray-50"
                >
                  <WorkerAvatar
                    src={user.foto_perfil}
                    nombre={user.nombre}
                    className="h-9 w-9 flex-shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900">
                      {user.nombre}
                    </p>
                    <p className="truncate text-xs text-gray-500">{user.rol}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-400" />
                </button>
              }
            />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-gradient-to-br from-[#f4f9f6] via-white to-[#e8f4ee]">
      {/* Sidebar desktop */}
      <aside className="hidden w-72 flex-shrink-0 border-r border-gray-200/70 bg-white/80 backdrop-blur-xl lg:block">
        <SidebarNav />
      </aside>

      {/* Sidebar móvil */}
      <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Navegación</SheetTitle>
          <SidebarNav />
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

                {/* Contador grande: instalaciones del equipo */}
                {totalInstalaciones !== null && (
                  <p className="text-sm text-gray-500">
                    ☀️ Juntos hemos hecho{" "}
                    <span className="font-semibold text-gray-700">
                      {totalInstalaciones.toLocaleString("es-ES")}
                    </span>{" "}
                    instalaciones solares.
                  </p>
                )}


                {/* Directorio telefónico */}
                <DirectorioTelefonicoCard />

                {/* Clima La Habana */}
                <WeatherWidget />

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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {activeGroup.modules.map((module) => (
                  <ModuleCard key={module.id} module={module} />
                ))}
              </div>
            ) : null}
          </div>
        </main>
      </div>

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
