"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/shared/atom/badge"
import { Button } from "@/components/shared/atom/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/molecule/card"
import { Dialog, DialogContent, DialogTrigger } from "@/components/shared/molecule/dialog"
import { Users, Package, MapPin, Camera, Calendar, Clock, Navigation, ZoomIn, Sun, FileText } from "lucide-react"
import { SERVICE_TYPES } from "@/lib/types"
import { MapContainer, TileLayer, Marker } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import L from "leaflet"

const customMarker = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [32, 48],
  iconAnchor: [16, 48],
  popupAnchor: [0, -48],
  shadowSize: [41, 41],
  shadowAnchor: [13, 41],
})

interface FormViewerProps {
  formData: any
  clienteCompleto?: any
}

export function FormViewer({ formData, clienteCompleto }: FormViewerProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null)
  const [selectedPhotoLabel, setSelectedPhotoLabel] = useState<string>("")

  const getServiceTypeLabel = (value: string) => {
    return SERVICE_TYPES.find((type) => type.value === value)?.label || value
  }

  const formatDateTime = () => {
    if (formData.dateTime && formData.dateTime.date && formData.dateTime.time) {
      const date = new Date(`${formData.dateTime.date}T${formData.dateTime.time}`)
      return date.toLocaleString("es-CO", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    }
    return "No especificado"
  }

  const needsDescription = formData.serviceType === "mantenimiento" || formData.serviceType === "averia"

  // Bloquear scroll de fondo cuando el modal de foto está abierto
  useEffect(() => {
    if (selectedPhoto) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [selectedPhoto]);

  function SatMap({ lat, lng }: { lat: number, lng: number }) {
    return (
      <MapContainer center={[lat, lng]} zoom={18} style={{ height: 300, borderRadius: 12 }} scrollWheelZoom={false}>
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution='&copy; <a href="https://www.esri.com/en-us/home">Esri</a>'
        />
        <Marker position={[lat, lng]} icon={customMarker} />
      </MapContainer>
    )
  }

  return (
    <div className="space-y-6">
      {/* Encabezado genérico con franja verde */}
      <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg border border-green-200 flex justify-center items-center mb-4">
        <h3 className="text-2xl font-bold text-gray-900 text-center">Reporte H-1114</h3>
      </div>
      {/* El resto de la vista ampliada */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tipo de Servicio */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Sun className="h-5 w-5 text-orange-500" />
              <span>Tipo de Servicio</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-3">
              <Badge className="bg-orange-100 text-orange-800 text-base px-3 py-1">
                {getServiceTypeLabel(formData.tipo_reporte || formData.serviceType || "No especificado")}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Brigada */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-500" />
              <span>Brigada de Trabajo</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm font-medium text-gray-700">Jefe de Brigada:</p>
              <p className="text-gray-900 font-semibold">
                {formData.brigada?.lider?.nombre || formData.brigade?.leader?.name || formData.brigade?.leader || "No especificado"}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Integrantes:</p>
              <div className="space-y-1">
                {(formData.brigada?.integrantes || formData.brigade?.members || []).map((member: any, index: number) => (
                  <div key={index} className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    <span className="text-gray-900">
                      {member?.nombre || member?.name || member?.CI || member?.ci || "Sin nombre"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cliente y Fechas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-green-500" />
              <span>Cliente y Fechas</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm font-medium text-gray-700">Cliente:</p>
              <p className="text-gray-900">{formData.cliente?.numero || "-"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Dirección:</p>
              <p className="text-gray-900">{clienteCompleto?.direccion || "No especificado"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Fecha:</p>
              <p className="text-gray-900">{formData.fecha_hora?.fecha || formData.dateTime?.date || formData.fecha_creacion || "-"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Hora de inicio:</p>
              <p className="text-gray-900">{formData.fecha_hora?.hora_inicio || formData.dateTime?.time || "-"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Hora de fin:</p>
              <p className="text-gray-900">{formData.fecha_hora?.hora_fin || "-"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Materiales */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5 text-amber-700" />
            <span>Materiales Utilizados</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {formData.tipo_reporte === "inversion"
                    ? (<>
                        <th className="px-2 py-1">Tipo</th>
                        <th className="px-2 py-1">Nombre</th>
                        <th className="px-2 py-1">Cantidad</th>
                        <th className="px-2 py-1">Unidad</th>
                        <th className="px-2 py-1">Código</th>
                      </>)
                    : (<>
                        <th className="px-2 py-1">Nombre</th>
                        <th className="px-2 py-1">Cantidad</th>
                        <th className="px-2 py-1">Unidad</th>
                      </>)}
                </tr>
              </thead>
              <tbody>
                {(formData.materiales || formData.materials || []).map((mat: any, idx: number) => (
                  <tr key={idx}>
                    {formData.tipo_reporte === "inversion"
                      ? (<>
                          <td className="px-2 py-1">{mat.tipo}</td>
                          <td className="px-2 py-1">{mat.nombre}</td>
                          <td className="px-2 py-1">{mat.cantidad}</td>
                          <td className="px-2 py-1">{mat.unidad_medida}</td>
                          <td className="px-2 py-1">{mat.codigo_producto}</td>
                        </>)
                      : (<>
                          <td className="px-2 py-1">{mat.nombre || mat.name}</td>
                          <td className="px-2 py-1">{mat.cantidad}</td>
                          <td className="px-2 py-1">{mat.unidad_medida}</td>
                        </>)}
                  </tr>
                ))}
              </tbody>
            </table>
            {(formData.materiales?.length === 0 || !formData.materiales) && (formData.materials?.length === 0 || !formData.materials) && (
              <div className="text-gray-500 py-2">No hay materiales registrados</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Descripción (solo para mantenimiento y avería) */}
      {(formData.tipo_reporte === "mantenimiento" || formData.tipo_reporte === "averia") && formData.descripcion && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-green-500" />
              <span>Descripción del Trabajo</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <p className="text-gray-900">{formData.descripcion}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ubicación */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MapPin className="h-5 w-5 text-purple-500" />
            <span>Ubicación del Trabajo</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Dirección:</p>
            <p className="text-gray-900">{clienteCompleto?.direccion || "No especificado"}</p>
          </div>
          
          {/* Mapa OpenStreetMap */}
          {clienteCompleto?.latitud && clienteCompleto?.longitud && (
            <div className="mt-4">
              <SatMap lat={parseFloat(clienteCompleto.latitud)} lng={parseFloat(clienteCompleto.longitud)} />
              <div className="text-xs text-center mt-2">
                <a
                  href={`https://www.openstreetmap.org/?mlat=${clienteCompleto.latitud}&mlon=${clienteCompleto.longitud}#map=18/${clienteCompleto.latitud}/${clienteCompleto.longitud}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  Ver en OpenStreetMap
                </a>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Adjuntos: Fotos de inicio y fin */}
      {(formData.adjuntos?.fotos_inicio?.length > 0 || formData.adjuntos?.fotos_fin?.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Camera className="h-5 w-5 text-pink-500" />
              <span>Fotografías del Trabajo</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {formData.adjuntos?.fotos_inicio?.filter((foto: string) => !!foto).map((foto: string, idx: number) => (
                <div key={"inicio-"+idx} className="flex flex-col items-center cursor-pointer" onClick={() => { setSelectedPhoto(foto); setSelectedPhotoLabel("Inicio"); }}>
                  <img src={foto} alt={`Foto inicio ${idx + 1}`} className="rounded-lg max-h-48 object-contain transition-transform hover:scale-105" />
                  <span className="text-xs text-gray-500 mt-1">Inicio</span>
                </div>
              ))}
              {formData.adjuntos?.fotos_fin?.filter((foto: string) => !!foto).map((foto: string, idx: number) => (
                <div key={"fin-"+idx} className="flex flex-col items-center cursor-pointer" onClick={() => { setSelectedPhoto(foto); setSelectedPhotoLabel("Fin"); }}>
                  <img src={foto} alt={`Foto fin ${idx + 1}`} className="rounded-lg max-h-48 object-contain transition-transform hover:scale-105" />
                  <span className="text-xs text-gray-500 mt-1">Fin</span>
                </div>
              ))}
            </div>
            {/* Modal para foto ampliada */}
            {typeof window !== 'undefined' && selectedPhoto && (
              <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-80" style={{ top: 0, left: 0 }} onClick={() => setSelectedPhoto(null)}>
                <div className="relative flex flex-col items-center justify-center bg-white rounded-2xl shadow-2xl p-6 max-w-2xl w-full mx-4" style={{ minHeight: '300px' }} onClick={e => e.stopPropagation()}>
                  <button className="absolute top-4 right-4 bg-gray-100 hover:bg-gray-200 rounded-full p-2 shadow-lg z-10" onClick={() => setSelectedPhoto(null)}>
                    <span className="text-2xl font-bold">&times;</span>
                  </button>
                  <img src={selectedPhoto} alt="Foto ampliada" className="max-h-[70vh] max-w-full rounded-lg object-contain" />
                  <div className="text-center text-gray-700 mt-4 text-lg font-medium">{selectedPhotoLabel}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      {/* Firma del Cliente */}
      {formData.adjuntos?.firma_cliente && !!formData.adjuntos.firma_cliente && (
        <div className="rounded-xl bg-white border border-gray-200 shadow p-6 flex flex-col items-center my-4">
          <div className="text-lg font-bold text-gray-800 mb-2">Firma del Cliente</div>
          <img
            src={formData.adjuntos.firma_cliente}
            alt="Firma del cliente"
            className="rounded-lg max-h-56 max-w-full object-contain border-2 border-gray-300 bg-white shadow-xl p-4"
            style={{ background: '#fff' }}
          />
        </div>
      )}
    </div>
  )
}
