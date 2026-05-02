"use client"

import { useEffect, useState, useCallback } from "react"
import { AlertCircle, X, ChevronDown, ChevronUp } from "lucide-react"

interface ValidationError {
  field: string
  error: string
}

interface ErrorPayload {
  errors: ValidationError[]
  message: string
}

function parseField(raw: string): string {
  // "body -> nombre_campo" → "nombre_campo", limpia guiones bajos
  return raw
    .replace(/^body\s*->\s*/i, "")
    .replace(/_/g, " ")
}

function humanizeError(error: string): string {
  const map: Record<string, string> = {
    "field required": "Este campo es requerido",
    "value is not a valid integer": "Debe ser un número entero",
    "value is not a valid number": "Debe ser un número válido",
    "value is not a valid string": "Debe ser texto",
    "value is not a valid boolean": "Debe ser verdadero o falso",
    "value is not a valid email address": "Correo electrónico inválido",
    "ensure this value has at least 1 character": "No puede estar vacío",
    "ensure this value is greater than 0": "Debe ser mayor que 0",
    "none is not an allowed value": "Este campo no puede estar vacío",
    "string does not match regex": "Formato inválido",
  }
  const lower = error.toLowerCase()
  return map[lower] ?? error
}

export function ValidationErrorOverlay() {
  const [payload, setPayload] = useState<ErrorPayload | null>(null)
  const [expanded, setExpanded] = useState(true)
  const [visible, setVisible] = useState(false)

  const dismiss = useCallback(() => {
    setVisible(false)
    setTimeout(() => setPayload(null), 300)
  }, [])

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<ErrorPayload>).detail
      setPayload(detail)
      setExpanded(true)
      setVisible(true)
    }
    window.addEventListener("validation-error-422", handler)
    return () => window.removeEventListener("validation-error-422", handler)
  }, [])

  if (!payload) return null

  const { errors, message } = payload
  const hasFields = errors.length > 0

  return (
    <div
      className={`fixed bottom-6 right-6 z-[9999] w-full max-w-md transition-all duration-300 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      }`}
    >
      <div className="rounded-xl border border-red-300 bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 bg-red-600 px-4 py-3 text-white">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm leading-tight">Error en los valores enviados</p>
            {!hasFields && (
              <p className="text-red-100 text-xs mt-0.5 truncate">{message}</p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {hasFields && (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="rounded p-1 hover:bg-red-500 transition-colors"
                aria-label="Expandir/colapsar"
              >
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            )}
            <button
              onClick={dismiss}
              className="rounded p-1 hover:bg-red-500 transition-colors"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        {hasFields && expanded && (
          <div className="px-4 py-3 bg-red-50 space-y-2">
            <p className="text-xs font-medium text-red-700 uppercase tracking-wide mb-2">
              Corrige los siguientes campos:
            </p>
            {errors.map((e, i) => {
              const field = parseField(e.field)
              const humanError = humanizeError(e.error)
              return (
                <div
                  key={i}
                  className="flex items-start gap-2 rounded-lg bg-white border border-red-200 px-3 py-2"
                >
                  <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-red-500" />
                  <div className="min-w-0 text-sm">
                    <span className="font-semibold text-gray-800 capitalize">{field}</span>
                    <span className="text-gray-500 mx-1">—</span>
                    <span className="text-red-700">{humanError}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Footer hint */}
        {hasFields && expanded && (
          <div className="px-4 py-2 bg-red-50 border-t border-red-100">
            <p className="text-xs text-red-500">
              Revisa los campos marcados e intenta de nuevo.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
