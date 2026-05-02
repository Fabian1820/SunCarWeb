"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"

const TARGET_CI = "04050966579"
const STORAGE_KEY = `personal_message_seen_${TARGET_CI}`

export function PersonalMessageOverlay() {
  const { user, isAuthenticated } = useAuth()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!isAuthenticated || !user) return
    if (user.ci !== TARGET_CI) return
    if (typeof window === "undefined") return
    if (localStorage.getItem(STORAGE_KEY) === "1") return
    setOpen(true)
  }, [isAuthenticated, user])

  if (!open || !user || user.ci !== TARGET_CI) return null

  const handleClose = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1")
    } catch {}
    setOpen(false)
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483647,
        background: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
    >
      <div
        style={{
          background: "linear-gradient(135deg, #fff7ed 0%, #fef3c7 100%)",
          borderRadius: "1.5rem",
          padding: "3rem 2rem",
          maxWidth: "640px",
          width: "100%",
          boxShadow: "0 25px 80px rgba(0,0,0,0.5)",
          textAlign: "center",
          border: "4px solid #f59e0b",
        }}
      >
        <p
          style={{
            fontSize: "clamp(2rem, 6vw, 3.5rem)",
            fontWeight: 800,
            color: "#7c2d12",
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          Oye, vamos a hablar 😢
        </p>
        <button
          onClick={handleClose}
          style={{
            marginTop: "2.5rem",
            padding: "0.875rem 2.5rem",
            fontSize: "1.125rem",
            fontWeight: 600,
            color: "white",
            background: "#ea580c",
            border: "none",
            borderRadius: "0.75rem",
            cursor: "pointer",
            boxShadow: "0 4px 14px rgba(234,88,12,0.4)",
          }}
        >
          Cerrar
        </button>
      </div>
    </div>
  )
}
