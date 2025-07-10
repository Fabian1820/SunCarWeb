"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/shared/atom/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shared/molecule/card"
import { Badge } from "@/components/shared/atom/badge"
import { ArrowLeft, Sun, Users, Package, MapPin, Camera, Calendar, Save, FileText } from "lucide-react"
import { BrigadeSection } from "@/components/feats/brigade/brigade-section"
import { MaterialsSection } from "@/components/feats/materials/materials-section"
import { LocationSection } from "@/components/shared/organism/location-section"
import { PhotosSection } from "@/components/feats/reports/photos-section"
import { DateTimeSection } from "@/components/shared/molecule/datetime-section"
import { ServiceTypeSection } from "@/components/feats/reports/service-type-section"
import type { FormData } from "@/lib/types"
import { DescriptionSection } from "@/components/shared/molecule/description-section"

export default function FormularioH1114() {
  const [formData, setFormData] = useState<FormData>({
    formId: `H1114-${Date.now()}`,
    serviceType: "",
    brigade: {
      leader: "",
      members: [""],
    },
    materials: [],
    location: {
      address: "",
      coordinates: null,
      distanceFromHQ: null,
    },
    photos: [],
    dateTime: {
      date: "",
      time: "",
    },
  })

  const [currentStep, setCurrentStep] = useState(1)
  const totalSteps = 7

  const handleSave = () => {
    console.log("Guardando formulario:", formData)
    // Aquí implementarías la lógica para guardar en la base de datos
    alert("Formulario guardado exitosamente")
  }

  const needsDescription = formData.serviceType === "mantenimiento" || formData.serviceType === "averia"

  const steps = [
    { number: 1, title: "Tipo de Servicio", icon: Sun, completed: formData.serviceType !== "" },
    { number: 2, title: "Brigada", icon: Users, completed: formData.brigade.leader !== "" },
    { number: 3, title: "Materiales", icon: Package, completed: formData.materials.length > 0 },
    { number: 4, title: "Ubicación", icon: MapPin, completed: formData.location.address !== "" },
    { number: 5, title: "Fotos", icon: Camera, completed: formData.photos.length > 0 },
    { number: 6, title: "Fecha/Hora", icon: Calendar, completed: formData.dateTime.date !== "" },
    {
      number: 7,
      title: "Descripción",
      icon: FileText,
      completed: !needsDescription || (formData.description && formData.description.trim() !== ""),
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      {/* Header */}
      <header className="fixed-header bg-white shadow-sm border-b border-orange-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver
                </Button>
              </Link>
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-r from-orange-500 to-yellow-500 p-2 rounded-lg">
                  <Sun className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Reporte H-1114</h1>
                  <p className="text-sm text-gray-600">ID: {formData.formId}</p>
                </div>
              </div>
            </div>
            <Button
              onClick={handleSave}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
            >
              <Save className="mr-2 h-4 w-4" />
              Guardar Reporte
            </Button>
          </div>
        </div>
      </header>

      <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Progress Sidebar */}
          <div className="lg:col-span-1">
            <Card className="border-0 shadow-md sticky top-8">
              <CardHeader>
                <CardTitle className="text-lg">Progreso del Reporte</CardTitle>
                <CardDescription>
                  Paso {currentStep} de {totalSteps}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {steps.map((step) => (
                  <div
                    key={step.number}
                    className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      currentStep === step.number
                        ? "bg-orange-100 border-2 border-orange-300"
                        : step.completed
                          ? "bg-green-50 border border-green-200"
                          : "bg-gray-50 border border-gray-200"
                    }`}
                    onClick={() => setCurrentStep(step.number)}
                  >
                    <div
                      className={`p-2 rounded-full ${
                        currentStep === step.number
                          ? "bg-orange-500 text-white"
                          : step.completed
                            ? "bg-green-500 text-white"
                            : "bg-gray-300 text-gray-600"
                      }`}
                    >
                      <step.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{step.title}</p>
                      {step.completed && (
                        <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                          Completado
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Form Content */}
          <div className="lg:col-span-3">
            <Card className="border-0 shadow-md">
              <CardContent className="p-8">
                {currentStep === 1 && (
                  <ServiceTypeSection formData={formData} setFormData={setFormData} onNext={() => setCurrentStep(2)} />
                )}
                {currentStep === 2 && (
                  <BrigadeSection
                    formData={formData}
                    setFormData={setFormData}
                    onNext={() => setCurrentStep(3)}
                    onPrev={() => setCurrentStep(1)}
                  />
                )}
                {currentStep === 3 && (
                  <MaterialsSection
                    formData={formData}
                    setFormData={setFormData}
                    onNext={() => setCurrentStep(4)}
                    onPrev={() => setCurrentStep(2)}
                  />
                )}
                {currentStep === 4 && (
                  <LocationSection
                    formData={formData}
                    setFormData={setFormData}
                    onNext={() => setCurrentStep(5)}
                    onPrev={() => setCurrentStep(3)}
                  />
                )}
                {currentStep === 5 && (
                  <PhotosSection
                    formData={formData}
                    setFormData={setFormData}
                    onNext={() => setCurrentStep(6)}
                    onPrev={() => setCurrentStep(4)}
                  />
                )}
                {currentStep === 6 && (
                  <DateTimeSection
                    formData={formData}
                    setFormData={setFormData}
                    onNext={needsDescription ? () => setCurrentStep(7) : undefined}
                    onPrev={() => setCurrentStep(5)}
                    onSave={needsDescription ? undefined : handleSave}
                  />
                )}
                {currentStep === 7 && (
                  <DescriptionSection
                    formData={formData}
                    setFormData={setFormData}
                    onPrev={() => setCurrentStep(6)}
                    onSave={handleSave}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
