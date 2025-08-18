import Image from "next/image"
import { Loader2 } from "lucide-react"

interface InitialLoaderProps {
  text?: string
}

export function InitialLoader({ text = "Iniciando página..." }: InitialLoaderProps) {
  return (
    <div className="fixed inset-0 bg-white flex flex-col items-center justify-center z-50">
      <div className="flex flex-col items-center space-y-6">
        {/* Imagen del loader */}
        <div className="relative">
          <Image
            src="/loader.png"
            alt="Cargando..."
            width={120}
            height={120}
            className="animate-pulse"
            priority
          />
        </div>
        
        {/* Indicador de carga */}
        <div className="flex flex-col items-center space-y-3">
          <div className="relative">
            <Loader2 className="h-8 w-8 text-orange-500 animate-spin" />
          </div>
          
          {/* Texto de carga */}
          <div className="text-center">
            <p className="text-lg font-medium text-gray-700 animate-pulse">
              {text}
            </p>
            <div className="mt-2 flex space-x-1 justify-center">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
