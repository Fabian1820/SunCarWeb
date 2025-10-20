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
    Briefcase
    Tag,
    BookOpen
} from "lucide-react"
import {useState, useEffect} from "react"
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/shared/molecule/dialog"
import FormViewer from "@/components/feats/reports/FormViewerNoSSR"
import {ReporteService} from "@/lib/api-services"
import {Loader} from "@/components/shared/atom/loader"
import {Wrench, Zap} from "lucide-react"
import {VisuallyHidden} from "@radix-ui/react-visually-hidden"
import ContactosDashboard from "@/components/feats/contactos/contactos-dashboard"
import {Toaster} from "@/components/shared/molecule/toaster"

export default function Dashboard() {
    const [selectedForm, setSelectedForm] = useState<any>(null)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [isContactosDialogOpen, setIsContactosDialogOpen] = useState(false)
    const [recentReports, setRecentReports] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [clients, setClients] = useState<any[]>([])

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
                const allClients = await (await import("@/lib/api-services")).ClienteService.getClientes() as any[];
                setClients(allClients);
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
                            <Link href="/atencion-cliente">
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
                            </Link>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsContactosDialogOpen(true)}
                                className="flex items-center space-x-2 bg-white hover:bg-gray-50 border-orange-200 hover:border-orange-300"
                            >
                                <Info className="h-4 w-4 text-blue-600"/>
                                <span className="text-gray-700">Información</span>
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Full width layout for modules */}
                <div className="flex flex-col">
                    <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">Módulos del Sistema</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {/* Row 1 - Azul para Brigadas y Trabajadores */}
                        <Link href="/brigadas">
                            <Card
                                className="border-0 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer h-full hover:-translate-y-2">
                                <CardContent className="p-6 text-center flex flex-col justify-center h-full">
                                    <Users className="h-10 w-10 text-blue-600 mx-auto mb-3"/>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Gestionar Brigadas</h3>
                                    <p className="text-sm text-gray-600">Administrar equipos de trabajo y
                                        asignaciones.</p>
                                </CardContent>
                            </Card>
                        </Link>

                        <Link href="/trabajadores">
                            <Card
                                className="border-0 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer h-full hover:-translate-y-2">
                                <CardContent className="p-6 text-center flex flex-col justify-center h-full">
                                    <UserPlus className="h-10 w-10 text-blue-600 mx-auto mb-3"/>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Gestionar Trabajadores</h3>
                                    <p className="text-sm text-gray-600">Administrar personal y asignaciones.</p>
                                </CardContent>
                            </Card>
                        </Link>

                        <Link href="/leads">
                            <Card
                                className="border-0 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer h-full hover:-translate-y-2">
                                <CardContent className="p-6 text-center flex flex-col justify-center h-full">
                                    <Phone className="h-10 w-10 text-green-600 mx-auto mb-3"/>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Gestionar Leads</h3>
                                    <p className="text-sm text-gray-600">Administrar leads y oportunidades de venta.</p>
                                </CardContent>
                            </Card>
                        </Link>

                        {/* Row 2 - Verde para Materiales y Reportes */}
                        <Link href="/materiales">
                            <Card
                                className="border-0 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer h-full hover:-translate-y-2">
                                <CardContent className="p-6 text-center flex flex-col justify-center h-full">
                                    <Package className="h-10 w-10 text-emerald-600 mx-auto mb-3"/>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Gestionar Materiales</h3>
                                    <p className="text-sm text-gray-600">Administrar catálogo de materiales.</p>
                                </CardContent>
                            </Card>
                        </Link>

                        <Link href="/reportes">
                            <Card
                                className="border-0 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer h-full hover:-translate-y-2">
                                <CardContent className="p-6 text-center flex flex-col justify-center h-full">
                                    <FileCheck className="h-10 w-10 text-emerald-600 mx-auto mb-3"/>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Gestionar Reportes</h3>
                                    <p className="text-sm text-gray-600">Administrar historial de reportes.</p>
                                </CardContent>
                            </Card>
                        </Link>

                        <Link href="/clientes">
                            <Card
                                className="border-0 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer h-full hover:-translate-y-2">
                                <CardContent className="p-6 text-center flex flex-col justify-center h-full">
                                    <User className="h-10 w-10 text-orange-600 mx-auto mb-3"/>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Gestionar Clientes</h3>
                                    <p className="text-sm text-gray-600">Administrar información y reportes de
                                        clientes.</p>
                                </CardContent>
                            </Card>
                        </Link>
                        <Link href="/ofertas">
                            <Card className="border-0 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer h-full relative hover:-translate-y-2">
                                <CardContent className="p-6 text-center flex flex-col justify-center h-full">
                                    <Tag className="h-10 w-10 text-orange-600 mx-auto mb-3" />
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Ofertas</h3>
                                    <p className="text-sm text-gray-600">Gestión de ofertas y promociones.</p>
                                </CardContent>
                            </Card>
                        </Link>

                        <Link href="/ordenes-trabajo">
                            <Card className="border-0 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer h-full hover:-translate-y-2">
                                <CardContent className="p-6 text-center flex flex-col justify-center h-full">
                                    <ClipboardList className="h-10 w-10 text-purple-600 mx-auto mb-3" />
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Órdenes de Trabajo</h3>
                                    <p className="text-sm text-gray-600">Crear y gestionar órdenes para brigadas.</p>
                                </CardContent>
                            </Card>
                        </Link>

                        <Link href="/recursos-humanos">
                            <Card className="border-0 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer h-full hover:-translate-y-2">
                                <CardContent className="p-6 text-center flex flex-col justify-center h-full">
                                    <Briefcase className="h-10 w-10 text-purple-600 mx-auto mb-3" />
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Recursos Humanos</h3>
                                    <p className="text-sm text-gray-600">Gestión de nómina y estímulos mensuales.</p>
                                </CardContent>
                            </Card>
                        </Link>

                        <Link href="/blog">
                            <Card className="border-0 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer h-full hover:-translate-y-2">
                                <CardContent className="p-6 text-center flex flex-col justify-center h-full">
                                    <BookOpen className="h-10 w-10 text-purple-600 mx-auto mb-3" />
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Blog</h3>
                                    <p className="text-sm text-gray-600">Gestión de artículos y noticias.</p>
                                </CardContent>
                            </Card>
                        </Link>

                        {/*<Link href="/formulario-h1114">*/}
                        {/*    <Card*/}
                        {/*        className="border-0 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer h-full hover:-translate-y-2">*/}
                        {/*        <CardContent className="p-6 text-center flex flex-col justify-center h-full">*/}
                        {/*            <FileText className="h-10 w-10 text-purple-600 mx-auto mb-3"/>*/}
                        {/*            <h3 className="text-lg font-semibold text-gray-900 mb-2">Formulario H-1114</h3>*/}
                        {/*            <p className="text-sm text-gray-600">Generar formularios H-1114 específicos.</p>*/}
                        {/*        </CardContent>*/}
                        {/*    </Card>*/}
                        {/*</Link>*/}
                    </div>
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
