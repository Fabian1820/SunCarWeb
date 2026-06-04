"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/shared/molecule/card";
import { Button } from "@/components/shared/atom/button";
import {
  type LucideIcon,
  Info,
  Shield,
  Calculator,
  Wallet,
  Coins,
  ClipboardList,
  GitMerge,
  Loader2,
} from "lucide-react";
import {
  MODULOS_CATALOGO,
  MODULO_GRUPOS,
  type ModuloCatalogo,
} from "@/lib/modulos-catalogo";
import { useLayoutEffect, useRef, useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
import { TasaCambioService } from "@/lib/api-services";
import ContactosDashboard from "@/components/feats/contactos/contactos-dashboard";
import { TicketManualDialog } from "@/components/feats/dashboard/ticket-manual-dialog";
import { Toaster } from "@/components/shared/molecule/toaster";
import { useAuth } from "@/contexts/auth-context";
import { UserMenu } from "@/components/auth/user-menu";
import { BirthdayChecker } from "@/components/shared/molecule/birthday-checker";
import type { TasaCambio } from "@/lib/types/feats/tasa-cambio/tasa-cambio-types";
import { useMyWalletPermiso } from "@/hooks/use-wallet-permisos";

export default function Dashboard() {
  const { hasPermission, user, loadModulosPermitidos } = useAuth();
  const { permiso: myWalletPermiso } = useMyWalletPermiso();
  const [isContactosDialogOpen, setIsContactosDialogOpen] = useState(false);
  const [isTasaCambioDialogOpen, setIsTasaCambioDialogOpen] = useState(false);
  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false);
  const [tasaCambioHoy, setTasaCambioHoy] = useState<TasaCambio | null>(null);
  const [loadingTasaCambio, setLoadingTasaCambio] = useState(false);
  const [errorTasaCambio, setErrorTasaCambio] = useState<string | null>(null);
  const headerRef = useRef<HTMLElement | null>(null);
  const [headerHeight, setHeaderHeight] = useState<number>(120);
  const [mergingTarget, setMergingTarget] = useState<"frontend" | "backend" | null>(null);
  const [mergeResult, setMergeResult] = useState<{ target: string; message: string; ok: boolean } | null>(null);
  // Leer desde window.__SHOW_DEV_TOOLS__ (inyectado en layout) en runtime,
  // con fallback a process.env para SSR. Igual patrón que __BACKEND_URL__.
  const showDevTools = typeof window !== "undefined"
    ? Boolean((window as Record<string, unknown>).__SHOW_DEV_TOOLS__)
    : process.env.NEXT_PUBLIC_SHOW_DEV_TOOLS === "true";

  // Cargar módulos permitidos cada vez que se monta el dashboard
  useEffect(() => {
    loadModulosPermitidos();
  }, [user]);

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

  // Módulos del catálogo (single-source-of-truth en lib/modulos-catalogo.ts).
  // Para agregar o quitar módulos del dashboard, editar ese archivo.
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

  // Excluir módulos marcados como hideFromDashboard: viven como sub-cards
  // dentro de otro módulo padre y no deben renderizarse en el dashboard
  // principal (ej. envio-contenedores y fichas-costo dentro de
  // compras-envios-costos).
  const allModules: DashboardModule[] = MODULOS_CATALOGO.filter(
    (m) => !m.hideFromDashboard,
  ).map(catalogoToDashboard);
  // Agrupación derivada del catálogo (single-source-of-truth).
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
            // Wallet viene del catálogo; permisos y wallet-manager son virtuales.
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
      // Hijos lógicos que no usan formato padre/hijo: si el trabajador tiene
      // permiso a alguno, el card padre se hace visible.
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
      setMergeResult({ target, message: "Error de red al intentar el merge", ok: false });
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

  useLayoutEffect(() => {
    if (!headerRef.current) return;

    const element = headerRef.current;
    const update = () =>
      setHeaderHeight(Math.ceil(element.getBoundingClientRect().height));

    update();

    const resizeObserver = new ResizeObserver(() => update());
    resizeObserver.observe(element);
    window.addEventListener("resize", update);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f4f9f6] via-white to-[#e8f4ee]">
      {/* Header */}
      <header
        ref={headerRef}
        className="fixed-header bg-white/90 backdrop-blur"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-2 sm:py-6">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-suncar-primary shadow-sm flex items-center justify-center h-9 w-9 sm:h-14 sm:w-14 p-1.5 sm:p-2.5">
                <img
                  src="/brand/suncar-v1-iso.png"
                  alt="Logo Suncar"
                  className="h-full w-full object-contain"
                />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                  <span className="block sm:hidden text-base tracking-[0.3em] uppercase">
                    SUNCAR
                  </span>
                  <span className="hidden sm:inline">
                    Administración de SUNCAR
                  </span>
                </h1>
                <p className="hidden sm:block text-sm text-gray-600">
                  Sistema de Gestión de Empresarial.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 justify-end">
              {/* <Link href="/atencion-cliente">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex items-center space-x-2 bg-white hover:bg-emerald-50 border-emerald-200 hover:border-emerald-300 transition-all duration-200 relative group"
                                >
                                    <MessageCircle className="h-4 w-4 text-emerald-600"/>
                                    <span className="text-gray-700 group-hover:text-emerald-700">Atención al Cliente</span>
                                    <div className="absolute -top-1 -right-1">
                                        <div className="h-2 w-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full animate-pulse"></div>
                                    </div>
                                </Button>
                            </Link> */}
              {/* Botón Ticket / Vale oculto temporalmente */}
              {false && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsTicketDialogOpen(true)}
                  aria-label="Generar ticket o vale de venta"
                  className="flex items-center justify-center bg-white hover:bg-emerald-50 border-emerald-200 hover:border-emerald-300 rounded-full sm:rounded-md h-9 px-3 sm:h-10 sm:px-4 sm:w-auto touch-manipulation"
                >
                  <ClipboardList className="h-4 w-4 text-emerald-600 sm:mr-2" />
                  <span className="hidden sm:inline">Ticket / Vale</span>
                  <span className="sr-only">Ticket / Vale</span>
                </Button>
              )}
              <Link href="/calculadora" className="flex">
                <Button
                  variant="outline"
                  size="sm"
                  aria-label="Abrir calculadora"
                  className="flex items-center justify-center bg-white hover:bg-emerald-50 border-emerald-200 hover:border-emerald-300 rounded-full sm:rounded-md h-9 px-3 sm:h-10 sm:px-4 sm:w-auto touch-manipulation"
                >
                  <Calculator className="h-4 w-4 text-emerald-600 sm:mr-2" />
                  <span className="hidden sm:inline">Calculadora</span>
                  <span className="sr-only">Calculadora</span>
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  handleOpenTasaCambioDialog().catch(() => null);
                }}
                aria-label="Ver tasa de cambio diaria"
                className="flex items-center justify-center bg-white hover:bg-emerald-50 border-emerald-200 hover:border-emerald-300 rounded-full sm:rounded-md h-9 px-3 sm:h-10 sm:px-4 sm:w-auto touch-manipulation"
              >
                <Coins className="h-4 w-4 text-emerald-600 sm:mr-2" />
                <span className="hidden sm:inline">Tasa de cambio</span>
                <span className="sr-only">Tasa de cambio</span>
              </Button>
              {/* Radar comentado temporalmente en el topbar principal */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsContactosDialogOpen(true)}
                aria-label="Ver información de contacto"
                className="flex items-center justify-center bg-white hover:bg-gray-50 border-emerald-200 hover:border-emerald-300 rounded-full sm:rounded-md h-9 px-3 sm:h-10 sm:px-4 sm:w-auto touch-manipulation"
              >
                <Info className="h-4 w-4 text-blue-600 sm:mr-2" />
                <span className="hidden sm:inline">Información</span>
                <span className="sr-only">Información</span>
              </Button>
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      <main
        className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8"
        style={{ paddingTop: headerHeight + 8 }}
      >
        {mergeResult && (
          <div className={`mb-4 flex items-center justify-between rounded-xl border px-4 py-3 text-sm ${
            mergeResult.ok
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}>
            <span>{mergeResult.message}</span>
            <button onClick={() => setMergeResult(null)} className="ml-4 opacity-60 hover:opacity-100">✕</button>
          </div>
        )}
        {/* Full width layout for modules */}
        <div className="flex flex-col">
          {groupedAvailableModules.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">
                No tiene permisos de acceso aun o ha ocurrido algun cambio.
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Contacte con el equipo de informaticos para resolver el
                problema.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {groupedAvailableModules.map((group) => (
                <section key={group.id} className="space-y-4">
                  {group.title ? (
                    <div>
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                        {group.title}
                      </h3>
                      <div className="mt-3 h-px bg-gradient-to-r from-emerald-300 via-emerald-200 to-transparent" />
                    </div>
                  ) : null}

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                    {group.modules.map((module) => (
                      <Link key={module.id} href={module.href}>
                        <Card className="border-0 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer h-full hover:-translate-y-2 bg-white/90 backdrop-blur-sm">
                          <CardContent className="p-4 sm:p-6 text-center flex flex-col justify-center h-full">
                            <module.icon
                              className={`h-8 w-8 sm:h-10 sm:w-10 ${module.iconClass} mx-auto mb-3`}
                            />
                            <h4 className="text-lg font-semibold text-gray-900 mb-2">
                              {module.title}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {module.description}
                            </p>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Contactos Dialog */}
      <Dialog
        open={isContactosDialogOpen}
        onOpenChange={setIsContactosDialogOpen}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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

      {/* Dev Tools FAB - Solo en dashboard para superAdmin con dev tools habilitadas */}
      {showDevTools && user?.is_superAdmin && (
        <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-40 pointer-events-auto">
          {/* Merge Backend Button */}
          <Button
            onClick={() => handleMerge("backend")}
            disabled={mergingTarget !== null}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white rounded-full h-14 w-14 sm:w-auto sm:px-4 shadow-lg hover:shadow-xl transition-all"
            title="Merge dev → master (Backend)"
          >
            {mergingTarget === "backend" ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <GitMerge className="h-5 w-5" />
            )}
            <span className="hidden sm:inline text-sm font-medium">Backend</span>
          </Button>

          {/* Merge Frontend Button */}
          <Button
            onClick={() => handleMerge("frontend")}
            disabled={mergingTarget !== null}
            className="flex items-center gap-2 bg-violet-500 hover:bg-violet-600 text-white rounded-full h-14 w-14 sm:w-auto sm:px-4 shadow-lg hover:shadow-xl transition-all"
            title="Merge dev → main (Frontend)"
          >
            {mergingTarget === "frontend" ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <GitMerge className="h-5 w-5" />
            )}
            <span className="hidden sm:inline text-sm font-medium">Frontend</span>
          </Button>
        </div>
      )}

      <Toaster />
    </div>
  );
}
