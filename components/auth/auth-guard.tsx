"use client"

import { useAuth } from "@/contexts/auth-context"
import { LoginForm } from "./login-form"
import { PageLoader } from "@/components/shared/atom/page-loader"
import { useSorpresa } from "@/hooks/use-sorpresa"
import { SorpresaScreen } from "@/components/feats/sorpresa/sorpresa-screen"

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuth()
  const { esUsuarioSorpresa, completada, hidratado } = useSorpresa()

  if (isLoading) {
    return <PageLoader />
  }

  if (!isAuthenticated) {
    return <LoginForm onLogin={() => {}} />
  }

  // Mientras se hidrata localStorage, no decidimos para evitar parpadeo.
  if (esUsuarioSorpresa && !hidratado) {
    return <PageLoader />
  }

  if (esUsuarioSorpresa && !completada) {
    return <SorpresaScreen />
  }

  return <>{children}</>
}
