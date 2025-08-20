"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { API_BASE_URL } from "@/lib/api-config"

interface AuthContextType {
  isAuthenticated: boolean
  token: string | null
  login: (usuario: string, contrasena: string) => Promise<{ success: boolean; message: string }>
  logout: () => void
  isLoading: boolean
  getAuthHeader: () => Record<string, string>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Verificar si hay un token guardado al cargar la página
    const savedToken = localStorage.getItem("suncar-token")
    if (savedToken) {
      setToken(savedToken)
      setIsAuthenticated(true)
    }
    setIsLoading(false)
  }, [])

  const login = async (usuario: string, contrasena: string): Promise<{ success: boolean; message: string }> => {
    try {
      console.log('Attempting login with:', { usuario, endpoint: `${API_BASE_URL}/auth/login-token` })
      
      const response = await fetch(`${API_BASE_URL}/auth/login-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ usuario, contrasena }),
      })

      const data = await response.json()
      console.log('Login response:', data)

      if (data.success && data.token) {
        setToken(data.token)
        setIsAuthenticated(true)
        localStorage.setItem("suncar-token", data.token)
        return { success: true, message: data.message }
      } else {
        console.error('Login failed:', data.message)
        return { success: false, message: data.message || 'Error de autenticación' }
      }
    } catch (error) {
      console.error('Login error:', error)
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Error de conexión con el servidor' 
      }
    }
  }

  const logout = () => {
    setIsAuthenticated(false)
    setToken(null)
    localStorage.removeItem("suncar-token")
  }

  const getAuthHeader = (): Record<string, string> => {
    if (token) {
      return { 'Authorization': `Bearer ${token}` }
    }
    return {}
  }

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      token, 
      login, 
      logout, 
      isLoading, 
      getAuthHeader 
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}