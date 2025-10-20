# 🔐 Sistema de Autenticación por Token - SunCar Backend

## **¿Cómo funciona?**

El backend SunCar utiliza un sistema de autenticación basado en **Bearer Token** que funciona de la siguiente manera:

### **1. Arquitectura del Sistema**

- **Middleware Global**: Se aplica automáticamente a **TODOS** los endpoints
- **Token Estático**: Usa un token fijo definido en variables de entorno
- **Validación Automática**: Cada request es interceptado y validado

### **2. Configuración del Token**

```bash
# Variable de entorno (archivo .env)
AUTH_TOKEN=suncar-token-2025  # Token por defecto si no se define
```

### **3. Endpoints de Autenticación**

#### **A. Obtener Token**
```
POST /api/auth/login-token
```
**Credenciales hardcodeadas:**
- Usuario: `admin`
- Contraseña: `admin123`

**Respuesta exitosa:**
```json
{
  "success": true,
  "message": "Login exitoso",
  "token": "suncar-token-2025"
}
```

#### **B. Validar Token**
```
GET /api/auth/validate
```
**Headers requeridos:**
```
Authorization: Bearer suncar-token-2025
```

### **4. Endpoints Excluidos (No requieren token)**

Estos endpoints **NO** necesitan autenticación:
- `/docs` - Documentación Swagger
- `/redoc` - Documentación ReDoc
- `/openapi.json` - Esquema OpenAPI
- `/api/auth/login` - Login de trabajadores
- `/api/auth/login-token` - Obtener token
- `/` - Página principal
- `/favicon.ico` - Favicon

### **5. Cómo usar el token en el Frontend**

#### **Paso 1: Obtener el token**
```javascript
// Obtener token
const response = await fetch('/api/auth/login-token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    usuario: 'admin',
    contrasena: 'admin123'
  })
});

const data = await response.json();
const token = data.token; // "suncar-token-2025"
```

#### **Paso 2: Usar el token en todas las requests**
```javascript
// Ejemplo: Obtener trabajadores
const response = await fetch('/api/trabajadores', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

#### **Paso 3: Manejar errores de autenticación**
```javascript
if (response.status === 401) {
  // Token inválido o expirado
  // Redirigir al login o renovar token
  console.log('Token inválido');
}
```

### **6. Implementación Recomendada para el Frontend**

#### **A. Interceptor de Axios (si usan Axios)**
```javascript
// Configurar token globalmente
axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

// Interceptor para manejar errores 401
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Token inválido, redirigir al login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

#### **B. Hook personalizado (React)**
```javascript
const useAuth = () => {
  const [token, setToken] = useState(localStorage.getItem('auth_token'));
  
  const login = async () => {
    const response = await fetch('/api/auth/login-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario: 'admin', contrasena: 'admin123' })
    });
    
    const data = await response.json();
    if (data.success) {
      setToken(data.token);
      localStorage.setItem('auth_token', data.token);
    }
  };
  
  const logout = () => {
    setToken(null);
    localStorage.removeItem('auth_token');
  };
  
  return { token, login, logout };
};
```

### **7. Flujo Completo**

1. **Frontend** → POST `/api/auth/login-token` (sin token)
2. **Backend** → Valida credenciales hardcodeadas
3. **Backend** → Retorna token estático
4. **Frontend** → Guarda token (localStorage/sessionStorage)
5. **Frontend** → Incluye token en todas las requests: `Authorization: Bearer {token}`
6. **Backend** → Middleware valida token en cada request
7. **Backend** → Permite acceso si token es válido

### **8. Consideraciones de Seguridad**

⚠️ **Notas importantes:**
- El token es **estático** y **no expira**
- Las credenciales están **hardcodeadas** en el código
- Es un sistema simple para desarrollo, no para producción
- Para producción se recomienda JWT con expiración

### **9. Ejemplo de Request Completo**

```bash
curl -X GET "http://localhost:8000/api/trabajadores" \
  -H "Authorization: Bearer suncar-token-2025" \
  -H "Content-Type: application/json"
```

### **10. Estructura de Archivos del Sistema de Autenticación**

```
presentation/
├── middleware/
│   └── auth_middleware.py          # Middleware global de autenticación
└── routers/
    └── auth_router.py              # Endpoints de autenticación

main.py                             # Configuración del middleware
```

### **11. Código del Middleware (Referencia)**

```python
# presentation/middleware/auth_middleware.py
class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Rutas excluidas de autenticación
        excluded_paths = [
            "/docs", "/redoc", "/openapi.json",
            "/api/auth/login", "/api/auth/login-token",
            "/", "/favicon.ico"
        ]
        
        # Verificar si la ruta está excluida
        if request.url.path in excluded_paths:
            return await call_next(request)
        
        # Verificar token en header Authorization
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return JSONResponse(
                status_code=401,
                content={"detail": "Token de autorización requerido"}
            )
        
        token = auth_header.replace("Bearer ", "")
        if token != AUTH_TOKEN:
            return JSONResponse(
                status_code=401,
                content={"detail": "Token inválido"}
            )
        
        return await call_next(request)
```

### **12. Respuestas de Error**

#### **Token faltante:**
```json
{
  "detail": "Token de autorización requerido"
}
```

#### **Token inválido:**
```json
{
  "detail": "Token inválido"
}
```

### **13. Testing con Postman/Insomnia**

1. **Obtener Token:**
    - Method: `POST`
    - URL: `http://localhost:8000/api/auth/login-token`
    - Body (JSON):
      ```json
      {
        "usuario": "admin",
        "contrasena": "admin123"
      }
      ```

2. **Usar Token:**
    - Method: `GET`
    - URL: `http://localhost:8000/api/trabajadores`
    - Headers:
      ```
      Authorization: Bearer suncar-token-2025
      Content-Type: application/json
      ```

---

## **Resumen para el Equipo de Frontend**

1. **Obtener token** con credenciales `admin/admin123`
2. **Incluir token** en header `Authorization: Bearer {token}`
3. **Manejar errores 401** para token inválido
4. **Guardar token** en localStorage/sessionStorage
5. **Aplicar token** a todas las requests excepto login

El sistema es simple pero efectivo para el desarrollo actual. ¡Cualquier endpoint que no esté en la lista de excluidos requerirá el token!