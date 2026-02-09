"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Calendar,
  DollarSign,
  Target,
  Utensils,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  Wallet,
} from "lucide-react";

interface NominaSidebarProps {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
  nominaEstado: string | null;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
  disabled?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export function NominaSidebar({ collapsed, onCollapse, nominaEstado }: NominaSidebarProps) {
  const pathname = usePathname();

  const sections: NavSection[] = [
    {
      title: "Principal",
      items: [
        {
          label: "Dashboard",
          href: "/nomina-quincenal",
          icon: <LayoutDashboard className="w-5 h-5" />,
        },
        {
          label: "Personal",
          href: "/nomina-quincenal/trabajadores",
          icon: <Users className="w-5 h-5" />,
        },
      ],
    },
    {
      title: "Nómina",
      items: [
        {
          label: "Períodos",
          href: "/nomina-quincenal/periodos",
          icon: <Calendar className="w-5 h-5" />,
        },
        {
          label: "Salarios",
          href: "/nomina-quincenal/salarios",
          icon: <DollarSign className="w-5 h-5" />,
          badge: nominaEstado === "borrador" ? "Pendiente" : undefined,
        },
        {
          label: "Estímulos",
          href: "/nomina-quincenal/estimulos",
          icon: <Target className="w-5 h-5" />,
          badge: nominaEstado === "calculada" ? "Por asignar" : undefined,
        },
        {
          label: "Alimentación",
          href: "/nomina-quincenal/alimentacion",
          icon: <Utensils className="w-5 h-5" />,
        },
      ],
    },
    {
      title: "Administración",
      items: [
        {
          label: "Ingresos Mensuales",
          href: "/nomina-quincenal/ingresos",
          icon: <Wallet className="w-5 h-5" />,
        },
        {
          label: "Reportes",
          href: "/nomina-quincenal/reportes",
          icon: <FileText className="w-5 h-5" />,
        },
        {
          label: "Configuración",
          href: "/nomina-quincenal/configuracion",
          icon: <Settings className="w-5 h-5" />,
        },
      ],
    },
  ];

  return (
    <>
      {/* Overlay para móvil */}
      {!collapsed && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => onCollapse(true)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-16 bottom-0 bg-white border-r border-gray-200 z-50",
          "transition-all duration-300 overflow-y-auto",
          collapsed ? "-translate-x-full lg:translate-x-0 lg:w-20" : "w-64"
        )}
      >
        {/* Toggle button (solo desktop) */}
        <button
          onClick={() => onCollapse(!collapsed)}
          className="hidden lg:flex absolute -right-3 top-4 w-6 h-6 bg-white border border-gray-200 rounded-full items-center justify-center shadow-sm hover:shadow-md transition-shadow"
        >
          {collapsed ? (
            <ChevronRight className="w-3 h-3 text-gray-500" />
          ) : (
            <ChevronLeft className="w-3 h-3 text-gray-500" />
          )}
        </button>

        <nav className="p-4">
          {sections.map((section, sectionIndex) => (
            <div key={section.title} className={cn(sectionIndex > 0 && "mt-6")}>
              {!collapsed && (
                <h3 className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {section.title}
                </h3>
              )}
              <ul className="space-y-1">
                {section.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors relative",
                        pathname === item.href
                          ? "bg-purple-100 text-purple-700"
                          : "text-gray-600 hover:bg-gray-100",
                        collapsed && "justify-center",
                        item.disabled && "opacity-50 cursor-not-allowed"
                      )}
                      title={collapsed ? item.label : undefined}
                    >
                      {item.icon}
                      {!collapsed && (
                        <>
                          <span className="flex-1 text-sm font-medium">{item.label}</span>
                          {item.badge && (
                            <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                      {collapsed && item.badge && (
                        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer del sidebar */}
        {!collapsed && (
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
            <div className="text-xs text-gray-400 text-center">
              <p>Sistema de Nómina Quincenal</p>
              <p className="mt-1">v2.0</p>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
