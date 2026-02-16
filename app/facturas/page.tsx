"use client"

import Link from "next/link"
import { Button } from "@/components/shared/atom/button"
import { Card, CardContent } from "@/components/shared/molecule/card"
import { ArrowLeft, FileText, CreditCard } from "lucide-react"

export default function FacturacionPage() {
    const submodules = [
        {
            id: 'pagos-clientes',
            href: '/facturas/pagos-clientes',
            icon: CreditCard,
            title: 'Pagos Clientes',
            description: 'Gestión de pagos recibidos de clientes y seguimiento de cuentas por cobrar',
            color: 'green-600',
        },
        {
            id: 'vales-facturas-instaladora',
            href: '/facturas/vales-facturas-instaladora',
            icon: FileText,
            title: 'Vales y Facturas de Instaladora',
            description: 'Control de facturación y vales de venta de la instaladora',
            color: 'orange-600',
        },
    ]

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
            {/* Header */}
            <header className="fixed-header bg-white shadow-sm border-b border-orange-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 sm:py-5 gap-4">
                        <div className="flex items-center space-x-3">
                            <Link href="/">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="touch-manipulation h-9 w-9 sm:h-10 sm:w-auto sm:px-4 sm:rounded-md gap-2"
                                    aria-label="Volver al Dashboard"
                                    title="Volver al Dashboard"
                                >
                                    <ArrowLeft className="h-4 w-4 sm:mr-2" />
                                    <span className="hidden sm:inline">Volver al Dashboard</span>
                                    <span className="sr-only">Volver al Dashboard</span>
                                </Button>
                            </Link>
                            <div className="p-0 rounded-full bg-white shadow border border-orange-200 flex items-center justify-center h-8 w-8 sm:h-12 sm:w-12">
                                <img src="/logo.png" alt="Logo SunCar" className="h-6 w-6 sm:h-10 sm:w-10 object-contain rounded-full" />
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate flex items-center gap-2">
                                    Facturación
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                        Finanzas
                                    </span>
                                </h1>
                                <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">Gestión de pagos y facturas</p>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="content-with-fixed-header pb-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-4 sm:mb-6">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900">Módulos de Facturación</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                    {submodules.map((module) => (
                        <Link key={module.id} href={module.href}>
                            <Card className="border-0 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer h-full hover:-translate-y-2 bg-white/90 backdrop-blur-sm">
                                <CardContent className="p-4 sm:p-6 text-center flex flex-col justify-center h-full">
                                    <module.icon className={`h-8 w-8 sm:h-10 sm:w-10 text-${module.color} mx-auto mb-3`} />
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{module.title}</h3>
                                    <p className="text-sm text-gray-600">{module.description}</p>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            </main>
        </div>
    )
}
