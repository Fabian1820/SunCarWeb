"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ArrowLeft, Users, Plus, Search, UserPlus, Crown } from "lucide-react"
import { BrigadesTable } from "@/components/brigades-table"
import { BrigadeForm } from "@/components/brigade-form"
import { WorkerForm } from "@/components/worker-form"
import type { Brigade } from "@/lib/brigade-types"

export default function BrigadasPage() {
  const [brigades, setBrigades] = useState<Brigade[]>([
    {
      id: "1",
      name: "Brigada Alpha",
      leader: { id: "1", name: "Carlos Rodríguez", role: "jefe", phone: "300-123-4567", email: "carlos@solar.com" },
      members: [
        { id: "2", name: "Ana García", role: "trabajador", phone: "300-234-5678" },
        { id: "3", name: "Luis Martínez", role: "trabajador", phone: "300-345-6789" },
      ],
      createdAt: "2024-01-10",
      isActive: true,
    },
    {
      id: "2",
      name: "Brigada Beta",
      leader: { id: "4", name: "María López", role: "jefe", phone: "300-456-7890", email: "maria@solar.com" },
      members: [
        { id: "5", name: "Juan Pérez", role: "trabajador", phone: "300-567-8901" },
        { id: "6", name: "Sofia Herrera", role: "trabajador", phone: "300-678-9012" },
      ],
      createdAt: "2024-01-12",
      isActive: true,
    },
    {
      id: "3",
      name: "Brigada Gamma",
      leader: { id: "7", name: "Pedro Sánchez", role: "jefe", phone: "300-789-0123" },
      members: [],
      createdAt: "2024-01-15",
      isActive: true,
    },
  ])

  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [isAddBrigadeDialogOpen, setIsAddBrigadeDialogOpen] = useState(false)
  const [isAddWorkerDialogOpen, setIsAddWorkerDialogOpen] = useState(false)
  const [isEditBrigadeDialogOpen, setIsEditBrigadeDialogOpen] = useState(false)
  const [editingBrigade, setEditingBrigade] = useState<Brigade | null>(null)

  const addBrigade = (brigadeData: any) => {
    const newBrigade: Brigade = {
      id: Date.now().toString(),
      name: brigadeData.name,
      leader: {
        id: Date.now().toString() + "_leader",
        name: brigadeData.leaderName,
        role: "jefe",
        phone: brigadeData.leaderPhone,
        email: brigadeData.leaderEmail,
      },
      members: brigadeData.members.map((member: any, index: number) => ({
        id: Date.now().toString() + "_member_" + index,
        name: member.name,
        role: "trabajador",
        phone: member.phone,
        email: member.email,
      })),
      createdAt: new Date().toISOString().split("T")[0],
      isActive: true,
    }
    setBrigades([...brigades, newBrigade])
    setIsAddBrigadeDialogOpen(false)
  }

  const addWorkerToBrigade = (workerData: any) => {
    const { name, phone, email, role, brigadeId } = workerData

    if (role === "jefe") {
      // Crear nueva brigada con este jefe
      const newBrigade: Brigade = {
        id: Date.now().toString(),
        name: `Brigada ${name}`,
        leader: {
          id: Date.now().toString(),
          name,
          role: "jefe",
          phone,
          email,
        },
        members: [],
        createdAt: new Date().toISOString().split("T")[0],
        isActive: true,
      }
      setBrigades([...brigades, newBrigade])
    } else {
      // Agregar trabajador a brigada existente
      setBrigades(
        brigades.map((brigade) => {
          if (brigade.id === brigadeId) {
            return {
              ...brigade,
              members: [
                ...brigade.members,
                {
                  id: Date.now().toString(),
                  name,
                  role: "trabajador",
                  phone,
                  email,
                },
              ],
            }
          }
          return brigade
        }),
      )
    }
    setIsAddWorkerDialogOpen(false)
  }

  const updateBrigade = (updatedBrigade: Brigade) => {
    setBrigades(brigades.map((b) => (b.id === updatedBrigade.id ? updatedBrigade : b)))
    setIsEditBrigadeDialogOpen(false)
    setEditingBrigade(null)
  }

  const deleteBrigade = (id: string) => {
    if (confirm("¿Estás seguro de que deseas eliminar esta brigada?")) {
      setBrigades(brigades.filter((b) => b.id !== id))
    }
  }

  const toggleBrigadeStatus = (id: string) => {
    setBrigades(brigades.map((brigade) => (brigade.id === id ? { ...brigade, isActive: !brigade.isActive } : brigade)))
  }

  const removeWorkerFromBrigade = (brigadeId: string, workerId: string) => {
    if (confirm("¿Estás seguro de que deseas remover este trabajador de la brigada?")) {
      setBrigades(
        brigades.map((brigade) => {
          if (brigade.id === brigadeId) {
            return {
              ...brigade,
              members: brigade.members.filter((member) => member.id !== workerId),
            }
          }
          return brigade
        }),
      )
    }
  }

  const openEditDialog = (brigade: Brigade) => {
    setEditingBrigade(brigade)
    setIsEditBrigadeDialogOpen(true)
  }

  const filteredBrigades = brigades.filter((brigade) => {
    const matchesSearch =
      brigade.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      brigade.leader.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter =
      filterStatus === "all" ||
      (filterStatus === "active" && brigade.isActive) ||
      (filterStatus === "inactive" && !brigade.isActive)
    return matchesSearch && matchesFilter
  })

  const totalWorkers = brigades.reduce((total, brigade) => total + brigade.members.length + 1, 0) // +1 for leader
  const activeBrigades = brigades.filter((b) => b.isActive).length

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      {/* Header */}
      <header className="fixed-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver al Dashboard
                </Button>
              </Link>
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-2 rounded-lg">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Gestión de Brigadas</h1>
                  <p className="text-sm text-gray-600">Administrar equipos de trabajo y personal</p>
                </div>
              </div>
            </div>
            <div className="flex space-x-3">
              <Dialog open={isAddWorkerDialogOpen} onOpenChange={setIsAddWorkerDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-50">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Agregar Persona
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Agregar Jefe o Trabajador</DialogTitle>
                  </DialogHeader>
                  <WorkerForm
                    onSubmit={addWorkerToBrigade}
                    onCancel={() => setIsAddWorkerDialogOpen(false)}
                    brigades={brigades}
                  />
                </DialogContent>
              </Dialog>
              <Dialog open={isAddBrigadeDialogOpen} onOpenChange={setIsAddBrigadeDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700">
                    <Plus className="mr-2 h-4 w-4" />
                    Nueva Brigada
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Crear Nueva Brigada</DialogTitle>
                  </DialogHeader>
                  <BrigadeForm onSubmit={addBrigade} onCancel={() => setIsAddBrigadeDialogOpen(false)} />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </header>

      <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        {/*<div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">*/}
        {/*  <Card className="border-0 shadow-md">*/}
        {/*    <CardContent className="p-6">*/}
        {/*      <div className="flex items-center justify-between">*/}
        {/*        <div>*/}
        {/*          <p className="text-sm font-medium text-gray-600">Total Brigadas</p>*/}
        {/*          <p className="text-3xl font-bold text-gray-900">{brigades.length}</p>*/}
        {/*        </div>*/}
        {/*        <Users className="h-8 w-8 text-blue-600" />*/}
        {/*      </div>*/}
        {/*    </CardContent>*/}
        {/*  </Card>*/}

        {/*  <Card className="border-0 shadow-md">*/}
        {/*    <CardContent className="p-6">*/}
        {/*      <div className="flex items-center justify-between">*/}
        {/*        <div>*/}
        {/*          <p className="text-sm font-medium text-gray-600">Brigadas Activas</p>*/}
        {/*          <p className="text-3xl font-bold text-gray-900">{activeBrigades}</p>*/}
        {/*        </div>*/}
        {/*        <Users className="h-8 w-8 text-green-600" />*/}
        {/*      </div>*/}
        {/*    </CardContent>*/}
        {/*  </Card>*/}

        {/*  <Card className="border-0 shadow-md">*/}
        {/*    <CardContent className="p-6">*/}
        {/*      <div className="flex items-center justify-between">*/}
        {/*        <div>*/}
        {/*          <p className="text-sm font-medium text-gray-600">Total Personal</p>*/}
        {/*          <p className="text-3xl font-bold text-gray-900">{totalWorkers}</p>*/}
        {/*        </div>*/}
        {/*        <UserPlus className="h-8 w-8 text-purple-600" />*/}
        {/*      </div>*/}
        {/*    </CardContent>*/}
        {/*  </Card>*/}

        {/*  <Card className="border-0 shadow-md">*/}
        {/*    <CardContent className="p-6">*/}
        {/*      <div className="flex items-center justify-between">*/}
        {/*        <div>*/}
        {/*          <p className="text-sm font-medium text-gray-600">Jefes de Brigada</p>*/}
        {/*          <p className="text-3xl font-bold text-gray-900">{brigades.length}</p>*/}
        {/*        </div>*/}
        {/*        <Crown className="h-8 w-8 text-orange-600" />*/}
        {/*      </div>*/}
        {/*    </CardContent>*/}
        {/*  </Card>*/}
        {/*</div>*/}

        {/* Filters and Search */}
        <Card className="border-0 shadow-md mb-6">
          <CardHeader>
            <CardTitle>Filtros y Búsqueda</CardTitle>
            <CardDescription>Encuentra brigadas y personal específico</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Label htmlFor="search" className="text-sm font-medium text-gray-700 mb-2 block">
                  Buscar Brigada o Jefe
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Buscar por nombre de brigada o jefe..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="md:w-48">
                <Label htmlFor="filter" className="text-sm font-medium text-gray-700 mb-2 block">
                  Filtrar por Estado
                </Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los estados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Activas</SelectItem>
                    <SelectItem value="inactive">Inactivas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Brigades Table */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle>Lista de Brigadas</CardTitle>
            <CardDescription>
              Mostrando {filteredBrigades.length} de {brigades.length} brigadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BrigadesTable
              brigades={filteredBrigades}
              onEdit={openEditDialog}
              onDelete={deleteBrigade}
              onToggleStatus={toggleBrigadeStatus}
              onRemoveWorker={removeWorkerFromBrigade}
            />
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isEditBrigadeDialogOpen} onOpenChange={setIsEditBrigadeDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Editar Brigada</DialogTitle>
            </DialogHeader>
            {editingBrigade && (
              <BrigadeForm
                initialData={editingBrigade}
                onSubmit={updateBrigade}
                onCancel={() => {
                  setIsEditBrigadeDialogOpen(false)
                  setEditingBrigade(null)
                }}
                isEditing
              />
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}
