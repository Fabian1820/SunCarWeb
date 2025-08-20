"use client"

import { useAuth } from "@/contexts/auth-context"
import { LoginForm } from "./login-form"
import { PageLoader } from "@/components/shared/atom/page-loader"

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return <PageLoader />
  }

  if (!isAuthenticated) {
    return <LoginForm onLogin={() => {}} />
  }

  return <>{children}</>
}