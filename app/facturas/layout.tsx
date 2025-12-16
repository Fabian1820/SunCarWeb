import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Facturas | SunCar Admin',
    description: 'Gestión de facturas y vales de venta',
}

export default function FacturasLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return children
}
