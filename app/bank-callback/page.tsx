"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"

export default function BankCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("")

  useEffect(() => {
    const processCallback = async () => {
      // Enable Banking redirige con ?code=... o ?error=...
      const code = searchParams.get("code")
      const error = searchParams.get("error")
      const errorDescription = searchParams.get("error_description")

      if (error) {
        setStatus("error")
        setMessage(errorDescription || `El banco rechazó el acceso: ${error}`)
        setTimeout(() => router.push("/wallet"), 4000)
        return
      }

      if (!code) {
        setStatus("error")
        setMessage("No se recibió código de autorización del banco.")
        setTimeout(() => router.push("/wallet"), 4000)
        return
      }

      try {
        // Llamar al backend para completar la autorización
        const response = await fetch("/api/bank/authorize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        })

        const data = await response.json() as { 
          success: boolean
          session_id?: string
          message?: string 
        }

        if (!data.success || !data.session_id) {
          throw new Error(data.message || "Error al autorizar sesión")
        }

        // Guardar session_id en localStorage
        localStorage.setItem("bank_session_id", data.session_id)

        setStatus("success")
        setMessage("Banco conectado correctamente. Redirigiendo...")
        setTimeout(() => router.push("/wallet"), 2000)
      } catch (err) {
        setStatus("error")
        setMessage(err instanceof Error ? err.message : "Error al procesar autorización")
        setTimeout(() => router.push("/wallet"), 4000)
      }
    }

    void processCallback()
  }, [searchParams, router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center space-y-4">
        {status === "loading" && (
          <>
            <Loader2 className="h-12 w-12 text-blue-500 animate-spin mx-auto" />
            <p className="text-slate-600 text-sm">Procesando autorización bancaria...</p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto" />
            <p className="font-semibold text-slate-800">¡Banco conectado!</p>
            <p className="text-slate-500 text-sm">{message}</p>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle className="h-12 w-12 text-rose-500 mx-auto" />
            <p className="font-semibold text-slate-800">Error de conexión</p>
            <p className="text-slate-500 text-sm">{message}</p>
          </>
        )}
      </div>
    </div>
  )
}
