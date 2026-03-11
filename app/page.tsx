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
  BarChart3,
  Map,
  Trophy,
  FileSpreadsheet,
} from "lucide-react";
import { useLayoutEffect, useRef, useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
import FormViewer from "@/components/feats/reports/FormViewerNoSSR";
import { ReporteService, ClienteService } from "@/lib/api-services";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import ContactosDashboard from "@/components/feats/contactos/contactos-dashboard";
import { Toaster } from "@/components/shared/molecule/toaster";
import { useAuth } from "@/contexts/auth-context";
import { UserMenu } from "@/components/auth/user-menu";
import { BirthdayChecker } from "@/components/shared/molecule/birthday-checker";

export default function Dashboard() {
  const { hasPermission, user, loadModulosPermitidos } = useAuth();
  const [selectedForm, setSelectedForm] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isContactosDialogOpen, setIsContactosDialogOpen] = useState(false);
  const [recentReports, setRecentReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const headerRef = useRef<HTMLElement | null>(null);
  const [headerHeight, setHeaderHeight] = useState<number>(120);

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
      title: "Gestionar Leads",
      description: "Administrar leads y oportunidades de venta.",
      iconClass: "text-green-600",
    },
    {
      id: "clientes",
      href: "/clientes",
      icon: User,
      title: "Gestionar Clientes",
      description: "Administrar información y reportes de clientes.",
      iconClass: "text-orange-600",
    },
    {
      id: "ofertas-gestion",
      href: "/ofertas-gestion",
      icon: Zap,
      title: "Gestionar Ofertas",
      description: "Confección de ofertas y herramientas de ventas.",
      iconClass: "text-amber-600",
    },
    {
      id: "reportes-comercial",
      href: "/reportes-comercial",
      icon: BarChart3,
      title: "Reportes Comercial",
      description: "Reportes y análisis del área comercial.",
      iconClass: "text-indigo-600",
    },
    {
      id: "resultados",
      href: "/resultados",
      icon: Trophy,
      title: "Resultados",
      description: "Indicadores principales y presencia nacional.",
      iconClass: "text-amber-600",
    },
    {
      id: "instalaciones",
      href: "/instalaciones",
      icon: Wrench,
      title: "Operaciones",
      description: "Instalaciones en proceso, nuevas y averías.",
      iconClass: "text-purple-600",
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
      id: "reportes",
      href: "/reportes",
      icon: FileCheck,
      title: "Gestionar Reportes",
      description: "Administrar historial de reportes.",
      iconClass: "text-emerald-600",
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
      id: "facturas",
      href: "/facturas",
      icon: Receipt,
      title: "Facturación",
      description: "Gestión de facturas y vales de venta.",
      iconClass: "text-sky-600",
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
    // Comentados temporalmente por no uso u obsolescencia visual:
    // { id: "articulos-tienda", href: "/articulos-tienda", icon: ShoppingBag, title: "Artículos Tienda", description: "Administrar catálogo de artículos de tienda.", iconClass: "text-blue-600" },
    // { id: "estadisticas", href: "/estadisticas", icon: BarChart3, title: "Estadísticas", description: "Análisis de crecimiento mensual y métricas clave.", iconClass: "text-purple-600" },
    // { id: "radar-energetico", permission: "estadisticas", href: "/radar-energetico", icon: Map, title: "Radar Energético", description: "Mapa táctico por municipio con calor de potencia instalada.", iconClass: "text-cyan-600" },
    // { id: "ofertas", href: "/ofertas", icon: Tag, title: "Ofertas", description: "Gestión de ofertas y promociones.", iconClass: "text-orange-600" },
    // { id: "ofertas-personalizadas", href: "/ofertas-personalizadas", icon: Sparkles, title: "Ofertas Personalizadas", description: "Crear ofertas personalizadas para clientes.", iconClass: "text-amber-600" },
    // { id: "ordenes-trabajo", href: "/ordenes-trabajo", icon: ClipboardList, title: "Órdenes de Trabajo", description: "Crear y gestionar órdenes para brigadas.", iconClass: "text-purple-600" },
    // { id: "trabajos-pendientes", href: "/trabajos-pendientes", icon: FileText, title: "Trabajos Pendientes", description: "Gestión de trabajos pendientes y seguimiento.", iconClass: "text-indigo-600" },
    // { id: "whatsapp", href: "/whatsapp", icon: MessageSquare, title: "WhatsApp Business", description: "Gestión de conversaciones y atención al cliente.", iconClass: "text-green-600" },
  ];

  const moduleGroups: ModuleGroup[] = [
    {
      id: "comercial",
      title: "Comercial",
      subtitle: "Leads, clientes, ofertas, reportes comercial y resultados.",
      moduleIds: [
        "leads",
        "clientes",
        "ofertas-gestion",
        "reportes-comercial",
        "resultados",
      ],
    },
    {
      id: "operaciones",
      title: "Operaciones",
      subtitle: "Brigadas, trabajadores, reportes y operaciones.",
      moduleIds: ["brigadas", "trabajadores", "reportes", "instalaciones"],
    },
    {
      id: "economia",
      title: "Economía",
      subtitle:
        "Materiales, facturación, almacenes, inventario, tiendas, RH y costos.",
      moduleIds: [
        "materiales",
        "facturas",
        "almacenes-suncar",
        "inventario",
        "tiendas-suncarventas",
        "recursos-humanos",
        "fichas-costo",
      ],
    },
    {
      id: "web",
      title: "Web",
      subtitle: "Blog, galería y gestión de permisos.",
      moduleIds: ["blog", "galeriaweb", "permisos"],
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

  const availableModules = [
    ...allModules.filter((module) =>
      hasPermission(module.permission ?? module.id),
    ),
    ...superAdminModules.filter((module) =>
      hasPermission(module.permission ?? module.id),
    ),
  ];

  const availableModuleMap = new Map(
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

  useEffect(() => {
    // Obtener los reportes más recientes del backend
    const fetchRecentReports = async () => {
      setLoading(true);
      try {
        const data = await ReporteService.getReportes();
        // Ordenar por fecha descendente y tomar los 3 más recientes
        const sorted = Array.isArray(data)
          ? [...data].sort(
              (a, b) =>
                new Date(
                  b.fecha_hora?.fecha ||
                    b.dateTime?.date ||
                    b.fecha_creacion ||
                    0,
                ).getTime() -
                new Date(
                  a.fecha_hora?.fecha ||
                    a.dateTime?.date ||
                    a.fecha_creacion ||
                    0,
                ).getTime(),
            )
          : [];
        setRecentReports(sorted.slice(0, 3));
      } catch (e) {
        setRecentReports([]);
      } finally {
        setLoading(false);
      }
    };

    // Cargar clientes siempre
    const fetchClients = async () => {
      try {
        const response = await ClienteService.getClientes();
        // El servicio devuelve { clients: Cliente[], total, skip, limit }
        setClients(response.clients || []);
      } catch (e) {
        setClients([]);
      }
    };

    fetchRecentReports();
    fetchClients();
  }, []);

  const openFormDialog = (form: any) => {
    setSelectedForm(form);
    setIsDialogOpen(true);
  };

  const getClienteByNumero = (numero: string | number) =>
    clients.find((c) => String(c.numero) === String(numero));

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
              <Link href="/radar-energetico" className="flex">
                <Button
                  variant="outline"
                  size="sm"
                  aria-label="Abrir radar energético"
                  className="flex items-center justify-center bg-white hover:bg-cyan-50 border-cyan-200 hover:border-cyan-300 rounded-full sm:rounded-md h-9 px-3 sm:h-10 sm:px-4 sm:w-auto touch-manipulation"
                >
                  <Map className="h-4 w-4 text-cyan-600 sm:mr-2" />
                  <span className="hidden sm:inline">Radar</span>
                  <span className="sr-only">Radar Energético</span>
                </Button>
              </Link>
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
        {/* Full width layout for modules */}
        <div className="flex flex-col">
          <div className="mb-4 sm:mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-center sm:text-left">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                Módulos del Sistema
              </h2>
              {user && (
                <p className="text-sm text-gray-600 mt-2">
                  Bienvenido,{" "}
                  <span className="font-semibold">{user.nombre}</span> -{" "}
                  {user.rol}
                </p>
              )}
            </div>
          </div>

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
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                      {group.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600 mt-1">
                      {group.subtitle}
                    </p>
                    <div className="mt-3 h-px bg-gradient-to-r from-orange-300 via-orange-200 to-transparent" />
                  </div>

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

      {/* Form Viewer Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {/* DialogTitle oculto para accesibilidad */}
          <VisuallyHidden asChild>
            <DialogTitle>Reporte H-1114</DialogTitle>
          </VisuallyHidden>
          {/* El encabezado visual se muestra solo dentro de FormViewer */}
          {selectedForm && (
            <FormViewer
              formData={selectedForm}
              clienteCompleto={getClienteByNumero(selectedForm.cliente?.numero)}
            />
          )}
        </DialogContent>
      </Dialog>

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

      {/* Birthday Notification Checker */}
      <BirthdayChecker />

      <Toaster />
    </div>
  );
}
