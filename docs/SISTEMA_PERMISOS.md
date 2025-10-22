# Sistema de Permisos - Guía Rápida para Desarrolladores

## 🎯 Resumen

Se ha implementado un sistema completo de autenticación JWT y permisos basado en roles que controla el acceso a los módulos según el cargo del usuario.

## 🔐 ¿Cómo Funciona?

### 1. Login del Usuario
- El usuario ingresa su **CI** y **contraseña administrativa (adminPass)**
- El sistema consulta `/api/auth/login-admin` del backend
- Si es exitoso, guarda el token JWT y datos del usuario en `localStorage`

### 2. Verificación de Permisos
- Cada módulo tiene un ID (ej: `brigadas`, `materiales`, `leads`)
- El sistema verifica si el cargo del usuario tiene acceso a ese módulo
- Los permisos se configuran en `contexts/auth-context.tsx`

### 3. Control de Acceso
- **Dashboard**: Muestra solo los módulos a los que el usuario tiene acceso
- **Rutas**: Cada página puede protegerse con `RouteGuard`
- Si no hay permisos, se muestra mensaje de "Acceso Denegado"

## 📋 Matriz de Permisos

| Cargo | Módulos Permitidos |
|-------|-------------------|
| **Director General** | Todos |
| **Subdirector(a)** | Todos |
| **Esp. Gestión Económica** | Recursos Humanos |
| **Esp. Gestión RR.HH.** | Recursos Humanos |
| **Esp. Gestión Comercial** | Leads, Clientes, Ofertas, Materiales |
| **Téc. Gestión Comercial** | Leads, Clientes, Ofertas, Materiales |
| **Téc. Comercial** | Leads, Clientes, Ofertas, Materiales |
| **Esp. Redes y Sistemas** | Blog |
| **Jefe de Operaciones** | Brigadas, Trabajadores, Materiales, Clientes, Órdenes de Trabajo |

## 🛠️ Cómo Proteger una Página

### Opción 1: Proteger toda la página
```tsx
import { RouteGuard } from "@/components/auth/route-guard"

export default function MiPagina() {
  return (
    <RouteGuard requiredModule="nombre-del-modulo">
      {/* Contenido de la página */}
    </RouteGuard>
  )
}
```

### Opción 2: Verificar permisos en el código
```tsx
import { useAuth } from "@/contexts/auth-context"

export default function MiComponente() {
  const { hasPermission, user } = useAuth()
  
  if (!hasPermission('brigadas')) {
    return <div>No tienes acceso a este módulo</div>
  }
  
  return <div>Contenido para usuarios con acceso</div>
}
```

## 📦 Componentes Disponibles

### `<UserMenu />`
Menú del usuario con información y botón de logout
```tsx
import { UserMenu } from "@/components/auth/user-menu"

<UserMenu />
```

### `<AuthGuard>`
Ya está implementado en `app/layout.tsx` - protege toda la aplicación

### `<RouteGuard>`
Protege rutas específicas según módulo requerido

## 🔧 Configuración de Permisos

Para agregar o modificar permisos, edita el archivo `contexts/auth-context.tsx`:

```typescript
const rolePermissions: Record<string, string[]> = {
  // ✅ Usa el formato exacto de la base de datos (con tildes, mayúsculas, etc.)
  // El sistema normaliza automáticamente para comparar
  'Técnico en Gestión Comercial': ['leads', 'clientes', 'ofertas', 'materiales'],
  'Especialista en Gestión Económica': ['recursos-humanos'],
  'Jefe de Operaciones': ['brigadas', 'trabajadores', 'materiales', 'clientes', 'ordenes-trabajo'],
  // Agregar más cargos aquí...
}
```

**Nota**: El sistema normaliza automáticamente los cargos eliminando tildes, mayúsculas y espacios antes de comparar. Esto significa que:
- ✅ "Técnico en Gestión Comercial" (BD)
- ✅ "tecnico en gestion comercial" (código)
- ✅ "TÉCNICO EN GESTIÓN COMERCIAL" (cualquier formato)

Todos funcionan igual. Ver `docs/FIX_NORMALIZACION_STRINGS.md` para más detalles.

## 📝 Agregar un Nuevo Módulo al Dashboard

1. **Editar `app/page.tsx`**:
```typescript
const allModules = [
  // ... módulos existentes
  {
    id: 'mi-nuevo-modulo',  // ID del módulo
    href: '/mi-nuevo-modulo',
    icon: MiIcono,
    title: 'Mi Nuevo Módulo',
    description: 'Descripción del módulo',
    color: 'blue-600',
  },
]
```

2. **Actualizar permisos en `contexts/auth-context.tsx`**:
```typescript
const rolePermissions: Record<string, string[]> = {
  'nombre-del-cargo': ['mi-nuevo-modulo', ...otros],
}
```

3. **Proteger la página con RouteGuard** (ver ejemplo arriba)

## 🔍 Debugging

### Ver datos de autenticación en consola del navegador:
```javascript
// Ver datos del usuario
localStorage.getItem('user_data')

// Ver token JWT
localStorage.getItem('auth_token')
```

### Logs automáticos:
El sistema incluye logs en consola que muestran:
- Intentos de login
- Respuestas del servidor
- Verificaciones de permisos
- Warnings de acceso denegado

## ⚠️ Consideraciones Importantes

1. **Sincronización con Backend**:
   - Los cargos deben coincidir exactamente con los del backend
   - El campo `cargo` del trabajador en la BD es el que se usa como `rol`

2. **Registro de adminPass**:
   - Los usuarios deben tener `adminPass` configurado en el backend
   - Usar endpoint `/api/auth/register-admin` para registrarlo

3. **Expiración del Token**:
   - Por defecto expira en 60 minutos (configurable en backend)
   - El usuario debe volver a hacer login al expirar

4. **Variables de Entorno**:
   - Backend: `JWT_SECRET_KEY`, `JWT_ALGORITHM`, `JWT_EXPIRATION_MINUTES`
   - Frontend: `NEXT_PUBLIC_BACKEND_URL`

## 📚 Documentación Completa

Para más detalles técnicos, consultar:
- `docs/AUTH_README.md` - Documentación del backend JWT
- `docs/PERMISSIONS_SYSTEM.md` - Documentación técnica completa del frontend
- `CLAUDE.md` - Arquitectura general del proyecto

## 🚀 Ejemplo Completo

Ver implementación en:
- `app/brigadas/page.tsx` - Ejemplo de página protegida con RouteGuard
- `app/page.tsx` - Dashboard con filtrado dinámico de módulos
- `components/auth/user-menu.tsx` - Menú de usuario con logout

## ✅ Checklist para Nueva Funcionalidad

- [ ] Definir ID del módulo
- [ ] Agregar módulo al array `allModules` en dashboard
- [ ] Configurar permisos en `rolePermissions`
- [ ] Proteger página con `RouteGuard`
- [ ] Probar con diferentes roles de usuario
- [ ] Verificar que aparece/desaparece en dashboard según permisos
