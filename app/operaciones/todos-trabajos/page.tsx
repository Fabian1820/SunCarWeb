"use client";

import { RouteGuard } from "@/components/auth/route-guard";
import { ModuleHeader } from "@/components/shared/organism/module-header";
import { TrabajosDiariosTodosView } from "@/components/feats/instalaciones/trabajos-diarios-todos-view";

export default function TodosTrabajosPage() {
  return (
    <RouteGuard requiredModule="trabajos:acceso-directo">
      <ModuleHeader
        title="Trabajos Diarios"
        backHref="/"
        backLabel="Volver al inicio"
      />
      <div className="container mx-auto px-4 py-6 content-with-fixed-header">
        <TrabajosDiariosTodosView />
      </div>
    </RouteGuard>
  );
}
