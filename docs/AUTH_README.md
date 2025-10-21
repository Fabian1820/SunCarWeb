# Sistema de Autenticación JWT - SunCar Backend

## 📋 Descripción General

Sistema de autenticación basado en JWT (JSON Web Tokens) para el panel administrativo de SunCar.

**Para Frontend Administrativo:** Use el endpoint `/api/auth/login-admin` con autenticación segura mediante bcrypt y JWT.

## 🔐 Características de Seguridad

✅ **Contraseñas hasheadas con bcrypt**: Las contraseñas administrativas (`adminPass`) se almacenan hasheadas
✅ **JWT con expiración configurable**: Tokens temporales por sesión
✅ **Validación de token en todos los endpoints protegidos**: Protección contra acceso no autorizado
✅ **Información del usuario embebida en el token**: CI, nombre y cargo incluidos en el JWT

## 🚀 Configuración Inicial

### 1. Instalar Dependencias

```bash
pip install -r requirements.txt
```

Esto instalará:
- `python-jose[cryptography]`: Manejo de JWT
- `passlib[bcrypt]`: Hashing de contraseñas

### 2. Configurar Variables de Entorno

Añade estas variables a tu archivo `.env`:

```env
# JWT Authentication Configuration
JWT_SECRET_KEY=tu-clave-secreta-muy-segura-cambiar-en-produccion
JWT_ALGORITHM=HS256
JWT_EXPIRATION_MINUTES=60
```

**⚠️ IMPORTANTE**: Cambia `JWT_SECRET_KEY` por una clave segura en producción. Puedes generar una con:

```python
import secrets
print(secrets.token_urlsafe(32))
```

### 3. Registrar AdminPass para Usuarios Administrativos

Antes de poder hacer login admin, necesitas registrar el `adminPass` para los usuarios administrativos:

```bash
# Usando curl o Postman
POST /api/auth/register-admin
{
  "ci": "12345678",
  "adminPass": "contraseña_admin_segura"
}
```

El sistema automáticamente hasheará la contraseña con bcrypt antes de almacenarla.

## 📡 Endpoint de Autenticación para Frontend Administrativo

### Login Admin (Recomendado para Frontend Administrativo)

**POST** `/api/auth/login-admin`

Autentica administradores usando CI y adminPass. Retorna un JWT para autenticación en requests posteriores.

**Request:**
```json
{
  "ci": "12345678",
  "adminPass": "contraseña_admin"
}
```

**Response exitosa (200):**
```json
{
  "success": true,
  "message": "Autenticación exitosa",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "ci": "12345678",
    "nombre": "Juan Pérez",
    "rol": "Administrador"
  }
}
```

**Response error (200):**
```json
{
  "success": false,
  "message": "Credenciales incorrectas o trabajador no tiene adminPass configurado",
  "token": null,
  "user": null
}
```

**Nota:** El campo `rol` contiene el cargo del trabajador según está registrado en la base de datos (campo `cargo`).

## 🔄 Flujo de Autenticación en Frontend Administrativo

### 1. Login

```javascript
const loginAdmin = async (ci, adminPass) => {
  try {
    const response = await fetch('/api/auth/login-admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ci, adminPass })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Guardar token y datos del usuario
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('user_data', JSON.stringify(data.user));
      
      return data;
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('Error en login:', error);
    throw error;
  }
};
```

### 2. Requests Autenticados

Para todas las peticiones posteriores, incluir el token JWT en el header:

```javascript
const fetchProtectedData = async (endpoint) => {
  const token = localStorage.getItem('auth_token');
  
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (response.status === 401) {
    // Token inválido o expirado - redirigir al login
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    window.location.href = '/login';
    return;
  }
  
  return await response.json();
};
```

### 3. Verificar Token al Cargar la App

```javascript
const checkAuth = () => {
  const token = localStorage.getItem('auth_token');
  const userData = localStorage.getItem('user_data');
  
  if (!token || !userData) {
    // No hay sesión - redirigir al login
    window.location.href = '/login';
    return false;
  }
  
  return true;
};
```

### 4. Logout

```javascript
const logout = () => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user_data');
  window.location.href = '/login';
};
```

## 🔍 Acceso a Datos del Usuario en Endpoints Backend

Dentro de cualquier endpoint protegido, puedes acceder a los datos del usuario autenticado:

```python
from fastapi import Request

@router.get("/mi-endpoint")
async def mi_endpoint(request: Request):
    # Acceder a datos del usuario autenticado
    user_ci = request.state.user["ci"]
    user_nombre = request.state.user["nombre"]
    user_cargo = request.state.user["rol"]  # Cargo del trabajador
    
    # Ejemplo: Verificar cargo específico
    if "Admin" in user_cargo or "Administrador" in user_cargo:
        # Lógica para roles administrativos
        pass

    return {"message": f"Hola {user_nombre}"}
```

