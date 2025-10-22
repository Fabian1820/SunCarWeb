# Sistema de Permisos y Autenticación - SunCar Frontend

## 📋 Descripción General

Sistema de autenticación y permisos basado en roles para el panel administrativo de SunCar. Integra con el backend JWT y controla el acceso a módulos según el cargo del usuario.

## 🔐 Arquitectura del Sistema

### 1. Autenticación con Backend

**Endpoint:** `POST /api/auth/login-admin`

**Credenciales:**
- `ci`: Cédula de identidad del trabajador
- `adminPass`: Contraseña administrativa (hasheada con bcrypt en backend)

**Respuesta exitosa:**
```json
{
  "success": true,
  "message": "Autenticación exitosa",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "ci": "12345678",
    "nombre": "Juan Pérez",
    "rol": "Director General"
  }
}
```

### 2. Almacenamiento de Sesión

El sistema almacena en `localStorage`:
- `auth_token`: Token JWT del backend
- `user_data`: Información del usuario (CI, nombre, rol/cargo)

### 3. Context de Autenticación

**Archivo:** `contexts/auth-context.tsx`

**Funcionalidades:**
- `login(ci, adminPass)`: Autenticación con backend
- `logout()`: Cierre de sesión y limpieza de datos
- `hasPermission(module)`: Verificación de permisos por módulo
- `getAuthHeader()`: Header de autorización para API calls
- `user`: Datos del usuario autenticado
- `isAuthenticated`: Estado de autenticación

## 🎯 Matriz de Permisos por Cargo

### Acceso Total
- **Director General** → Todos los módulos
- **Subdirector(a)** → Todos los módulos

### Recursos Humanos
- **Especialista en Gestión Económica** → `recursos-humanos`
- **Especialista en Gestión de los Recursos Humanos** → `recursos-humanos`

### Área Comercial
- **Especialista en Gestión Comercial** → `leads`, `clientes`, `ofertas`, `materiales`
- **Técnico en Gestión Comercial** → `leads`, `clientes`, `ofertas`, `materiales`
- **Técnico Comercial** → `leads`, `clientes`, `ofertas`, `materiales`

### Sistemas
- **Especialista en Redes y Sistemas** → `blog`

### Operaciones
- **Jefe de Operaciones** → `brigadas`, `trabajadores`, `materiales`, `clientes`, `ordenes-trabajo`

## 🧩 Componentes del Sistema

### 1. AuthProvider (`contexts/auth-context.tsx`)
Context global que maneja el estado de autenticación y permisos.

**Uso:**
```tsx
import { useAuth } from "@/contexts/auth-context"

function MyComponent() {
  const { user, hasPermission, logout } = useAuth()
  
  if (hasPermission('brigadas')) {
    // Mostrar contenido para usuarios con acceso a brigadas
  }
}
```

### 2. AuthGuard (`components/auth/auth-guard.tsx`)
Componente que protege toda la aplicación, muestra login si no está autenticado.

**Implementación:**
```tsx
// En app/layout.tsx
<AuthProvider>
  <AuthGuard>
    {children}
  </AuthGuard>
</AuthProvider>
```

### 3. LoginForm (`components/auth/login-form.tsx`)
Formulario de login con validación.

**Campos:**
- Cédula de Identidad (CI)
- Contraseña Administrativa (adminPass)

### 4. UserMenu (`components/auth/user-menu.tsx`)
Dropdown menu que muestra información del usuario y opción de logout.

**Muestra:**
- Nombre del usuario
- CI
- Cargo
- Botón de cerrar sesión

### 5. RouteGuard (`components/auth/route-guard.tsx`)
Componente para proteger rutas específicas según permisos.

**Uso en páginas:**
```tsx
import { RouteGuard } from "@/components/auth/route-guard"

export default function BrigadasPage() {
  return (
    <RouteGuard requiredModule="brigadas">
      {/* Contenido de la página */}
    </RouteGuard>
  )
}
```

## 📱 Implementación en el Dashboard

### Filtrado Dinámico de Módulos

El dashboard (`app/page.tsx`) filtra automáticamente los módulos visibles según los permisos del usuario:

```tsx
const allModules = [
  { id: 'brigadas', href: '/brigadas', ... },
  { id: 'trabajadores', href: '/trabajadores', ... },
  // ... más módulos
]

const availableModules = allModules.filter(module => hasPermission(module.id))
```

Si el usuario no tiene permisos para ningún módulo, se muestra un mensaje informativo.

## 🔧 Integración con API Services

El token JWT se incluye automáticamente en todas las llamadas API:

**Archivo:** `lib/api-config.ts`

