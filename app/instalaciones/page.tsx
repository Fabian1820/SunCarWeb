"use client";

import { ModuleCard } from "@/components/shared/molecule/module-card";
import { ModuleHeader } from "@/components/shared/organism/module-header";
import {
  Wrench,
  Clock,
  AlertTriangle,
  MapPin,
  CalendarCheck,
  CalendarDays,
  ClipboardList,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

// Sub-permisos `trabajos:*` que dan acceso a la tarjeta "Trabajos Diarios".
const TRABAJOS_MODULOS = [
  "trabajos:confirmar",
  "trabajos:registrar",
  "trabajos:averias",
  "trabajos:actualizaciones",
  "trabajos:entregas",
  "trabajos:todos",
];

export default function InstalacionesPage() {
  const { hasPermission } = useAuth();

  const opciones = [
    {
      id: "pendientes-visita",
      title: "Visitas",
      description: "Pendientes, realizadas y todas las visitas",
      icon: MapPin,
      iconClass: "text-teal-600",
      href: "/instalaciones/pendientes-visita",
    },
    {
      id: "en-proceso",
      title: "Instalaciones en Proceso",
      description: "Clientes con instalación en proceso",
      icon: Clock,
      iconClass: "text-teal-600",
      href: "/instalaciones/en-proceso",
    },
    {
      id: "nuevas",
      title: "Instalaciones Nuevas",
      description: "Nuevas instalaciones por realizar",
      icon: Wrench,
      iconClass: "text-teal-600",
      href: "/instalaciones/nuevas",
    },
    {
      id: "trabajos-diarios",
      title: "Trabajos Diarios",
      description: "Confirmar salida y entrega de materiales por vale",
      icon: CalendarDays,
      iconClass: "text-teal-600",
      href: "/instalaciones/trabajos-diarios",
    },
    {
      id: "averias",
      title: "Averías",
      description: "Reportes de averías y mantenimiento",
      icon: AlertTriangle,
      iconClass: "text-teal-600",
      href: "/instalaciones/averias",
    },
    {
      id: "planificacion-diaria-trabajos",
      title: "Planificación Diaria de Trabajos",
      description: "Planifica trabajos del día siguiente por brigadas",
      icon: CalendarCheck,
      iconClass: "text-teal-600",
      href: "/instalaciones/planificacion-diaria-trabajos",
    },
    {
      id: "ordenes-trabajo",
      title: "Órdenes de Trabajo",
      description: "Crear y gestionar órdenes de trabajo operativas",
      icon: ClipboardList,
      iconClass: "text-teal-600",
      href: "/instalaciones/ordenes-trabajo",
    },
  ];

  // Cada tarjeta = un sub-permiso `instalaciones/<id>`. Quien tiene el módulo
  // `instalaciones` completo los hereda todos; los granulares ven solo lo suyo.
  const puedeVerOpcion = (id: string): boolean => {
    if (id === "trabajos-diarios") {
      return (
        hasPermission("instalaciones/trabajos-diarios") ||
        TRABAJOS_MODULOS.some((m) => hasPermission(m))
      );
    }
    return hasPermission(`instalaciones/${id}`);
  };

  const opcionesVisibles = opciones.filter((opcion) => puedeVerOpcion(opcion.id));

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f4f9f6] via-white to-[#e8f4ee]">
      <ModuleHeader
        title="Gestión de Instalaciones"
        subtitle="Administrar instalaciones, averías y mantenimiento"
        badge={{
          text: "Operaciones",
          className: "bg-teal-100 text-teal-800",
        }}
      />

      <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pb-8">
        {opcionesVisibles.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500">
              No tienes permisos para acceder a ninguna sección de Instalaciones.
              Contacta con el equipo de informáticos.
            </p>
          </div>
        ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {opcionesVisibles.map((opcion) => (
            <ModuleCard
              key={opcion.id}
              href={opcion.href}
              icon={opcion.icon}
              iconClass={opcion.iconClass}
              title={opcion.title}
              description={opcion.description}
            />
          ))}
        </div>
        )}
      </main>
    </div>
  );
}
