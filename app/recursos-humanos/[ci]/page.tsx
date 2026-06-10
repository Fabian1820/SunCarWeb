"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft, User, Briefcase, Coins, Pencil, Check, X,
  Building, Phone, HardHat, Shield, CalendarDays, FileText,
  AlertCircle, UserCog, ChevronDown, Camera, Trash2, Upload, Eye,
} from "lucide-react"
import { Button }  from "@/components/shared/atom/button"
import { Badge }   from "@/components/shared/atom/badge"
import { Toaster } from "@/components/shared/molecule/toaster"
import { useToast } from "@/hooks/use-toast"
import { useRecursosHumanos } from "@/hooks/use-recursos-humanos"
import { DepartamentoService, SedeService, IngresoMensualService, PermisosService } from "@/lib/api-services"
import type { Sede }        from "@/lib/types/feats/sedes/sede-types"
import type { Departamento } from "@/lib/types/feats/departamentos/departamento-types"
import type { TrabajadorRRHH } from "@/lib/recursos-humanos-types"

// ─── localStorage extras (datos que no vienen del backend) ───────────────────
interface Documento {
  id: string
  nombre: string        // comentario del usuario, ej: "Título 9no grado"
  archivo: string       // base64
  esImagen: boolean
  tipo: string          // mime type
  fecha: string         // ISO date
}

interface DatosExtra {
  email?: string
  fecha_ingreso?: string
  tipo_contrato?: string
  fecha_nacimiento?: string
  direccion?: string
  sexo?: string
  grado_escolar?: string
  foto_carnet?: string          // base64
  documentos?: Documento[]
  contacto_emergencia_nombre?: string
  contacto_emergencia_telefono?: string
  evaluacion_nota?: string
  evaluacion_obs?: string
}

// ─── extrae fecha de nacimiento del CI cubano (formato AAMMDD…) ───────────────
function fechaDesdeCI(ci: string): string {
  if (ci.length < 6) return ""
  const yy = parseInt(ci.substring(0, 2))
  const mm = ci.substring(2, 4)
  const dd = ci.substring(4, 6)
  if (isNaN(yy) || parseInt(mm) < 1 || parseInt(mm) > 12 || parseInt(dd) < 1 || parseInt(dd) > 31) return ""
  const currentYY = new Date().getFullYear() % 100
  const century   = yy <= currentYY + 5 ? 2000 : 1900
  return `${century + yy}-${mm}-${dd}`
}
function getExtra(ci: string): DatosExtra {
  try { const r = localStorage.getItem(`emp_extra_${ci}`); return r ? JSON.parse(r) : {} } catch { return {} }
}
function saveExtra(ci: string, d: DatosExtra) {
  localStorage.setItem(`emp_extra_${ci}`, JSON.stringify(d))
}

// ─── avatar ───────────────────────────────────────────────────────────────────
function colorAvatar(_ci: string) { return "bg-[#F2C300]" }
function iniciales(nombre: string) {
  return nombre.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase()
}
function Avatar({ emp, size = "lg" }: { emp: TrabajadorRRHH; size?: "sm" | "lg" }) {
  const cls = size === "lg" ? "h-16 w-16 text-xl" : "h-9 w-9 text-sm"
  if (emp.foto_perfil) return (
    <img src={emp.foto_perfil} alt={emp.nombre}
      className={`${cls} rounded-2xl object-cover shrink-0 border-2 border-white shadow`} />
  )
  return (
    <div className={`${cls} rounded-2xl flex items-center justify-center font-bold shrink-0 text-[#012928] ${colorAvatar(emp.CI)}`}>
      {iniciales(emp.nombre)}
    </div>
  )
}

