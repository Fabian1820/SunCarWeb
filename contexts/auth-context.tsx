"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { API_BASE_URL } from "@/lib/api-config"
import { PermisosService } from "@/lib/api-services"

export interface User {
  ci: string
  nombre: string
  rol: string
  is_superAdmin?: boolean
}

interface AuthContextType {
  isAuthenticated: boolean
  token: string | null
  user: User | null
  modulosPermitidos: string[]
  login: (ci: string, adminPass: string) => Promise<{ success: boolean; message: string }>
  logout: () => void
  isLoading: boolean
  getAuthHeader: () => Record<string, string>
  hasPermission: (module: string) => boolean
  loadModulosPermitidos: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [modulosPermitidos, setModulosPermitidos] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Verificar si hay un token y usuario guardados al cargar la página
    const savedToken = localStorage.getItem("auth_token")
    const savedUser = localStorage.getItem("user_data")

    if (savedToken && savedUser) {
      try {
        const userData = JSON.parse(savedUser)
        setToken(savedToken)
        setUser(userData)
        setIsAuthenticated(true)
      } catch (error) {
        console.error("Error parsing saved user data:", error)
        localStorage.removeItem("auth_token")
        localStorage.removeItem("user_data")
      }
    }
    setIsLoading(false)
  }, [])

  const login = async (ci: string, adminPass: string): Promise<{ success: boolean; message: string }> => {
    try {
      console.log('Attempting login with:', { ci, endpoint: `${API_BASE_URL}/auth/login-admin` })
      
      const response = await fetch(`${API_BASE_URL}/auth/login-admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ci, adminPass }),
      })

      const data = await response.json()
      console.log('Login response:', data)

      if (data.success && data.token && data.user) {
        setToken(data.token)
        setUser(data.user)
        setIsAuthenticated(true)
        localStorage.setItem("auth_token", data.token)
        localStorage.setItem("user_data", JSON.stringify(data.user))

        // Guardar últimas credenciales para auto-completar
        localStorage.setItem("last_credentials", JSON.stringify({ ci, adminPass }))

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

  const loadModulosPermitidos = async () => {
    if (!user || !user.ci) {
      setModulosPermitidos([])
      return
    }

    try {
      console.log('Cargando módulos permitidos para CI:', user.ci)
      const modulos = await PermisosService.getTrabajadorModulosNombres(user.ci)
      setModulosPermitidos(modulos)
      console.log('Módulos permitidos cargados:', modulos)
    } catch (error) {
      console.error('Error loading módulos permitidos:', error)
      // Si falla la carga de módulos, iniciar con array vacío
      setModulosPermitidos([])
    }
  }

  const logout = () => {
    setIsAuthenticated(false)
    setToken(null)
    setUser(null)
    setModulosPermitidos([])
    localStorage.removeItem("auth_token")
    localStorage.removeItem("user_data")
  }

  const getAuthHeader = (): Record<string, string> => {
    if (token) {
      return { 'Authorization': `Bearer ${token}` }
    }
    return {}
  }

  const hasPermission = (module: string): boolean => {
    if (!user) return false

    // Los superAdmin tienen acceso a todos los módulos excepto el módulo de permisos
    // (que se maneja aparte en el dashboard)
    if (user.is_superAdmin && module !== 'permisos') {
      return true
    }

    // Verificar si el módulo está en la lista de módulos permitidos
    // Los nombres deben coincidir exactamente con los almacenados en la base de datos
    return modulosPermitidos.includes(module)
  }

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      token,
      user,
      modulosPermitidos,
      login,
      logout,
      isLoading,
      getAuthHeader,
      hasPermission,
      loadModulosPermitidos
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