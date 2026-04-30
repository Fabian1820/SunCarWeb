"use client"

import dynamic from "next/dynamic"

const DotLottieReact = dynamic(
  () => import("@lottiefiles/dotlottie-react").then((m) => m.DotLottieReact),
  { ssr: false, loading: () => <div style={{ width: 140, height: 140 }} /> },
)

export function Loader({ label, className }: { label?: string; className?: string }) {
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
