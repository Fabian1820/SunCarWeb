"use client"

import { CreditCard, Receipt, HardHat } from "lucide-react"
import { ModuleCard } from "@/components/shared/molecule/module-card"
import { ModuleHeader } from "@/components/shared/organism/module-header"
import { useAuth } from "@/contexts/auth-context"
import { SOLO_PAGOS_CLIENTES_CIS } from "@/lib/facturacion-access"

export default function FacturacionPage() {
    const { user, hasSubPermission } = useAuth()
    const soloPagosClientes =
        !!user?.ci && SOLO_PAGOS_CLIENTES_CIS.includes(user.ci)

    const submodulesAll = [
        {
            id: 'pagos-clientes',
            href: '/facturas/pagos-clientes',
            icon: CreditCard,
            title: 'Pagos Clientes',
            description: 'Gestión de pagos recibidos de clientes y seguimiento de cuentas por cobrar',
            iconClass: 'text-amber-600',
        },
        // TODO: módulo temporalmente comentado
        // {
        //     id: 'vales-facturas-instaladora',
        //     href: '/facturas/vales-facturas-instaladora',
        //     icon: FileText,
        //     title: 'Vales y Facturas de Instaladora',
        //     description: 'Control de facturación y vales de venta de la instaladora',
        //     iconClass: 'text-amber-600',
        // },
        {
            id: 'facturas-solar-carros',
            href: '/facturas/facturas-solar-carros',
            icon: Receipt,
            title: 'Facturas Solar Carros',
            description: 'Facturación Solar Carros para Instaladora y Ventas',
            iconClass: 'text-sky-600',
        },
        {
            id: 'obras-terminadas',
            href: '/facturas/obras-terminadas',
            icon: HardHat,
            title: 'Obras Terminadas',
            description: 'Resultados por oferta: pagos, trabajos diarios y comercial para pago por resultados',
            iconClass: 'text-emerald-600',
        },
    ]

    const submodules = submodulesAll.filter((m) => {
        if (soloPagosClientes) return m.id === 'pagos-clientes'
        return hasSubPermission("facturas", m.id)
    })

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#f4f9f6] via-white to-[#e8f4ee]">
            <ModuleHeader
                title="Facturación"
                subtitle="Gestión de pagos y facturas"
                badge={{ text: "Economía", className: "bg-amber-100 text-amber-800" }}
            />

            <main className="content-with-fixed-header pb-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {submodules.map((module) => (
                        <ModuleCard
                            key={module.id}
                            href={module.href}
                            icon={module.icon}
                            iconClass={module.iconClass}
                            title={module.title}
                            description={module.description}
                        />
                    ))}
                </div>
            </main>
        </div>
    )
}