// ─── campo de texto editable inline ──────────────────────────────────────────
function CampoEditable({ label, value, onSave, type = "text", placeholder = "—" }: {
  label: string; value: string; onSave: (v: string) => void; type?: string; placeholder?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { if (editing) ref.current?.focus() }, [editing])
  const commit = () => { onSave(draft); setEditing(false) }
  const cancel = () => { setDraft(value); setEditing(false) }
  return (
    <div className="group">
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      {editing ? (
        <div className="flex items-center gap-1">
          <input ref={ref} type={type} value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") cancel() }}
            className="flex-1 text-sm border border-[#012928]/30 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#AFEB17]" />
          <button onClick={commit} className="h-7 w-7 rounded-lg bg-[#AFEB17]/20 hover:bg-[#AFEB17]/40 flex items-center justify-center text-[#012928]">
            <Check className="h-3.5 w-3.5" />
          </button>
          <button onClick={cancel} className="h-7 w-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          <p className="text-sm text-gray-800 flex-1">{value || <span className="text-gray-400">{placeholder}</span>}</p>
          <button onClick={() => { setDraft(value); setEditing(true) }}
            className="opacity-0 group-hover:opacity-100 h-6 w-6 rounded-md hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-all shrink-0">
            <Pencil className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  )
}

// ─── select inline ────────────────────────────────────────────────────────────
function CampoSelect({ label, value, displayValue, options, onSave, placeholder = "Sin asignar" }: {
  label: string; value: string; displayValue: string; options: { id: string; nombre: string }[];
  onSave: (id: string) => void; placeholder?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const commit = () => { onSave(draft); setEditing(false) }
  const cancel = () => { setDraft(value); setEditing(false) }
  return (
    <div className="group">
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      {editing ? (
        <div className="flex items-center gap-1">
          <select value={draft} onChange={e => setDraft(e.target.value)}
            className="flex-1 text-sm border border-[#012928]/30 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#AFEB17] bg-white">
            <option value="">{placeholder}</option>
            {options.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
          </select>
          <button onClick={commit} className="h-7 w-7 rounded-lg bg-[#AFEB17]/20 hover:bg-[#AFEB17]/40 flex items-center justify-center text-[#012928]">
            <Check className="h-3.5 w-3.5" />
          </button>
          <button onClick={cancel} className="h-7 w-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          <p className="text-sm text-gray-800 flex-1">{displayValue || <span className="text-gray-400">{placeholder}</span>}</p>
          <button onClick={() => setEditing(true)}
            className="opacity-0 group-hover:opacity-100 h-6 w-6 rounded-md hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-all shrink-0">
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  )
}

// ─── toggle inline ────────────────────────────────────────────────────────────
function CampoToggle({ label, value, onToggle, activeLabel, inactiveLabel, saving }: {
  label: string; value: boolean; onToggle: () => void;
  activeLabel: string; inactiveLabel: string; saving?: boolean
}) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <button onClick={onToggle} disabled={saving}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
          value
            ? "bg-[#E6F4EF] text-[#012928] border-[#012928]/20 hover:bg-[#012928]/10"
            : "bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200"
        } ${saving ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}>
        <span className={`h-2 w-2 rounded-full ${value ? "bg-[#012928]" : "bg-gray-400"}`} />
        {value ? activeLabel : inactiveLabel}
      </button>
    </div>
  )
}

const GRADOS_ESCOLARES = [
  "Primaria",
  "Secundaria Básica (9no grado)",
  "Preuniversitario (12mo grado)",
  "Técnico Medio",
  "Universitario",
  "Especialización / Posgrado",
]

// ─── Tab Personal ─────────────────────────────────────────────────────────────
function TabPersonal({ emp, onUpdate }: {
  emp: TrabajadorRRHH
  onUpdate: (campo: string, val: any) => Promise<void>
}) {
  const [extra, setExtra]     = useState<DatosExtra>(() => getExtra(emp.CI))
  const carnetRef             = useRef<HTMLInputElement>(null)

  const saveField = (field: keyof DatosExtra, val: string) => {
    const updated = { ...extra, [field]: val }
    saveExtra(emp.CI, updated)
    setExtra(updated)
  }

  // Auto-rellenar fecha de nacimiento desde el CI si aún no está guardada
  useEffect(() => {
    if (!extra.fecha_nacimiento) {
      const fechaCI = fechaDesdeCI(emp.CI)
      if (fechaCI) saveField("fecha_nacimiento", fechaCI)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emp.CI])

  const handleCarnet = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => saveField("foto_carnet", ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Datos de contacto */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Phone className="h-4 w-4 text-[#012928]" /> Datos de contacto
          </h3>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">CI</p>
            <p className="text-sm text-gray-800 font-mono">{emp.CI}</p>
          </div>
          <CampoEditable label="Nombre completo" value={emp.nombre}
            onSave={v => onUpdate("nombre", v)} />
          <CampoEditable label="Teléfono" value={emp.telefono || ""} type="tel"
            onSave={v => onUpdate("telefono", v)} placeholder="Sin teléfono" />
          <CampoEditable label="Email" value={extra.email || ""} type="email"
            onSave={v => saveField("email", v)} placeholder="Sin email" />
        </div>

        {/* Datos personales */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <UserCog className="h-4 w-4 text-[#012928]" /> Datos personales
          </h3>

          {/* Fecha nacimiento — auto-extraída del CI */}
          <div>
            <p className="text-xs text-gray-400 mb-0.5 flex items-center gap-1">
              Fecha de nacimiento
              <span className="text-[#012928]/50 text-[10px]">(extraída del CI)</span>
            </p>
            <p className="text-sm text-gray-800 font-medium">
              {extra.fecha_nacimiento
                ? new Date(extra.fecha_nacimiento + "T12:00:00").toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })
                : <span className="text-gray-400">No disponible</span>}
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-400 mb-0.5">Sexo</p>
            <select value={extra.sexo || ""} onChange={e => saveField("sexo", e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 w-full focus:outline-none focus:ring-2 focus:ring-[#AFEB17]">
              <option value="">Sin especificar</option>
              <option value="masculino">Masculino</option>
              <option value="femenino">Femenino</option>
            </select>
          </div>

          <CampoEditable label="Dirección" value={extra.direccion || ""}
            onSave={v => saveField("direccion", v)} placeholder="Sin dirección" />

          {/* Grado escolar */}
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Grado escolar</p>
            <select value={extra.grado_escolar || ""} onChange={e => saveField("grado_escolar", e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 w-full focus:outline-none focus:ring-2 focus:ring-[#AFEB17]">
              <option value="">Sin especificar</option>
              {GRADOS_ESCOLARES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Foto del carnet */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-4">
          <Camera className="h-4 w-4 text-[#012928]" /> Foto del carnet de identidad
        </h3>
        <input ref={carnetRef} type="file" accept="image/*" className="hidden" onChange={handleCarnet} />
        {extra.foto_carnet ? (
          <div className="flex items-start gap-4">
            <img src={extra.foto_carnet} alt="Carnet"
              className="h-32 w-auto rounded-xl border border-gray-200 object-cover shadow-sm" />
            <div className="flex flex-col gap-2">
              <button onClick={() => carnetRef.current?.click()}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-1.5 text-gray-600">
                <Camera className="h-3.5 w-3.5" /> Cambiar foto
              </button>
              <button onClick={() => saveField("foto_carnet", "")}
                className="px-3 py-1.5 text-xs border border-red-100 rounded-lg hover:bg-red-50 flex items-center gap-1.5 text-red-500">
                <Trash2 className="h-3.5 w-3.5" /> Eliminar
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => carnetRef.current?.click()}
            className="w-full h-24 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-[#AFEB17] hover:text-[#012928] transition-colors">
            <Camera className="h-7 w-7" />
            <span className="text-xs">Click para subir foto del carnet</span>
          </button>
        )}
      </div>

      {/* Contacto de emergencia */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-4">
          <AlertCircle className="h-4 w-4 text-amber-500" /> Contacto de emergencia
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <CampoEditable label="Nombre" value={extra.contacto_emergencia_nombre || ""}
            onSave={v => saveField("contacto_emergencia_nombre", v)} placeholder="Sin registrar" />
          <CampoEditable label="Teléfono" value={extra.contacto_emergencia_telefono || ""} type="tel"
            onSave={v => saveField("contacto_emergencia_telefono", v)} placeholder="Sin registrar" />
        </div>
      </div>

      {/* Documentos */}
      <SeccionDocumentos ci={emp.CI} extra={extra} onSave={setExtra} saveExtraFn={saveExtra} />
    </div>
  )
}

// ─── Sección de documentos ────────────────────────────────────────────────────
function SeccionDocumentos({ ci, extra, onSave, saveExtraFn }: {
  ci: string
  extra: DatosExtra
  onSave: (d: DatosExtra) => void
  saveExtraFn: (ci: string, d: DatosExtra) => void
}) {
  const docInputRef             = useRef<HTMLInputElement>(null)
  const [nombre, setNombre]     = useState("")
  const [pendiente, setPendiente] = useState<{ archivo: string; esImagen: boolean; tipo: string } | null>(null)
  const [error, setError]       = useState("")

  const docs = extra.documentos || []

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setError("El archivo no puede superar 5 MB"); return }
    setError("")
    const reader = new FileReader()
    reader.onload = ev => {
      setPendiente({
        archivo: ev.target?.result as string,
        esImagen: file.type.startsWith("image/"),
        tipo: file.type,
      })
      setNombre(prev => prev || file.name.replace(/\.[^.]+$/, ""))
    }
    reader.readAsDataURL(file)
    e.target.value = ""
  }

  const agregar = () => {
    if (!pendiente) return
    if (!nombre.trim()) { setError("Escribe una descripción del documento"); return }
    const nuevo: Documento = {
      id: Date.now().toString(),
      nombre: nombre.trim(),
      archivo: pendiente.archivo,
      esImagen: pendiente.esImagen,
      tipo: pendiente.tipo,
      fecha: new Date().toISOString().slice(0, 10),
    }
    const updated = { ...extra, documentos: [...docs, nuevo] }
    saveExtraFn(ci, updated)
    onSave(updated)
    setPendiente(null)
    setNombre("")
    setError("")
  }

  const eliminar = (id: string) => {
    const updated = { ...extra, documentos: docs.filter(d => d.id !== id) }
    saveExtraFn(ci, updated)
    onSave(updated)
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
      <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
        <FileText className="h-4 w-4 text-[#012928]" /> Documentos
        {docs.length > 0 && (
          <span className="ml-1 text-xs bg-[#E6F4EF] text-[#012928] border border-[#012928]/20 rounded px-1.5 py-0.5">
            {docs.length}
          </span>
        )}
      </h3>

      {/* Lista de documentos */}
      {docs.length > 0 && (
        <div className="space-y-2">
          {docs.map(doc => (
            <div key={doc.id}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
              <div className="h-9 w-9 rounded-lg bg-[#E6F4EF] flex items-center justify-center shrink-0">
                {doc.esImagen
                  ? <Camera   className="h-4 w-4 text-[#012928]" />
                  : <FileText className="h-4 w-4 text-[#012928]" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{doc.nombre}</p>
                <p className="text-xs text-gray-400">{doc.fecha}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <a href={doc.archivo} target="_blank" rel="noreferrer"
                  className="h-8 w-8 rounded-lg hover:bg-[#E6F4EF] flex items-center justify-center text-[#012928] transition-colors"
                  title="Ver documento">
                  <Eye className="h-3.5 w-3.5" />
                </a>
                <button onClick={() => eliminar(doc.id)}
                  className="h-8 w-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-red-400 transition-colors"
                  title="Eliminar">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Agregar nuevo documento */}
      <input ref={docInputRef} type="file" accept="image/*,.pdf,.doc,.docx" className="hidden" onChange={handleFile} />

      {pendiente ? (
        /* Paso 2: poner nombre/descripción */
        <div className="space-y-3 border border-[#AFEB17]/40 bg-[#AFEB17]/5 rounded-xl p-4">
          <p className="text-xs font-medium text-gray-600">
            {pendiente.esImagen ? "📷 Imagen cargada" : "📄 Archivo cargado"} — añade una descripción:
          </p>
          <div className="flex gap-2">
            <input
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") agregar() }}
              placeholder="Ej: Título 9no grado, Diploma inglés, Certificado…"
              className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#AFEB17]"
            />
            <button onClick={agregar}
              className="px-3 py-1.5 bg-[#012928] text-white text-xs font-medium rounded-lg hover:bg-[#012928]/90 flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5" /> Guardar
            </button>
            <button onClick={() => { setPendiente(null); setNombre(""); setError("") }}
              className="h-8 w-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      ) : (
        /* Paso 1: seleccionar archivo */
        <button onClick={() => { setError(""); docInputRef.current?.click() }}
          className="w-full h-14 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center gap-2 text-gray-400 hover:border-[#AFEB17] hover:text-[#012928] transition-colors text-sm">
          <Upload className="h-4 w-4" />
          Subir documento (imagen, PDF, Word — máx. 5 MB)
        </button>
      )}
      {error && !pendiente && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

// ─── Tab Laboral ───────────────────────────────────────────────────────────────
// ─── Acceso y permisos del trabajador ────────────────────────────────────────
function AccesoPermisos({ ci }: { ci: string }) {
  const [modulos, setModulos] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    PermisosService.getTrabajadorModulosNombres(ci)
      .then(setModulos)
      .catch(() => setModulos([]))
      .finally(() => setLoading(false))
  }, [ci])

  const tieneAcceso = modulos.length > 0

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-400">Acceso al sistema</p>

      {loading ? (
        <p className="text-xs text-gray-400 animate-pulse">Verificando…</p>
      ) : (
        <>
          <Badge variant="outline" className={`text-xs ${tieneAcceso ? "bg-[#0A052D]/10 text-[#0A052D] border-[#0A052D]/20" : "bg-gray-100 text-gray-400 border-gray-200"}`}>
            <Shield className="h-3 w-3 mr-1" />
            {tieneAcceso ? "Con acceso" : "Sin acceso"}
          </Badge>

          {tieneAcceso && (
            <div className="pt-1 flex flex-wrap gap-1.5">
              {modulos.map(m => (
                <span key={m}
                  className="text-xs bg-[#E6F4EF] text-[#012928] border border-[#012928]/15 rounded-lg px-2 py-0.5 font-medium">
                  {m}
                </span>
              ))}
            </div>
          )}

          <p className="text-xs text-gray-400">Editar permisos → módulo de Permisos</p>
        </>
      )}
    </div>
  )
}

const TIPOS_CONTRATO = [
  "Tiempo determinado",
  "Tiempo indeterminado",
  "Por obra o servicio",
  "Período de prueba",
  "Contrato eventual",
  "Trabajador por cuenta propia",
]

function TabLaboral({ emp, sedes, departamentos, onUpdate }: {
  emp: TrabajadorRRHH
  sedes: Sede[]
  departamentos: Departamento[]
  onUpdate: (campo: string, val: any) => Promise<void>
}) {
  const [extra, setExtra]             = useState<DatosExtra>(() => getExtra(emp.CI))
  const [toggling, setToggling]       = useState<string | null>(null)
  // confirmación de cambio de estado activo
  const [confirmando, setConfirmando] = useState(false)

  const saveField = (field: keyof DatosExtra, val: string) => {
    const updated = { ...extra, [field]: val }
    saveExtra(emp.CI, updated)
    setExtra(updated)
  }

  const toggleBrigadista = async (val: string) => {
    setToggling("is_brigadista")
    await onUpdate("is_brigadista", val === "brigadista")
    setToggling(null)
  }

  const confirmarToggleActivo = async () => {
    setConfirmando(false)
    setToggling("activo")
    await onUpdate("activo", !(emp.activo !== false))
    setToggling(null)
  }

  const activo       = emp.activo !== false
  const esBrigadista = emp.is_brigadista === true

  const antiguedad = (() => {
    if (!extra.fecha_ingreso) return null
    const inicio = new Date(extra.fecha_ingreso)
    const hoy    = new Date()
    const meses  = (hoy.getFullYear() - inicio.getFullYear()) * 12 + hoy.getMonth() - inicio.getMonth()
    const anios  = Math.floor(meses / 12)
    const m      = meses % 12
    if (anios === 0) return `${m} mes${m !== 1 ? "es" : ""}`
    return `${anios} año${anios !== 1 ? "s" : ""}${m > 0 ? ` y ${m} mes${m !== 1 ? "es" : ""}` : ""}`
  })()

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Puesto */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-[#012928]" /> Puesto
          </h3>
          <CampoEditable label="Cargo" value={emp.cargo || ""}
            onSave={v => onUpdate("cargo", v)} placeholder="Sin cargo" />
          <CampoSelect
            label="Departamento"
            value={emp.departamento_id || ""}
            displayValue={emp.departamento_nombre || ""}
            options={departamentos.map(d => ({ id: String((d as any)._id || d.id || ""), nombre: d.nombre }))}
            onSave={v => onUpdate("departamento_id", v)}
          />
          <CampoSelect
            label="Sede"
            value={emp.sede_id || ""}
            displayValue={emp.sede_nombre || ""}
            options={sedes.map(s => ({ id: String((s as any)._id || s.id || ""), nombre: s.nombre }))}
            onSave={v => onUpdate("sede_id", v)}
          />

          {/* Tipo de trabajo — select */}
          <div>
            <p className="text-xs text-gray-400 mb-1">Tipo de trabajo</p>
            <select
              value={esBrigadista ? "brigadista" : "oficina"}
              onChange={e => toggleBrigadista(e.target.value)}
              disabled={toggling === "is_brigadista"}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-[#AFEB17] disabled:opacity-50">
              <option value="oficina">🏢 Oficina</option>
              <option value="brigadista">🪖 Brigadista</option>
            </select>
          </div>
        </div>

        {/* Estado y acceso */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Shield className="h-4 w-4 text-[#012928]" /> Estado y acceso
          </h3>

          {/* Estado activo — con confirmación */}
          <div>
            <p className="text-xs text-gray-400 mb-2">Estado laboral</p>
            {confirmando ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2">
                <p className="text-sm font-medium text-amber-800">
                  ¿Seguro que deseas {activo ? "desactivar" : "activar"} a este empleado?
                </p>
                <div className="flex gap-2">
                  <button onClick={confirmarToggleActivo}
                    className="px-3 py-1 bg-[#012928] text-white text-xs font-medium rounded-lg hover:bg-[#012928]/90">
                    Sí, confirmar
                  </button>
                  <button onClick={() => setConfirmando(false)}
                    className="px-3 py-1 bg-white border border-gray-200 text-gray-600 text-xs rounded-lg hover:bg-gray-50">
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirmando(true)}
                disabled={toggling === "activo"}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                  activo
                    ? "bg-[#E6F4EF] text-[#012928] border-[#012928]/20 hover:bg-[#012928]/10"
                    : "bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200"
                } disabled:opacity-50`}>
                {toggling === "activo"
                  ? <span className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  : <span className={`h-2 w-2 rounded-full ${activo ? "bg-[#012928]" : "bg-gray-400"}`} />}
                {activo ? "Activo" : "Inactivo"}
                <span className="text-xs opacity-50 ml-1">— click para cambiar</span>
              </button>
            )}
          </div>

          {/* Acceso al sistema */}
          <AccesoPermisos ci={emp.CI} />
        </div>
      </div>

      {/* Contrato */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-4">
          <FileText className="h-4 w-4 text-[#012928]" /> Contrato
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <CampoEditable label="Fecha de ingreso" value={extra.fecha_ingreso || ""} type="date"
            onSave={v => saveField("fecha_ingreso", v)} placeholder="No registrada" />
          {antiguedad && (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Antigüedad</p>
              <p className="text-sm text-gray-800 font-medium">{antiguedad}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Tipo de contrato</p>
            <select value={extra.tipo_contrato || ""} onChange={e => saveField("tipo_contrato", e.target.value)}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-[#AFEB17]">
              <option value="">Sin especificar</option>
              {TIPOS_CONTRATO.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Tab Evaluaciones ─────────────────────────────────────────────────────────
function TabEvaluaciones({ emp }: { emp: TrabajadorRRHH }) {
  const [extra, setExtra] = useState<DatosExtra>(() => getExtra(emp.CI))
  const [nota, setNota]   = useState((extra as any).evaluacion_nota || "")
  const [obs,  setObs]    = useState((extra as any).evaluacion_obs  || "")
  const [saved, setSaved] = useState(false)

  const guardar = () => {
    const updated = { ...extra, evaluacion_nota: nota, evaluacion_obs: obs } as any
    saveExtra(emp.CI, updated)
    setExtra(updated)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const NOTAS = [
    { value: "5", label: "⭐⭐⭐⭐⭐ Excelente" },
    { value: "4", label: "⭐⭐⭐⭐ Muy bueno" },
    { value: "3", label: "⭐⭐⭐ Bueno" },
    { value: "2", label: "⭐⭐ Regular" },
    { value: "1", label: "⭐ Deficiente" },
  ]

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <FileText className="h-4 w-4 text-[#012928]" /> Evaluación general
        </h3>

        <div>
          <p className="text-xs text-gray-400 mb-1">Calificación</p>
          <div className="flex flex-wrap gap-2">
            {NOTAS.map(n => (
              <button key={n.value} onClick={() => setNota(n.value)}
                className={`px-3 py-1.5 rounded-xl text-xs border transition-all ${
                  nota === n.value
                    ? "bg-[#012928] text-white border-[#012928]"
                    : "bg-white text-gray-600 border-gray-200 hover:border-[#012928]/30"
                }`}>
                {n.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs text-gray-400 mb-1">Observaciones</p>
          <textarea
            value={obs}
            onChange={e => setObs(e.target.value)}
            rows={4}
            placeholder="Notas sobre el desempeño, logros, áreas de mejora…"
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#AFEB17] resize-none"
          />
        </div>

        <div className="flex items-center gap-3">
          <button onClick={guardar}
            className="px-4 py-2 bg-[#012928] text-white text-sm font-medium rounded-xl hover:bg-[#012928]/90 transition-colors flex items-center gap-2">
            <Check className="h-4 w-4" />
            Guardar evaluación
          </button>
          {saved && <span className="text-xs text-[#012928] font-medium">✓ Guardado</span>}
        </div>
      </div>

      <div className="bg-[#E6F4EF]/60 rounded-2xl border border-[#012928]/10 p-5 text-center text-sm text-gray-500">
        <p className="font-medium text-gray-600 mb-1">Historial de evaluaciones</p>
        <p className="text-xs">Próximamente — integración con módulo de evaluaciones periódicas</p>
      </div>
    </div>
  )
}

// ─── Tab Nómina ───────────────────────────────────────────────────────────────
function TabNomina({ emp }: { emp: TrabajadorRRHH }) {
  const ahora = new Date()
  const [mes]  = useState(ahora.getMonth() + 1)
  const [anio] = useState(ahora.getFullYear())
  const [montoEstimulos, setMontoEstimulos] = useState(0)
  const [loadingIngreso, setLoadingIngreso] = useState(true)

  useEffect(() => {
    IngresoMensualService.getUltimoIngreso()
      .then((ing: any) => { if (ing?.monto) setMontoEstimulos(ing.monto) })
      .catch(() => {})
      .finally(() => setLoadingIngreso(false))
  }, [])

  const diasTrabajados = emp.dias_trabajables - (emp.dias_no_trabajados?.length || 0)
  const salarioProp    = emp.salario_fijo && emp.dias_trabajables
    ? (emp.salario_fijo / emp.dias_trabajables) * diasTrabajados : 0
  const estFijo        = montoEstimulos > 0 ? montoEstimulos * 0.30 * (emp.porcentaje_fijo_estimulo / 100) : 0
  const estVariable    = montoEstimulos > 0 && emp.porcentaje_variable_estimulo > 0
    ? montoEstimulos * 0.70 * (emp.porcentaje_variable_estimulo / 100) : 0
  const total          = salarioProp + estFijo + estVariable + emp.alimentacion
  const meses = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Resumen */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Coins className="h-4 w-4 text-[#012928]" /> Resumen {meses[mes - 1]} {anio}
          </h3>
          {[
            { label: "Salario fijo base",         value: emp.salario_fijo },
            { label: `Proporcional (${diasTrabajados}/${emp.dias_trabajables} días)`, value: salarioProp },
            { label: "Estímulo fijo",             value: estFijo },
            { label: "Estímulo variable",          value: estVariable },
            { label: "Alimentación",               value: emp.alimentacion },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between items-center text-sm">
              <span className="text-gray-500">{label}</span>
              <span className="font-medium text-gray-800">{value.toFixed(2)} CUP</span>
            </div>
          ))}
          <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
            <span className="font-semibold text-gray-800">Total a cobrar</span>
            <span className="font-bold text-[#F2C300] text-lg">{total.toFixed(2)} CUP</span>
          </div>
        </div>

        {/* Estímulos */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-[#012928]" /> Configuración de Estímulos
          </h3>
          <div className="space-y-3">
            {[
              { label: "% Estímulo fijo",     pct: emp.porcentaje_fijo_estimulo,     color: "bg-[#012928]" },
              { label: "% Estímulo variable", pct: emp.porcentaje_variable_estimulo, color: "bg-[#AFEB17]" },
            ].map(({ label, pct, color }) => (
              <div key={label}>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>{label}</span><span>{pct}%</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            ))}
            <p className="text-xs text-gray-400 pt-2 border-t border-gray-100">
              Monto total estímulos: <span className="font-medium text-gray-600">
                {loadingIngreso ? "…" : `${montoEstimulos.toFixed(2)} CUP`}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Asistencia */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-4">
          <CalendarDays className="h-4 w-4 text-[#012928]" /> Asistencia {meses[mes - 1]}
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: emp.dias_trabajables }, (_, i) => i + 1).map(dia => {
            const ausente = emp.dias_no_trabajados?.includes(dia)
            return (
              <div key={dia}
                className={`h-8 w-8 rounded-lg text-xs font-medium flex items-center justify-center ${
                  ausente
                    ? "bg-red-100 text-red-600 border border-red-200"
                    : "bg-[#E6F4EF] text-[#012928] border border-[#012928]/10"
                }`}>
                {dia}
              </div>
            )
          })}
        </div>
        <p className="text-xs text-gray-400 mt-3">
          {diasTrabajados} días trabajados · {emp.dias_no_trabajados?.length || 0} ausencias
        </p>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
type Tab = "personal" | "laboral" | "evaluaciones" | "nomina"

export default function EmpleadoDetallePage() {
  const params  = useParams()
  const router  = useRouter()
  const { toast } = useToast()
  const ci = decodeURIComponent(params.ci as string)

  const { trabajadores, loading, actualizarCampoTrabajador, refresh } = useRecursosHumanos()
  const [activeTab, setActiveTab] = useState<Tab>("personal")
  const [sedes, setSedes]               = useState<Sede[]>([])
  const [departamentos, setDepartamentos] = useState<Departamento[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    SedeService.getSedes().then(setSedes).catch(() => {})
    DepartamentoService.getDepartamentos().then(setDepartamentos).catch(() => {})
  }, [])

  const emp = useMemo(() => trabajadores.find(t => t.CI === ci), [trabajadores, ci])

  const handleUpdate = async (campo: string, val: any) => {
    setSaving(true)
    const res = await actualizarCampoTrabajador(ci, campo, val)
    setSaving(false)
    if (res.success) {
      toast({ title: "Guardado" })
      refresh()
    } else {
      toast({ title: "Error", description: res.message, variant: "destructive" })
    }
  }

  // loading / not found
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-[#E6F4EF]/30 to-white">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 rounded-full border-2 border-[#AFEB17] border-t-transparent animate-spin" />
        <p className="text-sm text-gray-500">Cargando…</p>
      </div>
    </div>
  )
  if (!emp) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-[#E6F4EF]/30 to-white">
      <div className="text-center space-y-3">
        <p className="text-gray-600">Empleado no encontrado (CI: {ci})</p>
        <Button variant="outline" onClick={() => router.push("/recursos-humanos")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Volver
        </Button>
      </div>
    </div>
  )

  const activo = emp.activo !== false

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "personal",     label: "Personal",     icon: User      },
    { id: "laboral",      label: "Laboral",       icon: Briefcase },
    { id: "evaluaciones", label: "Evaluaciones",  icon: FileText  },
    { id: "nomina",       label: "Nómina",        icon: Coins     },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-[#E6F4EF]/30 to-white">

      {/* Header fijo */}
      <header className="fixed-header bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 py-3">

            <Button variant="ghost" size="sm" onClick={() => router.push("/recursos-humanos")}
              className="shrink-0 gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Recursos Humanos</span>
            </Button>

            {/* Avatar mini + nombre */}
            <div className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 text-[#012928] ${colorAvatar(emp.CI)}`}>
              {iniciales(emp.nombre)}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-base font-bold text-gray-900 truncate">{emp.nombre}</h1>
              <p className="text-xs text-gray-400 truncate hidden sm:block">{emp.cargo || "Sin cargo"} · CI {emp.CI}</p>
            </div>

            {/* Estado + saving indicator */}
            <div className="flex items-center gap-2 shrink-0">
              {saving && <div className="h-4 w-4 rounded-full border-2 border-[#AFEB17] border-t-transparent animate-spin" />}
              <Badge variant="outline" className={`text-xs ${activo ? "bg-[#E6F4EF] text-[#012928] border-[#012928]/20" : "bg-gray-100 text-gray-500 border-gray-200"}`}>
                {activo ? "Activo" : "Inactivo"}
              </Badge>
              {emp.is_brigadista && (
                <Badge variant="outline" className="text-xs bg-[#F2C300]/20 text-[#7a5f00] border-[#F2C300]/60 hidden sm:flex">
                  <HardHat className="h-3 w-3 mr-1" /> Brigadista
                </Badge>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="content-with-fixed-header max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-1">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all flex-1 justify-center ${
                activeTab === tab.id
                  ? "bg-[#012928] text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-50"
              }`}>
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Contenido */}
        {activeTab === "personal"     && <TabPersonal emp={emp} onUpdate={handleUpdate} />}
        {activeTab === "laboral"      && <TabLaboral  emp={emp} sedes={sedes} departamentos={departamentos} onUpdate={handleUpdate} />}
        {activeTab === "evaluaciones" && <TabEvaluaciones emp={emp} />}
        {activeTab === "nomina"       && <TabNomina emp={emp} />}

      </main>

      <Toaster />
    </div>
  )
}
