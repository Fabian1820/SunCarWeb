"use client";

import { OrdenesTrabajoOperacionesModule } from "@/components/feats/instalaciones/ordenes-trabajo-operaciones-module";
import { RouteGuard } from "@/components/auth/route-guard";

export default function OrdenesTrabajoOperacionesPage() {
  return (
    <RouteGuard requiredModule="instalaciones/ordenes-trabajo">
      <OrdenesTrabajoOperacionesModule />
    </RouteGuard>
  );
}
