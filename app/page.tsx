"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/shared/molecule/card";
import { Button } from "@/components/shared/atom/button";
import {
  type LucideIcon,
  Users,
  FileCheck,
  Package,
  User,
  UserPlus,
  Info,
  Phone,
  Briefcase,
  BookOpen,
  Image,
  Zap,
  Shield,
  Calculator,
  Receipt,
  Wrench,
  ShoppingBag,
  ShoppingCart,
  BarChart3,
  FileSpreadsheet,
  PackageSearch,
  Wallet,
  Building2,
  Building,
  Coins,
  BookmarkCheck,
  Ship,
  Monitor,
  ClipboardList,
  Clipboard,
  GitMerge,
  Loader2,
} from "lucide-react";
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

  // Definir todos los módulos con sus configuraciones
  type DashboardModule = {
    id: string;
    permission?: string;
    href: string;
    icon: LucideIcon;
    title: string;
    description: string;
    iconClass: string;
  };

  type ModuleGroup = {
    id: string;
    title: string;
    subtitle: string;
    moduleIds: string[];
  };

  const allModules: DashboardModule[] = [
    {
      id: "leads",
      href: "/leads",
      icon: Phone,
      title: "Gestionar Leads Instaladora",
      description: "Administrar leads y oportunidades de venta.",
      iconClass: "text-green-600",
    },
    {
      id: "clientes",
      href: "/clientes",
      icon: User,
      title: "Gestionar Clientes Instaladora",
      description: "Administrar información y reportes de clientes.",
      iconClass: "text-orange-600",
    },
    {
      id: "clientes-ventas",
      href: "/clientes-ventas",
      icon: Users,
      title: "Gestionar Clientes Ventas",
      description: "Registrar y gestionar clientes de ventas.",
      iconClass: "text-teal-600",
    },
    {
      id: "solicitudes-ventas",
      href: "/solicitudes-ventas",
      icon: ShoppingCart,
      title: "Solicitudes Ventas",
      description: "Crear y administrar solicitudes de ventas web.",
      iconClass: "text-indigo-600",
    },
    {
      id: "reservas-ventas",
      href: "/reservas-ventas",
      icon: BookmarkCheck,
      title: "Reservas Ventas",
      description: "Gestionar reservas de materiales para ventas.",
      iconClass: "text-indigo-700",
    },
    {
      id: "ofertas-gestion",
      href: "/ofertas-gestion",
      icon: Zap,
      title: "Gestionar Ofertas Instaladora",
      description: "Confección de ofertas y herramientas de ventas.",
      iconClass: "text-amber-600",
    },
    {
      id: "reportes-comercial",
      href: "/reportes-comercial",
      icon: BarChart3,
      title: "Reportes Comercial Instaladora",
      description: "Reportes y análisis del área comercial.",
      iconClass: "text-indigo-600",
    },
    {
      id: "reportes-ventas",
      href: "/reportes-ventas",
      icon: BarChart3,
      title: "Reportes Comercial Ventas",
      description: "Resultados por vendedor: ofertas, confirmadas y cobros.",
      iconClass: "text-teal-600",
    },
    {
      id: "centro-control",
      href: "/centro-control",
      icon: Monitor,
      title: "Centro de Control",
      description: "Panel operacional en tiempo real con mapa y métricas clave.",
      iconClass: "text-amber-600",
    },
    {
      id: "todos-trabajos",
      permission: "trabajos:acceso-directo",
      href: "/operaciones/todos-trabajos",
      icon: FileCheck,
      title: "Trabajos Diarios",
      description: "Seguimiento diario de todos los trabajos e instalaciones.",
      iconClass: "text-violet-600",
    },
    {
      id: "instalaciones",
      href: "/instalaciones",
      icon: Wrench,
      title: "Instalaciones",
      description: "Instalaciones en proceso, nuevas y averías.",
      iconClass: "text-purple-600",
    },
    {
      id: "solicitudes-materiales",
      href: "/instalaciones/solicitudes-materiales",
      icon: PackageSearch,
      title: "Solicitudes de Materiales",
      description: "Crear y gestionar solicitudes de materiales.",
      iconClass: "text-teal-600",
    },
    {
      id: "brigadas",
      href: "/brigadas",
      icon: Users,
      title: "Gestionar Brigadas",
      description: "Administrar equipos de trabajo y asignaciones.",
      iconClass: "text-blue-600",
    },
    {
      id: "trabajadores",
      href: "/trabajadores",
      icon: UserPlus,
      title: "Gestionar Instaladores",
      description: "Administrar personal y asignaciones.",
      iconClass: "text-blue-600",
    },
    {
      id: "asignaciones",
      href: "/asignaciones",
      icon: Clipboard,
      title: "Asignaciones de Recursos",
      description: "Gestionar recursos asignados a trabajadores e instalaciones.",
      iconClass: "text-indigo-600",
    },
    {
      id: "materiales",
      href: "/materiales",
      icon: Package,
      title: "Gestionar Materiales",
      description: "Administrar catálogo de materiales.",
      iconClass: "text-emerald-600",
    },
    {
      id: "envio-contenedores",
      href: "/envio-contenedores",
      icon: Ship,
      title: "Envío de Contenedores",
      description: "Registrar y monitorear envíos de contenedores.",
      iconClass: "text-cyan-700",
    },
    {
      id: "compras-envios-costos",
      href: "/compras-envios-costos",
      icon: FileSpreadsheet,
      title: "Compras, Envíos y Costos",
      description: "Envíos de contenedores y fichas de costo de materiales.",
      iconClass: "text-teal-600",
    },
    {
      id: "facturas",
      href: "/facturas",
      icon: Receipt,
      title: "Facturación",
      description: "Gestión de facturas y vales de venta.",
      iconClass: "text-sky-600",
    },
    {
      id: "wallet",
      href: "/wallet",
      icon: Wallet,
      title: "Billetera",
      description: "Ingresos y gastos manuales con trazabilidad global.",
      iconClass: "text-amber-700",
    },
    {
      id: "tasa-cambio-diaria",
      href: "/tasa-cambio-diaria",
      icon: Coins,
      title: "Tasa de Cambio diaria",
      description: "Registro diario de 1 USD en EUR y CUP para contabilidad.",
      iconClass: "text-amber-600",
    },
    {
      id: "almacenes-suncar",
      href: "/almacenes-suncar",
      icon: Package,
      title: "Almacenes Suncar",
      description: "Gestión de almacenes y control de inventario.",
      iconClass: "text-blue-600",
    },
    {
      id: "inventario",
      href: "/inventario",
      icon: Package,
      title: "Inventario y Almacenes",
      description: "Controlar almacenes, stock y movimientos.",
      iconClass: "text-orange-600",
    },
    {
      id: "tiendas-suncarventas",
      href: "/tiendas-suncarventas",
      icon: ShoppingBag,
      title: "Tiendas Suncar",
      description: "Gestión de tiendas y puntos de venta.",
      iconClass: "text-orange-600",
    },
    {
      id: "recursos-humanos",
      href: "/recursos-humanos",
      icon: Briefcase,
      title: "Recursos Humanos",
      description: "Gestión de nómina y estímulos mensuales.",
      iconClass: "text-purple-600",
    },
    {
      id: "sedes",
      href: "/sedes",
      icon: Building2,
      title: "Gestionar Sedes",
      description: "Administrar sedes nacionales y provinciales.",
      iconClass: "text-blue-700",
    },
    {
      id: "departamentos",
      href: "/departamentos",
      icon: Building,
      title: "Gestionar Departamentos",
      description: "Administrar departamentos organizacionales.",
      iconClass: "text-teal-700",
    },
    {
      id: "fichas-costo",
      href: "/fichas-costo",
      icon: FileSpreadsheet,
      title: "Fichas de Costo",
      description: "Gestión de fichas de costo de materiales.",
      iconClass: "text-teal-600",
    },
    {
      id: "blog",
      href: "/blog",
      icon: BookOpen,
      title: "Blog",
      description: "Gestión de artículos y noticias.",
      iconClass: "text-purple-600",
    },
    {
      id: "galeriaweb",
      href: "/galeriaweb",
      icon: Image,
      title: "Galería Web",
      description: "Gestión de imágenes para el sitio web.",
      iconClass: "text-pink-600",
    },
    {
      id: "existencias-contabilidad",
      permission: "existencias-contabilidad",
      href: "/existencias-contabilidad",
      icon: PackageSearch,
      title: "Existencias Contabilidad",
      description: "Gestión de inventario contable y tickets de salida",
      iconClass: "text-purple-600",
    },
  ];

  const moduleGroups: ModuleGroup[] = [
    {
      id: "resultados-empresa",
      title: "",
      subtitle: "",
      moduleIds: ["centro-control"],
    },
    {
      id: "comercial-instaladora",
      title: "Comercial Instaladora",
      subtitle: "Leads, clientes, ofertas y reportes de la instaladora.",
      moduleIds: [
        "leads",
        "clientes",
        "ofertas-gestion",
        "reportes-comercial",
      ],
    },
    {
      id: "comercial-ventas",
      title: "Comercial Ventas",
      subtitle: "Clientes, solicitudes, reservas y tiendas del área de ventas.",
      moduleIds: [
        "clientes-ventas",
        "solicitudes-ventas",
        "reservas-ventas",
        "tiendas-suncarventas",
        "reportes-ventas",
      ],
    },
    {
      id: "operaciones",
      title: "Operaciones",
      subtitle: "Brigadas, instaladores, instalaciones y solicitudes.",
      moduleIds: [
        "brigadas",
        "trabajadores",
        "instalaciones",
        "todos-trabajos",
        "solicitudes-materiales",
      ],
    },
    {
      id: "economia",
      title: "Economía",
      subtitle: "Facturación, tasa de cambio, existencias y compras.",
      moduleIds: [
        "facturas",
        "tasa-cambio-diaria",
        "existencias-contabilidad",
        "compras-envios-costos",
      ],
    },
    {
      id: "gestion-almacenes",
      title: "Gestión de Almacenes",
      subtitle: "Materiales, almacenes e inventario.",
      moduleIds: [
        "materiales",
        "almacenes-suncar",
        "inventario",
      ],
    },
    {
      id: "recursos-humanos-grupo",
      title: "Recursos Humanos",
      subtitle: "Personal, sedes, departamentos y asignaciones de recursos.",
      moduleIds: ["recursos-humanos", "sedes", "departamentos", "asignaciones"],
    },
    {
      id: "area-direccion",
      title: "Área de Dirección",
      subtitle: "Billetera y permisos.",
      moduleIds: ["wallet", "wallet-manager", "permisos"],
    },
    {
      id: "web",
      title: "Marketing",
      subtitle: "Blog y galería.",
      moduleIds: ["blog", "galeriaweb"],
    },
  ];

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
      // Wallet es accesible para todos los usuarios autenticados
      if (module.id === "wallet") {
        return true;
      }
      return hasPermission(module.permission ?? module.id);
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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      {/* Header */}
      <header
        ref={headerRef}
        className="fixed-header bg-white/90 backdrop-blur"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-2 sm:py-6">
            <div className="flex items-center gap-3">
              <div className="p-0 rounded-full bg-white shadow border border-orange-200 flex items-center justify-center h-9 w-9 sm:h-14 sm:w-14">
                <img
                  src="/logo.png"
                  alt="Logo SunCar"
                  className="h-8 w-8 sm:h-10 sm:w-10 object-contain rounded-full"
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
                                    className="flex items-center space-x-2 bg-white hover:bg-orange-50 border-orange-200 hover:border-orange-300 transition-all duration-200 relative group"
                                >
                                    <MessageCircle className="h-4 w-4 text-orange-600"/>
                                    <span className="text-gray-700 group-hover:text-orange-700">Atención al Cliente</span>
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
                  className="flex items-center justify-center bg-white hover:bg-orange-50 border-orange-200 hover:border-orange-300 rounded-full sm:rounded-md h-9 px-3 sm:h-10 sm:px-4 sm:w-auto touch-manipulation"
                >
                  <ClipboardList className="h-4 w-4 text-orange-600 sm:mr-2" />
                  <span className="hidden sm:inline">Ticket / Vale</span>
                  <span className="sr-only">Ticket / Vale</span>
                </Button>
              )}
              <Link href="/calculadora" className="flex">
                <Button
                  variant="outline"
                  size="sm"
                  aria-label="Abrir calculadora"
                  className="flex items-center justify-center bg-white hover:bg-orange-50 border-orange-200 hover:border-orange-300 rounded-full sm:rounded-md h-9 px-3 sm:h-10 sm:px-4 sm:w-auto touch-manipulation"
                >
                  <Calculator className="h-4 w-4 text-orange-600 sm:mr-2" />
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
                className="flex items-center justify-center bg-white hover:bg-emerald-50 border-orange-200 hover:border-emerald-300 rounded-full sm:rounded-md h-9 px-3 sm:h-10 sm:px-4 sm:w-auto touch-manipulation"
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
                className="flex items-center justify-center bg-white hover:bg-gray-50 border-orange-200 hover:border-orange-300 rounded-full sm:rounded-md h-9 px-3 sm:h-10 sm:px-4 sm:w-auto touch-manipulation"
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
                      <div className="mt-3 h-px bg-gradient-to-r from-orange-300 via-orange-200 to-transparent" />
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
