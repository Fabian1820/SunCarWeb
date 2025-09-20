"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shared/molecule/card"
import { Input } from "@/components/shared/molecule/input"
import { Button } from "@/components/shared/atom/button"
import { Label } from "@/components/shared/atom/label"
import { Alert } from "@/components/shared/atom/alert"

import { useAuth } from "@/contexts/auth-context"

interface LoginFormProps {
  onLogin: (success: boolean) => void
}

export function LoginForm({ onLogin }: LoginFormProps) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const result = await login(username, password)
      
      if (result.success) {
        onLogin(true)
      } else {
        setError(result.message)
        onLogin(false)
      }
    } catch (err) {
      console.error('Login form error:', err)
      setError('Error inesperado durante el login')
      onLogin(false)
    }

    setIsLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-suncar-primary/10 to-suncar-tertiary/10 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-suncar-primary rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          </div>
          <CardTitle className="text-2xl font-bold text-suncar-textdark">
            SunCar Admin
          </CardTitle>
          <CardDescription className="text-suncar-textdark/70">
            Ingrese sus credenciales para acceder al sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-suncar-textdark font-medium">
                Usuario
              </Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ingrese su usuario"
                required
                disabled={isLoading}
                className="border-suncar-primary/30 focus:border-suncar-primary focus:ring-suncar-primary/20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-suncar-textdark font-medium">
                Contraseña
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingrese su contraseña"
                required
                disabled={isLoading}
                className="border-suncar-primary/30 focus:border-suncar-primary focus:ring-suncar-primary/20"
              />
            </div>
            {error && (
              <Alert className="border-red-200 bg-red-50 text-red-800">
                {error}
              </Alert>
            )}
            <Button
              type="submit"
              className="w-full bg-suncar-primary hover:bg-suncar-primary/90 text-white font-medium py-2.5"
              disabled={isLoading}
            >
              {isLoading ? "Iniciando sesión..." : "Iniciar Sesión"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}