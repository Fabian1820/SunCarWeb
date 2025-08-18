"use client"

import { useInitialLoading } from "@/hooks/use-initial-loading"
import { InitialLoader } from "./initial-loader"

interface InitialLoaderProviderProps {
  children: React.ReactNode
}

export function InitialLoaderProvider({ children }: InitialLoaderProviderProps) {
  const isLoading = useInitialLoading()

  return (
    <>
      {isLoading && <InitialLoader text="Iniciando página..." />}
      {children}
    </>
  )
}
