"use client";

import { Card, CardContent } from "@/components/shared/molecule/card";
import { ModuleHeader } from "@/components/shared/organism/module-header";
import { Wrench, Clock, AlertTriangle, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";

export default function InstalacionesPage() {
  const router = useRouter();

  const opciones = [
    {
      id: "pendientes-visita",
      title: "Visitas",
      description: "Pendientes, realizadas y todas las visitas",
      icon: MapPin,
      color: "orange",
      href: "/instalaciones/pendientes-visita",
    },
    {
      id: "en-proceso",
      title: "Instalaciones en Proceso",
      description: "Clientes con instalación en proceso",
      icon: Clock,
      color: "blue",
      href: "/instalaciones/en-proceso",
    },
    {
      id: "nuevas",
      title: "Instalaciones Nuevas",
      description: "Nuevas instalaciones por realizar",
      icon: Wrench,
      color: "green",
      href: "/instalaciones/nuevas",
    },
    {
      id: "averias",
      title: "Averías",
      description: "Reportes de averías y mantenimiento",
      icon: AlertTriangle,
      color: "red",
      href: "/instalaciones/averias",
    },
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      orange: {
        bg: "bg-orange-50",
        border: "border-orange-200",
        icon: "text-orange-600",
        hover: "hover:bg-orange-100",
      },
      blue: {
        bg: "bg-blue-50",
        border: "border-blue-200",
        icon: "text-blue-600",
        hover: "hover:bg-blue-100",
      },
      green: {
        bg: "bg-green-50",
        border: "border-green-200",
        icon: "text-green-600",
        hover: "hover:bg-green-100",
      },
      red: {
        bg: "bg-red-50",
        border: "border-red-200",
        icon: "text-red-600",
        hover: "hover:bg-red-100",
      },
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      <ModuleHeader
        title="Gestión de Instalaciones"
        subtitle="Administrar instalaciones, averías y mantenimiento"
        badge={{
          text: "Operaciones",
          className: "bg-purple-100 text-purple-800",
        }}
      />

      <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {opciones.map((opcion) => {
            const Icon = opcion.icon;
            const colors = getColorClasses(opcion.color);

            return (
              <Card
                key={opcion.id}
                className={`cursor-pointer transition-all duration-200 ${colors.border} ${colors.hover} border-2`}
                onClick={() => router.push(opcion.href)}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className={`${colors.bg} p-4 rounded-full`}>
                      <Icon className={`h-8 w-8 ${colors.icon}`} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {opcion.title}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {opcion.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}
