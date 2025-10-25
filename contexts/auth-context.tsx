"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { API_BASE_URL } from "@/lib/api-config"
import { normalizeString, containsString } from "@/lib/utils/string-utils"

export interface User {
  ci: string
  nombre: string
  rol: string
}

interface AuthContextType {
  isAuthenticated: boolean
  token: string | null
  user: User | null
  login: (ci: string, adminPass: string) => Promise<{ success: boolean; message: string }>
  logout: () => void
  isLoading: boolean
  getAuthHeader: () => Record<string, string>
  hasPermission: (module: string) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)
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
    setUser(null)
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
    if (!user || !user.rol) return false
    
    // Normalizar el rol del usuario (quitar tildes, espacios, mayúsculas)
    const normalizedUserRole = normalizeString(user.rol)
    
    // Director General, Subdirector y Desarrollador de Software tienen acceso a todo
    if (
      containsString(user.rol, 'director general') || 
      containsString(user.rol, 'subdirector') ||
      containsString(user.rol, 'desarrollador de software')
    ) {
      return true
    }
    
    // Mapeo de roles a módulos permitidos
    // NOTA: Los roles aquí pueden tener cualquier formato (con tildes, mayúsculas, etc)
    // ya que se normalizan antes de comparar
    const rolePermissions: Record<string, string[]> = {
      'Especialista en Gestión Económica': ['recursos-humanos'],
      'Especialista en Gestión de los Recursos Humanos': ['recursos-humanos'],
      'Especialista en Gestión Comercial': ['leads', 'clientes', 'ofertas', 'materiales'],
      'Técnico en Gestión Comercial': ['leads', 'clientes', 'ofertas', 'materiales'],
      'Técnico Comercial': ['leads', 'clientes', 'ofertas', 'materiales'],
      'Especialista en Redes y Sistemas': ['blog'],
      'Jefe de Operaciones': ['brigadas', 'trabajadores', 'materiales', 'clientes', 'ordenes-trabajo'],
    }
    
    // Buscar permisos del rol comparando strings normalizados
    for (const [roleName, modules] of Object.entries(rolePermissions)) {
      const normalizedRoleName = normalizeString(roleName)
      
      // Comparar roles normalizados
      if (normalizedUserRole === normalizedRoleName || normalizedUserRole.includes(normalizedRoleName)) {
        return modules.includes(module)
      }
    }
    
    return false
  }

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      token,
      user,
      login, 
      logout, 
      isLoading, 
      getAuthHeader,
      hasPermission
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