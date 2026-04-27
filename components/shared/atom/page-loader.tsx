"use client"

import { Sun } from "lucide-react"

interface PageLoaderProps {
  text?: string
  moduleName?: string
}

export function PageLoader({ text, moduleName }: PageLoaderProps) {
  const displayText = text || `Cargando ${moduleName || "módulo"}...`

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-5">
        <div className="relative h-14 w-14">
          <div className="absolute inset-0 rounded-full border-2 border-orange-100" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-orange-500 animate-spin" />
          <Sun
            className="absolute inset-0 m-auto h-6 w-6 text-orange-500"
            strokeWidth={2.25}
          />
        </div>
        <p className="text-sm font-medium text-gray-600">{displayText}</p>
      </div>
    </div>
  )
}
