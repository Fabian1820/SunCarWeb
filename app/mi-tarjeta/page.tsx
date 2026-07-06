"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import {
  IdCard,
  Camera,
  Loader2,
  Save,
  ExternalLink,
  Copy,
  Check,
  Eye,
  Phone,
  Mail,
  MessageCircle,
  MapPin,
  Linkedin,
  Instagram,
  Facebook,
  Globe,
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { API_BASE_URL } from "@/lib/api-config"
import { TarjetaService, type MiTarjeta } from "@/lib/services/feats/tarjeta/tarjeta-service"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/atom/input"
import { Label } from "@/components/shared/atom/label"
import { Textarea } from "@/components/shared/molecule/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shared/molecule/card"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/shared/molecule/toaster"

// Base pública donde vive la tarjeta (web pública). Configurable por env.
const PUBLIC_WEB_URL = (process.env.NEXT_PUBLIC_WEB_URL || "https://suncarsrl.com").replace(/\/+$/, "")

const BIO_MAX = 280

const iniciales = (nombre: string) =>
  (nombre || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("")

interface FormState {
  titulo: string
  bio: string
  telefono: string
  whatsapp: string
  email: string
  sede: string
  linkedin: string
  instagram: string
  facebook: string
  web: string
  activa: boolean
}

const emptyForm: FormState = {
  titulo: "",
  bio: "",
  telefono: "",
  whatsapp: "",
  email: "",
  sede: "",
  linkedin: "",
  instagram: "",
  facebook: "",
  web: "",
  activa: true,
}

function toForm(t: MiTarjeta): FormState {
  return {
    titulo: t.titulo || "",
    bio: t.bio || "",
    telefono: t.telefono || "",
    whatsapp: t.whatsapp || "",
    email: t.email || "",
    sede: t.sede || "",
    linkedin: t.redes?.linkedin || "",
    instagram: t.redes?.instagram || "",
    facebook: t.redes?.facebook || "",
    web: t.redes?.web || "",
    activa: t.activa ?? true,
  }
}

export default function MiTarjetaPage() {
  const { user, isLoading: authLoading } = useAuth()
  const { toast } = useToast()

  const [tarjeta, setTarjeta] = useState<MiTarjeta | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [copied, setCopied] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const publicUrl = tarjeta ? `${PUBLIC_WEB_URL}/tarjeta/${tarjeta.slug}` : ""
  const qrUrl = tarjeta ? `${API_BASE_URL}/tarjetas/${tarjeta.slug}/qr` : ""

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      setLoading(false)
      return
    }
    loadTarjeta()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user])

  const loadTarjeta = async () => {
    try {
      setLoading(true)
      const t = await TarjetaService.getMiTarjeta()
      if (t) {
        setTarjeta(t)
        setForm(toForm(t))
      }
    } catch (err) {
      console.error("Error cargando mi tarjeta:", err)
      toast({ title: "Error", description: "No se pudo cargar tu tarjeta.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const handleSave = async () => {
    try {
      setSaving(true)
      const actualizada = await TarjetaService.actualizarMiTarjeta({
        titulo: form.titulo.trim(),
        bio: form.bio.trim(),
        telefono: form.telefono.trim(),
        whatsapp: form.whatsapp.trim(),
        email: form.email.trim(),
        sede: form.sede.trim(),
        activa: form.activa,
        redes: {
          linkedin: form.linkedin.trim(),
          instagram: form.instagram.trim(),
          facebook: form.facebook.trim(),
          web: form.web.trim(),
        },
      })
      if (actualizada) {
        setTarjeta(actualizada)
        setForm(toForm(actualizada))
        toast({ title: "Tarjeta guardada", description: "Tus cambios se publicaron correctamente." })
      } else {
        toast({ title: "No se guardó", description: "Intenta de nuevo.", variant: "destructive" })
      }
    } catch (err) {
      console.error("Error guardando tarjeta:", err)
      toast({ title: "Error", description: "No se pudo guardar la tarjeta.", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const handleFotoClick = () => fileInputRef.current?.click()

  const handleFotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast({ title: "Archivo inválido", description: "Selecciona una imagen.", variant: "destructive" })
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Imagen muy grande", description: "Máximo 5 MB.", variant: "destructive" })
      return
    }
    try {
      setUploading(true)
      const actualizada = await TarjetaService.subirFoto(file)
      if (actualizada) {
        setTarjeta(actualizada)
        toast({ title: "Foto actualizada" })
      }
    } catch (err) {
      console.error("Error subiendo foto:", err)
      toast({ title: "Error", description: "No se pudo subir la foto.", variant: "destructive" })
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleCopy = async () => {
    if (!publicUrl) return
    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* noop */
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md py-24 text-center">
        <h1 className="text-xl font-semibold text-gray-900">Inicia sesión</h1>
        <p className="mt-2 text-gray-500">Necesitas iniciar sesión para editar tu tarjeta de presentación.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Encabezado */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white">
            <IdCard className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Mi tarjeta de presentación</h1>
            <p className="text-sm text-gray-500">Tu tarjeta digital con la marca SunCar. Se comparte por enlace o QR.</p>
          </div>
        </div>
        {tarjeta && (
          <Button variant="outline" asChild>
            <Link href={publicUrl} target="_blank" rel="noopener noreferrer">
              <Eye className="mr-2 h-4 w-4" />
              Ver tarjeta pública
            </Link>
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Columna: formulario */}
        <div className="space-y-6 lg:col-span-2">
          {/* Foto + identidad */}
          <Card>
            <CardHeader>
              <CardTitle>Identidad</CardTitle>
              <CardDescription>Tu nombre viene de tu ficha de trabajador. Ajusta tu foto y título.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-5">
                <div className="relative">
                  {tarjeta?.foto_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={tarjeta.foto_url}
                      alt={tarjeta.nombre}
                      className="h-24 w-24 rounded-full border-4 border-white object-cover shadow"
                    />
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary text-2xl font-bold text-white shadow">
                      {iniciales(tarjeta?.nombre || user.nombre)}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleFotoClick}
                    disabled={uploading}
                    className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-solar-radiance text-primary shadow ring-2 ring-white transition hover:brightness-105 disabled:opacity-60"
                    aria-label="Cambiar foto"
                  >
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFotoChange}
                  />
                </div>
                <div>
                  <p className="text-lg font-semibold text-gray-900">{tarjeta?.nombre || user.nombre}</p>
                  <p className="text-sm text-gray-500">{tarjeta?.empresa || "SunCar"}</p>
                </div>
              </div>

              <div className="mt-6 space-y-2">
                <Label htmlFor="titulo">Título de presentación</Label>
                <Input
                  id="titulo"
                  value={form.titulo}
                  onChange={(e) => set("titulo", e.target.value)}
                  placeholder="Ej. Comercial B2B / B2C, CEO & Fundador…"
                  maxLength={80}
                />
                <p className="text-xs text-gray-400">
                  Es lo que se muestra en la tarjeta. Es independiente de tu cargo interno del sistema, así que puedes
                  ponerlo tal como quieres presentarte.
                </p>
              </div>

              <div className="mt-4 space-y-2">
                <Label htmlFor="bio">Descripción breve</Label>
                <Textarea
                  id="bio"
                  value={form.bio}
                  onChange={(e) => set("bio", e.target.value.slice(0, BIO_MAX))}
                  placeholder="Una línea sobre lo que haces y cómo puedes ayudar."
                  rows={3}
                />
                <p className="text-right text-xs text-gray-400">{form.bio.length}/{BIO_MAX}</p>
              </div>
            </CardContent>
          </Card>

          {/* Contacto */}
          <Card>
            <CardHeader>
              <CardTitle>Contacto</CardTitle>
              <CardDescription>Datos que verá quien abra tu tarjeta.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="telefono" className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> Teléfono</Label>
                <Input id="telefono" value={form.telefono} onChange={(e) => set("telefono", e.target.value)} placeholder="+53 5xxxxxxx" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp" className="flex items-center gap-2"><MessageCircle className="h-3.5 w-3.5" /> WhatsApp</Label>
                <Input id="whatsapp" value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} placeholder="+53 5xxxxxxx" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> Email</Label>
                <Input id="email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="tu@suncarsrl.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sede" className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /> Ubicación / Sede</Label>
                <Input id="sede" value={form.sede} onChange={(e) => set("sede", e.target.value)} placeholder="La Habana" />
              </div>
            </CardContent>
          </Card>

          {/* Redes */}
          <Card>
            <CardHeader>
              <CardTitle>Redes sociales</CardTitle>
              <CardDescription>Opcional. Deja en blanco las que no uses.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="linkedin" className="flex items-center gap-2"><Linkedin className="h-3.5 w-3.5" /> LinkedIn</Label>
                <Input id="linkedin" value={form.linkedin} onChange={(e) => set("linkedin", e.target.value)} placeholder="https://linkedin.com/in/…" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instagram" className="flex items-center gap-2"><Instagram className="h-3.5 w-3.5" /> Instagram</Label>
                <Input id="instagram" value={form.instagram} onChange={(e) => set("instagram", e.target.value)} placeholder="https://instagram.com/…" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="facebook" className="flex items-center gap-2"><Facebook className="h-3.5 w-3.5" /> Facebook</Label>
                <Input id="facebook" value={form.facebook} onChange={(e) => set("facebook", e.target.value)} placeholder="https://facebook.com/…" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="web" className="flex items-center gap-2"><Globe className="h-3.5 w-3.5" /> Sitio web</Label>
                <Input id="web" value={form.web} onChange={(e) => set("web", e.target.value)} placeholder="https://…" />
              </div>
            </CardContent>
          </Card>

          {/* Visibilidad + guardar */}
          <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex items-center gap-3 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.activa}
                onChange={(e) => set("activa", e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              Tarjeta pública {form.activa ? "activa" : "oculta"}
            </label>
            <Button onClick={handleSave} disabled={saving} className="sm:w-auto">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Guardar cambios
            </Button>
          </div>
        </div>

        {/* Columna: enlace + QR */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Compartir</CardTitle>
              <CardDescription>Tu enlace y código QR listos para usar.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-center rounded-2xl border border-gray-100 bg-gray-50 p-4">
                {tarjeta && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qrUrl} alt="QR de mi tarjeta" className="h-44 w-44" />
                )}
              </div>
              <div className="flex items-center gap-2">
                <Input readOnly value={publicUrl} className="text-xs" />
                <Button variant="outline" size="icon" onClick={handleCopy} aria-label="Copiar enlace">
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <Button variant="outline" className="w-full" asChild>
                <Link href={publicUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Abrir tarjeta
                </Link>
              </Button>
              {tarjeta && (
                <div className="grid grid-cols-2 gap-3 pt-2 text-center">
                  <div className="rounded-lg bg-gray-50 py-3">
                    <p className="text-lg font-bold text-primary">{tarjeta.vistas}</p>
                    <p className="text-xs text-gray-500">Visitas</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 py-3">
                    <p className="text-lg font-bold text-primary">{tarjeta.guardados_contacto}</p>
                    <p className="text-xs text-gray-500">Contactos guardados</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Toaster />
    </div>
  )
}
