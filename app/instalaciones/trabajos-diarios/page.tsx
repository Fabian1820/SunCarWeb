"use client";

import { ModuleHeader } from "@/components/shared/organism/module-header";
import { Toaster } from "@/components/shared/molecule/toaster";
import { RouteGuard } from "@/components/auth/route-guard";
import { TrabajosDiariosModule } from "@/components/feats/instalaciones/trabajos-diarios-module";

// Se puede entrar con el permiso de la tarjeta (`instalaciones/trabajos-diarios`,
// que hereda quien tiene `instalaciones` completo) o con cualquier sub-permiso
// `trabajos:*` (las pestañas internas ya se filtran por cada uno).
const TRABAJOS_DIARIOS_MODULOS = [
  "instalaciones/trabajos-diarios",
  "trabajos:confirmar",
  "trabajos:registrar",
  "trabajos:averias",
  "trabajos:actualizaciones",
  "trabajos:entregas",
  "trabajos:todos",
];

export default function TrabajosDiariosPage() {
  return (
    <RouteGuard requiredModule={TRABAJOS_DIARIOS_MODULOS}>
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      <ModuleHeader
        title="Trabajos Diarios"
        subtitle="Confirma salidas, registra ejecución diaria y crea trabajos diarios."
        backHref="/instalaciones"
        backLabel="Volver a Operaciones"
        badge={{
          text: "Operaciones",
          className: "bg-purple-100 text-purple-800",
        }}
      />

      <main className="content-with-fixed-header max-w-[96rem] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pb-8">
        <TrabajosDiariosModule />
      </main>

      <Toaster />
    </div>
    </RouteGuard>
  );
}
