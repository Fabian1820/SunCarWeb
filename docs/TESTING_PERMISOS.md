# Guía de Pruebas - Sistema de Permisos

## 🧪 Cómo Probar el Sistema de Permisos

### Prerequisitos

1. **Backend corriendo** en `http://localhost:8000` o la URL configurada
2. **Usuarios registrados** con diferentes cargos en la base de datos
3. **AdminPass configurado** para cada usuario de prueba

### Pasos para Configurar Usuarios de Prueba

#### 1. Registrar adminPass para usuarios
```bash
# Usando curl o Postman
POST http://localhost:8000/api/auth/register-admin
Content-Type: application/json

{
  "ci": "12345678",
  "adminPass": "admin123"
}
```

Repetir para cada usuario con diferente cargo:
- Director General
- Especialista en Gestión Económica
- Técnico Comercial
- Jefe de Operaciones
- Especialista en Redes y Sistemas

### Casos de Prueba

#### Test 1: Login Exitoso
**Objetivo**: Verificar que el login funciona correctamente

1. Iniciar aplicación: `npm run dev`
2. Abrir `http://localhost:3000`
3. Debería mostrar el formulario de login
4. Ingresar:
   - CI: `12345678`
   - Contraseña: `admin123`
5. Click en "Iniciar Sesión"
6. **Resultado esperado**: Redirige al dashboard y muestra módulos

#### Test 2: Permisos de Director General
**Objetivo**: Verificar que Director General ve todos los módulos

1. Login con usuario Director General
2. Verificar dashboard muestra:
   - ✅ Brigadas
   - ✅ Trabajadores
   - ✅ Leads
   - ✅ Materiales
   - ✅ Reportes
   - ✅ Clientes
   - ✅ Ofertas
   - ✅ Órdenes de Trabajo
   - ✅ Recursos Humanos
   - ✅ Blog
3. **Resultado esperado**: Todos los 10 módulos visibles

#### Test 3: Permisos de Especialista en RR.HH.
**Objetivo**: Verificar permisos limitados

1. Logout (click en menú de usuario → Cerrar Sesión)
2. Login con usuario Especialista en Gestión de RR.HH.
3. Verificar dashboard muestra SOLO:
   - ✅ Recursos Humanos
4. **Resultado esperado**: Solo 1 módulo visible

#### Test 4: Permisos de Técnico Comercial
**Objetivo**: Verificar permisos de área comercial

1. Logout
2. Login con usuario Técnico Comercial
3. Verificar dashboard muestra SOLO:
   - ✅ Leads
   - ✅ Clientes
   - ✅ Ofertas
   - ✅ Materiales
4. **Resultado esperado**: Solo 4 módulos visibles

#### Test 5: Permisos de Jefe de Operaciones
**Objetivo**: Verificar permisos de operaciones

1. Logout
2. Login con usuario Jefe de Operaciones
3. Verificar dashboard muestra SOLO:
   - ✅ Brigadas
   - ✅ Trabajadores
   - ✅ Materiales
   - ✅ Clientes
   - ✅ Órdenes de Trabajo
4. **Resultado esperado**: Solo 5 módulos visibles

#### Test 6: Acceso Denegado por URL Directa
**Objetivo**: Verificar que RouteGuard protege rutas

1. Login con usuario Técnico Comercial (sin acceso a Brigadas)
2. En la barra de direcciones, ir a: `http://localhost:3000/brigadas`
3. **Resultado esperado**: 
   - Muestra mensaje "Acceso Denegado"
   - Botón para volver al inicio
   - No puede ver contenido de brigadas

#### Test 7: Menú de Usuario
**Objetivo**: Verificar información del usuario

1. Login con cualquier usuario
2. Click en botón con nombre del usuario (esquina superior derecha)
3. **Resultado esperado**: Dropdown muestra:
   - Nombre completo
   - CI
   - Cargo
   - Botón "Cerrar Sesión"

#### Test 8: Logout
**Objetivo**: Verificar cierre de sesión

1. Login con cualquier usuario
2. Click en menú de usuario → Cerrar Sesión
3. **Resultado esperado**:
   - Vuelve a mostrar formulario de login
   - localStorage limpio (verificar en DevTools)
   - No puede acceder a páginas protegidas

#### Test 9: Token JWT en API Calls
**Objetivo**: Verificar que las llamadas API incluyen el token

