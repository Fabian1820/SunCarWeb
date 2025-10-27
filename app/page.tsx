"use client"

import Link from "next/link"
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/shared/molecule/card"
import {Badge} from "@/components/shared/atom/badge"
import {Button} from "@/components/shared/atom/button"
import {
    Sun,
    FileText,
    Users,
    FileCheck,
    Calendar,
    Package,
    User,
    MessageCircle,
    UserPlus,
    Info,
    Phone,
    Tag,
    ClipboardList,
    Briefcase,
    BookOpen,
    Image
} from "lucide-react"
import {useState, useEffect} from "react"
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/shared/molecule/dialog"
import FormViewer from "@/components/feats/reports/FormViewerNoSSR"
import {ReporteService, ClienteService} from "@/lib/api-services"
import {Loader} from "@/components/shared/atom/loader"
import {Wrench, Zap} from "lucide-react"
import {VisuallyHidden} from "@radix-ui/react-visually-hidden"
import ContactosDashboard from "@/components/feats/contactos/contactos-dashboard"
import {Toaster} from "@/components/shared/molecule/toaster"
import { useAuth } from "@/contexts/auth-context"
import { UserMenu } from "@/components/auth/user-menu"

export default function Dashboard() {
    const { hasPermission, user } = useAuth()
    const [selectedForm, setSelectedForm] = useState<any>(null)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [isContactosDialogOpen, setIsContactosDialogOpen] = useState(false)
    const [recentReports, setRecentReports] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [clients, setClients] = useState<any[]>([])

    // Definir todos los módulos con sus configuraciones
    const allModules = [
        {
            id: 'brigadas',
            href: '/brigadas',
            icon: Users,
            title: 'Gestionar Brigadas',
            description: 'Administrar equipos de trabajo y asignaciones.',
            color: 'blue-600',
        },
        {
            id: 'trabajadores',
            href: '/trabajadores',
            icon: UserPlus,
            title: 'Gestionar Trabajadores',
            description: 'Administrar personal y asignaciones.',
            color: 'blue-600',
        },
        {
            id: 'leads',
            href: '/leads',
            icon: Phone,
            title: 'Gestionar Leads',
            description: 'Administrar leads y oportunidades de venta.',
            color: 'green-600',
        },
        {
            id: 'materiales',
            href: '/materiales',
            icon: Package,
            title: 'Gestionar Materiales',
            description: 'Administrar catálogo de materiales.',
            color: 'emerald-600',
        },
        {
            id: 'reportes',
            href: '/reportes',
            icon: FileCheck,
            title: 'Gestionar Reportes',
            description: 'Administrar historial de reportes.',
            color: 'emerald-600',
        },
        {
            id: 'clientes',
            href: '/clientes',
            icon: User,
            title: 'Gestionar Clientes',
            description: 'Administrar información y reportes de clientes.',
            color: 'orange-600',
        },
        {
            id: 'ofertas',
            href: '/ofertas',
            icon: Tag,
            title: 'Ofertas',
            description: 'Gestión de ofertas y promociones.',
            color: 'orange-600',
        },
        {
            id: 'ordenes-trabajo',
            href: '/ordenes-trabajo',
            icon: ClipboardList,
            title: 'Órdenes de Trabajo',
            description: 'Crear y gestionar órdenes para brigadas.',
            color: 'purple-600',
        },
        {
            id: 'recursos-humanos',
            href: '/recursos-humanos',
            icon: Briefcase,
            title: 'Recursos Humanos',
            description: 'Gestión de nómina y estímulos mensuales.',
            color: 'purple-600',
        },
        {
            id: 'blog',
            href: '/blog',
            icon: BookOpen,
            title: 'Blog',
            description: 'Gestión de artículos y noticias.',
            color: 'purple-600',
        },
        {
            id: 'galeriaweb',
            href: '/galeriaweb',
            icon: Image,
            title: 'Galería Web',
            description: 'Gestión de imágenes para el sitio web.',
            color: 'pink-600',
        },
    ]

    // Filtrar módulos según permisos del usuario
    const availableModules = allModules.filter(module => hasPermission(module.id))

    useEffect(() => {
        // Obtener los reportes más recientes del backend
        const fetchRecentReports = async () => {
            setLoading(true)
            try {
                const data = await ReporteService.getReportes();
                // Ordenar por fecha descendente y tomar los 3 más recientes
                const sorted = Array.isArray(data)
                    ? [...data].sort((a, b) => new Date(b.fecha_hora?.fecha || b.dateTime?.date || b.fecha_creacion || 0).getTime() - new Date(a.fecha_hora?.fecha || a.dateTime?.date || a.fecha_creacion || 0).getTime())
                    : [];
                setRecentReports(sorted.slice(0, 3));
            } catch (e) {
                setRecentReports([]);
            } finally {
                setLoading(false);
            }
        };

        // Cargar clientes siempre
        const fetchClients = async () => {
            try {
                const response = await ClienteService.getClientes();
                setClients(response.data || []);
            } catch (e) {
                setClients([]);
            }
        };

        fetchRecentReports();
        fetchClients();
    }, []);

    const openFormDialog = (form: any) => {
        setSelectedForm(form)
        setIsDialogOpen(true)
    }

    const getClienteByNumero = (numero: string | number) => clients.find(c => String(c.numero) === String(numero));

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
            {/* Header */}
            <header className="fixed-header">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        <div className="flex items-center space-x-3">
                            <div
                                className="p-0 rounded-full bg-white shadow border border-orange-200 flex items-center justify-center h-12 w-12">
                                <img src="/logo.png" alt="Logo SunCar"
                                     className="h-10 w-10 object-contain rounded-full"/>
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Administración de SUNCAR</h1>
                                <p className="text-sm text-gray-600">Sistema de Gestión de Empresarial.</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-3">
                            {/* <Link href="/atencion-cliente">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex items-center space-x-2 bg-white hover:bg-orange-50 border-orange-200 hover:border-orange-300 transition-all duration-200 relative group"
                                >
                                    <MessageCircle className="h-4 w-4 text-orange-600"/>
                                    <span className="text-gray-700 group-hover:text-orange-700">Atención al Cliente</span>
                                    <div className="absolute -top-1 -right-1">
                                        <div className="h-2 w-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full animate-pulse"></div>
                                    </div>
                                </Button>
                            </Link> */}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsContactosDialogOpen(true)}
                                className="flex items-center space-x-2 bg-white hover:bg-gray-50 border-orange-200 hover:border-orange-300"
                            >
                                <Info className="h-4 w-4 text-blue-600"/>
                                <span className="text-gray-700">Información</span>
                            </Button>
                            <UserMenu />
                        </div>
                    </div>
                </div>
            </header>

            <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Full width layout for modules */}
                <div className="flex flex-col">
                    <div className="mb-6">
                        <h2 className="text-xl font-bold text-gray-900 text-center">Módulos del Sistema</h2>
                        {user && (
                            <p className="text-center text-sm text-gray-600 mt-2">
                                Bienvenido, <span className="font-semibold">{user.nombre}</span> - {user.rol}
                            </p>
                        )}
                    </div>
                    
                    {availableModules.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-gray-600">No tienes permisos asignados para ningún módulo.</p>
                            <p className="text-sm text-gray-500 mt-2">Contacta al administrador del sistema.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {availableModules.map((module) => (
                                <Link key={module.id} href={module.href}>
                                    <Card
                                        className="border-0 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer h-full hover:-translate-y-2">
                                        <CardContent className="p-6 text-center flex flex-col justify-center h-full">
                                            <module.icon className={`h-10 w-10 text-${module.color} mx-auto mb-3`}/>
                                            <h3 className="text-lg font-semibold text-gray-900 mb-2">{module.title}</h3>
                                            <p className="text-sm text-gray-600">{module.description}</p>
                                        </CardContent>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>


            </main>

            {/* Form Viewer Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    {/* DialogTitle oculto para accesibilidad */}
                    <VisuallyHidden asChild>
                        <DialogTitle>Reporte H-1114</DialogTitle>
                    </VisuallyHidden>
                    {/* El encabezado visual se muestra solo dentro de FormViewer */}
                    {selectedForm && <FormViewer formData={selectedForm}
                                                 clienteCompleto={getClienteByNumero(selectedForm.cliente?.numero)}/>}
                </DialogContent>
            </Dialog>

            {/* Contactos Dialog */}
            <Dialog open={isContactosDialogOpen} onOpenChange={setIsContactosDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center space-x-2">
                            <Info className="h-5 w-5 text-blue-600"/>
                            <span>Información de Contacto</span>
                        </DialogTitle>
                    </DialogHeader>
                    <ContactosDashboard/>
                </DialogContent>
            </Dialog>

            <Toaster/>
        </div>
    )
}
