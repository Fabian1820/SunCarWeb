"use client"

import dynamic from "next/dynamic"

const DotLottieReact = dynamic(
  () => import("@lottiefiles/dotlottie-react").then((m) => m.DotLottieReact),
  { ssr: false, loading: () => <div style={{ width: 160, height: 160 }} /> },
)

interface PageLoaderProps {
  text?: string
  moduleName?: string
}

export function PageLoader({ text, moduleName }: PageLoaderProps) {
  const displayText = text || `Cargando ${moduleName || "módulo"}...`

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-3">
        <DotLottieReact
          src="/solar-sun-animation.lottie"
          loop
          autoplay
          style={{ width: 160, height: 160 }}
        />
        <p className="text-sm font-medium text-gray-600">{displayText}</p>
      </div>
    </div>
  )
}