```typescript
export async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('auth_token')
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
  }
  
  // ... resto de la implementación
}
```

## 🛠️ Cómo Proteger una Nueva Página

1. **Importar RouteGuard:**
```tsx
import { RouteGuard } from "@/components/auth/route-guard"
```

2. **Envolver el contenido:**
```tsx
export default function MiNuevaPagina() {
  return (
    <RouteGuard requiredModule="nombre-del-modulo">
      {/* Contenido de la página */}
    </RouteGuard>
  )
}
```

3. **Agregar el módulo al dashboard:**
```tsx
// En app/page.tsx
const allModules = [
  // ... módulos existentes
  {
    id: 'nombre-del-modulo',
    href: '/nombre-del-modulo',
    icon: IconoComponent,
    title: 'Título del Módulo',
    description: 'Descripción',
    color: 'blue-600',
  },
]
```

4. **Actualizar permisos en auth-context.tsx:**
```tsx
const rolePermissions: Record<string, string[]> = {
  'nombre-del-cargo': ['nombre-del-modulo', ...otrosModulos],
  // ... otros cargos
}
```

## 🚀 Flujo de Autenticación Completo

1. **Usuario accede a la aplicación**
   - AuthGuard verifica si hay token guardado
   - Si no hay token → Muestra LoginForm
   - Si hay token → Carga datos del usuario y muestra dashboard

2. **Usuario hace login**
   - Envía CI y adminPass a `/api/auth/login-admin`
   - Backend valida credenciales y devuelve JWT + datos usuario
   - Frontend guarda token y datos en localStorage
   - Redirige al dashboard

3. **Usuario navega a un módulo**
   - RouteGuard verifica permisos con `hasPermission()`
   - Si tiene permiso → Muestra el módulo
   - Si no tiene permiso → Muestra mensaje de acceso denegado

4. **Usuario hace logout**
   - Se limpia localStorage
   - Se resetea el context de autenticación
   - AuthGuard muestra LoginForm nuevamente

## 🔍 Debugging y Troubleshooting

### Verificar permisos en consola:
```javascript
// En DevTools Console
localStorage.getItem('user_data')
localStorage.getItem('auth_token')
```

### Logs de autenticación:
El sistema incluye logs en consola para debugging:
- Login attempt con endpoint
- Login response
- Verificación de permisos
- Warnings cuando usuario no tiene acceso

### Problemas comunes:

1. **"No tienes permisos para ningún módulo"**
   - Verificar que el cargo en backend coincida con los definidos en `rolePermissions`
   - Los cargos son case-insensitive

2. **"Token inválido o expirado"**
   - Verificar que `JWT_SECRET_KEY` sea la misma en backend
   - El token expira según configuración del backend (default: 60 minutos)

3. **Usuario no puede hacer login**
   - Verificar que tiene `adminPass` configurado en backend
   - Usar endpoint `/api/auth/register-admin` para registrar adminPass

## 📝 Variables de Entorno Requeridas

**Backend:**
```env
JWT_SECRET_KEY=tu-clave-secreta-muy-segura
JWT_ALGORITHM=HS256
JWT_EXPIRATION_MINUTES=60
```

**Frontend:**
```env
NEXT_PUBLIC_BACKEND_URL=https://api.suncarsrl.com
```

## ✅ Checklist de Seguridad

- ✅ Contraseñas hasheadas con bcrypt en backend
- ✅ JWT con expiración configurable
- ✅ Token incluido en header Authorization de todas las requests
- ✅ Validación de permisos en frontend y backend
- ✅ Logout limpia completamente la sesión
- ✅ Rutas protegidas con RouteGuard
- ✅ Dashboard filtra módulos según permisos
- ✅ Variables de entorno para configuración sensible

## 🔄 Sincronización con Backend

El sistema está diseñado para sincronizar automáticamente con los cambios en el backend:

1. **Nuevos cargos:** Agregar al objeto `rolePermissions` en `auth-context.tsx`
2. **Cambios en JWT:** Actualizar variables de entorno
3. **Nuevos módulos:** Agregar al array `allModules` en dashboard y permisos

## 📚 Archivos Clave

- `contexts/auth-context.tsx` - Context global de autenticación
- `components/auth/auth-guard.tsx` - Guard principal de la app
- `components/auth/route-guard.tsx` - Guard para rutas específicas
- `components/auth/login-form.tsx` - Formulario de login
- `components/auth/user-menu.tsx` - Menú de usuario con logout
- `app/page.tsx` - Dashboard con filtrado de módulos
- `lib/api-config.ts` - Configuración API con token JWT
- `docs/AUTH_README.md` - Documentación del backend JWT
