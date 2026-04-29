"use client"

import { DotLottieReact } from "@lottiefiles/dotlottie-react"

export function Loader({ label, className }: { label?: string; className?: string }) {
  // className se usa en algunos sitios como spinner inline (ej: botones), lo mantenemos pequeño
  if (className) {
    return <span className={className} />
  }

  return (
    <div className="flex flex-col items-center justify-center py-8">
      <DotLottieReact
        src="/solar-sun-animation.lottie"
        loop
        autoplay
        style={{ width: 140, height: 140 }}
      />
      {label && (
        <span className="mt-2 text-sm font-medium text-gray-600">{label}</span>
      )}
    </div>
  )
}