**Nota:** El campo `rol` contiene el cargo del trabajador (campo `cargo` de la base de datos).

## 🛡️ Estructura del Token JWT

El token JWT incluye el siguiente payload:

```json
{
  "ci": "12345678",
  "nombre": "Juan Pérez",
  "rol": "Administrador",
  "exp": 1234567890
}
```

- **ci**: Cédula de identidad del usuario
- **nombre**: Nombre completo del usuario
- **rol**: Cargo del trabajador según la base de datos (campo `cargo`)
- **exp**: Timestamp de expiración del token

## 🔐 Modelo de Datos

### Trabajador (Colección MongoDB)

```json
{
  "_id": "ObjectId(...)",
  "CI": "12345678",
  "nombre": "Juan Pérez",
  "cargo": "Administrador",
  "adminPass": "$2b$12$hashedbcryptpassword...",
  ...
}
```

**Campos importantes para autenticación:**
- `CI`: Identificador único del trabajador
- `adminPass`: Contraseña administrativa hasheada con bcrypt
- `cargo`: Cargo/rol del trabajador (se incluye en el token JWT)

## 📝 Endpoints Excluidos de Autenticación

Estos endpoints NO requieren token JWT (acceso público):

- `/docs` - Documentación Swagger
- `/redoc` - Documentación ReDoc
- `/openapi.json` - Especificación OpenAPI
- `/api/auth/login-admin` - Login de administradores
- `/api/auth/register-admin` - Registro de adminPass
- `/` - Root
- `/favicon.ico`
- `/.well-known/assetlinks.json`
- `/app/crear/*` - Deep links
- `/api/blog/*` - Rutas públicas del blog (solo GET)

**Todos los demás endpoints requieren autenticación JWT.**

## ⚙️ Configuración Avanzada

### Cambiar Tiempo de Expiración del Token

En `.env`:
```env
JWT_EXPIRATION_MINUTES=120  # 2 horas
```

### Usar Algoritmo Diferente

En `.env`:
```env
JWT_ALGORITHM=HS512  # Más seguro pero más lento
```

### Generar Token con Tiempo Personalizado (Código Backend)

```python
from datetime import timedelta
from infrastucture.security.jwt_handler import create_access_token

# Token que expira en 24 horas
token = create_access_token(
    data={"ci": "12345678", "nombre": "Juan", "rol": "Administrador"},
    expires_delta=timedelta(hours=24)
)
```

## 🐛 Troubleshooting

### Error: "Token inválido o expirado"

- Verifica que `JWT_SECRET_KEY` sea la misma en todos los ambientes
- Verifica que el token no haya expirado (default: 60 minutos)
- Asegúrate de enviar el header `Authorization: Bearer {token}` correctamente

### Error: "Credenciales incorrectas"

- Verifica que el trabajador exista en la base de datos con ese CI
- Verifica que el trabajador tenga campo `adminPass` configurado
- Si acabas de registrar el adminPass, verifica que se haya guardado correctamente

### Error: "Token de autorización requerido"

- Asegúrate de incluir el header: `Authorization: Bearer {token}`
- Verifica que el endpoint no esté en la lista de endpoints públicos
- Verifica que el token esté siendo enviado correctamente desde el frontend

## 📚 Archivos Importantes

- `infrastucture/security/jwt_handler.py`: Manejo de JWT (creación y validación)
- `infrastucture/security/password_handler.py`: Hashing de contraseñas con bcrypt
- `presentation/middleware/auth_middleware.py`: Middleware de autenticación
- `application/services/auth_service.py`: Lógica de autenticación
- `presentation/routers/auth_router.py`: Endpoints de autenticación
- `infrastucture/repositories/trabajadores_repository.py`: Acceso a datos de trabajadores

## ✅ Checklist de Implementación Frontend

- [ ] Configurar variables de entorno en backend (`.env`)
- [ ] Generar `JWT_SECRET_KEY` segura para producción
- [ ] Registrar adminPass para usuarios administrativos via `/api/auth/register-admin`
- [ ] Implementar formulario de login en frontend
- [ ] Implementar función para llamar a `/api/auth/login-admin`
- [ ] Guardar token JWT en localStorage al recibir respuesta exitosa
- [ ] Incluir token en header `Authorization` en todos los requests posteriores
- [ ] Implementar manejo de errores 401 (token expirado/inválido)
- [ ] Implementar función de logout (limpiar localStorage)
- [ ] Verificar autenticación al cargar la aplicación
- [ ] Redirigir al login si no hay token válido
