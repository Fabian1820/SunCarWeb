"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { NominaSidebar } from "./NominaSidebar";
import { PeriodoSelector } from "../periodos/PeriodoSelector";
// import { ResumenHeader } from "./ResumenHeader"  // Opcional;
import type { PeriodoNomina, NominaQuincenal } from "@/lib/types/feats/nomina-quincenal";

interface NominaLayoutProps {
  children: React.ReactNode;
  periodoActual: PeriodoNomina | null;
  nominaActual: NominaQuincenal | null;
  periodosDisponibles: PeriodoNomina[];
  onPeriodoChange: (periodo: PeriodoNomina) => void;
  onCrearPeriodo: () => void;
  isLoading?: boolean;
}

export function NominaLayout({
  children,
  periodoActual,
  nominaActual,
  periodosDisponibles,
  onPeriodoChange,
  onCrearPeriodo,
  isLoading = false,
}: NominaLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      {/* Header fijo */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center h-16 px-4 lg:px-6">
          {/* Logo/Título */}
          <div className="flex items-center gap-3 mr-6">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">N</span>
            </div>
            <div className="hidden md:block">
              <h1 className="text-lg font-bold text-gray-900">Nómina Quincenal</h1>
              <p className="text-xs text-gray-500">Sistema de RRHH</p>
            </div>
          </div>

          {/* Selector de período */}
          <div className="flex-1 max-w-md">
            <PeriodoSelector
              periodoActual={periodoActual}
              periodosDisponibles={periodosDisponibles}
              onChange={onPeriodoChange}
              onCrearPeriodo={onCrearPeriodo}
              disabled={isLoading}
            />
          </div>

          {/* Resumen rápido */}
          {nominaActual && (
            <div className="hidden lg:flex items-center gap-4 ml-6 px-4 py-2 bg-gray-50 rounded-lg">
              <div className="text-right">
                <p className="text-xs text-gray-500">Total a pagar</p>
                <p className="text-sm font-bold text-gray-900">
                  ${nominaActual.totales.totalNeto.toLocaleString()}
                </p>
              </div>
              <div className="w-px h-8 bg-gray-300" />
              <div className="text-right">
                <p className="text-xs text-gray-500">Estado</p>
                <EstadoBadge estado={nominaActual.estado} />
              </div>
            </div>
          )}

          {/* Espaciador */}
          <div className="flex-1" />

          {/* Toggle sidebar en móvil */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </header>

      <div className="flex pt-16">
        {/* Sidebar */}
        <NominaSidebar
          collapsed={sidebarCollapsed}
          onCollapse={setSidebarCollapsed}
          nominaEstado={nominaActual?.estado || null}
        />

        {/* Contenido principal */}
        <main
          className={cn(
            "flex-1 transition-all duration-300",
            sidebarCollapsed ? "lg:ml-20" : "lg:ml-64"
          )}
        >
          <div className="p-4 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

function EstadoBadge({ estado }: { estado: string }) {
  const styles = {
    borrador: "bg-gray-100 text-gray-700",
    calculada: "bg-blue-100 text-blue-700",
    revisada: "bg-yellow-100 text-yellow-700",
    aprobada: "bg-green-100 text-green-700",
    pagada: "bg-purple-100 text-purple-700",
  };

  const labels = {
    borrador: "Borrador",
    calculada: "Calculada",
    revisada: "En Revisión",
    aprobada: "Aprobada",
    pagada: "Pagada",
  };

  return (
    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", styles[estado as keyof typeof styles])}>
      {labels[estado as keyof typeof labels] || estado}
    </span>
  );
}
