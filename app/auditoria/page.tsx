"use client";

import { useState } from "react";
import Link from "next/link";
import { ModuleHeader } from "@/components/shared/organism/module-header";
import { Button } from "@/components/shared/atom/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/shared/molecule/card";
import { PageLoader } from "@/components/shared/atom/page-loader";
import { SmartPagination } from "@/components/shared/molecule/smart-pagination";
import { AlertTriangle, RefreshCw, ScrollText } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useAuditoria } from "@/hooks/use-auditoria";
import { AuditoriaFiltrosBar } from "@/components/feats/auditoria/auditoria-filtros";
import { AuditoriaTabla } from "@/components/feats/auditoria/auditoria-tabla";
import { AuditoriaDetalleDialog } from "@/components/feats/auditoria/auditoria-detalle-dialog";
import type { AuditoriaEvento } from "@/lib/types/feats/auditoria/auditoria-types";

export default function AuditoriaPage() {
  return (
    <SoloSuperAdmin>
      <AuditoriaContenido />
    </SoloSuperAdmin>
  );
}

/**
 * La bitácora registra lo que hace todo el mundo, así que no se reparte por
 * módulos: es solo para superAdmin, igual que en el backend. No se usa
 * RouteGuard porque ese componente da acceso a cualquier permiso asignado.
 */
function SoloSuperAdmin({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) return <PageLoader />;
  if (!isAuthenticated) return null;

  if (!user?.is_superAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#f4f9f6] via-white to-[#e8f4ee]">
        <div className="text-center">
          <h1 className="mb-4 text-4xl font-bold text-gray-900">Acceso Denegado</h1>
          <p className="mb-6 text-gray-600">
            La auditoría del sistema es solo para super administradores.
          </p>
          <Link href="/">
            <Button>Volver al Inicio</Button>
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function AuditoriaContenido() {
  const {
    eventos,
    total,
    totalPaginas,
    filtros,
    facetas,
    estado,
    loading,
    error,
    setFiltros,
    limpiarFiltros,
    irAPagina,
    recargar,
  } = useAuditoria(true);

  const [seleccionado, setSeleccionado] = useState<AuditoriaEvento | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f4f9f6] via-white to-[#e8f4ee]">
      <ModuleHeader
        title="Auditoría del Sistema"
        subtitle="Quién hizo qué, cuándo y con qué resultado"
        badge={{ text: "Solo superAdmin", className: "bg-red-100 text-red-700" }}
        actions={
          <Button variant="outline" onClick={recargar} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
        }
      />

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {error && (
          <Card className="border-rose-200 bg-rose-50">
            <CardContent className="p-4 text-sm text-rose-800">{error}</CardContent>
          </Card>
        )}

        {/* Si la cola descarta eventos, la bitácora tiene huecos y hay que saberlo. */}
        {estado && estado.descartados > 0 && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="flex items-center gap-2 p-4 text-sm text-amber-800">
              <AlertTriangle className="h-4 w-4" />
              Se han descartado {estado.descartados} eventos por saturación de la cola
              desde el último arranque del servidor.
            </CardContent>
          </Card>
        )}

        <Card className="border-l-4 border-l-red-600">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ScrollText className="h-5 w-5 text-red-600" />
              Registro de actividad
            </CardTitle>
            <CardDescription>
              {total.toLocaleString("es-ES")} eventos. Se conservan 180 días. Pulsa una
              fila para ver los datos que se enviaron.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <AuditoriaFiltrosBar
              filtros={filtros}
              facetas={facetas}
              onCambiar={setFiltros}
              onLimpiar={limpiarFiltros}
            />

            <AuditoriaTabla
              eventos={eventos}
              loading={loading}
              onVerDetalle={setSeleccionado}
            />

            {totalPaginas > 1 && (
              <SmartPagination
                currentPage={filtros.pagina}
                totalPages={totalPaginas}
                onPageChange={irAPagina}
              />
            )}
          </CardContent>
        </Card>
      </main>

      <AuditoriaDetalleDialog
        evento={seleccionado}
        abierto={Boolean(seleccionado)}
        onCerrar={() => setSeleccionado(null)}
      />
    </div>
  );
}