1. Login exitoso
2. Abrir DevTools → Network
3. Navegar a cualquier módulo (ej: Materiales)
4. Verificar requests al backend
5. **Resultado esperado**: Todas las requests incluyen header:
   ```
   Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

#### Test 10: Usuario sin Permisos
**Objetivo**: Verificar mensaje cuando no hay permisos

1. Crear usuario en backend con cargo no configurado en permisos
2. Registrar adminPass para ese usuario
3. Login con ese usuario
4. **Resultado esperado**: Dashboard muestra:
   - "No tienes permisos asignados para ningún módulo"
   - "Contacta al administrador del sistema"

### Verificación en Consola del Navegador

Abrir DevTools → Console y ejecutar:

```javascript
// Ver datos del usuario autenticado
const userData = localStorage.getItem('user_data')
console.log('Usuario:', JSON.parse(userData))

// Ver token JWT
const token = localStorage.getItem('auth_token')
console.log('Token:', token)
```

### Logs Esperados en Consola

Durante el login, deberías ver:
```
Attempting login with: {ci: "12345678", endpoint: "http://localhost:8000/api/auth/login-admin"}
Login response: {success: true, message: "Autenticación exitosa", token: "...", user: {...}}
```

Si intentas acceder a módulo sin permisos:
```
Usuario Juan Pérez no tiene permiso para acceder a: brigadas
```

### Troubleshooting

#### Problema: "Credenciales incorrectas"
**Solución**:
- Verificar que el usuario existe en la BD
- Verificar que tiene adminPass configurado
- Usar `/api/auth/register-admin` para registrar adminPass

#### Problema: "Error de conexión con el servidor"
**Solución**:
- Verificar que el backend está corriendo
- Verificar variable de entorno `NEXT_PUBLIC_BACKEND_URL`
- Revisar CORS en backend

#### Problema: "No aparecen módulos en dashboard"
**Solución**:
- Verificar que el cargo del usuario está en `rolePermissions`
- Los cargos son case-insensitive
- Revisar consola por warnings

#### Problema: "Token inválido o expirado"
**Solución**:
- Verificar `JWT_SECRET_KEY` en backend
- Verificar tiempo de expiración (default: 60 min)
- Hacer logout y login nuevamente

### Checklist de Pruebas Completas

- [ ] Login exitoso con credenciales válidas
- [ ] Login fallido con credenciales inválidas
- [ ] Dashboard muestra módulos correctos para Director General
- [ ] Dashboard muestra módulos limitados para Especialista RR.HH.
- [ ] Dashboard muestra módulos limitados para Técnico Comercial
- [ ] Dashboard muestra módulos limitados para Jefe de Operaciones
- [ ] Acceso denegado al intentar URL directa sin permisos
- [ ] Menú de usuario muestra información correcta
- [ ] Logout funciona y limpia sesión
- [ ] Token JWT se incluye en llamadas API
- [ ] Usuario sin permisos ve mensaje apropiado
- [ ] Brigadas page protegida con RouteGuard funciona correctamente

### Testing Automatizado (Opcional)

Para testing automatizado, considerar:
- Cypress o Playwright para E2E tests
- Testing Library para componentes React
- Mock del contexto de autenticación para tests unitarios

### Ejemplo de Mock para Tests
```typescript
// En tus tests
const mockAuthContext = {
  isAuthenticated: true,
  token: 'mock-token',
  user: { ci: '12345678', nombre: 'Test User', rol: 'Director General' },
  login: jest.fn(),
  logout: jest.fn(),
  hasPermission: (module: string) => true,
  getAuthHeader: () => ({ Authorization: 'Bearer mock-token' }),
  isLoading: false,
}
```

## 📊 Matriz de Resultados Esperados

| Usuario | Brigadas | Trabajadores | Leads | Materiales | RR.HH. | Blog |
|---------|----------|--------------|-------|------------|--------|------|
| Director General | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Subdirector | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Esp. RR.HH. | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Téc. Comercial | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Jefe Operaciones | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Esp. Sistemas | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

## 🎯 Criterios de Aceptación

✅ Sistema pasa todas las pruebas si:
1. Login funciona con backend JWT
2. Permisos se aplican correctamente según cargo
3. Dashboard filtra módulos dinámicamente
4. RouteGuard bloquea acceso no autorizado
5. Logout limpia sesión completamente
6. Token JWT se incluye en todas las API calls
7. Mensajes de error son claros y útiles
8. UX es fluida y sin errores de consola
