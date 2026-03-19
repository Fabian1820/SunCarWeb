"use client";

import { ModuleHeader } from "@/components/shared/organism/module-header";
import { Toaster } from "@/components/shared/molecule/toaster";
import { TrabajosDiariosModule } from "@/components/feats/instalaciones/trabajos-diarios-module";

export default function TrabajosDiariosPage() {
  return (
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
  );
}
