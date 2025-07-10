import { Loader2 } from "lucide-react"

export function Loader({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <span className="relative flex h-16 w-16">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-200 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-16 w-16 bg-gradient-to-br from-orange-400 to-yellow-300 items-center justify-center">
          <Loader2 className="h-10 w-10 text-white animate-spin" />
        </span>
      </span>
      {label && <span className="mt-4 text-lg font-medium text-orange-700 animate-fade-in">{label}</span>}
    </div>
  )
} 